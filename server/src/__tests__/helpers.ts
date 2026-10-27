/**
 * Test doubles for the room server: a clock that only moves when told, a
 * connection that keeps what it was sent, and a Device that plays the part
 * of a phone: it rebuilds the game from `started` / `action` / `snapshot`
 * through the engine's reducer and checks every hash, as the app will.
 */
import assert from 'node:assert/strict';

import { activePlayerSpec, createGame, reduce, type GameState } from '../../../src/engine';
import { stateHash } from '../../../src/online/hash';
import type { AppPlatform, ClientMessage, RoomInfo, RoomSettings, ServerMessage } from '../../../src/online/protocol';
import { Hub } from '../hub';
import type { Clock, Conn, ServerConfig } from '../types';

export class FakeClock implements Clock {
  t = 1_000_000;
  private nextId = 1;
  private jobs = new Map<number, { due: number; fn: () => void }>();

  now = () => this.t;

  setTimeout = (fn: () => void, ms: number) => {
    const id = this.nextId++;
    this.jobs.set(id, { due: this.t + Math.max(0, ms), fn });
    return id;
  };

  clearTimeout = (handle: unknown) => {
    this.jobs.delete(handle as number);
  };

  /** Run every job that falls due within `ms`, oldest first. */
  advance(ms: number) {
    const target = this.t + ms;
    for (let guard = 0; guard < 100_000; guard++) {
      let pick = -1;
      let due = Infinity;
      for (const [id, job] of this.jobs) {
        if (job.due < due) {
          due = job.due;
          pick = id;
        }
      }
      if (pick < 0 || due > target) break;
      const job = this.jobs.get(pick)!;
      this.jobs.delete(pick);
      this.t = due;
      job.fn();
    }
    this.t = target;
  }

  get pending() {
    return this.jobs.size;
  }
}

export class FakeConn implements Conn {
  readonly inbox: ServerMessage[] = [];
  closed = false;
  send(text: string) {
    if (this.closed) throw new Error('send on a closed connection');
    this.inbox.push(JSON.parse(text) as ServerMessage);
  }
  close() {
    this.closed = true;
  }
}

/** A deterministic random source, so codes and seeds repeat run to run. */
export function seeded(seed = 7): () => number {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    x ^= x >>> 13;
    return x >>> 0;
  };
}

export function makeHub(config: Partial<ServerConfig> = {}) {
  const clock = new FakeClock();
  let n = 0;
  const hub = new Hub({
    clock,
    config,
    random: seeded(),
    token: () => (++n).toString(16).padStart(32, '0'),
  });
  return { hub, clock };
}

/** One phone or browser talking to the hub. */
export class Device {
  conn = new FakeConn();
  state: GameState | null = null;
  seq = -1;
  seat: string | null = null;
  token: string | null = null;
  code: string | null = null;
  room: RoomInfo | null = null;
  errors: string[] = [];
  ended: string | null = null;
  /** every action message seen, in order */
  actions: Extract<ServerMessage, { type: 'action' }>[] = [];
  private readIndex = 0;

  constructor(
    private readonly hub: Hub,
    readonly app: AppPlatform = 'web',
    readonly ip = '10.0.0.1',
  ) {
    hub.connect(this.conn, ip);
  }

  hello(protocol = 1, rules = 1) {
    return this.say({ type: 'hello', protocol, rules, app: this.app, appVersion: '1.4.0' });
  }

  say(m: ClientMessage | Record<string, unknown>) {
    this.hub.message(this.conn, JSON.stringify(m));
    this.read();
    return this;
  }

  /** The connection drops (no leave message). */
  drop() {
    this.hub.closed(this.conn);
    this.conn.close();
  }

  /** A new connection for the same person, as after a network switch. */
  reconnect() {
    const old = this.conn;
    this.conn = new FakeConn();
    this.readIndex = 0;
    this.hub.connect(this.conn, this.ip);
    return old;
  }

  /** Apply what the server sent since last time, checking every hash. */
  read() {
    for (; this.readIndex < this.conn.inbox.length; this.readIndex++) {
      const m = this.conn.inbox[this.readIndex];
      switch (m.type) {
        case 'joined':
          this.seat = m.seat;
          this.token = m.token;
          this.code = m.code;
          break;
        case 'room':
          this.room = m.room;
          break;
        case 'started':
          this.state = createGame(m.config);
          this.seq = 0;
          break;
        case 'snapshot':
          this.state = m.state;
          this.seq = m.seq;
          break;
        case 'action': {
          assert.ok(this.state, 'an action before the game started');
          assert.equal(m.seq, this.seq + 1, 'actions arrive in order, none missing');
          const next = reduce(this.state, m.action);
          assert.notEqual(next, this.state, `the server sent an action that does nothing: ${JSON.stringify(m.action)}`);
          this.state = next;
          this.seq = m.seq;
          assert.equal(stateHash(this.state), m.hash, `hash after seq ${m.seq}`);
          this.actions.push(m);
          break;
        }
        case 'error':
          this.errors.push(m.code);
          break;
        case 'ended':
          this.ended = m.reason;
          break;
      }
    }
  }

  /** true when it is this device's seat to roll or pick */
  myMove(): boolean {
    const s = this.state;
    return !!s && (s.phase === 'roll' || s.phase === 'pick') && activePlayerSpec(s).id === this.seat;
  }

  /** Roll, or pick the first face-down peg. */
  move() {
    const s = this.state!;
    if (s.phase === 'roll') return this.say({ type: 'intent', action: { type: 'ROLL' } });
    const peg = s.pegs.findIndex((p) => p.state === 'hidden');
    return this.say({ type: 'intent', action: { type: 'PICK', pegIndex: peg } });
  }
}

export const SETTINGS: RoomSettings = {
  board: 'small',
  bonusTurnOnMatch: true,
  kidMode: false,
  maxSeats: 4,
  timer: 'relaxed',
};

/** Host creates a room, guests join. */
export function room(hub: Hub, guests = 1, settings: Partial<RoomSettings> = {}) {
  const host = new Device(hub, 'ios').hello();
  host.say({ type: 'create', settings: { ...SETTINGS, ...settings }, name: 'Maya', avatar: 'fox', unlocked: false });
  const others = Array.from({ length: guests }, (_, i) =>
    new Device(hub, 'web', `10.0.1.${i}`).hello().say({ type: 'join', code: host.code!, name: `Guest${i}`, avatar: 'fox' }),
  );
  const all = [host, ...others];
  for (const d of all) d.read();
  return { host, guests: others, all };
}

/** Let everyone play their moves as soon as it is their turn, until the game ends. */
export function playOut(clock: FakeClock, devices: Device[], limitMs = 60 * 60_000) {
  for (let t = 0; t < limitMs; t += 50) {
    for (const d of devices) d.read();
    if (devices.every((d) => d.state?.phase === 'gameOver')) return;
    for (const d of devices) if (d.myMove()) d.move();
    clock.advance(50);
  }
  assert.fail('the game did not finish');
}
