import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createGame, reduce, revealDurationMs } from '../../engine/game';
import { BOARD_SPECS, DEFAULT_RULES, type GameState } from '../../engine/types';
import { DEFAULT_SETTINGS } from '../../store/settingsModel';
import { boardSizesLine, howToPlaySteps, tips, waysToPlay } from '../HowToPlayCopy';

test('four steps in play order', () => {
  const steps = howToPlaySteps({ bonusTurnOnMatch: true, kidMode: false });
  assert.deepEqual(
    steps.map((s) => s.id),
    ['look', 'roll', 'find', 'win'],
  );
  assert.deepEqual(
    steps.map((s) => s.title),
    ['Look', 'Roll', 'Find', 'Win'],
  );
});

test('"go again" only when the bonus turn is on', () => {
  const on = howToPlaySteps({ bonusTurnOnMatch: true, kidMode: false });
  const off = howToPlaySteps({ bonusTurnOnMatch: false, kidMode: false });
  assert.match(on.find((s) => s.id === 'find')!.body, /go again/);
  assert.doesNotMatch(off.find((s) => s.id === 'find')!.body, /go again/);
});

test('the miss rule is folded into Find', () => {
  for (const bonusTurnOnMatch of [true, false]) {
    const find = howToPlaySteps({ bonusTurnOnMatch, kidMode: false }).find((s) => s.id === 'find')!;
    assert.match(find.body, /Wrong\? Everyone sees its color, then it hides\./);
  }
});

test('the copy defaults match the game defaults (bonus turn on, kid mode off)', () => {
  assert.equal(DEFAULT_SETTINGS.bonusTurnOnMatch, true);
  assert.equal(DEFAULT_RULES.bonusTurnOnMatch, true);
  assert.equal(DEFAULT_SETTINGS.kidMode, false);
  assert.match(tips().find((t) => t.id === 'bonus')!.body, /^On to start/);
});

test('tie rule follows kid mode', () => {
  const normal = howToPlaySteps({ bonusTurnOnMatch: true, kidMode: false });
  const kid = howToPlaySteps({ bonusTurnOnMatch: true, kidMode: true });
  assert.match(normal.find((s) => s.id === 'win')!.body, /Tie\? Play a tiny board\. First peg wins\./);
  assert.match(kid.find((s) => s.id === 'win')!.body, /Tie\? You all win!/);
});

test('kid mode really gives a longer look, as the tip says', () => {
  const players = [{ id: 'p1', kind: 'human' as const, avatar: 'fox' as const }];
  const plain = createGame({ boardSize: 'small', players, rules: DEFAULT_RULES, seed: 1 });
  const kid = createGame({
    boardSize: 'small',
    players,
    rules: { ...DEFAULT_RULES, kidMode: true, tieBreak: 'shared' },
    seed: 1,
  });
  assert.equal(revealDurationMs(plain), BOARD_SPECS.small.revealMs);
  assert.ok(revealDurationMs(kid) > revealDurationMs(plain));
  assert.match(tips().find((t) => t.id === 'kid')!.body, /longer look/);
});

test('board sizes line comes from the engine tables', () => {
  assert.equal(boardSizesLine(), 'From Small with 16 pegs to Huge with 40');
  assert.match(waysToPlay().find((w) => w.id === 'board')!.body, /^From Small with 16 pegs to Huge with 40\./);
});

test('sudden death really is "first peg wins" on a tiny board', () => {
  // Two players, tied on an empty board, bonus turn off: play it out by
  // always picking the peg of the rolled colour.
  let s: GameState = createGame({
    boardSize: 'small',
    players: [
      { id: 'p1', kind: 'human', avatar: 'fox' },
      { id: 'p2', kind: 'human', avatar: 'owl' },
    ],
    rules: { ...DEFAULT_RULES, bonusTurnOnMatch: false },
    seed: 7,
  });
  s = reduce(s, { type: 'REVEAL_DONE' });
  for (let guard = 0; guard < 200 && s.phase !== 'gameOver' && !s.suddenDeath; guard++) {
    s = reduce(s, { type: 'ROLL' });
    const i = s.pegs.findIndex((p) => p.state === 'hidden' && p.color === s.dieColor);
    s = reduce(s, { type: 'PICK', pegIndex: i });
    s = reduce(s, { type: 'RESULT_DONE' });
  }
  // 16 pegs, strict alternation, every pick a match: 8 each, a tie
  assert.equal(s.suddenDeath, true);
  assert.equal(s.pegs.length, 9);
  s = reduce(s, { type: 'REVEAL_DONE' });
  s = reduce(s, { type: 'ROLL' });
  const i = s.pegs.findIndex((p) => p.state === 'hidden' && p.color === s.dieColor);
  s = reduce(s, { type: 'PICK', pegIndex: i });
  s = reduce(s, { type: 'RESULT_DONE' });
  assert.equal(s.phase, 'gameOver');
  assert.equal(s.winnerIds.length, 1);
});

test('copy stays short: no step over ~115 characters, no sentence over 10 words', () => {
  for (const ctx of [
    { bonusTurnOnMatch: true, kidMode: false },
    { bonusTurnOnMatch: false, kidMode: true },
  ]) {
    for (const s of howToPlaySteps(ctx)) {
      assert.ok(s.body.length <= 115, `${s.id}: ${s.body.length} chars`);
      for (const sentence of s.body.split(/[.!?]\s*/).filter(Boolean)) {
        const words = sentence.split(/\s+/).length;
        assert.ok(words <= 10, `${s.id}: "${sentence}" has ${words} words`);
      }
    }
  }
});
