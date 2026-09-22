/**
 * Color Catch — public engine API.
 *
 * The UI imports ONLY from here:
 *   import { createGame, reduce, chooseMove, type GameState } from '../engine';
 *
 * Pure TypeScript: no React, no React Native, no Node built-ins.
 */

export * from './types';
export * from './game';
export * from './rng';
export {
  AI_PARAMS,
  aiThinkMs,
  boardNeighbours,
  chooseMove,
  createAi,
  observe,
  observeInitialReveal,
} from './ai';
