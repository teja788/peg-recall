import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setLang } from '../../i18n';
import { challengeBanner, challengeUrl, challengeVerdict, cleanChallengeName, parseChallenge } from '../challenge';
import { shareText } from '../shareText';

const TODAY = 47;

test('a good link: board, score, rolls and name', () => {
  assert.deepEqual(parseChallenge({ n: '47', s: '8', r: '14', by: 'Ravi' }, TODAY), {
    n: 47,
    challenge: { n: 47, s: 8, r: 14, by: 'Ravi' },
  });
  // an older board, tomorrow's (time zones), no name, the edges of the ranges
  assert.deepEqual(parseChallenge({ n: '0', s: '0', r: '0' }, TODAY).challenge, { n: 0, s: 0, r: 0 });
  assert.equal(parseChallenge({ n: '48', s: '40', r: '999' }, TODAY).challenge?.n, 48);
});

test('a bad board number opens today, with no challenge', () => {
  for (const n of ['49', '-1', '4.5', '1e1', '047', '', 'abc', undefined, ['47'], '99999999'])
    assert.deepEqual(parseChallenge({ n, s: '8', r: '14' }, TODAY), { n: TODAY, challenge: null }, String(n));
});

test('a bad score or roll count opens the board, with no challenge', () => {
  for (const [s, r] of [['41', '14'], ['999', '14'], ['8', '1000'], ['-1', '14'], ['8', ''], [undefined, '14'], ['8', ['14']], [' 8', '14']])
    assert.deepEqual(parseChallenge({ n: '45', s, r }, TODAY), { n: 45, challenge: null }, `${s} ${r}`);
});

test('names keep letters, marks, digits and spaces only, 16 at most', () => {
  assert.equal(cleanChallengeName('  Ravi   Teja '), 'Ravi Teja');
  assert.equal(cleanChallengeName('<script>alert(1)</script>'), 'scriptalert1scri'); // cut at 16
  assert.equal(cleanChallengeName('https://evil.ex/x'), 'httpsevilexx');
  assert.equal(cleanChallengeName('Maya🎉‮\u0000\n'), 'Maya');
  assert.equal(cleanChallengeName('रवि तेजा'), 'रवि तेजा'); // Devanagari vowel signs are marks
  assert.equal(cleanChallengeName('José'), 'José');
  assert.equal(cleanChallengeName('مريم'), 'مريم');
  assert.equal(cleanChallengeName('abcdefghijklmnopqrstuvwxyz'), 'abcdefghijklmnop');
  for (const v of ['', '   ', '🎉🎉', '<>/', undefined, 42, ['Ravi']]) assert.equal(cleanChallengeName(v), undefined, String(v));
  assert.equal(parseChallenge({ n: '47', s: '8', r: '14', by: '<>' }, TODAY).challenge?.by, undefined);
});

test('the link round-trips', () => {
  const url = challengeUrl('https://colorcatch.pages.dev', { n: 47, s: 8, r: 14, by: 'Ravi Teja' });
  assert.equal(url, 'https://colorcatch.pages.dev/d/47?s=8&r=14&by=Ravi%20Teja');
  const u = new URL(url);
  const q = Object.fromEntries(u.searchParams);
  assert.deepEqual(parseChallenge({ n: u.pathname.split('/')[2], ...q }, TODAY).challenge, { n: 47, s: 8, r: 14, by: 'Ravi Teja' });
  assert.equal(challengeUrl('https://x.dev', { n: 3, s: 1, r: 2, by: '' }), 'https://x.dev/d/3?s=1&r=2');
});

test('banner, verdict and the share line read right', () => {
  setLang('en');
  const ravi = { n: 47, s: 8, r: 14, by: 'Ravi' };
  assert.equal(challengeBanner(ravi), 'Ravi caught 8 pegs in 14 rolls. Beat it!');
  assert.equal(challengeBanner({ n: 47, s: 1, r: 3 }), 'A friend caught 1 peg in 3 rolls. Beat it!');
  assert.equal(challengeVerdict(ravi, 9), 'You 9 · Ravi 8 — You beat Ravi!');
  assert.equal(challengeVerdict(ravi, 7), 'You 7 · Ravi 8 — Ravi wins this one');
  assert.equal(challengeVerdict(ravi, 8), 'You 8 · Ravi 8 — A tie!');
  assert.equal(challengeVerdict({ n: 47, s: 8, r: 14 }, 9), 'You 9 · A friend 8 — You win this one!');
  const text = shareText(
    { daily: 47, board: 'classic', players: [{ avatar: 'cat', ai: false, score: 8, won: true }], suddenDeath: false, rolls: 14 },
    'https://x.dev/d/47?s=8&r=14',
    true,
  );
  assert.ok(text.endsWith('Can you beat me? 👉 https://x.dev/d/47?s=8&r=14'), text);
});
