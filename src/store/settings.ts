import { createSettingsStore } from './settingsStore';
import { bindStatsStorage, useStats } from './stats';
import { storage } from './storage';
import { hasStore } from './storefront';

// The data and the pure helpers live in settingsModel.ts (which imports no
// native module); re-exported here so every screen keeps one import path.
export {
  AVATAR_CYCLE,
  BOARD_CYCLE,
  DEFAULT_SETTINGS,
  animalName,
  NAME_INPUT_MAX,
  NAME_MAX,
  RECENT_MAX,
  cleanName,
  humanAvatarVsAi,
  isAnimalName,
  nameKey,
  canTry,
  deal,
  isLocked,
  isOpen,
  moreToTry,
  nameToStore,
  playable,
  playableMode,
  sanitize,
  upsellCard,
  withTries,
} from './settingsModel';
export type { CycleOptions, GameMode, Lockable, Settings } from './settingsModel';
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
  // the published web game: nothing to buy, so no free tries to count either
  noTries: !hasStore,
});
