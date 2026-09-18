#!/usr/bin/env node
/**
 * Peg Recall — icon source generator.
 * Emits every SVG variant of the app mark from one shared description so the
 * icon, splash, Android foreground and monochrome mark can never drift apart.
 *
 *   node assets/source/build-svg.js
 *
 * The mark is the game object itself: a ROUND wooden board (PLAN.md section 2)
 * with seven pegs — one centre plus a hex ring of six — three of them face-up
 * in orange / blue / green. Geometry and wood tones mirror
 * src/ui/art/svgModel.ts + src/ui/art/palette.ts; peg positions are the same
 * hex lattice src/layout/roundLayout.ts produces for 7 pegs.
 *
 * No dependencies, and deliberately filter-free (no feGaussianBlur): shadows
 * are stacked low-opacity ellipses so the art rasterises identically in
 * rsvg-convert, WebKit (qlmanage) and any hand-rolled rasteriser.
 */
const fs = require('fs');
const path = require('path');

const OUT = __dirname;

const C = {
  page: '#E9DECB',      // warm sand, full-bleed
  faceLit: '#EFD9B8',   // board face, lit centre
  face: '#E3C9A4',      // board face, outer
  rim: '#C9A77C',
  bevel: '#B8926A',
  grain: '#B5906A',
  holeDeep: '#8E6C48',
  hole: '#B78F63',
  holeLip: '#F2E3CA',
  pegCap: '#D9C3A5',    // natural, face-down peg
  pegCapRim: '#AE8E67',
  pegBody: '#B9986F',
  pegBodyDark: '#82694E',
  shadow: '#3A2A1B',
  orange: '#E69F00', orangeRim: '#B87E00', orangeDark: '#79520D',
  blue: '#0072B2', blueRim: '#005688', blueDark: '#00385A',
  green: '#009E73', greenRim: '#00795A', greenDark: '#004F3B',
};

// ---------------------------------------------------------------- geometry
// The mark is the game object as the game now draws it (PLAN.md section 2):
// a ROUND wooden board seen from a 3/4 angle with upright peg dolls standing
// in it. Proportions mirror src/ui/art/perspectiveModel.ts exactly, so the
// icon and the board on screen are the same object.

const YS = 0.55;                 // vertical squash of the disc (PLAN: 0.55-0.6)
const R = 420;                   // disc radius on the long axis
const RY = R * YS;
const EDGE = 2 * R * 0.09;       // visible wooden side (BOARD_EDGE_RATIO)
const CX = 512;
const CY = 544;                  // tuned so the whole mark is centred in 1024

// 7 pegs: centre + hex ring. radiusUnits = 1 + 0.5 + 0.25 (roundLayout pads).
const SPACING = R / 1.75;
const PW = SPACING * 0.64;       // PEG_WIDTH_OF_SPACING
const HOLE = PW * 0.78;          // holeSizeFor()

/** Peg doll proportions, as multiples of the peg width (perspectiveModel P). */
const P = {
  aspect: 1.9, capRx: 0.5, capEqY: 0.5, capTopY: 0.09, capUnderRy: 0.13,
  bodyRx: 0.36, bodyTopY: 0.42, baseY: 1.775, baseRy: 0.115, bandY: 0.94,
};

// circle-space hole centres, then squashed onto the ellipse
const HOLES = [{ x: 0, y: 0 }].concat(
  [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2; // start at 12 o'clock
    return { x: SPACING * Math.cos(a), y: SPACING * Math.sin(a) };
  }),
);
// index into HOLES -> face-up colour. 0 = centre.
const FACE_UP = { 0: 'blue', 1: 'orange', 3: 'green' };

const n = (v) => Math.round(v * 100) / 100;

/** Shift #rrggbb towards black (amount < 0) or white (amount > 0). */
function shade(hex, amount) {
  const v = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const mix = (c) => Math.round(c + (target - c) * k);
  const r = mix((v >> 16) & 0xff), g = mix((v >> 8) & 0xff), b = mix(v & 0xff);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
}

/** Screen position of a hole centre. */
const at = (h) => ({ x: CX + h.x, y: CY + h.y * YS });

/**
 * One upright peg doll standing with its base on (bx, by): contact shadow,
 * turned body, colour band, domed cap, highlight.
 */
function peg(bx, by, key, mono) {
  const w = PW;
  const u = (k) => w * k;
  const top = by - u(P.baseY);
  const bodyRx = u(P.bodyRx);
  const baseRy = u(P.baseRy);
  const capRx = u(P.capRx);
  const capEqY = top + u(P.capEqY);

  if (mono) {
    // white silhouette: stem + dome, one flat shape per peg
    return [
      `    <path d="M ${n(bx - bodyRx)} ${n(top + u(P.bodyTopY))} L ${n(bx - bodyRx)} ${n(by)} A ${n(bodyRx)} ${n(baseRy)} 0 0 0 ${n(bx + bodyRx)} ${n(by)} L ${n(bx + bodyRx)} ${n(top + u(P.bodyTopY))} Z" fill="#FFFFFF"/>`,
      `    <path d="M ${n(bx - capRx)} ${n(capEqY)} A ${n(capRx)} ${n(capEqY - top - u(P.capTopY))} 0 0 1 ${n(bx + capRx)} ${n(capEqY)} A ${n(capRx)} ${n(u(P.capUnderRy))} 0 0 1 ${n(bx - capRx)} ${n(capEqY)} Z" fill="#FFFFFF"/>`,
    ].join('\n');
  }

  const cap = key ? C[key] : C.pegCap;
  const capDark = key ? C[key + 'Dark'] : C.pegCapRim;
  const band = key ? C[key + 'Rim'] : null;
  const body = C.pegBody;
  const gloss = key ? 0.4 : 0.3;
  const id = `pg${Math.round(bx)}_${Math.round(by)}`;
  const stem = (topY, botY, ry) =>
    `M ${n(bx - bodyRx)} ${n(topY)} L ${n(bx - bodyRx)} ${n(botY)} ` +
    `A ${n(bodyRx)} ${n(ry)} 0 0 0 ${n(bx + bodyRx)} ${n(botY)} L ${n(bx + bodyRx)} ${n(topY)} Z`;

  const out = [
    `    <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0">`,
    `      <stop offset="0" stop-color="${shade(body, 0.1)}"/><stop offset="0.3" stop-color="${shade(body, 0.26)}"/>`,
    `      <stop offset="0.78" stop-color="${shade(body, -0.24)}"/><stop offset="1" stop-color="${shade(body, -0.06)}"/>`,
    `    </linearGradient>`,
    `    <radialGradient id="${id}c" cx="0.34" cy="0.26" r="0.86">`,
    `      <stop offset="0" stop-color="${shade(cap, 0.3)}"/><stop offset="0.55" stop-color="${cap}"/><stop offset="1" stop-color="${shade(cap, -0.22)}"/>`,
    `    </radialGradient>`,
    `    <ellipse cx="${n(bx + u(0.03))}" cy="${n(by + u(0.035))}" rx="${n(bodyRx * 1.18)}" ry="${n(baseRy * 0.8)}" fill="${C.shadow}" opacity="0.2"/>`,
    `    <path d="${stem(top + u(P.bodyTopY), by, baseRy)}" fill="url(#${id}b)"/>`,
  ];
  if (band) {
    out.push(
      `    <linearGradient id="${id}n" x1="0" y1="0" x2="1" y2="0">`,
      `      <stop offset="0" stop-color="${shade(band, 0.2)}"/><stop offset="0.34" stop-color="${band}"/><stop offset="1" stop-color="${shade(band, -0.3)}"/>`,
      `    </linearGradient>`,
      `    <path d="${stem(top + u(P.bodyTopY), top + u(P.bandY), bodyRx * 0.34)}" fill="url(#${id}n)"/>`,
    );
  }
  out.push(
    `    <path d="M ${n(bx - capRx)} ${n(capEqY)} A ${n(capRx)} ${n(capEqY - top - u(P.capTopY))} 0 0 1 ${n(bx + capRx)} ${n(capEqY)} A ${n(capRx)} ${n(u(P.capUnderRy))} 0 0 1 ${n(bx - capRx)} ${n(capEqY)} Z" fill="url(#${id}c)" stroke="${shade(capDark, -0.14)}" stroke-width="${n(Math.max(1, u(0.018)))}"/>`,
    `    <ellipse cx="${n(bx - capRx * 0.38)}" cy="${n(capEqY - u(0.24))}" rx="${n(capRx * 0.26)}" ry="${n(u(0.13))}" fill="#FFFFFF" opacity="${gloss}" transform="rotate(-24 ${n(bx - capRx * 0.38)} ${n(capEqY - u(0.24))})"/>`,
  );
  return out.join('\n');
}

/** Pegs painted back to front, so near rows overlap far ones. */
const SORTED = HOLES
  .map((h, i) => ({ h, i }))
  .sort((a, b) => a.h.y - b.h.y || a.h.x - b.h.x);

function art(mono) {
  if (mono) {
    return [
      `    <ellipse cx="${CX}" cy="${CY}" rx="${n(R - 14)}" ry="${n(RY - 8)}" fill="none" stroke="#FFFFFF" stroke-width="26"/>`,
      ...SORTED.map(({ h, i }) => { const p = at(h); return peg(p.x, p.y, FACE_UP[i], true); }),
    ].join('\n');
  }

  const hrx = HOLE / 2;
  const hry = hrx * YS;
  const rf = R * 0.915;
  const out = [
    `    <radialGradient id="face" cx="0.46" cy="0.34" r="0.76">`,
    `      <stop offset="0" stop-color="${C.faceLit}"/><stop offset="1" stop-color="${C.face}"/>`,
    `    </radialGradient>`,
    `    <linearGradient id="side" x1="0" y1="0" x2="1" y2="0">`,
    `      <stop offset="0" stop-color="${shade(C.rim, -0.34)}"/><stop offset="0.34" stop-color="${C.rim}"/>`,
    `      <stop offset="0.72" stop-color="${shade(C.rim, -0.16)}"/><stop offset="1" stop-color="${shade(C.rim, -0.44)}"/>`,
    `    </linearGradient>`,
    `    <linearGradient id="hole" x1="0.5" y1="0" x2="0.5" y2="1">`,
    `      <stop offset="0" stop-color="${C.holeDeep}"/><stop offset="1" stop-color="${C.hole}"/>`,
    `    </linearGradient>`,
  ];
  // ground shadow: three stacked ellipses, widest and faintest first
  for (const [k, op] of [[1, 0.07], [0.96, 0.11], [0.9, 0.16]]) {
    out.push(
      `    <ellipse cx="${n(CX + 5)}" cy="${n(CY + EDGE + 10)}" rx="${n(R * k)}" ry="${n(RY * k * 0.62)}" fill="${C.shadow}" opacity="${op}"/>`,
    );
  }
  // wooden side wall
  out.push(
    `    <path d="M ${n(CX - R)} ${CY} L ${n(CX - R)} ${n(CY + EDGE)} A ${R} ${n(RY)} 0 0 0 ${n(CX + R)} ${n(CY + EDGE)} L ${n(CX + R)} ${CY} A ${R} ${n(RY)} 0 0 1 ${n(CX - R)} ${CY} Z" fill="url(#side)"/>`,
    `    <ellipse cx="${CX}" cy="${CY}" rx="${R}" ry="${n(RY)}" fill="${C.rim}"/>`,
    `    <ellipse cx="${CX}" cy="${CY}" rx="${n(R * 0.94)}" ry="${n(R * 0.94 * YS)}" fill="${C.bevel}"/>`,
    `    <ellipse cx="${CX}" cy="${CY}" rx="${n(rf)}" ry="${n(rf * YS)}" fill="url(#face)"/>`,
    `    <ellipse cx="${CX}" cy="${CY}" rx="${n(rf * 0.996)}" ry="${n(rf * YS * 0.996)}" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.24"/>`,
  );
  // grain arcs across the (squashed) face
  for (const [k, bow] of [[-0.6, 0.08], [-0.2, -0.07], [0.24, 0.08], [0.58, -0.06]]) {
    const y = CY + k * rf * YS;
    const half = Math.sqrt(Math.max(0, 1 - k * k)) * rf * 0.94;
    out.push(
      `    <path d="M ${n(CX - half)} ${n(y)} Q ${CX} ${n(y + bow * rf * YS)} ${n(CX + half)} ${n(y)}" fill="none" stroke="${C.grain}" stroke-width="5" opacity="0.16" stroke-linecap="round"/>`,
    );
  }
  // drilled holes with a lit lip along the near inside edge
  for (const h of HOLES) {
    const p = at(h);
    out.push(`    <ellipse cx="${n(p.x)}" cy="${n(p.y)}" rx="${n(hrx)}" ry="${n(hry)}" fill="url(#hole)"/>`);
    const lx = hrx * 0.82, ly = hry * 0.82, a0 = Math.PI * 0.14, a1 = Math.PI * 0.86;
    out.push(
      `    <path d="M ${n(p.x + lx * Math.cos(a0))} ${n(p.y + ly * Math.sin(a0))} A ${n(lx)} ${n(ly)} 0 0 0 ${n(p.x + lx * Math.cos(a1))} ${n(p.y + ly * Math.sin(a1))}" fill="none" stroke="${C.holeLip}" stroke-width="${n(Math.max(2, hry * 0.3))}" opacity="0.45" stroke-linecap="round"/>`,
    );
  }
  // the pegs, back row first
  for (const { h, i } of SORTED) {
    const p = at(h);
    out.push(peg(p.x, p.y, FACE_UP[i], false));
  }
  return out.join('\n');
}

/**
 * @param {object} o
 * @param {string|null} o.bg     background fill, or null for transparent
 * @param {number} o.scale       scale of the 1024 art within the 1024 canvas
 * @param {boolean} o.mono       white silhouette instead of full colour
 */
function svg({ bg, scale, mono }) {
  const t = scale === 1 ? '' : ` transform="translate(${((1 - scale) * 1024) / 2} ${((1 - scale) * 1024) / 2}) scale(${scale})"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <title>Peg Recall</title>
${bg ? `  <rect x="0" y="0" width="1024" height="1024" fill="${bg}"/>\n` : ''}  <g${t}>
${art(mono)}
  </g>
</svg>
`;
}

const files = {
  // Full-bleed store icon. No transparency, no baked rounded corners.
  'icon.svg': svg({ bg: C.page, scale: 1, mono: false }),
  // Splash: the mark at half size on the page colour.
  'splash-icon.svg': svg({ bg: '#F6F1E8', scale: 0.5, mono: false }),
  // Android adaptive foreground: art inside the 66% safe zone, transparent bg.
  'android-icon-foreground.svg': svg({ bg: null, scale: 0.64, mono: false }),
  'android-icon-background.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${C.page}"/></svg>\n`,
  // Android monochrome: white silhouette on transparent, inside the safe zone.
  'android-icon-monochrome.svg': svg({ bg: null, scale: 0.64, mono: true }),
};

for (const [name, body] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), body);
  console.log('wrote', name, body.length, 'bytes');
}
