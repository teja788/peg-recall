import { create } from 'zustand';

import {
  activePlayerSpec,
  aiThinkMs,
  chooseMove,
  createAi,
  createGame,
  isHumanTurn,
  observe,
  observeInitialReveal,
  reduce,
} from '../engine';
import type {
  AiState,
  AvatarId,
  Difficulty,
  GameAction,
  GameConfig,
  GameState,
  PlayerSpec,
  RngState,
} from '../engine/types';
import { timing } from '../theme/tokens';
import { AVATAR_CYCLE, type GameMode, type Settings } from './settingsModel';

/* ---------------------------------------------------------------- timers */

/**
 * The clock the store schedules against. Real timers in the app; a fake one in
 * the tests, which is the only reason this is injectable.
 */
export interface GameScheduler {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

const REAL_SCHEDULER: GameScheduler = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

let clock: GameScheduler = REAL_SCHEDULER;

/** Test seam. Pass null to go back to real timers. */
export function setGameScheduler(s: GameScheduler | null) {
  clock = s ?? REAL_SCHEDULER;
}

let generation = 0;

/** A scheduled step of the game, kept so the pause menu can freeze it mid-flight. */
interface Pending {
  fn: () => void;
  /** which game this belongs to — a stale one never runs */
  gen: number;
  /** wall-clock time it should fire at; shifted forward by however long we paused */
  due: number;
  handle: unknown;
}

let timers = new Map<number, Pending>();
let nextTimerId = 1;
/** non-null while the game is paused: when we stopped the clock */
let pausedAt: number | null = null;

function clearTimers() {
  timers.forEach((p) => {
    if (p.handle != null) clock.clearTimeout(p.handle);
  });
  timers = new Map();
  pausedAt = null;
}

function arm(id: number, p: Pending, ms: number) {
  p.handle = clock.setTimeout(() => {
    timers.delete(id);
    if (p.gen === generation) p.fn();
  }, Math.max(0, ms));
}

/** setTimeout that is cancelled by teardown/restart, frozen by pause, and
 *  ignores stale runs. */
function later(fn: () => void, ms: number) {
  const id = nextTimerId++;
  // While paused the clock is stopped at `pausedAt`, and resumeTimers pushes
  // every due date forward by however long the pause lasted. Stamping this one
  // from the live clock instead would have that shift added on top of the wait
  // it has not even started yet.
  const from = pausedAt ?? clock.now();
  const p: Pending = { fn, gen: generation, due: from + ms, handle: null };
  timers.set(id, p);
  if (pausedAt == null) arm(id, p, ms);
}

/** Stop the clock. Every pending step keeps the time it had left. */
function pauseTimers() {
  if (pausedAt != null) return;
  pausedAt = clock.now();
  timers.forEach((p) => {
    if (p.handle != null) clock.clearTimeout(p.handle);
    p.handle = null;
  });
}

/** Start it again, each step picking up exactly where it was interrupted. */
function resumeTimers() {
  if (pausedAt == null) return;
  const now = clock.now();
  const slept = now - pausedAt;
  pausedAt = null;
  timers.forEach((p, id) => {
    p.due += slept;
    arm(id, p, p.due - now);
  });
}

/* ------------------------------------------------------------ player setup */

function seatsFor(mode: GameMode, s: Settings): PlayerSpec[] {
  const avatars = s.avatars;
  if (mode === 'ai') {
    // the computer wears the face of its difficulty: Bunny, Fox or Owl
    const aiAvatar: AvatarId = s.difficulty;
    let human = avatars[0];
    if (human === aiAvatar) {
      // prefer an animal that is not also a difficulty name, so the two trays
      // never read as "Fox vs Fox" or "Owl (you) vs Fox"
      human = (['bear', 'frog', 'cat'] as AvatarId[]).find((a) => a !== aiAvatar) ?? 'bear';
    }
    return [
      { id: 'p1', kind: 'human', avatar: human },
      { id: 'p2', kind: 'ai', avatar: aiAvatar, difficulty: s.difficulty as Difficulty },
    ];
  }
  const count = mode === '3p' ? 3 : 2;
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    kind: 'human' as const,
    avatar: avatars[i] ?? AVATAR_CYCLE[i],
  }));
}

export function configFor(mode: GameMode, s: Settings, seed = Date.now()): GameConfig {
  return {
    boardSize: s.boardSize,
    players: seatsFor(mode, s),
    rules: {
      bonusTurnOnMatch: s.bonusTurnOnMatch,
      tieBreak: s.kidMode ? 'shared' : 'suddenDeath',
      kidMode: s.kidMode,
    },
    seed,
  };
}

/**
 * The AI's rng is a separate stream from the board's, so that a game replayed
 * from an explicit seed does not have the opponent's dice riding on the very
 * numbers that laid the board out. Mixed, not equal.
 */
function aiSeedFor(gameSeed: number): number {
  return (((gameSeed ^ 0x9e3779b9) >>> 0) & 0x7fffffff) || 1;
}

/** How long the die is allowed to tumble, dead-colour rerolls included. */
export function tumbleMs(rerolls: number): number {
  // The roll rerolls internally until it finds a live colour — up to 64 times
  // near the end of a board. Showing all of them would freeze the screen for
  // twenty seconds, so the animation only ever acts out the first three.
  return timing.dieTumble + 300 * Math.min(Math.max(0, rerolls), 3);
}

/* ------------------------------------------------------------------ store */

export type MoveFeedback = { kind: 'match' | 'miss'; pegIndex: number; nonce: number } | null;

interface GameStore {
  state: GameState | null;
  ais: Record<string, AiState>;
  /** true while a UI animation owns the screen: die tumble, match/miss result. */
  busy: boolean;
  /** last resolved move, for sound/haptics/animation triggers */
  feedback: MoveFeedback;
  /** the pause menu is up: no AI timers fire and no move is accepted */
  paused: boolean;

  start: (mode: GameMode, settings: Settings, seed?: number) => void;
  dispatch: (action: GameAction) => void;
  rematch: () => void;
  pause: () => void;
  resume: () => void;
  teardown: () => void;
}

let rng: RngState = { seed: aiSeedFor(Date.now()), counter: 0 };
let nonce = 0;

export const useGame = create<GameStore>((setState, getState) => {
  /** Decide what the machine should do next, once nothing is animating. */
  function schedule() {
    const { state, busy, paused } = getState();
    if (!state || busy || paused) return;
    if (state.phase === 'roll' && !isHumanTurn(state)) {
      later(() => getState().dispatch({ type: 'ROLL' }), timing.aiRollDelay);
      return;
    }
    if (state.phase === 'pick' && !isHumanTurn(state)) {
      const [think, afterThink] = aiThinkMs(rng);
      rng = afterThink;
      later(() => {
        const cur = getState().state;
        if (!cur || cur.phase !== 'pick' || isHumanTurn(cur)) return;
        const spec = activePlayerSpec(cur);
        const ai = getState().ais[spec.id];
        if (!ai) return;
        const res = chooseMove(ai, cur, rng);
        rng = res.rng;
        if (res.pegIndex < 0) return;
        setState({ ais: { ...getState().ais, [spec.id]: res.ai } });
        getState().dispatch({ type: 'PICK', pegIndex: res.pegIndex });
      }, think);
    }
  }

  /** Hold the screen for an animation, then let the machine move on. */
  function busyFor(ms: number, then?: () => void) {
    setState({ busy: true });
    later(() => {
      setState({ busy: false });
      // `then` always ends in a dispatch, which schedules for us — calling
      // schedule() as well would arm a second, redundant AI timer
      if (then) then();
      else schedule();
    }, ms);
  }

  /** Every AI sees the peg that was just turned face up — everyone was looking. */
  function observeReveal(state: GameState, pegIndex: number, captured: boolean) {
    const ais = getState().ais;
    if (Object.keys(ais).length === 0) return;
    const peg = state.pegs[pegIndex];
    if (!peg) return;
    const next: Record<string, AiState> = {};
    for (const [id, ai] of Object.entries(ais)) {
      // A captured peg leaves the board: the AI must DROP it, not file it away
      // as somewhere worth tapping again.
      next[id] = observe(ai, { turn: state.turn, pegIndex, color: peg.color, captured });
    }
    setState({ ais: next });
  }

  /**
   * Fresh brains for a board, each memorising the opening reveal at its own
   * difficulty's rate. Every new board gets new brains — memory is indexed by
   * peg index, so a sudden-death mini board would otherwise be played with
   * confident, entirely wrong memories of the board it replaced.
   */
  function freshBrains(state: GameState): Record<string, AiState> {
    const ais: Record<string, AiState> = {};
    for (const p of state.config.players) {
      if (p.kind !== 'ai') continue;
      // `state.turn` keeps counting across a sudden-death board, so the reveal
      // must be stamped with it — stamping turn 0 would leave the AI's fresh
      // memories looking decades old and every tier near-blind.
      const res = observeInitialReveal(createAi(p.difficulty ?? 'fox'), state.pegs, rng, state.turn);
      rng = res.rng;
      ais[p.id] = res.ai;
    }
    return ais;
  }

  return {
    state: null,
    ais: {},
    busy: false,
    feedback: null,
    paused: false,

    start: (mode, settings, seed) => {
      generation += 1;
      clearTimers();
      // one reading of the clock: two would seed the board and the AI from
      // different milliseconds and make a "same seed" replay impossible
      const gameSeed = seed ?? clock.now();
      rng = { seed: aiSeedFor(gameSeed), counter: 0 };
      const state = createGame(configFor(mode, settings, gameSeed));
      setState({ state, ais: freshBrains(state), busy: false, feedback: null, paused: false });
    },

    dispatch: (action) => {
      const { state: prev, paused } = getState();
      if (!prev) return;
      // While the pause menu is up the board is frozen: no rolls, no picks, and
      // no countdown/animation callbacks land either. RESTART is the one action
      // that gets through, because that is how the menu starts a fresh game.
      if (paused && action.type !== 'RESTART') return;
      const next = reduce(prev, action);
      if (next === prev) return;
      setState({ state: next });

      if (action.type === 'RESTART') {
        generation += 1;
        clearTimers();
        // RESTART is reachable from the pause menu, so it has to lift the pause
        // as well — otherwise the new board opens frozen.
        setState({ ais: freshBrains(next), busy: false, feedback: null, paused: false });
        return;
      }

      if (action.type === 'ROLL') {
        busyFor(tumbleMs(next.dieRerolls ?? 0));
        return;
      }

      // a sudden-death mini-board is a new board: new pegs, new brains
      if (next.phase === 'reveal' && prev.phase !== 'reveal') {
        setState({ ais: freshBrains(next) });
      }

      if (action.type === 'PICK' && next.lastMove) {
        const move = next.lastMove;
        observeReveal(next, move.pegIndex, move.matched);
        nonce += 1;
        setState({ feedback: { kind: move.matched ? 'match' : 'miss', pegIndex: move.pegIndex, nonce } });
        busyFor(move.matched ? timing.matchTotal : timing.missTotal, () => {
          setState({ feedback: null });
          getState().dispatch({ type: 'RESULT_DONE' });
        });
        return;
      }

      schedule();
    },

    rematch: () => {
      generation += 1;
      clearTimers();
      setState({ busy: false, feedback: null, paused: false });
      getState().dispatch({ type: 'RESTART', seed: clock.now() });
    },

    pause: () => {
      const { state, paused } = getState();
      if (!state || paused) return;
      pauseTimers();
      setState({ paused: true });
    },

    resume: () => {
      if (!getState().paused) return;
      setState({ paused: false });
      // every pending step was kept, so the AI turn / match animation carries on
      // from where it was — re-scheduling here would arm a second, duplicate one
      resumeTimers();
    },

    teardown: () => {
      generation += 1;
      clearTimers();
      setState({ state: null, ais: {}, busy: false, feedback: null, paused: false });
    },
  };
});
