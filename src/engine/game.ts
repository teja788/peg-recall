/**
 * Color Catch — pure rules engine.
 *
 * `createGame(config)` builds a state; `reduce(state, action)` is a pure
 * reducer. Every state is a plain, JSON-serialisable object (the RNG included)
 * so it can be stored, replayed or sent over the wire.
 *
 * Invalid actions (wrong phase, captured peg, out-of-range index) return the
 * SAME state object — never a throw, so the UI can dispatch optimistically.
 */

import {
  BOARD_SPECS,
  PEG_COLORS,
  SUDDEN_DEATH_SPEC,
  type BoardSpec,
  type GameAction,
  type GameConfig,
  type GameState,
  type Peg,
  type PegColor,
  type PlayerSpec,
  type RngState,
} from './types';
import { createRng, deriveSeed, nextInt, shuffle } from './rng';

const MAX_REROLLS = 64;

/** Reveal countdown in ms, kid mode included (x1.5). */
export function revealDurationMs(state: GameState): number {
  const base = state.spec.revealMs;
  return state.config.rules.kidMode ? Math.round(base * 1.5) : base;
}

/** Pegs still on the board (hidden or momentarily revealed) per colour. */
export function hiddenPegsByColor(state: GameState): Record<PegColor, number> {
  const counts = {} as Record<PegColor, number>;
  for (const c of PEG_COLORS) counts[c] = 0;
  for (const peg of state.pegs) {
    if (peg.state !== 'captured') counts[peg.color] += 1;
  }
  return counts;
}

/** Colours the die may still land on. */
export function availableColors(state: GameState): PegColor[] {
  const counts = hiddenPegsByColor(state);
  return PEG_COLORS.filter((c) => counts[c] > 0);
}

export function activePlayerSpec(state: GameState): PlayerSpec {
  return state.config.players[state.activePlayer];
}

export function isHumanTurn(state: GameState): boolean {
  const p = activePlayerSpec(state);
  return !!p && p.kind === 'human';
}

/** Seats in the rotation (all of them, or only the tied ones in sudden death). */
function activeSeats(state: GameState): number[] {
  if (state.activeSeats && state.activeSeats.length > 0) return state.activeSeats;
  return state.config.players.map((_, i) => i);
}

/** Orthogonal neighbours of a peg index on a cols x rows grid. */
export function adjacentIndices(index: number, spec: BoardSpec): number[] {
  const { cols, rows } = spec;
  const row = Math.floor(index / cols);
  const col = index % cols;
  const out: number[] = [];
  if (row > 0) out.push(index - cols);
  if (row < rows - 1) out.push(index + cols);
  if (col > 0) out.push(index - 1);
  if (col < cols - 1) out.push(index + 1);
  return out;
}

/** Colour multiset for a board: as even as possible, remainder picked by rng. */
function buildColorBag(
  rng: RngState,
  pegCount: number,
  palette: readonly PegColor[],
): [PegColor[], RngState] {
  const base = Math.floor(pegCount / palette.length);
  const remainder = pegCount % palette.length;
  const bag: PegColor[] = [];
  for (const c of palette) {
    for (let i = 0; i < base; i++) bag.push(c);
  }
  let r = rng;
  if (remainder > 0) {
    const [order, r1] = shuffle(r, palette);
    r = r1;
    for (let i = 0; i < remainder; i++) bag.push(order[i]);
  }
  return [bag, r];
}

function buildPegs(
  rng: RngState,
  spec: BoardSpec,
  palette: readonly PegColor[],
): [Peg[], RngState] {
  const [bag, r1] = buildColorBag(rng, spec.pegs, palette);
  const [arranged, r2] = shuffle(r1, bag);
  const pegs: Peg[] = arranged.map((color, index) => ({
    index,
    color,
    // Face-up while the reveal countdown runs; REVEAL_DONE flips them down.
    state: 'revealed' as const,
  }));
  return [pegs, r2];
}

/** Fresh game from a config. Board and die sequence follow from config.seed. */
export function createGame(config: GameConfig): GameState {
  const spec = BOARD_SPECS[config.boardSize] ?? BOARD_SPECS.classic;
  const [pegs, rng] = buildPegs(createRng(config.seed), spec, PEG_COLORS);
  const scores: Record<string, number> = {};
  for (const p of config.players) scores[p.id] = 0;
  return {
    config,
    spec,
    pegs,
    phase: 'reveal',
    activePlayer: 0,
    dieColor: null,
    scores,
    turn: 0,
    lastMove: null,
    winnerIds: [],
    suddenDeath: false,
    rng,
    activeSeats: config.players.map((_, i) => i),
    suddenDeathScores: Object.fromEntries(config.players.map((p) => [p.id, 0])),
    dieRerolls: 0,
  };
}

/** Roll the die, rerolling internally until a live colour comes up. */
function rollDie(rng: RngState, live: PegColor[]): [PegColor | null, number, RngState] {
  if (live.length === 0) return [null, 0, rng];
  let r = rng;
  for (let attempt = 0; attempt < MAX_REROLLS; attempt++) {
    const [i, next] = nextInt(r, PEG_COLORS.length);
    r = next;
    const color = PEG_COLORS[i];
    if (live.includes(color)) return [color, attempt, r];
  }
  // Astronomically unlikely; keep the game moving.
  const [i, next] = nextInt(r, live.length);
  return [live[i], MAX_REROLLS, next];
}

function leadersOf(scores: Record<string, number>, ids: string[]): string[] {
  let best = -Infinity;
  for (const id of ids) best = Math.max(best, scores[id] ?? 0);
  return ids.filter((id) => (scores[id] ?? 0) === best);
}

/** Build the 3x3 sudden-death board, keeping scores and the tied seats only. */
function startSuddenDeath(state: GameState, tiedIds: string[]): GameState {
  const [seed] = deriveSeed(state.rng);
  const [palette, r2] = shuffle(createRng(seed), PEG_COLORS);
  const miniPalette = palette.slice(0, 3);
  const [pegs, r3] = buildPegs(r2, SUDDEN_DEATH_SPEC, miniPalette);
  const seats = state.config.players
    .map((p, i) => (tiedIds.includes(p.id) ? i : -1))
    .filter((i) => i >= 0);
  return {
    ...state,
    spec: SUDDEN_DEATH_SPEC,
    pegs,
    phase: 'reveal',
    activePlayer: seats[0] ?? 0,
    dieColor: null,
    lastMove: null,
    winnerIds: tiedIds,
    suddenDeath: true,
    rng: r3,
    activeSeats: seats,
    suddenDeathScores: Object.fromEntries(state.config.players.map((p) => [p.id, 0])),
    dieRerolls: 0,
  };
}

function nextSeat(state: GameState): number {
  const seats = activeSeats(state);
  const pos = seats.indexOf(state.activePlayer);
  if (pos < 0) return seats[0] ?? 0;
  return seats[(pos + 1) % seats.length];
}

/** Pure reducer. Invalid actions return `state` unchanged. */
export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'REVEAL_DONE': {
      if (state.phase !== 'reveal') return state;
      return {
        ...state,
        pegs: state.pegs.map((p) => (p.state === 'revealed' ? { ...p, state: 'hidden' } : p)),
        phase: 'roll',
      };
    }

    case 'ROLL': {
      if (state.phase !== 'roll') return state;
      const live = availableColors(state);
      const [color, rerolls, rng] = rollDie(state.rng, live);
      if (color === null) return state;
      return { ...state, dieColor: color, dieRerolls: rerolls, phase: 'pick', rng };
    }

    case 'PICK': {
      if (state.phase !== 'pick' || state.dieColor === null) return state;
      const peg = state.pegs[action.pegIndex];
      if (!peg || peg.state !== 'hidden') return state;

      const player = activePlayerSpec(state);
      if (!player) return state;
      const matched = peg.color === state.dieColor;

      const pegs = state.pegs.slice();
      pegs[action.pegIndex] = matched
        ? { ...peg, state: 'captured', capturedBy: player.id }
        : { ...peg, state: 'revealed' };

      const scores = state.scores;
      const sdScores = state.suddenDeathScores ?? {};
      let nextScores = scores;
      let nextSdScores = sdScores;
      if (matched) {
        if (state.suddenDeath) {
          nextSdScores = { ...sdScores, [player.id]: (sdScores[player.id] ?? 0) + 1 };
        } else {
          nextScores = { ...scores, [player.id]: (scores[player.id] ?? 0) + 1 };
        }
      }

      return {
        ...state,
        pegs,
        phase: 'result',
        scores: nextScores,
        suddenDeathScores: nextSdScores,
        turn: state.turn + 1,
        lastMove: {
          playerId: player.id,
          pegIndex: action.pegIndex,
          dieColor: state.dieColor,
          matched,
        },
      };
    }

    case 'RESULT_DONE': {
      if (state.phase !== 'result') return state;
      // A missed peg flips back down.
      const pegs: Peg[] = state.pegs.map((p) =>
        p.state === 'revealed' ? { ...p, state: 'hidden' as const } : p,
      );
      const matched = state.lastMove?.matched === true;
      const base: GameState = { ...state, pegs, dieColor: null, dieRerolls: 0 };

      // Sudden death: the first capture ends it outright.
      if (state.suddenDeath && matched && state.lastMove) {
        return { ...base, phase: 'gameOver', winnerIds: [state.lastMove.playerId] };
      }

      const boardEmpty = pegs.every((p) => p.state === 'captured');
      if (boardEmpty) {
        const ids = state.config.players.map((p) => p.id);
        const leaders = leadersOf(state.scores, ids);
        if (leaders.length <= 1) {
          return { ...base, phase: 'gameOver', winnerIds: leaders };
        }
        const { rules } = state.config;
        if (rules.kidMode || rules.tieBreak === 'shared' || state.suddenDeath) {
          return { ...base, phase: 'gameOver', winnerIds: leaders };
        }
        return startSuddenDeath(base, leaders);
      }

      const keepTurn = matched && state.config.rules.bonusTurnOnMatch;
      return {
        ...base,
        phase: 'roll',
        activePlayer: keepTurn ? state.activePlayer : nextSeat(state),
      };
    }

    case 'RESTART': {
      const [derived] = deriveSeed(state.rng);
      const seed = action.seed ?? derived;
      return createGame({ ...state.config, seed });
    }

    default:
      return state;
  }
}
