import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SETTINGS,
  NAME_INPUT_MAX,
  NAME_MAX,
  SETTINGS_KEY,
  RECENT_MAX,
  SETTINGS_VERSION,
  addRecentNames,
  cleanName,
  humanAvatarVsAi,
  isAnimalName,
  nameToStore,
  nextAvatars,
  persistable,
  sanitize,
  type Settings,
} from '../settingsModel';

/** What `hydrate` does with whatever came back out of storage. */
function hydrated(raw: string | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...sanitize(JSON.parse(raw)) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

test('shapes on pegs are off by default', () => {
  // Deliberate since 0bcd23c: the glyphs clutter a small board, and the toggle
  // ("color-blind help") is one tap away in Settings.
  assert.equal(DEFAULT_SETTINGS.showShapes, false);
});

test('a persisted true still turns shapes on', () => {
  assert.equal(hydrated(JSON.stringify({ showShapes: true })).showShapes, true);
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
      names: ['Maya', '', 'Leo'],
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
      names: ['Maya', '', 'Leo'],
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
    names: ['Maya', 'Zoë 🦊', ''],
  };
  assert.deepEqual(hydrated(JSON.stringify(persistable(tweaked))), tweaked);
});

test('persistable writes only the stored fields, plus the schema version', () => {
  const withExtras = { ...DEFAULT_SETTINGS, hydrated: true, toggle: () => {} } as unknown as Settings;
  assert.deepEqual(
    Object.keys(persistable(withExtras)).sort(),
    [...Object.keys(DEFAULT_SETTINGS), 'version'].sort(),
  );
  assert.equal(persistable(DEFAULT_SETTINGS).version, SETTINGS_VERSION);
  assert.equal(SETTINGS_VERSION, 3);
});

/* ----------------------------------------------------------------- A18 */

test('A18: duplicate avatars are rejected', () => {
  assert.deepEqual(sanitize({ avatars: ['fox', 'fox', 'owl'] }), {});
  assert.deepEqual(sanitize({ avatars: ['cat', 'owl', 'cat'] }), {});
  assert.deepEqual(sanitize({ avatars: ['cat', 'owl', 'fox'] }), { avatars: ['cat', 'owl', 'fox'] });
  assert.deepEqual(sanitize({ avatars: ['cat', 'owl', 'fox', 'bear'] }), {}, 'still exactly three seats');
});

test('A18: a v1 blob (no version, no names) hydrates with every field intact', () => {
  // exactly what 1.0 wrote under the same key
  const v1 = {
    soundOn: false,
    showShapes: true,
    boardSize: 'big',
    difficulty: 'owl',
    bonusTurnOnMatch: false,
    kidMode: true,
    lastMode: '2p',
    avatars: ['cat', 'frog', 'bunny'],
  };
  const s = hydrated(JSON.stringify(v1));
  assert.deepEqual(s, { ...v1, names: ['', '', ''], recentNames: [] });
  assert.equal(SETTINGS_KEY, 'pegrecall.settings.v1', 'no key migration');
});

test('A18: a v2 blob (names, no recentNames) loads with no chips', () => {
  const v2 = { version: 2, ...DEFAULT_SETTINGS, names: ['Ann', 'Bo', ''] } as Record<string, unknown>;
  delete v2.recentNames;
  const s = hydrated(JSON.stringify(v2));
  assert.deepEqual(s.names, ['Ann', 'Bo', '']);
  assert.deepEqual(s.recentNames, []);
});

test('A18: a current blob round-trips and the version field is ignored on read', () => {
  const blob = {
    ...persistable({ ...DEFAULT_SETTINGS, names: ['Ann', 'Bo', 'Cy'], recentNames: ['Ann', 'Dee'] }),
  };
  assert.equal(blob.version, 3);
  assert.deepEqual(hydrated(JSON.stringify(blob)).recentNames, ['Ann', 'Dee']);
  assert.equal('version' in sanitize(blob), false, 'version never leaks into Settings');
  assert.deepEqual(hydrated(JSON.stringify(blob)).names, ['Ann', 'Bo', 'Cy']);
  // a future version still yields whatever fields it shares with this one
  assert.equal(sanitize({ version: 9, boardSize: 'small' }).boardSize, 'small');
});

/* --------------------------------------------------------------- names */

test('names default to blank (= the animal)', () => {
  assert.deepEqual(DEFAULT_SETTINGS.names, ['', '', '']);
  assert.equal(NAME_MAX, 12);
  assert.equal(NAME_INPUT_MAX, 24);
});

test('sanitize: a bad name entry blanks that seat only', () => {
  assert.deepEqual(sanitize({ names: ['Maya', 42, null] }).names, ['Maya', '', '']);
  assert.deepEqual(sanitize({ names: ['  Maya  ', '\u202EevilLeo', 'A\u0000B'] }).names, ['Maya', 'evilLeo', 'AB']);
  assert.deepEqual(
    sanitize({ names: ['An extremely long name indeed', 'x', 'y'] }).names,
    ['An extremely', 'x', 'y'],
  );
});

test('sanitize: names of the wrong shape are dropped, never voiding other fields', () => {
  for (const names of [['a', 'b'], ['a', 'b', 'c', 'd'], 'Maya', { 0: 'a' }, null]) {
    const out = sanitize({ names, boardSize: 'small' });
    assert.equal('names' in out, false, JSON.stringify(names));
    assert.equal(out.boardSize, 'small');
  }
});

test('cleanName: non-strings become blank', () => {
  for (const raw of [undefined, null, 0, 12, true, {}, [], ['Maya']]) {
    assert.equal(cleanName(raw), '', String(raw));
  }
});

test('cleanName: trims and collapses whitespace of every kind', () => {
  assert.equal(cleanName('  Maya  '), 'Maya');
  assert.equal(cleanName('Mary   Ann'), 'Mary Ann');
  assert.equal(cleanName('Mary\tAnn\nLee'), 'Mary Ann Lee');
  assert.equal(cleanName('Mary\u00A0\u3000Ann'), 'Mary Ann', 'no-break + ideographic spaces');
  assert.equal(cleanName('Mary\u2028Ann'), 'Mary Ann', 'line separator');
  assert.equal(cleanName('   '), '');
  assert.equal(cleanName(''), '');
});

test('cleanName: strips control, zero-width and bidi control characters', () => {
  assert.equal(cleanName('Ma\u0007ya'), 'Maya', 'C0 control');
  assert.equal(cleanName('Ma\u009Bya'), 'Maya', 'C1 control');
  assert.equal(cleanName('Ma\u007Fya'), 'Maya', 'DEL');
  assert.equal(cleanName('\u202Eayam'), 'ayam', 'RLO override');
  assert.equal(cleanName('\u202Aa\u202Bb\u202Cc\u202Dd'), 'abcd', 'embeddings / PDF / LRO');
  assert.equal(cleanName('\u2066a\u2067b\u2068c\u2069'), 'abc', 'isolates');
  assert.equal(cleanName('\u200Ea\u200Fb\u061Cc'), 'abc', 'LRM / RLM / ALM');
  assert.equal(cleanName('\uFEFFMa\u200Bya\u2060'), 'Maya', 'BOM, ZWSP, word joiner');
  assert.equal(cleanName('\u202E \u202E'), '', 'nothing left but formatting');
  // plain RTL text itself is fine; only the invisible overrides go
  assert.equal(cleanName('שרה'), 'שרה');
  assert.equal(cleanName('مريم'), 'مريم');
  // ZWNJ is real spelling in Persian and stays
  assert.equal(cleanName('می\u200Cخواهم'), 'می\u200Cخواهم');
});

test('cleanName: NFC normalises so é is one code point', () => {
  const decomposed = 'Zoe\u0301';
  assert.equal(cleanName(decomposed), 'Zo\u00E9');
  assert.equal(Array.from(cleanName(decomposed)).length, 3);
});

test('cleanName: cuts at NAME_MAX code points, emoji counted as one', () => {
  assert.equal(cleanName('Bartholomew the Great'), 'Bartholomew');
  assert.equal(cleanName('Christopherson'), 'Christophers');
  const foxes = '🦊'.repeat(20);
  assert.equal(Array.from(cleanName(foxes)).length, NAME_MAX);
  assert.equal(cleanName(foxes), '🦊'.repeat(12), 'never splits a surrogate pair');
  assert.equal(cleanName('🦊 Maya'), '🦊 Maya');
});

test('cleanName: never leaves a dangling ZWJ or VS16 at the cut', () => {
  const family = '👨\u200D👩\u200D👧\u200D👦'; // 7 code points
  // 'Grandma ' is 8 code points: the cut at 12 lands right after a ZWJ
  const cut = cleanName('Grandma ' + family);
  const cps = Array.from(cut);
  assert.ok(cps.length <= NAME_MAX);
  assert.notEqual(cps[cps.length - 1], '\u200D', 'no trailing ZWJ');
  assert.equal(cut, 'Grandma 👨\u200D👩');

  // 11 letters + heart + VS16: the cut would keep the heart and drop VS16 — fine;
  // 10 letters + ZWJ-joined pair: the cut after the joiner must drop it
  assert.equal(cleanName('Abcdefghijk❤\uFE0F'), 'Abcdefghijk❤');
  assert.equal(cleanName('Abcdefghij👩\u200D🚀'), 'Abcdefghij👩');
  const vsCut = cleanName('Abcdefghijk\uFE0F\uFE0Fz');
  assert.ok(!vsCut.endsWith('\uFE0F'), 'no trailing VS16');
  // a whole family emoji fits and stays whole
  assert.equal(cleanName('Mum ' + family), 'Mum ' + family);
});

test('cleanName: a cut that ends on a space is trimmed', () => {
  assert.equal(cleanName('Anna Maria   Lopez'), 'Anna Maria L');
  assert.equal(cleanName('Abcdefghijk Lmnop'), 'Abcdefghijk');
});

/* ------------------------------------------------ v1.1 "Who's playing?" */

test('recentNames default to none', () => {
  assert.deepEqual(DEFAULT_SETTINGS.recentNames, []);
  assert.equal(RECENT_MAX, 8);
});

test('addRecentNames: newest first, cleaned, distinct ignoring case, capped', () => {
  assert.deepEqual(addRecentNames([], ['Maya', 'Leo']), ['Maya', 'Leo']);
  assert.deepEqual(addRecentNames(['Leo', 'Sam'], ['Maya', '']), ['Maya', 'Leo', 'Sam']);
  assert.deepEqual(addRecentNames(['maya', 'Sam'], ['  Maya ']), ['Maya', 'Sam'], 'newest spelling wins');
  assert.deepEqual(addRecentNames([], ['Fox', 'bear', 'Maya']), ['Maya'], 'animal names are not chips');
  const many = Array.from({ length: 12 }, (_, i) => `N${i}`);
  assert.deepEqual(addRecentNames(many, ['Maya']), ['Maya', ...many.slice(0, RECENT_MAX - 1)]);
  assert.deepEqual(addRecentNames([42, null, '‮'], ['Leo']), ['Leo'], 'garbage drops out');
});

test('sanitize: recentNames are cleaned and deduped; the wrong shape is dropped', () => {
  assert.deepEqual(sanitize({ recentNames: [' Maya ', 'maya', 'Fox', 7, 'Leo'] }).recentNames, ['Maya', 'Leo']);
  const long = Array.from({ length: 50 }, (_, i) => `N${i}`);
  assert.equal(sanitize({ recentNames: long }).recentNames?.length, RECENT_MAX);
  for (const recentNames of ['Maya', { 0: 'Maya' }, null, 3]) {
    const out = sanitize({ recentNames, boardSize: 'small' });
    assert.equal('recentNames' in out, false, JSON.stringify(recentNames));
    assert.equal(out.boardSize, 'small');
  }
});

test('nameToStore: blank or the seat\'s own animal (any case) means default', () => {
  assert.equal(nameToStore('Fox', 'fox'), '');
  assert.equal(nameToStore(' fOX ', 'fox'), '');
  assert.equal(nameToStore('', 'fox'), '');
  assert.equal(nameToStore('   ', 'owl'), '');
  assert.equal(nameToStore('Fox', 'bear'), 'Fox', 'another animal\'s name is a real name here');
  assert.equal(nameToStore('  Maya  ', 'fox'), 'Maya');
  assert.equal(nameToStore(undefined, 'fox'), '');
  assert.equal(isAnimalName('bunny'), true);
  assert.equal(isAnimalName('Maya'), false);
});

test('humanAvatarVsAi: never the computer\'s own animal', () => {
  assert.equal(humanAvatarVsAi('cat', 'fox'), 'cat');
  assert.equal(humanAvatarVsAi('fox', 'fox'), 'bear');
  assert.equal(humanAvatarVsAi('owl', 'owl'), 'bear');
});

test('nextAvatars: all seats in play skips taken animals (the old cycleAvatar)', () => {
  assert.deepEqual(nextAvatars(['fox', 'owl', 'bear'], 0), ['frog', 'owl', 'bear']);
  assert.deepEqual(nextAvatars(['cat', 'owl', 'bear'], 0), ['fox', 'owl', 'bear'], 'wraps around');
  assert.deepEqual(nextAvatars(['fox', 'owl', 'bear'], 7), ['fox', 'owl', 'bear'], 'bad seat: no change');
});

test('nextAvatars: an animal held by a seat not in play is swapped over', () => {
  // 2 players: seat 3's bear is up for grabs, and seat 3 takes the old animal
  assert.deepEqual(nextAvatars(['owl', 'frog', 'bear'], 0, { seats: 2 }), ['bear', 'frog', 'owl']);
  // vs Computer as Fox: skip the computer's animal, start from what is shown
  assert.deepEqual(
    nextAvatars(['fox', 'owl', 'bear'], 0, { seats: 1, avoid: ['fox'], from: 'bear' }),
    ['frog', 'owl', 'bear'],
  );
  assert.deepEqual(
    nextAvatars(['cat', 'owl', 'bear'], 0, { seats: 1, avoid: ['fox'] }),
    ['owl', 'cat', 'bear'],
    'cat wraps past the avoided fox to owl, swapping with seat 2',
  );
  for (const out of [
    nextAvatars(['owl', 'frog', 'bear'], 0, { seats: 2 }),
    nextAvatars(['cat', 'owl', 'bear'], 0, { seats: 1, avoid: ['fox'] }),
  ]) {
    assert.equal(new Set(out).size, 3, 'stored avatars stay distinct');
  }
});
