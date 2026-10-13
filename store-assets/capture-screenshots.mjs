/**
 * App Store screenshots for Color Catch: seven shots, two device sizes, every
 * locale in store-assets/captions.json. Not tied to a version: edit captions
 * in captions.json, reshoot only what changed.
 *
 *   node store-assets/capture-screenshots.mjs [iphone-6.5|ipad-12.9] [--only=1,3] [--locale=de]
 *   node store-assets/capture-screenshots.mjs compose      # captions only, no app needed
 *   node store-assets/capture-screenshots.mjs --set=ppo    # PPO treatment set (see SET below)
 *   --no-compose skips stage 2 (while reshooting single frames)
 *
 * --locale (en, de, fr, pt, ja, es, it, ko, zh, tr, nl, pl, hi, ru, vi, id, th, ar;
 * default en) runs the app in that
 * language (the browser's navigator.language) with names natural to it, and
 * writes the frames to screenshot-frames/<locale>/<device>/ (en keeps
 * screenshot-frames/<device>/). The app's own strings (src/i18n) drive it.
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
 * The game is driven by aria-labels, in the app's language (read from
 * src/i18n); during the opening reveal every peg's label carries its colour, so
 * the board is memorised and the script can match or miss on purpose.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';
import { require as tsxRequire } from 'tsx/cjs/api';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/*
 * --set=ppo: the Product Page Optimization treatment, "every one of the first
 * three shots is full of colour and shows a moment of play". Order and
 * sources are PPO_SHOTS below: two new frames (CAPTURE_PPO), the rest copied
 * from the control frames. Output goes to screenshot-frames-ppo/ and
 * screenshots-ppo/, with captions-ppo.json generated from captions.json (the
 * same translated captions under the treatment's file names). Without --set
 * nothing about the default run changes.
 */
const SET = (process.argv.find((a) => a.startsWith('--set=')) ?? '--set=').slice(6) || null;
if (SET && SET !== 'ppo') throw new Error(`unknown --set "${SET}" (ppo)`);
const CONTROL_ROOT = path.join(HERE, 'screenshot-frames');
const RAW_ROOT = SET ? path.join(HERE, `screenshot-frames-${SET}`) : CONTROL_ROOT;
const OUT_ROOT = path.join(HERE, SET ? `screenshots-${SET}` : 'screenshots');
const COMPOSE = path.join(os.homedir(), '.claude/skills/ship-ios-app/compose-screenshots.mjs');
const BASE = process.env.PEG_URL ?? 'http://localhost:8089';

/* ------------------------------------------------------------------ locale */

const LOCALE = (process.argv.find((a) => a.startsWith('--locale=')) ?? '--locale=en').slice(9);
const i18n = tsxRequire('../src/i18n/index.ts', import.meta.url);
if (!i18n.LANGS.includes(LOCALE)) throw new Error(`unknown locale "${LOCALE}" (${i18n.LANGS.join(', ')})`);
i18n.setLang(LOCALE);
const T = i18n.tr;
/** A string template as an anchored regex: "Find {color}" -> /^Find (?<color>.+?)$/. */
const tpl = (key) =>
  new RegExp(
    `^${T(key)
      .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
      .replace(/\{(\w+)\}/g, (_, k) => `(?<${k}>.+?)`)}$`,
  );
/** Seat names a family in that language would type: two kids and a grandparent. */
const NAMES = {
  en: ['Maya', 'Leo', 'Nana'],
  de: ['Mia', 'Leon', 'Oma'],
  fr: ['Léa', 'Hugo', 'Mamie'],
  pt: ['Ana', 'Lucas', 'Vovó'],
  ja: ['ゆい', 'はると', 'ばあば'],
  es: ['Sofía', 'Mateo', 'Abuela'],
  it: ['Giulia', 'Luca', 'Nonna'],
  ko: ['서연', '민준', '할머니'],
  zh: ['欣妤', '承恩', '阿嬤'],
  tr: ['İpek', 'Emir', 'Nine'],
  nl: ['Emma', 'Daan', 'Oma'],
  pl: ['Zosia', 'Antek', 'Babcia'],
  hi: ['अनन्या', 'आरव', 'दादी'],
  ru: ['Маша', 'Ваня', 'Бабушка'],
  vi: ['Linh', 'Minh', 'Bà'],
  id: ['Aisyah', 'Rafa', 'Nenek'],
  th: ['น้ำ', 'ภูมิ', 'ยาย'],
  ar: ['مريم', 'يوسف', 'جدتي'],
}[LOCALE];

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
  names: [NAMES[0], '', ''],
  recentNames: NAMES,
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

const PEG_RE = tpl('game.peg');
// every plural form the language has (Polish: 1 pionek, 3 pionki, 5 pionków)
const PEGS_RE = ['one', 'few', 'many', 'other']
  .filter((f) => `pegs.${f}` in i18n.DICTS[LOCALE])
  .map((f) => tpl(`pegs.${f}`));
const RESULT = new Set([T('game.match'), T('game.miss')]);
const HIDDEN = T('game.pegHidden');
const TAKEN = T('game.pegTaken');
const ROLL = T('game.roll');
const LOOK = new Set([T('game.look'), T('game.lookSudden')]);
const BANNERS = ['game.turn', 'game.find', 'game.thinking', 'game.rolling'].map(tpl);
const TURN_RE = tpl('game.turn');
const FIND_RE = tpl('game.find');
const REVEAL_RE = tpl('game.reveal');
const DIE_FACE_RE = tpl('game.dieFace');
const BOARD_RE = tpl('game.board');

/** A peg's label, as the board would read it with `what` ("hidden", a colour). */
const pegLabel = (id, what) => {
  const [n, ring] = id.split('|');
  return T('game.peg', { n: Number(n), ring: Number(ring), what });
};

function readState(ls) {
  const pegs = new Map(); // "7|2" (peg 7, ring 2) -> hidden | taken | colour
  const trays = [];
  let banner = null;
  let die = null;
  for (const l of ls) {
    const p = PEG_RE.exec(l);
    if (p) {
      pegs.set(`${p.groups.n}|${p.groups.ring}`, p.groups.what);
      continue;
    }
    if (l === ROLL || l === T('game.dieRolling') || DIE_FACE_RE.test(l)) {
      die = l;
      continue;
    }
    // "Fox, computer, 3 pegs" / "Maya, Bear, 2 pegs, their turn"
    const parts = l.split(', ');
    const score = parts.map((x) => PEGS_RE.map((re) => re.exec(x)).find(Boolean)).find(Boolean);
    if (score && parts.length > 1 && !BOARD_RE.test(l)) {
      trays.push({
        name: parts[0],
        ai: parts.includes(T('common.computer')),
        score: Number(score.groups.n),
        active: parts.includes(T('game.theirTurn')),
      });
    }
    if (RESULT.has(l) || l === T('game.boardClear') || LOOK.has(l) || BANNERS.some((re) => re.test(l))) {
      banner = l;
    }
  }
  const over = ls.includes(T('over.playAgain'));
  const find = banner && FIND_RE.exec(banner);
  const ring = ls.map((l) => REVEAL_RE.exec(l)).find(Boolean);
  return {
    countdown: ring ? Number(/\d+/.exec(ring.groups.seconds)[0]) : null,
    pegs,
    trays,
    banner,
    die,
    over,
    paused: ls.includes(T('pause.resume')),
    target: find ? find.groups.color : null,
    humanRoll: ls.includes(ROLL) && !!banner && TURN_RE.test(banner),
    revealing: LOOK.has(banner),
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
    if (ls.length > 2 && !ls.includes(T('game.loading'))) break;
    if (Date.now() > deadline) throw new Error(`${route} never painted`);
    await sleep(150);
  }
  await sleep(600);
}

/** The turn banner swaps its text at zero opacity, 130 ms into a 260 ms slide. */
const BANNER_SETTLE = 320;

async function memorise(page) {
  const s = await until(page, (x) => x.pegs.size > 0 && [...x.pegs.values()].some((v) => v !== HIDDEN), {
    timeout: 60000,
    what: 'the opening reveal',
  });
  const map = new Map();
  for (const [k, v] of s.pegs) if (v !== HIDDEN && v !== TAKEN) map.set(k, v);
  if (map.size < s.pegs.size) {
    await sleep(300);
    const again = await state(page);
    for (const [k, v] of again.pegs) if (v !== HIDDEN && v !== TAKEN) map.set(k, v);
  }
  return map;
}

async function waitHuman(page) {
  return until(page, (s) => s.humanRoll || s.over, { timeout: 90000, what: 'a human turn' });
}

async function roll(page) {
  await tap(page, ROLL);
  return until(page, (s) => s.target != null || s.over, { timeout: 20000, what: 'the die to settle' });
}

/** Take the peg the die asked for (`match`) or a known-wrong one (`miss`). */
async function pick(page, s, colours, intent, onResult) {
  const free = [...s.pegs.entries()].filter(([, v]) => v === HIDDEN);
  const right = free.filter(([k]) => colours.get(k) === s.target);
  const wrong = free.filter(([k]) => colours.get(k) && colours.get(k) !== s.target);
  const p = intent === 'match' ? right[0] ?? wrong[0] : wrong[Math.floor(wrong.length / 2)] ?? right[0];
  if (!p) return null;
  await tap(page, pegLabel(p[0], HIDDEN));
  const res = await until(page, (x) => RESULT.has(x.banner) || x.over, {
    timeout: 20000,
    step: 50,
    what: 'the move to resolve',
  });
  const matched = res.banner === T('game.match');
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
      if (s.target === T('color.red') || s.target === T('color.violet')) {
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
      names: NAMES,
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
    await seed(page, { boardSize: dev.board, difficulty: 'owl', names: NAMES });
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
          ([thinking, rolling, face, roll]) =>
            new Promise((resolve) => {
              const [isThinking, isRolling, isFace] = [thinking, rolling, face].map((src) => new RegExp(src));
              const deadline = performance.now() + 8000;
              const tick = () => {
                const els = Array.from(document.querySelectorAll('[aria-label]'));
                const banner = els.find((e) => {
                  const l = e.getAttribute('aria-label');
                  return isThinking.test(l) || isRolling.test(l);
                });
                const die = els.find((e) => {
                  const l = e.getAttribute('aria-label');
                  return l === roll || isFace.test(l);
                });
                if (banner && die) {
                  const cs = getComputedStyle(banner);
                  const m = new DOMMatrixReadOnly(cs.transform === 'none' ? undefined : cs.transform);
                  const still = parseFloat(cs.opacity) > 0.99 && Math.abs(m.m42) < 0.5;
                  const d = die.getAttribute('aria-label');
                  const b = banner.getAttribute('aria-label');
                  if (still && ((isRolling.test(b) && isFace.test(d)) || (isThinking.test(b) && d === roll))) {
                    resolve(true);
                    return;
                  }
                }
                if (performance.now() > deadline) resolve(false);
                else requestAnimationFrame(tick);
              };
              tick();
            }),
          [tpl('game.thinking').source, tpl('game.rolling').source, DIE_FACE_RE.source, ROLL],
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
    const [a, b, c] = NAMES.map((n) => [n.toLowerCase(), n]);
    const stats = {
      version: 1,
      players: {
        [`name:${a[0]}`]: p(a[1], 'fox', 21, 11, 1000),
        [`name:${b[0]}`]: p(b[1], 'owl', 9, 4, 2000),
        [`name:${c[0]}`]: p(c[1], 'bear', 9, 2, 3000),
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
        const winsRe = tpl('over.wins');
        const headline = text.split('\n').find((l) => winsRe.test(l) || tpl('over.share').test(l)) ?? '?';
        const maya = end.trays.find((t) => t.name === NAMES[0]);
        const ai = end.trays.find((t) => t.ai);
        console.log(`   game over: ${headline} (${maya?.score}-${ai?.score})`);
        // a win, but not a shut-out
        if (winsRe.exec(headline)?.groups.name === NAMES[0] && ai?.score > 0) {
          await sleep(700); // sheet up, confetti mid-fall
          await shoot(page, dir, '07-win-dark');
          return;
        }
      }
      throw new Error(`${NAMES[0]} never won`);
    } finally {
      await page.emulateMedia({ colorScheme: 'light' });
    }
  },
};

/* ------------------------------------------------- PPO treatment (--set=ppo) */

/**
 * Runs in the page (--set=ppo only): a clock the script can speed up (game
 * timers fire `scale` times sooner, so the filler turns of a 40-peg game go
 * by fast) and stop (`frozen`: every timer and animation frame is held), so a
 * moment that lasts 200 ms - a matched peg held up in the air - can be shot.
 */
function clockControl() {
  const st = window.setTimeout.bind(window);
  const raf = window.requestAnimationFrame.bind(window);
  const held = [];
  const c = {
    scale: 1,
    frozen: false,
    thaw() {
      c.frozen = false;
      for (const f of held.splice(0)) f();
    },
  };
  window.__clock = c;
  window.setTimeout = (fn, ms, ...a) =>
    st(() => (c.frozen ? held.push(() => fn(...a)) : fn(...a)), (ms ?? 0) / c.scale);
  window.requestAnimationFrame = (cb) => raf((t) => (c.frozen ? held.push(() => raf(cb)) : cb(t)));
}

const FAST = 4;
const clockScale = (page, scale) => page.evaluate((x) => (window.__clock.scale = x), scale);

/**
 * Tap `label` and stop the clock when the picked peg is at the top of its
 * lift (180 ms up, then held 200 ms in colour before it flies to the tray,
 * src/ui/Peg.tsx), with the Match! banner fully in. The peg being played is drawn as the board's last child (the
 * touch targets before it are buttons).
 */
async function tapAndFreezeAtPeak(page, label) {
  const ok = await page.evaluate(
    ([tapSrc, label, boardRe, matchLabel]) =>
      new Promise((resolve) => {
        const re = new RegExp(boardRe);
        const all = () => Array.from(document.querySelectorAll('[aria-label]'));
        const board = all().find((e) => re.test(e.getAttribute('aria-label')));
        if (!new Function(`return (${tapSrc})`)()(label)) return resolve(false);
        const t0 = performance.now();
        let start = null;
        let height = 0;
        let best = Infinity;
        let still = 0;
        const tick = () => {
          const moving = board.lastElementChild;
          if (moving && moving.tagName !== 'BUTTON') {
            const rects = Array.from(moving.querySelectorAll('*'), (e) => e.getBoundingClientRect()).filter(
              (r) => r.width > 0 && r.height > 0,
            );
            const top = Math.min(...rects.map((r) => r.top));
            if (start == null) {
              start = top;
              height = Math.max(...rects.map((r) => r.bottom)) - top;
            }
            if (top < best - 0.5) {
              best = top;
              still = 0;
            } else still += 1;
            // up by less than its own height: lifted, not yet flying to the tray
            const lifted = start - best > 10 && start - top < height;
            const banner = all().find((e) => e.getAttribute('aria-label') === matchLabel);
            const cs = banner && getComputedStyle(banner);
            const m = cs && new DOMMatrixReadOnly(cs.transform === 'none' ? undefined : cs.transform);
            const bannerIn = cs && parseFloat(cs.opacity) > 0.99 && Math.abs(m.m42) < 0.5;
            if (lifted && still >= 2 && bannerIn) {
              window.__clock.frozen = true;
              return resolve(true);
            }
          }
          if (performance.now() - t0 > 1500) resolve(JSON.stringify({ start, best }));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    [String(tapInPage), label, BOARD_RE.source, T('game.match')],
  );
  if (ok !== true) throw new Error(`no lifted peg after tapping "${label}" ${ok}`);
  await sleep(200);
}

/**
 * pick() for the sped-up clock: the Match!/Miss banner can come and go
 * between two polls, so wait for what follows it instead (a roll, sudden
 * death or the end) and read a match off the peg itself.
 */
async function pickFast(page, s, colours, intent) {
  const free = [...s.pegs.entries()].filter(([, v]) => v === HIDDEN);
  const right = free.filter(([k]) => colours.get(k) === s.target);
  const wrong = free.filter(([k]) => colours.get(k) && colours.get(k) !== s.target);
  const [id] = (intent === 'match' ? right[0] ?? wrong[0] : wrong[0] ?? right[0]) ?? [];
  if (!id) throw new Error('no peg to pick');
  await tap(page, pegLabel(id, HIDDEN));
  const after = await until(page, (x) => x.humanRoll || x.over || x.revealing, { timeout: 30000, what: 'the move to resolve' });
  if (after.pegs.get(id) === TAKEN) colours.delete(id);
}

/**
 * The turn banner is one line with adjustsFontSizeToFit (down to 0.8x) on iOS;
 * react-native-web has no such thing and cuts the line with an ellipsis
 * instead. Shrink it the way iOS would, so the frame matches the device.
 */
async function fitBanner(page, label) {
  await page.evaluate((l) => {
    const banner = Array.from(document.querySelectorAll('[aria-label]')).find((e) => e.getAttribute('aria-label') === l);
    const text = banner?.firstElementChild;
    if (!text) return;
    const full = parseFloat(getComputedStyle(text).fontSize);
    for (let f = full; text.scrollWidth > text.clientWidth && f > full * 0.8; f -= 0.5) {
      text.style.fontSize = `${f - 0.5}px`;
    }
  }, label);
}

/**
 * The treatment, in store order: `from` is the control shot it replaces or
 * copies (its frame, and its caption key in captions.json), `capture` the
 * CAPTURE_PPO moment shot instead. 1-3 are the ones a search result shows:
 * the reveal, the family's sudden-death board, the shapes board, all face up.
 * The "found it" moment sits at 4: mid-game only one peg is ever face up, so
 * it cannot be a colourful thumbnail.
 */
const PPO_SHOTS = [
  { n: 1, file: '01-look', from: '01-look' },
  { n: 2, file: '02-family', from: '03-family', capture: 'family' },
  { n: 3, file: '03-shapes', from: '06-shapes' },
  { n: 4, file: '04-roll', from: '02-roll', capture: 'found' },
  { n: 5, file: '05-rivals', from: '04-rivals' },
  { n: 6, file: '06-sizes', from: '05-sizes' },
  { n: 7, file: '07-win-dark', from: '07-win-dark' },
];

const CAPTURE_PPO = {
  /**
   * "Found it": both trays holding pegs of every colour, the die on a
   * colour, and the matching peg lifted off the board in that colour, with
   * the Match! banner.
   */
  async found(page, dev, dir, file) {
    await seed(page, { boardSize: dev.board, difficulty: 'fox' });
    await goto(page, '/game?mode=ai');
    await clockScale(page, FAST);
    const colours = await memorise(page);
    await until(page, (s) => !s.revealing, { timeout: 30000, what: 'the reveal to end' });
    let s;
    for (let i = 0; ; i += 1) {
      s = await waitHuman(page);
      if (s.over || i > 40) throw new Error('no turn with both trays filled');
      const me = s.trays.find((t) => !t.ai);
      const ai = s.trays.find((t) => t.ai);
      // four pegs fill a tray's row; more would only empty the board
      const ready = me.score >= 4 && ai.score >= 4;
      if (ready) await clockScale(page, 1);
      const r = await roll(page);
      if (r.over) throw new Error('game ended early');
      if (ready) {
        s = r;
        break;
      }
      await pickFast(page, r, colours, me.score >= 4 ? 'miss' : 'match');
      if (ready) await clockScale(page, FAST);
    }
    await sleep(BANNER_SETTLE + 400); // die settle bounce + banner slide
    const right = [...s.pegs.keys()].filter((k) => s.pegs.get(k) === HIDDEN && colours.get(k) === s.target);
    // the matching peg nearest the front, so the lifted one is big and not hidden behind a row
    const ys = await page.evaluate(
      (ls) => ls.map((l) => Array.from(document.querySelectorAll('[aria-label]')).find((e) => e.getAttribute('aria-label') === l)?.getBoundingClientRect().top ?? -1),
      right.map((k) => pegLabel(k, HIDDEN)),
    );
    const id = right[ys.indexOf(Math.max(...ys))];
    await tapAndFreezeAtPeak(page, pegLabel(id, HIDDEN));
    await shoot(page, dir, file);
    await page.evaluate(() => window.__clock.thaw());
  },

  /**
   * The family game ends in a tie between the two kids: sudden death, a
   * fresh face-up board, the three named trays full of the pegs they won.
   */
  async family(page, dev, dir, file) {
    await seed(page, {
      boardSize: dev.board3p,
      lastMode: '3p',
      names: NAMES,
      avatars: ['fox', 'owl', 'bear'],
    });
    await goto(page, '/game?mode=3p');
    await clockScale(page, FAST);
    const colours = await memorise(page);
    await until(page, (s) => !s.revealing, { timeout: 30000, what: 'the reveal to end' });
    const total = (await state(page)).pegs.size;
    let low = Math.round(total / 6);
    if ((total - low) % 2) low += 1;
    const goal = { [NAMES[0]]: (total - low) / 2, [NAMES[1]]: (total - low) / 2, [NAMES[2]]: low };
    for (let i = 0; i < 200; i += 1) {
      const s = await until(page, (x) => x.humanRoll || x.over || x.revealing, { timeout: 90000, what: 'a turn' });
      if (s.revealing) break;
      if (s.over) throw new Error('the game ended without a tie');
      const taken = s.trays.reduce((n, t) => n + t.score, 0);
      // the last capture: back to real time, so the reveal countdown runs at its own pace
      if (taken >= total - 1) await clockScale(page, 1);
      const r = await roll(page);
      await pickFast(page, r, colours, s.active.score < goal[s.active.name] ? 'match' : 'miss');
    }
    await clockScale(page, 1);
    await until(page, (s) => s.revealing && s.countdown != null, { timeout: 30000, what: 'sudden death' });
    await memorise(page);
    await until(page, (s) => s.countdown != null && s.countdown <= 3, { timeout: 20000, step: 60, what: 'countdown 3' });
    await fitBanner(page, T('game.lookSudden'));
    await sleep(300);
    await shoot(page, dir, file);
  },
};

async function captureDevice(key, only) {
  const dev = DEVICES[key];
  const dir = LOCALE === 'en' ? path.join(RAW_ROOT, key) : path.join(RAW_ROOT, LOCALE, key);
  await mkdir(dir, { recursive: true });
  console.log(`\n=== ${key} ${LOCALE} (${dev.viewport.width}x${dev.viewport.height} @${dev.deviceScaleFactor}) ===`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: dev.viewport,
    deviceScaleFactor: dev.deviceScaleFactor,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    isMobile: false,
    locale: { en: 'en-US', zh: 'zh-TW' }[LOCALE] ?? LOCALE,
  });
  await ctx.addInitScript(pinVisible);
  if (SET) await ctx.addInitScript(clockControl);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    // headless Chromium has no codec for the sound files; harmless
    if (!/no supported sources/.test(String(e))) console.log('   [pageerror]', String(e).slice(0, 200));
  });
  const failed = [];
  try {
    for (const shot of SET ? PPO_SHOTS : SHOTS) {
      if (only && !only.includes(shot.n)) continue;
      console.log(` ${shot.n} ${shot.file}`);
      if (SET && !shot.capture) {
        // the control frame as is
        const from = path.join(CONTROL_ROOT, path.relative(RAW_ROOT, dir), `${shot.from}.png`);
        if (existsSync(from)) {
          await cp(from, path.join(dir, `${shot.file}.png`));
          console.log(`   copied ${path.relative(process.cwd(), from)}`);
        } else {
          console.log(`   ! no control frame ${path.relative(process.cwd(), from)}`);
          failed.push(shot.file);
        }
        continue;
      }
      let ok = false;
      for (let attempt = 1; attempt <= 2 && !ok; attempt += 1) {
        try {
          await (SET ? CAPTURE_PPO[shot.capture](page, dev, dir, shot.file) : CAPTURE[shot.n](page, dev, dir));
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
// compose-screenshots.mjs lays one frame set under every caption locale, so it
// only runs on the English frames
if (!process.exitCode && LOCALE === 'en' && !args.includes('--no-compose')) {
  let captions = path.join(HERE, 'captions.json');
  if (SET) {
    // the control listing also carries a 6.9" set composed from the 6.5" frames;
    // compose skips symlinked folders, so copy
    for (const lang of ['', ...i18n.LANGS.filter((l) => l !== 'en')]) {
      const from = path.join(RAW_ROOT, lang, 'iphone-6.5');
      if (existsSync(from)) await cp(from, path.join(RAW_ROOT, lang, 'iphone-6.9'), { recursive: true });
    }
    // the control's translated captions under the treatment's file names
    const spec = JSON.parse(readFileSync(captions, 'utf8'));
    for (const [locale, caps] of Object.entries(spec.captions)) {
      spec.captions[locale] = Object.fromEntries(PPO_SHOTS.map((x) => [x.file, caps[x.from]]));
    }
    captions = path.join(HERE, `captions-${SET}.json`);
    writeFileSync(captions, `${JSON.stringify(spec, null, 2)}\n`);
  }
  execFileSync(
    'node',
    [COMPOSE, '--frames', RAW_ROOT, '--captions', captions, '--out', OUT_ROOT],
    { stdio: 'inherit', cwd: path.dirname(HERE) },
  );
}
