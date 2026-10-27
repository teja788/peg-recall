/**
 * Where online play lives, set at build time (Expo inlines EXPO_PUBLIC_
 * variables into the bundle):
 *
 *   EXPO_PUBLIC_ROOMS_URL  the room server's WebSocket address,
 *                          e.g. wss://rooms.colorcatch.app/ws
 *   EXPO_PUBLIC_WEB_URL    the web game's address, for invite links,
 *                          e.g. https://colorcatch.pages.dev
 *
 * With no rooms address the online card stays hidden, so no build offers
 * online play before there is a server to play on. Local testing:
 *   EXPO_PUBLIC_ROOMS_URL=ws://localhost:8787/ws npx expo start --web
 */

import { Platform } from 'react-native';

export const ROOMS_URL = process.env.EXPO_PUBLIC_ROOMS_URL ?? '';
const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? '').replace(/\/+$/, '');

export const onlineEnabled = ROOMS_URL !== '';

/** The address an invite sends people to: the web game's join page, which
 *  opens the app instead where it can (later: universal links). Null when no
 *  web address is known: the invite then carries only the code. */
export function inviteUrl(code: string): string | null {
  let base = WEB_URL;
  if (!base && Platform.OS === 'web') {
    const origin = (globalThis as { location?: { origin?: string } }).location?.origin;
    if (origin?.startsWith('https://')) base = origin;
  }
  return base ? `${base}/join/${code}` : null;
}
