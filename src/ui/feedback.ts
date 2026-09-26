/**
 * Sound + haptics. Both are "nice if they work" — every call is wrapped so a
 * missing clip or an iPad without a Taptic Engine can never break a turn.
 */
import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useReducedMotion as useReducedMotionAtLaunch } from 'react-native-reanimated';

import { SOUND_SOURCES, type SoundName } from '@sounds';

import { useSettings } from '../store/settings';

export type { SoundName };

const SOURCES = SOUND_SOURCES;

let audioModeSet = false;

/**
 * Preloads the four clips and returns a `play(name)` that respects the
 * sound setting. Mount this once, in the game screen.
 */
export function useSounds() {
  const flip = useAudioPlayer(SOURCES.flip);
  const match = useAudioPlayer(SOURCES.match);
  const roll = useAudioPlayer(SOURCES.roll);
  const win = useAudioPlayer(SOURCES.win);

  const players = useRef<Record<SoundName, AudioPlayer>>({ flip, match, roll, win });
  players.current = { flip, match, roll, win };

  useEffect(() => {
    if (audioModeSet) return;
    audioModeSet = true;
    // Ambient: mix with whatever the player is listening to and obey the
    // hardware silent switch.
    setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {
      audioModeSet = false;
    });
  }, []);

  // `play` is deliberately identity-stable for the life of the screen: the
  // game screen fires sounds from effects keyed on game state, and a `play`
  // that changed whenever the mute switch moved would re-run those effects and
  // replay the win chime / flip haptics. The setting is read at call time.
  return useCallback(
    (name: SoundName) => {
      if (!useSettings.getState().soundOn) return;
      try {
        const p = players.current[name];
        if (!p) return;
        p.seekTo(0)
          .then(() => p.play())
          .catch(() => {
            try {
              p.play();
            } catch {
              /* ignore */
            }
          });
      } catch {
        /* a silent game is still a playable game */
      }
    },
    [],
  );
}

/* ------------------------------------------------------------- haptics */

export function hapticFlip() {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    /* no Taptic Engine (iPad) — no-op */
  }
}

export function hapticMatch() {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } catch {
    /* no-op */
  }
}

/* ------------------------------------------------------ live a11y settings */

/**
 * A tiny external store over one AccessibilityInfo setting: a single native
 * subscription shared by every component that reads it (a 40-peg board would
 * otherwise hold 40 listeners). `null` until the first read comes back.
 */
function a11ySetting(
  read: () => Promise<boolean>,
  event: 'reduceMotionChanged' | 'screenReaderChanged',
) {
  let value: boolean | null = null;
  let started = false;
  const listeners = new Set<() => void>();
  const set = (v: boolean) => {
    if (value === v) return;
    value = v;
    listeners.forEach((l) => l());
  };
  const start = () => {
    if (started) return;
    started = true;
    try {
      read().then(set, () => {});
      // app-lifetime subscription: never removed, so never re-armed
      AccessibilityInfo.addEventListener(event, set);
    } catch {
      /* not supported on this platform: keep the fallback */
    }
  };
  return {
    subscribe(cb: () => void) {
      start();
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    get: () => value,
  };
}

const reduceMotionSetting = a11ySetting(
  () => AccessibilityInfo.isReduceMotionEnabled(),
  'reduceMotionChanged',
);
const screenReaderSetting = a11ySetting(
  () => AccessibilityInfo.isScreenReaderEnabled(),
  'screenReaderChanged',
);

/**
 * Reduce Motion, kept live. Reanimated's `useReducedMotion` is read once at
 * launch and never changes, so switching the setting mid-game used to need an
 * app restart. That launch value still seeds the first frame, so nothing
 * animates while the async read is in flight.
 */
export function useReduceMotion(): boolean {
  const atLaunch = useReducedMotionAtLaunch();
  const live = useSyncExternalStore(
    reduceMotionSetting.subscribe,
    reduceMotionSetting.get,
    reduceMotionSetting.get,
  );
  return live ?? atLaunch;
}

/** How long a line must stay put before VoiceOver reads it out. */
const ANNOUNCE_SETTLE_MS = 350;

/**
 * Speaks `text` through VoiceOver once it has held still for a moment.
 *
 * iOS only: `accessibilityLiveRegion` (which the banner keeps) already does
 * this on Android, and the web has no screen-reader announce API in RN. The
 * settle delay swallows the transient lines ("…is rolling") that flash past
 * between two states worth hearing, and the same line is never read twice in
 * a row. An empty string cancels whatever was waiting.
 */
export function useAnnouncement(text: string) {
  const screenReader = useSyncExternalStore(
    screenReaderSetting.subscribe,
    screenReaderSetting.get,
    screenReaderSetting.get,
  );
  const last = useRef('');
  useEffect(() => {
    if (Platform.OS !== 'ios' || !screenReader || !text) return;
    if (text === last.current) return;
    const id = setTimeout(() => {
      last.current = text;
      try {
        AccessibilityInfo.announceForAccessibility(text);
      } catch {
        /* never let an announcement break a turn */
      }
    }, ANNOUNCE_SETTLE_MS);
    return () => clearTimeout(id);
  }, [text, screenReader]);
}
