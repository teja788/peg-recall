/**
 * The Node adapter over real sockets: two clients (Node's built-in WebSocket,
 * the same API browsers and React Native have) create a room, join it and
 * start a game; /health and /stats answer; strangers' origins are turned away.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { ServerMessage } from '../../../src/online/protocol';
import { startServer } from '../node';

type Client = { ws: WebSocket; next: (type: ServerMessage['type']) => Promise<ServerMessage> };

function client(url: string, headers?: Record<string, string>): Promise<Client> {
  const ws = new WebSocket(url, headers ? ({ headers } as unknown as string[]) : undefined);
  const queue: ServerMessage[] = [];
  const waiting: { type: string; resolve: (m: ServerMessage) => void }[] = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(String(e.data)) as ServerMessage;
    const i = waiting.findIndex((w) => w.type === m.type);
    if (i >= 0) waiting.splice(i, 1)[0].resolve(m);
    else queue.push(m);
  });
  const next = (type: ServerMessage['type']) =>
    new Promise<ServerMessage>((resolve, reject) => {
      const i = queue.findIndex((m) => m.type === type);
      if (i >= 0) return resolve(queue.splice(i, 1)[0]);
      waiting.push({ type, resolve });
      setTimeout(() => reject(new Error(`no ${type} within 3 s`)), 3000).unref();
    });
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve({ ws, next }));
    ws.addEventListener('error', () => reject(new Error('could not connect')));
  });
}

const send = (c: Client, m: unknown) => c.ws.send(JSON.stringify(m));
const hello = { type: 'hello', protocol: 1, rules: 1, app: 'web', appVersion: 'test' };

test('two devices meet in a room and start a game over real sockets', async () => {
  const srv = await startServer({ port: 0, host: '127.0.0.1', statsToken: 'secret', log: () => {} });
  const url = `ws://127.0.0.1:${srv.port}/ws`;
  try {
    const host = await client(url);
    send(host, hello);
    await host.next('welcome');
    send(host, {
      type: 'create',
      settings: { board: 'small', bonusTurnOnMatch: true, kidMode: false, maxSeats: 2, timer: 'relaxed' },
      name: 'Maya',
      avatar: 'fox',
      unlocked: false,
    });
    const joined = await host.next('joined');
    assert.equal(joined.type === 'joined' && joined.seat, 'p1');
    const code = joined.type === 'joined' ? joined.code : '';
    assert.match(code, /^\d{6}$/);

    const guest = await client(url);
    send(guest, hello);
    await guest.next('welcome');
    send(guest, { type: 'join', code, name: 'Dadi', avatar: 'owl' });
    assert.equal((await guest.next('joined')).type, 'joined');

    send(host, { type: 'start' });
    const started = await guest.next('started');
    assert.equal(started.type === 'started' && started.config.players.length, 2);

    const health = await (await fetch(`http://127.0.0.1:${srv.port}/health`)).json();
    assert.deepEqual(health, { ok: true, rooms: 1, connections: 2 });
    const hidden = await fetch(`http://127.0.0.1:${srv.port}/stats`);
    assert.equal(hidden.status, 404, '/stats needs the token');
    const stats = await (
      await fetch(`http://127.0.0.1:${srv.port}/stats`, { headers: { authorization: 'Bearer secret' } })
    ).json() as { gamesStarted: number; roomsCreated: unknown };
    assert.equal(stats.gamesStarted, 1);
    assert.deepEqual(stats.roomsCreated, { ios: 0, web: 1 });

    host.ws.close();
    guest.ws.close();
  } finally {
    await srv.close();
  }
});

test('only the listed web origins may connect; apps without an Origin may', async () => {
  const srv = await startServer({
    port: 0,
    host: '127.0.0.1',
    origins: ['https://colorcatch.pages.dev'],
    log: () => {},
  });
  const url = `ws://127.0.0.1:${srv.port}/ws`;
  try {
    await assert.rejects(client(url, { origin: 'https://evil.example' }));
    const ok = await client(url, { origin: 'https://colorcatch.pages.dev' });
    ok.ws.close();
    const app = await client(url);
    app.ws.close();
  } finally {
    await srv.close();
  }
});

test('shutting down tells every room why', async () => {
  const srv = await startServer({ port: 0, host: '127.0.0.1', log: () => {} });
  const c = await client(`ws://127.0.0.1:${srv.port}/ws`);
  send(c, hello);
  await c.next('welcome');
  send(c, {
    type: 'create',
    settings: { board: 'classic', bonusTurnOnMatch: true, kidMode: false, maxSeats: 4, timer: 'quick' },
    avatar: 'cat',
    unlocked: false,
  });
  await c.next('joined');
  const ended = c.next('ended');
  await srv.close();
  const m = await ended;
  assert.equal(m.type === 'ended' && m.reason, 'serverRestart');
});
