/**
 * Color Catch — public engine API.
 *
 * The UI imports ONLY from here:
 *   import { createGame, reduce, ai, rng, type GameState } from '../engine';
 *
 * Pure TypeScript: no React, no React Native, no Node built-ins.
 */

import * as aiModule from './ai';
import * as rngModule from './rng';

export * from './types';
export * from './game';
export * from './rng';
export {
  AI_PARAMS,
  aiParams,
  aiThinkMs,
  chooseMove,
  createAi,
  observe,
  observeInitialReveal,
} from './ai';

/** Namespaced access, for call sites that prefer `ai.chooseMove(...)`. */
export const ai = aiModule;
export const rng = rngModule;
