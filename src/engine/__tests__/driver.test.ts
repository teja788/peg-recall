/**
 * The table driver (src/engine/driver.ts) run the way the room server will run
 * it: no timers, no UI, only `autoStep` deciding what happens next. A device
 * that replays the server's action log through `reduce` alone must land on the
 * same state after every step (PLAN-web-online.md §B3).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_RULES,
  FLOW,
  aiSeedFor,
  autoStep,
  computerPick,
  createGame,
  freshBrains,
  observePick,
  reduce,
  revealDurationMs,
  tumbleMs,
  type BoardSize,
  type GameAction,
  type GameConfig,
  type GameState,
  type PlayerSpec,
} from '../index';
import { stateHash } from '../../online/hash';
import { aiPlayer } from './helpers';

const AVATARS: PlayerSpec['avatar'][] = ['fox', 'owl', 'bear', 'frog'];
const TIERS = ['bunny', 'fox', 'owl'] as const;

function allComputer(seats: number, boardSize: BoardSize, seed: number, kidMode = false): GameConfig {
  return {
    boardSize,
    players: Array.from({ length: seats }, (_, i) => aiPlayer(`p${i + 1}`, TIERS[i % 3], AVATARS[i])),
    rules: { ...DEFAULT_RULES, kidMode, tieBreak: kidMode ? 'shared' : 'suddenDeath' },
    seed,
  };
}

/** A referee loop: the server's job with the clock taken out. */
function referee(config: GameConfig) {
  let state = createGame(config);
  let rng = { seed: aiSeedFor(config.seed), counter: 0 };
  let brains = freshBrains(state, rng);
  let ais = brains.ais;
  rng = brains.rng;
  const log: GameAction[] = [];
  const hashes: string[] = [];
  for (let guard = 0; state.phase !== 'gameOver'; guard++) {
    assert.ok(guard < 5000, 'the game must end');
    const step = autoStep(state, rng);
    assert.ok(step, `an all-computer game never waits (phase ${state.phase})`);
    rng = step.rng;
    let action: GameAction;
    if (step.kind === 'PICK') {
      const res = computerPick(state, ais, rng);
      assert.ok(res && res.pegIndex >= 0, 'a computer always has a peg to pick');
      rng = res.rng;
      ais = res.ais;
      action = { type: 'PICK', pegIndex: res.pegIndex };
    } else {
      action = { type: step.kind };
    }
    const next = reduce(state, action);
    assert.notEqual(next, state, `${action.type} must be a valid step in ${state.phase}`);
    if (action.type === 'PICK') ais = observePick(ais, next);
    // a sudden-death mini board is a new board: new brains
    if (next.phase === 'reveal' && state.phase !== 'reveal') {
      brains = freshBrains(next, rng);
      ais = brains.ais;
      rng = brains.rng;
    }
    state = next;
    log.push(action);
    hashes.push(stateHash(state));
  }
  return { state, log, hashes };
}

test('a referee loop plays every board and seat count to the end, the same way twice', () => {
  for (const board of ['small', 'classic', 'big', 'huge'] as const) {
    for (const seats of [2, 3, 4]) {
      const config = allComputer(seats, board, 1000 + seats);
      const a = referee(config);
      const b = referee(config);
      assert.equal(a.state.phase, 'gameOver', `${board} ${seats}`);
      assert.deepEqual(a.hashes, b.hashes, `${board} ${seats}: same seed, same game`);
    }
  }
});

test("a device replaying the server's log through reduce() matches every hash", () => {
  for (const seed of [1, 2, 3, 42, 777, 2026]) {
    const config = allComputer(2 + (seed % 3), seed % 2 ? 'classic' : 'small', seed);
    const server = referee(config);
    // the device only gets `started` (the config) and the numbered actions
    let device: GameState = createGame(JSON.parse(JSON.stringify(config)));
    server.log.forEach((action, i) => {
      device = reduce(device, JSON.parse(JSON.stringify(action)));
      assert.equal(stateHash(device), server.hashes[i], `seed ${seed}, step ${i + 1}`);
    });
    assert.deepEqual(device, server.state);
  }
});

test('sudden death runs through the driver like any board (fresh reveal, then play)', () => {
  // look for a seed whose all-computer game ties and goes to sudden death
  let found = 0;
  for (let seed = 1; seed < 400 && found < 2; seed++) {
    const { state, log } = referee(allComputer(2, 'small', seed));
    if (!state.suddenDeath) continue;
    found++;
    assert.equal(log.filter((a) => a.type === 'REVEAL_DONE').length, 2, 'two reveals: main board, mini board');
    assert.equal(state.winnerIds.length, 1);
  }
  assert.ok(found > 0, 'some seed in the range reaches sudden death');
});

test('autoStep: what the referee does next in each phase, and when', () => {
  const human: PlayerSpec = { id: 'p1', kind: 'human', avatar: 'bear' };
  const config: GameConfig = { ...allComputer(2, 'classic', 9), players: [human, aiPlayer('p2', 'fox', 'fox')] };
  const rng = { seed: 5, counter: 0 };
  let s = createGame(config);

  assert.deepEqual(autoStep(s, rng), { kind: 'REVEAL_DONE', afterMs: revealDurationMs(s), rng });
  s = reduce(s, { type: 'REVEAL_DONE' });
  assert.equal(autoStep(s, rng), null, "a person's roll is theirs to make");
  s = reduce(s, { type: 'ROLL' });
  assert.equal(autoStep(s, rng), null, "and so is their pick");

  const hidden = s.pegs.findIndex((p) => p.state === 'hidden');
  s = reduce(s, { type: 'PICK', pegIndex: hidden });
  const matched = s.lastMove!.matched;
  assert.deepEqual(autoStep(s, rng), {
    kind: 'RESULT_DONE',
    afterMs: matched ? FLOW.matchTotal : FLOW.missTotal,
    rng,
  });

  // the computer's turn: roll after a beat, pick after the tumble and a think
  const fox = reduce({ ...s, lastMove: { ...s.lastMove!, matched: false } }, { type: 'RESULT_DONE' });
  assert.equal(fox.activePlayer, 1);
  assert.deepEqual(autoStep(fox, rng), { kind: 'ROLL', afterMs: FLOW.aiRollDelay, rng });
  const rolled = reduce(fox, { type: 'ROLL' });
  const pick = autoStep(rolled, rng)!;
  assert.equal(pick.kind, 'PICK');
  const think = pick.afterMs - tumbleMs(rolled.dieRerolls ?? 0);
  assert.ok(think >= 700 && think <= 1300, `think ${think} ms`);
  assert.notDeepEqual(pick.rng, rng, 'the think time is drawn from the rng');
  assert.equal(computerPick(s, {}, rng), null, 'not a computer pick → null');

  assert.equal(autoStep({ ...s, phase: 'gameOver' }, rng), null);
});

test('stateHash: survives JSON, changes with any move', () => {
  const s = createGame(allComputer(3, 'big', 31));
  assert.equal(stateHash(JSON.parse(JSON.stringify(s))), stateHash(s));
  assert.match(stateHash(s), /^[0-9a-f]{8}$/);
  const seen = new Set([stateHash(s)]);
  let cur = reduce(s, { type: 'REVEAL_DONE' });
  for (const a of [{ type: 'ROLL' }, { type: 'PICK', pegIndex: 0 }, { type: 'RESULT_DONE' }] as GameAction[]) {
    seen.add(stateHash(cur));
    cur = reduce(cur, a);
  }
  seen.add(stateHash(cur));
  assert.equal(seen.size, 5, 'every step has its own hash');
});

test('stateHash: every field that changes play changes the hash (audit F07)', () => {
  let s = createGame(allComputer(2, 'classic', 77));
  s = reduce(s, { type: 'REVEAL_DONE' });
  s = reduce(s, { type: 'ROLL' });
  s = reduce(s, { type: 'PICK', pegIndex: s.pegs.findIndex((p) => p.state === 'hidden') });
  const base = stateHash(s);
  const lm = s.lastMove!;
  const variants: [string, GameState][] = [
    ['bonusTurnOnMatch', { ...s, config: { ...s.config, rules: { ...s.config.rules, bonusTurnOnMatch: false } } }],
    ['tieBreak', { ...s, config: { ...s.config, rules: { ...s.config.rules, tieBreak: 'shared' } } }],
    ['kidMode', { ...s, config: { ...s.config, rules: { ...s.config.rules, kidMode: true } } }],
    ['boardSize', { ...s, config: { ...s.config, boardSize: 'big' } }],
    ['seed', { ...s, config: { ...s.config, seed: s.config.seed + 1 } }],
    ['player kind', { ...s, config: { ...s.config, players: [{ ...s.config.players[0], kind: 'human' }, s.config.players[1]] } }],
    ['spec', { ...s, spec: { ...s.spec, revealMs: s.spec.revealMs + 1 } }],
    ['lastMove.matched', { ...s, lastMove: { ...lm, matched: !lm.matched } }],
    ['lastMove.pegIndex', { ...s, lastMove: { ...lm, pegIndex: lm.pegIndex + 1 } }],
    ['lastMove gone', { ...s, lastMove: null }],
    ['dieRerolls', { ...s, dieRerolls: (s.dieRerolls ?? 0) + 1 }],
    ['peg colour', { ...s, pegs: s.pegs.map((p, i) => (i === 3 ? { ...p, color: p.color === 'red' ? 'blue' : 'red' } : p)) }],
    ['capturedBy', { ...s, pegs: s.pegs.map((p, i) => (i === 3 ? { ...p, state: 'captured', capturedBy: 'p2' } : p)) }],
    ['scores', { ...s, scores: { ...s.scores, p2: (s.scores.p2 ?? 0) + 1 } }],
    ['suddenDeathScores', { ...s, suddenDeathScores: { ...s.suddenDeathScores, p1: 1 } }],
    ['activeSeats', { ...s, activeSeats: [1] }],
    ['winnerIds', { ...s, winnerIds: ['p1'] }],
    ['rng', { ...s, rng: { ...s.rng, counter: s.rng.counter + 1 } }],
    ['turn', { ...s, turn: s.turn + 1 }],
    ['activePlayer', { ...s, activePlayer: 1 - s.activePlayer }],
    ['dieColor', { ...s, dieColor: s.dieColor === 'red' ? 'blue' : 'red' }],
    ['suddenDeath', { ...s, suddenDeath: true }],
  ];
  for (const [what, v] of variants) assert.notEqual(stateHash(v), base, what);
  // the audit's example: a different bonus rule plays out differently, and now hashes differently
  const noBonus = variants[0][1];
  assert.notEqual(stateHash(reduce(noBonus, { type: 'RESULT_DONE' })), stateHash(reduce(s, { type: 'RESULT_DONE' })));
});
