/**
 * Smoke test for the web game, run against the export (npm run build:web,
 * then npm run smoke:web). Serves dist/ the way Cloudflare Pages does (a file
 * if it exists, else index.html, so /join/482913 works) and checks in headless
 * Chromium what the published web game must do:
 *
 *  - Home, Settings and a deep link load with no page errors;
 *  - nothing can be bought: no Restore, no tips, and a locked option opens
 *    the "get the app" sheet;
 *  - the daily board deals and shows its reveal.
 *
 * Screenshots (phone, tablet, desktop) go to web-smoke/ for a look by eye.
 *
 * Browser: the shared Playwright Chromium (`npx playwright@1.47.0 install
 * chromium`), or any Chrome/Chromium binary in PW_CHROMIUM.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const DIST = path.resolve(process.argv[2] ?? 'dist');
const SHOTS = path.resolve('web-smoke');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.m4a': 'audio/mp4',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

/** dist/ as Cloudflare Pages serves it: real files, else the app's index.html. */
function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const file = path.join(DIST, decodeURIComponent(url.pathname));
    const inside = file.startsWith(DIST + path.sep) || file === DIST;
    const real = inside && fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
    const target = real ?? path.join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[path.extname(target)] ?? 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const failures = [];
function check(ok, what) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`no ${DIST}/index.html: run npm run build:web first`);
  process.exit(1);
}
fs.mkdirSync(SHOTS, { recursive: true });

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
});

try {
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const seen = (text, opts) => page.getByText(text, opts).first().isVisible();

  // Home
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.getByText("Today's board", { exact: false }).first().waitFor({ timeout: 15000 });
  check(true, 'Home loads');
  await page.screenshot({ path: path.join(SHOTS, 'home-390.png') });

  // a locked option opens the "get the app" sheet, not a purchase
  await page.getByText('Big', { exact: true }).first().click();
  const appOnly = page.getByText('To unlock everything, get Color Catch for iPhone or iPad.');
  await appOnly.waitFor({ timeout: 5000 }).catch(() => {});
  check(await appOnly.isVisible(), 'locked Big board opens the "get the app" sheet');
  check(await seen('Get it on the App Store'), 'the sheet links to the App Store');
  check(!(await seen('Restore purchase')), 'the sheet offers no purchase or restore');
  await page.waitForTimeout(600); // let the sheet finish sliding up
  await page.screenshot({ path: path.join(SHOTS, 'get-app-390.png') });

  // Settings, opened straight from its address (the single-page fallback)
  await page.goto(`${base}/settings`, { waitUntil: 'networkidle' });
  await page.getByText('Settings', { exact: true }).first().waitFor({ timeout: 15000 });
  check(true, 'a deep link (/settings) loads');
  check(await seen('Unlock everything'), 'Settings keeps the Unlock everything row');
  check(!(await seen('Restore purchase')), 'Settings has no Restore on the web');
  check(!(await seen('Support Color Catch')), 'Settings has no tip jar on the web');

  // a path the game does not know yet still gets the app, not a 404
  const join = await page.goto(`${base}/join/482913`, { waitUntil: 'networkidle' });
  check(join?.status() === 200, '/join/482913 is served the app (status 200)');

  // the daily board deals and shows the reveal
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.getByText("Today's board", { exact: false }).first().click();
  const look = page.getByText('Look and remember!');
  await look.waitFor({ timeout: 15000 }).catch(() => {});
  check(await look.isVisible(), "Today's board deals and shows the reveal");
  await page.screenshot({ path: path.join(SHOTS, 'daily-390.png') });

  // Home at tablet and desktop widths
  for (const [w, h] of [[768, 1024], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.getByText("Today's board", { exact: false }).first().waitFor({ timeout: 15000 });
    await page.screenshot({ path: path.join(SHOTS, `home-${w}.png`) });
  }

  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  check(false, `smoke run stopped: ${e instanceof Error ? e.message : e}`);
} finally {
  await browser.close();
  server.close();
}

console.log(failures.length ? `\n${failures.length} failed` : `\nall passed (screenshots in ${path.relative(process.cwd(), SHOTS)}/)`);
process.exit(failures.length ? 1 : 0);
