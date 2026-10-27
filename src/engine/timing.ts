/**
 * Color Catch — how long the game's own steps take (ms).
 *
 * These are rules of the flow, not just looks: the app holds the board for
 * them while it animates, and the room server (PLAN-web-online.md §B3) waits
 * them out before its next automatic step, so every screen in a room stays in
 * step. The UI's other durations live in src/theme/tokens.ts, which re-exports
 * these.
 */

export const FLOW = {
  /** the die tumbling before it lands */
  dieTumble: 600,
  /** a match: the peg flies to the player's tray */
  matchTotal: 850,
  /** a miss: the peg shows its colour, then turns back down */
  missTotal: 1400,
  /** a computer seat's pause before it rolls */
  aiRollDelay: 400,
} as const;

/** How long the die is allowed to tumble, dead-colour rerolls included. */
export function tumbleMs(rerolls: number): number {
  // The roll rerolls internally until it finds a live colour — up to 64 times
  // near the end of a board. Showing all of them would freeze the screen for
  // twenty seconds, so the animation only ever acts out the first three.
  return FLOW.dieTumble + 300 * Math.min(Math.max(0, rerolls), 3);
}

/** How long the board is held after a pick before RESULT_DONE. */
export function resultMs(matched: boolean): number {
  return matched ? FLOW.matchTotal : FLOW.missTotal;
}
