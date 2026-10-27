/**
 * The online room this device is in (PLAN-web-online.md §B7): the connection,
 * the room as the server last described it, this device's seat, and the
 * seat token that brings it back after a drop, a reload or an app restart.
 *
 * Game messages (`started`, `action`, `snapshot`) go straight to the game
 * store's online mode; everything else lands here for the screens.
 *
 * A factory over its dependencies, like settingsStore.ts, so the tests can
 * build one over a fake connection; room.ts makes the app's instance.
 */

import { create } from 'zustand';

import type { AvatarId, Difficulty, GameAction, GameConfig, GameState } from '../engine/types';
import type { ConnStatus } from '../online/client';
import type {
  ClientMessage,
  EndReason,
  ErrorCode,
  Intent,
  RoomInfo,
  RoomSettings,
  ServerMessage,
} from '../online/protocol';
import type { KeyValueStorage } from './storage';

export const ROOM_KEY = 'pegrecall.room.v1';
/** A saved seat older than a room can live is not worth trying. */
const SEAT_TTL_MS = 4 * 60 * 60_000;

/** The connection, as the store needs it (RoomClient, or a fake). */
export interface RoomConnection {
  connect(): void;
  send(m: ClientMessage): boolean;
  close(): void;
}

export interface ConnectionHooks {
  onMessage: (m: ServerMessage) => void;
  onStatus: (s: ConnStatus) => void;
  onReady: () => void;
}

/** What the store drives in the game store (its online mode). */
export interface GameSink {
  remoteStart: (config: GameConfig, seat: SeatLink) => void;
  remoteSnapshot: (state: GameState, seq: number, seat: SeatLink) => void;
  remoteAction: (seq: number, action: GameAction, hash: string) => void;
}

export interface SeatLink {
  seat: string;
  send: (intent: Intent) => void;
  resync: () => void;
}

export interface RoomDeps {
  connect: (hooks: ConnectionHooks) => RoomConnection;
  storage: KeyValueStorage;
  game: GameSink;
  now?: () => number;
}

export interface RoomStore {
  status: ConnStatus;
  code: string | null;
  seat: string | null;
  room: RoomInfo | null;
  /** the server's last refusal, for the screen to explain; cleared on the next request */
  error: ErrorCode | null;
  /** why this device is no longer in the room */
  ended: EndReason | null;

  create: (settings: RoomSettings, name: string | undefined, avatar: AvatarId, unlocked: boolean) => void;
  join: (code: string, name: string | undefined, avatar: AvatarId) => void;
  /** Back into the room saved on this device (after a reload or a restart).
   *  Resolves false when there is none for `code`. */
  rejoin: (code?: string) => Promise<boolean>;
  start: () => void;
  rematch: () => void;
  addBot: (difficulty: Difficulty) => void;
  removeSeat: (seat: string) => void;
  /** Leave the room for good and hang up. */
  leave: () => void;
  /** Forget an ended room or a refusal the screen has shown. */
  clear: () => void;
}

interface Saved {
  code: string;
  token: string;
  at: number;
}

export function createRoomStore(deps: RoomDeps) {
  const now = deps.now ?? (() => Date.now());

  return create<RoomStore>((setState, getState) => {
    let conn: RoomConnection | null = null;
    let token: string | null = null;
    /** sent as soon as the line is up (create / join) */
    let pending: ClientMessage | null = null;

    function save(code: string | null, tok: string | null) {
      token = tok;
      const value = code && tok ? JSON.stringify({ code, token: tok, at: now() } satisfies Saved) : '';
      void deps.storage.setItem(ROOM_KEY, value).catch(() => {});
    }

    function link(): SeatLink {
      return {
        seat: getState().seat ?? '',
        send: (intent) => void conn?.send({ type: 'intent', action: intent }),
        resync: () => resume(),
      };
    }

    function resume() {
      const { code } = getState();
      if (code && token) conn?.send({ type: 'resume', code, token });
    }

    function line(): RoomConnection {
      if (conn) return conn;
      conn = deps.connect({
        onStatus: (status) => setState({ status }),
        onReady: () => {
          // back after a drop: the seat first; else whatever was asked for
          if (getState().code && token) resume();
          else if (pending) conn?.send(pending);
          pending = null;
        },
        onMessage: (m) => receive(m),
      });
      conn.connect();
      return conn;
    }

    /** Send now if the line is up, else as soon as it is. */
    function request(m: ClientMessage) {
      setState({ error: null, ended: null });
      const c = line();
      if (!c.send(m)) pending = m;
    }

    function receive(m: ServerMessage) {
      switch (m.type) {
        case 'joined':
          setState({ code: m.code, seat: m.seat, error: null, ended: null });
          save(m.code, m.token);
          return;
        case 'room':
          setState({ room: m.room });
          return;
        case 'started':
          deps.game.remoteStart(m.config, link());
          return;
        case 'snapshot':
          deps.game.remoteSnapshot(m.state, m.seq, link());
          return;
        case 'action':
          deps.game.remoteAction(m.seq, m.action, m.hash);
          return;
        case 'error':
          // a saved seat that is gone (the room closed meanwhile)
          if (m.code === 'notFound' && token && !pending) {
            save(null, null);
            setState({ code: null, seat: null, room: null });
          }
          setState({ error: m.code });
          return;
        case 'ended':
          save(null, null);
          setState({ ended: m.reason, code: null, seat: null });
          return;
        default:
          return;
      }
    }

    return {
      status: 'idle',
      code: null,
      seat: null,
      room: null,
      error: null,
      ended: null,

      create: (settings, name, avatar, unlocked) =>
        request({ type: 'create', settings, ...(name ? { name } : {}), avatar, unlocked }),

      join: (code, name, avatar) => {
        // a different room than the saved one: that seat is given up
        if (getState().code && getState().code !== code) {
          conn?.send({ type: 'leave' });
          save(null, null);
          setState({ code: null, seat: null, room: null });
        }
        request({ type: 'join', code, ...(name ? { name } : {}), avatar });
      },

      rejoin: async (code) => {
        if (getState().seat && (!code || getState().code === code)) return true;
        let saved: Saved | null = null;
        try {
          const raw = await deps.storage.getItem(ROOM_KEY);
          saved = raw ? (JSON.parse(raw) as Saved) : null;
        } catch {
          saved = null;
        }
        if (!saved?.code || !saved.token || now() - saved.at > SEAT_TTL_MS) return false;
        if (code && saved.code !== code) return false;
        token = saved.token;
        setState({ code: saved.code, error: null, ended: null });
        // now if the line is up; else onReady resumes once it is
        line().send({ type: 'resume', code: saved.code, token: saved.token });
        return true;
      },

      start: () => request({ type: 'start' }),
      rematch: () => request({ type: 'rematch' }),
      addBot: (difficulty) => request({ type: 'addBot', difficulty }),
      removeSeat: (seat) => request({ type: 'removeSeat', seat }),

      leave: () => {
        conn?.send({ type: 'leave' });
        conn?.close();
        conn = null;
        pending = null;
        save(null, null);
        setState({ status: 'idle', code: null, seat: null, room: null, error: null });
      },

      clear: () => setState({ error: null, ended: null }),
    };
  });
}
