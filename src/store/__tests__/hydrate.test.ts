/**
 * PLAN-v1.1 A8: the settings hydrate race. A read slower than the timeout used
 * to be thrown away, and the next save wrote defaults over the stored settings.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../settingsModel';
import { createSettingsStore } from '../settingsStore';
import type { KeyValueStorage } from '../storage';
import { createStorageGate } from '../storageGate';

/** Storage whose reads only answer when the test says so. */
class SlowStorage implements KeyValueStorage {
  data = new Map<string, string>();
  writes: [string, string][] = [];
  private waiting: (() => void)[] = [];
  failReads = false;

  getItem = (key: string) =>
    new Promise<string | null>((resolve, reject) => {
      this.waiting.push(() => (this.failReads ? reject(new Error('disk')) : resolve(this.data.get(key) ?? null)));
    });

  setItem = async (key: string, value: string) => {
    this.writes.push([key, value]);
    this.data.set(key, value);
  };

  /** Let every pending read answer. */
  release() {
    const w = this.waiting;
    this.waiting = [];
    for (const fn of w) fn();
  }
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

const STORED = JSON.stringify({
  version: 2,
  soundOn: false,
  boardSize: 'huge',
  difficulty: 'owl',
  avatars: ['cat', 'frog', 'bunny'],
  names: ['Maya', 'Leo', ''],
});

test('gate: hydrate resolves on the timeout, and the late read still settles', async () => {
  const storage = new SlowStorage();
  storage.data.set('k', 'late');
  const gate = createStorageGate({ storage, key: 'k', timeoutMs: 10, debounceMs: 1 });
  const seen: (string | null)[] = [];
  const result = await gate.hydrate((raw) => seen.push(raw));
  assert.equal(result, 'timeout');
  assert.equal(gate.settled, false);
  assert.deepEqual(seen, []);

  storage.release();
  await tick();
  assert.equal(gate.settled, true);
  assert.deepEqual(seen, ['late'], 'the late value is delivered, not dropped');
});

test('gate: no write reaches storage before the real read settles', async () => {
  const storage = new SlowStorage();
  storage.data.set('k', 'stored');
  const gate = createStorageGate({ storage, key: 'k', timeoutMs: 5, debounceMs: 1 });
  void gate.hydrate(() => {});
  let value = 'defaults';
  gate.write(() => value);
  await tick(30);
  assert.deepEqual(storage.writes, [], 'held while the read is outstanding');

  value = 'merged';
  storage.release();
  await tick(10);
  assert.deepEqual(storage.writes, [['k', 'merged']], 'flushed once, with the latest state');
});

test('gate: a failed read settles as "nothing stored" and unblocks writes', async () => {
  const storage = new SlowStorage();
  storage.failReads = true;
  const gate = createStorageGate({ storage, key: 'k', timeoutMs: 50, debounceMs: 1 });
  const seen: (string | null)[] = [];
  const p = gate.hydrate((raw) => seen.push(raw));
  gate.write(() => 'x');
  storage.release();
  assert.equal(await p, 'read');
  assert.deepEqual(seen, [null]);
  await tick(10);
  assert.deepEqual(storage.writes, [['k', 'x']]);
});

test('gate: hydrate is idempotent', async () => {
  const storage = new SlowStorage();
  const gate = createStorageGate({ storage, key: 'k', timeoutMs: 5 });
  let calls = 0;
  const a = gate.hydrate(() => calls++);
  const b = gate.hydrate(() => calls++);
  assert.equal(a, b);
  storage.release();
  await tick(10);
  assert.equal(calls, 1);
});

test('A8: a read slower than the timeout is still applied', async () => {
  const storage = new SlowStorage();
  storage.data.set(SETTINGS_KEY, STORED);
  const useS = createSettingsStore(storage, { timeoutMs: 10, debounceMs: 1 });

  await useS.getState().hydrate();
  assert.equal(useS.getState().hydrated, true, 'play is not held up by storage');
  assert.equal(useS.getState().boardSize, DEFAULT_SETTINGS.boardSize, 'defaults meanwhile');

  storage.release();
  await tick();
  const s = useS.getState();
  assert.equal(s.boardSize, 'huge');
  assert.equal(s.difficulty, 'owl');
  assert.equal(s.soundOn, false);
  assert.deepEqual(s.names, ['Maya', 'Leo', '']);
  await tick(10);
  assert.deepEqual(storage.writes, [], 'nothing changed, nothing written');
});

test('A8: defaults are never written over stored settings before the read lands', async () => {
  const storage = new SlowStorage();
  storage.data.set(SETTINGS_KEY, STORED);
  const useS = createSettingsStore(storage, { timeoutMs: 5, debounceMs: 1 });
  await useS.getState().hydrate(); // times out

  // the player changes ONE thing while the read is still out
  useS.getState().toggle('kidMode');
  await tick(30);
  assert.deepEqual(storage.writes, [], 'A8: the save waits for the read');

  storage.release();
  await tick(10);
  const s = useS.getState();
  assert.equal(s.kidMode, true, 'what the player just did wins');
  assert.equal(s.boardSize, 'huge', 'every untouched field comes back from storage');
  assert.deepEqual(s.names, ['Maya', 'Leo', '']);

  assert.equal(storage.writes.length, 1);
  const written = JSON.parse(storage.writes[0][1]);
  assert.equal(written.version, 3);
  assert.equal(written.kidMode, true);
  assert.equal(written.boardSize, 'huge', 'the stored settings survive the save');
  assert.deepEqual(written.avatars, ['cat', 'frog', 'bunny']);
});

test('A8: a change made before hydrate was even called still waits for the read', async () => {
  const storage = new SlowStorage();
  storage.data.set(SETTINGS_KEY, STORED);
  const useS = createSettingsStore(storage, { timeoutMs: 5, debounceMs: 1 });
  useS.getState().setName(2, '  Sam  ');
  await tick(20);
  assert.deepEqual(storage.writes, []);
  storage.release();
  await tick(10);
  assert.deepEqual(useS.getState().names, ['', '', 'Sam'], 'the typed names array wins as a whole');
  assert.equal(useS.getState().boardSize, 'huge');
  assert.equal(JSON.parse(storage.writes[0][1]).boardSize, 'huge');
});

test('A8: a fast read applies before hydrate resolves; later writes go straight through', async () => {
  const storage = new SlowStorage();
  storage.data.set(SETTINGS_KEY, STORED);
  const useS = createSettingsStore(storage, { timeoutMs: 1000, debounceMs: 1 });
  const p = useS.getState().hydrate();
  storage.release();
  await p;
  assert.equal(useS.getState().boardSize, 'huge');
  useS.getState().set('boardSize', 'small');
  await tick(10);
  assert.equal(JSON.parse(storage.writes[0][1]).boardSize, 'small');
});

test('setName cleans, ignores bad seats, and cycleAvatar still skips taken animals', async () => {
  const storage = new SlowStorage();
  const useS = createSettingsStore(storage, { timeoutMs: 5, debounceMs: 1 });
  const p = useS.getState().hydrate();
  storage.release();
  await p;
  useS.getState().setName(0, '‮ Maya\n ');
  useS.getState().setName(1, '👨‍👩‍👧‍👦 Family Robinson');
  useS.getState().setName(5, 'nobody');
  useS.getState().setName(-1, 'nobody');
  const { names } = useS.getState();
  assert.equal(names.length, 3);
  assert.equal(names[0], 'Maya');
  assert.ok(Array.from(names[1]).length <= 12);
  assert.equal(names[2], '');

  useS.getState().cycleAvatar(0); // fox -> owl is taken, bear taken -> frog
  assert.equal(useS.getState().avatars[0], 'frog');
});

test('rememberNames puts the seats in play at the front; forgetNames clears both', async () => {
  const storage = new SlowStorage();
  const useS = createSettingsStore(storage, { timeoutMs: 5, debounceMs: 1 });
  const p = useS.getState().hydrate();
  storage.release();
  await p;
  useS.getState().setName(0, 'Maya');
  useS.getState().setName(1, 'Leo');
  useS.getState().setName(2, 'Sam');
  useS.getState().rememberNames(2);
  assert.deepEqual(useS.getState().recentNames, ['Maya', 'Leo'], 'seat 3 did not play');
  useS.getState().setName(1, '');
  useS.getState().rememberNames(3);
  assert.deepEqual(useS.getState().recentNames, ['Maya', 'Sam', 'Leo']);
  await tick(10);
  const written = JSON.parse(storage.writes[storage.writes.length - 1][1]);
  assert.deepEqual(written.recentNames, ['Maya', 'Sam', 'Leo']);

  useS.getState().forgetNames();
  assert.deepEqual(useS.getState().names, ['', '', '']);
  assert.deepEqual(useS.getState().recentNames, []);
  await tick(10);
  const after = JSON.parse(storage.writes[storage.writes.length - 1][1]);
  assert.deepEqual(after.names, ['', '', '']);
  assert.deepEqual(after.recentNames, []);
});

test('cycleAvatar with seats/avoid swaps with a seat not in play', async () => {
  const storage = new SlowStorage();
  const useS = createSettingsStore(storage, { timeoutMs: 5, debounceMs: 1 });
  const p = useS.getState().hydrate();
  storage.release();
  await p;
  useS.getState().cycleAvatar(0, { seats: 1, avoid: ['owl'] }); // fox -> owl avoided -> bear (seat 3's)
  assert.deepEqual(useS.getState().avatars, ['bear', 'owl', 'fox']);
});
