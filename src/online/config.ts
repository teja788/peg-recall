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

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { formatCode } from './protocol';

export const ROOMS_URL = process.env.EXPO_PUBLIC_ROOMS_URL ?? '';
const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? '').replace(/\/+$/, '');

export const onlineEnabled = ROOMS_URL !== '';

/** The free host limits (src/online/limits.ts), matching the server's
 *  HOST_LIMITS: EXPO_PUBLIC_HOST_LIMITS=on. Off until decision D4. */
export const HOST_LIMITS = process.env.EXPO_PUBLIC_HOST_LIMITS === 'on';

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

/** Where "Report a problem" writes to: the contact address on the website. */
export const SUPPORT_EMAIL = 'ravibitspilani@gmail.com';

/** An email about a room, ready to write: the room code in the subject, so a
 *  report can be matched to the room (and the host told, or the name dealt
 *  with). Grown-ups write it; nothing is sent until they press Send. */
export function reportUrl(code: string, seat: string | null): string {
  const room = formatCode(code);
  const subject = `Color Catch online: room ${room}`;
  const body = [
    `Room: ${room}`,
    `My seat: ${seat ?? '-'}`,
    `App: ${Platform.OS} ${Constants.expoConfig?.version ?? ''}`.trim(),
    `Time: ${new Date().toISOString()}`,
    '',
    'What happened:',
    '',
  ].join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
