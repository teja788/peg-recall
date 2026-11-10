/**
 * One online room (PLAN-web-online.md §B1–B3): its seats, its lobby, and the
 * referee for its game.
 *
 * The referee is the engine's own reducer plus the shared table driver
 * (src/engine/driver.ts). Devices send intents; the room applies the ones
 * that are a legal move for the seat whose turn it is, numbers every applied
 * action (`seq`) and sends it to everyone with the state's hash. It also takes
 * the steps nobody taps for: the reveal ending, a result finishing, computer
 * seats' turns, and the turns of a person who has gone away or run out of
 * time (played by a stand-in brain, marked `standIn` so screens can say so).
 *
 * Nothing here knows about sockets or Node: connections and the clock come in
 * through RoomDeps.
 */

import {
  FLOW,
  activePlayerSpec,
  aiSeedFor,
  aiThinkMs,
  autoStep,
  computerPick,
  createGame,
  freshBrains,
  observePick,
  reduce,
  tumbleMs,
  type AvatarId,
  type Brains,
  type Difficulty,
  type GameAction,
  type GameConfig,
  type GameState,
  type PlayerSpec,
  type RngState,
} from '../../src/engine';
import { stateHash } from '../../src/online/hash';
import type {
  EndReason,
  ErrorCode,
  Intent,
  RoomInfo,
  RoomSettings,
  RoomStatus,
  ServerMessage,
} from '../../src/online/protocol';
import { BREAK_MS, MISSED_LIMIT, REACT_SERVER_COOLDOWN_MS, RESUME_MS, type ReactionId } from '../../src/online/protocol';
import { AVATAR_CYCLE } from '../../src/store/settingsModel';
import { randomToken, randomUint32, type Clock, type Conn, type ServerConfig, type Stats } from './types';

const SEAT_IDS = ['p1', 'p2', 'p3', 'p4'];

export interface Seat {
  /** 'p1'..'p4': the engine's player id */
  id: string;
  kind: 'human' | 'ai';
  avatar: AvatarId;
  name?: string;
  difficulty?: Difficulty;
  /** people only: proves the seat is theirs when they come back */
  token?: string;
  conn: Conn | null;
  /** when a person's connection dropped; null while they are here */
  awaySince: number | null;
  /** a person who left (or was removed) mid-game: the computer finishes for them */
  left?: boolean;
  /** the address fingerprint they joined from (hub.ts), so a removal sticks */
  addr?: string;
  /** turns in a row they let run out while here */
  missed?: number;
  /** the sitting they last came back ("I'm back") in: one fresh clock each */
  backSitting?: number;
  /** the sitting their turn clock last ran out in while here: counted once,
   *  and the rest of that sitting goes at computer pace */
  timedOut?: number;
  /** "Step away": here, but the computer plays for them until they are back */
  stepped?: boolean;
  /** has had their break this game */
  breakUsed?: boolean;
  /** when their last reaction went out (REACT_SERVER_COOLDOWN_MS between them) */
  reactedAt?: number;
}

export interface RoomDeps {
  clock: Clock;
  config: ServerConfig;
  stats: Stats;
  /** this connection is no longer in the room (removed, or the room closed) */
  release: (conn: Conn) => void;
  /** when this connection last sent anything (devices ping every 20 s) */
  lastHeard: (conn: Conn) => number;
  /** the room closed itself (nobody left in it) */
  onClosed: (room: Room) => void;
  /** a 32-bit random number, for game seeds */
  random?: () => number;
  /** a seat token */
  token?: () => string;
}

type Pending = { kind: 'auto' | 'turn'; handle: unknown };

export class Room {
  status: RoomStatus = 'lobby';
  host = 'p1';
  readonly seats: Seat[] = [];
  readonly createdAt: number;
  lastActivity: number;
  overAt: number | null = null;
  closed = false;

  private state: GameState | null = null;
  private seq = 0;
  private at = 0;
  private ais: Brains = {};
  private rng: RngState = { seed: 1, counter: 0 };
  private pending: Pending | null = null;
  /** away people whose turns the computer is playing, at computer pace */
  private standingIn = new Set<string>();
  /** a stand-in's thinking time for the pick numbered `seq`, drawn once so a
   *  re-armed clock keeps the same deadline (audit F05) */
  private think: { seq: number; ms: number } | null = null;
  /** addresses of people the host removed: they cannot come back to this room */
  private readonly banned = new Set<string>();
  /** the clock on a dropped-out host handing over (`checkHost`) */
  private handover: unknown = null;
  /** a break in progress (RoomInfo.pause), and its clock */
  private brk: { by: string; until: number; resumeAt?: number } | null = null;
  private brkTimer: unknown = null;
  /** turn clocks run from the later of this and the last action (a break, a return) */
  private clockFrom = 0;
  /** one stretch of the same seat moving on the same board: bonus turns
   *  included, so a missed turn is counted once however many picks it has */
  private sitting = 0;

  constructor(
    readonly code: string,
    readonly settings: RoomSettings,
    /** the creator had the unlock (for the host limits) */
    readonly unlocked: boolean,
    private readonly deps: RoomDeps,
  ) {
    this.createdAt = this.lastActivity = deps.clock.now();
  }

  /* ---------------------------------------------------------------- info */

  info(): RoomInfo {
    return {
      code: this.code,
      status: this.status,
      host: this.host,
      settings: this.settings,
      seats: this.sorted().map((s) => ({
        id: s.id,
        kind: s.kind,
        avatar: s.avatar,
        ...(s.name ? { name: s.name } : {}),
        ...(s.difficulty ? { difficulty: s.difficulty } : {}),
        online: s.kind === 'ai' || s.conn !== null,
        ...(s.missed ? { missed: s.missed } : {}),
        ...(s.stepped ? { away: true as const } : {}),
        ...(s.breakUsed ? { breakUsed: true as const } : {}),
      })),
      ...(this.brk ? { pause: { ...this.brk } } : {}),
      ...(this.clockFrom ? { clockFrom: this.clockFrom } : {}),
    };
  }

  /** people with a live connection */
  peopleHere(): number {
    return this.seats.filter((s) => s.kind === 'human' && s.conn).length;
  }

  seatOf(conn: Conn): Seat | undefined {
    return this.seats.find((s) => s.conn === conn);
  }

  /* --------------------------------------------------------------- seats */

  /** A person takes a free seat (create or join). `addr`: where they came
   *  from (hub.ts fingerprint), so a removal by the host sticks. */
  addPerson(conn: Conn, name: string | undefined, avatar: AvatarId, addr?: string): Seat | ErrorCode {
    if (addr && this.barred(addr)) return 'removed';
    if (this.status === 'playing') return 'started';
    if (this.seats.length >= this.settings.maxSeats) return 'full';
    const seat: Seat = {
      id: this.freeSeatId(),
      kind: 'human',
      avatar: this.freeAvatar(avatar),
      ...(name ? { name } : {}),
      token: (this.deps.token ?? randomToken)(),
      conn,
      awaySince: null,
      ...(addr ? { addr } : {}),
    };
    this.seats.push(seat);
    this.touch();
    this.send(conn, { type: 'joined', code: this.code, seat: seat.id, token: seat.token! });
    this.broadcastRoom();
    return seat;
  }

  /** A person comes back with their seat token. */
  resume(conn: Conn, token: string): Seat | null {
    const seat = this.seats.find((s) => s.kind === 'human' && s.token === token && !s.left);
    if (!seat) return null;
    const old = seat.conn;
    const empty = this.peopleHere() === 0;
    if (old && old !== conn) {
      // the same person on a newer connection (a network switch, a second
      // tab): the older one is told why, so it stops coming back (audit F04)
      this.send(old, { type: 'ended', reason: 'replaced' });
      this.deps.release(old);
      old.close();
    }
    seat.conn = conn;
    seat.awaySince = null;
    this.standingIn.delete(seat.id);
    // the board waited for everyone: the mover gets a whole turn. Only after
    // nobody was here (the clock was not running), so a mover who drops and
    // comes back while others wait never buys time
    if (empty && this.status === 'playing') this.clockFrom = this.deps.clock.now();
    this.touch();
    this.send(conn, { type: 'joined', code: this.code, seat: seat.id, token: seat.token! });
    if (this.state) this.send(conn, { type: 'snapshot', state: this.state, seq: this.seq, at: this.at });
    this.broadcastRoom();
    this.presenceChanged();
    this.checkHost();
    return seat;
  }

  /** A connection dropped without leaving. */
  disconnect(conn: Conn): void {
    const seat = this.seatOf(conn);
    if (!seat) return;
    seat.conn = null;
    seat.awaySince = this.deps.clock.now();
    this.broadcastRoom();
    this.presenceChanged();
    this.checkHost();
  }

  /** A person leaves on purpose. Before a game their seat goes; during one the
   *  computer finishes it for them. */
  leave(conn: Conn): void {
    const seat = this.seatOf(conn);
    if (!seat) return;
    this.deps.release(conn);
    this.dropPerson(seat);
  }

  addBot(by: Conn, difficulty: Difficulty): ErrorCode | null {
    const err = this.hostOnly(by) ?? this.notDuringGame();
    if (err) return err;
    if (this.seats.length >= this.settings.maxSeats) return 'full';
    if (this.seats.some((s) => s.kind === 'ai' && s.difficulty === difficulty)) return 'bad';
    // the computer wears the face of its level; a person wearing it moves over
    const wearer = this.seats.find((s) => s.avatar === difficulty);
    const seat: Seat = { id: this.freeSeatId(), kind: 'ai', avatar: difficulty, difficulty, conn: null, awaySince: null };
    this.seats.push(seat);
    if (wearer) wearer.avatar = this.freeAvatar(wearer.avatar, wearer);
    this.touch();
    this.broadcastRoom();
    return null;
  }

  removeSeat(by: Conn, seatId: string): ErrorCode | null {
    const err = this.hostOnly(by);
    if (err) return err;
    const seat = this.seats.find((s) => s.id === seatId);
    if (!seat || seat.conn === by) return 'bad';
    if (seat.kind === 'ai') {
      if (this.status === 'playing') return 'started';
      this.seats.splice(this.seats.indexOf(seat), 1);
      this.broadcastRoom();
      return null;
    }
    // removed for good: not back in this room from the same address (F09)
    if (seat.addr) this.banned.add(seat.addr);
    if (seat.conn) {
      this.send(seat.conn, { type: 'ended', reason: 'removed' });
      this.deps.release(seat.conn);
    }
    this.dropPerson(seat);
    return null;
  }

  /* ---------------------------------------------------------------- game */

  start(by: Conn): ErrorCode | null {
    const err = this.hostOnly(by) ?? this.notDuringGame();
    if (err) return err;
    for (const s of this.seats) s.missed = s.timedOut = s.breakUsed = undefined;
    this.clearBreak();
    this.clockFrom = 0;
    if (this.seats.length < 2) {
      this.broadcastRoom();
      return 'bad';
    }
    if (this.status === 'over') this.deps.stats.rematches++;
    this.deps.stats.gamesStarted++;

    const seed = ((this.deps.random ?? randomUint32)() & 0x7fffffff) || 1;
    const config: GameConfig = {
      boardSize: this.settings.board,
      players: this.sorted().map(
        (s): PlayerSpec =>
          s.kind === 'ai'
            ? { id: s.id, kind: 'ai', avatar: s.avatar, difficulty: s.difficulty }
            : { id: s.id, kind: 'human', avatar: s.avatar, ...(s.name ? { name: s.name } : {}) },
      ),
      rules: {
        bonusTurnOnMatch: this.settings.bonusTurnOnMatch,
        tieBreak: this.settings.kidMode ? 'shared' : 'suddenDeath',
        kidMode: this.settings.kidMode,
      },
      seed,
    };
    this.state = createGame(config);
    this.seq = 0;
    this.at = this.deps.clock.now();
    this.rng = { seed: aiSeedFor(seed), counter: 0 };
    this.newBrains(this.state);
    this.standingIn.clear();
    this.sitting++;
    this.status = 'playing';
    this.overAt = null;
    this.touch();
    this.broadcast({ type: 'started', config, seq: 0, at: this.at });
    this.broadcastRoom();
    this.schedule();
    return null;
  }

  /** A person's move. Anything that is not a legal move for their seat right
   *  now (not their turn, wrong phase, a taken peg) is dropped without a word:
   *  their screen never offered it, so it can only be lag or a double tap. */
  intent(by: Conn, action: Intent): void {
    const seat = this.seatOf(by);
    const s = this.state;
    if (!seat || !s || this.status !== 'playing' || this.brk) return;
    // only a move that counts brings them back: a late tap after the
    // computer rolled for them changes nothing
    if (activePlayerSpec(s).id !== seat.id || reduce(s, action) === s) return;
    this.standingIn.delete(seat.id);
    const changed = !!seat.missed || !!seat.stepped;
    seat.missed = 0;
    seat.stepped = false;
    seat.timedOut = undefined;
    this.apply(action, seat.id, false);
    if (changed) this.broadcastRoom();
  }

  /** "Take a break": once per person per game, everyone waits up to BREAK_MS.
   *  Nothing moves, not even a result finishing (it could open a sudden-death
   *  reveal while everyone is away). */
  takeBreak(by: Conn): ErrorCode | null {
    const seat = this.seatOf(by);
    if (!seat || this.status !== 'playing' || this.brk || seat.breakUsed) return 'bad';
    // not while the board is face up: everyone would lose their look at it
    if (this.state?.phase === 'reveal') return 'bad';
    seat.breakUsed = true;
    this.brk = { by: seat.id, until: this.deps.clock.now() + BREAK_MS };
    this.armBreak(BREAK_MS, () => this.countIn());
    this.touch();
    this.schedule();
    this.broadcastRoom();
    return null;
  }

  /** End the break early: whoever took it, or the host. */
  endBreak(by: Conn): ErrorCode | null {
    const seat = this.seatOf(by);
    if (!seat || !this.brk || this.brk.resumeAt) return 'bad';
    if (seat.id !== this.brk.by && seat.id !== this.host) return 'notHost';
    this.countIn();
    return null;
  }

  /** "Step away" / "I'm back": while away the computer plays their turns at
   *  its own pace, and those turns are never counted as missed. */
  stepAway(by: Conn, away: boolean): ErrorCode | null {
    const seat = this.seatOf(by);
    if (!seat || this.status !== 'playing') return 'bad';
    if (!!seat.stepped === away) return null;
    seat.stepped = away;
    seat.missed = 0;
    seat.timedOut = undefined;
    if (!away) {
      this.standingIn.delete(seat.id);
      // back on their own turn: a fresh clock, once per sitting (toggling
      // again cannot keep restarting it and stall everyone)
      if (this.state && activePlayerSpec(this.state).id === seat.id && seat.backSitting !== this.sitting) {
        seat.backSitting = this.sitting;
        this.clockFrom = this.deps.clock.now();
      }
    }
    this.touch();
    // not schedule(): toggling must not restart a reveal or a computer move
    this.presenceChanged();
    this.broadcastRoom();
    return null;
  }

  /** A preset reaction, passed on to everyone else in the room; nothing is
   *  kept. Faster than one per REACT_SERVER_COOLDOWN_MS is dropped without a word. */
  react(by: Conn, id: ReactionId): void {
    const seat = this.seatOf(by);
    const now = this.deps.clock.now();
    if (!seat || now - (seat.reactedAt ?? -Infinity) < REACT_SERVER_COOLDOWN_MS) return;
    seat.reactedAt = now;
    this.deps.stats.reactions++;
    for (const s of this.seats) if (s.conn && s !== seat) this.send(s.conn, { type: 'react', seat: seat.id, id });
  }

  /** Close the room: everyone still here is told why. */
  close(reason: EndReason): void {
    if (this.closed) return;
    this.closed = true;
    this.cancelPending();
    this.cancelHandover();
    this.clearBreak();
    for (const seat of this.seats) {
      if (!seat.conn) continue;
      this.send(seat.conn, { type: 'ended', reason });
      this.deps.release(seat.conn);
      seat.conn = null;
    }
  }

  /** Whether the room has outlived its welcome (§B6), as of `now`. */
  expired(now: number): boolean {
    const { config } = this.deps;
    if (now - this.createdAt > config.maxRoomMs) return true;
    const idle = now - this.lastActivity;
    if (this.peopleHere() === 0) {
      if (this.status === 'playing') return idle > config.emptyGameMs;
      return idle > Math.min(config.lobbyIdleMs, config.emptyGameMs);
    }
    if (this.status === 'lobby') return idle > config.lobbyIdleMs;
    if (this.status === 'over') return now - (this.overAt ?? now) > config.finishedMs && idle > config.finishedMs;
    return false;
  }

  /* ------------------------------------------------------------ referee */

  private apply(action: GameAction, by: string | null, standIn: boolean): boolean {
    const prev = this.state;
    if (!prev) return false;
    const next = reduce(prev, action);
    if (next === prev) return false;
    this.state = next;
    this.seq += 1;
    this.at = this.deps.clock.now();
    this.touch();
    if (action.type === 'PICK') this.ais = observePick(this.ais, next);
    // a sudden-death mini board is a new board: new brains, a new sitting
    const newBoard = next.phase === 'reveal' && prev.phase !== 'reveal';
    if (newBoard) this.newBrains(next);
    if (newBoard || next.activePlayer !== prev.activePlayer) this.sitting++;
    if (standIn) this.deps.stats.standInMoves++;
    this.broadcast({
      type: 'action',
      seq: this.seq,
      action,
      by,
      ...(standIn ? { standIn: true as const } : {}),
      at: this.at,
      hash: stateHash(next),
    });
    if (next.phase === 'gameOver') {
      this.clearBreak();
      this.status = 'over';
      // seats of people who left are free again before the next game
      for (const x of this.seats.filter((x) => x.left)) this.seats.splice(this.seats.indexOf(x), 1);
      this.overAt = this.at;
      this.deps.stats.gamesFinished++;
      this.broadcastRoom();
      this.checkHost();
    }
    this.schedule();
    return true;
  }

  /** Arm the next step: one the game takes by itself, or the clock on a person's turn. */
  private schedule(): void {
    this.cancelPending();
    const s = this.state;
    if (!s || s.phase === 'gameOver' || this.closed) return;
    // nobody here: the board waits for someone to come back
    if (this.peopleHere() === 0) return;
    // on a break nothing moves; the 3-2-1's end schedules again
    if (this.brk) return;
    const step = autoStep(s, this.rng);
    if (step) {
      this.rng = step.rng;
      this.arm('auto', step.afterMs, () => this.fireAuto(step.kind));
      return;
    }
    this.armTurn();
  }

  private fireAuto(kind: 'REVEAL_DONE' | 'RESULT_DONE' | 'ROLL' | 'PICK'): void {
    const s = this.state;
    if (!s) return;
    const mover = activePlayerSpec(s).id;
    if (kind === 'PICK') this.pickFor(mover, false);
    else this.apply({ type: kind }, kind === 'ROLL' ? mover : null, false);
  }

  /** The clock on a person's roll or pick. Here: the room's turn time. Away:
   *  a short grace, then the computer plays for them at its own pace. */
  private armTurn(): void {
    const s = this.state!;
    const seat = this.seats.find((x) => x.id === activePlayerSpec(s).id);
    if (!seat) return;
    const now = this.deps.clock.now();
    const { config } = this.deps;
    // the phase began at the last action, or later if a break or a return restarted the clock
    const from = Math.max(this.at, this.clockFrom);
    let delay: number;
    // timed out once this sitting: the rest of it too (an idle device
    // would otherwise cost a whole clock per roll and per pick)
    const pace = seat.left || seat.stepped || this.standingIn.has(seat.id) || seat.timedOut === this.sitting;
    if (seat.conn && !pace) {
      delay = from + config.turnMs[this.settings.timer] - now;
    } else if (pace) {
      // already standing in: computer pacing, as for a computer seat
      // deadlines from when the phase began, so re-arming never pushes them back
      if (s.phase === 'roll') delay = from + FLOW.aiRollDelay - now;
      else delay = from + tumbleMs(s.dieRerolls ?? 0) + this.thinkFor(this.seq) - now;
    } else {
      const since = Math.max(from, seat.awaySince ?? from);
      delay = Math.min(from + config.turnMs[this.settings.timer], since + config.awayGraceMs) - now;
    }
    this.arm('turn', Math.max(0, delay), () => this.standIn(seat));
  }

  /** The computer plays a person's roll or pick for them. */
  private standIn(seat: Seat): void {
    const s = this.state;
    if (!s || activePlayerSpec(s).id !== seat.id) return;
    if (!seat.conn) this.standingIn.add(seat.id);
    let idle = false;
    if (seat.conn && !seat.stepped) {
      // here, but the turn ran out: counted once per sitting, and only if the
      // device was heard from since the clock started (a tab frozen in the
      // background or a locked phone is not idle, just not there yet)
      const from = Math.max(this.at, this.clockFrom);
      idle = seat.timedOut !== this.sitting && this.deps.lastHeard(seat.conn) > from;
      seat.timedOut = this.sitting;
      if (idle) seat.missed = (seat.missed ?? 0) + 1;
    }
    if (s.phase === 'roll') this.apply({ type: 'ROLL' }, seat.id, true);
    else if (s.phase === 'pick') this.pickFor(seat.id, true);
    if (!idle || this.closed) return;
    // this pick ends the game: they see the result, not a removal
    const after = this.state;
    const decided =
      this.status !== 'playing' || (after?.phase === 'result' && reduce(after, { type: 'RESULT_DONE' }).phase === 'gameOver');
    if (seat.missed! >= MISSED_LIMIT && seat.conn && !decided) {
      // the computer keeps the seat for the rest of this game
      this.send(seat.conn, { type: 'ended', reason: 'idle' });
      this.deps.release(seat.conn);
      this.dropPerson(seat);
    } else {
      this.broadcastRoom();
    }
  }

  private pickFor(id: string, standIn: boolean): void {
    const s = this.state;
    if (!s) return;
    const res = computerPick(s, this.ais, this.rng);
    if (!res) return;
    this.rng = res.rng;
    this.ais = res.ais;
    if (res.pegIndex >= 0) this.apply({ type: 'PICK', pegIndex: res.pegIndex }, id, standIn);
  }

  /**
   * A removed person's address, unless someone still in the room is
   * connected from it too: then it is a household (one home Wi-Fi), and the
   * address cannot tell the removed device from the rest of the family, so
   * their relative joining is not refused for it.
   */
  private barred(addr: string): boolean {
    return this.banned.has(addr) && !this.seats.some((s) => s.addr === addr && s.conn && !s.left);
  }

  /** A stand-in's thinking time for this pick: drawn once, kept on re-arm. */
  private thinkFor(seq: number): number {
    if (this.think?.seq !== seq) {
      const [ms, next] = aiThinkMs(this.rng);
      this.rng = next;
      this.think = { seq, ms };
    }
    return this.think.ms;
  }

  /**
   * A host who has dropped out hands over after `hostHandoverMs`, so a room
   * never waits forever on someone who is gone. Only outside a game: during
   * one nothing needs the host until it ends (then this runs again).
   */
  private checkHost(): void {
    const next = () => this.sorted().find((s) => s.kind === 'human' && !s.left && s.conn);
    const host = this.seats.find((s) => s.id === this.host);
    if (this.closed || this.status === 'playing' || host?.conn || !next()) {
      this.cancelHandover();
      return;
    }
    if (this.handover) return;
    this.handover = this.deps.clock.setTimeout(() => {
      this.handover = null;
      const still = this.seats.find((s) => s.id === this.host);
      const heir = next();
      if (this.closed || this.status === 'playing' || still?.conn || !heir) return;
      this.host = heir.id;
      this.touch();
      this.broadcastRoom();
    }, this.deps.config.hostHandoverMs);
  }

  private cancelHandover(): void {
    if (this.handover) this.deps.clock.clearTimeout(this.handover);
    this.handover = null;
  }

  /** Brains for the computer seats, and stand-ins for every person's seat. */
  private newBrains(state: GameState): void {
    const people = state.config.players.filter((p) => p.kind === 'human').map((p) => p.id);
    const res = freshBrains(state, this.rng, people);
    this.ais = res.ais;
    this.rng = res.rng;
  }

  /** Someone came or went: a turn clock may need to shrink or start again. */
  private presenceChanged(): void {
    if (this.status !== 'playing') return;
    if (this.peopleHere() === 0) {
      this.cancelPending();
      return;
    }
    // an automatic step in flight keeps its time (its think time is drawn)
    if (this.pending?.kind !== 'auto') this.schedule();
  }

  private arm(kind: Pending['kind'], ms: number, fn: () => void): void {
    const handle = this.deps.clock.setTimeout(() => {
      if (this.pending?.handle === handle) this.pending = null;
      fn();
    }, ms);
    this.pending = { kind, handle };
  }

  /** The break's last part: a 3-2-1 everyone sees, then play goes on. */
  private countIn(): void {
    if (!this.brk || this.brk.resumeAt) return;
    this.brk.resumeAt = this.deps.clock.now() + RESUME_MS;
    this.armBreak(RESUME_MS, () => {
      this.clearBreak();
      // the mover gets a whole turn again
      this.clockFrom = this.deps.clock.now();
      this.schedule();
      this.broadcastRoom();
    });
    this.broadcastRoom();
  }

  private armBreak(ms: number, fn: () => void): void {
    if (this.brkTimer) this.deps.clock.clearTimeout(this.brkTimer);
    this.brkTimer = this.deps.clock.setTimeout(() => {
      this.brkTimer = null;
      fn();
    }, ms);
  }

  private clearBreak(): void {
    if (this.brkTimer) this.deps.clock.clearTimeout(this.brkTimer);
    this.brkTimer = null;
    this.brk = null;
  }

  private cancelPending(): void {
    if (this.pending) this.deps.clock.clearTimeout(this.pending.handle);
    this.pending = null;
  }

  /* ------------------------------------------------------------- helpers */

  private dropPerson(seat: Seat): void {
    seat.conn = null;
    seat.token = undefined;
    if (this.status === 'playing') {
      // the game's seats are fixed: the computer finishes this one
      seat.left = true;
      seat.awaySince = this.deps.clock.now();
    } else {
      this.seats.splice(this.seats.indexOf(seat), 1);
    }
    if (this.host === seat.id) {
      const next = this.sorted().find((s) => s.kind === 'human' && !s.left);
      if (next) this.host = next.id;
    }
    if (!this.seats.some((s) => s.kind === 'human' && !s.left)) {
      this.close('hostClosed');
      this.deps.onClosed(this);
      return;
    }
    this.touch();
    this.broadcastRoom();
    this.presenceChanged();
  }

  private hostOnly(by: Conn): ErrorCode | null {
    return this.seatOf(by)?.id === this.host ? null : 'notHost';
  }

  private notDuringGame(): ErrorCode | null {
    return this.status === 'playing' ? 'started' : null;
  }

  private freeSeatId(): string {
    return SEAT_IDS.find((id) => !this.seats.some((s) => s.id === id))!;
  }

  /** `wanted` if nobody else wears it, else the first free animal. */
  private freeAvatar(wanted: AvatarId, self?: Seat): AvatarId {
    const taken = new Set(this.seats.filter((s) => s !== self).map((s) => s.avatar));
    if (!taken.has(wanted)) return wanted;
    return AVATAR_CYCLE.find((a) => !taken.has(a)) ?? wanted;
  }

  private sorted(): Seat[] {
    return [...this.seats].sort((a, b) => a.id.localeCompare(b.id));
  }

  private touch(): void {
    this.lastActivity = this.deps.clock.now();
  }

  private send(conn: Conn, msg: ServerMessage): void {
    try {
      conn.send(JSON.stringify(msg));
    } catch {
      /* a dying connection: its close will arrive */
    }
  }

  private broadcast(msg: ServerMessage): void {
    const text = JSON.stringify(msg);
    for (const seat of this.seats) {
      if (!seat.conn) continue;
      try {
        seat.conn.send(text);
      } catch {
        /* as above */
      }
    }
  }

  private broadcastRoom(): void {
    if (!this.closed) this.broadcast({ type: 'room', room: this.info() });
  }
}
