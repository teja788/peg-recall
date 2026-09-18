/**
 * Color Catch — shared engine contract.
 * Pure TypeScript. No React Native imports allowed in src/engine/**.
 * The UI layer (src/ui, app/) consumes ONLY these types and the functions
 * exported from src/engine/index.ts.
 */

export type PegColor = 'orange' | 'sky' | 'blue' | 'green' | 'yellow' | 'purple';
export const PEG_COLORS: readonly PegColor[] = ['orange', 'sky', 'blue', 'green', 'yellow', 'purple'];

export type BoardSize = 'small' | 'classic' | 'big' | 'huge';
export interface BoardSpec {
  size: BoardSize;
  cols: number;
  rows: number;
  pegs: number;       // cols * rows
  revealMs: number;   // initial reveal duration
}
export const BOARD_SPECS: Record<BoardSize, BoardSpec> = {
  small:   { size: 'small',   cols: 4, rows: 4, pegs: 16, revealMs: 4000 },
  classic: { size: 'classic', cols: 5, rows: 5, pegs: 25, revealMs: 6000 },
  big:     { size: 'big',     cols: 6, rows: 6, pegs: 36, revealMs: 8000 },
  huge:    { size: 'huge',    cols: 5, rows: 8, pegs: 40, revealMs: 9000 },
};

export type Difficulty = 'bunny' | 'fox' | 'owl';
export type AvatarId = 'fox' | 'owl' | 'bear' | 'frog' | 'bunny' | 'cat';

export interface PlayerSpec {
  id: string;            // 'p1' | 'p2' | 'p3'
  kind: 'human' | 'ai';
  avatar: AvatarId;
  name?: string;         // optional, defaults to avatar display name
  difficulty?: Difficulty; // only for kind === 'ai'
}

export interface Rules {
  bonusTurnOnMatch: boolean;   // physical rulebook: true (default ON)
  deadColor: 'reroll';         // die never shows a color with 0 pegs left
  tieBreak: 'suddenDeath' | 'shared';
  kidMode: boolean;            // longer reveal (x1.5), shared-win ties
}
export const DEFAULT_RULES: Rules = {
  bonusTurnOnMatch: true,
  deadColor: 'reroll',
  tieBreak: 'suddenDeath',
  kidMode: false,
};

export interface Peg {
  index: number;      // 0..pegs-1, row-major
  color: PegColor;
  state: 'hidden' | 'revealed' | 'captured';
  capturedBy?: string; // player id
}

export type Phase =
  | 'reveal'      // all pegs face-up, countdown running
  | 'roll'        // waiting for active player to tap the die
  | 'pick'        // die shows a color, waiting for a peg tap
  | 'result'      // animation of match/miss in progress
  | 'gameOver';

export interface GameConfig {
  boardSize: BoardSize;
  players: PlayerSpec[];   // 1..3 entries; order = seat order
  rules: Rules;
  seed: number;            // deterministic board + die sequence
}

export interface LastMove {
  playerId: string;
  pegIndex: number;
  dieColor: PegColor;
  matched: boolean;
}

export interface GameState {
  config: GameConfig;
  spec: BoardSpec;
  pegs: Peg[];
  phase: Phase;
  activePlayer: number;        // index into config.players
  dieColor: PegColor | null;   // set during 'pick' and 'result'
  scores: Record<string, number>;
  turn: number;                // increments on every pick (all players)
  lastMove: LastMove | null;
  winnerIds: string[];         // filled in gameOver; >1 means tie (shared) or pending sudden death
  suddenDeath: boolean;        // true when in a tie-break mini-board
  rng: RngState;               // serialisable RNG so state is a plain object

  /** Seats (indices into config.players) still in the turn rotation.
   *  All seats in a normal game; only the tied seats during sudden death. */
  activeSeats?: number[];
  /** Captures made on the sudden-death mini board, per player id.
   *  `scores` keeps the main-game totals so the UI can still show them. */
  suddenDeathScores?: Record<string, number>;
  /** How many times the last ROLL had to reroll a dead colour (UI can add
   *  ~300 ms of tumble per reroll). 0 when the first roll was live. */
  dieRerolls?: number;
}

/** Spec of the 3x3 tie-break mini board (9 pegs, 3 colours x 3).
 *  `suddenDeath === true` on the state is what marks a board as this one. */
export const SUDDEN_DEATH_SPEC: BoardSpec = {
  size: 'small', cols: 3, rows: 3, pegs: 9, revealMs: 3000,
};

export interface RngState { seed: number; counter: number }

/** Actions the UI dispatches. The engine reducer is pure: (state, action) => state. */
export type GameAction =
  | { type: 'REVEAL_DONE' }                 // countdown finished, flip pegs down
  | { type: 'ROLL' }                        // active player taps the die
  | { type: 'PICK'; pegIndex: number }      // active player taps a peg
  | { type: 'RESULT_DONE' }                 // UI finished the match/miss animation
  | { type: 'RESTART'; seed?: number };     // same config, new board

/** What the AI needs to observe to keep its memory in sync. */
export interface AiObservation {
  turn: number;
  pegIndex: number;
  color: PegColor;
  /** true when the peg was captured by this observation (it leaves the board,
   *  so the AI drops it from memory instead of recording it). */
  captured?: boolean;
}

/** Tunables per difficulty tier (PLAN.md section 3). */
export interface AiParams {
  /** Probability each peg of the initial reveal is memorised. */
  memorizeInitial: number;
  /** Base recall probability p0. */
  recallP0: number;
  /** Decay d applied per turn since the peg was last seen. */
  decayPerTurn: number;
  /** Max remembered pegs; Infinity = unlimited. Oldest entries are evicted. */
  maxTracked: number;
  /** Probability a recalled pick slips to an orthogonally adjacent peg. */
  slip: number;
  /** What to do with no usable memory of the rolled colour. */
  fallback: 'anyHidden' | 'unseenOrKnownWrong' | 'unseenOnly';
  /** For 'unseenOrKnownWrong': probability of retrying a known-wrong peg. */
  retryKnownWrong: number;
}

export interface AiMemoryEntry { color: PegColor; lastSeenTurn: number }
export interface AiState {
  difficulty: Difficulty;
  memory: Record<number, AiMemoryEntry>;   // pegIndex -> entry
  knownWrong: Record<number, PegColor>;    // pegs seen that were NOT the rolled color at that time (kept for Owl)
}
