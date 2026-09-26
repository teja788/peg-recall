/**
 * One persisted blob, read once and written debounced — with the hydrate race
 * handled (PLAN-v1.1 A8).
 *
 * The old settings store raced the read against a 2 s timeout and, if the
 * timeout won, simply carried on with defaults: the late value was thrown away
 * and the next save wrote those defaults over what the player had stored. The
 * gate fixes both halves:
 *
 *  - `hydrate` still resolves after at most `timeoutMs`, so the game never
 *    waits on storage, but `onSettled` fires whenever the REAL read finishes,
 *    even late, so the caller can still apply it.
 *  - `write` is held until that real read has settled. Nothing is ever written
 *    over a stored value nobody has looked at yet.
 *
 * Pure TypeScript over a `KeyValueStorage`, so tests drive it with a fake.
 */

import type { KeyValueStorage } from './storage';

export interface GateTimers {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

const REAL_TIMERS: GateTimers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export interface StorageGateOptions {
  storage: KeyValueStorage;
  key: string;
  /** Hydration never blocks the game: past this, `hydrate` resolves anyway. */
  timeoutMs?: number;
  /** Writes are coalesced over this window. */
  debounceMs?: number;
  timers?: GateTimers;
}

export interface StorageGate {
  /**
   * Start the read (once; later calls return the same promise). Resolves with
   * 'read' if the value arrived within `timeoutMs`, else 'timeout'.
   * `onSettled` runs exactly once, when the real read finishes — possibly after
   * the timeout — with the stored string, or null if there is none or the read
   * failed. Only the first call's `onSettled` is used.
   */
  hydrate: (onSettled: (raw: string | null) => void) => Promise<'read' | 'timeout'>;
  /**
   * Ask for a save. `serialize` is called at write time (so it sees the latest
   * state), and not before the real read has settled.
   */
  write: (serialize: () => string) => void;
  /** true once the real read has finished (value, nothing, or error). */
  readonly settled: boolean;
  /** true once `hydrate` has been called. */
  readonly started: boolean;
}

export function createStorageGate({
  storage,
  key,
  timeoutMs = 2000,
  debounceMs = 120,
  timers = REAL_TIMERS,
}: StorageGateOptions): StorageGate {
  let settled = false;
  let started: Promise<'read' | 'timeout'> | null = null;
  let pending: (() => string) | null = null;
  let timer: unknown = null;

  function flushSoon() {
    if (!settled || !pending) return;
    if (timer != null) timers.clearTimeout(timer);
    timer = timers.setTimeout(() => {
      timer = null;
      const serialize = pending;
      pending = null;
      if (!serialize) return;
      try {
        storage.setItem(key, serialize()).catch(() => {
          /* storage is a nicety, never a failure the player should see */
        });
      } catch {
        /* a synchronous throw from the backend or the serializer: same */
      }
    }, debounceMs);
  }

  return {
    get settled() {
      return settled;
    },
    get started() {
      return started != null;
    },

    hydrate(onSettled) {
      if (started) return started;
      let read: Promise<string | null>;
      try {
        read = Promise.resolve(storage.getItem(key));
      } catch {
        read = Promise.resolve(null);
      }
      const real = read
        .then(
          (v) => (typeof v === 'string' ? v : null),
          () => null,
        )
        .then((raw) => {
          settled = true;
          try {
            onSettled(raw);
          } catch {
            /* a bad callback must not wedge the writes behind it */
          }
          flushSoon();
          return 'read' as const;
        });
      let handle: unknown = null;
      const timeout = new Promise<'timeout'>((resolve) => {
        handle = timers.setTimeout(() => resolve('timeout'), timeoutMs);
      });
      void real.then(() => timers.clearTimeout(handle));
      started = Promise.race([real, timeout]);
      return started;
    },

    write(serialize) {
      pending = serialize;
      flushSoon();
    },
  };
}

/** JSON.parse that answers undefined instead of throwing. */
export function parseJson(raw: string | null): unknown {
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
