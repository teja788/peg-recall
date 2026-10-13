/**
 * The App Store rating prompt (PLAN-v1.1 section 6, lever 3).
 *
 * Shown at most once per app version, only after the player has clearly
 * settled in (see `shouldAskForReview`), and only on a happy ending. iOS
 * itself further rate-limits the sheet (3 times a year) and may show nothing;
 * we cannot tell, so "asked" means "we asked iOS".
 *
 * Native-only module (expo-store-review, expo-constants): keep it out of the
 * node test path — the rule itself is tested through statsModel.
 */
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

import { useStats } from './stats';
import { shouldAskForReview } from './statsModel';

/** For a "Rate Color Catch" row in Settings (opens the App Store review page). */
export const WRITE_REVIEW_URL = 'https://apps.apple.com/app/id6813625311?action=write-review';

/**
 * Whether iOS can show the rating sheet at all (false on TestFlight and on
 * web), asked once at load so `reviewDue` can answer synchronously. Until it
 * answers, nothing is "due".
 */
let available = false;
Promise.resolve()
  .then(() => StoreReview.isAvailableAsync())
  .then(
    (v) => {
      available = v;
    },
    () => {},
  );

function appVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}

/**
 * true when `maybeRequestReview` is about to ask on this game-over (iOS may
 * still show nothing). The game-over upsell card stands aside then.
 */
export function reviewDue(opts: { humanWon: boolean; passAndPlay: boolean }): boolean {
  try {
    return (
      Platform.OS !== 'web' && available && shouldAskForReview(useStats.getState(), opts, appVersion())
    );
  } catch {
    return false;
  }
}

/**
 * Call at the end of a finished game (after it has been recorded). Resolves
 * true only when the native review sheet was requested. Never throws.
 */
export async function maybeRequestReview(opts: {
  humanWon: boolean;
  passAndPlay: boolean;
}): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    const version = appVersion();
    if (!shouldAskForReview(useStats.getState(), opts, version)) return false;
    // false on TestFlight builds and on web
    if (!(await StoreReview.isAvailableAsync())) return false;
    await StoreReview.requestReview();
    useStats.getState().markReviewAsked(version);
    return true;
  } catch {
    return false;
  }
}
