/**
 * What the room logic needs from wherever it runs. room.ts and hub.ts never
 * touch Node or Cloudflare directly: an adapter (node.ts today; a Cloudflare
 * Durable Object later, if D3 goes that way) supplies these.
 */

/** Time and timers. Real in production; a fake one in the tests. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** One device's open connection. */
export interface Conn {
  send(text: string): void;
  close(): void;
}

export interface ServerConfig {
  /** the free host limits (src/online/limits.ts); off for the beta */
  hostLimits: boolean;
  maxRooms: number;
  /** rooms one address may create per hour */
  createsPerHour: number;
  /** wrong codes one connection may try per minute before it is closed */
  badJoinsPerMinute: number;
  /** messages one connection may send per second before it is closed */
  messagesPerSecond: number;
  /** a person who dropped out gets this long before the computer plays for them */
  awayGraceMs: number;
  /** a connection that sends nothing for this long is closed (devices ping every 20 s) */
  idleMs: number;
  /** a person who is here but does not move: per roll or pick */
  turnMs: { relaxed: number; quick: number };
  /** how long rooms live (§B6) */
  lobbyIdleMs: number;
  emptyGameMs: number;
  finishedMs: number;
  maxRoomMs: number;
}

export const DEFAULT_CONFIG: ServerConfig = {
  hostLimits: false,
  maxRooms: 2000,
  createsPerHour: 10,
  badJoinsPerMinute: 10,
  messagesPerSecond: 20,
  awayGraceMs: 15_000,
  idleMs: 90_000,
  turnMs: { relaxed: 60_000, quick: 20_000 },
  lobbyIdleMs: 30 * 60_000,
  emptyGameMs: 10 * 60_000,
  finishedMs: 15 * 60_000,
  maxRoomMs: 4 * 60 * 60_000,
};

/** Counts only: no names, no codes, no addresses (PLAN-web-online.md §B12). */
export interface Stats {
  roomsCreated: { ios: number; web: number };
  joins: { ios: number; web: number };
  gamesStarted: number;
  gamesFinished: number;
  rematches: number;
  standInMoves: number;
  needsUnlock: number;
  roomsExpired: number;
}

export function newStats(): Stats {
  return {
    roomsCreated: { ios: 0, web: 0 },
    joins: { ios: 0, web: 0 },
    gamesStarted: 0,
    gamesFinished: 0,
    rematches: 0,
    standInMoves: 0,
    needsUnlock: 0,
    roomsExpired: 0,
  };
}

/** Random numbers from the platform (Node 22 and Workers both have Web Crypto). */
export function randomUint32(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/** 128 random bits as 32 hex characters: a seat token. */
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
