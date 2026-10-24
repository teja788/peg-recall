import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reminderPlan } from '../reminderModel';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const show = (plan: ReturnType<typeof reminderPlan>) =>
  plan.map((r) => [r.date.getFullYear(), r.date.getMonth() + 1, r.date.getDate(), r.date.getHours(), r.date.getMinutes(), r.n]);

test('reminderPlan: the next two days at the same time, with their board numbers', () => {
  const played = at(2026, 10, 24, 20, 15); // board #30
  assert.deepEqual(show(reminderPlan(played, played)), [
    [2026, 10, 25, 20, 15, 31],
    [2026, 10, 26, 20, 15, 32],
  ]);
});

test('reminderPlan: across a month end and a year end', () => {
  const oct = at(2026, 10, 31, 7, 5);
  assert.deepEqual(show(reminderPlan(oct, oct)), [
    [2026, 11, 1, 7, 5, 38],
    [2026, 11, 2, 7, 5, 39],
  ]);
  const dec = at(2026, 12, 31, 23, 59);
  assert.deepEqual(show(reminderPlan(dec, dec)), [
    [2027, 1, 1, 23, 59, 99],
    [2027, 1, 2, 23, 59, 100],
  ]);
});

test('reminderPlan: past reminders drop out, so a player who stops gets two at most', () => {
  const played = at(2026, 10, 24, 20, 15);
  assert.equal(reminderPlan(played, at(2026, 10, 25, 9)).length, 2, 'app opened next morning');
  assert.deepEqual(show(reminderPlan(played, at(2026, 10, 25, 21))), [[2026, 10, 26, 20, 15, 32]]);
  assert.deepEqual(reminderPlan(played, at(2026, 10, 26, 20, 15)), []);
  assert.deepEqual(reminderPlan(played, at(2026, 11, 20)), []);
});
