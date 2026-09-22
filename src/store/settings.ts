import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import {
  AVATAR_CYCLE,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  persistable,
  sanitize,
  type Settings,
} from './settingsModel';

// The data and the pure helpers live in settingsModel.ts (which imports no
// native module); re-exported here so every screen keeps one import path.
export {
  AVATAR_CYCLE,
  BOARD_CYCLE,
  BOARD_LABEL,
  BOARD_NAME,
  DEFAULT_SETTINGS,
  DIFFICULTY_HINT,
  DIFFICULTY_LABEL,
  DIFFICULTY_TIER,
  sanitize,
} from './settingsModel';
export type { GameMode, Settings } from './settingsModel';

interface SettingsStore extends Settings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggle: (key: 'soundOn' | 'showShapes' | 'bonusTurnOnMatch' | 'kidMode') => void;
  cycleAvatar: (seat: number) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist(s: Settings) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    Promise.resolve(Storage.setItem(SETTINGS_KEY, JSON.stringify(persistable(s)))).catch(() => {
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
      const raw = await Storage.getItem(SETTINGS_KEY);
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
}));
