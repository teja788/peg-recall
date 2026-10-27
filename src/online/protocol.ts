/**
 * Online rooms: the messages between a player's device and the room server
 * (PLAN-web-online.md §B5), shared by both sides.
 *
 * Every message is one small JSON object with a `type`. Devices only ever
 * send *intents* ("I roll", "I pick peg 12"); the server is the referee: it
 * checks them with the engine's own reducer, numbers them (`seq`) and sends
 * them to everyone, so every screen applies the same actions in the same
 * order.
 *
 * Pure TypeScript: no React Native, no Node. Everything that arrives from the
 * network goes through `parseClientMessage` / `parseServerMessage`, which
 * accept only the exact shapes below.
 */

import type {
  AvatarId,
  BoardSize,
  Difficulty,
  GameAction,
  GameConfig,
  GameState,
} from '../engine/types';
import { BOARD_SPECS } from '../engine/types';
import { cleanName } from '../store/settingsModel';
import { isBlockedName } from './nameFilter';

/** Bumped when a message changes shape. The server accepts this one and the one before. */
export const PROTOCOL = 1;
/** Bumped when the engine's rules change what a game does: a room never mixes rules. */
export const RULES_VERSION = 1;
/** Largest message either side accepts, in UTF-16 code units of the raw JSON. */
export const MAX_MESSAGE_CHARS = 2048;
export const MAX_SEATS = 4;
/** Room codes: 6 digits ("482 913" on screen). Digits read aloud in every language. */
export const CODE_LENGTH = 6;

export type AppPlatform = 'ios' | 'web';
export type TimerMode = 'relaxed' | 'quick';
export type RoomStatus = 'lobby' | 'playing' | 'over';

/** What the host chose. Tie-break follows Kid mode, as in a local game. */
export interface RoomSettings {
  board: BoardSize;
  bonusTurnOnMatch: boolean;
  kidMode: boolean;
  maxSeats: 2 | 3 | 4;
  timer: TimerMode;
}

export interface SeatInfo {
  /** 'p1'..'p4', the engine's player id */
  id: string;
  kind: 'human' | 'ai';
  avatar: AvatarId;
  name?: string;
  difficulty?: Difficulty;
  /** a person with a live connection (computer seats are always online) */
  online: boolean;
  /** a person who left or was removed mid-game: the computer finishes for them */
  left?: true;
}

export interface RoomInfo {
  code: string;
  status: RoomStatus;
  /** seat id of the host, who starts games and manages seats */
  host: string;
  settings: RoomSettings;
  /** filled seats, in seat order */
  seats: SeatInfo[];
}

/** A move a device may ask for. Everything else the server does by itself. */
export type Intent = { type: 'ROLL' } | { type: 'PICK'; pegIndex: number };

export type ClientMessage =
  | { type: 'hello'; protocol: number; rules: number; app: AppPlatform; appVersion: string }
  | { type: 'create'; settings: RoomSettings; name?: string; avatar: AvatarId; unlocked: boolean }
  | { type: 'join'; code: string; name?: string; avatar: AvatarId }
  | { type: 'resume'; code: string; token: string }
  | { type: 'addBot'; difficulty: Difficulty }
  | { type: 'removeSeat'; seat: string }
  | { type: 'start' }
  | { type: 'rematch' }
  | { type: 'intent'; action: Intent }
  | { type: 'leave' }
  | { type: 'ping'; t: number };

export type ErrorCode =
  /** the app is too old for this server: update it */
  | 'update'
  /** the app is newer than this server (protocol or game rules): try again
   *  once the server is updated */
  | 'rules'
  | 'notFound'
  | 'full'
  | 'started'
  /** the free host limits (PLAN-web-online.md §B2) */
  | 'needsUnlock'
  /** the host removed this person from the room: no coming back */
  | 'removed'
  | 'notHost'
  | 'rate'
  | 'bad';

/** `replaced`: the same seat was taken up on another connection (a second
 *  window, a newer network): this one stops and does not come back. */
export type EndReason = 'expired' | 'hostClosed' | 'removed' | 'serverRestart' | 'replaced';

export type ServerMessage =
  | { type: 'welcome'; serverTime: number }
  | { type: 'room'; room: RoomInfo }
  /** your seat; keep the token to come back after a dropped connection */
  | { type: 'joined'; code: string; seat: string; token: string }
  /** a new board: seq 0 is `createGame(config)`, applied at server time `at` */
  | { type: 'started'; config: GameConfig; seq: 0; at: number }
  /** the action numbered `seq`, applied at server time `at`; `by` is the seat
   *  whose move it is, null for the server's own steps (reveal end, result
   *  end); `standIn` when the server played it for a person who was away or
   *  out of time; `hash` is `stateHash` after it */
  | {
      type: 'action';
      seq: number;
      action: GameAction;
      by: string | null;
      standIn?: true;
      at: number;
      hash: string;
    }
  /** the whole game as of `seq` (on joining late, coming back, or a mismatch) */
  | { type: 'snapshot'; state: GameState; seq: number; at: number }
  | { type: 'error'; code: ErrorCode }
  | { type: 'ended'; reason: EndReason }
  | { type: 'pong'; t: number; serverTime: number };

/* ------------------------------------------------------------- helpers */

const AVATARS: readonly AvatarId[] = ['fox', 'owl', 'bear', 'frog', 'bunny', 'cat'];
const DIFFICULTIES: readonly Difficulty[] = ['bunny', 'fox', 'owl'];
const SEAT_IDS = ['p1', 'p2', 'p3', 'p4'];
const MAX_PEGS = Math.max(...Object.values(BOARD_SPECS).map((b) => b.pegs));

/** "482 913", "482-913" or "482913" → "482913"; anything else → null. */
export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[\s\-.]/g, '');
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(digits) ? digits : null;
}

/** "482913" → "482 913", for screens and invites. */
export function formatCode(code: string): string {
  return code.length === CODE_LENGTH ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

function parseJson(raw: unknown): Obj | null {
  if (typeof raw !== 'string' || raw.length > MAX_MESSAGE_CHARS) return null;
  try {
    const v: unknown = JSON.parse(raw);
    return isObj(v) && typeof v.type === 'string' ? v : null;
  } catch {
    return null;
  }
}

/** A typed name, cleaned like the app's own (`cleanName`); '' → no name,
 *  and so is a name with a word the room should not see (nameFilter.ts):
 *  that player shows as their animal. */
function nameOf(v: unknown): string | undefined | null {
  if (v === undefined) return undefined;
  if (typeof v !== 'string') return null;
  const name = cleanName(v);
  return name && !isBlockedName(name) ? name : undefined;
}

function settingsOf(v: unknown): RoomSettings | null {
  if (!isObj(v)) return null;
  const { board, bonusTurnOnMatch, kidMode, maxSeats, timer } = v;
  if (!oneOf(Object.keys(BOARD_SPECS) as BoardSize[], board)) return null;
  if (typeof bonusTurnOnMatch !== 'boolean' || typeof kidMode !== 'boolean') return null;
  if (maxSeats !== 2 && maxSeats !== 3 && maxSeats !== 4) return null;
  if (!oneOf(['relaxed', 'quick'] as const, timer)) return null;
  return { board, bonusTurnOnMatch, kidMode, maxSeats, timer };
}

function intentOf(v: unknown): Intent | null {
  if (!isObj(v)) return null;
  if (v.type === 'ROLL') return { type: 'ROLL' };
  if (v.type === 'PICK' && isInt(v.pegIndex) && v.pegIndex >= 0 && v.pegIndex < MAX_PEGS) {
    return { type: 'PICK', pegIndex: v.pegIndex };
  }
  return null;
}

/* -------------------------------------------------------------- parsing */

/** A message from a device, exactly as allowed, or null. Run on the server. */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  const m = parseJson(raw);
  if (!m) return null;
  switch (m.type) {
    case 'hello': {
      const { protocol, rules, app, appVersion } = m;
      if (!isInt(protocol) || !isInt(rules) || !oneOf(['ios', 'web'] as const, app)) return null;
      if (typeof appVersion !== 'string' || appVersion.length > 20) return null;
      return { type: 'hello', protocol, rules, app, appVersion };
    }
    case 'create': {
      const settings = settingsOf(m.settings);
      const name = nameOf(m.name);
      if (!settings || name === null || !oneOf(AVATARS, m.avatar) || typeof m.unlocked !== 'boolean') return null;
      return { type: 'create', settings, ...(name ? { name } : {}), avatar: m.avatar, unlocked: m.unlocked };
    }
    case 'join': {
      const code = normalizeCode(m.code);
      const name = nameOf(m.name);
      if (!code || name === null || !oneOf(AVATARS, m.avatar)) return null;
      return { type: 'join', code, ...(name ? { name } : {}), avatar: m.avatar };
    }
    case 'resume': {
      const code = normalizeCode(m.code);
      if (!code || typeof m.token !== 'string' || !/^[0-9a-f]{32}$/.test(m.token)) return null;
      return { type: 'resume', code, token: m.token };
    }
    case 'addBot':
      return oneOf(DIFFICULTIES, m.difficulty) ? { type: 'addBot', difficulty: m.difficulty } : null;
    case 'removeSeat':
      return oneOf(SEAT_IDS, m.seat) ? { type: 'removeSeat', seat: m.seat } : null;
    case 'start':
    case 'rematch':
    case 'leave':
      return { type: m.type };
    case 'intent': {
      const action = intentOf(m.action);
      return action ? { type: 'intent', action } : null;
    }
    case 'ping':
      return typeof m.t === 'number' && Number.isFinite(m.t) ? { type: 'ping', t: m.t } : null;
    default:
      return null;
  }
}

/**
 * A message from the server, or null if it is not one. Run on the device.
 * The server is ours, so this checks the envelope (`type` and the fields the
 * device acts on), not every nested field of a game state.
 */
export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (typeof raw !== 'string') return null;
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(m)) return null;
  switch (m.type) {
    case 'welcome':
      return typeof m.serverTime === 'number' ? (m as ServerMessage) : null;
    case 'room':
      return isObj(m.room) && typeof m.room.code === 'string' && Array.isArray(m.room.seats) ? (m as ServerMessage) : null;
    case 'joined':
      return typeof m.code === 'string' && typeof m.seat === 'string' && typeof m.token === 'string' ? (m as ServerMessage) : null;
    case 'started':
      return isObj(m.config) && m.seq === 0 && typeof m.at === 'number' ? (m as ServerMessage) : null;
    case 'action':
      return isInt(m.seq) && isObj(m.action) && typeof m.at === 'number' && typeof m.hash === 'string'
        ? (m as ServerMessage)
        : null;
    case 'snapshot':
      return isObj(m.state) && isInt(m.seq) && typeof m.at === 'number' ? (m as ServerMessage) : null;
    case 'error':
      return typeof m.code === 'string' ? (m as ServerMessage) : null;
    case 'ended':
      return typeof m.reason === 'string' ? (m as ServerMessage) : null;
    case 'pong':
      return typeof m.t === 'number' && typeof m.serverTime === 'number' ? (m as ServerMessage) : null;
    default:
      return null;
  }
}
