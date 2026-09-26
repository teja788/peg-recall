/**
 * The UI's single import surface for the rules engine.
 *
 * Screens read game state through here, so the engine can move without
 * touching them. Only what a screen actually calls is re-exported — the store
 * (src/store/game.ts) talks to the engine directly, and types come straight
 * from src/engine/types.
 */
export { activePlayerSpec, availableColors, isHumanTurn, revealDurationMs } from '@engine';
