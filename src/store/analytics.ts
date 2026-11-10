/**
 * Anonymous play counts (counts.ts, copied from the ship-ios-app skill's
 * app-counts): totals per day, no ID. Imports no native module, so the game
 * store and its tests can count here; analyticsStart.ts plugs in the real
 * counter at launch, and until then (or in a build without
 * EXPO_PUBLIC_COUNTS_URL) nothing is counted.
 */

import type { GameState } from '../engine/types';
import type { Counts } from './counts';

let counts: Counts | null = null;

export function setCounts(c: Counts | null): void {
  counts = c;
}

export function count(n: Record<string, number>): void {
  try {
    counts?.add(n);
  } catch {
    /* counting must never break the game */
  }
}

/** The keys one finished game adds: how it was played, not who played. */
export function gameKeys(state: GameState, opts: { daily?: boolean; online?: boolean } = {}): Record<string, number> {
  const { players, boardSize } = state.config;
  const vsAi = players.some((p) => p.kind === 'ai');
  const how = opts.online ? 'online' : vsAi ? 'ai' : 'local';
  return {
    game: 1,
    [`game.${how}`]: 1,
    [`board.${boardSize}`]: 1,
    [`players.${players.length}`]: 1,
    ...(opts.daily ? { daily: 1 } : {}),
    ...(state.config.rules.kidMode ? { kid: 1 } : {}),
  };
}
