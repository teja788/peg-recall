/**
 * Per-player win stats: the data and the pure rules. The zustand store around
 * it lives in stats.ts.
 *
 * Players are tracked by NAME when they typed one ("Maya" on any seat, any
 * animal, is the same Maya) and by ANIMAL when they did not ("Fox" is whoever
 * sat as the fox without a name). Only human seats are tracked; games against
 * the computer also feed a per-difficulty record with a win streak.
 */

import type { AvatarId, Difficulty, GameState, PlayerSpec } from '../engine/types';
import { playerLabel } from '../ui/names';
import { AVATAR_CYCLE, cleanName } from './settingsModel';

export interface WinRecord {
  played: number;
  wins: number;
}

export interface PlayerStats extends WinRecord {
  key: string;
  label: string;
  avatar: AvatarId;
  lastPlayed: number;
}

export interface VsAiStats extends WinRecord {
  streak: number;
  bestStreak: number;
}

export interface Stats {
  version: 1;
  /** human seats only, keyed by `playerKey` */
  players: Record<string, PlayerStats>;
  vsAi: Record<Difficulty, VsAiStats>;
  gamesFinished: number;
  /** distinct local YYYY-MM-DD days a game was finished on, oldest first, last 30 */
  finishedDays: string[];
  /** app version the review prompt was last shown for */
  reviewAskedVersion: string | null;
}

export const STATS_KEY = 'pegrecall.stats.v1';
/** Most players remembered; the least recently played is dropped past this. */
export const MAX_PLAYERS = 50;
/** How many distinct play days are kept (enough for the review rule). */
export const MAX_DAYS = 30;

const DIFFICULTIES: Difficulty[] = ['bunny', 'fox', 'owl'];

function emptyVsAi(): VsAiStats {
  return { played: 0, wins: 0, streak: 0, bestStreak: 0 };
}

/** A fresh, mutable empty record. */
export function emptyStats(): Stats {
  return {
    version: 1,
    players: {},
    vsAi: { bunny: emptyVsAi(), fox: emptyVsAi(), owl: emptyVsAi() },
    gamesFinished: 0,
    finishedDays: [],
    reviewAskedVersion: null,
  };
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    for (const v of Object.values(o as object)) deepFreeze(v);
    Object.freeze(o);
  }
  return o;
}

/** Frozen: every function here returns new objects and never mutates this. */
export const EMPTY_STATS: Stats = deepFreeze(emptyStats());

/** 'name:maya' for a typed name, else 'animal:fox'. */
export function playerKey(spec: PlayerSpec): string {
  const name = typeof spec.name === 'string' ? spec.name.trim() : '';
  return name ? `name:${name.toLocaleLowerCase()}` : `animal:${spec.avatar}`;
}

/** Local calendar day, YYYY-MM-DD. */
export function localDay(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDay(days: string[], day: string): string[] {
  if (days.includes(day)) return days;
  return [...days, day].sort().slice(-MAX_DAYS);
}

/** Drop the least recently played players until at most MAX_PLAYERS remain. */
function capPlayers(players: Record<string, PlayerStats>): Record<string, PlayerStats> {
  const keys = Object.keys(players);
  if (keys.length <= MAX_PLAYERS) return players;
  const keep = keys
    .sort((a, b) => players[b].lastPlayed - players[a].lastPlayed || (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, MAX_PLAYERS);
  const out: Record<string, PlayerStats> = {};
  for (const k of keep) out[k] = players[k];
  return out;
}

/**
 * Fold one finished game into the stats. Pure; returns `stats` itself when
 * the game is not finished (so a caller can compare by identity).
 *
 * The winners are `state.winnerIds` at game over: a sudden-death winner is the
 * sole winner, and a shared (kid-mode) tie is a win for every tied seat.
 */
export function applyGameResult(stats: Stats, state: GameState, now: number): Stats {
  if (!state || state.phase !== 'gameOver') return stats;
  const winners = new Set(state.winnerIds ?? []);
  if (winners.size === 0) return stats;
  const seats = state.config?.players ?? [];
  const humans = seats.filter((p) => p.kind === 'human');
  if (humans.length === 0) return stats;

  // Two seats can resolve to one key ("Sam" and "sam"): count that player once.
  const byKey = new Map<string, { spec: PlayerSpec; won: boolean }>();
  for (const spec of humans) {
    const key = playerKey(spec);
    const prev = byKey.get(key);
    const won = winners.has(spec.id);
    if (!prev) byKey.set(key, { spec, won });
    else if (won && !prev.won) byKey.set(key, { spec, won });
  }

  let players = { ...stats.players };
  for (const [key, { spec, won }] of byKey) {
    const prev = players[key];
    players[key] = {
      key,
      label: playerLabel(spec),
      avatar: spec.avatar,
      played: (prev?.played ?? 0) + 1,
      wins: (prev?.wins ?? 0) + (won ? 1 : 0),
      lastPlayed: now,
    };
  }
  players = capPlayers(players);

  let vsAi = stats.vsAi;
  const ais = seats.filter((p) => p.kind === 'ai');
  if (seats.length === 2 && humans.length === 1 && ais.length === 1) {
    const difficulty: Difficulty = DIFFICULTIES.includes(ais[0].difficulty as Difficulty)
      ? (ais[0].difficulty as Difficulty)
      : 'fox';
    const prev = stats.vsAi[difficulty] ?? emptyVsAi();
    const humanWon = winners.has(humans[0].id);
    const aiWon = winners.has(ais[0].id);
    let { streak, bestStreak } = prev;
    if (humanWon && !aiWon) {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else if (!humanWon) {
      streak = 0;
    } // shared tie: the streak neither grows nor breaks
    vsAi = {
      ...stats.vsAi,
      [difficulty]: {
        played: prev.played + 1,
        wins: prev.wins + (humanWon ? 1 : 0),
        streak,
        bestStreak,
      },
    };
  }

  return {
    ...stats,
    players,
    vsAi,
    gamesFinished: stats.gamesFinished + 1,
    finishedDays: addDay(stats.finishedDays, localDay(now)),
  };
}

/* -------------------------------------------------------------- sanitizing */

function count(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function sanitizeWinRecord(r: Record<string, unknown>): WinRecord {
  const played = count(r.played);
  return { played, wins: Math.min(count(r.wins), played) };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Whatever came out of storage, as a well-formed Stats (bad parts dropped). */
export function sanitizeStats(raw: unknown): Stats {
  const out = emptyStats();
  if (!isRecord(raw)) return out;

  if (isRecord(raw.players)) {
    const players: Record<string, PlayerStats> = {};
    for (const [key, v] of Object.entries(raw.players)) {
      if (!isRecord(v)) continue;
      if (!(key.startsWith('name:') && key.length > 5) && !key.startsWith('animal:')) continue;
      if (!AVATAR_CYCLE.includes(v.avatar as AvatarId)) continue;
      const avatar = v.avatar as AvatarId;
      if (key.startsWith('animal:') && key !== `animal:${avatar}`) continue;
      const label = cleanName(v.label) || playerLabel({ avatar });
      players[key] = {
        key,
        label,
        avatar,
        ...sanitizeWinRecord(v),
        lastPlayed: count(v.lastPlayed),
      };
    }
    out.players = capPlayers(players);
  }

  if (isRecord(raw.vsAi)) {
    for (const d of DIFFICULTIES) {
      const v = raw.vsAi[d];
      if (!isRecord(v)) continue;
      const streak = count(v.streak);
      out.vsAi[d] = {
        ...sanitizeWinRecord(v),
        streak,
        bestStreak: Math.max(count(v.bestStreak), streak),
      };
    }
  }

  out.gamesFinished = count(raw.gamesFinished);

  if (Array.isArray(raw.finishedDays)) {
    const days = raw.finishedDays.filter((d): d is string => typeof d === 'string' && DAY.test(d));
    out.finishedDays = Array.from(new Set(days)).sort().slice(-MAX_DAYS);
  }

  if (typeof raw.reviewAskedVersion === 'string') out.reviewAskedVersion = raw.reviewAskedVersion;
  return out;
}

/* ---------------------------------------------------------- review prompt */

/**
 * Ask for an App Store rating only once the player clearly likes the game: at
 * least 3 finished games on at least 2 different days, never twice for the same
 * app version, and only on a happy ending (a human won, or a pass-and-play
 * game among people finished).
 */
export function shouldAskForReview(
  stats: Stats,
  opts: { humanWon: boolean; passAndPlay: boolean },
  appVersion: string,
): boolean {
  return (
    stats.gamesFinished >= 3 &&
    stats.finishedDays.length >= 2 &&
    stats.reviewAskedVersion !== appVersion &&
    (opts.humanWon || opts.passAndPlay)
  );
}
