/**
 * App Store screenshot capture for Peg Recall.
 *
 * Drives the Expo *web* build in headless Chromium (Playwright) and writes the
 * six shots of store-assets/screenshots-plan.md at both required sizes.
 *
 *   node store-assets/capture-screenshots.mjs                # both device sets
 *   node store-assets/capture-screenshots.mjs iphone-6.5     # one set
 *
 * Requires a dev server on http://localhost:8089 (override with PEG_URL) and
 * `npx playwright@1.47.0 install chromium` once. Only playwright-core is a
 * package dependency; the browser comes from the shared ms-playwright cache.
 *
 * Why the web build and not the simulator: this Mac (4 GB, macOS 12) boots a
 * simulator in 5-10 minutes and the iOS Simulator MCP panel crashes on it.
 * Headless Chromium runs requestAnimationFrame normally, so the reveal
 * countdown, the die tumble and the confetti all actually animate.
 *
 * How the game is driven: every control carries an accessibilityLabel, which
 * react-native-web renders as aria-label, so the script finds elements by
 * label and dispatches mousedown/mouseup/click on them directly (the RNW
 * responder system listens for those on document). Clicking by coordinate
 * would be wrong for pegs - their hit boxes overlap on the tilted board.
 * During the opening reveal every peg's label carries its colour, so the
 * script memorises the board and can then match or miss on purpose.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.join(HERE, 'screenshots');
const BASE = process.env.PEG_URL ?? 'http://localhost:8089';

/* ------------------------------------------------------------------ devices */

const DEVICES = {
  'iphone-6.5': {
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 3,
    expect: [1284, 2778],
    /** board for shots 2-4 */
    board: 'classic',
    /** board for the 3-player shot */
    board3p: 'big',
  },
  'ipad-12.9': {
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    expect: [2048, 2732],
    // "an iPad screenshot of a 4x4 board looks empty" - screenshots-plan.md
    board: 'big',
    board3p: 'huge',
  },
};

const BOARD_CHIP = {
  small: 'Small · 16 pegs',
  classic: 'Classic · 25 pegs',
  big: 'Big · 36 pegs',
  huge: 'Huge · 40 pegs',
};
const REVEAL_MS = { small: 4000, classic: 6000, big: 8000, huge: 9000 };

/* ------------------------------------------------------- page-side helpers */

/** Runs in the page: press a control by its aria-label. */
function tapInPage(label) {
  const el = Array.from(document.querySelectorAll('[aria-label]')).find(
    (e) => e.getAttribute('aria-label') === label,
  );
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const base = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    button: 0,
    clientX: r.left + r.width / 2,
    clientY: r.top + r.height / 2,
  };
  el.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1 }));
  el.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0 }));
  el.dispatchEvent(new MouseEvent('click', { ...base, buttons: 0 }));
  return true;
}

/** Runs in the page: every aria-label on screen, in DOM order. */
function labelsInPage() {
  return Array.from(document.querySelectorAll('[aria-label]')).map((e) =>
    e.getAttribute('aria-label'),
  );
}

/* ------------------------------------------------------- driver primitives */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function labels(page) {
  return page.evaluate(labelsInPage);
}

async function tap(page, label) {
  const ok = await page.evaluate(tapInPage, label);
  if (!ok) throw new Error(`no control labelled "${label}"`);
  return ok;
}

const PEG_RE = /^Ring (\d+), peg (\d+), (.+)$/;
const TRAY_RE = /^([A-Za-z]+)(, computer)?, (\d+) pegs?(, their turn)?$/;
const BANNERS = new Set(['Look and remember!', 'Sudden death — look and remember!', 'Match!', 'Not that one', 'Board clear!']);

/** Everything the driver needs, read back out of the accessibility labels. */
function readState(ls) {
  const pegs = new Map(); // "Ring 3, peg 2" -> "hidden" | "taken" | colour
  const trays = [];
  let banner = null;
  let die = null;
  for (const l of ls) {
    const p = PEG_RE.exec(l);
    if (p) {
      pegs.set(`Ring ${p[1]}, peg ${p[2]}`, p[3]);
      continue;
    }
    const t = TRAY_RE.exec(l);
    if (t) {
      trays.push({ name: t[1], ai: !!t[2], score: Number(t[3]), active: !!t[4] });
      continue;
    }
    if (l === 'Roll the die' || l === 'Die rolling' || l.startsWith('Die shows ')) {
      die = l;
      continue;
    }
    if (BANNERS.has(l) || /'s turn$/.test(l) || /^Find /.test(l) || / is (thinking|rolling)…$/.test(l)) {
      banner = l;
    }
  }
  const over = ls.includes('Play again');
  const find = banner && /^Find (.+)$/.exec(banner);
  const ring = ls.map((l) => /^Memorise the board\. (\d+) seconds? left$/.exec(l)).find(Boolean);
  return {
    /** seconds left on the opening countdown ring, or null */
    countdown: ring ? Number(ring[1]) : null,
    pegs,
    trays,
    banner,
    die,
    over,
    /** colour the die is showing, while a pick is open */
    target: find ? find[1] : null,
    /** a human seat is on the clock and may roll */
    humanRoll: !!banner && /'s turn$/.test(banner),
    revealing: banner === 'Look and remember!' || banner === 'Sudden death — look and remember!',
    active: trays.find((t) => t.active) ?? null,
  };
}

async function state(page) {
  return readState(await labels(page));
}

/** Poll until `pred(state)` holds. Returns that state. */
async function until(page, pred, { timeout = 30000, step = 100, what = 'condition' } = {}) {
  const deadline = Date.now() + timeout;
  let last = null;
  for (;;) {
    last = await state(page);
    if (pred(last)) return last;
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what} (banner="${last?.banner}" die="${last?.die}")`);
    }
    await sleep(step);
  }
}

async function goto(page, route) {
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 180000 });
  // the settings store hydrates from expo-sqlite/kv-store before anything draws,
  // so wait for real controls rather than for the (empty) first frame
  const deadline = Date.now() + 60000;
  for (;;) {
    const ls = await labels(page);
    if (ls.length > 2) break;
    if (Date.now() > deadline) throw new Error(`${route} never painted`);
    await sleep(150);
  }
  await sleep(500);
}

/** The turn banner swaps its text at zero opacity, 130 ms into a 260 ms slide. */
const BANNER_SETTLE = 200;

/* ------------------------------------------------------------- game moves */

/** Memorise the board while the opening reveal is up. */
async function memorise(page) {
  const s = await until(page, (x) => x.pegs.size > 0 && [...x.pegs.values()].some((v) => v !== 'hidden'), {
    timeout: 30000,
    what: 'the opening reveal',
  });
  const map = new Map();
  for (const [k, v] of s.pegs) if (v !== 'hidden' && v !== 'taken') map.set(k, v);
  if (map.size < s.pegs.size) {
    // one more read, in case the first landed mid-flip
    const again = await state(page);
    for (const [k, v] of again.pegs) if (v !== 'hidden' && v !== 'taken') map.set(k, v);
  }
  return map;
}

/**
 * One full human turn: roll, then take the peg the die asked for (`match`) or
 * a deliberately wrong one (`miss`). `onResult` fires the instant the result
 * banner appears, which is the only moment a flying peg is on screen.
 */
async function playTurn(page, colours, intent, onResult) {
  await until(page, (s) => s.humanRoll || s.over, { timeout: 45000, what: 'a human turn' });
  if ((await state(page)).over) return null;

  await tap(page, 'Roll the die');
  const rolled = await until(page, (s) => s.target != null || s.over, {
    timeout: 20000,
    what: 'the die to settle',
  });
  if (rolled.over) return null;

  const wanted = rolled.target;
  const free = [...rolled.pegs.entries()].filter(([, v]) => v === 'hidden');
  const right = free.filter(([k]) => colours.get(k) === wanted);
  const wrong = free.filter(([k]) => colours.get(k) && colours.get(k) !== wanted);
  let pick;
  if (intent === 'match') pick = right[0] ?? wrong[0];
  else pick = wrong[Math.floor(wrong.length / 2)] ?? right[0];
  if (!pick) return null;

  await tap(page, `${pick[0]}, hidden`);
  const res = await until(page, (s) => s.banner === 'Match!' || s.banner === 'Not that one' || s.over, {
    timeout: 20000,
    step: 60,
    what: 'the move to resolve',
  });
  const matched = res.banner === 'Match!';
  if (onResult) await onResult(res, matched, wanted);
  // let the result animation finish before the next instruction
  await until(page, (s) => s.banner !== 'Match!' && s.banner !== 'Not that one', {
    timeout: 20000,
    what: 'the result to clear',
  }).catch(() => {});
  return { matched, colour: wanted };
}

/* ------------------------------------------------------------------ shots */

async function shoot(page, dir, name) {
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`   wrote ${path.relative(process.cwd(), file)}`);
  return file;
}

/** Settings screen: board size, opponent, and the two switches we use. */
async function applySettings(page, { board, shapes, difficulty }) {
  await goto(page, '/settings');
  if (board) await tap(page, BOARD_CHIP[board]);
  if (difficulty) await tap(page, difficulty);
  if (shapes !== undefined) {
    // no aria-checked is rendered for the switch rows, so the caller tracks
    // the value; `shapes` is "set it to this" and is only passed on a change
    await tap(page, 'Shapes on pegs');
  }
  await sleep(700); // the store persists on a 120 ms debounce
}

async function captureDevice(key) {
  const dev = DEVICES[key];
  const dir = path.join(OUT_ROOT, key);
  await mkdir(dir, { recursive: true });
  console.log(`\n=== ${key} (${dev.viewport.width}x${dev.viewport.height} @${dev.deviceScaleFactor}) ===`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: dev.viewport,
    deviceScaleFactor: dev.deviceScaleFactor,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    isMobile: false,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('   [pageerror]', String(e).slice(0, 200)));

  try {
    /* --- 1. home ------------------------------------------------------- */
    console.log(' 1 home');
    await applySettings(page, { board: 'classic', difficulty: 'Fox' });
    await goto(page, '/');
    await sleep(1200);
    await shoot(page, dir, '01-home');

    /* --- 2. the opening reveal ----------------------------------------- */
    console.log(' 2 reveal');
    if (dev.board !== 'classic') await applySettings(page, { board: dev.board });
    await goto(page, '/game?mode=ai');
    let colours = await memorise(page);
    // land partway into the countdown: every peg still up, ring clearly cut
    const ringAt = Math.max(3, Math.round((REVEAL_MS[dev.board] / 1000) * 0.62));
    await until(page, (s) => s.countdown != null && s.countdown <= ringAt, {
      timeout: 20000,
      step: 60,
      what: `the countdown to reach ${ringAt}`,
    }).catch(() => {});
    await sleep(250);
    await shoot(page, dir, '02-reveal');

    /* --- 3. roll the die, board face-down ------------------------------ */
    console.log(' 3 roll');
    await until(page, (s) => !s.revealing, { timeout: 30000, what: 'the reveal to end' });
    // put pegs in both trays first, so the game looks underway
    await playTurn(page, colours, 'match');
    await playTurn(page, colours, 'match');
    await playTurn(page, colours, 'miss'); // hands the turn to the computer
    await until(page, (s) => s.humanRoll || s.over, { timeout: 60000, what: 'the computer to play' });

    let shot3 = false;
    for (let i = 0; i < 12 && !shot3; i += 1) {
      await until(page, (s) => s.humanRoll || s.over, { timeout: 45000, what: 'a human turn' });
      if ((await state(page)).over) break;
      await tap(page, 'Roll the die');
      const s = await until(page, (x) => x.target != null || x.over, {
        timeout: 20000,
        what: 'the die to settle',
      });
      if (s.over) break;
      // "avoid yellow, it photographs weakly" - screenshots-plan.md
      if (s.target === 'Blue' || s.target === 'Orange') {
        await sleep(BANNER_SETTLE); // let "Find …" finish sliding in
        await shoot(page, dir, '03-roll');
        shot3 = true;
      }
      // consume the open pick either way, so the next roll can happen
      const free = [...s.pegs.entries()].filter(([, v]) => v === 'hidden');
      const right = free.filter(([k]) => colours.get(k) === s.target);
      const pick = (right[0] ?? free[0])?.[0];
      if (!pick) break;
      await tap(page, `${pick}, hidden`);
      await until(page, (x) => x.banner !== 'Match!' && x.banner !== 'Not that one', {
        timeout: 20000,
      }).catch(() => {});
      if (!(await state(page)).humanRoll) {
        await until(page, (x) => x.humanRoll || x.over, { timeout: 60000 }).catch(() => {});
      }
    }
    if (!shot3) console.log('   ! never rolled blue or orange - 03-roll not written');

    /* --- 4. shapes on, a match landing --------------------------------- */
    console.log(' 4 match with shapes');
    await applySettings(page, { shapes: true, difficulty: 'Owl' });
    await goto(page, '/game?mode=ai');
    colours = await memorise(page);
    await until(page, (s) => !s.revealing, { timeout: 30000, what: 'the reveal to end' });
    // a clear lead over Owl, then catch the peg on its way to the tray
    for (let i = 0; i < 3; i += 1) await playTurn(page, colours, 'match');
    await playTurn(page, colours, 'miss');
    await until(page, (s) => s.humanRoll || s.over, { timeout: 60000 }).catch(() => {});
    for (let i = 0; i < 2; i += 1) await playTurn(page, colours, 'match');
    await playTurn(page, colours, 'match', async () => {
      // the "Match!" banner is legible again ~130 ms after it swaps, and the
      // peg is still on its way to the tray until 850 ms
      await sleep(150);
      await shoot(page, dir, '04-match');
    });

    /* --- 5. three players ---------------------------------------------- */
    console.log(' 5 three players');
    await applySettings(page, { board: dev.board3p, shapes: false });
    await goto(page, '/game?mode=3p');
    colours = await memorise(page);
    await until(page, (s) => !s.revealing, { timeout: 30000, what: 'the reveal to end' });
    const total = (await state(page)).pegs.size;
    const perSeat = Math.max(3, Math.round(total / 6));
    for (let i = 0; i < 40; i += 1) {
      const s = await state(page);
      if (s.over) break;
      const taken = s.trays.reduce((n, t) => n + t.score, 0);
      if (taken >= Math.floor(total / 2)) break;
      const mine = s.active?.score ?? 0;
      await playTurn(page, colours, mine >= perSeat ? 'miss' : 'match');
    }
    // capture as the next seat's banner slides in
    await until(page, (s) => s.humanRoll || s.over, { timeout: 45000 });
    await sleep(BANNER_SETTLE);
    await shoot(page, dir, '05-three-players');

    /* --- 6. the win, in dark mode -------------------------------------- */
    console.log(' 6 win, dark mode');
    await applySettings(page, { board: 'small', difficulty: 'Bunny' });
    await page.emulateMedia({ colorScheme: 'dark' });
    await goto(page, '/game?mode=ai');
    colours = await memorise(page);
    await until(page, (s) => !s.revealing, { timeout: 30000, what: 'the reveal to end' });
    for (let i = 0; i < 30; i += 1) {
      const s = await state(page);
      if (s.over) break;
      // two deliberate misses early, so the scoreboard is not a shut-out
      await playTurn(page, colours, i === 1 || i === 4 ? 'miss' : 'match');
      if (!(await state(page)).humanRoll) {
        await until(page, (x) => x.humanRoll || x.over, { timeout: 60000 }).catch(() => {});
      }
    }
    await until(page, (s) => s.over, { timeout: 60000, what: 'the game to end' });
    await sleep(650); // sheet in, confetti mid-fall
    await shoot(page, dir, '06-win-dark');
    await page.emulateMedia({ colorScheme: 'light' });
  } finally {
    await ctx.close();
    await browser.close();
  }
}

/* ------------------------------------------------------------------- main */

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const keys = only.length ? only : Object.keys(DEVICES);
for (const k of keys) {
  if (!DEVICES[k]) throw new Error(`unknown device "${k}" (have: ${Object.keys(DEVICES).join(', ')})`);
  await captureDevice(k); // one browser at a time - this Mac has 4 GB
}
console.log('\ndone');
await writeFile(path.join(OUT_ROOT, '.last-run'), new Date().toISOString());
