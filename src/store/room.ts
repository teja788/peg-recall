/**
 * The app's one room store (roomStore.ts) over the real connection, storage
 * and game store. Coming back to the foreground wakes the connection at once
 * rather than waiting out its retry pause.
 */
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { RoomClient } from '../online/client';
import { ROOMS_URL } from '../online/config';
import { hostGamesLeft } from '../online/limits';
import { count } from './analytics';
import { useGame } from './game';
import { createRoomStore } from './roomStore';
import { useSettings } from './settings';
import type { Settings } from './settingsModel';
import { localDay } from './statsModel';
import { storage } from './storage';

let client: RoomClient | null = null;

export const useRoom = createRoomStore({
  storage,
  game: {
    remoteStart: (config, seat) => useGame.getState().remoteStart(config, seat),
    remoteSnapshot: (state, seq, seat) => useGame.getState().remoteSnapshot(state, seq, seat),
    remoteAction: (seq, action, hash) => useGame.getState().remoteAction(seq, action, hash),
  },
  connect: (hooks) => {
    client = new RoomClient({
      url: ROOMS_URL,
      app: Platform.OS === 'web' ? 'web' : 'ios',
      appVersion: Constants.expoConfig?.version ?? 'unknown',
      ...hooks,
    });
    const c = client;
    return {
      connect: () => c.connect(),
      send: (m) => c.send(m),
      close: () => {
        c.close();
        if (client === c) client = null;
      },
    };
  },
});

/** Server time now (this device's clock corrected by the measured offset). */
export function serverNow(): number {
  return client?.serverNow() ?? Date.now();
}

/** Online games this device can still host today (Infinity: no limit). */
export function hostGamesLeftToday(s: Pick<Settings, 'unlocked' | 'hostedToday'>): number {
  return hostGamesLeft(s.unlocked, Platform.OS === 'web', s.hostedToday, localDay(Date.now()));
}

/** The host is starting an online game (Start, or Play again): true, and it
 *  counts toward today's free games; false when none are left, and the caller
 *  opens the unlock sheet instead. A game already on is never cut off. */
export function takeHostGame(): boolean {
  const s = useSettings.getState();
  const left = hostGamesLeftToday(s);
  if (left <= 0) {
    count({ 'host.limit': 1 });
    return false;
  }
  if (left !== Infinity) {
    const day = localDay(Date.now());
    s.set('hostedToday', { day, n: (s.hostedToday.day === day ? s.hostedToday.n : 0) + 1 });
  }
  return true;
}

AppState.addEventListener('change', (next) => {
  if (next === 'active') client?.wake();
});
