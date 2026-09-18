#!/usr/bin/env node
/**
 * Peg Recall — SVG -> PNG pipeline, end to end.
 *
 *   node assets/source/build-svg.js && node assets/source/rasterize.js
 *
 * This Mac (macOS 12, 4 GB) has no rsvg-convert and sips cannot read SVG, so
 * the rasteriser is Quick Look (`qlmanage`, WebKit). Quick Look always
 * composites onto WHITE, which would destroy the transparency the Android
 * adaptive foreground and monochrome mark need. So those two are each rendered
 * twice — once over white, once over black — and the straight alpha is
 * recovered exactly:
 *
 *   W = C·a + 255(1-a)    B = C·a
 *   a = 1 - (W - B)/255   C = B/a
 *
 * Final encoding is done by ./png.js so the opaque outputs can be written as
 * PNG colour type 2 (no alpha channel at all) — the App Store rejects a
 * 1024 icon that carries one.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const png = require('./png');

const SRC = __dirname;
const ASSETS = path.join(SRC, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pegrecall-raster-'));

const ql = (files, dir) => {
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('qlmanage', ['-t', '-s', '1024', '-o', dir, ...files], { stdio: 'ignore' });
};

// 1. straight renders (transparency flattened to white by Quick Look)
const FLAT = ['icon', 'splash-icon', 'android-icon-background'];
ql(FLAT.map((n) => path.join(SRC, n + '.svg')), path.join(TMP, 'flat'));

// 2. alpha-bearing marks, rendered over white and over black
const ALPHA = ['android-icon-foreground', 'android-icon-monochrome'];
const mattes = [];
for (const n of ALPHA) {
  const svg = fs.readFileSync(path.join(SRC, n + '.svg'), 'utf8');
  for (const [tag, col] of [['w', '#FFFFFF'], ['k', '#000000']]) {
    const p = path.join(TMP, `${n}.${tag}.svg`);
    fs.writeFileSync(p, svg.replace('</title>', `</title>\n  <rect x="0" y="0" width="1024" height="1024" fill="${col}"/>`));
    mattes.push(p);
  }
}
ql(mattes, path.join(TMP, 'matte'));

function unmatte(name) {
  const w = png.decode(path.join(TMP, 'matte', `${name}.w.svg.png`));
  const k = png.decode(path.join(TMP, 'matte', `${name}.k.svg.png`));
  const n = w.width * w.height;
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    let a = 0;
    for (let c = 0; c < 3; c++) a += 255 - (w.rgba[i * 4 + c] - k.rgba[i * 4 + c]);
    a = Math.min(255, Math.max(0, Math.round(a / 3)));
    out[i * 4 + 3] = a;
    for (let c = 0; c < 3; c++) {
      const v = a === 0 ? 0 : Math.round((k.rgba[i * 4 + c] * 255) / a);
      out[i * 4 + c] = Math.min(255, Math.max(0, v));
    }
  }
  return { width: w.width, height: w.height, rgba: out };
}

const flat = (n) => png.decode(path.join(TMP, 'flat', `${n}.svg.png`));
const icon = flat('icon');

png.encode(path.join(ASSETS, 'icon.png'), icon, false);
png.encode(path.join(ASSETS, 'splash-icon.png'), flat('splash-icon'), false);
png.encode(path.join(ASSETS, 'android-icon-background.png'), flat('android-icon-background'), false);
png.encode(path.join(ASSETS, 'android-icon-foreground.png'), unmatte('android-icon-foreground'), true);
png.encode(path.join(ASSETS, 'android-icon-monochrome.png'), unmatte('android-icon-monochrome'), true);
png.encode(path.join(ASSETS, 'favicon.png'), png.resize(icon, 48, 48), false);

for (const f of ['icon', 'splash-icon', 'android-icon-background', 'android-icon-foreground', 'android-icon-monochrome', 'favicon']) {
  const img = png.decode(path.join(ASSETS, f + '.png'));
  const { minAlpha } = png.stats(img);
  console.log(`${f}.png`.padEnd(32), `${img.width}x${img.height}`, minAlpha === 255 ? 'opaque' : 'has transparency');
}
fs.rmSync(TMP, { recursive: true, force: true });
