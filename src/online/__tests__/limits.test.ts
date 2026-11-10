import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FREE_BOARDS, FREE_HOST_GAMES, FREE_SEATS, hostGamesLeft, needsUnlock } from '../limits';

test('limits off (the beta) or an unlocked host: nothing needs the unlock', () => {
  const big = { board: 'huge' as const, maxSeats: 4, bot: 'owl' as const };
  assert.equal(needsUnlock(false, false, big), false);
  assert.equal(needsUnlock(true, true, big), false);
});

test('limits on, free host: 2 seats, Small or Classic, no Owl', () => {
  assert.deepEqual([...FREE_BOARDS], ['small', 'classic']);
  assert.equal(FREE_SEATS, 2);
  assert.equal(needsUnlock(true, false, { board: 'classic', maxSeats: 2 }), false);
  assert.equal(needsUnlock(true, false, { board: 'small', maxSeats: 2, bot: 'fox' }), false);
  assert.equal(needsUnlock(true, false, { board: 'big' }), true);
  assert.equal(needsUnlock(true, false, { maxSeats: 3 }), true);
  assert.equal(needsUnlock(true, false, { bot: 'owl' }), true);
  assert.equal(needsUnlock(true, false, {}), false, 'joining asks for nothing');
});

test('free host: 3 online games a day in the app; unlocked or web: no limit', () => {
  const today = '2026-11-10';
  assert.equal(FREE_HOST_GAMES, 3);
  assert.equal(hostGamesLeft(false, false, { day: '', n: 0 }, today), 3);
  assert.equal(hostGamesLeft(false, false, { day: today, n: 2 }, today), 1);
  assert.equal(hostGamesLeft(false, false, { day: today, n: 3 }, today), 0);
  assert.equal(hostGamesLeft(false, false, { day: today, n: 9 }, today), 0);
  assert.equal(hostGamesLeft(false, false, { day: '2026-11-09', n: 3 }, today), 3, 'a new day starts over');
  assert.equal(hostGamesLeft(true, false, { day: today, n: 3 }, today), Infinity);
  assert.equal(hostGamesLeft(false, true, { day: today, n: 3 }, today), Infinity);
});
