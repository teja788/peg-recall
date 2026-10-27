/**
 * The Cloudflare adapter (decision D3, Oct 27: Workers Free plan): a Worker in
 * front, and ONE Durable Object that runs the hub for every room, exactly as
 * the Node server does in one process. hub.ts and room.ts are unchanged.
 *
 * Why one object for all rooms rather than one per room: Durable Objects are
 * billed for the time each object is awake. One object can be awake at most
 * 24 h a day (86,400 s × 128 MB = 10,800 GB-s), under the free plan's 13,000
 * GB-s a day, so room time can never run past the free allowance however
 * many rooms are open. One object also handles thousands of turn-based
 * players, far beyond what the game needs.
 *
 * Sockets use the standard WebSocket API (accept), not hibernation: rooms live
 * in this object's memory, which hibernation would throw away. The object
 * stays up while anyone is connected; once nobody is, Cloudflare may evict it,
 * and empty rooms go with it (they were closing anyway). A deploy restarts it
 * too: devices see "this room has closed", as after a Node restart.
 *
 * Cloudflare cannot send WebSocket pings from here; devices ping every 20 s,
 * and the hub's sweep closes connections that went silent (config.idleMs).
 */

import { Hub } from './hub';
import { MAX_FRAME_BYTES, healthBody, originAllowed, statsAllowed, statsBody } from './http';
import type { Clock, Conn } from './types';

export interface Env {
  ROOMS: DurableObjectNamespace;
  /** the web game's address(es), comma-separated (empty: any) */
  PUBLIC_ORIGINS?: string;
  /** "on": the free host limits (decision D4) */
  HOST_LIMITS?: string;
  MAX_ROOMS?: string;
  /** a secret: turns on GET /stats with "Authorization: Bearer <token>" */
  STATS_TOKEN?: string;
}

const CLOCK: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as number),
};

const SWEEP_MS = 60_000;
/** the one object every room lives in */
const OBJECT_NAME = 'rooms';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export class RoomsObject implements DurableObject {
  private readonly hub: Hub;
  private sweeper: ReturnType<typeof setInterval> | null = null;

  constructor(
    _state: DurableObjectState,
    private readonly env: Env,
  ) {
    this.hub = new Hub({
      clock: CLOCK,
      config: {
        hostLimits: env.HOST_LIMITS === 'on',
        ...(env.MAX_ROOMS ? { maxRooms: Number(env.MAX_ROOMS) } : {}),
      },
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') return json(healthBody(this.hub));
    if (url.pathname === '/stats') {
      return statsAllowed(request.headers.get('authorization'), this.env.STATS_TOKEN)
        ? json(statsBody(this.hub))
        : json({ error: 'not found' }, 404);
    }
    if (url.pathname !== '/ws') return json({ error: 'not found' }, 404);
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'websocket only' }, 426);
    const origins = (this.env.PUBLIC_ORIGINS ?? '').split(',').map((s) => s.trim());
    if (!originAllowed(request.headers.get('origin'), url.host, origins)) return json({ error: 'forbidden' }, 403);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    const conn: Conn = {
      send: (text) => {
        try {
          server.send(text);
        } catch {
          /* closing: its close event follows */
        }
      },
      close: () => {
        try {
          server.close(1000, 'bye');
        } catch {
          /* already closed */
        }
      },
    };
    // the address is only used for the room-creation limit, in memory, never logged
    this.hub.connect(conn, request.headers.get('cf-connecting-ip') ?? '?');
    this.startSweeping();

    server.addEventListener('message', (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.length > MAX_FRAME_BYTES) {
        this.hub.closed(conn);
        conn.close();
        return;
      }
      this.hub.message(conn, ev.data);
    });
    const gone = () => {
      this.hub.closed(conn);
      if (this.hub.connCount === 0) this.stopSweeping();
    };
    server.addEventListener('close', gone);
    server.addEventListener('error', gone);

    return new Response(null, { status: 101, webSocket: client });
  }

  /** Room expiry and the idle check run once a minute while anyone is connected. */
  private startSweeping(): void {
    this.sweeper ??= setInterval(() => {
      this.hub.sweep();
      if (this.hub.connCount === 0 && this.hub.roomCount === 0) this.stopSweeping();
    }, SWEEP_MS);
  }

  private stopSweeping(): void {
    if (this.hub.roomCount > 0) return; // rooms still need their expiry check
    if (this.sweeper) clearInterval(this.sweeper);
    this.sweeper = null;
  }
}

/** The Worker: everything goes to the one rooms object. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/ws' || pathname === '/health' || pathname === '/stats') {
      return env.ROOMS.get(env.ROOMS.idFromName(OBJECT_NAME)).fetch(request);
    }
    return json({ error: 'not found' }, 404);
  },
} satisfies ExportedHandler<Env>;
