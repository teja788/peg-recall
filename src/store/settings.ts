import { createSettingsStore } from './settingsStore';
import { bindStatsStorage, useStats } from './stats';
import { storage } from './storage';

// The data and the pure helpers live in settingsModel.ts (which imports no
// native module); re-exported here so every screen keeps one import path.
export {
  ANIMAL_NAME,
  AVATAR_CYCLE,
  BOARD_CYCLE,
  BOARD_LABEL,
  BOARD_NAME,
  DEFAULT_SETTINGS,
  DIFFICULTY_HINT,
  DIFFICULTY_LABEL,
  DIFFICULTY_TIER,
  NAME_INPUT_MAX,
  NAME_MAX,
  RECENT_MAX,
  cleanName,
  humanAvatarVsAi,
  isAnimalName,
  nameToStore,
  sanitize,
} from './settingsModel';
export type { CycleOptions, GameMode, Settings } from './settingsModel';
export type { SettingsStore } from './settingsStore';

// Stats persist through the same storage backend. stats.ts itself imports no
// native module (so the game store and its tests can use it); this is where it
// is handed the real storage, since every screen loads settings first.
bindStatsStorage(storage);

export const useSettings = createSettingsStore(storage, {
  // wherever settings hydrate (app/_layout.tsx), the stats read starts too
  onHydrate: () => {
    void useStats.getState().hydrate();
  },
});
