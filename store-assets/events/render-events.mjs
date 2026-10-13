/**
 * In-App Event media (Oct 2026): event card 1920x1080 (16:9) and event details
 * page 1080x1920 (9:16) for each event in store-assets/events/<slug>/.
 *
 *   node store-assets/events/render-events.mjs
 *
 * The board is the app's own artwork, cut out of creative/header.png (the
 * product page header) on the fly. No text, no prices, no logos (Apple: "avoid text or
 * logos in media"); no borders or bottom fades (the App Store adds its own).
 * Decorations sit behind the board. The lower part of each image stays quiet: the App Store lays the event name
 * and description over it. Alpha is flattened.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const { chromium } = createRequire(import.meta.url)('playwright-core');
const header = `data:image/png;base64,${readFileSync(path.join(here, '..', 'creative', 'header.png')).toString('base64')}`;
const PEGS = ['#CE1202', '#F0E442', '#009E73', '#0072B2', '#6201DA', '#CC79A7'];

// The board inside header.png (3840x1646): this box holds the pegs and the
// wooden disc on the app's table blue. `cutBoard` (run in the browser) keys
// that blue out by flood fill from the box's edges, so the board can sit on
// any background with its own soft shadow.
const CROP = { x: 900, y: 30, w: 2040, h: 1610 };
let cut = ''; // data URL of the cut-out board, set before rendering
async function cutBoard(browser) {
  const page = await browser.newPage();
  cut = await page.evaluate(async ({ src, c }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const cv = new OffscreenCanvas(c.w, c.h), g = cv.getContext('2d');
    g.drawImage(img, -c.x, -c.y);
    // decisions are made on a blurred copy: the app's thin lattice lines vanish,
    // while the edges of pegs and board stay steep
    const bc = new OffscreenCanvas(c.w, c.h), bg2 = bc.getContext('2d');
    bg2.filter = 'blur(3px)';
    bg2.drawImage(cv, 0, 0);
    const d = bg2.getImageData(0, 0, c.w, c.h).data, W = c.w, H = c.h;
    // background model: per row, the mean of the 12 outermost columns each side
    const side = (y, x0) => { const a = [0, 0, 0]; for (let x = x0; x < x0 + 12; x++) for (let k = 0; k < 3; k++) a[k] += d[(y * W + x) * 4 + k] / 12; return a; };
    const bgL = [], bgR = [];
    for (let y = 0; y < H; y++) { bgL.push(side(y, 0)); bgR.push(side(y, W - 12)); }
    // a pixel joins the background when it is close to the neighbour it was
    // reached from (the table is smooth; peg and board edges are sharp steps)
    // and not far from the table colour of its row
    const dist2 = (i, j) => { let s = 0; for (let k = 0; k < 3; k++) { const e = d[i * 4 + k] - d[j * 4 + k]; s += e * e; } return s; };
    const nearTable = (i) => {
      const x = i % W, y = (i / W) | 0, t = x / W;
      let s = 0;
      for (let k = 0; k < 3; k++) { const e = d[i * 4 + k] - (bgL[y][k] * (1 - t) + bgR[y][k] * t); s += e * e; }
      return s < 60 * 60 && d[i * 4 + 2] > d[i * 4 + 1] + 8; // the table is blue, the green pegs are not
    };
    const bg = new Uint8Array(W * H), stack = [];
    for (let x = 0; x < W; x++) stack.push(x, x, (H - 1) * W + x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) stack.push(y * W, y * W, y * W + W - 1, y * W + W - 1);
    while (stack.length) {
      const from = stack.pop(), i = stack.pop();
      if (bg[i] || dist2(i, from) > 8 * 8 || !nearTable(i)) continue;
      bg[i] = 1;
      const x = i % W;
      if (x > 0) stack.push(i - 1, i);
      if (x < W - 1) stack.push(i + 1, i);
      if (i >= W) stack.push(i - W, i);
      if (i < W * (H - 1)) stack.push(i + W, i);
    }
    const m = new ImageData(W, H);
    for (let i = 0; i < W * H; i++) m.data[i * 4 + 3] = bg[i] ? 0 : 255;
    const mc = new OffscreenCanvas(W, H);
    mc.getContext('2d').putImageData(m, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.filter = 'blur(1.5px)'; // soft, anti-aliased edge
    g.drawImage(mc, 0, 0);
    const blob = await cv.convertToBlob({ type: 'image/png' });
    return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  }, { src: header, c: CROP });
  await page.close();
}
const board = (cx, top, w) => `<img src="${cut}" style="position:absolute;left:${cx - w / 2}px;top:${top}px;width:${w}px;
  filter:drop-shadow(0 ${w / 60}px ${w / 40}px rgba(0,0,0,.45))">`;
const boardH = (w) => CROP.h * w / CROP.w;

// the app's table: blue gradient + argyle lattice (src/ui/Backdrop.tsx: CELL 36pt, 7% white)
const table = (w, h, top, bottom) => `<svg width="${w}" height="${h}" style="position:absolute;left:0;top:0">
  <defs><linearGradient id="tb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
  <pattern id="argyle" width="38" height="38" patternUnits="userSpaceOnUse">
    <path d="M19 0 L38 19 L19 38 L0 19Z" fill="none" stroke="#fff" stroke-width="1.3"/>
    <path d="M0 0 L38 38 M38 0 L0 38" fill="none" stroke="#fff" stroke-width=".6"/>
  </pattern>
  <radialGradient id="vig" cx=".5" cy=".44" r=".75"><stop offset=".55" stop-color="#06121E" stop-opacity="0"/><stop offset="1" stop-color="#06121E" stop-opacity=".45"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#tb)"/><rect width="${w}" height="${h}" fill="url(#argyle)" opacity=".07"/>
  <rect width="${w}" height="${h}" fill="url(#vig)"/></svg>`;

// deterministic "random" so re-renders are identical
let seed;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/* ---------------------------------------------------------------- Diwali */
const diya = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <ellipse cx="0" cy="-58" rx="70" ry="70" fill="url(#glow)"/>
  <path d="M0 -92 C14 -70 16 -52 0 -40 C-16 -52 -14 -70 0 -92Z" fill="url(#flame)"/>
  <path d="M0 -76 C6 -64 6 -54 0 -46 C-6 -54 -6 -64 0 -76Z" fill="#FFF8D6"/>
  <path d="M-70 -34 Q-74 -30 -66 -26 Q0 34 66 -26 Q74 -30 70 -34 Q60 -40 46 -36 Q0 -20 -46 -36 Q-60 -40 -70 -34Z" fill="#B4532A"/>
  <path d="M-62 -30 Q0 26 62 -30" fill="none" stroke="#7A2F14" stroke-width="5"/>
  <ellipse cx="0" cy="-33" rx="50" ry="9" fill="#5B2410"/>
  <ellipse cx="0" cy="-34" rx="40" ry="6" fill="#E8A33A"/>
  ${[-40, -20, 0, 20, 40].map((dx, i) => `<circle cx="${dx}" cy="${-12 + Math.abs(dx) * 0.25}" r="5" fill="${PEGS[i % PEGS.length]}"/>`).join('')}
</g>`;

const lights = (x1, y1, x2, y2, sag, n, r = 11) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag;
  let out = `<path d="M${x1} ${y1} Q${mx} ${my + sag} ${x2} ${y2}" fill="none" stroke="#0B1E2E" stroke-width="3" opacity=".8"/>`;
  for (let i = 1; i < n; i++) {
    const t = i / n, x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2;
    const y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * (my + sag) + t * t * y2;
    const c = PEGS[i % PEGS.length];
    out += `<circle cx="${x}" cy="${y + r + 4}" r="${r * 3}" fill="${c}" opacity=".22" filter="url(#soft)"/>
      <rect x="${x - 4}" y="${y}" width="8" height="7" fill="#2B2622"/>
      <ellipse cx="${x}" cy="${y + r + 6}" rx="${r * 0.8}" ry="${r}" fill="${c}"/>
      <ellipse cx="${x - r * 0.25}" cy="${y + r + 2}" rx="${r * 0.25}" ry="${r * 0.35}" fill="#fff" opacity=".7"/>`;
  }
  return out;
};

const sparkles = (w, h, n, box) => Array.from({ length: n }, () => {
  const x = box.x + rnd() * box.w, y = box.y + rnd() * box.h, r = 1.5 + rnd() * 3;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFE9A8" opacity="${0.35 + rnd() * 0.5}"/>`;
}).join('');

const diwaliDefs = `<defs>
  <radialGradient id="glow"><stop offset="0" stop-color="#FFD36B" stop-opacity=".75"/><stop offset=".45" stop-color="#FF9E2C" stop-opacity=".25"/><stop offset="1" stop-color="#FF9E2C" stop-opacity="0"/></radialGradient>
  <radialGradient id="flame" cx=".5" cy=".7" r=".7"><stop offset="0" stop-color="#FFF4B0"/><stop offset=".5" stop-color="#FFB02E"/><stop offset="1" stop-color="#E5531A"/></radialGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`;


const diwaliCard = () => `<body style="margin:0;width:1920px;height:1080px;overflow:hidden;position:relative;">
${table(1920, 1080, '#173A57', '#0B1B2C')}
<svg width="1920" height="1080" style="position:absolute;left:0;top:0">${diwaliDefs}
  ${sparkles(1920, 1080, 70, { x: 0, y: 0, w: 1920, h: 520 })}
  ${lights(-20, 40, 700, 70, 60, 9)}${lights(1220, 70, 1940, 40, 60, 9)}
  ${lights(-20, 200, 380, 330, 30, 5)}${lights(1540, 330, 1940, 200, 30, 5)}
  ${diya(250, 820, 1.25)}${diya(420, 900, 1.0)}${diya(1500, 900, 1.0)}${diya(1670, 820, 1.25)}
</svg>${board(960, 50, 1060)}</body>`;

const diwaliDetails = () => `<body style="margin:0;width:1080px;height:1920px;overflow:hidden;position:relative;">
${table(1080, 1920, '#173A57', '#0B1B2C')}
<svg width="1080" height="1920" style="position:absolute;left:0;top:0">${diwaliDefs}
  ${sparkles(1080, 1920, 90, { x: 0, y: 0, w: 1080, h: 560 })}
  ${lights(-20, 90, 1100, 90, 70, 12)}${lights(-20, 300, 1100, 300, 60, 12)}
  ${diya(180, 1500, 1.15)}${diya(400, 1560, 0.95)}${diya(680, 1560, 0.95)}${diya(900, 1500, 1.15)}
</svg>${board(540, 560, 1000)}</body>`;

/* -------------------------------------------------------- Children's Day */
const balloon = (x, y, c, s = 1, tilt = 0) => `<g transform="translate(${x} ${y}) rotate(${tilt}) scale(${s})">
  <path d="M0 92 C-14 140 18 170 -4 230" fill="none" stroke="#F4EBDD" stroke-width="3" opacity=".8"/>
  <ellipse cx="0" cy="0" rx="72" ry="88" fill="${c}"/>
  <ellipse cx="-26" cy="-34" rx="16" ry="26" fill="#fff" opacity=".45" transform="rotate(-24 -26 -34)"/>
  <path d="M-10 86 L10 86 L0 100Z" fill="${c}"/>
</g>`;

const kite = (x, y, s = 1, tilt = -12) => `<g transform="translate(${x} ${y}) rotate(${tilt}) scale(${s})">
  <path d="M0 -110 L80 0 L0 110 L-80 0Z" fill="${PEGS[4]}"/>
  <path d="M0 -110 L80 0 L0 0Z" fill="${PEGS[1]}"/><path d="M0 0 L-80 0 L0 110Z" fill="${PEGS[0]}"/>
  <path d="M0 -110 V110 M-80 0 H80" stroke="#2B2622" stroke-width="3"/>
  <path d="M0 110 C30 170 -30 210 10 280 C40 330 -10 370 20 420" fill="none" stroke="#F4EBDD" stroke-width="3"/>
  ${[[14, 170, 2], [-6, 250, 3], [22, 340, 5]].map(([bx, by, ci]) => `<path d="M${bx - 18} ${by - 10} L${bx} ${by} L${bx - 18} ${by + 10}Z M${bx + 18} ${by - 10} L${bx} ${by} L${bx + 18} ${by + 10}Z" fill="${PEGS[ci]}"/>`).join('')}
</g>`;

const confetti = (n, box) => Array.from({ length: n }, () => {
  const x = box.x + rnd() * box.w, y = box.y + rnd() * box.h, c = PEGS[Math.floor(rnd() * 6)], a = rnd() * 180;
  return rnd() < 0.5
    ? `<rect x="${x}" y="${y}" width="${10 + rnd() * 10}" height="${22 + rnd() * 14}" rx="3" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`
    : `<circle cx="${x}" cy="${y}" r="${6 + rnd() * 6}" fill="${c}"/>`;
}).join('');


const kidsCard = () => `<body style="margin:0;width:1920px;height:1080px;overflow:hidden;position:relative;">
${table(1920, 1080, '#2A7399', '#1B5478')}
<svg width="1920" height="1080" style="position:absolute;left:0;top:0">
  ${confetti(60, { x: 0, y: 0, w: 1920, h: 560 })}
  ${balloon(150, 300, PEGS[0], 1.15, -8)}${balloon(330, 220, PEGS[1], 1.0, 6)}${balloon(250, 520, PEGS[3], 0.95, -4)}
  ${balloon(1780, 330, PEGS[2], 1.15, 8)}${balloon(1600, 520, PEGS[5], 0.95, 4)}
  ${kite(1620, 170, 0.9, 14)}
</svg>${board(960, 50, 1060)}</body>`;

const kidsDetails = () => `<body style="margin:0;width:1080px;height:1920px;overflow:hidden;position:relative;">
${table(1080, 1920, '#2A7399', '#1B5478')}
<svg width="1080" height="1920" style="position:absolute;left:0;top:0">
  ${confetti(80, { x: 0, y: 0, w: 1080, h: 620 })}
  ${balloon(150, 260, PEGS[0], 1.1, -8)}${balloon(330, 170, PEGS[1], 0.95, 6)}${balloon(930, 300, PEGS[2], 1.1, 8)}
  ${kite(690, 190, 0.85, 14)}
  ${confetti(24, { x: 0, y: 1420, w: 1080, h: 140 })}
</svg>${board(540, 600, 1000)}</body>`;

const jobs = [
  ['diwali-2026', 'event-card.png', 1920, 1080, diwaliCard],
  ['diwali-2026', 'event-details.png', 1080, 1920, diwaliDetails],
  ['childrens-day-2026', 'event-card.png', 1920, 1080, kidsCard],
  ['childrens-day-2026', 'event-details.png', 1080, 1920, kidsDetails],
];

const browser = await chromium.launch();
await cutBoard(browser);
for (const [slug, name, w, h, html] of jobs) {
  const file = path.join(here, slug, name);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  seed = 7; // same confetti and sparkles on every run
  await page.setContent(html(), { waitUntil: 'load' });
  await page.screenshot({ path: file });
  await page.close();
  execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[1])', file]);
  console.log(`${slug}/${name} ${w}x${h}`);
}
await browser.close();
