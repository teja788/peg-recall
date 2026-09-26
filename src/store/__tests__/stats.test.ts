import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_RULES, createGame, reduce, type GameState, type PlayerSpec } from '../../engine';
import { createStatsStore } from '../stats';
import {
  EMPTY_STATS,
  MAX_PLAYERS,
  STATS_KEY,
  applyGameResult,
  emptyStats,
  localDay,
  playerKey,
  sanitizeStats,
  shouldAskForReview,
  type Stats,
} from '../statsModel';
import type { KeyValueStorage } from '../storage';

/* ---------------------------------------------------------------- fixtures */

const human = (id: string, avatar: PlayerSpec['avatar'], name?: string): PlayerSpec =>
  name === undefined ? { id, kind: 'human', avatar } : { id, kind: 'human', avatar, name };
const ai = (difficulty: 'bunny' | 'fox' | 'owl'): PlayerSpec => ({
  id: 'p2',
  kind: 'ai',
  avatar: difficulty,
  difficulty,
});

/** A game-over state with the given seats and winners. */
function finished(players: PlayerSpec[], winnerIds: string[], over: Partial<GameState> = {}): GameState {
  const base = createGame({ boardSize: 'small', players, rules: { ...DEFAULT_RULES }, seed: 1 });
  return { ...base, phase: 'gameOver', winnerIds, ...over };
}

const DAY1 = new Date(2026, 8, 20, 10, 0).getTime();
const DAY2 = new Date(2026, 8, 21, 18, 30).getTime();

const vsFox = (won: boolean, name?: string) =>
  finished([human('p1', 'bear', name), ai('fox')], [won ? 'p1' : 'p2']);

/* ------------------------------------------------------------------ keys */

test('playerKey: by name (case-insensitive) when typed, by animal otherwise', () => {
  assert.equal(playerKey(human('p1', 'fox', 'Maya')), 'name:maya');
  assert.equal(playerKey(human('p2', 'cat', 'MAYA')), 'name:maya', 'same Maya on any seat/animal');
  assert.equal(playerKey(human('p1', 'fox')), 'animal:fox');
  assert.equal(playerKey(human('p1', 'fox', '  ')), 'animal:fox');
});

/* ------------------------------------------------------ applyGameResult */

test('an unfinished game changes nothing', () => {
  const s = emptyStats();
  const live = { ...vsFox(true), phase: 'roll' as const };
  assert.equal(applyGameResult(s, live, DAY1), s);
  assert.equal(applyGameResult(s, { ...vsFox(true), winnerIds: [] }, DAY1), s);
});

test('pass-and-play win and loss per player', () => {
  const g = finished([human('p1', 'fox', 'Maya'), human('p2', 'owl'), human('p3', 'bear', 'Leo')], ['p3']);
  const s = applyGameResult(EMPTY_STATS, g, DAY1);
  assert.deepEqual(s.players['name:maya'], {
    key: 'name:maya',
    label: 'Maya',
    avatar: 'fox',
    played: 1,
    wins: 0,
    lastPlayed: DAY1,
  });
  assert.equal(s.players['animal:owl'].label, 'Owl');
  assert.equal(s.players['name:leo'].wins, 1);
  assert.equal(s.gamesFinished, 1);
  assert.deepEqual(s.finishedDays, [localDay(DAY1)]);
  assert.deepEqual(s.vsAi, EMPTY_STATS.vsAi, 'no computer, no vs-AI record');
  assert.equal(EMPTY_STATS.gamesFinished, 0, 'input untouched');

  const again = applyGameResult(s, g, DAY1);
  assert.equal(again.players['name:leo'].played, 2);
  assert.equal(again.players['name:leo'].wins, 2);
  assert.deepEqual(again.finishedDays, [localDay(DAY1)], 'days are distinct');
});

test('the AI seat is never recorded as a player', () => {
  const s = applyGameResult(EMPTY_STATS, vsFox(false), DAY1);
  assert.deepEqual(Object.keys(s.players), ['animal:bear']);
});

test('a shared (kid-mode) tie is a win for every tied seat', () => {
  const g = finished([human('p1', 'fox', 'Maya'), human('p2', 'owl', 'Leo'), human('p3', 'cat')], ['p1', 'p2']);
  const s = applyGameResult(EMPTY_STATS, g, DAY1);
  assert.equal(s.players['name:maya'].wins, 1);
  assert.equal(s.players['name:leo'].wins, 1);
  assert.equal(s.players['animal:cat'].wins, 0);
});

test('sudden death: only its winner wins, and it is one game', () => {
  // play a tied board into sudden death through the real reducer
  const players = [human('p1', 'fox', 'Maya'), human('p2', 'owl', 'Leo')];
  const base = createGame({ boardSize: 'small', players, rules: { ...DEFAULT_RULES }, seed: 5 });
  const tied: GameState = {
    ...base,
    pegs: base.pegs.map((p, i) => ({ ...p, state: 'captured' as const, capturedBy: i % 2 ? 'p2' : 'p1' })),
    phase: 'result',
    scores: { p1: 8, p2: 8 },
    lastMove: { playerId: 'p2', pegIndex: 15, dieColor: base.pegs[15].color, matched: true },
  };
  let s = reduce(tied, { type: 'RESULT_DONE' });
  assert.equal(s.suddenDeath, true);
  assert.notEqual(s.phase, 'gameOver', 'no intermediate game over');
  assert.equal(applyGameResult(EMPTY_STATS, s, DAY1), EMPTY_STATS, 'nothing to record yet');

  s = reduce(s, { type: 'REVEAL_DONE' });
  s = reduce(s, { type: 'ROLL' });
  const who = s.config.players[s.activePlayer].id;
  const hit = s.pegs.find((p) => p.state === 'hidden' && p.color === s.dieColor)!;
  s = reduce(s, { type: 'PICK', pegIndex: hit.index });
  s = reduce(s, { type: 'RESULT_DONE' });
  assert.equal(s.phase, 'gameOver');
  assert.deepEqual(s.winnerIds, [who]);

  const out = applyGameResult(EMPTY_STATS, s, DAY1);
  assert.equal(out.gamesFinished, 1);
  const winnerKey = who === 'p1' ? 'name:maya' : 'name:leo';
  const loserKey = who === 'p1' ? 'name:leo' : 'name:maya';
  assert.equal(out.players[winnerKey].wins, 1);
  assert.equal(out.players[loserKey].wins, 0);
  assert.equal(out.players[loserKey].played, 1);
});

test('vs AI: wins, streaks and best streak per difficulty', () => {
  let s: Stats = EMPTY_STATS;
  for (const won of [true, true, true, false, true]) s = applyGameResult(s, vsFox(won), DAY1);
  assert.deepEqual(s.vsAi.fox, { played: 5, wins: 4, streak: 1, bestStreak: 3 });
  assert.deepEqual(s.vsAi.owl, { played: 0, wins: 0, streak: 0, bestStreak: 0 });

  const owlGame = finished([human('p1', 'bear'), ai('owl')], ['p2']);
  s = applyGameResult(s, owlGame, DAY1);
  assert.deepEqual(s.vsAi.owl, { played: 1, wins: 0, streak: 0, bestStreak: 0 });
  assert.deepEqual(s.vsAi.fox.streak, 1, 'other tiers untouched');
});

test('vs AI: a shared tie neither grows nor breaks the streak', () => {
  let s = applyGameResult(EMPTY_STATS, vsFox(true), DAY1);
  s = applyGameResult(s, vsFox(true), DAY1);
  const tie = finished([human('p1', 'bear'), ai('fox')], ['p1', 'p2']);
  s = applyGameResult(s, tie, DAY1);
  assert.equal(s.vsAi.fox.streak, 2);
  assert.equal(s.vsAi.fox.bestStreak, 2);
  assert.equal(s.vsAi.fox.played, 3);
  assert.equal(s.vsAi.fox.wins, 3, 'a shared win still counts as a win');
  assert.equal(s.players['animal:bear'].wins, 3);
});

test('two seats with the same name count as one player, once', () => {
  const g = finished([human('p1', 'fox', 'Sam'), human('p2', 'owl', 'sam')], ['p2']);
  const s = applyGameResult(EMPTY_STATS, g, DAY1);
  assert.deepEqual(Object.keys(s.players), ['name:sam']);
  assert.equal(s.players['name:sam'].played, 1);
  assert.equal(s.players['name:sam'].wins, 1);
});

test('the player map is capped, dropping the least recently played', () => {
  let s: Stats = EMPTY_STATS;
  for (let i = 0; i < MAX_PLAYERS + 5; i++) {
    const g = finished([human('p1', 'fox', `P${i}`), human('p2', 'owl', `Q${i}`)], ['p1']);
    s = applyGameResult(s, g, DAY1 + i * 1000);
  }
  const keys = Object.keys(s.players);
  assert.equal(keys.length, MAX_PLAYERS);
  assert.ok(keys.includes(`name:p${MAX_PLAYERS + 4}`), 'the game just played is kept');
  assert.ok(!keys.includes('name:p0'), 'the oldest is evicted');
  assert.equal(s.gamesFinished, MAX_PLAYERS + 5);
});

test('finished days are distinct, sorted and capped at 30', () => {
  let s: Stats = EMPTY_STATS;
  for (let d = 0; d < 40; d++) s = applyGameResult(s, vsFox(true), new Date(2026, 0, 1 + d, 12).getTime());
  assert.equal(s.finishedDays.length, 30);
  assert.equal(s.finishedDays[29], localDay(new Date(2026, 0, 40, 12).getTime()));
  assert.deepEqual([...s.finishedDays].sort(), s.finishedDays);
  assert.equal(localDay(new Date(2026, 8, 5, 23, 59).getTime()), '2026-09-05', 'local day, zero-padded');
});

/* ---------------------------------------------------------- sanitizeStats */

test('sanitizeStats: garbage in, empty stats out', () => {
  for (const raw of [undefined, null, 0, 'x', [], true]) {
    assert.deepEqual(sanitizeStats(raw), emptyStats());
  }
});

test('sanitizeStats: a round trip is lossless', () => {
  let s = applyGameResult(EMPTY_STATS, vsFox(true, 'Maya'), DAY1);
  s = applyGameResult(s, vsFox(false, 'Maya'), DAY2);
  s = { ...s, reviewAskedVersion: '1.1.0' };
  assert.deepEqual(sanitizeStats(JSON.parse(JSON.stringify(s))), s);
});

test('sanitizeStats: bad entries are dropped or repaired, the rest kept', () => {
  const out = sanitizeStats({
    version: 1,
    players: {
      'name:maya': { label: 'Maya', avatar: 'fox', played: 3, wins: 9, lastPlayed: 5 },
      'animal:owl': { label: 'Owl', avatar: 'owl', played: -2, wins: 'x', lastPlayed: NaN },
      'animal:cat': { label: 'Cat', avatar: 'fox', played: 1, wins: 1, lastPlayed: 1 }, // key/avatar mismatch
      'name:bad': { label: 'Bad', avatar: 'unicorn', played: 1, wins: 0, lastPlayed: 1 },
      junk: { label: 'J', avatar: 'fox', played: 1, wins: 0, lastPlayed: 1 },
      'name:x': 'not an object',
      'name:ctrl': { label: '‮evil', avatar: 'cat', played: 1.7, wins: 0, lastPlayed: 1 },
    },
    vsAi: { fox: { played: 4, wins: 2, streak: 3, bestStreak: 1 }, owl: 'nope', dragon: {} },
    gamesFinished: -1,
    finishedDays: ['2026-09-21', '2026-09-20', 'nope', 7, '2026-09-21'],
    reviewAskedVersion: 11,
  });
  assert.deepEqual(Object.keys(out.players).sort(), ['animal:owl', 'name:ctrl', 'name:maya']);
  assert.equal(out.players['name:maya'].wins, 3, 'wins never exceed played');
  assert.deepEqual(
    { played: out.players['animal:owl'].played, wins: out.players['animal:owl'].wins, last: out.players['animal:owl'].lastPlayed },
    { played: 0, wins: 0, last: 0 },
  );
  assert.equal(out.players['name:ctrl'].label, 'evil', 'labels are cleaned like names');
  assert.equal(out.players['name:ctrl'].played, 1);
  assert.deepEqual(out.vsAi.fox, { played: 4, wins: 2, streak: 3, bestStreak: 3 });
  assert.deepEqual(out.vsAi.owl, { played: 0, wins: 0, streak: 0, bestStreak: 0 });
  assert.equal('dragon' in out.vsAi, false);
  assert.equal(out.gamesFinished, 0);
  assert.deepEqual(out.finishedDays, ['2026-09-20', '2026-09-21']);
  assert.equal(out.reviewAskedVersion, null);
  assert.equal(out.version, 1);
});

/* ----------------------------------------------------- shouldAskForReview */

test('shouldAskForReview: 3 games, 2 days, once per version, happy ending only', () => {
  const happy = { humanWon: true, passAndPlay: false };
  let s: Stats = EMPTY_STATS;
  s = applyGameResult(s, vsFox(true), DAY1);
  s = applyGameResult(s, vsFox(true), DAY1);
  assert.equal(shouldAskForReview(s, happy, '1.1.0'), false, '2 games');
  s = applyGameResult(s, vsFox(true), DAY1);
  assert.equal(shouldAskForReview(s, happy, '1.1.0'), false, '3 games but 1 day');
  s = applyGameResult(s, vsFox(true), DAY2);
  assert.equal(shouldAskForReview(s, happy, '1.1.0'), true);

  assert.equal(shouldAskForReview(s, { humanWon: false, passAndPlay: false }, '1.1.0'), false, 'lost to the computer');
  assert.equal(shouldAskForReview(s, { humanWon: false, passAndPlay: true }, '1.1.0'), true, 'pass and play');

  const asked = { ...s, reviewAskedVersion: '1.1.0' };
  assert.equal(shouldAskForReview(asked, happy, '1.1.0'), false, 'once per version');
  assert.equal(shouldAskForReview(asked, happy, '1.2.0'), true, 'a new version may ask again');
});

/* ------------------------------------------------------------ the store */

class MemStorage implements KeyValueStorage {
  data = new Map<string, string>();
  writes = 0;
  private waiting: (() => void)[] = [];
  hold = false;
  getItem = (key: string) =>
    new Promise<string | null>((resolve) => {
      const answer = () => resolve(this.data.get(key) ?? null);
      if (this.hold) this.waiting.push(answer);
      else answer();
    });
  setItem = async (key: string, value: string) => {
    this.writes++;
    this.data.set(key, value);
  };
  release() {
    this.hold = false;
    const w = this.waiting;
    this.waiting = [];
    for (const fn of w) fn();
  }
}
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

test('store: recordGame counts a game once, persists, and hydrates back', async () => {
  const storage = new MemStorage();
  const useS = createStatsStore({ storage, timeoutMs: 50, debounceMs: 1 });
  await useS.getState().hydrate();
  const g = vsFox(true, 'Maya');
  useS.getState().recordGame(g, DAY1);
  useS.getState().recordGame(g, DAY1); // same state object again: ignored
  useS.getState().recordGame({ ...g, phase: 'roll' }, DAY1); // not finished: ignored
  assert.equal(useS.getState().gamesFinished, 1);
  assert.equal(useS.getState().players['name:maya'].wins, 1);
  await tick(10);
  const stored = JSON.parse(storage.data.get(STATS_KEY)!);
  assert.equal(stored.gamesFinished, 1);
  assert.equal('hydrated' in stored, false, 'only the Stats fields are written');

  const fresh = createStatsStore({ storage, timeoutMs: 50, debounceMs: 1 });
  await fresh.getState().hydrate();
  assert.equal(fresh.getState().hydrated, true);
  assert.equal(fresh.getState().vsAi.fox.streak, 1);
});

test('store (A8): games finished before a slow read are replayed on top of it', async () => {
  const storage = new MemStorage();
  let prior = applyGameResult(EMPTY_STATS, vsFox(true), DAY1);
  prior = applyGameResult(prior, vsFox(true), DAY1);
  storage.data.set(STATS_KEY, JSON.stringify(prior));
  storage.hold = true;

  const useS = createStatsStore({ storage, timeoutMs: 5, debounceMs: 1 });
  await useS.getState().hydrate(); // times out
  assert.equal(useS.getState().hydrated, true);
  useS.getState().recordGame(vsFox(true), DAY2);
  assert.equal(useS.getState().gamesFinished, 1, 'in memory meanwhile');
  await tick(20);
  assert.equal(storage.writes, 0, 'nothing written over the unread stats');

  storage.release();
  await tick(10);
  const s = useS.getState();
  assert.equal(s.gamesFinished, 3, 'stored 2 + the one played meanwhile');
  assert.deepEqual(s.vsAi.fox, { played: 3, wins: 3, streak: 3, bestStreak: 3 });
  assert.equal(JSON.parse(storage.data.get(STATS_KEY)!).gamesFinished, 3);
});

test('store: no storage bound yet → games are kept and replayed once it is', async () => {
  const useS = createStatsStore({ timeoutMs: 5, debounceMs: 1 });
  useS.getState().recordGame(vsFox(false), DAY1); // lazily asks to hydrate
  assert.equal(useS.getState().vsAi.fox.played, 1);
  const storage = new MemStorage();
  storage.data.set(STATS_KEY, JSON.stringify(applyGameResult(EMPTY_STATS, vsFox(true), DAY1)));
  useS.getState().bindStorage(storage);
  await tick(10);
  assert.equal(useS.getState().hydrated, true);
  assert.deepEqual(useS.getState().vsAi.fox, { played: 2, wins: 1, streak: 0, bestStreak: 1 });
});

test('store: markReviewAsked and reset', async () => {
  const storage = new MemStorage();
  const useS = createStatsStore({ storage, timeoutMs: 50, debounceMs: 1 });
  await useS.getState().hydrate();
  useS.getState().recordGame(vsFox(true), DAY1);
  useS.getState().markReviewAsked('1.1.0');
  assert.equal(useS.getState().reviewAskedVersion, '1.1.0');
  useS.getState().reset();
  assert.equal(useS.getState().gamesFinished, 0);
  assert.deepEqual(useS.getState().players, {});
  assert.equal(useS.getState().reviewAskedVersion, '1.1.0', 'reset does not re-arm the review prompt');
  await tick(10);
  assert.equal(JSON.parse(storage.data.get(STATS_KEY)!).gamesFinished, 0);
});
