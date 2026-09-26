import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CHIPS_SHOWN, chipTarget, inLineup, seatLabel } from '../lineup';

test('chipTarget: the focused field wins', () => {
  assert.equal(chipTarget(1, ['Maya', 'Leo', ''], 3), 1);
  assert.equal(chipTarget(0, ['', '', ''], 2), 0);
});

test('chipTarget: else the first seat in play still on its default name', () => {
  assert.equal(chipTarget(null, ['Maya', '', ''], 3), 1);
  assert.equal(chipTarget(null, ['', 'Leo', ''], 2), 0);
  assert.equal(chipTarget(null, ['Maya', 'Leo', ''], 2), -1, 'seat 3 is not in a 2-player game');
  assert.equal(chipTarget(null, ['Maya', 'Leo', 'Sam'], 3), -1);
  assert.equal(chipTarget(null, ['Maya', '', ''], 1), -1, 'vs Computer: one seat only');
});

test('chipTarget: a focus outside the seats in play is ignored', () => {
  assert.equal(chipTarget(2, ['', '', ''], 2), 0);
  assert.equal(chipTarget(-1, ['Maya', '', ''], 3), 1);
});

test('inLineup: ignores case and seats not in play', () => {
  assert.equal(inLineup('maya', ['Maya', '', ''], 1), true);
  assert.equal(inLineup('Sam', ['Maya', 'Leo', 'Sam'], 2), false);
  assert.equal(inLineup('Sam', ['Maya', 'Leo', 'Sam'], 3), true);
  assert.equal(inLineup('', ['', '', ''], 3), false, 'a blank never matches a default seat');
});

test('seatLabel: what VoiceOver says for a seat', () => {
  assert.equal(seatLabel(0, 'Fox', 'Maya'), 'Player 1, Fox, named Maya');
  assert.equal(seatLabel(2, 'Bear', ''), 'Player 3, Bear');
  assert.equal(CHIPS_SHOWN, 6);
});
