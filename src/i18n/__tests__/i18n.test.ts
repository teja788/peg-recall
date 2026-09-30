import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DICTS, LANGS, pickLang, pluralCategory, setLang, tr, trn, type Key } from '../index';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const dict = (lang: string): Record<string, string> => DICTS[lang as keyof typeof DICTS];
const isExtraPlural = (k: string) => /\.(few|many)$/.test(k);

test('every language has exactly the English keys (plus extra plural forms), none empty', () => {
  const keys = Object.keys(DICTS.en).sort();
  for (const lang of LANGS) {
    assert.deepEqual(Object.keys(dict(lang)).filter((k) => !isExtraPlural(k)).sort(), keys, lang);
    for (const k of Object.keys(dict(lang))) assert.ok(dict(lang)[k].trim(), `${lang} ${k} is empty`);
  }
});

test('every language has the plural forms it needs (CLDR), and no others', () => {
  const bases = Object.keys(DICTS.en).filter((k) => k.endsWith('.one')).map((k) => k.slice(0, -4));
  for (const lang of LANGS) {
    // the forms whole-number counts up to 1000 use (fr/es/it/pt "many" is only for millions)
    const rules = new Intl.PluralRules(lang);
    const needs = Array.from({ length: 1001 }, (_, n) => rules.select(n));
    for (const base of bases) {
      for (const form of ['few', 'many'] as const) {
        assert.equal(`${base}.${form}` in dict(lang), needs.includes(form), `${lang} ${base}.${form}`);
      }
    }
    for (const k of Object.keys(dict(lang)).filter(isExtraPlural)) {
      assert.ok(bases.includes(k.replace(/\.(few|many)$/, '')), `${lang} ${k}: not a plural key`);
    }
  }
});

test('the plural fallback (no Intl.PluralRules on Hermes) agrees with CLDR', () => {
  const expected = LANGS.map((l) => Array.from({ length: 131 }, (_, n) => pluralCategory(l, n)));
  const saved = Intl.PluralRules;
  try {
    (Intl as { PluralRules?: unknown }).PluralRules = undefined;
    LANGS.forEach((l, i) => {
      assert.deepEqual(
        Array.from({ length: 131 }, (_, n) => pluralCategory(l, n)),
        expected[i],
        l,
      );
    });
  } finally {
    (Intl as { PluralRules?: unknown }).PluralRules = saved;
  }
});

test('{placeholders} match the English ones', () => {
  for (const lang of LANGS) {
    for (const k of Object.keys(dict(lang))) {
      const source = DICTS.en[k.replace(/\.(few|many)$/, '.other') as Key];
      assert.deepEqual(new Set(placeholders(dict(lang)[k])), new Set(placeholders(source)), `${lang} ${k}`);
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
  assert.equal(pickLang(['sv-SE', 'fr-CA']), 'fr');
  assert.equal(pickLang(['pt-PT']), 'pt');
  assert.equal(pickLang(['es_MX']), 'es');
  assert.equal(pickLang(['ja']), 'ja');
  assert.equal(pickLang(['sv-SE', 'fi']), 'en');
  assert.equal(pickLang([]), 'en');
  assert.equal(pickLang([null, undefined, '']), 'en');
  // Traditional Chinese for every Chinese locale, Simplified included
  for (const tag of ['zh-Hant', 'zh-TW', 'zh-Hant-HK', 'zh-HK', 'zh-MO', 'zh-Hans', 'zh-CN', 'zh-Hans-CN', 'zh']) {
    assert.equal(pickLang([tag]), 'zh', tag);
  }
  assert.equal(pickLang(['ko-KR']), 'ko');
  assert.equal(pickLang(['tr-TR']), 'tr');
  assert.equal(pickLang(['nl-BE']), 'nl');
  assert.equal(pickLang(['pl-PL']), 'pl');
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
    setLang('pl');
    assert.deepEqual(
      [0, 1, 2, 4, 5, 12, 22, 25, 101, 102].map((n) => trn('pegs', n)),
      ['0 pionków', '1 pionek', '2 pionki', '4 pionki', '5 pionków', '12 pionków', '22 pionki', '25 pionków', '101 pionków', '102 pionki'],
    );
    setLang('ko');
    assert.equal(trn('pegs', 1), '말 1개', 'one form everywhere');
  } finally {
    setLang('en');
  }
});
