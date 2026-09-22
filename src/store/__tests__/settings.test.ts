import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_SETTINGS, persistable, sanitize, type Settings } from '../settingsModel';

/** What `hydrate` does with whatever came back out of storage. */
function hydrated(raw: string | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...sanitize(JSON.parse(raw)) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

test('shapes on pegs are on by default', () => {
  // The die is otherwise colour-only: a colour-blind player would have nothing
  // to read on it at all.
  assert.equal(DEFAULT_SETTINGS.showShapes, true);
});

test('a persisted false still turns shapes off', () => {
  const s = hydrated(JSON.stringify({ showShapes: false }));
  assert.equal(s.showShapes, false, 'the default must not overwrite a deliberate off');
  assert.equal(s.soundOn, DEFAULT_SETTINGS.soundOn, 'untouched fields keep their defaults');
});

test('sanitize keeps good fields and drops everything else', () => {
  assert.deepEqual(
    sanitize({
      soundOn: false,
      showShapes: true,
      bonusTurnOnMatch: false,
      kidMode: true,
      boardSize: 'huge',
      difficulty: 'owl',
      lastMode: '3p',
      avatars: ['cat', 'frog', 'bunny'],
    }),
    {
      soundOn: false,
      showShapes: true,
      bonusTurnOnMatch: false,
      kidMode: true,
      boardSize: 'huge',
      difficulty: 'owl',
      lastMode: '3p',
      avatars: ['cat', 'frog', 'bunny'],
    },
  );
});

test('sanitize rejects wrong types, unknown values and junk', () => {
  const out = sanitize({
    soundOn: 'yes',
    showShapes: 1,
    boardSize: 'enormous',
    difficulty: 'dragon',
    lastMode: '4p',
    avatars: ['fox', 'owl'],          // wrong length
    kidMode: null,
    somethingElse: 'ignored',
  });
  assert.deepEqual(out, {}, 'nothing usable, so every field falls back to its default');

  assert.deepEqual(sanitize({ avatars: ['fox', 'owl', 'unicorn'] }), {}, 'one bad avatar voids the set');
  assert.deepEqual(sanitize({ avatars: 'fox,owl,bear' }), {});
});

test('sanitize survives non-objects', () => {
  for (const raw of [null, undefined, 0, 42, '', 'nope', true, [], [1, 2, 3]]) {
    assert.deepEqual(sanitize(raw), {}, `sanitize(${JSON.stringify(raw) ?? 'undefined'})`);
  }
});

test('a partial write leaves the rest at defaults', () => {
  const s = hydrated(JSON.stringify({ boardSize: 'big', difficulty: 'bunny' }));
  assert.equal(s.boardSize, 'big');
  assert.equal(s.difficulty, 'bunny');
  assert.equal(s.kidMode, DEFAULT_SETTINGS.kidMode);
  assert.deepEqual(s.avatars, DEFAULT_SETTINGS.avatars);
});

test('truncated or corrupt JSON hydrates to the defaults', () => {
  for (const raw of ['{"soundOn":fal', '', '   ', '{{{', 'undefined']) {
    assert.deepEqual(hydrated(raw), { ...DEFAULT_SETTINGS }, `raw: ${JSON.stringify(raw)}`);
  }
  assert.deepEqual(hydrated(null), { ...DEFAULT_SETTINGS }, 'nothing stored yet');
});

test('a round trip through persistable + sanitize is lossless', () => {
  const tweaked: Settings = {
    ...DEFAULT_SETTINGS,
    soundOn: false,
    showShapes: false,
    kidMode: true,
    boardSize: 'small',
    difficulty: 'bunny',
    lastMode: '2p',
    avatars: ['bear', 'cat', 'frog'],
  };
  assert.deepEqual(hydrated(JSON.stringify(persistable(tweaked))), tweaked);
});

test('persistable writes only the stored fields', () => {
  const withExtras = { ...DEFAULT_SETTINGS, hydrated: true, toggle: () => {} } as unknown as Settings;
  assert.deepEqual(Object.keys(persistable(withExtras)).sort(), Object.keys(DEFAULT_SETTINGS).sort());
});
