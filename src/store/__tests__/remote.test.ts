/**
 * The game store's online mode: the server's numbered actions are played in
 * order, each waiting for the animation in front of it; a backlog is caught
 * up at once; a gap or a wrong hash asks for a snapshot; taps become intents
 * only on this device's turn.
 */
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_RULES,
  aiSeedFor,
  autoStep,
  computerPick,
  createGame,
  freshBrains,
  observePick,
  reduce,
  tumbleMs,
  type GameAction,
  type GameConfig,
  type GameState,
} from '../../engine';
import { stateHash } from '../../online/hash';
import type { Intent } from '../../online/protocol';
import { setGameScheduler, useGame, type GameScheduler, type RemoteSeat } from '../game';
import { useStats } from '../stats';

class FakeClock implements GameScheduler {
  t = 0;
  private id = 1;
  private jobs = new Map<number, { due: number; fn: () => void }>();
  now = () => this.t;
  setTimeout = (fn: () => void, ms: number) => {
    const id = this.id++;
    this.jobs.set(id, { due: this.t + Math.max(0, ms), fn });
    return id;
  };
  clearTimeout = (h: unknown) => void this.jobs.delete(h as number);
  advance(ms: number) {
    const end = this.t + ms;
    for (;;) {
      const next = [...this.jobs.entries()].sort((a, b) => a[1].due - b[1].due)[0];
      if (!next || next[1].due > end) break;
      this.jobs.delete(next[0]);
      this.t = next[1].due;
      next[1].fn();
    }
    this.t = end;
  }
}

let clock: FakeClock;
beforeEach(() => {
  clock = new FakeClock();
  setGameScheduler(clock);
  useGame.getState().teardown();
});
after(() => {
  useGame.getState().teardown();
  setGameScheduler(null);
});

const config = (kinds: ('human' | 'ai')[], seed = 11): GameConfig => ({
  boardSize: 'small',
  players: kinds.map((kind, i) => ({
    id: `p${i + 1}`,
    kind,
    avatar: (['fox', 'owl', 'bear', 'frog'] as const)[i],
    ...(kind === 'ai' ? { difficulty: 'fox' as const } : {}),
  })),
  rules: DEFAULT_RULES,
  seed,
});

/** What a server sends for a game: the numbered log with hashes. People's
 *  turns are played by stand-ins, as if everyone had gone away. */
function serverLog(cfg: GameConfig) {
  const people = cfg.players.filter((p) => p.kind === 'human').map((p) => p.id);
  let state = createGame(cfg);
  let rng = { seed: aiSeedFor(cfg.seed), counter: 0 };
  let b = freshBrains(state, rng, people);
  let ais = b.ais;
  rng = b.rng;
  const log: { seq: number; action: GameAction; hash: string }[] = [];
  while (state.phase !== 'gameOver') {
    const step = autoStep(state, rng) ?? { kind: state.phase === 'roll' ? 'ROLL' : 'PICK', rng };
    rng = step.rng;
    let action: GameAction = { type: step.kind } as GameAction;
    if (step.kind === 'PICK') {
      const res = computerPick(state, ais, rng)!;
      rng = res.rng;
      ais = res.ais;
      action = { type: 'PICK', pegIndex: res.pegIndex };
    }
    const next = reduce(state, action);
    if (action.type === 'PICK') ais = observePick(ais, next);
    if (next.phase === 'reveal' && state.phase !== 'reveal') {
      b = freshBrains(next, rng, people);
      ais = b.ais;
      rng = b.rng;
    }
    state = next;
    log.push({ seq: log.length + 1, action, hash: stateHash(state) });
  }
  return { log, final: state };
}

function seat(id = 'p1') {
  const sent: Intent[] = [];
  let resyncs = 0;
  const link: RemoteSeat = { seat: id, send: (i) => sent.push(i), resync: () => resyncs++ };
  return { link, sent, resyncs: () => resyncs };
}

test("follows the server's actions to the end, each after the animation in front of it", () => {
  const cfg = config(['ai', 'ai']);
  const { log, final } = serverLog(cfg);
  const { link, resyncs } = seat();
  useGame.getState().remoteStart(cfg, link);
  const firstRoll = log.findIndex((m) => m.action.type === 'ROLL');
  for (const m of log.slice(0, firstRoll + 2)) useGame.getState().remoteAction(m.seq, m.action, m.hash);
  // the roll is on screen; the pick behind it waits for the die to land
  assert.equal(useGame.getState().seq, firstRoll + 1);
  assert.equal(useGame.getState().busy, true);
  clock.advance(tumbleMs(useGame.getState().state!.dieRerolls ?? 0));
  assert.equal(useGame.getState().seq, firstRoll + 2, 'the pick lands once the tumble is over');
  assert.ok(useGame.getState().feedback, 'and plays its match/miss feedback');
  // the rest, as it would arrive, with time to animate
  for (const m of log.slice(firstRoll + 2)) {
    useGame.getState().remoteAction(m.seq, m.action, m.hash);
    clock.advance(2000);
  }
  clock.advance(5000);
  assert.deepEqual(useGame.getState().state, final);
  assert.equal(useGame.getState().seq, log.length);
  assert.equal(resyncs(), 0);
});

test('a backlog (back from the background) is caught up without animations', () => {
  const cfg = config(['ai', 'ai'], 5);
  const { log } = serverLog(cfg);
  const { link } = seat();
  useGame.getState().remoteStart(cfg, link);
  for (const m of log.slice(0, 30)) useGame.getState().remoteAction(m.seq, m.action, m.hash);
  // only the last couple may still be waiting on an animation
  assert.ok(useGame.getState().seq >= 28, `at ${useGame.getState().seq} of 30 without any time passing`);
  clock.advance(5000);
  assert.equal(useGame.getState().seq, 30);
});

test('a missing number, or a board that does not hash the same, asks for a snapshot', () => {
  const cfg = config(['ai', 'ai'], 9);
  const { log } = serverLog(cfg);
  const a = seat();
  useGame.getState().remoteStart(cfg, a.link);
  useGame.getState().remoteAction(2, log[1].action, log[1].hash);
  assert.equal(a.resyncs(), 1, 'seq 1 never came');
  assert.equal(useGame.getState().seq, 0);
  useGame.getState().remoteAction(1, log[0].action, 'deadbeef');
  assert.equal(a.resyncs(), 2, 'the hash says this board drifted');
  // the snapshot puts it right, and play goes on from there
  const state: GameState = reduce(createGame(cfg), log[0].action);
  useGame.getState().remoteSnapshot(state, 1, a.link);
  useGame.getState().remoteAction(2, log[1].action, log[1].hash);
  assert.equal(useGame.getState().seq, 2);
  useGame.getState().remoteAction(2, log[1].action, log[1].hash);
  assert.equal(useGame.getState().seq, 2, 'a repeat is ignored');
});

test('taps become intents: only on my turn, only once, never the clock steps', () => {
  const cfg = config(['human', 'human']);
  const me = seat('p1');
  useGame.getState().remoteStart(cfg, me.link);
  const g = () => useGame.getState();
  g().dispatch({ type: 'REVEAL_DONE' }); // the countdown ending on this screen
  assert.equal(g().state!.phase, 'reveal', 'the server ends the reveal, not this screen');
  const reveal = reduce(g().state!, { type: 'REVEAL_DONE' });
  g().remoteAction(1, { type: 'REVEAL_DONE' }, stateHash(reveal));
  g().dispatch({ type: 'ROLL' });
  g().dispatch({ type: 'ROLL' });
  assert.deepEqual(me.sent, [{ type: 'ROLL' }], 'one roll sent, the double tap not');
  assert.equal(g().waiting, true);
  assert.equal(g().state!.phase, 'roll', 'nothing happens here until the server answers');
  const rolled = reduce(reveal, { type: 'ROLL' });
  g().remoteAction(2, { type: 'ROLL' }, stateHash(rolled));
  assert.equal(g().waiting, false);
  clock.advance(3000);
  const hidden = rolled.pegs.findIndex((p) => p.state === 'hidden');
  g().dispatch({ type: 'PICK', pegIndex: hidden });
  assert.deepEqual(me.sent.at(-1), { type: 'PICK', pegIndex: hidden });

  const other = seat('p2');
  useGame.getState().remoteSnapshot(reveal, 1, other.link);
  g().dispatch({ type: 'ROLL' });
  assert.deepEqual(other.sent, [], "not p2's turn");
});

test('online, nobody can pause the table or deal a rematch locally', () => {
  const cfg = config(['human', 'ai']);
  useGame.getState().remoteStart(cfg, seat().link);
  useGame.getState().pause();
  assert.equal(useGame.getState().paused, false);
  const before = useGame.getState().state;
  useGame.getState().rematch();
  assert.equal(useGame.getState().state, before);
  clock.advance(60_000);
  assert.equal(useGame.getState().state, before, 'no local computer turns or timers');
  useGame.getState().teardown();
  assert.equal(useGame.getState().remote, null);
});

test('a finished game counts once, as actions or as a finished snapshot after a reconnect (audit F08)', () => {
  const games = () => useStats.getState().gamesFinished;
  // each message arrives as a new object, as off the network
  const wire = (s: GameState): GameState => JSON.parse(JSON.stringify(s));
  // finished while this device was away: it only ever sees the final board
  const away = serverLog(config(['human', 'ai'], 31));
  const before = games();
  useGame.getState().remoteSnapshot(wire(away.final), away.log.length, seat().link);
  assert.equal(games(), before + 1);
  useGame.getState().remoteSnapshot(wire(away.final), away.log.length, seat().link);
  assert.equal(games(), before + 1, 'the same game again (another resync) is not a new one');

  // played to the end here, then a resync sends the finished board too
  const cfg = config(['human', 'ai'], 32);
  const here = serverLog(cfg);
  const { link } = seat();
  useGame.getState().remoteStart(cfg, link);
  for (const m of here.log) useGame.getState().remoteAction(m.seq, m.action, m.hash);
  clock.advance(10_000);
  assert.equal(useGame.getState().state!.phase, 'gameOver');
  assert.equal(games(), before + 2);
  useGame.getState().remoteSnapshot(wire(here.final), here.log.length, link);
  assert.equal(games(), before + 2);
});
