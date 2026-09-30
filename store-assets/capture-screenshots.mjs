/**
 * App Store screenshots for Color Catch: seven shots, two device sizes, every
 * locale in store-assets/captions.json. Not tied to a version: edit captions
 * in captions.json, reshoot only what changed.
 *
 *   node store-assets/capture-screenshots.mjs [iphone-6.5|ipad-12.9] [--only=1,3]
 *   node store-assets/capture-screenshots.mjs compose      # captions only, no app needed
 *
 * Stage 1 drives the Expo web build in headless Chromium (Playwright) and
 * writes the bare game frames to store-assets/screenshot-frames/<device>/.
 * Stage 2 is the ship-ios-app skill's compose-screenshots.mjs: frames +
 * captions.json -> store-assets/screenshots/<locale>/<device>/, ready for
 * `release.mjs screenshots --shots store-assets/screenshots`.
 *
 * Requires the dev server on http://localhost:8089 (override with PEG_URL):
 *   CI=1 npx expo start --web --port 8089
 * and the shared Playwright Chromium (`npx playwright@1.47.0 install chromium`).
 *
 * Settings are seeded straight into localStorage (web storage backend, key
 * pegrecall.settings.v1) before each shot, so every shot starts from a known
 * state: shapes off (except shot 6), light mode (except shot 7), typed names.
 * The game is driven by aria-labels; during the opening reveal every peg's
 * label carries its colour, so the board is memorised and the script can
 * match or miss on purpose.
 */

import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW_ROOT = path.join(HERE, 'screenshot-frames');
const COMPOSE = path.join(os.homedir(), '.claude/skills/ship-ios-app/compose-screenshots.mjs');
const BASE = process.env.PEG_URL ?? 'http://localhost:8089';

/* ------------------------------------------------------------------ devices */

const DEVICES = {
  'iphone-6.5': {
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 3,
    size: [1284, 2778],
    board: 'classic', // shots 1, 2
    board3p: 'big',
    boardShapes: 'small',
  },
  'ipad-12.9': {
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    size: [2048, 2732],
    // a 25-peg disc on a 12.9" screen reads as empty
    board: 'big',
    board3p: 'huge',
    boardShapes: 'classic',
    rivalsInGame: true,
  },
};

/* ------------------------------------------------------------------- shots */

const SHOTS = [
  { n: 1, file: '01-look' },
  { n: 2, file: '02-roll' },
  { n: 3, file: '03-family' },
  { n: 4, file: '04-rivals' },
  { n: 5, file: '05-sizes' },
  { n: 6, file: '06-shapes' },
  { n: 7, file: '07-win-dark' },
];

/* ---------------------------------------------------------------- settings */

const SETTINGS_KEY = 'pegrecall.settings.v1';
const STATS_KEY = 'pegrecall.stats.v1';

/** A household that has played a few times: names typed, chips remembered. */
const BASE_SETTINGS = {
  version: 4,
  soundOn: true,
  showShapes: false,
  boardSize: 'classic',
  difficulty: 'fox',
  bonusTurnOnMatch: true,
  kidMode: false,
  lastMode: 'ai',
  avatars: ['fox', 'owl', 'bear'],
  names: ['Maya', '', ''],
  recentNames: ['Maya', 'Leo', 'Nana'],
  // shots show Big / Huge boards, Owl and 3 players: the store listing's own
  // screenshots are of the unlocked game
  unlocked: true,
};

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

function labelsInPage() {
  return Array.from(document.querySelectorAll('[aria-label]')).map((e) =>
    e.getAttribute('aria-label'),
  );
}

/**
 * Headless Chromium is always "visible", but pin it anyway: the game pauses
 * on every visibilitychange to hidden, and a pause sheet in a store shot is
 * the one failure that is easy to miss.
 */
function pinVisible() {
  Object.defineProperty(Document.prototype, 'visibilityState', { get: () => 'visible', configurable: true });
  Object.defineProperty(Document.prototype, 'hidden', { get: () => false, configurable: true });
  document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
}

/* ------------------------------------------------------- driver primitives */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function labels(page) {
  return page.evaluate(labelsInPage);
}

async function tap(page, label) {
  const ok = await page.evaluate(tapInPage, label);
  if (!ok) throw new Error(`no control labelled "${label}"`);
}

const PEG_RE = /^(Peg \d+, ring \d+), (.+)$/;
// "Fox, computer, 3 pegs" / "Maya, bear, 2 pegs, their turn"
const TRAY_RE = /^(.+?)(?:, (?:fox|owl|bear|frog|bunny|cat))?(, computer)?, (\d+) pegs?(, their turn)?$/;
const RESULT = new Set(['Match!', 'Not that one']);

function readState(ls) {
  const pegs = new Map(); // "Peg 7, ring 2" -> "hidden" | "taken" | colour
  const trays = [];
  let banner = null;
  let die = null;
  for (const l of ls) {
    const p = PEG_RE.exec(l);
    if (p) {
      pegs.set(p[1], p[2]);
      continue;
    }
    if (l === 'Roll the die' || l === 'Die rolling' || l.startsWith('Die shows ')) {
      die = l;
      continue;
    }
    const t = TRAY_RE.exec(l);
    if (t && !l.startsWith('Peg ') && !l.startsWith('Round board')) {
      trays.push({ name: t[1], ai: !!t[2], score: Number(t[3]), active: !!t[4] });
    }
    if (
      RESULT.has(l) ||
      l === 'Board clear!' ||
      /look and remember!$/i.test(l) ||
      /'s? turn$/.test(l) ||
      /^Find [A-Z][a-z]+$/.test(l) ||
      / is (thinking|rolling)…$/.test(l)
    ) {
      banner = l;
    }
  }
  const over = ls.includes('Play again');
  const find = banner && /^Find (.+)$/.exec(banner);
  const ring = ls.map((l) => /^Memorise the board\. (\d+) seconds? left$/.exec(l)).find(Boolean);
  return {
    countdown: ring ? Number(ring[1]) : null,
    pegs,
    trays,
    banner,
    die,
    over,
    paused: ls.includes('Resume'),
    target: find ? find[1] : null,
    humanRoll: ls.includes('Roll the die') && !!banner && /'s? turn$/.test(banner),
    revealing: !!banner && /look and remember!$/i.test(banner),
    active: trays.find((t) => t.active) ?? null,
  };
}

async function state(page) {
  return readState(await labels(page));
}

async function until(page, pred, { timeout = 30000, step = 100, what = 'condition' } = {}) {
  const deadline = Date.now() + timeout;
  let last = null;
  for (;;) {
    last = await state(page);
    if (last.paused) throw new Error('the pause sheet came up');
    if (pred(last)) return last;
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what} (banner="${last?.banner}" die="${last?.die}")`);
    }
    await sleep(step);
  }
}

/** Write settings (and optionally stats) straight into web storage. */
async function seed(page, patch = {}, stats) {
  // a same-origin page that runs no app code, so nothing can write over us
  await page.goto(`${BASE}/favicon.ico`, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
  await page.evaluate(
    ([k, v, sk, sv]) => {
      localStorage.clear();
      localStorage.setItem(k, v);
      if (sv) localStorage.setItem(sk, sv);
    },
    [SETTINGS_KEY, JSON.stringify({ ...BASE_SETTINGS, ...patch }), STATS_KEY, stats ? JSON.stringify(stats) : null],
  );
}

async function goto(page, route) {
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 180000 });
  const deadline = Date.now() + 90000;
  for (;;) {
    const ls = await labels(page);
    if (ls.length > 2 && !ls.includes('Loading game')) break;
    if (Date.now() > deadline) throw new Error(`${route} never painted`);
    await sleep(150);
  }
  await sleep(600);
}

/** The turn banner swaps its text at zero opacity, 130 ms into a 260 ms slide. */
const BANNER_SETTLE = 320;

async function memorise(page) {
  const s = await until(page, (x) => x.pegs.size > 0 && [...x.pegs.values()].some((v) => v !== 'hidden'), {
    timeout: 60000,
    what: 'the opening reveal',
  });
  const map = new Map();
  for (const [k, v] of s.pegs) if (v !== 'hidden' && v !== 'taken') map.set(k, v);
  if (map.size < s.pegs.size) {
    await sleep(300);
    const again = await state(page);
    for (const [k, v] of again.pegs) if (v !== 'hidden' && v !== 'taken') map.set(k, v);
  }
  return map;
}

async function waitHuman(page) {
  return until(page, (s) => s.humanRoll || s.over, { timeout: 90000, what: 'a human turn' });
}

async function roll(page) {
  await tap(page, 'Roll the die');
  return until(page, (s) => s.target != null || s.over, { timeout: 20000, what: 'the die to settle' });
}

/** Take the peg the die asked for (`match`) or a known-wrong one (`miss`). */
async function pick(page, s, colours, intent, onResult) {
  const free = [...s.pegs.entries()].filter(([, v]) => v === 'hidden');
  const right = free.filter(([k]) => colours.get(k) === s.target);
  const wrong = free.filter(([k]) => colours.get(k) && colours.get(k) !== s.target);
  const p = intent === 'match' ? right[0] ?? wrong[0] : wrong[Math.floor(wrong.length / 2)] ?? right[0];
  if (!p) return null;
  await tap(page, `${p[0]}, hidden`);
  const res = await until(page, (x) => RESULT.has(x.banner) || x.over, {
    timeout: 20000,
    step: 50,
    what: 'the move to resolve',
  });
  const matched = res.banner === 'Match!';
  // a match removes the peg from the board for good
  if (matched) colours.delete(p[0]);
  if (onResult) await onResult(res, matched);
  await until(page, (x) => !RESULT.has(x.banner), { timeout: 20000, what: 'the result to clear' }).catch(() => {});
  return matched;
}

async function playTurn(page, colours, intent, onResult) {
  if ((await waitHuman(page)).over) return null;
  const s = await roll(page);
  if (s.over) return null;
  return pick(page, s, colours, intent, onResult);
}

async function shoot(page, dir, name) {
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`   wrote ${path.relative(process.cwd(), file)}`);
}

/* ---------------------------------------------------------- the seven shots */

const CAPTURE = {
  /** 1 - the opening reveal, every peg face-up, countdown ring partway. */
  async 1(page, dev, dir) {
    await seed(page, { boardSize: dev.board, difficulty: 'fox' });
    await goto(page, '/game?mode=ai');
    await memorise(page);
    const total = { classic: 6, big: 8, huge: 9, small: 4 }[dev.board];
    const at = Math.max(3, Math.round(total * 0.6));
    await until(page, (s) => s.countdown != null && s.countdown <= at, {
      timeout: 20000,
      step: 60,
      what: `countdown ${at}`,
    });
    await sleep(300);
    await shoot(page, dir, '01-look');
  },

  /** 2 - face-down board, die landed on red or violet, "Find Red". */
  async 2(page, dev, dir) {
    await seed(page, { boardSize: dev.board, difficulty: 'fox' });
    await goto(page, '/game?mode=ai');
    const colours = await memorise(page);
    await until(page, (s) => !s.revealing, { timeout: 30000, what: 'the reveal to end' });
    // pegs in both trays, so the game looks underway
    await playTurn(page, colours, 'match');
    await playTurn(page, colours, 'match');
    await playTurn(page, colours, 'miss');
    for (let i = 0; i < 20; i += 1) {
      if ((await waitHuman(page)).over) break;
      const s = await roll(page);
      if (s.over) break;
      if (s.target === 'Red' || s.target === 'Violet') {
        await sleep(BANNER_SETTLE + 400); // die settle bounce + banner slide
        await shoot(page, dir, '02-roll');
        return;
      }
      // not the colour we want: spend the pick on a miss, so the board keeps
      // most of its pegs and the turn passes on
      await pick(page, s, colours, 'miss');
    }
    throw new Error('never rolled red or violet');
  },

  /** 3 - three players, typed names in the trays, mid-game. */
  async 3(page, dev, dir) {
    await seed(page, {
      boardSize: dev.board3p,
      lastMode: '3p',
      names: ['Maya', 'Leo', 'Nana'],
      avatars: ['fox', 'owl', 'bear'],
    });
    await goto(page, '/game?mode=3p');
    const colours = await memorise(page);
    await until(page, (s) => !s.revealing, { timeout: 30000, what: 'the reveal to end' });
    const total = (await state(page)).pegs.size;
    const perSeat = Math.max(3, Math.round(total / 6));
    for (let i = 0; i < 60; i += 1) {
      const s = await state(page);
      if (s.over) break;
      const taken = s.trays.reduce((n, t) => n + t.score, 0);
      if (taken >= Math.floor(total / 2.4) && s.trays.every((t) => t.score >= 2)) break;
      const mine = s.active?.score ?? 0;
      await playTurn(page, colours, mine >= perSeat ? 'miss' : 'match');
    }
    await waitHuman(page);
    await sleep(BANNER_SETTLE + 300);
    await shoot(page, dir, '03-family');
  },

  /** 4 - Home: the Bunny / Fox / Owl opponent row, Owl picked. */
  async 4(page, dev, dir) {
    await seed(page, { boardSize: dev.board, difficulty: 'owl', names: ['Maya', 'Leo', 'Nana'] });
    if (!dev.rivalsInGame) {
      await goto(page, '/');
      await sleep(900);
      await shoot(page, dir, '04-rivals');
      return;
    }
    // iPad: Home is a 560-pt column in the middle of a 1024-pt screen and
    // reads as empty, so show a game against Owl instead, Owl on the move.
    await goto(page, '/game?mode=ai');
    const colours = await memorise(page);
    await until(page, (s) => !s.revealing, { timeout: 30000, what: 'the reveal to end' });
    for (let round = 0; round < 6; round += 1) {
      await playTurn(page, colours, 'match');
      await playTurn(page, colours, 'miss'); // hands the turn to Owl
      // Owl's turn, caught in the page itself (Owl picks within a few hundred
      // ms of its die landing, too fast to poll from here): the banner fully
      // faded in and at rest, and the die either landed on a colour or still
      // waiting to be thrown - never mid-tumble
      const s = await state(page);
      const owl = s.trays.find((t) => t.ai);
      if (!s.over && owl?.active && owl.score >= 2 && s.trays.every((t) => t.score >= 2)) {
        const ok = await page.evaluate(
          () =>
            new Promise((resolve) => {
              const deadline = performance.now() + 8000;
              const tick = () => {
                const els = Array.from(document.querySelectorAll('[aria-label]'));
                const banner = els.find((e) => / is (thinking|rolling)…$/.test(e.getAttribute('aria-label')));
                const die = els.find((e) => /^(Die |Roll the die)/.test(e.getAttribute('aria-label')));
                if (banner && die) {
                  const cs = getComputedStyle(banner);
                  const m = new DOMMatrixReadOnly(cs.transform === 'none' ? undefined : cs.transform);
                  const still = parseFloat(cs.opacity) > 0.99 && Math.abs(m.m42) < 0.5;
                  const d = die.getAttribute('aria-label');
                  const b = banner.getAttribute('aria-label');
                  if (still && ((/rolling…$/.test(b) && d.startsWith('Die shows')) || (/thinking…$/.test(b) && d === 'Roll the die'))) {
                    resolve(true);
                    return;
                  }
                }
                if (performance.now() > deadline) resolve(false);
                else requestAnimationFrame(tick);
              };
              tick();
            }),
        );
        if (ok) {
          await shoot(page, dir, '04-rivals');
          return;
        }
      }
      await waitHuman(page);
    }
    throw new Error('no Owl frame for shot 4');
  },

  /** 5 - Settings: kid mode on, board sizes 16 to 40, Huge picked. */
  async 5(page, dev, dir) {
    // a family that has played a few evenings, so Stats is not an empty card
    const now = Date.now();
    const p = (label, avatar, played, wins, ago) => ({ key: `name:${label.toLowerCase()}`, label, avatar, played, wins, lastPlayed: now - ago });
    const stats = {
      version: 1,
      players: {
        'name:maya': p('Maya', 'fox', 21, 11, 1000),
        'name:leo': p('Leo', 'owl', 9, 4, 2000),
        'name:nana': p('Nana', 'bear', 9, 2, 3000),
      },
      vsAi: {
        bunny: { played: 4, wins: 4, streak: 4, bestStreak: 4 },
        fox: { played: 5, wins: 3, streak: 1, bestStreak: 2 },
        owl: { played: 3, wins: 1, streak: 0, bestStreak: 1 },
      },
      gamesFinished: 21,
      finishedDays: [],
      reviewAskedVersion: null,
    };
    await seed(page, { boardSize: 'huge', kidMode: true, difficulty: 'bunny' }, stats);
    await goto(page, '/settings');
    await sleep(900);
    await shoot(page, dir, '05-sizes');
  },

  /**
   * 6 - Shapes on Pegs, during the reveal: every peg carries its shape. A
   * match frame shows only one face-up peg (plus the die), which sells the
   * feature far less, so the reveal it is - on a smaller board than shot 1, so
   * the shapes are bigger and the two frames do not look alike.
   */
  async 6(page, dev, dir) {
    await seed(page, { boardSize: dev.boardShapes, difficulty: 'fox', showShapes: true });
    await goto(page, '/game?mode=ai');
    await memorise(page);
    const total = { classic: 6, big: 8, huge: 9, small: 4 }[dev.boardShapes];
    await until(page, (s) => s.countdown != null && s.countdown <= Math.max(2, Math.round(total * 0.6)), {
      timeout: 20000,
      step: 60,
      what: 'countdown',
    });
    await sleep(300);
    await shoot(page, dir, '06-shapes');
  },

  /** 7 - dark mode, a human win vs Bunny, confetti falling. */
  async 7(page, dev, dir) {
    await page.emulateMedia({ colorScheme: 'dark' });
    try {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await seed(page, { boardSize: 'small', difficulty: 'bunny' });
        await goto(page, '/game?mode=ai');
        const colours = await memorise(page);
        await until(page, (s) => !s.revealing, { timeout: 30000, what: 'the reveal to end' });
        for (let i = 0; i < 40; i += 1) {
          const s = await state(page);
          if (s.over) break;
          if (s.revealing) {
            // a tie went to sudden death: learn the new board
            for (const [k, v] of (await memorise(page)).entries()) colours.set(k, v);
            await until(page, (x) => !x.revealing, { timeout: 30000 });
          }
          // two misses early, so the score is not a shut-out
          const r = await playTurn(page, colours, i === 1 || i === 4 ? 'miss' : 'match');
          if (r == null && (await state(page)).over) break;
        }
        const end = await until(page, (s) => s.over, { timeout: 60000, what: 'the game to end' });
        const text = await page.evaluate(() => document.body.innerText);
        const headline = /^.*(wins|share the win).*$/m.exec(text)?.[0] ?? '?';
        const maya = end.trays.find((t) => t.name === 'Maya');
        const ai = end.trays.find((t) => t.ai);
        console.log(`   game over: ${headline} (${maya?.score}-${ai?.score})`);
        // a win, but not a shut-out
        if (/^Maya wins!/.test(headline) && ai?.score > 0) {
          await sleep(700); // sheet up, confetti mid-fall
          await shoot(page, dir, '07-win-dark');
          return;
        }
      }
      throw new Error('Maya never won');
    } finally {
      await page.emulateMedia({ colorScheme: 'light' });
    }
  },
};

async function captureDevice(key, only) {
  const dev = DEVICES[key];
  const dir = path.join(RAW_ROOT, key);
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
  await ctx.addInitScript(pinVisible);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    // headless Chromium has no codec for the sound files; harmless
    if (!/no supported sources/.test(String(e))) console.log('   [pageerror]', String(e).slice(0, 200));
  });
  const failed = [];
  try {
    for (const shot of SHOTS) {
      if (only && !only.includes(shot.n)) continue;
      console.log(` ${shot.n} ${shot.file}`);
      let ok = false;
      for (let attempt = 1; attempt <= 2 && !ok; attempt += 1) {
        try {
          await CAPTURE[shot.n](page, dev, dir);
          ok = true;
        } catch (e) {
          console.log(`   ! attempt ${attempt}: ${e.message}`);
        }
      }
      if (!ok) failed.push(shot.file);
    }
  } finally {
    await ctx.close();
    await browser.close();
  }
  return failed;
}

/* ------------------------------------------------------------------- main */

const args = process.argv.slice(2);
const stage = args[0] === 'compose' ? args.shift() : 'all';
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',').map(Number) : null;
const devs = args.filter((a) => !a.startsWith('-'));
const keys = devs.length ? devs : Object.keys(DEVICES);

if (stage === 'all') {
  const failed = [];
  for (const k of keys) {
    if (!DEVICES[k]) throw new Error(`unknown device "${k}"`);
    for (const f of await captureDevice(k, only)) failed.push(`${k}/${f}`); // one browser at a time
  }
  if (failed.length) {
    console.log(`\nFAILED: ${failed.join(', ')}`);
    process.exitCode = 1;
  }
}
if (!process.exitCode) {
  execFileSync(
    'node',
    [COMPOSE, '--frames', RAW_ROOT, '--captions', path.join(HERE, 'captions.json'), '--out', path.join(HERE, 'screenshots')],
    { stdio: 'inherit', cwd: path.dirname(HERE) },
  );
}
