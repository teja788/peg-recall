/**
 * The UI's single import surface for the rules engine.
 *
 * Everything in app/** and src/ui/** goes through here, so the engine can move
 * without touching the screens. The `@engine` alias in tsconfig.json points at
 * src/engine (it pointed at src/ui/stubs/engine while the engine was in flight).
 */
export {
  activePlayerSpec,
  availableColors,
  chooseMove,
  createAi,
  createGame,
  hiddenPegsByColor,
  isHumanTurn,
  observe,
  observeInitialReveal,
  reduce,
  revealDurationMs,
  aiThinkMs,
} from '@engine';

export type {
  AiObservation,
  AiState,
  AvatarId,
  BoardSize,
  BoardSpec,
  Difficulty,
  GameAction,
  GameConfig,
  GameState,
  LastMove,
  Peg,
  PegColor,
  Phase,
  PlayerSpec,
  RngState,
  Rules,
} from '../engine/types';
