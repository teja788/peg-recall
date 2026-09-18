import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createRng, nextFloat, nextInt, shuffle, deriveSeed, chance } from '../rng';

test('nextFloat is pure and deterministic', () => {
  const rng = createRng(42);
  const [a, r1] = nextFloat(rng);
  const [b] = nextFloat(rng);
  assert.equal(a, b, 'same state gives the same value');
  assert.equal(rng.counter, 0, 'input state is not mutated');
  assert.equal(r1.counter, 1);
  assert.ok(a >= 0 && a < 1);
  const [c] = nextFloat(r1);
  assert.notEqual(a, c);
});

test('different seeds diverge', () => {
  const [a] = nextFloat(createRng(1));
  const [b] = nextFloat(createRng(2));
  assert.notEqual(a, b);
});

test('nextInt stays in range and is roughly uniform', () => {
  let rng = createRng(7);
  const counts = new Array(6).fill(0);
  for (let i = 0; i < 60000; i++) {
    const [v, next] = nextInt(rng, 6);
    rng = next;
    assert.ok(Number.isInteger(v) && v >= 0 && v < 6);
    counts[v]++;
  }
  for (const c of counts) assert.ok(c > 9000 && c < 11000, `bucket ${c} off uniform`);
});

test('nextInt(n<=0) is a no-op', () => {
  const rng = createRng(3);
  assert.deepEqual(nextInt(rng, 0), [0, rng]);
});

test('shuffle is a permutation, pure, and seed-stable', () => {
  const src = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const [a, r1] = shuffle(createRng(99), src);
  const [b] = shuffle(createRng(99), src);
  assert.deepEqual(a, b);
  assert.deepEqual(src, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'input untouched');
  assert.deepEqual([...a].sort((x, y) => x - y), src);
  assert.ok(r1.counter > 0);
  const [c] = shuffle(createRng(100), src);
  assert.notDeepEqual(a, c);
});

test('chance respects its probability', () => {
  let rng = createRng(5);
  let hits = 0;
  for (let i = 0; i < 20000; i++) {
    const [hit, next] = chance(rng, 0.25);
    rng = next;
    if (hit) hits++;
  }
  assert.ok(hits > 4500 && hits < 5500, `hits=${hits}`);
  assert.equal(chance(createRng(1), 0)[0], false);
  assert.equal(chance(createRng(1), 1)[0], true);
});

test('deriveSeed produces a fresh uint32', () => {
  const [s, next] = deriveSeed(createRng(11));
  assert.ok(Number.isInteger(s) && s >= 0 && s <= 0xffffffff);
  assert.equal(next.counter, 1);
});
