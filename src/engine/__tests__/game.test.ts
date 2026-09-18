import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BOARD_SPECS,
  PEG_COLORS,
  SUDDEN_DEATH_SPEC,
  activePlayerSpec,
  adjacentIndices,
  availableColors,
  createGame,
  hiddenPegsByColor,
  isHumanTurn,
  reduce,
  revealDurationMs,
  type BoardSize,
  type GameState,
  type PegColor,
} from '../index';
import { createRng, nextInt } from '../rng';
import { makeConfig, rules, simulate } from './helpers';

const BOARD_SIZES: BoardSize[] = ['small', 'classic', 'big', 'huge'];

function startedGame(seed = 1, overrides = {}): GameState {
  const state = createGame(makeConfig({ seed, ...overrides }));
  return reduce(state, { type: 'REVEAL_DONE' });
}

/** Play out a full game with random legal picks. */
function randomGame(state: GameState, rngSeed: number): { state: GameState; picks: number } {
  let s = state;
  let r = createRng(rngSeed);
  let picks = 0;
  let guard = 0;
  while (s.phase !== 'gameOver' && guard++ < 20000) {
    if (s.phase === 'reveal') {
      s = reduce(s, { type: 'REVEAL_DONE' });
      continue;
    }
    s = reduce(s, { type: 'ROLL' });
    const hidden = s.pegs.filter((p) => p.state === 'hidden').map((p) => p.index);
    const [i, next] = nextInt(r, hidden.length);
    r = next;
    s = reduce(s, { type: 'PICK', pegIndex: hidden[i] });
    picks++;
    s = reduce(s, { type: 'RESULT_DONE' });
  }
  return { state: s, picks };
}

test('createGame is deterministic by seed', () => {
  const a = createGame(makeConfig({ seed: 12345 }));
  const b = createGame(makeConfig({ seed: 12345 }));
  const c = createGame(makeConfig({ seed: 12346 }));
  assert.deepEqual(a.pegs, b.pegs);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.pegs.map((p) => p.color), c.pegs.map((p) => p.color));
});

test('the whole die sequence follows from the seed', () => {
  const run = (seed: number) => randomGame(startedGame(seed), 777).state;
  const a = run(4242);
  const b = run(4242);
  assert.deepEqual(a.scores, b.scores);
  assert.deepEqual(a.pegs, b.pegs);
  assert.deepEqual(a.winnerIds, b.winnerIds);
  assert.equal(a.turn, b.turn);
});

test('colors are distributed as evenly as possible on every board', () => {
  for (const size of BOARD_SIZES) {
    for (let seed = 0; seed < 25; seed++) {
      const state = createGame(makeConfig({ seed, boardSize: size }));
      const spec = BOARD_SPECS[size];
      assert.equal(state.pegs.length, spec.pegs);
      const counts = new Map<PegColor, number>();
      for (const c of PEG_COLORS) counts.set(c, 0);
      for (const peg of state.pegs) counts.set(peg.color, (counts.get(peg.color) ?? 0) + 1);
      const base = Math.floor(spec.pegs / 6);
      const remainder = spec.pegs % 6;
      const values = [...counts.values()];
      assert.equal(values.reduce((a, b) => a + b, 0), spec.pegs);
      for (const v of values) assert.ok(v === base || v === base + 1, `${size}/${seed}: count ${v}`);
      assert.equal(values.filter((v) => v === base + 1).length, remainder);
    }
  }
});

test('remainder colors vary with the seed', () => {
  // classic = 25 pegs: 4 each + 1 extra, chosen randomly.
  const extras = new Set<PegColor>();
  for (let seed = 0; seed < 40; seed++) {
    const state = createGame(makeConfig({ seed, boardSize: 'classic' }));
    const counts = new Map<PegColor, number>();
    for (const peg of state.pegs) counts.set(peg.color, (counts.get(peg.color) ?? 0) + 1);
    for (const [color, n] of counts) if (n === 5) extras.add(color);
  }
  assert.ok(extras.size >= 4, `only ${extras.size} colors ever got the extra peg`);
});

test('reveal phase shows every peg, REVEAL_DONE flips them down', () => {
  const fresh = createGame(makeConfig({ seed: 8 }));
  assert.equal(fresh.phase, 'reveal');
  assert.ok(fresh.pegs.every((p) => p.state === 'revealed'));
  const rolling = reduce(fresh, { type: 'REVEAL_DONE' });
  assert.equal(rolling.phase, 'roll');
  assert.ok(rolling.pegs.every((p) => p.state === 'hidden'));
});

test('revealDurationMs applies kid mode x1.5', () => {
  const normal = createGame(makeConfig({ seed: 1, boardSize: 'classic' }));
  assert.equal(revealDurationMs(normal), 6000);
  const kid = createGame(makeConfig({ seed: 1, boardSize: 'classic', rules: rules({ kidMode: true }) }));
  assert.equal(revealDurationMs(kid), 9000);
  const kidHuge = createGame(makeConfig({ seed: 1, boardSize: 'huge', rules: rules({ kidMode: true }) }));
  assert.equal(revealDurationMs(kidHuge), Math.round(9000 * 1.5));
});

test('a match captures, scores and keeps the turn when bonus is on', () => {
  let s = startedGame(31);
  s = reduce(s, { type: 'ROLL' });
  const die = s.dieColor!;
  const target = s.pegs.find((p) => p.color === die)!;
  const active = activePlayerSpec(s).id;
  s = reduce(s, { type: 'PICK', pegIndex: target.index });
  assert.equal(s.phase, 'result');
  assert.equal(s.pegs[target.index].state, 'captured');
  assert.equal(s.pegs[target.index].capturedBy, active);
  assert.equal(s.scores[active], 1);
  assert.equal(s.turn, 1);
  assert.deepEqual(s.lastMove, { playerId: active, pegIndex: target.index, dieColor: die, matched: true });
  s = reduce(s, { type: 'RESULT_DONE' });
  assert.equal(s.phase, 'roll');
  assert.equal(activePlayerSpec(s).id, active, 'bonus turn keeps the same player');
  assert.equal(s.dieColor, null);
});

test('bonusTurnOnMatch off passes the turn after a match', () => {
  let s = startedGame(31, { rules: rules({ bonusTurnOnMatch: false }) });
  s = reduce(s, { type: 'ROLL' });
  const die = s.dieColor!;
  const target = s.pegs.find((p) => p.color === die)!;
  const active = activePlayerSpec(s).id;
  s = reduce(s, { type: 'PICK', pegIndex: target.index });
  s = reduce(s, { type: 'RESULT_DONE' });
  assert.notEqual(activePlayerSpec(s).id, active);
  assert.equal(s.scores[active], 1);
});

test('a miss reveals the peg then hides it and passes the turn', () => {
  let s = startedGame(77);
  s = reduce(s, { type: 'ROLL' });
  const die = s.dieColor!;
  const target = s.pegs.find((p) => p.color !== die)!;
  const active = activePlayerSpec(s).id;
  s = reduce(s, { type: 'PICK', pegIndex: target.index });
  assert.equal(s.phase, 'result');
  assert.equal(s.pegs[target.index].state, 'revealed');
  assert.equal(s.scores[active], 0);
  assert.equal(s.turn, 1);
  s = reduce(s, { type: 'RESULT_DONE' });
  assert.equal(s.pegs[target.index].state, 'hidden');
  assert.equal(s.phase, 'roll');
  assert.notEqual(activePlayerSpec(s).id, active);
});

test('turn advances wrap around 3 players', () => {
  const players = [
    { id: 'p1', kind: 'human' as const, avatar: 'fox' as const },
    { id: 'p2', kind: 'human' as const, avatar: 'owl' as const },
    { id: 'p3', kind: 'human' as const, avatar: 'bear' as const },
  ];
  let s = startedGame(5, { players, rules: rules({ bonusTurnOnMatch: false }) });
  const seen: string[] = [];
  for (let i = 0; i < 6; i++) {
    s = reduce(s, { type: 'ROLL' });
    seen.push(activePlayerSpec(s).id);
    const hidden = s.pegs.find((p) => p.state === 'hidden')!;
    s = reduce(s, { type: 'PICK', pegIndex: hidden.index });
    s = reduce(s, { type: 'RESULT_DONE' });
  }
  assert.deepEqual(seen, ['p1', 'p2', 'p3', 'p1', 'p2', 'p3']);
});

test('the die never lands on a dead color', () => {
  for (let seed = 0; seed < 30; seed++) {
    let s = startedGame(seed);
    let guard = 0;
    while (s.phase !== 'gameOver' && guard++ < 5000) {
      if (s.phase === 'reveal') {
        s = reduce(s, { type: 'REVEAL_DONE' });
        continue;
      }
      const before = availableColors(s);
      s = reduce(s, { type: 'ROLL' });
      assert.ok(before.includes(s.dieColor!), `rolled dead color ${s.dieColor}`);
      assert.ok(hiddenPegsByColor(s)[s.dieColor!] > 0);
      assert.ok((s.dieRerolls ?? 0) >= 0);
      // Always pick a correct peg so colors die out fast.
      const target = s.pegs.find((p) => p.state === 'hidden' && p.color === s.dieColor)!;
      s = reduce(s, { type: 'PICK', pegIndex: target.index });
      s = reduce(s, { type: 'RESULT_DONE' });
    }
    assert.equal(s.phase, 'gameOver');
  }
});

test('random full games end in gameOver with scores summing to the peg count', () => {
  for (const size of BOARD_SIZES) {
    for (let seed = 0; seed < 12; seed++) {
      const { state } = randomGame(startedGame(seed, { boardSize: size }), seed * 31 + 7);
      assert.equal(state.phase, 'gameOver', `${size}/${seed} did not finish`);
      const total = Object.values(state.scores).reduce((a, b) => a + b, 0);
      assert.equal(total, BOARD_SPECS[size].pegs, 'main-game scores always total the peg count');
      if (state.suddenDeath) {
        // The main board was cleared, then a 3x3 tie-break board took over.
        assert.equal(state.pegs.length, 9);
        assert.equal(state.winnerIds.length, 1);
      } else {
        assert.ok(state.pegs.every((p) => p.state === 'captured'));
      }
      assert.ok(state.winnerIds.length >= 1);
      const best = Math.max(...Object.values(state.scores));
      for (const id of state.winnerIds) assert.equal(state.scores[id], best);
      assert.equal(state.turn >= BOARD_SPECS[size].pegs, true);
    }
  }
});

test('invalid actions are no-ops returning the same state', () => {
  const fresh = createGame(makeConfig({ seed: 3 }));
  assert.equal(reduce(fresh, { type: 'ROLL' }), fresh, 'ROLL during reveal');
  assert.equal(reduce(fresh, { type: 'PICK', pegIndex: 0 }), fresh, 'PICK during reveal');
  assert.equal(reduce(fresh, { type: 'RESULT_DONE' }), fresh, 'RESULT_DONE during reveal');

  let s = reduce(fresh, { type: 'REVEAL_DONE' });
  assert.equal(reduce(s, { type: 'REVEAL_DONE' }), s, 'second REVEAL_DONE');
  assert.equal(reduce(s, { type: 'PICK', pegIndex: 0 }), s, 'PICK before rolling');

  s = reduce(s, { type: 'ROLL' });
  assert.equal(reduce(s, { type: 'ROLL' }), s, 'ROLL during pick');
  assert.equal(reduce(s, { type: 'PICK', pegIndex: -1 }), s, 'negative index');
  assert.equal(reduce(s, { type: 'PICK', pegIndex: 999 }), s, 'out of range index');
  assert.equal(reduce(s, { type: 'PICK', pegIndex: 1.5 }), s, 'fractional index');

  // Capture a peg, then try to pick it again.
  const die = s.dieColor!;
  const target = s.pegs.find((p) => p.color === die)!;
  s = reduce(s, { type: 'PICK', pegIndex: target.index });
  assert.equal(reduce(s, { type: 'PICK', pegIndex: 0 }), s, 'PICK during result');
  assert.equal(reduce(s, { type: 'ROLL' }), s, 'ROLL during result');
  s = reduce(s, { type: 'RESULT_DONE' });
  s = reduce(s, { type: 'ROLL' });
  const captured = reduce(s, { type: 'PICK', pegIndex: target.index });
  assert.equal(captured, s, 'PICK on a captured peg');

  // gameOver absorbs everything.
  const over = randomGame(startedGame(9), 1).state;
  assert.equal(over.phase, 'gameOver');
  for (const action of [
    { type: 'ROLL' as const },
    { type: 'PICK' as const, pegIndex: 0 },
    { type: 'RESULT_DONE' as const },
    { type: 'REVEAL_DONE' as const },
  ]) {
    assert.equal(reduce(over, action), over, `${action.type} after gameOver`);
  }
});

test('RESTART keeps the config and builds a fresh board with a new seed', () => {
  const finished = randomGame(startedGame(21), 4).state;
  const again = reduce(finished, { type: 'RESTART' });
  assert.equal(again.phase, 'reveal');
  assert.equal(again.turn, 0);
  assert.deepEqual(again.config.players, finished.config.players);
  assert.deepEqual(again.config.rules, finished.config.rules);
  assert.notEqual(again.config.seed, finished.config.seed);
  assert.ok(again.pegs.every((p) => p.state === 'revealed'));
  assert.deepEqual(Object.values(again.scores), [0, 0]);
  assert.equal(again.suddenDeath, false);
  assert.deepEqual(again.winnerIds, []);

  const explicit = reduce(finished, { type: 'RESTART', seed: 999 });
  assert.equal(explicit.config.seed, 999);
  assert.deepEqual(explicit.pegs, createGame({ ...finished.config, seed: 999 }).pegs);
});

test('shared tie break ends the game with both winners', () => {
  // small board (16 pegs) with bonus off: force an 8-8 split by alternating.
  const state = playToTie('shared');
  assert.equal(state.phase, 'gameOver');
  assert.deepEqual(state.winnerIds.sort(), ['p1', 'p2']);
  assert.equal(state.suddenDeath, false);
  assert.equal(state.scores.p1, state.scores.p2);
});

test('kid mode always shares a tie, even with suddenDeath configured', () => {
  const state = playToTie('suddenDeath', true);
  assert.equal(state.phase, 'gameOver');
  assert.deepEqual(state.winnerIds.sort(), ['p1', 'p2']);
  assert.equal(state.suddenDeath, false);
});

test('sudden death spins up a 3x3 mini board and the first capture wins', () => {
  let s = playToTie('suddenDeath');
  assert.equal(s.suddenDeath, true);
  assert.equal(s.phase, 'reveal');
  assert.equal(s.spec.cols, 3);
  assert.equal(s.spec.rows, 3);
  assert.equal(s.pegs.length, 9);
  assert.deepEqual(s.spec, SUDDEN_DEATH_SPEC);
  const miniColors = new Map<PegColor, number>();
  for (const p of s.pegs) miniColors.set(p.color, (miniColors.get(p.color) ?? 0) + 1);
  assert.equal(miniColors.size, 3, '3 colors on the mini board');
  for (const n of miniColors.values()) assert.equal(n, 3);
  assert.equal(s.scores.p1, 8, 'main-game scores are kept');
  assert.equal(s.scores.p2, 8);
  assert.deepEqual(s.winnerIds.sort(), ['p1', 'p2'], 'tied players pending');
  assert.deepEqual(s.activeSeats, [0, 1]);

  s = reduce(s, { type: 'REVEAL_DONE' });
  // Miss first: nothing is decided, the turn passes.
  s = reduce(s, { type: 'ROLL' });
  const missIndex = s.pegs.find((p) => p.color !== s.dieColor)!.index;
  const first = activePlayerSpec(s).id;
  s = reduce(s, { type: 'PICK', pegIndex: missIndex });
  s = reduce(s, { type: 'RESULT_DONE' });
  assert.equal(s.phase, 'roll');
  assert.notEqual(activePlayerSpec(s).id, first);
  assert.deepEqual(s.scores, { p1: 8, p2: 8 }, 'main scores untouched');

  // Now capture: sudden death ends immediately with one winner.
  s = reduce(s, { type: 'ROLL' });
  const hitIndex = s.pegs.find((p) => p.state === 'hidden' && p.color === s.dieColor)!.index;
  const winner = activePlayerSpec(s).id;
  s = reduce(s, { type: 'PICK', pegIndex: hitIndex });
  assert.equal(s.suddenDeathScores?.[winner], 1);
  assert.equal(s.scores[winner], 8, 'the SD capture does not touch main scores');
  s = reduce(s, { type: 'RESULT_DONE' });
  assert.equal(s.phase, 'gameOver');
  assert.deepEqual(s.winnerIds, [winner]);
  assert.ok(s.pegs.some((p) => p.state === 'hidden'), 'mini board is not emptied');
});

test('sudden death only rotates the tied players', () => {
  const players = [
    { id: 'p1', kind: 'human' as const, avatar: 'fox' as const },
    { id: 'p2', kind: 'human' as const, avatar: 'owl' as const },
    { id: 'p3', kind: 'human' as const, avatar: 'bear' as const },
  ];
  // 16 pegs, bonus off: p1 and p2 always match, p3 always misses.
  let s = startedGame(12, { players, boardSize: 'small', rules: rules({ bonusTurnOnMatch: false }) });
  let guard = 0;
  while (s.phase !== 'gameOver' && !s.suddenDeath && guard++ < 500) {
    s = reduce(s, { type: 'ROLL' });
    const id = activePlayerSpec(s).id;
    const hidden = s.pegs.filter((p) => p.state === 'hidden');
    const peg =
      id === 'p3'
        ? hidden.find((p) => p.color !== s.dieColor) ?? hidden[0]
        : hidden.find((p) => p.color === s.dieColor) ?? hidden[0];
    s = reduce(s, { type: 'PICK', pegIndex: peg.index });
    s = reduce(s, { type: 'RESULT_DONE' });
  }
  assert.equal(s.suddenDeath, true, 'p1/p2 tied at 8-8');
  assert.deepEqual(s.activeSeats, [0, 1]);
  s = reduce(s, { type: 'REVEAL_DONE' });
  const order: string[] = [];
  for (let i = 0; i < 4 && s.phase !== 'gameOver'; i++) {
    s = reduce(s, { type: 'ROLL' });
    order.push(activePlayerSpec(s).id);
    const miss = s.pegs.find((p) => p.state === 'hidden' && p.color !== s.dieColor)!;
    s = reduce(s, { type: 'PICK', pegIndex: miss.index });
    s = reduce(s, { type: 'RESULT_DONE' });
  }
  assert.deepEqual(order, ['p1', 'p2', 'p1', 'p2'], 'p3 is skipped');
});

test('helpers: hiddenPegsByColor, availableColors, isHumanTurn, adjacentIndices', () => {
  let s = startedGame(17);
  const counts = hiddenPegsByColor(s);
  assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 25);
  assert.deepEqual(availableColors(s), PEG_COLORS.filter((c) => counts[c] > 0));
  assert.equal(isHumanTurn(s), true);

  const aiGame = createGame(
    makeConfig({
      seed: 2,
      players: [
        { id: 'p1', kind: 'human', avatar: 'fox' },
        { id: 'p2', kind: 'ai', avatar: 'owl', difficulty: 'owl' },
      ],
    }),
  );
  let a = reduce(aiGame, { type: 'REVEAL_DONE' });
  a = reduce(a, { type: 'ROLL' });
  const miss = a.pegs.find((p) => p.color !== a.dieColor)!;
  a = reduce(a, { type: 'PICK', pegIndex: miss.index });
  a = reduce(a, { type: 'RESULT_DONE' });
  assert.equal(isHumanTurn(a), false);
  assert.equal(activePlayerSpec(a).difficulty, 'owl');

  // 5x5: corner 0 -> {1, 5}; centre 12 -> {7, 17, 11, 13}
  assert.deepEqual(adjacentIndices(0, s.spec).sort((x, y) => x - y), [1, 5]);
  assert.deepEqual(adjacentIndices(12, s.spec).sort((x, y) => x - y), [7, 11, 13, 17]);
  assert.deepEqual(adjacentIndices(24, s.spec).sort((x, y) => x - y), [19, 23]);

  // capturing removes a color from the die pool
  s = reduce(s, { type: 'ROLL' });
  const die = s.dieColor!;
  let t = s;
  for (const peg of s.pegs.filter((p) => p.color === die)) {
    t = { ...t, pegs: t.pegs.map((p) => (p.index === peg.index ? { ...p, state: 'captured' } : p)) };
  }
  assert.equal(hiddenPegsByColor(t)[die], 0);
  assert.ok(!availableColors(t).includes(die));
});

test('single player (solo) games finish and score everything', () => {
  const solo = makeConfig({
    seed: 55,
    players: [{ id: 'p1', kind: 'human', avatar: 'frog' }],
  });
  const { state } = randomGame(reduce(createGame(solo), { type: 'REVEAL_DONE' }), 3);
  assert.equal(state.phase, 'gameOver');
  assert.equal(state.scores.p1, 25);
  assert.deepEqual(state.winnerIds, ['p1']);
});

test('simulate() harness drives AI games to completion', () => {
  const config = makeConfig({
    seed: 4,
    players: [
      { id: 'p1', kind: 'ai', avatar: 'owl', difficulty: 'owl' },
      { id: 'p2', kind: 'ai', avatar: 'bunny', difficulty: 'bunny' },
    ],
  });
  const { state } = simulate(config, 1234);
  assert.equal(state.phase, 'gameOver');
  assert.equal(state.scores.p1 + state.scores.p2, 25);
});

/** Drive a 16-peg 2-player game to an 8-8 tie, then return the resulting state. */
function playToTie(tieBreak: 'shared' | 'suddenDeath', kidMode = false): GameState {
  let s = startedGame(12, {
    boardSize: 'small',
    rules: rules({ bonusTurnOnMatch: false, tieBreak, kidMode }),
  });
  let guard = 0;
  while (s.phase !== 'gameOver' && !s.suddenDeath && guard++ < 500) {
    s = reduce(s, { type: 'ROLL' });
    const hit = s.pegs.find((p) => p.state === 'hidden' && p.color === s.dieColor)!;
    s = reduce(s, { type: 'PICK', pegIndex: hit.index });
    s = reduce(s, { type: 'RESULT_DONE' });
  }
  return s;
}
