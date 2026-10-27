import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RoomClient, type ClientClock, type ConnStatus, type SocketLike } from '../client';
import type { ServerMessage } from '../protocol';

class FakeClock implements ClientClock {
  t = 10_000;
  private jobs = new Map<number, { due: number; fn: () => void }>();
  private id = 1;
  now = () => this.t;
  setTimeout = (fn: () => void, ms: number) => {
    const id = this.id++;
    this.jobs.set(id, { due: this.t + ms, fn });
    return id;
  };
  clearTimeout = (h: unknown) => void this.jobs.delete(h as number);
  advance(ms: number) {
    const end = this.t + ms;
    for (;;) {
      const next = [...this.jobs.entries()].sort((a, b) => a[1].due - b[1].due)[0];
      if (!next || next[1].due > end) break;
      this.jobs.delete(next[0]);
      this.t = next[1].due;
      next[1].fn();
    }
    this.t = end;
  }
}

class FakeSocket implements SocketLike {
  readyState = 0;
  sent: Record<string, unknown>[] = [];
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
    this.onclose?.({});
  }
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(m: ServerMessage) {
    this.onmessage?.({ data: JSON.stringify(m) });
  }
  drop() {
    this.readyState = 3;
    this.onclose?.({});
  }
}

function setup() {
  const clock = new FakeClock();
  const sockets: FakeSocket[] = [];
  const statuses: ConnStatus[] = [];
  const messages: ServerMessage[] = [];
  let ready = 0;
  const client = new RoomClient({
    url: 'ws://test/ws',
    app: 'web',
    appVersion: '1.4.0',
    clock,
    socket: () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    },
    onStatus: (s) => statuses.push(s),
    onMessage: (m) => messages.push(m),
    onReady: () => ready++,
  });
  return { clock, sockets, statuses, messages, client, ready: () => ready };
}

test('says hello on open, is ready on welcome, and only then sends', () => {
  const { client, sockets, statuses, ready } = setup();
  client.connect();
  assert.equal(client.send({ type: 'start' }), false, 'nothing goes out before the welcome');
  sockets[0].open();
  assert.equal(sockets[0].sent[0].type, 'hello');
  assert.equal(sockets[0].sent[0].protocol, 1);
  sockets[0].receive({ type: 'welcome', serverTime: 50_000 });
  assert.equal(ready(), 1);
  assert.deepEqual(statuses, ['connecting', 'open']);
  assert.equal(client.send({ type: 'start' }), true);
  assert.equal(sockets[0].sent.filter((m) => m.type === 'ping').length, 3, 'three pings read the clock');
});

test("the server's clock: offset from the fastest ping", () => {
  const { client, sockets, clock } = setup();
  client.connect();
  sockets[0].open();
  sockets[0].receive({ type: 'welcome', serverTime: 50_000 });
  const t = clock.now();
  clock.t += 400;
  sockets[0].receive({ type: 'pong', t, serverTime: 60_000 });
  assert.equal(client.offsetMs, 60_000 + 200 - clock.now());
  clock.t += 1000;
  sockets[0].receive({ type: 'pong', t: clock.now() - 40, serverTime: 61_400 });
  assert.equal(client.offsetMs, 61_400 + 20 - clock.now(), 'a faster ping wins');
  assert.equal(Math.round(client.serverNow()), Math.round(clock.now() + client.offsetMs));
});

test('a dropped line comes back with growing pauses, and is ready again', () => {
  const { client, sockets, clock, statuses, ready } = setup();
  client.connect();
  sockets[0].open();
  sockets[0].receive({ type: 'welcome', serverTime: 1 });
  sockets[0].drop();
  assert.equal(statuses.at(-1), 'reconnecting');
  clock.advance(499);
  assert.equal(sockets.length, 1);
  clock.advance(1);
  assert.equal(sockets.length, 2, 'retry after 0.5 s');
  sockets[1].drop();
  clock.advance(999);
  assert.equal(sockets.length, 2);
  clock.advance(1);
  assert.equal(sockets.length, 3, 'then after 1 s');
  sockets[2].open();
  sockets[2].receive({ type: 'welcome', serverTime: 1 });
  assert.equal(ready(), 2, 'ready again: the room store resumes the seat');
  sockets[2].drop();
  clock.advance(500);
  assert.equal(sockets.length, 4, 'a good connection resets the pause');
});

test('wake() skips the wait (back in the foreground)', () => {
  const { client, sockets } = setup();
  client.connect();
  sockets[0].drop();
  client.wake();
  assert.equal(sockets.length, 2);
});

test('"update" or "rules" ends it: no reconnecting to be refused again', () => {
  const { client, sockets, clock, messages, statuses } = setup();
  client.connect();
  sockets[0].open();
  sockets[0].receive({ type: 'error', code: 'update' });
  sockets[0].drop();
  clock.advance(60_000);
  assert.equal(sockets.length, 1);
  assert.equal(statuses.at(-1), 'closed');
  assert.deepEqual(messages, [{ type: 'error', code: 'update' }]);
});

test('close() hangs up for good; pings stop', () => {
  const { client, sockets, clock } = setup();
  client.connect();
  sockets[0].open();
  sockets[0].receive({ type: 'welcome', serverTime: 1 });
  client.close();
  clock.advance(120_000);
  assert.equal(sockets.length, 1);
  assert.equal(sockets[0].sent.filter((m) => m.type === 'ping').length, 3, 'no pings after close');
  assert.equal(client.status, 'closed');
});

test('pings keep the line warm every 20 s', () => {
  const { client, sockets, clock } = setup();
  client.connect();
  sockets[0].open();
  sockets[0].receive({ type: 'welcome', serverTime: 1 });
  clock.advance(60_000);
  assert.equal(sockets[0].sent.filter((m) => m.type === 'ping').length, 3 + 3);
});
