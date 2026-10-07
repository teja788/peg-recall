/**
 * App Store creative assets (Oct 2026): product page header + search results.
 *
 *   node store-assets/compose-creative.mjs
 *
 * header.png      3840x1646 (21:9), the board on the table, no text, all locales.
 * <locale>.png    3840x2560 (3:2), localized headline (captions "01-look") over three
 *                 gameplay frames in that language's UI.
 * Output: store-assets/creative/. Alpha is flattened (Apple rejects alpha).
 * Upload: APP=6813625311 VERSION=x.y.z node ~/.claude/skills/ship-ios-app/upload-creative.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const { chromium } = createRequire(import.meta.url)('playwright-core');
const captions = JSON.parse(readFileSync(path.join(root, 'captions.json'), 'utf8'));
const { style } = captions;
const out = path.join(root, 'creative');
mkdirSync(out, { recursive: true });

const b64 = f => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
const font = `@font-face{font-family:N;src:url(data:font/ttf;base64,${readFileSync(path.join(root, style.font)).toString('base64')})}`;
const frames = path.join(root, 'screenshot-frames');
// caption locale -> translated-UI frames folder (same rule as compose-screenshots.mjs)
const frame = (locale, shot) => {
  const own = path.join(frames, locale.split('-')[0], 'iphone-6.5', shot + '.png');
  return existsSync(own) ? own : path.join(frames, 'iphone-6.5', shot + '.png');
};

const header = `<style>
body{margin:0;width:3840px;height:1646px;overflow:hidden;background:linear-gradient(#1b5677,#154a6b)}
div{position:absolute;left:896px;top:43px;width:2048px;height:1560px;
  background:url(${b64(path.join(frames, 'ipad-12.9', '01-look.png'))}) 0 -430px/2048px 2732px;
  -webkit-mask-image:linear-gradient(to right,transparent,#000 2.5%,#000 97.5%,transparent),linear-gradient(transparent,#000 3%,#000 97%,transparent);-webkit-mask-composite:source-in}
</style><div></div>`;

const search = locale => `<style>${font}
body{margin:0;width:3840px;height:2560px;overflow:hidden;background:linear-gradient(${style.background[0]},${style.background[1]});
  font-family:N,-apple-system,'Hiragino Sans','Apple SD Gothic Neo','PingFang TC',sans-serif;color:${style.text}}
.dots{position:absolute;top:150px;width:100%;text-align:center}
.dots i{display:inline-block;width:44px;height:44px;border-radius:50%;margin:0 18px}
h1{position:absolute;top:240px;width:100%;margin:0;text-align:center;font-size:210px;font-weight:900;letter-spacing:-2px}
.row{position:absolute;top:620px;width:100%;display:flex;justify-content:center;gap:170px}
img{height:1860px;border-radius:110px;border:22px solid #2B2622;box-shadow:0 40px 90px rgba(60,40,20,.28)}
</style>
<div class=dots>${style.dots.map(c => `<i style="background:${c}"></i>`).join('')}</div>
<h1>${captions.captions[locale]['01-look']}</h1>
<div class=row>${['01-look', '02-roll', '03-family'].map(s => `<img src="${b64(frame(locale, s))}">`).join('')}</div>`;

const browser = await chromium.launch();
const shoot = async (html, w, h, file) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  await page.close();
  execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[1])', file]);
};
await shoot(header, 3840, 1646, path.join(out, 'header.png'));
for (const locale of Object.keys(captions.captions)) await shoot(search(locale), 3840, 2560, path.join(out, `search-${locale}.png`));
await browser.close();
console.log(`wrote header + ${Object.keys(captions.captions).length} search assets to ${out}`);
