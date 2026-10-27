import { create } from 'zustand';

import {
  activePlayerSpec,
  aiSeedFor,
  aiThinkMs,
  computerPick,
  createGame,
  freshBrains as brainsFor,
  isHumanTurn,
  observePick,
  reduce,
  resultMs,
  tumbleMs,
} from '../engine';
import type {
  AiState,
  AvatarId,
  Difficulty,
  GameAction,
  GameConfig,
  GameState,
  PlayerSpec,
  RngState,
} from '../engine/types';
import { stateHash } from '../online/hash';
import type { Intent } from '../online/protocol';
import { timing } from '../theme/tokens';
import { AVATAR_CYCLE, humanAvatarVsAi, type GameMode, type Settings } from './settingsModel';
import { useStats } from './stats';

/* ---------------------------------------------------------------- timers */

/**
 * The clock the store schedules against. Real timers in the app; a fake one in
 * the tests, which is the only reason this is injectable.
 */
export interface GameScheduler {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

const REAL_SCHEDULER: GameScheduler = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

let clock: GameScheduler = REAL_SCHEDULER;

/** Test seam. Pass null to go back to real timers. */
export function setGameScheduler(s: GameScheduler | null) {
  clock = s ?? REAL_SCHEDULER;
}

let generation = 0;

/** A scheduled step of the game, kept so the pause menu can freeze it mid-flight. */
interface Pending {
  fn: () => void;
  /** which game this belongs to — a stale one never runs */
  gen: number;
  /** wall-clock time it should fire at; shifted forward by however long we paused */
  due: number;
  handle: unknown;
}

let timers = new Map<number, Pending>();
let nextTimerId = 1;
/** non-null while the game is paused: when we stopped the clock */
let pausedAt: number | null = null;

function clearTimers() {
  timers.forEach((p) => {
    if (p.handle != null) clock.clearTimeout(p.handle);
  });
  timers = new Map();
  pausedAt = null;
}

function arm(id: number, p: Pending, ms: number) {
  p.handle = clock.setTimeout(() => {
    timers.delete(id);
    if (p.gen === generation) p.fn();
  }, Math.max(0, ms));
}

/** setTimeout that is cancelled by teardown/restart, frozen by pause, and
 *  ignores stale runs. */
function later(fn: () => void, ms: number) {
  const id = nextTimerId++;
  // While paused the clock is stopped at `pausedAt`, and resumeTimers pushes
  // every due date forward by however long the pause lasted. Stamping this one
  // from the live clock instead would have that shift added on top of the wait
  // it has not even started yet.
  const from = pausedAt ?? clock.now();
  const p: Pending = { fn, gen: generation, due: from + ms, handle: null };
  timers.set(id, p);
  if (pausedAt == null) arm(id, p, ms);
}

/** Stop the clock. Every pending step keeps the time it had left. */
function pauseTimers() {
  if (pausedAt != null) return;
  pausedAt = clock.now();
  timers.forEach((p) => {
    if (p.handle != null) clock.clearTimeout(p.handle);
    p.handle = null;
  });
}

/** Start it again, each step picking up exactly where it was interrupted. */
function resumeTimers() {
  if (pausedAt == null) return;
  const now = clock.now();
  const slept = now - pausedAt;
  pausedAt = null;
  timers.forEach((p, id) => {
    p.due += slept;
    arm(id, p, p.due - now);
  });
}

/* ------------------------------------------------------------ player setup */

/** A seat's typed name, if any. Only ever given to HUMAN seats: the computer is
 *  always called by its animal (Bunny, Fox, Owl). */
function nameFor(s: Settings, seat: number): string | undefined {
  const n = s.names?.[seat];
  return typeof n === 'string' && n.trim() ? n.trim() : undefined;
}

function seatsFor(mode: GameMode, s: Settings): PlayerSpec[] {
  const avatars = s.avatars;
  if (mode === 'ai') {
    // the computer wears the face of its difficulty: Bunny, Fox or Owl
    const aiAvatar: AvatarId = s.difficulty;
    // never "Fox vs Fox": the same rule the "Who's playing?" sheet shows
    const human = humanAvatarVsAi(avatars[0], aiAvatar);
    const you: PlayerSpec = { id: 'p1', kind: 'human', avatar: human };
    const name = nameFor(s, 0);
    if (name) you.name = name;
    return [you, { id: 'p2', kind: 'ai', avatar: aiAvatar, difficulty: s.difficulty as Difficulty }];
  }
  const count = mode === '4p' ? 4 : mode === '3p' ? 3 : 2;
  return Array.from({ length: count }, (_, i) => {
    const seat: PlayerSpec = { id: `p${i + 1}`, kind: 'human', avatar: avatars[i] ?? AVATAR_CYCLE[i] };
    const name = nameFor(s, i);
    if (name) seat.name = name;
    return seat;
  });
}

export function configFor(mode: GameMode, s: Settings, seed = Date.now()): GameConfig {
  return {
    boardSize: s.boardSize,
    players: seatsFor(mode, s),
    rules: {
      bonusTurnOnMatch: s.bonusTurnOnMatch,
      tieBreak: s.kidMode ? 'shared' : 'suddenDeath',
      kidMode: s.kidMode,
    },
    seed,
  };
}

// The die reads the tumble length from here (src/ui/Die.tsx); it is the
// engine's, which the room server shares.
export { tumbleMs };

/* ------------------------------------------------------------------ store */

export type MoveFeedback = { kind: 'match' | 'miss'; pegIndex: number; nonce: number } | null;

/**
 * An online game (PLAN-web-online.md §B7): the room server is the referee.
 * This device's taps go to it as intents; its numbered actions come back and
 * are played here with the usual animations. Set by the room store.
 */
export interface RemoteSeat {
  /** this device's seat ('p1'..'p4') */
  seat: string;
  send: (intent: Intent) => void;
  /** the board no longer matches the server's (a missed message): ask for a snapshot */
  resync: () => void;
}

interface GameStore {
  state: GameState | null;
  ais: Record<string, AiState>;
  /** true while a UI animation owns the screen: die tumble, match/miss result. */
  busy: boolean;
  /** last resolved move, for sound/haptics/animation triggers */
  feedback: MoveFeedback;
  /** the pause menu is up: no AI timers fire and no move is accepted */
  paused: boolean;
  /** the daily board's number while that board is on the table; a rematch
   *  or restart deals an ordinary game */
  daily: number | null;
  /** online play: this device's seat; null for a game played on this device */
  remote: RemoteSeat | null;
  /** online: a tap is on its way to the server, so a second one is not sent */
  waiting: boolean;
  /** online: the number of the server's last action on the board */
  seq: number;

  start: (mode: GameMode, settings: Settings, seed?: number, daily?: number) => void;
  /** online: a new board from the server (`started`) */
  remoteStart: (config: GameConfig, seat: RemoteSeat) => void;
  /** online: the whole board as the server has it (joining late, coming back) */
  remoteSnapshot: (state: GameState, seq: number, seat: RemoteSeat) => void;
  /** online: the server's action number `seq`, with the board's hash after it */
  remoteAction: (seq: number, action: GameAction, hash: string) => void;
  dispatch: (action: GameAction) => void;
  rematch: () => void;
  pause: () => void;
  resume: () => void;
  teardown: () => void;
}

let rng: RngState = { seed: aiSeedFor(Date.now()), counter: 0 };
let nonce = 0;
/** online: server actions waiting for the animation in front of them */
let inbox: { seq: number; action: GameAction; hash: string }[] = [];
/** online: past this many waiting actions the board catches up without animating */
const CATCH_UP = 2;
/** The `generation` whose finished game has already gone into the stats. */
let recordedGeneration = -1;

/**
 * Count a finished game in the stats — once. Only the reducer's step INTO
 * gameOver gets here; a sudden-death tie-break is not a game over (the engine
 * goes straight from the tied board to the mini board's reveal), so only its
 * final result is recorded. Rematch, restart and start all bump `generation`,
 * so each board can be recorded at most once however it is re-dispatched.
 */
function recordFinished(state: GameState, daily: number | null) {
  if (recordedGeneration === generation) return;
  recordedGeneration = generation;
  try {
    useStats.getState().recordGame(state);
    if (daily != null) useStats.getState().recordDaily(daily, state);
  } catch {
    /* stats must never break the end of a game */
  }
}

/** Online games already in the stats, by the server's seed for that board
 *  (each game gets a fresh one): a finished game counts once, whether it
 *  arrives as actions or, after a reconnect, as a finished snapshot (F08). */
const recordedOnline: number[] = [];

function recordOnline(state: GameState) {
  const id = state.config.seed;
  if (recordedOnline.includes(id)) return;
  recordedOnline.push(id);
  if (recordedOnline.length > 32) recordedOnline.shift();
  try {
    useStats.getState().recordGame(state);
  } catch {
    /* stats must never break the end of a game */
  }
}

export const useGame = create<GameStore>((setState, getState) => {
  /** Decide what the machine should do next, once nothing is animating. */
  function schedule() {
    const { state, busy, paused, remote } = getState();
    // online, the server plays the computer seats and runs the clock
    if (!state || busy || paused || remote) return;
    if (state.phase === 'roll' && !isHumanTurn(state)) {
      later(() => getState().dispatch({ type: 'ROLL' }), timing.aiRollDelay);
      return;
    }
    if (state.phase === 'pick' && !isHumanTurn(state)) {
      const [think, afterThink] = aiThinkMs(rng);
      rng = afterThink;
      later(() => {
        const cur = getState().state;
        if (!cur) return;
        const res = computerPick(cur, getState().ais, rng);
        if (!res) return;
        rng = res.rng;
        if (res.pegIndex < 0) return;
        setState({ ais: res.ais });
        getState().dispatch({ type: 'PICK', pegIndex: res.pegIndex });
      }, think);
    }
  }

  /** Hold the screen for an animation, then let the machine move on. */
  function busyFor(ms: number, then?: () => void) {
    setState({ busy: true });
    later(() => {
      setState({ busy: false });
      // `then` always ends in a dispatch, which schedules for us — calling
      // schedule() as well would arm a second, redundant AI timer
      if (then) then();
      else schedule();
    }, ms);
  }

  /** Every AI sees the peg the last pick turned face up (src/engine/driver.ts). */
  function observeLastPick(state: GameState) {
    const ais = getState().ais;
    const next = observePick(ais, state);
    if (next !== ais) setState({ ais: next });
  }

  /** Fresh brains for a board, drawn from the store's AI rng (src/engine/driver.ts). */
  function freshBrains(state: GameState): Record<string, AiState> {
    const res = brainsFor(state, rng);
    rng = res.rng;
    return res.ais;
  }

  /** Online: a fresh board from the server; nothing of the last one carries over. */
  function remoteBoard(state: GameState, seq: number, seat: RemoteSeat) {
    generation += 1;
    clearTimers();
    inbox = [];
    setState({ state, ais: {}, busy: false, feedback: null, paused: false, daily: null, remote: seat, waiting: false, seq });
  }

  /**
   * Online: play the server's waiting actions in order. Each one waits for the
   * animation in front of it (the die tumble, a match or miss), exactly as a
   * computer's move waits offline; once more than CATCH_UP are waiting (the
   * app was in the background, the network stalled) the board catches up at
   * once. An action that does not fit, or a hash that differs, means this
   * board drifted: drop the rest and ask for a snapshot.
   */
  function drain() {
    for (;;) {
      const { state: prev, busy, remote } = getState();
      if (!prev || !remote || inbox.length === 0) return;
      const hurry = inbox.length > CATCH_UP;
      if (busy && !hurry) return;
      if (busy) {
        clearTimers();
        setState({ busy: false, feedback: null });
      }
      const { seq, action, hash } = inbox.shift()!;
      const next = reduce(prev, action);
      if (next === prev || stateHash(next) !== hash) {
        inbox = [];
        remote.resync();
        return;
      }
      setState({ state: next, seq, waiting: false });
      if (next.phase === 'gameOver' && prev.phase !== 'gameOver') recordOnline(next);
      if (hurry || inbox.length > CATCH_UP) continue;
      if (action.type === 'ROLL') {
        busyFor(tumbleMs(next.dieRerolls ?? 0), drain);
        return;
      }
      if (action.type === 'PICK' && next.lastMove) {
        const move = next.lastMove;
        nonce += 1;
        setState({ feedback: { kind: move.matched ? 'match' : 'miss', pegIndex: move.pegIndex, nonce } });
        busyFor(resultMs(move.matched), () => {
          setState({ feedback: null });
          drain();
        });
        return;
      }
    }
  }

  /** Online: a tap becomes an intent, only on this seat's turn and only once. */
  function sendIntent(action: GameAction) {
    const { state, remote, waiting, busy } = getState();
    if (!state || !remote || waiting || busy) return;
    if (activePlayerSpec(state).id !== remote.seat) return;
    if (action.type === 'ROLL' && state.phase === 'roll') {
      setState({ waiting: true });
      remote.send({ type: 'ROLL' });
    } else if (action.type === 'PICK' && state.phase === 'pick' && state.pegs[action.pegIndex]?.state === 'hidden') {
      setState({ waiting: true });
      remote.send({ type: 'PICK', pegIndex: action.pegIndex });
    }
    // REVEAL_DONE, RESULT_DONE and RESTART are the server's to send
  }

  return {
    state: null,
    ais: {},
    busy: false,
    feedback: null,
    paused: false,
    daily: null,
    remote: null,
    waiting: false,
    seq: 0,

    start: (mode, settings, seed, daily) => {
      generation += 1;
      clearTimers();
      inbox = [];
      // one reading of the clock: two would seed the board and the AI from
      // different milliseconds and make a "same seed" replay impossible
      const gameSeed = seed ?? clock.now();
      rng = { seed: aiSeedFor(gameSeed), counter: 0 };
      const state = createGame(configFor(mode, settings, gameSeed));
      setState({
        state,
        ais: freshBrains(state),
        busy: false,
        feedback: null,
        paused: false,
        daily: daily ?? null,
        remote: null,
        waiting: false,
        seq: 0,
      });
    },

    remoteStart: (config, seat) => remoteBoard(createGame(config), 0, seat),

    remoteSnapshot: (state, seq, seat) => {
      remoteBoard(state, seq, seat);
      // a game that ended while this device was away still counts
      if (state.phase === 'gameOver') recordOnline(state);
    },

    remoteAction: (seq, action, hash) => {
      const { remote, seq: at } = getState();
      if (!remote) return;
      const last = inbox.length ? inbox[inbox.length - 1].seq : at;
      if (seq <= last) return; // seen already
      if (seq > last + 1) {
        // a message went missing: the snapshot brings the board up to date
        inbox = [];
        remote.resync();
        return;
      }
      inbox.push({ seq, action, hash });
      drain();
    },

    dispatch: (action) => {
      const { state: prev, paused } = getState();
      if (!prev) return;
      if (getState().remote) return sendIntent(action);
      // While the pause menu is up the board is frozen: no rolls, no picks, and
      // no countdown/animation callbacks land either. RESTART is the one action
      // that gets through, because that is how the menu starts a fresh game.
      if (paused && action.type !== 'RESTART') return;
      const next = reduce(prev, action);
      if (next === prev) return;
      setState({ state: next });

      if (action.type === 'RESTART') {
        generation += 1;
        clearTimers();
        // RESTART is reachable from the pause menu, so it has to lift the pause
        // as well — otherwise the new board opens frozen.
        setState({ ais: freshBrains(next), busy: false, feedback: null, paused: false, daily: null });
        return;
      }

      if (action.type === 'ROLL') {
        busyFor(tumbleMs(next.dieRerolls ?? 0));
        return;
      }

      if (next.phase === 'gameOver' && prev.phase !== 'gameOver') {
        recordFinished(next, getState().daily);
      }

      // a sudden-death mini-board is a new board: new pegs, new brains
      if (next.phase === 'reveal' && prev.phase !== 'reveal') {
        setState({ ais: freshBrains(next) });
      }

      if (action.type === 'PICK' && next.lastMove) {
        const move = next.lastMove;
        observeLastPick(next);
        nonce += 1;
        setState({ feedback: { kind: move.matched ? 'match' : 'miss', pegIndex: move.pegIndex, nonce } });
        busyFor(resultMs(move.matched), () => {
          setState({ feedback: null });
          getState().dispatch({ type: 'RESULT_DONE' });
        });
        return;
      }

      schedule();
    },

    rematch: () => {
      // online, a rematch is the host's, through the room
      if (getState().remote) return;
      generation += 1;
      clearTimers();
      setState({ busy: false, feedback: null, paused: false });
      getState().dispatch({ type: 'RESTART', seed: clock.now() });
    },

    pause: () => {
      const { state, paused, remote } = getState();
      // an online board never stops for one person
      if (!state || paused || remote) return;
      pauseTimers();
      setState({ paused: true });
    },

    resume: () => {
      if (!getState().paused) return;
      setState({ paused: false });
      // every pending step was kept, so the AI turn / match animation carries on
      // from where it was — re-scheduling here would arm a second, duplicate one
      resumeTimers();
    },

    teardown: () => {
      generation += 1;
      clearTimers();
      inbox = [];
      setState({
        state: null,
        ais: {},
        busy: false,
        feedback: null,
        paused: false,
        daily: null,
        remote: null,
        waiting: false,
        seq: 0,
      });
    },
  };
});
