import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AI_PARAMS, chooseMove, createAi, observe, observeInitialReveal } from '../ai';
import { createGame, reduce, type PlayerSpec } from '../index';
import { createRng } from '../rng';
import { makeConfig, simulate, winRates } from './helpers';

const owl: PlayerSpec = { id: 'owl', kind: 'ai', avatar: 'owl', difficulty: 'owl' };
const fox: PlayerSpec = { id: 'fox', kind: 'ai', avatar: 'fox', difficulty: 'fox' };
const bunny: PlayerSpec = { id: 'bunny', kind: 'ai', avatar: 'bunny', difficulty: 'bunny' };

test('AI_PARAMS matches the PLAN.md table', () => {
  assert.equal(AI_PARAMS.bunny.memorizeInitial, 0.15);
  assert.equal(AI_PARAMS.fox.memorizeInitial, 0.3);
  assert.equal(AI_PARAMS.owl.memorizeInitial, 0.55);
  assert.equal(AI_PARAMS.bunny.recallP0, 0.55);
  assert.equal(AI_PARAMS.fox.recallP0, 0.72);
  assert.equal(AI_PARAMS.owl.recallP0, 0.92);
  assert.equal(AI_PARAMS.bunny.decayPerTurn, 0.85);
  assert.equal(AI_PARAMS.fox.decayPerTurn, 0.93);
  assert.equal(AI_PARAMS.owl.decayPerTurn, 0.975);
  assert.equal(AI_PARAMS.bunny.maxTracked, 4);
  assert.equal(AI_PARAMS.fox.maxTracked, 10);
  assert.equal(AI_PARAMS.owl.maxTracked, Infinity);
  assert.equal(AI_PARAMS.bunny.slip, 0.15);
  assert.equal(AI_PARAMS.fox.slip, 0.06);
  assert.equal(AI_PARAMS.owl.slip, 0.02);
});

test('observe is pure and records / deletes entries', () => {
  const ai = createAi('owl');
  const seen = observe(ai, { turn: 3, pegIndex: 7, color: 'blue' });
  assert.deepEqual(ai.memory, {}, 'input untouched');
  assert.deepEqual(seen.memory[7], { color: 'blue', lastSeenTurn: 3 });

  const refreshed = observe(seen, { turn: 9, pegIndex: 7, color: 'blue' });
  assert.equal(refreshed.memory[7].lastSeenTurn, 9);

  const gone = observe(refreshed, { turn: 10, pegIndex: 7, color: 'blue', captured: true });
  assert.equal(7 in gone.memory, false, 'captured pegs are forgotten');
  assert.equal(observe(gone, { turn: 11, pegIndex: 7, color: 'blue', captured: true }), gone);
});

test('maxTracked evicts the oldest entries', () => {
  let ai = createAi('bunny'); // maxTracked 4
  for (let i = 0; i < 6; i++) ai = observe(ai, { turn: i, pegIndex: i, color: 'green' });
  assert.equal(Object.keys(ai.memory).length, 4);
  assert.deepEqual(Object.keys(ai.memory).map(Number).sort((a, b) => a - b), [2, 3, 4, 5]);

  let owlAi = createAi('owl'); // unlimited
  for (let i = 0; i < 40; i++) owlAi = observe(owlAi, { turn: i, pegIndex: i, color: 'green' });
  assert.equal(Object.keys(owlAi.memory).length, 40);
});

test('observeInitialReveal memorises roughly the tier probability', () => {
  const state = createGame(makeConfig({ seed: 5, boardSize: 'huge' })); // 40 pegs
  let total = 0;
  let rng = createRng(11);
  const runs = 40;
  for (let i = 0; i < runs; i++) {
    const res = observeInitialReveal(createAi('fox'), state.pegs, rng);
    rng = res.rng;
    total += Object.keys(res.ai.memory).length;
  }
  // Fox memorises 0.40 of 40 pegs, but only 10 are kept (maxTracked).
  const avg = total / runs;
  assert.ok(avg > 9 && avg <= 10, `fox kept ${avg} on average`);

  let owlTotal = 0;
  for (let i = 0; i < runs; i++) {
    const res = observeInitialReveal(createAi('owl'), state.pegs, rng);
    rng = res.rng;
    owlTotal += Object.keys(res.ai.memory).length;
  }
  const owlAvg = owlTotal / runs;
  assert.ok(owlAvg > 18 && owlAvg < 26, `owl memorised ${owlAvg} of 40 on average`);
});

test('chooseMove is pure and deterministic for a given rng', () => {
  const state = reduce(
    createGame(makeConfig({ seed: 9, players: [owl, bunny] })),
    { type: 'REVEAL_DONE' },
  );
  const rolled = reduce(state, { type: 'ROLL' });
  const seeded = observeInitialReveal(createAi('owl'), rolled.pegs, createRng(3));
  const a = chooseMove(seeded.ai, rolled, createRng(77));
  const b = chooseMove(seeded.ai, rolled, createRng(77));
  assert.equal(a.pegIndex, b.pegIndex);
  assert.deepEqual(a.ai, b.ai);
  assert.deepEqual(a.rng, b.rng);
  assert.deepEqual(seeded.ai.memory, Object.assign({}, seeded.ai.memory), 'input not mutated');
  assert.ok(a.rng.counter > 0, 'rng advanced');
  assert.equal(rolled.pegs[a.pegIndex].state, 'hidden');
});

test('a perfectly-remembering AI picks the right peg', () => {
  const state = reduce(createGame(makeConfig({ seed: 15, players: [owl, bunny] })), {
    type: 'REVEAL_DONE',
  });
  const rolled = reduce(state, { type: 'ROLL' });
  // Feed it the whole board explicitly (no memorisation roll).
  let ai = createAi('owl');
  for (const peg of rolled.pegs) ai = observe(ai, { turn: 0, pegIndex: peg.index, color: peg.color });
  let hits = 0;
  for (let i = 0; i < 100; i++) {
    const { pegIndex } = chooseMove(ai, rolled, createRng(i * 31 + 1));
    if (rolled.pegs[pegIndex].color === rolled.dieColor) hits++;
  }
  assert.ok(hits > 85, `owl with a full board hit only ${hits}/100`); // ~97% minus 2% slip
});

test('a blind AI still picks a legal hidden peg', () => {
  const state = reduce(createGame(makeConfig({ seed: 16, players: [owl, bunny] })), {
    type: 'REVEAL_DONE',
  });
  const rolled = reduce(state, { type: 'ROLL' });
  for (const difficulty of ['bunny', 'fox', 'owl'] as const) {
    for (let i = 0; i < 50; i++) {
      const { pegIndex } = chooseMove(createAi(difficulty), rolled, createRng(i));
      assert.ok(pegIndex >= 0 && pegIndex < rolled.pegs.length);
      assert.equal(rolled.pegs[pegIndex].state, 'hidden');
    }
  }
});

test('failed recall deletes the entry (no re-remembering)', () => {
  const state = reduce(createGame(makeConfig({ seed: 21, players: [bunny, owl] })), {
    type: 'REVEAL_DONE',
  });
  const rolled = reduce(state, { type: 'ROLL' });
  const die = rolled.dieColor!;
  const match = rolled.pegs.find((p) => p.color === die)!;
  // Bunny saw it 60 turns ago: p = 0.55 * 0.85^60, essentially zero.
  const stale = { ...rolled, turn: 60 };
  const ai = observe(createAi('bunny'), { turn: 0, pegIndex: match.index, color: die });
  const res = chooseMove(ai, stale, createRng(1));
  assert.equal(match.index in res.ai.memory, false, 'forgotten entry is deleted');
});

test('AI never picks a captured peg over many full games', () => {
  let picks = 0;
  for (let g = 0; g < 40; g++) {
    const config = makeConfig({
      seed: 300 + g,
      boardSize: (['small', 'classic', 'big', 'huge'] as const)[g % 4],
      players: [owl, fox, bunny].slice(0, (g % 2) + 2),
    });
    const { state, aiPicks } = simulate(config, 900 + g * 13);
    assert.equal(state.phase, 'gameOver');
    for (const p of aiPicks) {
      assert.equal(p.wasCaptured, false, `${p.playerId} picked captured peg ${p.pegIndex}`);
      assert.ok(p.pegIndex >= 0);
      picks++;
    }
  }
  assert.ok(picks > 1000, `only ${picks} AI picks sampled`);
});

test('Owl beats Bunny in more than 75% of 200 classic games', () => {
  const tally = winRates([owl, bunny], 200, 'classic');
  const rate = tally.owl / 200;
  console.log(`  Owl vs Bunny: owl ${tally.owl}, bunny ${tally.bunny}, ties ${tally.tie} -> ${(rate * 100).toFixed(1)}%`);
  assert.equal(tally.tie, 0, '25 pegs between 2 players cannot tie');
  assert.ok(rate > 0.75, `owl win rate ${(rate * 100).toFixed(1)}%`);
});

test('Fox beats Bunny in more than 55% of 200 classic games', () => {
  const tally = winRates([fox, bunny], 200, 'classic');
  const rate = tally.fox / 200;
  console.log(`  Fox vs Bunny: fox ${tally.fox}, bunny ${tally.bunny}, ties ${tally.tie} -> ${(rate * 100).toFixed(1)}%`);
  assert.ok(rate > 0.55, `fox win rate ${(rate * 100).toFixed(1)}%`);
});

test('Owl beats Fox (tiers are ordered)', () => {
  const tally = winRates([owl, fox], 200, 'classic');
  const rate = tally.owl / 200;
  console.log(`  Owl vs Fox:   owl ${tally.owl}, fox ${tally.fox}, ties ${tally.tie} -> ${(rate * 100).toFixed(1)}%`);
  assert.ok(rate > 0.55, `owl win rate vs fox ${(rate * 100).toFixed(1)}%`);
});
