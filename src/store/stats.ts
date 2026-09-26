/**
 * Per-player stats store (rules in statsModel.ts).
 *
 * Imports no native module, so the game store — and its tests — can record a
 * finished game here directly. The real storage backend is handed in by
 * settings.ts (`bindStatsStorage`), which every screen loads first. Until then,
 * or until the stored stats have been read, finished games are kept in memory
 * AND queued, then replayed on top of whatever the read brings back — so a
 * slow read can neither lose a game nor be overwritten by one (PLAN-v1.1 A8).
 */

import { create } from 'zustand';

import type { GameState } from '../engine/types';
import type { KeyValueStorage } from './storage';
import { createStorageGate, parseJson, type GateTimers, type StorageGate } from './storageGate';
import {
  STATS_KEY,
  applyGameResult,
  emptyStats,
  sanitizeStats,
  type Stats,
} from './statsModel';

export {
  EMPTY_STATS,
  MAX_PLAYERS,
  STATS_KEY,
  applyGameResult,
  playerKey,
  sanitizeStats,
  shouldAskForReview,
} from './statsModel';
export type { PlayerStats, Stats, VsAiStats, WinRecord } from './statsModel';

export interface StatsStore extends Stats {
  hydrated: boolean;
  /** Read the stored stats (once). Resolves after at most the timeout. */
  hydrate: () => Promise<void>;
  /** Fold a finished game in. Anything but a game-over state is ignored, and
   *  the same state object is only ever counted once. */
  recordGame: (state: GameState, now?: number) => void;
  markReviewAsked: (version: string) => void;
  reset: () => void;
  /** Hand the store its storage backend (first call wins). */
  bindStorage: (storage: KeyValueStorage) => void;
}

export interface StatsStoreOptions {
  storage?: KeyValueStorage;
  timeoutMs?: number;
  debounceMs?: number;
  timers?: GateTimers;
  now?: () => number;
}

function statsOf(s: Stats): Stats {
  return {
    version: 1,
    players: s.players,
    vsAi: s.vsAi,
    gamesFinished: s.gamesFinished,
    finishedDays: s.finishedDays,
    reviewAskedVersion: s.reviewAskedVersion,
  };
}

export function createStatsStore(opts: StatsStoreOptions = {}) {
  let gate: StorageGate | null = null;
  let settled = false;
  /** changes made before the stored stats arrived, replayed on top of them */
  let queued: ((s: Stats) => Stats)[] = [];
  let hydrating: Promise<void> | null = null;
  let releaseWaiting: (() => void) | null = null;
  const recorded = new WeakSet<GameState>();

  return create<StatsStore>((setState, getState) => {
    function persist() {
      gate?.write(() => JSON.stringify(statsOf(getState())));
    }

    function startRead(g: StorageGate): Promise<void> {
      return g
        .hydrate((raw) => {
          settled = true;
          let next = sanitizeStats(parseJson(raw));
          const ops = queued;
          queued = [];
          for (const op of ops) next = op(next);
          setState({ ...next, hydrated: true });
          if (ops.length > 0) persist();
        })
        .then(
          () => {
            if (!getState().hydrated) setState({ hydrated: true });
          },
          () => setState({ hydrated: true }),
        );
    }

    function update(op: (s: Stats) => Stats) {
      setState(op(statsOf(getState())));
      if (settled) {
        persist();
      } else {
        queued.push(op);
        void getState().hydrate();
      }
    }

    function bind(storage: KeyValueStorage) {
      if (gate) return;
      gate = createStorageGate({
        storage,
        key: STATS_KEY,
        timeoutMs: opts.timeoutMs ?? 2000,
        debounceMs: opts.debounceMs ?? 250,
        timers: opts.timers,
      });
      if (releaseWaiting) {
        const release = releaseWaiting;
        releaseWaiting = null;
        startRead(gate).then(release, release);
      }
    }

    if (opts.storage) {
      // bound at creation: nothing can be waiting yet
      gate = createStorageGate({
        storage: opts.storage,
        key: STATS_KEY,
        timeoutMs: opts.timeoutMs ?? 2000,
        debounceMs: opts.debounceMs ?? 250,
        timers: opts.timers,
      });
    }

    return {
      ...emptyStats(),
      hydrated: false,

      hydrate: () => {
        if (hydrating) return hydrating;
        hydrating = gate
          ? startRead(gate)
          : new Promise<void>((resolve) => {
              // no storage yet: read as soon as settings.ts binds it
              releaseWaiting = resolve;
            });
        return hydrating;
      },

      recordGame: (state, now) => {
        try {
          if (!state || state.phase !== 'gameOver' || recorded.has(state)) return;
          recorded.add(state);
          const at = now ?? opts.now?.() ?? Date.now();
          update((s) => applyGameResult(s, state, at));
        } catch {
          /* stats must never break the end of a game */
        }
      },

      markReviewAsked: (version) => {
        update((s) => ({ ...s, reviewAskedVersion: version }));
      },

      reset: () => {
        // keep the review bookkeeping: clearing stats is not a new app version
        update((s) => ({ ...emptyStats(), reviewAskedVersion: s.reviewAskedVersion }));
      },

      bindStorage: bind,
    };
  });
}

export const useStats = createStatsStore();

/** Give the app's stats store its storage backend (settings.ts does this). */
export function bindStatsStorage(storage: KeyValueStorage): void {
  useStats.getState().bindStorage(storage);
}
