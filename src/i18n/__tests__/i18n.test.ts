import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DICTS, LANGS, pickLang, setLang, tr, trn, type Key } from '../index';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('every language has exactly the English keys, none empty', () => {
  const keys = Object.keys(DICTS.en).sort();
  for (const lang of LANGS) {
    assert.deepEqual(Object.keys(DICTS[lang]).sort(), keys, lang);
    for (const k of keys) assert.ok(DICTS[lang][k as Key].trim(), `${lang} ${k} is empty`);
  }
});

test('{placeholders} match the English ones', () => {
  for (const lang of LANGS) {
    for (const k of Object.keys(DICTS.en) as Key[]) {
      assert.deepEqual(new Set(placeholders(DICTS[lang][k])), new Set(placeholders(DICTS.en[k])), `${lang} ${k}`);
    }
  }
});

test('plural keys come in .one / .other pairs', () => {
  for (const k of Object.keys(DICTS.en)) {
    if (k.endsWith('.one')) assert.ok(`${k.slice(0, -4)}.other` in DICTS.en, k);
    if (k.endsWith('.other')) assert.ok(`${k.slice(0, -6)}.one` in DICTS.en, k);
  }
});

test('pickLang: first supported preferred locale, else English', () => {
  assert.equal(pickLang(['de-AT', 'en-US']), 'de');
  assert.equal(pickLang(['nl-NL', 'fr-CA']), 'fr');
  assert.equal(pickLang(['pt-PT']), 'pt');
  assert.equal(pickLang(['es_MX']), 'es');
  assert.equal(pickLang(['ja']), 'ja');
  assert.equal(pickLang(['ko-KR', 'nl']), 'en');
  assert.equal(pickLang([]), 'en');
  assert.equal(pickLang([null, undefined, '']), 'en');
});

test('tr / trn fill placeholders in the current language', () => {
  try {
    assert.equal(tr('game.find', { color: 'Red' }), 'Find Red');
    assert.equal(trn('pegs', 1), '1 peg');
    assert.equal(trn('pegs', 3), '3 pegs');
    setLang('de');
    assert.equal(tr('game.turn', { name: 'Mia' }), 'Mia ist dran');
    assert.equal(trn('seconds', 1), '1 Sekunde');
    setLang('fr');
    assert.equal(trn('pegs', 0), '0 pion', 'French: zero is singular');
  } finally {
    setLang('en');
  }
});
