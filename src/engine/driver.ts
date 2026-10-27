/**
 * Color Catch — the table driver: everything that moves a game along besides
 * the players' own taps, as pure functions.
 *
 * Two callers share it so they can never disagree:
 *  - the app's game store (src/store/game.ts), which adds timers, animation
 *    and pause on top;
 *  - the room server (PLAN-web-online.md §B3), which is the referee for an
 *    online game: it applies the players' taps and, through `autoStep`, takes
 *    the steps nobody taps for (the reveal ending, a result finishing, a
 *    computer seat's turn).
 *
 * Pure TypeScript like the rest of src/engine: no React, no Node, no clock.
 */

import { aiThinkMs, chooseMove, createAi, observe, observeInitialReveal } from './ai';
import { activePlayerSpec, isHumanTurn, revealDurationMs } from './game';
import { FLOW, resultMs, tumbleMs } from './timing';
import type { AiState, GameState, RngState } from './types';

/** Each computer seat's memory, by player id. */
export type Brains = Record<string, AiState>;

/**
 * The computer's rng is a separate stream from the board's, so that a game
 * replayed from an explicit seed does not have the opponent's dice riding on
 * the very numbers that laid the board out. Mixed, not equal.
 */
export function aiSeedFor(gameSeed: number): number {
  return (((gameSeed ^ 0x9e3779b9) >>> 0) & 0x7fffffff) || 1;
}

/**
 * Fresh brains for a board, each memorising the opening reveal at its own
 * difficulty's rate. Every new board gets new brains — memory is indexed by
 * peg index, so a sudden-death mini board would otherwise be played with
 * confident, entirely wrong memories of the board it replaced.
 *
 * `standIns`: people's seats that also get a brain (Fox's), so the room
 * server can play a turn for someone who has gone away. The app passes none.
 */
export function freshBrains(
  state: GameState,
  rng: RngState,
  standIns: readonly string[] = [],
): { ais: Brains; rng: RngState } {
  const ais: Brains = {};
  let r = rng;
  for (const p of state.config.players) {
    if (p.kind !== 'ai' && !standIns.includes(p.id)) continue;
    // `state.turn` keeps counting across a sudden-death board, so the reveal
    // must be stamped with it — stamping turn 0 would leave the AI's fresh
    // memories looking decades old and every tier near-blind.
    const res = observeInitialReveal(createAi(p.difficulty ?? 'fox'), state.pegs, r, state.turn);
    r = res.rng;
    ais[p.id] = res.ai;
  }
  return { ais, rng: r };
}

/**
 * Every computer seat sees the peg the last PICK turned face up — everyone was
 * looking. A captured peg leaves the board, so it is dropped from memory
 * rather than filed away as somewhere worth tapping again.
 */
export function observePick(ais: Brains, state: GameState): Brains {
  const move = state.lastMove;
  const ids = Object.keys(ais);
  if (!move || ids.length === 0) return ais;
  const peg = state.pegs[move.pegIndex];
  if (!peg) return ais;
  const next: Brains = {};
  for (const id of ids) {
    next[id] = observe(ais[id], { turn: state.turn, pegIndex: move.pegIndex, color: peg.color, captured: move.matched });
  }
  return next;
}

/**
 * The pick the seat to move makes with its brain: a computer seat's own, or a
 * stand-in for an away player (`freshBrains`). Null when it is not a pick or
 * that seat has no brain — in the app, every person's seat. `pegIndex` is -1
 * when there is nothing to pick; the rng has still moved on.
 */
export function computerPick(
  state: GameState,
  ais: Brains,
  rng: RngState,
): { pegIndex: number; ais: Brains; rng: RngState } | null {
  if (state.phase !== 'pick') return null;
  const id = activePlayerSpec(state).id;
  const ai = ais[id];
  if (!ai) return null;
  const res = chooseMove(ai, state, rng);
  return { pegIndex: res.pegIndex, ais: { ...ais, [id]: res.ai }, rng: res.rng };
}

/** The next step the game takes by itself, and how long after `state` began. */
export interface AutoStep {
  /** REVEAL_DONE when the look-time ends, RESULT_DONE once a pick has been
   *  shown, or a computer seat's ROLL or PICK (its peg is chosen when the
   *  step fires, with `computerPick`) */
  kind: 'REVEAL_DONE' | 'RESULT_DONE' | 'ROLL' | 'PICK';
  afterMs: number;
  /** the rng after the computer's thinking time was drawn */
  rng: RngState;
}

/**
 * What a referee does next without anyone tapping, or null when it waits for
 * a person (their roll or pick) or the game is over.
 *
 * A computer's pick waits for the die to finish tumbling and then "thinks":
 * the same pacing the app gives a computer opponent today.
 */
export function autoStep(state: GameState, rng: RngState): AutoStep | null {
  switch (state.phase) {
    case 'reveal':
      return { kind: 'REVEAL_DONE', afterMs: revealDurationMs(state), rng };
    case 'result':
      return { kind: 'RESULT_DONE', afterMs: resultMs(state.lastMove?.matched === true), rng };
    case 'roll':
      return isHumanTurn(state) ? null : { kind: 'ROLL', afterMs: FLOW.aiRollDelay, rng };
    case 'pick': {
      if (isHumanTurn(state)) return null;
      const [think, next] = aiThinkMs(rng);
      return { kind: 'PICK', afterMs: tumbleMs(state.dieRerolls ?? 0) + think, rng: next };
    }
    default:
      return null;
  }
}
