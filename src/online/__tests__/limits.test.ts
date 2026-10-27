import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FREE_BOARDS, FREE_SEATS, needsUnlock } from '../limits';

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
