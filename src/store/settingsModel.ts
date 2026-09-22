/**
 * Settings: the parts that are just data and pure functions.
 *
 * Kept apart from `settings.ts` so that everything which only needs the shape
 * of a Settings object — the game store, the tests — can import it without
 * pulling in `expo-sqlite`, which only exists inside a React Native runtime.
 */

import type { AvatarId, BoardSize, Difficulty } from '../engine/types';

export type GameMode = 'ai' | '2p' | '3p';

export interface Settings {
  soundOn: boolean;
  showShapes: boolean;
  boardSize: BoardSize;
  difficulty: Difficulty;
  bonusTurnOnMatch: boolean;
  kidMode: boolean;
  lastMode: GameMode;
  /** Seat avatars, index 0..2. Seat 1 is the computer in `ai` mode. */
  avatars: AvatarId[];
}

export const DEFAULT_SETTINGS: Settings = {
  soundOn: true,
  // On by default: the die is otherwise colour-only, which leaves a colour-blind
  // player with nothing to read. Anyone who dislikes the glyphs can turn it off.
  showShapes: true,
  boardSize: 'classic',
  difficulty: 'fox',
  bonusTurnOnMatch: true,
  kidMode: false,
  lastMode: 'ai',
  avatars: ['fox', 'owl', 'bear'],
};

export const AVATAR_CYCLE: AvatarId[] = ['fox', 'owl', 'bear', 'frog', 'bunny', 'cat'];
export const BOARD_CYCLE: BoardSize[] = ['small', 'classic', 'big', 'huge'];
/** The board is a disc, so sizes are named by peg count, not by rows x cols. */
export const BOARD_LABEL: Record<BoardSize, string> = {
  small: 'Small · 16 pegs',
  classic: 'Classic · 25 pegs',
  big: 'Big · 36 pegs',
  huge: 'Huge · 40 pegs',
};
/** Just the name, for places too narrow for the peg count (the Home picker). */
export const BOARD_NAME: Record<BoardSize, string> = {
  small: 'Small',
  classic: 'Classic',
  big: 'Big',
  huge: 'Huge',
};
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  bunny: 'Bunny',
  fox: 'Fox',
  owl: 'Owl',
};
/** One word under each opponent in the Home picker. */
export const DIFFICULTY_TIER: Record<Difficulty, string> = {
  bunny: 'Easy',
  fox: 'Medium',
  owl: 'Hard',
};
export const DIFFICULTY_HINT: Record<Difficulty, string> = {
  bunny: 'Forgets a lot. Good for little players.',
  fox: 'Remembers about half the board.',
  owl: 'Remembers nearly everything.',
};

export const SETTINGS_KEY = 'pegrecall.settings.v1';

/**
 * Keep only the fields that are present AND of the right shape. Anything else
 * — a truncated write, a value from an older build, outright garbage — is
 * dropped, and the caller falls back to the default for that field.
 */
export function sanitize(raw: unknown): Partial<Settings> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<Settings> = {};
  if (typeof r.soundOn === 'boolean') out.soundOn = r.soundOn;
  if (typeof r.showShapes === 'boolean') out.showShapes = r.showShapes;
  if (typeof r.bonusTurnOnMatch === 'boolean') out.bonusTurnOnMatch = r.bonusTurnOnMatch;
  if (typeof r.kidMode === 'boolean') out.kidMode = r.kidMode;
  if (BOARD_CYCLE.includes(r.boardSize as BoardSize)) out.boardSize = r.boardSize as BoardSize;
  if (['bunny', 'fox', 'owl'].includes(r.difficulty as string)) out.difficulty = r.difficulty as Difficulty;
  if (['ai', '2p', '3p'].includes(r.lastMode as string)) out.lastMode = r.lastMode as GameMode;
  if (Array.isArray(r.avatars)) {
    const av = r.avatars.filter((a): a is AvatarId => AVATAR_CYCLE.includes(a as AvatarId));
    if (av.length === 3) out.avatars = av;
  }
  return out;
}

/** The subset actually written to storage (no `hydrated`, no functions). */
export function persistable(s: Settings): Settings {
  return {
    soundOn: s.soundOn,
    showShapes: s.showShapes,
    boardSize: s.boardSize,
    difficulty: s.difficulty,
    bonusTurnOnMatch: s.bonusTurnOnMatch,
    kidMode: s.kidMode,
    lastMode: s.lastMode,
    avatars: s.avatars,
  };
}
