/**
 * Online play, end to end, in two browsers (PLAN-web-online.md §B11):
 * Maya starts a room, Dadi opens the invite link and joins, Maya starts,
 * both play a whole Small-board game against each other through the room
 * server, then Maya deals a rematch.
 *
 *   npm --prefix server run build
 *   EXPO_PUBLIC_ROOMS_URL=ws://127.0.0.1:8787/ws npm run build:web
 *   npm run e2e:online
 *
 * Starts the room server (server/dist/server.mjs) on :8787 and serves dist/
 * like Cloudflare Pages does. Screenshots go to web-smoke/online-*.png.
 *
 * E2E_ROOMS=cloudflare runs the room server in Cloudflare's own runtime
 * instead (`wrangler dev`, server/src/cloudflare.ts; no account needed).
 * Browser: as for web-smoke.mjs (PW_CHROMIUM for another binary).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const DIST = path.resolve('dist');
const SHOTS = path.resolve('web-smoke');
const SERVER = path.resolve('server/dist/server.mjs');
const PORT = 8787;

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.m4a': 'audio/mp4', '.ttf': 'font/ttf' };

function serveDist() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const file = path.join(DIST, decodeURIComponent(url.pathname));
    const real = file.startsWith(DIST + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
    const target = real ?? path.join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[path.extname(target)] ?? 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

for (const [file, hint] of [
  [path.join(DIST, 'index.html'), 'EXPO_PUBLIC_ROOMS_URL=ws://127.0.0.1:8787/ws npm run build:web'],
  [SERVER, 'npm --prefix server run build'],
]) {
  if (!fs.existsSync(file)) {
    console.error(`missing ${path.relative(process.cwd(), file)}: run ${hint}`);
    process.exit(1);
  }
}
fs.mkdirSync(SHOTS, { recursive: true });

const onCloudflare = process.env.E2E_ROOMS === 'cloudflare';
const rooms = onCloudflare
  ? spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--ip', '127.0.0.1'], {
      cwd: path.resolve('server'),
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' },
      stdio: 'ignore',
      detached: true,
    })
  : spawn(process.execPath, [SERVER], { env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' }, stdio: 'ignore' });
/** the room server is up when /health answers */
async function serverUp() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/health`)).ok) return true;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
if (!(await serverUp())) {
  console.error('the room server did not start');
  process.exit(1);
}
console.log(`room server: ${onCloudflare ? 'Cloudflare (wrangler dev)' : 'Node'}`);
const web = await serveDist();
const base = `http://127.0.0.1:${web.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `online-${name}.png`) });

async function device(name) {
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.label = name;
  return page;
}

/** Roll or pick when it is this page's turn; true if it did something. */
async function playMove(page) {
  const roll = page.getByRole('button', { name: 'Roll the die' });
  if ((await roll.count()) && (await roll.first().isEnabled().catch(() => false))) {
    await roll.first().click({ timeout: 1000 }).catch(() => {});
    return true;
  }
  const peg = page.getByRole('button', { name: /, hidden$/ });
  if ((await peg.count()) && (await peg.first().isEnabled().catch(() => false))) {
    await peg.first().click({ timeout: 1000 }).catch(() => {});
    return true;
  }
  return false;
}

const over = (page) => page.getByText('Share result', { exact: false }).first().isVisible().catch(() => false);

try {
  const maya = await device('Maya');
  const dadi = await device('Dadi');

  // Maya starts a room on the Small board
  await maya.goto(`${base}/`, { waitUntil: 'networkidle' });
  await maya.getByText('Play online', { exact: true }).first().click();
  await maya.getByLabel('Your name').fill('Maya');
  await maya.getByText('Small · 16 pegs', { exact: true }).click();
  await maya.getByRole('button', { name: 'Create room' }).click();
  await maya.waitForURL(/\/room\/\d{6}$/, { timeout: 10000 });
  const code = maya.url().match(/(\d{6})$/)[1];
  check(true, `Maya created room ${code}`);
  await shot(maya, '1-lobby-host');

  // Dadi opens the invite link
  await dadi.goto(`${base}/join/${code}`, { waitUntil: 'networkidle' });
  check(await dadi.getByText('You’re invited to play Color Catch').isVisible(), 'the invite page greets Dadi');
  await dadi.getByLabel('Your name').fill('Dadi');
  await dadi.getByRole('button', { name: 'Join', exact: true }).click();
  await dadi.waitForURL(new RegExp(`/room/${code}$`), { timeout: 10000 });
  await maya.getByText('Dadi', { exact: true }).waitFor({ timeout: 5000 });
  check(true, 'Maya sees Dadi arrive');
  check(await dadi.getByText('Waiting for Maya to start').isVisible(), 'Dadi waits for the host');
  await shot(dadi, '2-lobby-guest');

  // Maya starts: both go to the table
  await maya.getByRole('button', { name: 'Start the game' }).click();
  await Promise.all([maya, dadi].map((p) => p.waitForURL(/\/game\?room=/, { timeout: 10000 })));
  await Promise.all([maya, dadi].map((p) => p.getByText('Look and remember!').waitFor({ timeout: 5000 })));
  check(true, 'both screens show the same reveal');
  await shot(dadi, '3-reveal');

  // play it out
  const deadline = Date.now() + 4 * 60_000;
  let moves = 0;
  while (Date.now() < deadline) {
    if ((await over(maya)) && (await over(dadi))) break;
    for (const p of [maya, dadi]) if (await playMove(p)) moves++;
    await maya.waitForTimeout(150);
  }
  check((await over(maya)) && (await over(dadi)), `the game finished on both screens (${moves} moves)`);
  await shot(maya, '4-over-host');
  await shot(dadi, '5-over-guest');
  check(await maya.getByRole('button', { name: 'Play again' }).isVisible(), 'Maya (host) can deal the next game');
  check(await dadi.getByText('Waiting for Maya to start the next game').isVisible(), 'Dadi waits for Maya');

  // rematch
  await maya.getByRole('button', { name: 'Play again' }).click();
  await Promise.all([maya, dadi].map((p) => p.getByText('Look and remember!').waitFor({ timeout: 5000 })));
  check(true, 'Play again deals a new board for both');

  for (const p of [maya, dadi]) check(p.errors.length === 0, `${p.label}: no page errors ${p.errors.join(' | ')}`);
} catch (e) {
  check(false, `stopped: ${e instanceof Error ? e.message : e}`);
} finally {
  await browser.close();
  web.close();
  // wrangler starts workerd as a child: stop the whole group
  if (onCloudflare) process.kill(-rooms.pid, 'SIGTERM');
  else rooms.kill('SIGTERM');
}

console.log(failures.length ? `\n${failures.length} failed` : '\nall passed');
process.exit(failures.length ? 1 : 0);
