/**
 * The app's own connection code (src/online/client.ts + src/store/roomStore.ts)
 * against the real server over real sockets: create, join, start, and a
 * dropped line that comes back by itself to the same seat with the board.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RoomClient, type SocketLike } from '../../../src/online/client';
import { createRoomStore, type GameSink } from '../../../src/store/roomStore';
import { startServer } from '../node';

function device(url: string) {
  const sockets: WebSocket[] = [];
  const calls: string[] = [];
  const game: GameSink = {
    remoteStart: (c) => calls.push(`start ${c.players.length}`),
    remoteSnapshot: (_s, seq) => calls.push(`snapshot ${seq}`),
    remoteAction: (seq) => calls.push(`action ${seq}`),
  };
  const data = new Map<string, string>();
  const store = createRoomStore({
    game,
    storage: { getItem: async (k) => data.get(k) ?? null, setItem: async (k, v) => void data.set(k, v) },
    connect: (hooks) => {
      const client = new RoomClient({
        url,
        app: 'web',
        appVersion: 'test',
        ...hooks,
        socket: (u) => {
          const ws = new WebSocket(u);
          sockets.push(ws);
          return ws as unknown as SocketLike;
        },
      });
      return { connect: () => client.connect(), send: (m) => client.send(m), close: () => client.close() };
    },
  });
  return { store, calls, sockets };
}

async function until(what: string, ok: () => boolean, ms = 3000) {
  const end = Date.now() + ms;
  while (!ok()) {
    if (Date.now() > end) assert.fail(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 20));
  }
}

test('the app’s client and room store: a game, a dropped line, the same seat again', async () => {
  const srv = await startServer({ port: 0, host: '127.0.0.1', log: () => {} });
  const url = `ws://127.0.0.1:${srv.port}/ws`;
  const host = device(url);
  const guest = device(url);
  try {
    host.store
      .getState()
      .create({ board: 'small', bonusTurnOnMatch: true, kidMode: false, maxSeats: 2, timer: 'relaxed' }, 'Maya', 'fox', false);
    await until('host seat', () => host.store.getState().seat === 'p1');
    const code = host.store.getState().code!;

    guest.store.getState().join(code, 'Dadi', 'owl');
    await until('guest seat', () => guest.store.getState().seat === 'p2');
    await until('host sees two seats', () => host.store.getState().room?.seats.length === 2);

    host.store.getState().start();
    await until('both started', () => host.calls.includes('start 2') && guest.calls.includes('start 2'));
    await until('the reveal ends for both', () => guest.calls.includes('action 1'), 6000);

    // the guest's line drops (a tunnel, a network switch)
    guest.sockets[0].close();
    await until('the guest reconnects', () => guest.sockets.length === 2, 3000);
    await until('and gets the board back', () => guest.calls.some((c) => c.startsWith('snapshot')), 3000);
    assert.equal(guest.store.getState().seat, 'p2', 'the same seat');
    assert.equal(guest.store.getState().status, 'open');
    await until('the host sees the guest online again', () => host.store.getState().room?.seats[1].online === true);

    guest.store.getState().leave();
    // mid-game the seat stays (the computer finishes it), shown as away
    await until('the host sees the guest gone', () => host.store.getState().room?.seats[1]?.online === false);
  } finally {
    host.store.getState().leave();
    await srv.close();
  }
});
