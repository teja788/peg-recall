/**
 * Shared test harness: drives complete games through the reducer.
 * Not a *.test.ts file, so the test runner does not execute it directly.
 */

import {
  DEFAULT_RULES,
  activePlayerSpec,
  createGame,
  reduce,
  type Difficulty,
  type GameConfig,
  type GameState,
  type PlayerSpec,
  type Rules,
} from '../index';
import { chooseMove, createAi, observe, observeInitialReveal, type AiState } from '../ai';
import { createRng, nextInt, type RngState } from '../rng';

export interface SimResult {
  state: GameState;
  /** Every (pegIndex, state-before-the-pick) an AI player chose. */
  aiPicks: { playerId: string; pegIndex: number; wasCaptured: boolean }[];
  steps: number;
}

export function aiPlayer(id: string, difficulty: Difficulty, avatar: PlayerSpec['avatar']): PlayerSpec {
  return { id, kind: 'ai', avatar, difficulty };
}

export function makeConfig(partial: Partial<GameConfig> & { seed: number }): GameConfig {
  return {
    boardSize: 'classic',
    players: [
      { id: 'p1', kind: 'human', avatar: 'fox' },
      { id: 'p2', kind: 'human', avatar: 'owl' },
    ],
    rules: { ...DEFAULT_RULES },
    ...partial,
  };
}

export function rules(partial: Partial<Rules>): Rules {
  return { ...DEFAULT_RULES, ...partial };
}

/** Fresh AI brains for the current board (memory is per-board). */
function freshBrains(state: GameState, rng: RngState): { brains: Record<string, AiState>; rng: RngState } {
  const brains: Record<string, AiState> = {};
  let r = rng;
  for (const p of state.config.players) {
    if (p.kind !== 'ai') continue;
    const seeded = observeInitialReveal(createAi(p.difficulty ?? 'bunny'), state.pegs, r, state.turn);
    brains[p.id] = seeded.ai;
    r = seeded.rng;
  }
  return { brains, rng: r };
}

/**
 * Play a whole game. AI seats use chooseMove; human seats pick a random hidden
 * peg. Sudden death (a new board) resets every AI's memory, as the app must.
 */
export function simulate(config: GameConfig, aiSeed: number): SimResult {
  let state = createGame(config);
  let r = createRng(aiSeed);
  let { brains, rng } = freshBrains(state, r);
  r = rng;
  state = reduce(state, { type: 'REVEAL_DONE' });

  const aiPicks: SimResult['aiPicks'] = [];
  let steps = 0;

  while (state.phase !== 'gameOver' && steps < 20000) {
    steps++;

    if (state.phase === 'reveal') {
      const seeded = freshBrains(state, r);
      brains = seeded.brains;
      r = seeded.rng;
      state = reduce(state, { type: 'REVEAL_DONE' });
      continue;
    }

    state = reduce(state, { type: 'ROLL' });
    if (state.phase !== 'pick') throw new Error(`ROLL left phase ${state.phase}`);

    const player = activePlayerSpec(state);
    let pegIndex: number;
    if (player.kind === 'ai') {
      const move = chooseMove(brains[player.id], state, r);
      brains[player.id] = move.ai;
      r = move.rng;
      pegIndex = move.pegIndex;
      aiPicks.push({
        playerId: player.id,
        pegIndex,
        wasCaptured: state.pegs[pegIndex]?.state === 'captured',
      });
    } else {
      const hidden = state.pegs.filter((p) => p.state === 'hidden').map((p) => p.index);
      const [i, next] = nextInt(r, hidden.length);
      r = next;
      pegIndex = hidden[i];
    }

    const before = state;
    state = reduce(state, { type: 'PICK', pegIndex });
    if (state === before) throw new Error(`PICK ${pegIndex} was rejected in phase ${before.phase}`);

    const move = state.lastMove!;
    const color = state.pegs[move.pegIndex].color;
    for (const id of Object.keys(brains)) {
      brains[id] = observe(brains[id], {
        turn: state.turn,
        pegIndex: move.pegIndex,
        color,
        captured: move.matched,
      });
    }

    state = reduce(state, { type: 'RESULT_DONE' });
  }

  return { state, aiPicks, steps };
}

/** Win counts over `games` simulations, keyed by player id ('' = shared tie). */
export function winRates(
  players: PlayerSpec[],
  games: number,
  boardSize: GameConfig['boardSize'] = 'classic',
  ruleOverrides: Partial<Rules> = {},
): Record<string, number> {
  const tally: Record<string, number> = { tie: 0 };
  for (const p of players) tally[p.id] = 0;
  for (let g = 0; g < games; g++) {
    // Alternate seat order so neither tier keeps the first-move advantage.
    const seats = g % 2 === 0 ? players : players.slice().reverse();
    const config = makeConfig({
      seed: 1000 + g * 7919,
      players: seats,
      boardSize,
      rules: rules(ruleOverrides),
    });
    const { state } = simulate(config, 50000 + g * 104729);
    if (state.winnerIds.length === 1) tally[state.winnerIds[0]] += 1;
    else tally.tie += 1;
  }
  return tally;
}
