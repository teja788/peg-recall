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
  /** Typed player names, index 0..2 like `avatars`. '' = use the animal's name.
   *  Always stored already cleaned (see `cleanName`). */
  names: string[];
  /** Names typed in past games, most recent first (see `addRecentNames`):
   *  the one-tap chips on the "Who's playing?" sheet. Cleaned, no animal names,
   *  distinct ignoring case, at most RECENT_MAX. */
  recentNames: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  soundOn: true,
  showShapes: false,
  boardSize: 'classic',
  difficulty: 'fox',
  bonusTurnOnMatch: true,
  kidMode: false,
  lastMode: 'ai',
  avatars: ['fox', 'owl', 'bear'],
  names: ['', '', ''],
  recentNames: [],
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

/**
 * Storage key. Deliberately still `.v1`: the blob itself carries a `version`
 * field now (2), and `sanitize` reads every version field by field, so a 1.0
 * install keeps its settings without a key migration.
 */
export const SETTINGS_KEY = 'pegrecall.settings.v1';
/** Schema version written into the stored blob (1.0 wrote none = version 1;
 *  2 added `names`, 3 added `recentNames`). */
export const SETTINGS_VERSION = 3;

/* ------------------------------------------------------------ player names */

/** Longest name kept, counted in code points (so an emoji is not "2 letters"). */
export const NAME_MAX = 12;
/** maxLength for the text input: roomy enough that a paste is cut by
 *  `cleanName` (which knows about emoji) rather than mid-surrogate by the field. */
export const NAME_INPUT_MAX = 24;

/** Tab, newlines, line/paragraph separators: become a plain space. */
const BREAKING_SPACE = /[\t\n\v\f\r\u0085\u2028\u2029]/g;
/**
 * Control and invisible formatting characters, stripped outright. Explicit
 * ranges rather than \p{...} so Hermes' regex engine is never asked for
 * Unicode property escapes:
 *   C0 controls, DEL + C1 controls, Arabic letter mark,
 *   zero-width space, LRM/RLM, bidi embeddings/overrides (LRE..RLO),
 *   word joiner + invisible operators, bidi isolates (LRI..PDI),
 *   deprecated format chars, BOM / zero-width no-break space.
 * ZWJ (U+200D) and ZWNJ (U+200C) are kept: emoji sequences and Persian /
 * Indic spelling need them.
 */
const INVISIBLE =
  /[\u0000-\u001F\u007F-\u009F\u061C\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\u206A-\u206F\uFEFF]/g;
const ZWJ = '\u200D';
const VS16 = '\uFE0F';

/**
 * Turn whatever was typed or pasted into a name that is safe to show anywhere:
 * no control or bidi-override characters, single spaces, trimmed, and at most
 * NAME_MAX code points without a dangling emoji joiner at the cut.
 * '' means "no name" (the seat shows its animal).
 */
export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let s = raw;
  try {
    s = s.normalize('NFC');
  } catch {
    /* no ICU / normalize on some engine: the raw string is still usable */
  }
  s = s.replace(BREAKING_SPACE, ' ').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
  const cps = Array.from(s);
  if (cps.length <= NAME_MAX) return s;
  const kept = cps.slice(0, NAME_MAX);
  // An emoji ZWJ sequence cut right after a joiner (or before its VS16) would
  // leave an invisible tail that some renderers draw as a box.
  while (kept.length > 0 && (kept[kept.length - 1] === ZWJ || kept[kept.length - 1] === VS16)) {
    kept.pop();
  }
  return kept.join('').trim();
}

/** How many typed names are remembered for the chips. */
export const RECENT_MAX = 8;

/** Same words as the avatar art's names (kept here so the model stays RN-free). */
export const ANIMAL_NAME: Record<AvatarId, string> = {
  fox: 'Fox',
  owl: 'Owl',
  bear: 'Bear',
  frog: 'Frog',
  bunny: 'Bunny',
  cat: 'Cat',
};

const ANIMAL_WORDS = new Set(Object.values(ANIMAL_NAME).map((n) => n.toLowerCase()));

/** "fox", "FOX", " Fox " — any of the six animal names, whatever the case. */
export function isAnimalName(name: string): boolean {
  return ANIMAL_WORDS.has(cleanName(name).toLowerCase());
}

/**
 * What a name field stores when it is committed: the cleaned text, or '' (=
 * "use the animal") when it is empty or just the seat's own animal name. So a
 * field left on its prefilled "Fox" keeps following the animal if the avatar
 * changes later.
 */
export function nameToStore(raw: unknown, avatar: AvatarId): string {
  const name = cleanName(raw);
  if (!name) return '';
  return name.toLowerCase() === ANIMAL_NAME[avatar]?.toLowerCase() ? '' : name;
}

/**
 * Put the names just played with at the front of the recent list: cleaned,
 * animal names and blanks skipped, one entry per name ignoring case (the newest
 * spelling wins), at most RECENT_MAX. `played` is in seat order; the first seat
 * ends up first.
 */
export function addRecentNames(recent: readonly unknown[], played: readonly unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...played, ...recent]) {
    const name = cleanName(raw);
    const key = name.toLowerCase();
    if (!name || isAnimalName(name) || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length === RECENT_MAX) break;
  }
  return out;
}

/* ----------------------------------------------------------------- avatars */

/**
 * The animal the human wears against the computer. The computer wears its
 * difficulty's face (Bunny, Fox, Owl); a human seat on the same animal is
 * moved to one that is not a difficulty, so the trays never read "Fox vs Fox".
 */
export function humanAvatarVsAi(avatar: AvatarId, ai: AvatarId): AvatarId {
  if (avatar !== ai) return avatar;
  return (['bear', 'frog', 'cat'] as AvatarId[]).find((a) => a !== ai) ?? 'bear';
}

export interface CycleOptions {
  /** Seats in play (0..seats-1); the rest keep their animals but can give one
   *  up. Default: every seat. */
  seats?: number;
  /** Animals this seat may not take (the computer's, in a game against it). */
  avoid?: readonly AvatarId[];
  /** Start the cycle here instead of at the stored animal (the animal the seat
   *  is actually shown with, when that differs). */
  from?: AvatarId;
}

/**
 * The avatars after `seat` taps its animal: the next animal in AVATAR_CYCLE
 * that no other seat in play is wearing. An animal held by a seat that is NOT
 * in play is swapped over, so the three stored avatars always stay distinct.
 * Returns the input unchanged when there is nothing to move to.
 */
export function nextAvatars(
  avatars: readonly AvatarId[],
  seat: number,
  opts: CycleOptions = {},
): AvatarId[] {
  const out = [...avatars];
  if (!Number.isInteger(seat) || seat < 0 || seat >= out.length) return out;
  const seats = opts.seats ?? out.length;
  const avoid = opts.avoid ?? [];
  const start = opts.from ?? out[seat];
  const cur = AVATAR_CYCLE.indexOf(start);
  for (let step = 1; step <= AVATAR_CYCLE.length; step++) {
    const candidate = AVATAR_CYCLE[(cur + step) % AVATAR_CYCLE.length];
    if (avoid.includes(candidate)) continue;
    const holder = out.findIndex((a, i) => i !== seat && a === candidate);
    if (holder !== -1 && holder < seats) continue;
    if (holder !== -1) out[holder] = out[seat];
    out[seat] = candidate;
    return out;
  }
  return out;
}

/* ------------------------------------------------------------- persistence */

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
  if (Array.isArray(r.avatars) && r.avatars.length === 3) {
    const av = r.avatars.filter((a): a is AvatarId => AVATAR_CYCLE.includes(a as AvatarId));
    // two seats wearing the same animal could not be told apart in the trays
    if (av.length === 3 && new Set(av).size === 3) out.avatars = av;
  }
  if (Array.isArray(r.names) && r.names.length === 3) {
    // one bad entry blanks that seat only; it never voids the other names
    out.names = r.names.map(cleanName);
  }
  if (Array.isArray(r.recentNames)) {
    // re-run through the same rules as a fresh game: bad entries just drop out
    out.recentNames = addRecentNames(r.recentNames.slice(0, RECENT_MAX * 4), []);
  }
  return out;
}

/** What goes to storage: the settings plus the schema version. */
export type PersistedSettings = Settings & { version: typeof SETTINGS_VERSION };

/** The subset actually written to storage (no `hydrated`, no functions). */
export function persistable(s: Settings): PersistedSettings {
  return {
    version: SETTINGS_VERSION,
    soundOn: s.soundOn,
    showShapes: s.showShapes,
    boardSize: s.boardSize,
    difficulty: s.difficulty,
    bonusTurnOnMatch: s.bonusTurnOnMatch,
    kidMode: s.kidMode,
    lastMode: s.lastMode,
    avatars: s.avatars,
    names: s.names,
    recentNames: s.recentNames,
  };
}
