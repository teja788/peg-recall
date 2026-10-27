/**
 * What both adapters (node.ts, cloudflare.ts) answer the same way: which web
 * pages may open a socket, the /health and /stats bodies, and the largest
 * frame a device may send.
 */

import type { Hub } from './hub';

/** Largest frame accepted from a device (messages are well under 2 KB). */
export const MAX_FRAME_BYTES = 4096;

const encoder = new TextEncoder();

/** A text frame over MAX_FRAME_BYTES, counted in bytes (a character can take 3). */
export function frameTooBig(text: string): boolean {
  if (text.length * 3 <= MAX_FRAME_BYTES) return false;
  return text.length > MAX_FRAME_BYTES || encoder.encode(text).length > MAX_FRAME_BYTES;
}

/**
 * Browsers always send Origin: only the web game's own address(es) may open
 * a socket, or a page on this server's own host. The iOS app sends none (or
 * its server's address). An empty list lets anyone in (local testing).
 */
export function originAllowed(
  origin: string | null | undefined,
  host: string | null | undefined,
  origins: readonly string[],
): boolean {
  const listed = origins.filter(Boolean);
  if (!origin || listed.length === 0 || listed.includes(origin)) return true;
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function healthBody(hub: Hub) {
  return { ok: true, rooms: hub.roomCount, connections: hub.connCount };
}

/** Counts only (types.ts Stats): never names, codes or addresses. */
export function statsBody(hub: Hub) {
  return { rooms: hub.roomCount, connections: hub.connCount, ...hub.stats };
}

/** "Authorization: Bearer <token>", and only when a token is set at all. */
export function statsAllowed(authorization: string | null | undefined, token: string | undefined): boolean {
  return !!token && authorization === `Bearer ${token}`;
}
