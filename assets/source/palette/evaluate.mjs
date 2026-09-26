// Evaluate candidate peg palettes for Color Catch.
// Usage: node evaluate.mjs            (all palettes, summary + detail)
//        node evaluate.mjs --detail X (pairwise detail for palette X)
import {
  contrast,
  deltaE2000,
  hexToLab,
  hexToOklch,
  shade,
  simHex,
  simLab,
} from './colormath.mjs';

// The renderer (src/ui/art/perspectiveModel.ts pegDollScene) paints the cap as a
// radial gradient: shade(fill,+0.3) at the lit centre -> fill at 55% -> shade(fill,-0.22)
// at the rim. So every peg is really three colours.
export const STOPS = {
  lit: (h) => shade(h, 0.3),
  flat: (h) => h,
  dark: (h) => shade(h, -0.22),
};
const VISIONS = ['normal', 'protan', 'deutan', 'tritan'];

// Wooden context (src/ui/art/palette.ts WOOD): the face-down cap a coloured peg
// must never be mistaken for, and the board face it stands on.
const WOODS = {
  'cap light': '#E6C68F',
  'cap dark': '#D5AC73',
  'board lit': '#ECC788',
  'board face': '#CE9F60',
  'board dark': '#8A6031',
};

export const PALETTES = {
  'A current (Okabe-Ito)': {
    orange: '#E69F00', sky: '#56B4E9', blue: '#0072B2', green: '#009E73', yellow: '#F0E442', purple: '#CC79A7',
  },
  'B literal: red + violet (Okabe red, violet, keep purple)': {
    red: '#D55E00', sky: '#56B4E9', violet: '#7E57C2', green: '#009E73', yellow: '#F0E442', purple: '#CC79A7',
  },
  'B2 literal: toy red + violet, keep purple': {
    red: '#D62828', sky: '#56B4E9', violet: '#7E57C2', green: '#009E73', yellow: '#F0E442', purple: '#CC79A7',
  },
  'C red/yellow/green/blue/violet/pink': {
    red: '#D7263D', yellow: '#F5D90A', green: '#2FA84F', blue: '#2F7ED8', violet: '#7B3FB8', pink: '#F287B7',
  },
  'D red/yellow/green/sky/violet/pink (keep sky)': {
    red: '#D62828', yellow: '#F2D21B', green: '#1E9E5A', sky: '#56B4E9', violet: '#6A3FB5', pink: '#EE82B8',
  },
  'E red/yellow/green/blue/violet/black': {
    red: '#D7263D', yellow: '#F5D90A', green: '#2FA84F', blue: '#2F7ED8', violet: '#8E4FD0', black: '#2B2B30',
  },
  'F red/yellow/green/blue/violet/white': {
    red: '#D7263D', yellow: '#F5D90A', green: '#2FA84F', blue: '#2F7ED8', violet: '#7B3FB8', white: '#F4F1EA',
  },
};

// Optional: extra palettes from optimize.mjs output
try {
  const extra = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./optimized.json', import.meta.url), 'utf8'));
  Object.assign(PALETTES, extra);
} catch {}

/** Pick glyph ink the way palette.ts does: white if it clears 4.5 on the fill and
 *  3 on both stops, else the darkest-needed shade of the rim's hue. */
export function glyphInk(fill, rim) {
  const ok = (ink) =>
    contrast(ink, fill) >= 4.5 && contrast(ink, STOPS.lit(fill)) >= 3 && contrast(ink, STOPS.dark(fill)) >= 3;
  if (ok('#FFFFFF')) return '#FFFFFF';
  for (let k = 0.5; k <= 0.95; k += 0.05) {
    const ink = shade(rim, -k);
    if (ok(ink)) return ink;
  }
  return '#000000';
}
export const defaultRim = (fill) => shade(fill, -0.2);

export function evalPalette(p) {
  const ids = Object.keys(p);
  const out = { perVision: {}, pairs: [] };
  for (const v of VISIONS) {
    let flatMin = Infinity, flatPair = '', gradMin = Infinity, gradPair = '', crossMin = Infinity, crossPair = '';
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = p[ids[i]], b = p[ids[j]];
        const dFlat = deltaE2000(simLab(a, v), simLab(b, v));
        // same-position comparison: lit vs lit, dark vs dark (how two neighbouring pegs read)
        const dGrad = Math.min(
          dFlat,
          deltaE2000(simLab(STOPS.lit(a), v), simLab(STOPS.lit(b), v)),
          deltaE2000(simLab(STOPS.dark(a), v), simLab(STOPS.dark(b), v)),
        );
        // any region of A vs any region of B (e.g. blue's lit centre vs sky's body)
        let dCross = Infinity;
        for (const s1 of Object.values(STOPS))
          for (const s2 of Object.values(STOPS))
            dCross = Math.min(dCross, deltaE2000(simLab(s1(a), v), simLab(s2(b), v)));
        const name = `${ids[i]}/${ids[j]}`;
        if (dFlat < flatMin) [flatMin, flatPair] = [dFlat, name];
        if (dGrad < gradMin) [gradMin, gradPair] = [dGrad, name];
        if (dCross < crossMin) [crossMin, crossPair] = [dCross, name];
        out.pairs.push({ v, name, dFlat, dGrad, dCross });
      }
    out.perVision[v] = { flatMin, flatPair, gradMin, gradPair, crossMin, crossPair };
  }
  const L = ids.map((id) => [id, hexToLab(p[id])[0]]).sort((x, y) => x[1] - y[1]);
  let dLmin = Infinity;
  for (let i = 1; i < L.length; i++) dLmin = Math.min(dLmin, L[i][1] - L[i - 1][1]);
  out.lightness = L;
  out.dLmin = dLmin;
  out.woodMin = Math.min(
    ...ids.flatMap((id) => Object.values(WOODS).map((w) => deltaE2000(hexToLab(p[id]), hexToLab(w)))),
  );
  out.woodWorst = ids
    .map((id) => [id, Math.min(...Object.values(WOODS).map((w) => deltaE2000(hexToLab(p[id]), hexToLab(w))))])
    .sort((a, b) => a[1] - b[1])[0];
  out.ink = ids.map((id) => {
    const fill = p[id];
    const rim = defaultRim(fill);
    const ink = glyphInk(fill, rim);
    return {
      id,
      fill,
      rim,
      ink,
      flat: contrast(ink, fill),
      lit: contrast(ink, STOPS.lit(fill)),
      dark: contrast(ink, STOPS.dark(fill)),
    };
  });
  return out;
}

const f1 = (x) => x.toFixed(1);

function summary() {
  console.log('\n## Summary (CIEDE2000; "grad" = min over flat, lit-vs-lit, dark-vs-dark; "cross" = any stop vs any stop)\n');
  console.log('| Palette | normal flat | normal grad | normal cross | protan grad | deutan grad | tritan grad | worst pair (per vision, grad) | min dL* | min dE vs wood |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const [name, p] of Object.entries(PALETTES)) {
    const e = evalPalette(p);
    const pv = e.perVision;
    const worst = ['normal', 'protan', 'deutan', 'tritan'].map((v) => `${v[0].toUpperCase()}:${pv[v].gradPair}`).join(' ');
    console.log(
      `| ${name} | ${f1(pv.normal.flatMin)} | ${f1(pv.normal.gradMin)} | ${f1(pv.normal.crossMin)} (${pv.normal.crossPair}) | ${f1(pv.protan.gradMin)} | ${f1(pv.deutan.gradMin)} | ${f1(pv.tritan.gradMin)} | ${worst} | ${f1(e.dLmin)} | ${f1(e.woodMin)} (${e.woodWorst[0]}) |`,
    );
  }
}

function detail(name) {
  const p = PALETTES[name];
  const e = evalPalette(p);
  console.log(`\n### ${name}`);
  console.log('fills + OKLCH + CVD renderings:');
  for (const [id, hex] of Object.entries(p)) {
    const [L, C, h] = hexToOklch(hex);
    console.log(
      `  ${id.padEnd(7)} ${hex}  L*=${f1(hexToLab(hex)[0])} oklch(${L.toFixed(2)} ${C.toFixed(3)} ${h.toFixed(0)})  lit ${STOPS.lit(hex)} dark ${STOPS.dark(hex)}  P ${simHex(hex, 'protan')} D ${simHex(hex, 'deutan')} T ${simHex(hex, 'tritan')}`,
    );
  }
  console.log('closest 8 pairs (by grad dE) per vision:');
  for (const v of ['normal', 'protan', 'deutan', 'tritan']) {
    const ps = e.pairs.filter((x) => x.v === v).sort((a, b) => a.dGrad - b.dGrad).slice(0, 8);
    console.log(`  ${v.padEnd(6)} ` + ps.map((x) => `${x.name} ${f1(x.dFlat)}/${f1(x.dGrad)}/${f1(x.dCross)}`).join(' | '));
  }
  console.log('glyph ink (auto): ' + e.ink.map((i) => `${i.id} ${i.ink} on ${i.fill}: ${i.flat.toFixed(2)} (lit ${i.lit.toFixed(2)}, dark ${i.dark.toFixed(2)})`).join('\n                  '));
  console.log('lightness order: ' + e.lightness.map(([id, L]) => `${id} ${f1(L)}`).join(' < '));
}

const argv = process.argv.slice(2);
if (argv[0] === '--detail') detail(argv.slice(1).join(' '));
else {
  summary();
  for (const n of Object.keys(PALETTES)) detail(n);
}
