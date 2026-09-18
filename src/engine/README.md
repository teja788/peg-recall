# Color Catch engine

Pure TypeScript. No React, no React Native, no Node built-ins — safe to import
from anywhere (UI, tests, a future server). Every state is a plain
JSON-serialisable object, the RNG included, so a game can be stored and replayed.

```ts
import { createGame, reduce, DEFAULT_RULES, ai, type GameState } from '../engine';
```

## Test + typecheck

`package.json` is owned by another agent, so run the commands directly:

```sh
npx tsx --test src/engine/__tests__/*.test.ts     # unit tests (~4 s)
npx tsc --noEmit -p .                             # typecheck
```

(The intended script, once someone may edit package.json:
`"test": "tsx --test src/engine/__tests__/*.test.ts"`.)

## State machine

```
reveal --REVEAL_DONE--> roll --ROLL--> pick --PICK--> result --RESULT_DONE--> roll | reveal* | gameOver
```

\* `reveal` again only when a tie starts a sudden-death mini board.

- `createGame(config)` → `phase: 'reveal'`, **all pegs `state: 'revealed'`**
  (face-up during the countdown). `REVEAL_DONE` flips them to `'hidden'`.
- `ROLL` sets `dieColor`, rerolling internally until it hits a colour that still
  has pegs on the board. `dieRerolls` says how many rerolls happened (the UI can
  add ~300 ms of tumble each).
- `PICK` sets `phase: 'result'`, increments `turn`, fills `lastMove`. A match
  captures the peg (`capturedBy`, `scores[id]++`); a miss sets the peg to
  `'revealed'` so everyone sees the colour.
- `RESULT_DONE` flips a missed peg back to `'hidden'`, clears `dieColor`, then:
  board empty → `gameOver` (or sudden death); match + `rules.bonusTurnOnMatch` →
  same player rolls again; otherwise the next seat in `activeSeats`.
- `RESTART` rebuilds the same config with a new seed (`action.seed` or one
  derived from the current RNG).

**Invalid actions never throw** — `reduce` returns the *same object*
(`next === state`), so the UI can dispatch freely: `PICK` on a captured peg, an
out-of-range index, `ROLL` in the wrong phase, anything after `gameOver`.

## Determinism

`config.seed` fixes the whole game: board layout, the remainder colours, and the
entire die sequence. Two games with the same seed and the same picks are
identical.

## Ties

- `rules.tieBreak === 'shared'` or `rules.kidMode` → `gameOver` with every tied
  id in `winnerIds`.
- `rules.tieBreak === 'suddenDeath'` → a 3x3 mini board (`SUDDEN_DEATH_SPEC`,
  9 pegs, 3 colours x 3), `suddenDeath: true`, `phase: 'reveal'`,
  `activeSeats` narrowed to the tied seats, `winnerIds` holding the tied ids
  while it is pending. Main-game `scores` are **kept** (still show them);
  mini-board captures land in `suddenDeathScores`. The first capture ends the
  game with a single `winnerIds` entry.

A sudden-death board is identified by `state.suddenDeath === true`, and its
dimensions by `state.spec` — always read the grid from `state.spec`, not from
`BOARD_SPECS[config.boardSize]`.

## Helpers

| Function | |
|---|---|
| `hiddenPegsByColor(state)` | per-colour count of pegs still on the board |
| `availableColors(state)` | colours the die can still show |
| `isHumanTurn(state)` | active seat is a human |
| `activePlayerSpec(state)` | the active `PlayerSpec` |
| `activeSeats(state)` | seat indices in the rotation |
| `revealDurationMs(state)` | reveal countdown, kid mode x1.5 |
| `boardSpec(size)` | `BOARD_SPECS[size]` |
| `adjacentIndices(i, spec)` | orthogonal neighbours |

## AI (`ai.ts`)

```ts
let brain = ai.createAi('fox');
// 1. opening reveal: every peg is shown, each memorised with p = memorizeInitial
({ ai: brain, rng } = ai.observeInitialReveal(brain, state.pegs, rng));
// 2. its turn (phase 'pick', dieColor set)
const move = ai.chooseMove(brain, state, rng);   // { pegIndex, ai, rng }
// 3. after EVERY pick by ANY player, show the result to every AI
brain = ai.observe(brain, { turn: state.turn, pegIndex, color, captured: matched });
```

- All three functions are pure; `chooseMove` returns the advanced `rng`, so an AI
  turn is reproducible from a seed. Pass the *game* RNG or a separate AI RNG —
  just keep threading the returned one.
- A failed recall **deletes** the entry (no sudden re-remembering), which is why
  `chooseMove` returns a new `AiState` you must keep.
- Memory is indexed by peg index, so **create fresh brains when the board
  changes** (sudden death, restart).
- `AI_PARAMS` holds the PLAN.md section 3 table.

Measured over 200 seeded games each on the classic 5x5 board (bonus turn on):
Owl beats Bunny 100%, Fox beats Bunny 92.5%, Owl beats Fox 99%.
