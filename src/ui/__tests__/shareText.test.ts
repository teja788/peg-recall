import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LANGS, setLang } from '../../i18n';
import { COLOR_ROW, PLAY_URL, shareText, type ShareResult } from '../shareText';

const maya = { name: 'Maya', avatar: 'cat', ai: false } as const;
const fox = { avatar: 'fox', ai: true } as const;

const vsFox: ShareResult = {
  board: 'classic',
  players: [
    { ...maya, score: 14, won: true },
    { ...fox, score: 11, won: false },
  ],
  suddenDeath: false,
  rolls: 31,
};

const LONG = 'Alexandrinas'; // NAME_MAX (12) code points
const four: ShareResult = {
  board: 'huge',
  players: (['cat', 'owl', 'bear', 'frog'] as const).map((avatar, i) => ({
    name: `${LONG.slice(0, 11)}${i}`,
    avatar,
    ai: false,
    score: 10,
    won: true,
  })),
  suddenDeath: false,
  rolls: 64,
};

const cases: [string, ShareResult][] = [
  ['vs computer', vsFox],
  ['computer wins', { ...vsFox, players: [{ ...maya, score: 9, won: false }, { ...fox, score: 16, won: true }] }],
  [
    'sudden death',
    {
      ...vsFox,
      players: [{ ...maya, score: 12, won: true }, { ...fox, score: 12, won: false }],
      suddenDeath: true,
    },
  ],
  [
    'three players, a shared win',
    {
      board: 'big',
      players: [
        { name: 'Leo', avatar: 'fox', ai: false, score: 13, won: true },
        { avatar: 'owl', ai: false, score: 13, won: true },
        { name: 'مريم', avatar: 'bear', ai: false, score: 10, won: false },
      ],
      suddenDeath: false,
      rolls: 50,
    },
  ],
  ['four long names, all tied', four],
];

test('English: four lines, the plan layout', () => {
  setLang('en');
  assert.equal(
    shareText(vsFox),
    [
      '🎯 Color Catch · Classic board',
      '🏆 Maya wins! Maya 14 · 🤖 11',
      '🟥🟪🟦🟩🟨💗 25 pegs in 31 rolls',
      `Can you beat that? 👉 ${PLAY_URL}`,
    ].join('\n'),
  );
});

test('the computer is never named; a sudden death and a shared win use the game-over words', () => {
  setLang('en');
  const [, lost, sudden, shared] = cases.map(([, r]) => shareText(r).split('\n')[1]);
  assert.equal(lost, '🏆 🤖 wins! 🤖 16 · Maya 9');
  assert.equal(sudden, '🏆 Maya wins the sudden death! Maya 12 · 🤖 12');
  assert.match(shared, /^🏆 Leo and Owl share the win! /);
  assert.ok(!shareText(vsFox).includes('Fox'));
});

test('every language: ≤ 6 lines, ≤ 300 characters, colour row, link, no {placeholder} left', () => {
  try {
    for (const lang of LANGS) {
      setLang(lang);
      for (const [name, r] of cases) {
        const s = shareText(r);
        const where = `${lang} ${name}`;
        assert.ok(s.split('\n').length <= 6, where);
        assert.ok(s.length <= 300, `${where}: ${s.length} chars\n${s}`);
        assert.ok(s.includes(COLOR_ROW), where);
        assert.ok(s.endsWith(PLAY_URL), where);
        assert.ok(!/\{\w+\}/.test(s), `${where}: ${s}`);
        assert.ok(s.includes('Color Catch'), where);
      }
    }
  } finally {
    setLang('en');
  }
});

test('Arabic: a Latin name is fenced off, numbers stay Western', () => {
  try {
    setLang('ar');
    const line = shareText(vsFox).split('\n')[1];
    assert.ok(line.includes('⁨Maya⁩ 14'), line);
    assert.ok(/[0-9]/.test(line) && !/[٠-٩]/.test(line), line);
  } finally {
    setLang('en');
  }
});
