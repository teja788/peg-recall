/**
 * Color Catch — "belief memory" computer opponent (PLAN.md section 3).
 *
 * The AI records each peg it has seen together with the turn it saw it. On its
 * turn with die colour c, each remembered peg of colour c is recalled with
 * probability `p0 * d^turnsSince`; a failed recall DELETES the entry (no sudden
 * re-remembering). It occasionally "slips" to an orthogonally adjacent peg so
 * it feels human.
 *
 * Everything here is pure: functions take an RngState and return the advanced
 * one, so an AI turn is fully reproducible from a seed.
 */

import type {
  AiObservation,
  AiParams,
  AiState,
  Difficulty,
  GameState,
  Peg,
  PegColor,
  RngState,
} from './types';
import { adjacentIndices } from './game';
import { chance, nextInt } from './rng';

export const AI_PARAMS: Record<Difficulty, AiParams> = {
  bunny: {
    memorizeInitial: 0.15,
    recallP0: 0.55,
    decayPerTurn: 0.85,
    maxTracked: 4,
    slip: 0.15,
    fallback: 'anyHidden',
    retryKnownWrong: 0,
  },
  fox: {
    memorizeInitial: 0.3,
    recallP0: 0.72,
    decayPerTurn: 0.93,
    maxTracked: 10,
    slip: 0.06,
    fallback: 'unseenOrKnownWrong',
    retryKnownWrong: 0.3,
  },
  owl: {
    memorizeInitial: 0.55,
    recallP0: 0.92,
    decayPerTurn: 0.975,
    maxTracked: Infinity,
    slip: 0.02,
    fallback: 'unseenOnly',
    retryKnownWrong: 0,
  },
};

export function createAi(difficulty: Difficulty): AiState {
  return { difficulty, memory: {}, knownWrong: {} };
}

export function aiParams(ai: AiState): AiParams {
  return AI_PARAMS[ai.difficulty] ?? AI_PARAMS.bunny;
}

/** Drop the oldest entries until at most maxTracked remain (ties: low index). */
function evict(memory: AiState['memory'], maxTracked: number): AiState['memory'] {
  const keys = Object.keys(memory);
  if (!Number.isFinite(maxTracked) || keys.length <= maxTracked) return memory;
  const ordered = keys
    .map((k) => Number(k))
    .sort((a, b) => {
      const d = memory[a].lastSeenTurn - memory[b].lastSeenTurn;
      return d !== 0 ? d : a - b;
    });
  const drop = ordered.slice(0, ordered.length - maxTracked);
  const out = { ...memory };
  for (const k of drop) delete out[k];
  return out;
}

/**
 * Record one peg the AI just saw. Call it for every peg shown: the initial
 * reveal (via `observeInitialReveal`, which applies the memorisation roll) and
 * every revealed/captured peg thereafter. Captured pegs leave the board and are
 * deleted from memory.
 */
export function observe(ai: AiState, obs: AiObservation): AiState {
  if (obs.captured) {
    if (!(obs.pegIndex in ai.memory) && !(obs.pegIndex in ai.knownWrong)) return ai;
    const memory = { ...ai.memory };
    const knownWrong = { ...ai.knownWrong };
    delete memory[obs.pegIndex];
    delete knownWrong[obs.pegIndex];
    return { ...ai, memory, knownWrong };
  }
  const params = aiParams(ai);
  const memory = evict(
    { ...ai.memory, [obs.pegIndex]: { color: obs.color, lastSeenTurn: obs.turn } },
    params.maxTracked,
  );
  // Seeing the real colour supersedes any stale "not this colour" note.
  let knownWrong = ai.knownWrong;
  if (obs.pegIndex in knownWrong) {
    knownWrong = { ...knownWrong };
    delete knownWrong[obs.pegIndex];
  }
  return { ...ai, memory, knownWrong };
}

/**
 * The opening reveal: every peg is shown, but each is memorised only with
 * probability `memorizeInitial`.
 */
export function observeInitialReveal(
  ai: AiState,
  pegs: readonly Peg[],
  rng: RngState,
  turn = 0,
): { ai: AiState; rng: RngState } {
  const params = aiParams(ai);
  let next = ai;
  let r = rng;
  for (const peg of pegs) {
    if (peg.state === 'captured') continue;
    const [memorised, r1] = chance(r, params.memorizeInitial);
    r = r1;
    if (memorised) next = observe(next, { turn, pegIndex: peg.index, color: peg.color });
  }
  return { ai: next, rng: r };
}

function hiddenIndices(state: GameState): number[] {
  const out: number[] = [];
  for (const peg of state.pegs) if (peg.state === 'hidden') out.push(peg.index);
  return out;
}

function pickFrom(rng: RngState, pool: number[], fallbackPool: number[]): [number, RngState] {
  const source = pool.length > 0 ? pool : fallbackPool;
  if (source.length === 0) return [-1, rng];
  const [i, next] = nextInt(rng, source.length);
  return [source[i], next];
}

/**
 * Choose a peg to tap. Pure: returns the new AI state (forgotten entries are
 * gone for good) and the advanced rng.
 *
 * Returns pegIndex -1 only if there is no hidden peg at all, which cannot
 * happen during the 'pick' phase of a live game.
 */
export function chooseMove(
  ai: AiState,
  state: GameState,
  rng: RngState,
): { pegIndex: number; ai: AiState; rng: RngState } {
  const params = aiParams(ai);
  const hidden = hiddenIndices(state);
  if (hidden.length === 0) return { pegIndex: -1, ai, rng };
  const hiddenSet = new Set(hidden);
  const die = state.dieColor;

  let memory = { ...ai.memory };
  let knownWrong = { ...ai.knownWrong };
  let r = rng;

  // Prune anything that has left the board (captured pegs).
  for (const key of Object.keys(memory)) {
    const i = Number(key);
    const peg = state.pegs[i];
    if (!peg || peg.state === 'captured') delete memory[i];
  }
  for (const key of Object.keys(knownWrong)) {
    const i = Number(key);
    const peg = state.pegs[i];
    if (!peg || peg.state === 'captured') delete knownWrong[i];
  }

  let target = -1;

  if (die !== null) {
    // Remembered pegs of the rolled colour, most recently seen first.
    const candidates = Object.keys(memory)
      .map((k) => Number(k))
      .filter((i) => memory[i].color === die && hiddenSet.has(i))
      .sort((a, b) => {
        const d = memory[b].lastSeenTurn - memory[a].lastSeenTurn;
        return d !== 0 ? d : a - b;
      });

    for (const index of candidates) {
      const turnsSince = Math.max(0, state.turn - memory[index].lastSeenTurn);
      const p = params.recallP0 * Math.pow(params.decayPerTurn, turnsSince);
      const [recalled, r1] = chance(r, p);
      r = r1;
      if (recalled) {
        target = index;
        break;
      }
      delete memory[index]; // forgotten for good
    }

    if (target >= 0) {
      // Human-feeling slip to an orthogonal neighbour.
      const [slips, r1] = chance(r, params.slip);
      r = r1;
      if (slips) {
        const neighbours = adjacentIndices(target, state.spec).filter((i) => hiddenSet.has(i));
        if (neighbours.length > 0) {
          const [j, r2] = nextInt(r, neighbours.length);
          r = r2;
          target = neighbours[j];
        }
      }
    } else {
      // No usable memory of this colour: note the pegs we know are NOT it.
      for (const key of Object.keys(memory)) {
        const i = Number(key);
        if (memory[i].color !== die) knownWrong[i] = memory[i].color;
      }
      const unseen = hidden.filter((i) => !(i in memory) && !(i in knownWrong));
      const wrongPool = hidden.filter((i) => i in memory || i in knownWrong);

      if (params.fallback === 'anyHidden') {
        const [choice, r1] = pickFrom(r, hidden, hidden);
        r = r1;
        target = choice;
      } else if (params.fallback === 'unseenOrKnownWrong') {
        const [retry, r1] = chance(r, params.retryKnownWrong);
        r = r1;
        const pool = retry && wrongPool.length > 0 ? wrongPool : unseen;
        const [choice, r2] = pickFrom(r, pool, hidden);
        r = r2;
        target = choice;
      } else {
        const [choice, r1] = pickFrom(r, unseen, hidden);
        r = r1;
        target = choice;
      }
    }
  } else {
    const [choice, r1] = pickFrom(r, hidden, hidden);
    r = r1;
    target = choice;
  }

  if (target < 0 || !hiddenSet.has(target)) {
    const [choice, r1] = pickFrom(r, hidden, hidden);
    r = r1;
    target = choice;
  }

  return { pegIndex: target, ai: { ...ai, memory, knownWrong }, rng: r };
}

/** Convenience: "thinking" delay for the UI (PLAN: 700-1300 ms). */
export function aiThinkMs(rng: RngState): [number, RngState] {
  const [n, next] = nextInt(rng, 601);
  return [700 + n, next];
}

export type { AiParams, AiState, AiObservation, PegColor };
