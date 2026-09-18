import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

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
  showShapes: false,
  boardSize: 'classic',
  difficulty: 'fox',
  bonusTurnOnMatch: true,
  kidMode: false,
  lastMode: 'ai',
  avatars: ['fox', 'owl', 'bear'],
};

export const AVATAR_CYCLE: AvatarId[] = ['fox', 'owl', 'bear', 'frog', 'bunny', 'cat'];
export const BOARD_CYCLE: BoardSize[] = ['small', 'classic', 'big', 'huge'];
export const BOARD_LABEL: Record<BoardSize, string> = {
  small: 'Small · 4×4',
  classic: 'Classic · 5×5',
  big: 'Big · 6×6',
  huge: 'Huge · 5×8',
};
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  bunny: 'Bunny',
  fox: 'Fox',
  owl: 'Owl',
};
export const DIFFICULTY_HINT: Record<Difficulty, string> = {
  bunny: 'Forgets a lot. Good for little players.',
  fox: 'Remembers about half the board.',
  owl: 'Remembers nearly everything.',
};

const KEY = 'pegrecall.settings.v1';

interface SettingsStore extends Settings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggle: (key: 'soundOn' | 'showShapes' | 'bonusTurnOnMatch' | 'kidMode') => void;
  cycleBoardSize: () => void;
  cycleAvatar: (seat: number) => void;
  reset: () => void;
}

function sanitize(raw: unknown): Partial<Settings> {
  if (!raw || typeof raw !== 'object') return {};
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

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist(s: Settings) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const payload: Settings = {
      soundOn: s.soundOn,
      showShapes: s.showShapes,
      boardSize: s.boardSize,
      difficulty: s.difficulty,
      bonusTurnOnMatch: s.bonusTurnOnMatch,
      kidMode: s.kidMode,
      lastMode: s.lastMode,
      avatars: s.avatars,
    };
    Promise.resolve(Storage.setItem(KEY, JSON.stringify(payload))).catch(() => {
      /* storage is a nicety, never a failure the player should see */
    });
  }, 120);
}

export const useSettings = create<SettingsStore>((setState, getState) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    if (getState().hydrated) return;
    try {
      const raw = await Storage.getItem(KEY);
      if (raw) setState({ ...sanitize(JSON.parse(raw)), hydrated: true });
      else setState({ hydrated: true });
    } catch {
      setState({ hydrated: true });
    }
  },

  set: (key, value) => {
    setState({ [key]: value } as Pick<Settings, typeof key>);
    persist(getState());
  },

  toggle: (key) => {
    setState({ [key]: !getState()[key] } as Pick<Settings, typeof key>);
    persist(getState());
  },

  cycleBoardSize: () => {
    const i = BOARD_CYCLE.indexOf(getState().boardSize);
    setState({ boardSize: BOARD_CYCLE[(i + 1) % BOARD_CYCLE.length] });
    persist(getState());
  },

  cycleAvatar: (seat) => {
    const avatars = [...getState().avatars];
    const cur = AVATAR_CYCLE.indexOf(avatars[seat]);
    // skip avatars already taken by another seat so trays stay tellable apart
    for (let step = 1; step <= AVATAR_CYCLE.length; step++) {
      const candidate = AVATAR_CYCLE[(cur + step) % AVATAR_CYCLE.length];
      if (!avatars.some((a, i) => i !== seat && a === candidate)) {
        avatars[seat] = candidate;
        break;
      }
    }
    setState({ avatars });
    persist(getState());
  },

  reset: () => {
    setState({ ...DEFAULT_SETTINGS });
    persist(getState());
  },
}));
