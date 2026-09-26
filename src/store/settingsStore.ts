/**
 * The settings store, built over any `KeyValueStorage`.
 *
 * `settings.ts` makes the app's single instance over the real (native or web)
 * storage; the tests make their own over a fake, which is the only reason this
 * is a factory in a module of its own — `storage.ts` pulls in expo-sqlite,
 * which cannot load outside a React Native runtime.
 */

import { create } from 'zustand';

import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  addRecentNames,
  cleanName,
  nextAvatars,
  persistable,
  sanitize,
  type CycleOptions,
  type Settings,
} from './settingsModel';
import type { KeyValueStorage } from './storage';
import { createStorageGate, parseJson, type GateTimers } from './storageGate';

export interface SettingsStore extends Settings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggle: (key: 'soundOn' | 'showShapes' | 'bonusTurnOnMatch' | 'kidMode') => void;
  /** Next free animal for `seat` (see `nextAvatars`; default: all seats in play). */
  cycleAvatar: (seat: number, opts?: CycleOptions) => void;
  /** Store a seat's typed name, cleaned (see `cleanName`). '' = the animal. */
  setName: (seat: number, raw: string) => void;
  /** A game is starting with these seats: put their typed names at the front
   *  of `recentNames` (blanks and animal names are skipped). */
  rememberNames: (seats: number) => void;
  /** Settings → "Forget player names": every seat back to its animal, no chips. */
  forgetNames: () => void;
}

export interface SettingsStoreOptions {
  timeoutMs?: number;
  debounceMs?: number;
  timers?: GateTimers;
  /** Runs alongside `hydrate` (the app uses it to start the stats read too). */
  onHydrate?: () => void;
}

export function createSettingsStore(storage: KeyValueStorage, opts: SettingsStoreOptions = {}) {
  const gate = createStorageGate({
    storage,
    key: SETTINGS_KEY,
    timeoutMs: opts.timeoutMs ?? 2000,
    debounceMs: opts.debounceMs ?? 120,
    timers: opts.timers,
  });
  /**
   * Fields the player changed before the stored value arrived. A late read
   * (past the timeout) is still applied, but never over one of these: what the
   * player just did wins, and everything else comes back from storage.
   */
  const touched = new Set<keyof Settings>();
  let hydrating: Promise<void> | null = null;

  return create<SettingsStore>((setState, getState) => {
    function persist(...keys: (keyof Settings)[]) {
      if (!gate.settled) for (const k of keys) touched.add(k);
      // A change before anyone asked to hydrate still must not be written
      // blind: start the read, and the gate holds the write until it settles.
      if (!gate.started) void getState().hydrate();
      gate.write(() => JSON.stringify(persistable(getState())));
    }

    return {
      ...DEFAULT_SETTINGS,
      hydrated: false,

      hydrate: () => {
        if (hydrating) return hydrating;
        try {
          opts.onHydrate?.();
        } catch {
          /* not ours to fail on */
        }
        hydrating = gate
          .hydrate((raw) => {
            const stored = sanitize(parseJson(raw));
            const apply: Partial<Settings> = {};
            for (const k of Object.keys(stored) as (keyof Settings)[]) {
              if (!touched.has(k)) (apply as Record<string, unknown>)[k] = stored[k];
            }
            touched.clear();
            setState({ ...apply, hydrated: true });
          })
          .then(
            () => {
              // on 'timeout' play starts with what we have; the read may land later
              if (!getState().hydrated) setState({ hydrated: true });
            },
            () => setState({ hydrated: true }),
          );
        return hydrating;
      },

      set: (key, value) => {
        setState({ [key]: value } as Pick<Settings, typeof key>);
        persist(key);
      },

      toggle: (key) => {
        setState({ [key]: !getState()[key] } as Pick<Settings, typeof key>);
        persist(key);
      },

      cycleAvatar: (seat, opts) => {
        const cur = getState().avatars;
        const avatars = nextAvatars(cur, seat, opts);
        if (avatars.every((a, i) => a === cur[i])) return;
        setState({ avatars });
        persist('avatars');
      },

      setName: (seat, raw) => {
        const cur = getState().names;
        if (!Number.isInteger(seat) || seat < 0 || seat >= cur.length) return;
        const name = cleanName(raw);
        if (cur[seat] === name) return;
        const names = [...cur];
        names[seat] = name;
        setState({ names });
        persist('names');
      },

      rememberNames: (seats) => {
        const { names, recentNames } = getState();
        const played = names.slice(0, Math.max(0, Math.min(seats, names.length)));
        const next = addRecentNames(recentNames, played);
        if (next.length === recentNames.length && next.every((n, i) => n === recentNames[i])) return;
        setState({ recentNames: next });
        persist('recentNames');
      },

      forgetNames: () => {
        setState({ names: DEFAULT_SETTINGS.names.map(() => ''), recentNames: [] });
        persist('names', 'recentNames');
      },
    };
  });
}
