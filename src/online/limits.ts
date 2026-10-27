/**
 * What a free host may set up (PLAN-web-online.md §B2). The money model is
 * not decided yet (D4), so the rule is one switch: the room server reads it
 * from its HOST_LIMITS setting (off by default, for the beta), and the app
 * will use the same function to know when to show the unlock offer.
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
