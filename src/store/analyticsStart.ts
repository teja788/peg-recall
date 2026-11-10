/**
 * Starts the play counts at launch (app/_layout.tsx). Set at build time:
 *
 *   EXPO_PUBLIC_COUNTS_URL  the counts Worker's POST address,
 *                           e.g. https://app-counts.<account>.workers.dev/c
 *
 * Without it nothing is counted or sent.
 */

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { lang } from '../i18n';
import { setCounts } from './analytics';
import { createCounts, type Counts } from './counts';
import { storage } from './storage';

const URL = process.env.EXPO_PUBLIC_COUNTS_URL ?? '';

let counts: Counts | null = null;

/** Safe to call twice (React runs effects twice in development): one counter. */
export function startAnalytics(): () => void {
  if (!URL) return () => {};
  counts ??= createCounts({
    app: 'color-catch',
    url: URL,
    storage,
    version: Constants.expoConfig?.version ?? '?',
    platform: Platform.OS === 'ios' ? (Platform.isPad ? 'ios-pad' : 'ios-phone') : Platform.OS,
    // read at each post: the language is only known once the settings are in
    get lang() {
      return lang();
    },
    // web: a first visit with nothing stored counts as the install
    installedAt: async () =>
      Platform.OS === 'web' ? Date.now() : ((await Application.getInstallationTimeAsync())?.getTime() ?? null),
  });
  const c = counts;
  setCounts(c);
  c.foreground(true);
  const sub = AppState.addEventListener('change', (s) => c.foreground(s === 'active'));
  return () => sub.remove();
}
