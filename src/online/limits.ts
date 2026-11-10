/**
 * What a free host may do online. D4 (owner, Nov 10 2026): in the iOS app a
 * host without the unlock starts up to FREE_HOST_GAMES games a day, then gets
 * the unlock offer; the web game hosts without limit for now
 * (`hostGamesLeft`). The older board/seat rule (`needsUnlock`, the server's
 * HOST_LIMITS) stays off.
 *
 * Joining is never limited: guests always play free, on any board.
 */

import type { BoardSize, Difficulty } from '../engine/types';

/** Boards a free host can pick. */
export const FREE_BOARDS: readonly BoardSize[] = ['small', 'classic'];
/** Seats (people and computers) a free host's room can have. */
export const FREE_SEATS = 2;

/** true when this would need the unlock: limits on, host not unlocked, and
 *  a bigger board, more than two seats, or Owl in a computer seat. */
export function needsUnlock(
  limitsOn: boolean,
  unlocked: boolean,
  ask: { board?: BoardSize; maxSeats?: number; bot?: Difficulty },
): boolean {
  if (!limitsOn || unlocked) return false;
  if (ask.board !== undefined && !FREE_BOARDS.includes(ask.board)) return true;
  if (ask.maxSeats !== undefined && ask.maxSeats > FREE_SEATS) return true;
  return ask.bot === 'owl';
}

/** Online games a free host can start in a day, in the iOS app (D4). The web
 *  game, guests and an unlocked host have no daily limit. */
export const FREE_HOST_GAMES = 3;

/** Games hosted on `day` (local YYYY-MM-DD): the count is only today's. */
export interface Hosted {
  day: string;
  n: number;
}

/** Online games this host can still start today; Infinity when there is no
 *  limit (unlocked, or the web game). */
export function hostGamesLeft(unlocked: boolean, web: boolean, hosted: Hosted, today: string): number {
  if (unlocked || web) return Infinity;
  return Math.max(0, FREE_HOST_GAMES - (hosted.day === today ? hosted.n : 0));
}
