/**
 * The "Who's playing?" sheet's decisions, as pure functions (no React Native)
 * so they can be tested: which seat a recent-name chip fills, which chips are
 * already in the lineup, and what VoiceOver says for a seat.
 */

/** Chips shown under the seats (the store remembers a few more). */
export const CHIPS_SHOWN = 6;

/**
 * The seat a tapped chip fills: the field being edited, else the first seat in
 * play still on its default (animal) name. -1 = every seat already has a typed
 * name and none is focused, so the chip has nowhere to go.
 *
 * `stored` are the stored names ('' = default), one per seat.
 */
export function chipTarget(focused: number | null, stored: readonly string[], seats: number): number {
  if (focused != null && Number.isInteger(focused) && focused >= 0 && focused < seats) return focused;
  for (let i = 0; i < Math.min(seats, stored.length); i++) {
    if (!stored[i]) return i;
  }
  return -1;
}

/** Is this name already on one of the seats in play (ignoring case)? */
export function inLineup(name: string, stored: readonly string[], seats: number): boolean {
  const key = name.trim().toLowerCase();
  if (!key) return false;
  return stored.slice(0, seats).some((n) => n.trim().toLowerCase() === key);
}

/** "Player 1, Fox, named Maya" — or just "Player 1, Fox" on the default name. */
export function seatLabel(seat: number, animal: string, stored: string): string {
  const base = `Player ${seat + 1}, ${animal}`;
  return stored ? `${base}, named ${stored}` : base;
}
