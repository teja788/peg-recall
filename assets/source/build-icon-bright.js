#!/usr/bin/env node
/**
 * Color Catch — "Bright" alternate app icon (App Store PPO test vs assets/icon.png).
 *
 *   node assets/source/build-icon-bright.js
 *
 * Same object as the main icon (round wooden peg board, ball-head pegs) but
 * built to read at search-result size: four big saturated pegs instead of
 * seven, board cropped nearly edge to edge, warm sunny background instead of
 * navy. Writes icon-bright.svg here and ../icon-bright.png (1024², opaque RGB,
 * no baked corners). Rasterised with Quick Look like ./rasterize.js.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const png = require('./png');

const C = {
  bgIn: '#FFF07A', bgMid: '#FFCF3A', bgOut: '#FF9F1C',
  faceLit: '#FFD99A', face: '#E9A85C', rim: '#C9803F', wallLit: '#B86F33', wallDark: '#6E3A14',
  hole: '#3E2410', holeLip: '#FFE3B0', shadow: '#5A2E00',
  body: '#F6DDB0',
  red: '#E8180A', blue: '#0A84D6', green: '#00A97A', purple: '#7A1FF0', pink: '#E77BB8',
};

const n = (v) => Math.round(v * 100) / 100;
function shade(hex, amount) {
  const v = parseInt(hex.slice(1), 16);
  const t = amount < 0 ? 0 : 255, k = Math.abs(amount);
  const m = (c) => Math.round(c + (t - c) * k);
  return '#' + ((1 << 24) | (m((v >> 16) & 255) << 16) | (m((v >> 8) & 255) << 8) | m(v & 255)).toString(16).slice(1);
}

// board: a disc seen at 3/4, nearly full width
const CX = 512, CY = 600, R = 478, YS = 0.56, RY = R * YS, EDGE = 58;
// pegs: a diamond of four, painted back to front
const HEAD = 216;               // head diameter
const BODY = HEAD * 0.66;       // stem width
const STEM = HEAD * 1.05;       // head centre -> base
const PEGS = [
  { x: CX, y: CY - 140, col: 'blue' },
  { x: CX - 272, y: CY + 30, col: 'red' },
  { x: CX + 272, y: CY + 30, col: 'green' },
  { x: CX, y: CY + 215, col: 'purple' },
];

function peg({ x, y, col }) {
  const c = C[col], hr = HEAD / 2, br = BODY / 2, hy = y - STEM, bry = br * YS;
  const id = col;
  return `
  <linearGradient id="${id}B" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${shade(C.body, -0.12)}"/><stop offset="0.3" stop-color="${shade(C.body, 0.4)}"/>
    <stop offset="0.75" stop-color="${C.body}"/><stop offset="1" stop-color="${shade(C.body, -0.3)}"/>
  </linearGradient>
  <linearGradient id="${id}N" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${shade(c, -0.1)}"/><stop offset="0.3" stop-color="${shade(c, 0.22)}"/>
    <stop offset="0.75" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.38)}"/>
  </linearGradient>
  <radialGradient id="${id}H" cx="0.36" cy="0.3" r="0.78">
    <stop offset="0" stop-color="${shade(c, 0.45)}"/><stop offset="0.35" stop-color="${shade(c, 0.08)}"/>
    <stop offset="0.8" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.35)}"/>
  </radialGradient>
  <ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(br * 1.32)}" ry="${n(bry * 1.32)}" fill="${C.hole}"/>
  <ellipse cx="${n(x + 18)}" cy="${n(y + 6)}" rx="${n(br * 1.5)}" ry="${n(bry * 1.1)}" fill="${C.shadow}" opacity="0.18"/>
  <path d="M ${n(x - br)} ${n(hy)} L ${n(x - br)} ${n(y)} A ${n(br)} ${n(bry)} 0 0 0 ${n(x + br)} ${n(y)} L ${n(x + br)} ${n(hy)} Z" fill="url(#${id}B)"/>
  <path d="M ${n(x - br)} ${n(hy)} L ${n(x - br)} ${n(hy + STEM * 0.52)} A ${n(br)} ${n(bry)} 0 0 0 ${n(x + br)} ${n(hy + STEM * 0.52)} L ${n(x + br)} ${n(hy)} Z" fill="url(#${id}N)"/>
  <ellipse cx="${n(x)}" cy="${n(hy + hr * 0.78)}" rx="${n(br * 1.02)}" ry="${n(bry * 0.9)}" fill="${shade(c, -0.45)}" opacity="0.45"/>
  <circle cx="${n(x)}" cy="${n(hy)}" r="${n(hr)}" fill="url(#${id}H)" stroke="${shade(c, -0.5)}" stroke-width="5"/>
  <ellipse cx="${n(x - hr * 0.36)}" cy="${n(hy - hr * 0.42)}" rx="${n(hr * 0.3)}" ry="${n(hr * 0.17)}" fill="#FFFFFF" opacity="0.75" transform="rotate(-30 ${n(x - hr * 0.36)} ${n(hy - hr * 0.42)})"/>`;
}

function svg() {
  const rf = R * 0.9;
  const shadows = [[1.02, 0.1], [0.97, 0.14], [0.92, 0.18]]
    .map(([k, op]) => `  <ellipse cx="${CX + 6}" cy="${CY + EDGE + 14}" rx="${n(R * k)}" ry="${n(RY * k * 0.7)}" fill="${C.shadow}" opacity="${op}"/>`)
    .join('\n');
  const grain = [[-0.55, 0.07], [-0.1, -0.06], [0.4, 0.07]]
    .map(([k, bow]) => {
      const y = CY + k * rf * YS, half = Math.sqrt(1 - k * k) * rf * 0.93;
      return `  <path d="M ${n(CX - half)} ${n(y)} Q ${CX} ${n(y + bow * rf * YS)} ${n(CX + half)} ${n(y)}" fill="none" stroke="${C.rim}" stroke-width="6" opacity="0.22" stroke-linecap="round"/>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <title>Color Catch Bright</title>
  <radialGradient id="bg" cx="0.5" cy="0.32" r="0.85">
    <stop offset="0" stop-color="${C.bgIn}"/><stop offset="0.55" stop-color="${C.bgMid}"/><stop offset="1" stop-color="${C.bgOut}"/>
  </radialGradient>
  <radialGradient id="face" cx="0.42" cy="0.3" r="0.8">
    <stop offset="0" stop-color="${C.faceLit}"/><stop offset="1" stop-color="${C.face}"/>
  </radialGradient>
  <linearGradient id="wall" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.wallDark}"/><stop offset="0.35" stop-color="${C.wallLit}"/>
    <stop offset="0.75" stop-color="${shade(C.wallLit, -0.2)}"/><stop offset="1" stop-color="${C.wallDark}"/>
  </linearGradient>
  <rect width="1024" height="1024" fill="url(#bg)"/>
${shadows}
  <path d="M ${CX - R} ${CY} L ${CX - R} ${CY + EDGE} A ${R} ${n(RY)} 0 0 0 ${CX + R} ${CY + EDGE} L ${CX + R} ${CY} Z" fill="url(#wall)"/>
  <ellipse cx="${CX}" cy="${CY}" rx="${R}" ry="${n(RY)}" fill="${C.rim}"/>
  <ellipse cx="${CX}" cy="${CY}" rx="${n(R * 0.95)}" ry="${n(RY * 0.95)}" fill="${shade(C.rim, -0.18)}"/>
  <ellipse cx="${CX}" cy="${CY + 4}" rx="${n(rf)}" ry="${n(rf * YS)}" fill="url(#face)"/>
${grain}
${PEGS.map(peg).join('\n')}
</svg>
`;
}

const OUT_SVG = path.join(__dirname, 'icon-bright.svg');
fs.writeFileSync(OUT_SVG, svg());
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pegrecall-bright-'));
execFileSync('qlmanage', ['-t', '-s', '1024', '-o', tmp, OUT_SVG], { stdio: 'ignore' });
const img = png.decode(path.join(tmp, 'icon-bright.svg.png'));
const out = path.join(__dirname, '..', 'icon-bright.png');
png.encode(out, img, false); // colour type 2: no alpha channel (App Store requirement)
fs.rmSync(tmp, { recursive: true, force: true });
console.log('wrote', out, `${img.width}x${img.height}`);
