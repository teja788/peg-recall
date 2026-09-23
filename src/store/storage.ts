/**
 * Key-value persistence for settings. Native builds use expo-sqlite's kv-store;
 * the web build resolves storage.web.ts instead (Metro's platform extensions),
 * because expo-sqlite on web needs SharedArrayBuffer and a cross-origin
 * isolated page — Safari never delivers either, and the worker then never
 * answers, which left the game screen waiting on hydration forever.
 */
import Storage from 'expo-sqlite/kv-store';

export interface KeyValueStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export const storage: KeyValueStorage = {
  getItem: (key) => Storage.getItem(key),
  setItem: (key, value) => Storage.setItem(key, value),
};
