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
} from '../ui/engine';
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
import { AVATAR_CYCLE, type GameMode, type Settings } from './settings';

/* ---------------------------------------------------------------- timers */

let generation = 0;
let timers = new Set<ReturnType<typeof setTimeout>>();

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = new Set();
}

/** setTimeout that is cancelled by teardown/restart and ignores stale runs. */
function later(fn: () => void, ms: number) {
  const g = generation;
  const t = setTimeout(() => {
    timers.delete(t);
    if (g === generation) fn();
  }, ms);
  timers.add(t);
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
      deadColor: 'reroll',
      tieBreak: s.kidMode ? 'shared' : 'suddenDeath',
      kidMode: s.kidMode,
    },
    seed,
  };
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
  mode: GameMode;

  start: (mode: GameMode, settings: Settings, seed?: number) => void;
  dispatch: (action: GameAction) => void;
  rematch: () => void;
  teardown: () => void;
}

let rng: RngState = { seed: (Date.now() & 0x7fffffff) || 1, counter: 0 };
let nonce = 0;

export const useGame = create<GameStore>((setState, getState) => {
  /** Decide what the machine should do next, once nothing is animating. */
  function schedule() {
    const { state, busy } = getState();
    if (!state || busy) return;
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
  function observeReveal(state: GameState, pegIndex: number, ais: Record<string, AiState>) {
    if (Object.keys(ais).length === 0) return;
    const peg = state.pegs[pegIndex];
    if (!peg) return;
    const next: Record<string, AiState> = {};
    for (const [id, ai] of Object.entries(ais)) {
      next[id] = observe(ai, { turn: state.turn, pegIndex, color: peg.color });
    }
    setState({ ais: next });
  }

  /** The opening reveal: each AI memorises pegs at its own difficulty's rate. */
  function observeOpening(state: GameState, ais: Record<string, AiState>) {
    if (Object.keys(ais).length === 0) return ais;
    const next: Record<string, AiState> = {};
    for (const [id, ai] of Object.entries(ais)) {
      const res = observeInitialReveal(ai, state.pegs, rng, 0);
      rng = res.rng;
      next[id] = res.ai;
    }
    return next;
  }

  return {
    state: null,
    ais: {},
    busy: false,
    feedback: null,
    mode: 'ai',

    start: (mode, settings, seed) => {
      generation += 1;
      clearTimers();
      rng = { seed: ((seed ?? Date.now()) & 0x7fffffff) || 1, counter: 0 };
      const state = createGame(configFor(mode, settings, seed ?? Date.now()));
      let ais: Record<string, AiState> = {};
      for (const p of state.config.players) {
        if (p.kind === 'ai') ais[p.id] = createAi(p.difficulty ?? 'fox');
      }
      // the opening reveal: every AI gets its look at the whole board
      ais = observeOpening(state, ais);
      setState({ state, ais, busy: false, feedback: null, mode });
    },

    dispatch: (action) => {
      const prev = getState().state;
      if (!prev) return;
      const next = reduce(prev, action);
      if (next === prev) return;
      setState({ state: next });

      if (action.type === 'RESTART') {
        generation += 1;
        clearTimers();
        let ais: Record<string, AiState> = {};
        for (const p of next.config.players) {
          if (p.kind === 'ai') ais[p.id] = createAi(p.difficulty ?? 'fox');
        }
        ais = observeOpening(next, ais);
        setState({ ais, busy: false, feedback: null });
        return;
      }

      if (action.type === 'ROLL') {
        // 600 ms of die tumble before anyone may touch a peg
        busyFor(timing.dieTumble);
        return;
      }

      // a sudden-death mini-board opens with its own reveal
      if (next.phase === 'reveal' && prev.phase !== 'reveal') {
        setState({ ais: observeOpening(next, getState().ais) });
      }

      if (action.type === 'PICK' && next.lastMove) {
        const move = next.lastMove;
        observeReveal(next, move.pegIndex, getState().ais);
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
      setState({ busy: false, feedback: null });
      getState().dispatch({ type: 'RESTART', seed: Date.now() });
    },

    teardown: () => {
      generation += 1;
      clearTimers();
      setState({ state: null, ais: {}, busy: false, feedback: null });
    },
  };
});
