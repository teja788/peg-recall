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
  pegCap: '#D9C3A5',    // natural, face-down peg
  pegCapRim: '#AE8E67',
  pegBody: '#B9986F',
  pegBodyDark: '#82694E',
  shadow: '#3A2A1B',
  orange: '#E69F00', orangeRim: '#B87E00', orangeDark: '#79520D',
  blue: '#0072B2', blueRim: '#005688', blueDark: '#00385A',
  green: '#009E73', greenRim: '#00795A', greenDark: '#004F3B',
};

// Board centred in the 1024 canvas.
const CX = 512, CY = 512, R = 420;
// 7 pegs: centre + hex ring. radiusUnits = 1 + 0.5 + 0.25 (roundLayout pads).
const SPACING = R / 1.75;
const PEG = SPACING * 0.9;
const RING = [0, 1, 2, 3, 4, 5].map((i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2; // start at 12 o'clock
  return { x: CX + SPACING * Math.cos(a), y: CY + SPACING * Math.sin(a) };
});
const HOLES = [{ x: CX, y: CY }, ...RING];
// index into HOLES -> face-up colour. 0 = centre.
const FACE_UP = { 0: 'blue', 1: 'orange', 3: 'green' };

const n = (v) => Math.round(v * 100) / 100;

/** One peg: contact shadow, cylinder body, cap, cap edge, highlight. */
function peg(cx, cy, key, mono) {
  const rx = PEG * 0.42, ry = PEG * 0.27;
  const capY = cy - PEG / 2 + PEG * 0.4;
  const botY = capY + PEG * 0.24;
  if (mono) {
    return key
      ? `    <ellipse cx="${n(cx)}" cy="${n(capY)}" rx="${n(rx)}" ry="${n(ry)}" fill="#FFFFFF"/>`
      : `    <ellipse cx="${n(cx)}" cy="${n(capY)}" rx="${n(rx - 11)}" ry="${n(ry - 11)}" fill="none" stroke="#FFFFFF" stroke-width="22"/>`;
  }
  const cap = key ? C[key] : C.pegCap;
  const body = key ? C[key + 'Rim'] : C.pegBody;
  const dark = key ? C[key + 'Dark'] : C.pegBodyDark;
  const rim = key ? C[key + 'Rim'] : C.pegCapRim;
  const gloss = key ? 0.36 : 0.3;
  const id = `pg${Math.round(cx)}_${Math.round(cy)}`;
  return [
    `    <linearGradient id="${id}" x1="0.18" y1="0" x2="0.86" y2="1">`,
    `      <stop offset="0" stop-color="${body}"/><stop offset="1" stop-color="${dark}"/>`,
    `    </linearGradient>`,
    `    <ellipse cx="${n(cx + 3)}" cy="${n(botY + PEG * 0.1)}" rx="${n(rx * 0.98)}" ry="${n(ry * 0.42)}" fill="${C.shadow}" opacity="0.22"/>`,
    `    <path d="M ${n(cx - rx)} ${n(capY)} L ${n(cx - rx)} ${n(botY)} A ${n(rx)} ${n(ry)} 0 0 0 ${n(cx + rx)} ${n(botY)} L ${n(cx + rx)} ${n(capY)} Z" fill="url(#${id})"/>`,
    `    <ellipse cx="${n(cx)}" cy="${n(capY)}" rx="${n(rx)}" ry="${n(ry)}" fill="${cap}"/>`,
    `    <ellipse cx="${n(cx)}" cy="${n(capY)}" rx="${n(rx * 0.985)}" ry="${n(ry * 0.975)}" fill="none" stroke="${rim}" stroke-width="${n(PEG * 0.03)}" opacity="0.75"/>`,
    `    <ellipse cx="${n(cx - rx * 0.26)}" cy="${n(capY - ry * 0.32)}" rx="${n(rx * 0.46)}" ry="${n(ry * 0.4)}" fill="#FFFFFF" opacity="${gloss}"/>`,
  ].join('\n');
}

function art(mono) {
  if (mono) {
    return [
      `    <circle cx="${CX}" cy="${CY}" r="${R - 14}" fill="none" stroke="#FFFFFF" stroke-width="28"/>`,
      ...HOLES.map((h, i) => peg(h.x, h.y, FACE_UP[i], true)),
    ].join('\n');
  }
  const rf = R * 0.932;
  const out = [
    `    <radialGradient id="face" cx="0.5" cy="0.4" r="0.72">`,
    `      <stop offset="0" stop-color="${C.faceLit}"/><stop offset="1" stop-color="${C.face}"/>`,
    `    </radialGradient>`,
    `    <linearGradient id="hole" x1="0.5" y1="0" x2="0.5" y2="1">`,
    `      <stop offset="0" stop-color="${C.holeDeep}"/><stop offset="1" stop-color="${C.hole}"/>`,
    `    </linearGradient>`,
    // drop shadow: three stacked ellipses, faintest and widest first
    `    <ellipse cx="${CX}" cy="${CY + 22}" rx="${R}" ry="${n(R * 0.985)}" fill="${C.shadow}" opacity="0.07"/>`,
    `    <ellipse cx="${CX}" cy="${CY + 22}" rx="${n(R * 0.975)}" ry="${n(R * 0.96)}" fill="${C.shadow}" opacity="0.11"/>`,
    `    <ellipse cx="${CX}" cy="${CY + 22}" rx="${n(R * 0.945)}" ry="${n(R * 0.93)}" fill="${C.shadow}" opacity="0.16"/>`,
    `    <circle cx="${CX}" cy="${CY}" r="${R}" fill="${C.rim}"/>`,
    `    <circle cx="${CX}" cy="${CY}" r="${n(R * 0.955)}" fill="${C.bevel}"/>`,
    `    <circle cx="${CX}" cy="${CY}" r="${n(rf)}" fill="url(#face)"/>`,
    `    <circle cx="${CX}" cy="${CY}" r="${n(rf * 0.995)}" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.22"/>`,
  ];
  // grain: quadratic arcs whose control point is inside the face circle
  for (const [k, bow] of [[-0.62, 0.1], [-0.24, -0.08], [0.22, 0.09], [0.6, -0.07]]) {
    const y = CY + k * rf;
    const half = Math.sqrt(Math.max(0, rf * rf - (k * rf) * (k * rf))) * 0.94;
    out.push(
      `    <path d="M ${n(CX - half)} ${n(y)} Q ${CX} ${n(y + bow * rf)} ${n(CX + half)} ${n(y)}" fill="none" stroke="${C.grain}" stroke-width="5" opacity="0.18" stroke-linecap="round"/>`
    );
  }
  // drilled holes, then the pegs standing in them
  for (const h of HOLES) {
    out.push(`    <circle cx="${n(h.x)}" cy="${n(h.y)}" r="${n((PEG * 0.9) / 2)}" fill="url(#hole)"/>`);
  }
  HOLES.forEach((h, i) => out.push(peg(h.x, h.y, FACE_UP[i], false)));
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
