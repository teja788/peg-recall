/**
 * The app's one room store (roomStore.ts) over the real connection, storage
 * and game store. Coming back to the foreground wakes the connection at once
 * rather than waiting out its retry pause.
 */
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { RoomClient } from '../online/client';
import { ROOMS_URL } from '../online/config';
import { useGame } from './game';
import { createRoomStore } from './roomStore';
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

AppState.addEventListener('change', (next) => {
  if (next === 'active') client?.wake();
});
