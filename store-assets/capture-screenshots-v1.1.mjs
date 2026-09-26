/**
 * App Store screenshots for Color Catch v1.1: seven captioned shots, two
 * device sizes, three locales (PLAN-v1.1.md section 6, captions from
 * store-assets/listing-v1.1.md section 4).
 *
 *   node store-assets/capture-screenshots-v1.1.mjs raw [iphone-6.5|ipad-12.9] [--only=1,3]
 *   node store-assets/capture-screenshots-v1.1.mjs compose
 *   node store-assets/capture-screenshots-v1.1.mjs all
 *
 * Stage 1 (raw) drives the Expo web build in headless Chromium (Playwright,
 * like capture-screenshots.mjs for v1.0) and writes the bare game frames to
 * store-assets/screenshots-v1.1/raw/<device>/. Stage 2 (compose) renders each
 * raw frame under a caption band, at exactly the App Store pixel size, into
 * store-assets/screenshots-v1.1/<locale>/<device>/, then flattens every PNG to
 * RGB (App Store Connect rejects screenshots with an alpha channel).
 *
 * Requires the dev server on http://localhost:8089 (override with PEG_URL):
 *   CI=1 npx expo start --web --port 8089
 * and the shared Playwright Chromium (`npx playwright@1.47.0 install chromium`).
 * Flattening uses python3 + Pillow.
 *
 * Settings are seeded straight into localStorage (web storage backend, key
 * pegrecall.settings.v1) before each shot, so every shot starts from a known
 * state: shapes off (except shot 6), light mode (except shot 7), typed names.
 * The game is driven by aria-labels, as in the v1.0 script; during the opening
 * reveal every peg's label carries its colour, so the board is memorised and
 * the script can match or miss on purpose.
 */

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.join(HERE, 'screenshots-v1.1');
const RAW_ROOT = path.join(OUT_ROOT, 'raw');
const FONT = path.join(HERE, 'fonts', 'Nunito.ttf');
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

/** listing-v1.1.md section 4, verbatim. */
const CAPTIONS = {
  'en-US': [
    'Look. Remember. Find it.',
    'Roll a color. Pick the peg.',
    'Pass and play with the family',
    'Bunny, Fox or Owl: pick a rival',
    'From 16 pegs to 40',
    'Shapes for color-blind players',
    'Free. Offline. No ads.',
  ],
  'es-MX': [
    'Mira. Recuerda. Encuéntrala.',
    'Tira el dado. Elige la ficha.',
    'Pásalo y juega en familia',
    'Reta a la computadora: 3 niveles',
    'De 16 a 40 fichas',
    'Figuras para jugadores daltónicos',
    'Gratis. Sin internet. Sin anuncios.',
  ],
  'en-GB': [
    'Look. Remember. Find it.',
    'Roll a colour. Pick the peg.',
    'Pass and play with the family',
    'Bunny, Fox or Owl: pick a rival',
    'From 16 pegs to 40',
    'Shapes for colour-blind players',
    'Free. Offline. No ads.',
  ],
};

/* ---------------------------------------------------------------- settings */

const SETTINGS_KEY = 'pegrecall.settings.v1';
const STATS_KEY = 'pegrecall.stats.v1';

/** A household that has played a few times: names typed, chips remembered. */
const BASE_SETTINGS = {
  version: 3,
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

/* ------------------------------------------------------------------ compose */

const INK = {
  // warm paper behind a teal screen: the game's own backdrop is teal, so a
  // teal page would swallow the screenshot's edge
  paperTop: '#FBF6EC',
  paperBottom: '#EFE3CF',
  text: '#2B2622', // LIGHT.text (src/theme/tokens.ts)
  wood: '#B98A5A', // board rim tone
  pegs: ['#CE1202', '#F0E442', '#009E73', '#0072B2', '#6201DA', '#CC79A7'], // PEG_HEX (src/ui/art/palette.ts)
};

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** "color-blind" must not break after its hyphen. */
function keepWords(caption) {
  return esc(caption).replace(/\S+-\S+/g, (w) => `<span style="white-space:nowrap">${w}</span>`);
}

function template({ W, H, caption, img, fontUrl, pegs }) {
  const pad = Math.round(W * 0.06);
  const band = Math.round(H * (W / H > 0.6 ? 0.18 : 0.175));
  const shotH = H - band - Math.round(H * 0.035);
  const radius = Math.round(W * 0.045);
  const fs = Math.round(W * (W / H > 0.6 ? 0.068 : 0.086));
  const dots = pegs
    .map((c) => `<i style="background:${c}"></i>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Nunito; src: url('${fontUrl}') format('truetype'); font-weight: 200 1000; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body {
  background: linear-gradient(180deg, ${INK.paperTop} 0%, ${INK.paperBottom} 100%);
  font-family: Nunito, sans-serif; color: ${INK.text}; position: relative;
}
.band { position: absolute; left: ${pad}px; right: ${pad}px; top: 0; height: ${band}px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${Math.round(fs * 0.34)}px; }
.dots { display: flex; gap: ${Math.round(fs * 0.2)}px; }
.dots i { display: block; width: ${Math.round(fs * 0.24)}px; height: ${Math.round(fs * 0.24)}px; border-radius: 50%;
  box-shadow: inset 0 -${Math.round(fs * 0.04)}px 0 rgba(0,0,0,.18); }
h1 { font-weight: 900; font-size: ${fs}px; line-height: 1.08; letter-spacing: -0.01em; text-align: center;
  text-wrap: balance; }
.shot { position: absolute; left: 50%; top: ${band}px; height: ${shotH}px; transform: translateX(-50%);
  border-radius: ${radius}px; overflow: hidden;
  box-shadow: 0 0 0 ${Math.max(4, Math.round(W * 0.007))}px ${INK.text}, 0 ${Math.round(W * 0.02)}px ${Math.round(W * 0.05)}px rgba(43,38,34,.35); }
.shot img { display: block; height: 100%; width: auto; }
</style></head><body>
<div class="band"><div class="dots">${dots}</div><h1 id="cap">${keepWords(caption)}</h1></div>
<div class="shot"><img src="${img}"></div>
</body></html>`;
}

async function compose() {
  const fontUrl = `data:font/ttf;base64,${(await readFile(FONT)).toString('base64')}`;
  const browser = await chromium.launch({ headless: true });
  const written = [];
  try {
    for (const [key, dev] of Object.entries(DEVICES)) {
      const [W, H] = dev.size;
      const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      for (const shot of SHOTS) {
        const raw = path.join(RAW_ROOT, key, `${shot.file}.png`);
        const img = `data:image/png;base64,${(await readFile(raw)).toString('base64')}`;
        for (const [locale, caps] of Object.entries(CAPTIONS)) {
          const caption = caps[shot.n - 1];
          await page.setContent(template({ W, H, caption, img, fontUrl, pegs: INK.pegs }), { waitUntil: 'load' });
          await page.evaluate(() => document.fonts.ready);
          // at most two lines, never clipped: shrink until it fits
          const lines = await page.evaluate(() => {
            const h = document.getElementById('cap');
            const band = h.parentElement;
            let fs = parseFloat(getComputedStyle(h).fontSize);
            const count = () => Math.round(h.getBoundingClientRect().height / (fs * 1.08));
            while ((count() > 2 || h.scrollWidth > band.clientWidth) && fs > 40) {
              fs -= 2;
              h.style.fontSize = `${fs}px`;
            }
            return count();
          });
          const dir = path.join(OUT_ROOT, locale, key);
          await mkdir(dir, { recursive: true });
          const out = path.join(dir, `${shot.file}.png`);
          await page.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } });
          written.push(out);
          if (lines > 2) console.log(`   ! ${locale}/${key}/${shot.file}: ${lines} lines`);
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  // App Store Connect rejects screenshots with an alpha channel: flatten to RGB
  const py = `
import sys
from PIL import Image
for p in sys.argv[1:]:
    im = Image.open(p)
    if im.mode != 'RGB':
        bg = Image.new('RGB', im.size, (245, 237, 222))
        bg.paste(im, mask=im.split()[-1] if im.mode in ('RGBA', 'LA') else None)
        bg.save(p, optimize=True)
`;
  execFileSync('python3', ['-c', py, ...written], { stdio: 'inherit' });
  console.log(`composed ${written.length} images`);
}

/* ------------------------------------------------------------------- main */

const args = process.argv.slice(2);
const stage = ['raw', 'compose', 'all'].includes(args[0]) ? args.shift() : 'all';
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',').map(Number) : null;
const devs = args.filter((a) => !a.startsWith('-'));
const keys = devs.length ? devs : Object.keys(DEVICES);

if (stage === 'raw' || stage === 'all') {
  const failed = [];
  for (const k of keys) {
    if (!DEVICES[k]) throw new Error(`unknown device "${k}"`);
    for (const f of await captureDevice(k, only)) failed.push(`${k}/${f}`); // one browser at a time
  }
  if (failed.length) {
    console.log(`\nFAILED: ${failed.join(', ')}`);
    process.exitCode = 1;
  }
  await writeFile(path.join(RAW_ROOT, '.last-run'), new Date().toISOString());
}
if (stage === 'compose' || (stage === 'all' && !process.exitCode)) {
  await compose();
}
