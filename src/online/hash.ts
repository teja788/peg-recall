/**
 * A short fingerprint of everything a game state means for play, so a device
 * can check after each action that its board is the server's board
 * (PLAN-web-online.md §B3). Equal states give equal hashes on every engine;
 * a mismatch means "ask for a snapshot".
 *
 * FNV-1a, 32 bits: not for security, only to catch a device that drifted
 * (a bug, or a message it never got).
 */

import type { GameState } from '../engine/types';

/**
 * Every field of the state, in a fixed order: the rules and players, the
 * board, every peg (index, colour, state, who took it), the die, the scores,
 * the last move, the rng. Missing any of them would let two states that play
 * differently share a fingerprint (audit F07). JSON keeps names with any
 * characters in them unambiguous.
 */
function canonical(s: GameState): string {
  const c = s.config;
  const ids = c.players.map((p) => p.id);
  const lm = s.lastMove;
  return JSON.stringify([
    c.boardSize,
    c.seed,
    [c.rules.bonusTurnOnMatch, c.rules.tieBreak, c.rules.kidMode],
    c.players.map((p) => [p.id, p.kind, p.avatar, p.difficulty ?? null, p.name ?? null]),
    [s.spec.size, s.spec.cols, s.spec.rows, s.spec.pegs, s.spec.revealMs],
    s.pegs.map((p) => [p.index, p.color, p.state, p.capturedBy ?? null]),
    s.phase,
    s.turn,
    s.activePlayer,
    s.dieColor,
    s.dieRerolls ?? 0,
    s.suddenDeath,
    ids.map((id) => s.scores[id] ?? 0),
    ids.map((id) => s.suddenDeathScores?.[id] ?? 0),
    s.activeSeats ?? [],
    s.winnerIds,
    lm ? [lm.playerId, lm.pegIndex, lm.dieColor, lm.matched] : null,
    [s.rng.seed, s.rng.counter],
  ]);
}

/** 8 hex characters. */
export function stateHash(state: GameState): string {
  const text = canonical(state);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
