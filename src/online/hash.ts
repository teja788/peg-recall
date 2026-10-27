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

const STATE_CODE = { hidden: 'h', revealed: 'r', captured: 'c' } as const;

/** The parts of a state that decide what happens next, in a fixed order. */
function canonical(s: GameState): string {
  const ids = s.config.players.map((p) => p.id);
  const pegs = s.pegs
    .map((p) => `${p.color[0]}${p.color[1]}${STATE_CODE[p.state]}${p.capturedBy ? ids.indexOf(p.capturedBy) : ''}`)
    .join('');
  return [
    s.phase,
    s.turn,
    s.activePlayer,
    s.dieColor ?? '-',
    s.suddenDeath ? 1 : 0,
    ids.map((id) => s.scores[id] ?? 0).join(','),
    ids.map((id) => s.suddenDeathScores?.[id] ?? 0).join(','),
    (s.activeSeats ?? []).join(','),
    s.winnerIds.join(','),
    `${s.rng.seed}:${s.rng.counter}`,
    pegs,
  ].join('|');
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
