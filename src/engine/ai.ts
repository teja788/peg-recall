/**
 * Color Catch — "belief memory" computer opponent (PLAN.md section 3).
 *
 * The AI records each peg it has seen together with the turn it saw it. On its
 * turn with die colour c, each remembered peg of colour c is recalled with
 * probability `p0 * d^roundsSince`; a failed recall DELETES the entry (no sudden
 * re-remembering). It occasionally "slips" to a peg next to the intended one
 * (on the round board as drawn) so it feels human.
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
import { neighbours as ringNeighbours, roundLayout } from '../layout/roundLayout';
import { chance, createRng, nextInt, shuffle } from './rng';

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

function aiParams(ai: AiState): AiParams {
  return AI_PARAMS[ai.difficulty] ?? AI_PARAMS.bunny;
}

/**
 * Drop the oldest entries until at most maxTracked remain.
 *
 * Entries seen on the same turn are a tie — and the whole opening reveal is
 * turn 0, so a tie broken by peg index would hand every small-memory AI the
 * same corner of the board every game. Shuffle first, then sort by age: the
 * sort is stable, so ties keep the shuffled (random, seed-reproducible) order.
 */
function evict(
  memory: AiState['memory'],
  maxTracked: number,
  rng: RngState,
): AiState['memory'] {
  const keys = Object.keys(memory).map(Number);
  if (!Number.isFinite(maxTracked) || keys.length <= maxTracked) return memory;
  const [shuffled] = shuffle(rng, keys);
  const ordered = shuffled.sort((a, b) => memory[a].lastSeenTurn - memory[b].lastSeenTurn);
  const drop = ordered.slice(0, ordered.length - maxTracked);
  const out = { ...memory };
  for (const k of drop) delete out[k];
  return out;
}

/** Stand-in rng for `observe` calls that have none to give (see below). */
function rngForObservation(obs: AiObservation): RngState {
  return createRng((Math.imul(obs.turn + 1, 0x9e3779b1) ^ (obs.pegIndex + 1)) >>> 0 || 1);
}

/**
 * Record one peg the AI just saw. Call it for every peg shown: the initial
 * reveal (via `observeInitialReveal`, which applies the memorisation roll) and
 * every revealed/captured peg thereafter. Captured pegs leave the board and are
 * deleted from memory.
 *
 * `rng` only ever decides which of several equally-old entries is evicted; it
 * is not returned, so a caller with no rng to hand may omit it and get a
 * stand-in derived from the observation itself (still fully deterministic).
 */
export function observe(ai: AiState, obs: AiObservation, rng?: RngState): AiState {
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
    rng ?? rngForObservation(obs),
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
    if (memorised) next = observe(next, { turn, pegIndex: peg.index, color: peg.color }, r);
  }
  return { ai: next, rng: r };
}

/**
 * Who sits next to whom on the board as it is actually drawn: concentric rings
 * (src/layout/roundLayout), not the row-major grid of BoardSpec.cols/rows. The
 * layout module is plain TypeScript, so the engine stays free of anything
 * React. Cached per peg count — it is deterministic, and there are only a
 * handful of board sizes.
 */
const NEIGHBOUR_CACHE = new Map<number, number[][]>();

function neighbourTable(pegCount: number): number[][] {
  const cached = NEIGHBOUR_CACHE.get(pegCount);
  if (cached) return cached;
  // Any diameter will do: `neighbours` compares distances against the spacing.
  const layout = roundLayout(pegCount, 1000);
  const table = layout.positions.map((p) => ringNeighbours(layout, p.index));
  NEIGHBOUR_CACHE.set(pegCount, table);
  return table;
}

/** Pegs touching `index` on the round board of `pegCount` pegs. */
export function boardNeighbours(index: number, pegCount: number): number[] {
  return neighbourTable(pegCount)[index] ?? [];
}

/**
 * Age of a memory in ROUNDS rather than in picks. `state.turn` counts every
 * player's pick, so measuring decay against it would quietly weaken every tier
 * as more seats join: with three players the die comes back round to this AI a
 * third as often, yet its memory would have decayed three times as far.
 */
function roundsSince(state: GameState, lastSeenTurn: number): number {
  const seats = state.activeSeats?.length || state.config.players.length || 1;
  return Math.max(0, state.turn - lastSeenTurn) / seats;
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
      const age = roundsSince(state, memory[index].lastSeenTurn);
      const p = params.recallP0 * Math.pow(params.decayPerTurn, age);
      const [recalled, r1] = chance(r, p);
      r = r1;
      if (recalled) {
        target = index;
        break;
      }
      delete memory[index]; // forgotten for good
    }

    if (target >= 0) {
      // Human-feeling slip to a peg sitting right next to the intended one.
      const [slips, r1] = chance(r, params.slip);
      r = r1;
      if (slips) {
        const neighbours = boardNeighbours(target, state.spec.pegs).filter((i) => hiddenSet.has(i));
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
