/** Web counterpart of storage.ts: plain localStorage, no worker, no wasm. */
import type { KeyValueStorage } from './storage';

function local(): globalThis.Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // private mode / blocked site data
  }
}

export const storage: KeyValueStorage = {
  getItem: async (key) => local()?.getItem(key) ?? null,
  setItem: async (key, value) => {
    local()?.setItem(key, value);
  },
};
