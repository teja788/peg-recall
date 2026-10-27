/**
 * The Node adapter: runs the hub on a plain Node server (a droplet, any VPS,
 * Fly.io, Railway, Render, a Docker host). HTTP for /health and /stats,
 * WebSockets at /ws. TLS is left to a proxy in front (Caddy: deploy/Caddyfile).
 *
 * The only file that knows about Node and `ws`; a Cloudflare Durable Object
 * adapter would sit beside it and reuse hub.ts / room.ts unchanged.
 */

import http from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';

import { Hub } from './hub';
import type { Clock, Conn, ServerConfig } from './types';

export interface NodeOptions {
  port: number;
  host?: string;
  config?: Partial<ServerConfig>;
  /** web origins allowed to open a socket (the web game's address); empty = any */
  origins?: string[];
  /** bearer token for /stats; empty = /stats is off */
  statsToken?: string;
  /** take the address from X-Forwarded-For (behind Caddy / a load balancer) */
  trustProxy?: boolean;
  log?: (line: string) => void;
}

const REAL_CLOCK: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** Largest frame accepted from a device (messages are well under 2 KB). */
const MAX_FRAME_BYTES = 4096;
const HEARTBEAT_MS = 30_000;
const SWEEP_MS = 60_000;

export async function startServer(opts: NodeOptions) {
  const log = opts.log ?? ((line: string) => console.log(line));
  const hub = new Hub({ clock: REAL_CLOCK, config: opts.config });
  const origins = (opts.origins ?? []).filter(Boolean);
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });
  const alive = new WeakMap<WebSocket, boolean>();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, rooms: hub.roomCount, connections: hub.connCount });
    }
    if (req.method === 'GET' && url.pathname === '/stats') {
      const auth = req.headers.authorization ?? '';
      if (!opts.statsToken || auth !== `Bearer ${opts.statsToken}`) return json(res, 404, { error: 'not found' });
      return json(res, 200, { rooms: hub.roomCount, connections: hub.connCount, ...hub.stats });
    }
    json(res, 404, { error: 'not found' });
  });

  server.on('upgrade', (req, socket: Duplex, head) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (url.pathname !== '/ws') return reject(socket, 404);
    // Browsers always send Origin: only the web game's own address may connect.
    // The iOS app sends none, or its own server's address.
    const origin = req.headers.origin;
    if (origin && origins.length && !origins.includes(origin) && !sameHost(origin, req.headers.host)) {
      return reject(socket, 403);
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
      const ip = (opts.trustProxy && forwarded) || req.socket.remoteAddress || '?';
      const conn: Conn = {
        send: (text) => {
          if (ws.readyState === ws.OPEN) ws.send(text);
        },
        close: () => ws.close(1000),
      };
      alive.set(ws, true);
      hub.connect(conn, ip);
      ws.on('message', (data, isBinary) => {
        if (!isBinary) hub.message(conn, data.toString());
      });
      ws.on('pong', () => alive.set(ws, true));
      ws.on('close', () => hub.closed(conn));
      ws.on('error', () => ws.terminate());
    });
  });

  // a phone that vanished without closing (tunnel, battery) is let go
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.get(ws)) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, HEARTBEAT_MS);
  const sweeper = setInterval(() => hub.sweep(), SWEEP_MS);

  await new Promise<void>((resolve) => server.listen(opts.port, opts.host ?? '0.0.0.0', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : opts.port;
  log(`rooms: listening on :${port} (host limits ${hub.config.hostLimits ? 'on' : 'off'})`);

  /** Tell every room the server is restarting, then stop. */
  async function close() {
    clearInterval(heartbeat);
    clearInterval(sweeper);
    hub.shutdown();
    for (const ws of wss.clients) ws.terminate();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  return { hub, port, close };
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function reject(socket: Duplex, status: 403 | 404) {
  socket.write(`HTTP/1.1 ${status} ${status === 403 ? 'Forbidden' : 'Not Found'}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function sameHost(origin: string, host: string | undefined): boolean {
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}
