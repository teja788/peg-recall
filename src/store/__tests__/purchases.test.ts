import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isGrandfathered, isRightAnswer, mathQuestion } from '../purchasesModel';

test('grandfathered: Production installs from builds 1, 2 and 4 only', () => {
  for (const v of ['1', '2', '4', ' 4 ']) {
    assert.equal(isGrandfathered({ environment: 'Production', originalAppVersion: v }), true, v);
  }
  for (const v of ['5', '12', '1.0', '1.1.0', '', 'abc']) {
    assert.equal(isGrandfathered({ environment: 'Production', originalAppVersion: v }), false, v);
  }
});

test('grandfathered: never in Sandbox, Xcode or TestFlight, or with no transaction', () => {
  for (const environment of ['Sandbox', 'Xcode', '', null]) {
    assert.equal(isGrandfathered({ environment, originalAppVersion: '1' }), false, String(environment));
  }
  assert.equal(isGrandfathered(null), false);
  assert.equal(isGrandfathered(undefined), false);
  assert.equal(isGrandfathered({ environment: 'production', originalAppVersion: '2' }), true);
});

test('math gate: one-digit sums, and only the right answer passes', () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 500; i++) {
    const q = mathQuestion(rand);
    const m = /^(\d) \+ (\d) = \?$/.exec(q.text);
    assert.ok(m, `${q.text}: one-digit addition`);
    assert.equal(q.answer, Number(m[1]) + Number(m[2]));
    assert.equal(isRightAnswer(q, String(q.answer)), true);
    assert.equal(isRightAnswer(q, ` ${q.answer} `), true);
    assert.equal(isRightAnswer(q, String(q.answer + 1)), false);
  }
  const q = { text: '7 × 8 = ?', label: '', answer: 56 };
  for (const bad of ['', '5 6x', '-56', '56.0', 'fifty-six']) assert.equal(isRightAnswer(q, bad), false, bad);
});
