/**
 * Color Catch — deterministic, purely functional RNG.
 *
 * mulberry32 mixing over a counter-based state so that {seed, counter} is a
 * plain serialisable object: the same {seed, counter} always yields the same
 * value, and every function returns the advanced state instead of mutating.
 *
 * No React Native / Node imports. Safe in the Hermes engine.
 */

import type { RngState } from './types';

export type { RngState };

/** Fresh RNG for a seed. */
export function createRng(seed: number): RngState {
  return { seed: seed >>> 0, counter: 0 };
}

/** Next raw 32-bit unsigned integer. */
export function nextUint32(rng: RngState): [number, RngState] {
  let t = (rng.seed + Math.imul(rng.counter + 1, 0x6d2b79f5)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = (t ^ (t >>> 14)) >>> 0;
  return [value, { seed: rng.seed, counter: rng.counter + 1 }];
}

/** Uniform float in [0, 1). */
export function nextFloat(rng: RngState): [number, RngState] {
  const [value, next] = nextUint32(rng);
  return [value / 4294967296, next];
}

/** Uniform integer in [0, n). Returns 0 (and an unchanged rng) when n <= 0. */
export function nextInt(rng: RngState, n: number): [number, RngState] {
  if (!Number.isFinite(n) || n <= 0) return [0, rng];
  const [f, next] = nextFloat(rng);
  const i = Math.floor(f * n);
  return [i >= n ? n - 1 : i, next];
}

/** Returns a shuffled COPY of arr (Fisher-Yates) plus the advanced rng. */
export function shuffle<T>(rng: RngState, arr: readonly T[]): [T[], RngState] {
  const out = arr.slice();
  let r = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const [j, next] = nextInt(r, i + 1);
    r = next;
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return [out, r];
}

/** Pick one element uniformly. Returns undefined for an empty array. */
export function pick<T>(rng: RngState, arr: readonly T[]): [T | undefined, RngState] {
  if (arr.length === 0) return [undefined, rng];
  const [i, next] = nextInt(rng, arr.length);
  return [arr[i], next];
}

/** true with probability p. */
export function chance(rng: RngState, p: number): [boolean, RngState] {
  const [f, next] = nextFloat(rng);
  return [f < p, next];
}

/** Derive a fresh, unrelated seed (used by RESTART and sudden death). */
export function deriveSeed(rng: RngState): [number, RngState] {
  const [v, next] = nextUint32(rng);
  return [v >>> 0, next];
}
