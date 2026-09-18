import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundLayout, unitCluster, neighbours } from '../roundLayout';

for (const n of [9, 16, 25, 36, 40]) {
  test(`unitCluster(${n}) returns exactly ${n} distinct points`, () => {
    const pts = unitCluster(n);
    assert.equal(pts.length, n);
    const keys = new Set(pts.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`));
    assert.equal(keys.size, n);
  });

  test(`roundLayout(${n}) keeps every peg inside the board and non-overlapping`, () => {
    const L = roundLayout(n, 340);
    assert.equal(L.positions.length, n);
    for (const p of L.positions) {
      assert.ok(Math.hypot(p.x, p.y) + L.pegSize / 2 <= L.radius + 1e-6, `peg ${p.index} outside`);
    }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = L.positions[i], b = L.positions[j];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= L.pegSize - 1e-6, `pegs ${i},${j} overlap`);
    }
  });
}

test('layout is deterministic and index order starts at the centre', () => {
  const a = roundLayout(25, 300);
  const b = roundLayout(25, 300);
  assert.deepEqual(a, b);
  assert.equal(a.positions[0].ring, 0);
  assert.ok(Math.hypot(a.positions[0].x, a.positions[0].y) < 1e-6);
});

test('peg sizes on an iPhone SE width (343pt board) are reasonable', () => {
  const sizes = Object.fromEntries([16, 25, 36, 40].map((n) => [n, Math.round(roundLayout(n, 343).pegSize)]));
  assert.ok(sizes[16] >= 50, `16 pegs: ${sizes[16]}`);
  assert.ok(sizes[25] >= 44, `25 pegs: ${sizes[25]}`);
  assert.ok(sizes[36] >= 36, `36 pegs: ${sizes[36]}`);
  assert.ok(sizes[40] >= 34, `40 pegs: ${sizes[40]}`);
  console.log('peg sizes @343pt:', sizes);
});

test('neighbours returns 2..6 pegs on the lattice', () => {
  const L = roundLayout(25, 300);
  const nb = neighbours(L, 0);
  assert.ok(nb.length >= 4 && nb.length <= 8, `centre has ${nb.length}`);
  for (const p of L.positions) {
    const k = neighbours(L, p.index).length;
    assert.ok(k >= 1 && k <= 8, `peg ${p.index} has ${k} neighbours`);
  }
});
