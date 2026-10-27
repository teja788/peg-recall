import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { ClientMessage, ServerMessage } from '../../online/protocol';
import { ROOM_KEY, createRoomStore, type ConnectionHooks, type GameSink } from '../roomStore';
import type { KeyValueStorage } from '../storage';

class Line {
  sent: ClientMessage[] = [];
  open = false;
  closed = false;
  constructor(readonly hooks: ConnectionHooks) {}
  connect() {}
  send(m: ClientMessage) {
    if (!this.open) return false;
    this.sent.push(m);
    return true;
  }
  close() {
    this.closed = true;
  }
  /** the server greeted us */
  ready() {
    this.open = true;
    this.hooks.onStatus('open');
    this.hooks.onReady();
  }
  receive(m: ServerMessage) {
    this.hooks.onMessage(m);
  }
}

function setup(stored: Record<string, string> = {}, now = 1_000_000) {
  const data = new Map(Object.entries(stored));
  const storage: KeyValueStorage = {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
  };
  const lines: Line[] = [];
  const game: GameSink & { calls: string[] } = {
    calls: [],
    remoteStart: () => game.calls.push('start'),
    remoteSnapshot: () => game.calls.push('snapshot'),
    remoteAction: (seq) => game.calls.push(`action ${seq}`),
  };
  const useRoom = createRoomStore({
    storage,
    game,
    now: () => now,
    connect: (hooks) => {
      const l = new Line(hooks);
      lines.push(l);
      return l;
    },
  });
  return { useRoom, lines, data, game };
}

const settings = { board: 'classic', bonusTurnOnMatch: true, kidMode: false, maxSeats: 4, timer: 'relaxed' } as const;

test('create waits for the line, then the seat is saved for coming back', async () => {
  const { useRoom, lines, data } = setup();
  useRoom.getState().create(settings, 'Maya', 'fox', false);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].sent.length, 0, 'nothing before the greeting');
  lines[0].ready();
  assert.equal(lines[0].sent[0].type, 'create');
  lines[0].receive({ type: 'joined', code: '482913', seat: 'p1', token: 'a'.repeat(32) });
  assert.deepEqual([useRoom.getState().code, useRoom.getState().seat], ['482913', 'p1']);
  await Promise.resolve();
  assert.equal(JSON.parse(data.get(ROOM_KEY)!).token, 'a'.repeat(32));
});

test('after a drop the line resumes the seat by itself', () => {
  const { useRoom, lines } = setup();
  useRoom.getState().join('482913', 'Leo', 'owl');
  lines[0].ready();
  lines[0].receive({ type: 'joined', code: '482913', seat: 'p2', token: 'b'.repeat(32) });
  lines[0].open = false;
  lines[0].hooks.onStatus('reconnecting');
  lines[0].ready();
  assert.deepEqual(lines[0].sent.at(-1), { type: 'resume', code: '482913', token: 'b'.repeat(32) });
});

test('game messages go to the game store; the seat link sends intents and asks for snapshots', () => {
  const { useRoom, lines, game } = setup();
  let link: Parameters<GameSink['remoteStart']>[1] | null = null;
  game.remoteStart = (_c, s) => {
    link = s;
    game.calls.push('start');
  };
  useRoom.getState().join('482913', undefined, 'owl');
  lines[0].ready();
  lines[0].receive({ type: 'joined', code: '482913', seat: 'p2', token: 'c'.repeat(32) });
  lines[0].receive({
    type: 'started',
    seq: 0,
    at: 1,
    config: { boardSize: 'small', players: [], rules: { bonusTurnOnMatch: true, tieBreak: 'shared', kidMode: false }, seed: 1 },
  });
  lines[0].receive({ type: 'action', seq: 1, action: { type: 'REVEAL_DONE' }, by: null, at: 2, hash: 'x' });
  assert.deepEqual(game.calls, ['start', 'action 1']);
  assert.equal(link!.seat, 'p2');
  link!.send({ type: 'ROLL' });
  link!.resync();
  assert.deepEqual(lines[0].sent.slice(-2), [
    { type: 'intent', action: { type: 'ROLL' } },
    { type: 'resume', code: '482913', token: 'c'.repeat(32) },
  ]);
});

test('rejoin: from the saved seat after a reload; a stale or other room is not tried', async () => {
  const saved = JSON.stringify({ code: '111222', token: 'd'.repeat(32), at: 999_000 });
  {
    const { useRoom, lines } = setup({ [ROOM_KEY]: saved });
    assert.equal(await useRoom.getState().rejoin('999999'), false, 'another room');
    assert.equal(await useRoom.getState().rejoin('111222'), true);
    lines[0].ready();
    assert.deepEqual(lines[0].sent, [{ type: 'resume', code: '111222', token: 'd'.repeat(32) }]);
  }
  {
    const { useRoom } = setup({ [ROOM_KEY]: saved }, 999_000 + 5 * 60 * 60_000);
    assert.equal(await useRoom.getState().rejoin(), false, 'older than any room lives');
  }
});

test('a saved room that is gone: forgotten; an ended room: told and forgotten', async () => {
  const saved = JSON.stringify({ code: '111222', token: 'e'.repeat(32), at: 999_000 });
  const { useRoom, lines, data } = setup({ [ROOM_KEY]: saved });
  await useRoom.getState().rejoin();
  lines[0].ready();
  lines[0].receive({ type: 'error', code: 'notFound' });
  assert.deepEqual([useRoom.getState().code, useRoom.getState().error], [null, 'notFound']);
  await Promise.resolve();
  assert.equal(data.get(ROOM_KEY), '');

  useRoom.getState().join('333444', undefined, 'cat');
  lines[0].receive({ type: 'joined', code: '333444', seat: 'p3', token: 'f'.repeat(32) });
  lines[0].receive({ type: 'ended', reason: 'removed' });
  assert.deepEqual([useRoom.getState().ended, useRoom.getState().seat], ['removed', null]);
});

test('leave tells the server, hangs up and forgets the seat', async () => {
  const { useRoom, lines, data } = setup();
  useRoom.getState().join('482913', undefined, 'owl');
  lines[0].ready();
  lines[0].receive({ type: 'joined', code: '482913', seat: 'p2', token: 'a'.repeat(32) });
  useRoom.getState().leave();
  assert.deepEqual(lines[0].sent.at(-1), { type: 'leave' });
  assert.equal(lines[0].closed, true);
  assert.equal(useRoom.getState().code, null);
  await Promise.resolve();
  assert.equal(data.get(ROOM_KEY), '');
  useRoom.getState().join('482913', undefined, 'owl');
  assert.equal(lines.length, 2, 'a new line for the next room');
});
