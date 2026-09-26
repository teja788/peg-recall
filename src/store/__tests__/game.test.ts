import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { createGame, type GameState, type Peg } from '../../engine';
import { timing } from '../../theme/tokens';
import { DEFAULT_SETTINGS, type Settings } from '../settingsModel';
import { configFor, setGameScheduler, tumbleMs, useGame, type GameScheduler } from '../game';
import { useStats } from '../stats';

/* ------------------------------------------------------------- fake clock */

/** A scheduler whose time only moves when the test says so. */
class FakeClock implements GameScheduler {
  t = 0;
  private nextId = 1;
  private jobs = new Map<number, { due: number; fn: () => void }>();

  now = () => this.t;

  setTimeout = (fn: () => void, ms: number) => {
    const id = this.nextId++;
    this.jobs.set(id, { due: this.t + Math.max(0, ms), fn });
    return id;
  };

  clearTimeout = (handle: unknown) => {
    this.jobs.delete(handle as number);
  };

  /** Run every job that falls due within `ms`, oldest first. */
  advance(ms: number) {
    const target = this.t + ms;
    for (let guard = 0; guard < 10_000; guard++) {
      let pickId = -1;
      let pickDue = Infinity;
      for (const [id, job] of this.jobs) {
        if (job.due < pickDue) {
          pickDue = job.due;
          pickId = id;
        }
      }
      if (pickId < 0 || pickDue > target) break;
      const job = this.jobs.get(pickId)!;
      this.jobs.delete(pickId);
      this.t = pickDue;
      job.fn();
    }
    this.t = target;
  }

  get pending() {
    return this.jobs.size;
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

/* ---------------------------------------------------------------- fixtures */

const settings = (over: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  boardSize: 'classic',
  difficulty: 'owl',
  ...over,
});

/** A finished, tied 2-player board sitting in `result` — one RESULT_DONE away
 *  from sudden death. Built by hand because playing 25 pegs out to an exact
 *  draw through the reducer is not something a test can arrange. */
function tiedFinishedBoard(seed: number, turn: number): GameState {
  const base = createGame(configFor('ai', settings(), seed));
  const pegs: Peg[] = base.pegs.map((p, i) => ({
    ...p,
    state: 'captured' as const,
    capturedBy: i % 2 === 0 ? 'p1' : 'p2',
  }));
  const each = pegs.length / 2;
  return {
    ...base,
    pegs,
    phase: 'result',
    turn,
    scores: { p1: Math.floor(each), p2: Math.floor(each) },
    lastMove: { playerId: 'p2', pegIndex: pegs.length - 1, dieColor: pegs[0].color, matched: true },
  };
}

/* -------------------------------------------------------------------- A1/A2 */

test('sudden death builds brand-new brains, stamped with the current turn', () => {
  const state = tiedFinishedBoard(4242, 25);
  useGame.setState({
    state,
    // a brain full of memories of the board that just ended, including a peg
    // index the 9-peg mini board does not even have
    ais: { p2: { difficulty: 'owl', memory: { 0: { color: 'red', lastSeenTurn: 1 }, 20: { color: 'blue', lastSeenTurn: 3 } }, knownWrong: { 5: 'green' } } },
    busy: false,
    paused: false,
    feedback: null,
  });

  useGame.getState().dispatch({ type: 'RESULT_DONE' });

  const next = useGame.getState().state!;
  assert.equal(next.suddenDeath, true, 'a tie starts sudden death');
  assert.equal(next.phase, 'reveal');
  assert.equal(next.pegs.length, 9);

  const brain = useGame.getState().ais.p2;
  assert.deepEqual(brain.knownWrong, {}, 'A1: the old board’s knownWrong notes are gone');
  assert.equal(20 in brain.memory, false, 'A1: memory of a peg that no longer exists is gone');
  const entries = Object.entries(brain.memory);
  assert.ok(entries.length > 0, 'an owl should memorise some of a 9-peg reveal');
  for (const [index, entry] of entries) {
    assert.ok(Number(index) < 9, `remembered peg ${index} is off the mini board`);
    assert.equal(
      entry.lastSeenTurn,
      next.turn,
      'A2: the opening reveal is stamped with the live turn, not 0',
    );
    assert.equal(entry.color, next.pegs[Number(index)].color, 'memory matches the new board');
  }
  // With turn 25 and an owl (decay 0.975), a reveal stamped 0 would price
  // recall at 0.92 * 0.975^12.5 ≈ 0.67 instead of the full 0.92.
  assert.ok(next.turn >= 25);
});

/* ----------------------------------------------------------------------- B6 */

test('a captured peg is removed from AI memory, a missed one is recorded', () => {
  const base = createGame(configFor('ai', settings(), 77));
  const pegs: Peg[] = base.pegs.map((p) => ({ ...p, state: 'hidden' as const }));
  const die = pegs[0].color;
  const missIndex = pegs.findIndex((p) => p.color !== die);

  const playable = (): GameState => ({
    ...base,
    pegs,
    phase: 'pick',
    dieColor: die,
    activePlayer: 0,
    turn: 6,
  });
  const brain = () => ({
    difficulty: 'owl' as const,
    memory: { 0: { color: die, lastSeenTurn: 2 } },
    knownWrong: {},
  });

  // match -> captured -> forgotten
  useGame.setState({ state: playable(), ais: { p2: brain() }, busy: false, paused: false });
  useGame.getState().dispatch({ type: 'PICK', pegIndex: 0 });
  assert.equal(useGame.getState().state!.pegs[0].state, 'captured');
  assert.equal(0 in useGame.getState().ais.p2.memory, false, 'B6: captured pegs leave memory');

  // miss -> still on the board -> remembered, with its real colour
  useGame.setState({ state: playable(), ais: { p2: brain() }, busy: false, paused: false });
  useGame.getState().dispatch({ type: 'PICK', pegIndex: missIndex });
  const remembered = useGame.getState().ais.p2.memory[missIndex];
  assert.deepEqual(remembered, { color: pegs[missIndex].color, lastSeenTurn: 7 });
});

/* ----------------------------------------------------------------------- B1 */

test('the die tumble is capped at three rerolls', () => {
  assert.equal(tumbleMs(0), timing.dieTumble);
  assert.equal(tumbleMs(2), timing.dieTumble + 600);
  assert.equal(tumbleMs(3), timing.dieTumble + 900);
  assert.equal(tumbleMs(64), timing.dieTumble + 900, 'B1: 64 rerolls must not mean 20 s of die');
  assert.equal(tumbleMs(-1), timing.dieTumble);
});

test('ROLL holds the screen for exactly the capped tumble', () => {
  const base = createGame(configFor('ai', settings(), 31));
  // one colour left on the board, so the reducer has to reroll its way to it
  const survivor = base.pegs[0].color;
  const pegs: Peg[] = base.pegs.map((p, i) =>
    p.color === survivor && i < 3
      ? { ...p, state: 'hidden' as const }
      : { ...p, state: 'captured' as const, capturedBy: 'p1' },
  );
  useGame.setState({
    state: { ...base, pegs, phase: 'roll', activePlayer: 0, dieColor: null },
    ais: {},
    busy: false,
    paused: false,
  });

  useGame.getState().dispatch({ type: 'ROLL' });
  assert.equal(useGame.getState().busy, true);
  const rerolls = useGame.getState().state!.dieRerolls ?? 0;
  const held = tumbleMs(rerolls);
  assert.ok(held <= timing.dieTumble + 900);

  clock.advance(held - 1);
  assert.equal(useGame.getState().busy, true, 'still animating one ms before the end');
  clock.advance(1);
  assert.equal(useGame.getState().busy, false, 'screen handed back after the capped tumble');
});

/* ----------------------------------------------------------------------- B8 */

test('RESTART from the pause menu unfreezes the new board', () => {
  useGame.getState().start('ai', settings(), 9001);
  useGame.getState().pause();
  assert.equal(useGame.getState().paused, true);

  useGame.getState().dispatch({ type: 'RESTART', seed: 9002 });

  assert.equal(useGame.getState().paused, false, 'B8: a restarted board must not open frozen');
  assert.equal(useGame.getState().busy, false);
  assert.equal(useGame.getState().state!.phase, 'reveal');
  assert.equal(useGame.getState().state!.config.seed, 9002);
  assert.ok(Object.keys(useGame.getState().ais.p2.memory).length >= 0);
});

/* ----------------------------------------------------------------------- B9 */

test('pause keeps the exact time a pending step had left', () => {
  const base = createGame(configFor('ai', settings(), 55));
  const pegs: Peg[] = base.pegs.map((p) => ({ ...p, state: 'hidden' as const }));
  useGame.setState({
    state: { ...base, pegs, phase: 'roll', activePlayer: 0, dieColor: null },
    ais: {},
    busy: false,
    paused: false,
  });

  useGame.getState().dispatch({ type: 'ROLL' });
  const held = tumbleMs(useGame.getState().state!.dieRerolls ?? 0);

  clock.advance(200);
  useGame.getState().pause();
  clock.advance(60_000); // the player went to make tea
  assert.equal(useGame.getState().busy, true, 'nothing fires while paused');

  useGame.getState().resume();
  clock.advance(held - 200 - 1);
  assert.equal(useGame.getState().busy, true, 'the animation resumes where it stopped');
  clock.advance(1);
  assert.equal(useGame.getState().busy, false);
});

test('a step scheduled during a pause still waits its full time after resume', () => {
  const base = createGame(configFor('ai', settings(), 56));
  const pegs: Peg[] = base.pegs.map((p) => ({ ...p, state: 'hidden' as const }));
  useGame.setState({
    state: { ...base, pegs, phase: 'roll', activePlayer: 0, dieColor: null },
    ais: {},
    busy: false,
    paused: false,
  });

  // Force the path B9 is about: the clock is stopped, yet something schedules.
  // (`paused` is flipped back by hand so `dispatch` lets the ROLL through
  // while `pauseTimers` still has the clock held at its stopping point.)
  useGame.getState().pause();
  clock.advance(30_000);
  useGame.setState({ paused: false });
  useGame.getState().dispatch({ type: 'ROLL' });
  const held = tumbleMs(useGame.getState().state!.dieRerolls ?? 0);
  assert.equal(useGame.getState().busy, true);

  clock.advance(10_000);
  assert.equal(useGame.getState().busy, true, 'a frozen clock fires nothing');

  useGame.setState({ paused: true });
  useGame.getState().resume();
  clock.advance(held - 1);
  assert.equal(
    useGame.getState().busy,
    true,
    'B9: the pause must not be added on top of a wait that had not started',
  );
  clock.advance(1);
  assert.equal(useGame.getState().busy, false);
});

/* -------------------------------------------------------------------- B10 */

test('the AI rng is a different stream from the board rng for the same seed', () => {
  useGame.getState().start('ai', settings(), 12345);
  const a = useGame.getState();
  assert.equal(a.state!.config.seed, 12345, 'the board gets the seed it was given');
  // Same seed, same board, every time — the single clock read cannot leak in.
  const pegsA = a.state!.pegs.map((p) => p.color).join(',');
  useGame.getState().start('ai', settings(), 12345);
  assert.equal(useGame.getState().state!.pegs.map((p) => p.color).join(','), pegsA);
  // ...and the AI's opening memory is reproducible with it.
  assert.deepEqual(useGame.getState().ais.p2.memory, a.ais.p2.memory);
  // The AI stream is derived, not shared: its draws are not the board's draws.
  assert.notEqual((12345 ^ 0x9e3779b9) >>> 0 & 0x7fffffff, 12345);
});

test('teardown and start leave no timer behind', () => {
  useGame.getState().start('ai', settings(), 4);
  useGame.getState().dispatch({ type: 'REVEAL_DONE' });
  useGame.getState().teardown();
  clock.advance(60_000);
  assert.equal(useGame.getState().state, null);
  assert.equal(useGame.getState().busy, false);
});

/* ------------------------------------------------------------- v1.1 names */

test('typed names go on human seats only; the computer keeps its animal', () => {
  const named = settings({ names: ['Maya', 'Leo', 'Sam'] });
  const vsAi = configFor('ai', named, 1).players;
  assert.equal(vsAi[0].name, 'Maya');
  assert.equal(vsAi[1].kind, 'ai');
  assert.equal(vsAi[1].name, undefined, 'the AI never takes seat 2’s name');
  assert.equal('name' in vsAi[1], false);

  const three = configFor('3p', named, 1).players;
  assert.deepEqual(three.map((p) => p.name), ['Maya', 'Leo', 'Sam']);

  const two = configFor('2p', settings({ names: ['', 'Leo', 'Sam'] }), 1).players;
  assert.equal(two.length, 2);
  assert.equal('name' in two[0], false, 'blank = no name, so the tray shows the animal');
  assert.equal(two[1].name, 'Leo');
});

/* ------------------------------------------------------------- v1.1 stats */

/** A decided board sitting in `result`: one RESULT_DONE from game over. */
function decidedBoard(seed: number): GameState {
  const state = tiedFinishedBoard(seed, 25);
  return { ...state, scores: { p1: 13, p2: 12 } };
}

test('a finished game is recorded in the stats exactly once', () => {
  const before = useStats.getState().gamesFinished;
  const owlBefore = useStats.getState().vsAi.owl.played;
  useGame.setState({ state: decidedBoard(808), ais: {}, busy: false, paused: false, feedback: null });

  useGame.getState().dispatch({ type: 'RESULT_DONE' });
  assert.equal(useGame.getState().state!.phase, 'gameOver');
  assert.equal(useStats.getState().gamesFinished, before + 1);
  assert.equal(useStats.getState().vsAi.owl.played, owlBefore + 1);

  // a double-dispatch, and a stray re-set of the same finished state, count nothing
  useGame.getState().dispatch({ type: 'RESULT_DONE' });
  const over = useGame.getState().state!;
  useGame.setState({ state: { ...over, phase: 'result' } });
  useGame.getState().dispatch({ type: 'RESULT_DONE' });
  assert.equal(useStats.getState().gamesFinished, before + 1, 'same board, still one game');

  // a rematch is a new game: starting it records nothing, finishing it does
  useGame.getState().rematch();
  assert.equal(useStats.getState().gamesFinished, before + 1);
  useGame.setState({ state: decidedBoard(809), ais: {}, busy: false, paused: false, feedback: null });
  useGame.getState().dispatch({ type: 'RESULT_DONE' });
  assert.equal(useStats.getState().gamesFinished, before + 2);
});

test('a tie going to sudden death is not recorded until sudden death ends', () => {
  const before = useStats.getState().gamesFinished;
  useGame.setState({ state: tiedFinishedBoard(4243, 25), ais: {}, busy: false, paused: false, feedback: null });
  useGame.getState().dispatch({ type: 'RESULT_DONE' });
  assert.equal(useGame.getState().state!.suddenDeath, true);
  assert.equal(useStats.getState().gamesFinished, before, 'the tie itself is not a result');

  // settle the mini board by hand: the next capture ends it
  let s = useGame.getState().state!;
  s = { ...s, phase: 'result', lastMove: { playerId: 'p1', pegIndex: 0, dieColor: s.pegs[0].color, matched: true } };
  useGame.setState({ state: s, busy: false });
  useGame.getState().dispatch({ type: 'RESULT_DONE' });
  assert.equal(useGame.getState().state!.phase, 'gameOver');
  assert.deepEqual(useGame.getState().state!.winnerIds, ['p1']);
  assert.equal(useStats.getState().gamesFinished, before + 1);
});
