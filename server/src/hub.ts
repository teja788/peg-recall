/**
 * The room server's front door: every connection's messages come in here, are
 * checked (`parseClientMessage`), limited, and handed to the right Room.
 *
 * Holds the room list and the counters, and nothing else: rooms live in
 * memory and disappear after their game (PLAN-web-online.md §B6). Logs and
 * counters never carry names, codes, tokens or addresses.
 *
 * No Node or Cloudflare here either: an adapter calls `connect` for each new
 * connection, passes its text messages to `message`, calls `closed` when it
 * goes, and calls `sweep` about once a minute.
 */

import { needsUnlock } from '../../src/online/limits';
import {
  PROTOCOL,
  RULES_VERSION,
  parseClientMessage,
  type AppPlatform,
  type ClientMessage,
  type ErrorCode,
  type ServerMessage,
} from '../../src/online/protocol';
import { Room } from './room';
import {
  DEFAULT_CONFIG,
  newStats,
  randomToken,
  randomUint32,
  type Clock,
  type Conn,
  type ServerConfig,
  type Stats,
} from './types';

export interface HubDeps {
  clock: Clock;
  config?: Partial<ServerConfig>;
  /** a 32-bit random number (room codes, game seeds) */
  random?: () => number;
  /** a seat token */
  token?: () => string;
}

interface ConnState {
  /** the address the connection came from: only for the create limit, never logged */
  ip: string;
  app: AppPlatform | null;
  room: Room | null;
  /** when recent messages arrived (the per-second limit) */
  recent: number[];
  /** when recent wrong codes were tried */
  badJoins: number[];
  /** the last message from this connection (devices ping every 20 s) */
  lastSeen: number;
}

export class Hub {
  readonly stats: Stats = newStats();
  readonly config: ServerConfig;
  private readonly rooms = new Map<string, Room>();
  private readonly conns = new Map<Conn, ConnState>();
  /** room creations per address in the last hour, in memory only */
  private readonly creates = new Map<string, number[]>();

  constructor(private readonly deps: HubDeps) {
    this.config = { ...DEFAULT_CONFIG, ...deps.config };
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  get connCount(): number {
    return this.conns.size;
  }

  /** A new connection. Nothing is said until its `hello`. */
  connect(conn: Conn, ip: string): void {
    this.conns.set(conn, { ip, app: null, room: null, recent: [], badJoins: [], lastSeen: this.deps.clock.now() });
  }

  /** The connection went away (closed, dropped, timed out). */
  closed(conn: Conn): void {
    const st = this.conns.get(conn);
    if (!st) return;
    st.room?.disconnect(conn);
    this.conns.delete(conn);
  }

  /** One text message from a connection. */
  message(conn: Conn, text: string): void {
    const st = this.conns.get(conn);
    if (!st) return;
    const now = this.deps.clock.now();
    st.lastSeen = now;

    st.recent = st.recent.filter((t) => now - t < 1000);
    st.recent.push(now);
    if (st.recent.length > this.config.messagesPerSecond) return this.refuse(conn, 'rate', true);

    const m = parseClientMessage(text);
    if (!m) return this.error(conn, 'bad');
    if (m.type !== 'hello' && !st.app) return this.error(conn, 'bad');
    this.handle(conn, st, m, now);
  }

  /** Close rooms that have outlived their welcome, and connections that went
   *  silent (a phone gone without a goodbye). Call about once a minute. */
  sweep(): void {
    const now = this.deps.clock.now();
    for (const [conn, st] of this.conns) {
      if (now - st.lastSeen <= this.config.idleMs) continue;
      this.closed(conn);
      conn.close();
    }
    for (const room of this.rooms.values()) {
      if (!room.expired(now)) continue;
      room.close('expired');
      this.rooms.delete(room.code);
      this.stats.roomsExpired++;
    }
    for (const [ip, times] of this.creates) {
      const kept = times.filter((t) => now - t < 3_600_000);
      if (kept.length) this.creates.set(ip, kept);
      else this.creates.delete(ip);
    }
  }

  /** The server is stopping: every room is told, every connection closed. */
  shutdown(): void {
    for (const room of this.rooms.values()) room.close('serverRestart');
    this.rooms.clear();
    for (const conn of this.conns.keys()) conn.close();
    this.conns.clear();
  }

  /* ------------------------------------------------------------- handling */

  private handle(conn: Conn, st: ConnState, m: ClientMessage, now: number): void {
    switch (m.type) {
      case 'hello': {
        // an older app must update; a newer one has to wait for this server
        if (m.protocol < PROTOCOL - 1 || m.rules < RULES_VERSION) return this.refuse(conn, 'update', true);
        if (m.protocol > PROTOCOL || m.rules > RULES_VERSION) return this.refuse(conn, 'rules', true);
        st.app = m.app;
        return this.send(conn, { type: 'welcome', serverTime: now });
      }

      case 'create': {
        const { settings } = m;
        if (needsUnlock(this.config.hostLimits, m.unlocked, { board: settings.board, maxSeats: settings.maxSeats })) {
          this.stats.needsUnlock++;
          return this.error(conn, 'needsUnlock');
        }
        const recent = (this.creates.get(st.ip) ?? []).filter((t) => now - t < 3_600_000);
        if (recent.length >= this.config.createsPerHour || this.rooms.size >= this.config.maxRooms) {
          return this.error(conn, 'rate');
        }
        this.creates.set(st.ip, [...recent, now]);
        this.leaveRoom(conn, st);
        const room = new Room(this.newCode(), settings, m.unlocked, {
          clock: this.deps.clock,
          config: this.config,
          stats: this.stats,
          release: (c) => this.release(c),
          onClosed: (r) => this.rooms.delete(r.code),
          random: this.deps.random,
          token: this.deps.token ?? randomToken,
        });
        this.rooms.set(room.code, room);
        const seat = room.addPerson(conn, m.name, m.avatar);
        if (typeof seat === 'string') return this.error(conn, seat);
        st.room = room;
        this.stats.roomsCreated[st.app!]++;
        return;
      }

      case 'join': {
        const room = this.rooms.get(m.code);
        if (!room) return this.wrongCode(conn, st, now);
        if (st.room === room) return;
        // guests are never limited: no needsUnlock check here
        const seat = room.addPerson(conn, m.name, m.avatar);
        if (typeof seat === 'string') return this.error(conn, seat);
        if (st.room) this.leaveRoom(conn, st);
        st.room = room;
        this.stats.joins[st.app!]++;
        return;
      }

      case 'resume': {
        const room = this.rooms.get(m.code);
        if (!room) return this.wrongCode(conn, st, now);
        if (st.room && st.room !== room) this.leaveRoom(conn, st);
        if (!room.resume(conn, m.token)) return this.error(conn, 'notFound');
        st.room = room;
        return;
      }

      case 'addBot': {
        const room = st.room;
        if (!room) return this.error(conn, 'bad');
        if (needsUnlock(this.config.hostLimits, room.unlocked, { bot: m.difficulty })) {
          this.stats.needsUnlock++;
          return this.error(conn, 'needsUnlock');
        }
        return this.maybeError(conn, room.addBot(conn, m.difficulty));
      }

      case 'removeSeat':
        return st.room ? this.maybeError(conn, st.room.removeSeat(conn, m.seat)) : this.error(conn, 'bad');

      case 'start':
      case 'rematch':
        return st.room ? this.maybeError(conn, st.room.start(conn)) : this.error(conn, 'bad');

      case 'intent':
        st.room?.intent(conn, m.action);
        return;

      case 'leave':
        this.leaveRoom(conn, st);
        return;

      case 'ping':
        return this.send(conn, { type: 'pong', t: m.t, serverTime: now });
    }
  }

  /* -------------------------------------------------------------- helpers */

  private leaveRoom(conn: Conn, st: ConnState): void {
    const room = st.room;
    if (!room) return;
    room.leave(conn);
    st.room = null;
  }

  /** The room let go of this connection (it was removed, or the room closed). */
  private release(conn: Conn): void {
    const st = this.conns.get(conn);
    if (st) st.room = null;
  }

  private wrongCode(conn: Conn, st: ConnState, now: number): void {
    st.badJoins = st.badJoins.filter((t) => now - t < 60_000);
    st.badJoins.push(now);
    if (st.badJoins.length > this.config.badJoinsPerMinute) return this.refuse(conn, 'rate', true);
    this.error(conn, 'notFound');
  }

  /** A fresh 6-digit code no open room is using. */
  private newCode(): string {
    const random = this.deps.random ?? randomUint32;
    for (;;) {
      const code = String(random() % 1_000_000).padStart(6, '0');
      if (!this.rooms.has(code)) return code;
    }
  }

  private maybeError(conn: Conn, code: ErrorCode | null): void {
    if (code) this.error(conn, code);
  }

  private error(conn: Conn, code: ErrorCode): void {
    this.send(conn, { type: 'error', code });
  }

  /** Say why, then (if `close`) hang up. */
  private refuse(conn: Conn, code: ErrorCode, close: boolean): void {
    this.error(conn, code);
    if (!close) return;
    this.closed(conn);
    conn.close();
  }

  private send(conn: Conn, msg: ServerMessage): void {
    try {
      conn.send(JSON.stringify(msg));
    } catch {
      /* a dying connection: its close will arrive */
    }
  }
}
