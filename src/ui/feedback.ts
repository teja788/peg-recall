/**
 * Sound + haptics. Both are "nice if they work" — every call is wrapped so a
 * missing clip or an iPad without a Taptic Engine can never break a turn.
 */
import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';

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

/** A miss is deliberately silent and buzz-free (PLAN.md section 4). */
export function hapticMiss() {
  /* intentionally nothing */
}
