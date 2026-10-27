/**
 * One device's connection to the room server (PLAN-web-online.md §B7).
 *
 * Opens a WebSocket (the same API in browsers and React Native), says hello,
 * and keeps the line up: pings every 20 s, which also measure the server's
 * clock, and reconnects after a drop with growing pauses (0.5, 1, 2, 4, 8,
 * then every 15 s). After every (re)connect `onReady` runs, so the room store
 * can resume its seat. An answer of "update" or "rules" ends it for good:
 * reconnecting would only be refused again; so does "replaced" (the seat is
 * open in another window), or the two would take it from each other forever.
 *
 * A line can also die without closing (a phone asleep, a tunnel): no welcome
 * within 10 s, or nothing heard for 45 s, and it is dropped and dialled again;
 * coming back to the foreground checks it with a ping first.
 *
 * Pure TypeScript: the socket and the clock can be swapped for tests.
 */

import {
  PROTOCOL,
  RULES_VERSION,
  parseServerMessage,
  type AppPlatform,
  type ClientMessage,
  type ServerMessage,
} from './protocol';

export type ConnStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

/** The parts of a WebSocket the client uses. */
export interface SocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export interface ClientClock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface ClientOptions {
  url: string;
  app: AppPlatform;
  appVersion: string;
  onMessage: (m: ServerMessage) => void;
  onStatus: (s: ConnStatus) => void;
  /** connected and greeted: resume a seat, or do nothing */
  onReady: () => void;
  socket?: (url: string) => SocketLike;
  clock?: ClientClock;
}

const OPEN = 1;
const BACKOFF_MS = [500, 1000, 2000, 4000, 8000, 15000];
const PING_MS = 20_000;
/** pings sent right after connecting, to read the server's clock */
const CLOCK_SAMPLES = 3;
/** no welcome within this long after dialling: dial again */
const HANDSHAKE_MS = 10_000;
/** nothing heard for this long (pings are answered): the line is dead */
const SILENT_MS = 45_000;
/** back in the foreground: a ping must be answered within this long */
const WAKE_CHECK_MS = 5_000;

const REAL_CLOCK: ClientClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export class RoomClient {
  status: ConnStatus = 'idle';
  /** server time minus this device's time, from the fastest ping seen */
  offsetMs = 0;
  private bestRtt = Infinity;
  private ws: SocketLike | null = null;
  private attempt = 0;
  private retry: unknown = null;
  private pinger: unknown = null;
  private watch: unknown = null;
  /** when anything last arrived on the line */
  private lastHeard = 0;
  private stopped = false;
  private readonly clock: ClientClock;

  constructor(private readonly opts: ClientOptions) {
    this.clock = opts.clock ?? REAL_CLOCK;
  }

  /** Server time now, by this device's clock and the measured offset. */
  serverNow(): number {
    return this.clock.now() + this.offsetMs;
  }

  connect(): void {
    if (this.ws || this.stopped) return;
    this.setStatus(this.attempt === 0 ? 'connecting' : 'reconnecting');
    let ws: SocketLike;
    try {
      ws = (this.opts.socket ?? defaultSocket)(this.opts.url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    this.lastHeard = this.clock.now();
    this.arm(HANDSHAKE_MS, () => {
      if (this.ws === ws && this.status !== 'open') this.abandon(false);
    });
    ws.onopen = () => {
      this.raw({
        type: 'hello',
        protocol: PROTOCOL,
        rules: RULES_VERSION,
        app: this.opts.app,
        appVersion: this.opts.appVersion,
      });
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      this.lastHeard = this.clock.now();
      this.receive(ev.data);
    };
    ws.onerror = () => {
      /* onclose follows */
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.stopPinging();
      this.disarm();
      if (this.stopped) this.setStatus('closed');
      else this.scheduleRetry();
    };
  }

  /** Send once greeted; false (and nothing sent) while the line is down. */
  send(m: ClientMessage): boolean {
    if (this.status !== 'open') return false;
    return this.raw(m);
  }

  /** Stop for good (leaving online play). */
  close(): void {
    this.stopped = true;
    if (this.retry) this.clock.clearTimeout(this.retry);
    this.retry = null;
    this.stopPinging();
    this.disarm();
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    this.setStatus('closed');
  }

  /**
   * Back in the foreground: with no line, dial at once; with one that looks
   * open, ping it, and if nothing answers within WAKE_CHECK_MS, it was dead
   * all along (a phone asleep keeps a socket that never closes): dial again.
   */
  wake(): void {
    if (this.stopped) return;
    if (!this.ws) {
      if (this.retry) this.clock.clearTimeout(this.retry);
      this.retry = null;
      this.connect();
      return;
    }
    if (this.status !== 'open') return;
    const asked = this.clock.now();
    this.raw({ type: 'ping', t: asked });
    this.arm(WAKE_CHECK_MS, () => {
      if (this.ws && this.lastHeard < asked) this.abandon(true);
    });
  }

  private receive(data: unknown): void {
    const m = parseServerMessage(typeof data === 'string' ? data : String(data));
    if (!m) return;
    if (m.type === 'welcome') {
      this.attempt = 0;
      this.offsetMs = m.serverTime - this.clock.now();
      this.bestRtt = Infinity;
      this.setStatus('open');
      for (let i = 0; i < CLOCK_SAMPLES; i++) this.raw({ type: 'ping', t: this.clock.now() });
      this.startPinging();
      this.opts.onReady();
      return;
    }
    if (m.type === 'pong') {
      const now = this.clock.now();
      const rtt = Math.max(0, now - m.t);
      if (rtt <= this.bestRtt) {
        this.bestRtt = rtt;
        this.offsetMs = m.serverTime + rtt / 2 - now;
      }
      return;
    }
    if (m.type === 'error' && (m.code === 'update' || m.code === 'rules')) {
      // this app and this server cannot play together: stop trying
      this.stopped = true;
    }
    if (m.type === 'ended' && m.reason === 'replaced') {
      // the seat is open on another connection: coming back would take it away
      this.stopped = true;
    }
    this.opts.onMessage(m);
  }

  private raw(m: ClientMessage): boolean {
    const ws = this.ws;
    if (!ws || ws.readyState !== OPEN) return false;
    try {
      ws.send(JSON.stringify(m));
      return true;
    } catch {
      return false;
    }
  }

  private scheduleRetry(): void {
    if (this.stopped) return this.setStatus('closed');
    this.setStatus('reconnecting');
    const wait = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)];
    this.attempt += 1;
    this.retry = this.clock.setTimeout(() => {
      this.retry = null;
      this.connect();
    }, wait);
  }

  /** Drop a line that went silent, quietly, and dial again: at once (`now`,
   *  the player is looking) or after the usual pause. */
  private abandon(now: boolean): void {
    const ws = this.ws;
    if (!ws) return;
    ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
    this.ws = null;
    this.stopPinging();
    this.disarm();
    try {
      ws.close();
    } catch {
      /* already gone */
    }
    if (now) {
      this.setStatus('reconnecting');
      this.connect();
    } else {
      this.scheduleRetry();
    }
  }

  private arm(ms: number, fn: () => void): void {
    this.disarm();
    this.watch = this.clock.setTimeout(() => {
      this.watch = null;
      fn();
    }, ms);
  }

  private disarm(): void {
    if (this.watch) this.clock.clearTimeout(this.watch);
    this.watch = null;
  }

  private startPinging(): void {
    this.stopPinging();
    const tick = () => {
      if (this.clock.now() - this.lastHeard > SILENT_MS) {
        this.abandon(false);
        return;
      }
      this.raw({ type: 'ping', t: this.clock.now() });
      this.pinger = this.clock.setTimeout(tick, PING_MS);
    };
    this.pinger = this.clock.setTimeout(tick, PING_MS);
  }

  private stopPinging(): void {
    if (this.pinger) this.clock.clearTimeout(this.pinger);
    this.pinger = null;
  }

  private setStatus(s: ConnStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.opts.onStatus(s);
  }
}

function defaultSocket(url: string): SocketLike {
  return new WebSocket(url) as unknown as SocketLike;
}
