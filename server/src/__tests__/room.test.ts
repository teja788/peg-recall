import { test } from 'node:test';
import assert from 'node:assert/strict';

import { activePlayerSpec } from '../../../src/engine';
import { Device, SETTINGS, makeHub, playOut, room } from './helpers';

test('two people play a whole game; both screens rebuild it hash for hash', () => {
  const { hub, clock } = makeHub();
  const { host, guests, all } = room(hub, 1);
  assert.equal(host.room?.seats.length, 2);
  host.say({ type: 'start' });
  playOut(clock, all);
  assert.deepEqual(host.state, guests[0].state, 'the same final board everywhere');
  assert.equal(host.seq, guests[0].seq);
  assert.equal(host.room?.status, 'over');
  assert.equal(hub.stats.gamesFinished, 1);
  assert.ok(host.actions.every((a) => !a.standIn), 'nobody needed a stand-in');
});

test('four people (and their turns) on the Huge board', () => {
  const { hub, clock } = makeHub();
  const { host, all } = room(hub, 3, { board: 'huge' });
  assert.deepEqual(host.room?.seats.map((s) => s.id), ['p1', 'p2', 'p3', 'p4']);
  host.say({ type: 'start' });
  playOut(clock, all);
  for (const d of all) assert.deepEqual(d.state, host.state);
});

test('a computer seat plays itself, at the app’s pace', () => {
  const { hub, clock } = makeHub();
  const host = new Device(hub, 'ios').hello();
  host.say({ type: 'create', settings: SETTINGS, avatar: 'fox', unlocked: true });
  host.say({ type: 'addBot', difficulty: 'fox' });
  assert.equal(host.room?.seats[1].kind, 'ai');
  assert.equal(host.room?.seats[1].avatar, 'fox');
  assert.notEqual(host.room?.seats[0].avatar, 'fox', 'never Fox vs Fox: the person moved over');
  host.say({ type: 'start' });
  playOut(clock, [host]);
  const botMoves = host.actions.filter((a) => a.by === 'p2');
  assert.ok(botMoves.length > 0);
  assert.ok(botMoves.every((a) => !a.standIn), 'a computer seat is not a stand-in');
});

test('moves that are not yours, or not legal now, are dropped silently', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1);
  const guest = guests[0];
  host.say({ type: 'start' });
  clock.advance(10_000); // the reveal ends
  host.read();
  guest.read();
  assert.equal(host.state?.phase, 'roll');
  assert.equal(activePlayerSpec(host.state!).id, 'p1');
  const before = host.seq;
  guest.say({ type: 'intent', action: { type: 'ROLL' } }); // not their turn
  host.say({ type: 'intent', action: { type: 'PICK', pegIndex: 0 } }); // wrong phase
  host.read();
  assert.equal(host.seq, before);
  host.move(); // roll
  const taken = host.state!.pegs.findIndex((p) => p.state !== 'hidden');
  if (taken >= 0) host.say({ type: 'intent', action: { type: 'PICK', pegIndex: taken } });
  assert.equal(host.seq, before + 1, 'only the roll counted');
  assert.deepEqual(guest.errors, [], 'no error messages for dropped moves');
});

test('someone drops out: 15 s grace, then the computer plays for them; back again, they play', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1);
  const guest = guests[0];
  host.say({ type: 'start' });
  // play until it is the guest's turn
  for (let i = 0; i < 2000 && !(host.state?.phase === 'roll' && activePlayerSpec(host.state).id === 'p2'); i++) {
    if (host.myMove()) host.move();
    clock.advance(50);
    host.read();
    guest.read();
  }
  assert.equal(activePlayerSpec(host.state!).id, 'p2');
  guest.drop();
  host.read();
  assert.equal(host.room?.seats[1].online, false, 'the others see them away');
  const seq = host.seq;
  clock.advance(14_000);
  host.read();
  assert.equal(host.seq, seq, 'still their grace time');
  clock.advance(1_500);
  host.read();
  const stood = host.actions.at(-1)!;
  assert.deepEqual([stood.by, stood.standIn, stood.action.type], ['p2', true, 'ROLL']);
  // the pick follows at computer pace (tumble + think, under 3 s), not after another 15 s
  clock.advance(3_000);
  host.read();
  const pick = host.actions.find((a) => a.seq > stood.seq && a.action.type === 'PICK');
  assert.ok(pick, 'the stand-in picked');
  assert.deepEqual([pick.by, pick.standIn], ['p2', true]);
  assert.ok(pick.at - stood.at < 3_000, `picked ${pick.at - stood.at} ms after its roll`);

  // back on a new connection: a snapshot, and their seat again
  guest.reconnect();
  guest.hello().say({ type: 'resume', code: host.code!, token: guest.token! });
  assert.equal(guest.seat, 'p2');
  assert.deepEqual(guest.state, host.state, 'the snapshot is the board as it is now');
  host.read();
  assert.equal(host.room?.seats[1].online, true);
});

test('here but not moving: the turn clock (Quick: 20 s) plays for them', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1, { timer: 'quick' });
  host.say({ type: 'start' });
  clock.advance(4_100); // Small board reveal: 4 s
  host.read();
  assert.equal(host.state?.phase, 'roll');
  const seq = host.seq;
  clock.advance(19_000);
  host.read();
  assert.equal(host.seq, seq);
  clock.advance(1_500);
  host.read();
  assert.deepEqual([host.actions.at(-1)!.by, host.actions.at(-1)!.standIn], ['p1', true]);
  guests[0].read();
  assert.equal(guests[0].seq, host.seq);
});

test('nobody left online: the board waits, then carries on when someone is back', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1);
  host.say({ type: 'start' });
  guests[0].read();
  host.drop();
  guests[0].drop();
  const seq = guests[0].seq;
  clock.advance(5 * 60_000);
  assert.equal(clock.pending, 0, 'no timers while nobody is here');
  host.reconnect();
  host.hello().say({ type: 'resume', code: host.code!, token: host.token! });
  assert.equal(host.seq, seq);
  clock.advance(10_000);
  host.read();
  assert.ok(host.seq > seq, 'the game moves again');
});

test('rematch: the same seats, a new board', () => {
  const { hub, clock } = makeHub();
  const { host, guests, all } = room(hub, 1);
  host.say({ type: 'start' });
  playOut(clock, all);
  const first = host.state!.config.seed;
  guests[0].say({ type: 'rematch' });
  assert.deepEqual(guests[0].errors, ['notHost']);
  host.say({ type: 'rematch' });
  for (const d of all) d.read();
  assert.equal(host.state?.phase, 'reveal');
  assert.notEqual(host.state?.config.seed, first);
  assert.equal(guests[0].seq, 0);
  assert.equal(hub.stats.rematches, 1);
});

test('lobby: the host leaves, hosting passes on; the last person leaves, the room goes', () => {
  const { hub } = makeHub();
  const { host, guests } = room(hub, 2);
  host.say({ type: 'leave' });
  guests[0].read();
  assert.equal(guests[0].room?.host, 'p2');
  assert.deepEqual(guests[0].room?.seats.map((s) => s.id), ['p2', 'p3']);
  guests[0].say({ type: 'leave' });
  guests[1].say({ type: 'leave' });
  assert.equal(hub.roomCount, 0);
});

test('the host removes a player: they are told, and their moves no longer count', () => {
  const { hub } = makeHub();
  const { host, guests } = room(hub, 1);
  host.say({ type: 'removeSeat', seat: 'p2' });
  guests[0].read();
  assert.equal(guests[0].ended, 'removed');
  assert.equal(host.room?.seats.length, 1);
  guests[0].say({ type: 'start' });
  assert.deepEqual(guests[0].errors, ['bad'], 'no longer in a room');
});

test('joining: full, already playing, wrong code (and too many wrong codes)', () => {
  const { hub } = makeHub();
  const { host } = room(hub, 1, { maxSeats: 2 });
  const late = new Device(hub).hello().say({ type: 'join', code: host.code!, avatar: 'cat' });
  assert.deepEqual(late.errors, ['full']);
  const { host: h2 } = room(hub, 1);
  h2.say({ type: 'start' });
  const later = new Device(hub).hello().say({ type: 'join', code: h2.code!, avatar: 'cat' });
  assert.deepEqual(later.errors, ['started']);

  const guesser = new Device(hub).hello();
  for (let i = 0; i < 10; i++) guesser.say({ type: 'join', code: '000000', avatar: 'cat' });
  assert.equal(guesser.errors.filter((e) => e === 'notFound').length, 10);
  assert.equal(guesser.conn.closed, false);
  guesser.say({ type: 'join', code: '000001', avatar: 'cat' });
  assert.equal(guesser.errors.at(-1), 'rate');
  assert.equal(guesser.conn.closed, true, 'the 11th wrong code in a minute hangs up');
});

test('two people wanting the same animal: the second gets the next free one', () => {
  const { hub } = makeHub();
  const { host } = room(hub, 2);
  assert.deepEqual(host.room?.seats.map((s) => s.avatar), ['fox', 'owl', 'bear']);
});

test('versions: an old app must update, a newer app waits for the server', () => {
  const { hub } = makeHub();
  const old = new Device(hub).hello(-1, 1); // older than the one before current
  assert.deepEqual([old.errors, old.conn.closed], [['update'], true]);
  const oldRules = new Device(hub).hello(1, 0);
  assert.deepEqual(oldRules.errors, ['update']);
  const newer = new Device(hub).hello(2, 1);
  assert.deepEqual([newer.errors, newer.conn.closed], [['rules'], true]);
  const rude = new Device(hub).say({ type: 'create', settings: SETTINGS, avatar: 'fox', unlocked: false });
  assert.deepEqual(rude.errors, ['bad'], 'nothing before hello');
  assert.equal(hub.roomCount, 0);
});

test('limits: off by default; on, a free host is held to 2 seats, Small/Classic, no Owl', () => {
  const free = { settings: { ...SETTINGS, maxSeats: 2 as const }, avatar: 'fox', unlocked: false, type: 'create' };
  {
    const { hub } = makeHub();
    const d = new Device(hub).hello().say({ ...free, settings: { ...SETTINGS, board: 'huge' } });
    assert.deepEqual(d.errors, [], 'beta: no limits');
  }
  const { hub } = makeHub({ hostLimits: true });
  const a = new Device(hub).hello().say({ ...free, settings: { ...SETTINGS, maxSeats: 4 } });
  const b = new Device(hub).hello().say({ ...free, settings: { ...SETTINGS, board: 'big', maxSeats: 2 } });
  assert.deepEqual([a.errors, b.errors], [['needsUnlock'], ['needsUnlock']]);
  const c = new Device(hub).hello().say(free);
  assert.deepEqual(c.errors, []);
  c.say({ type: 'addBot', difficulty: 'owl' });
  assert.deepEqual(c.errors, ['needsUnlock']);
  c.say({ type: 'addBot', difficulty: 'fox' });
  assert.equal(c.room?.seats.length, 2);
  const paid = new Device(hub).hello().say({ ...free, settings: { ...SETTINGS, board: 'huge' }, unlocked: true });
  assert.deepEqual(paid.errors, []);
  // guests join a paid host's Huge 4-seat room freely
  const guest = new Device(hub).hello().say({ type: 'join', code: paid.code!, avatar: 'cat' });
  assert.deepEqual(guest.errors, []);
  assert.equal(hub.stats.needsUnlock, 3);
});

test('rooms expire: an idle lobby, an empty game, a finished game', () => {
  // these devices stay connected without pinging, so the idle sweep is off here
  const { hub, clock } = makeHub({ idleMs: 24 * 60 * 60_000 });
  const lobby = room(hub, 1);
  const empty = room(hub, 1);
  empty.host.say({ type: 'start' });
  empty.host.drop();
  empty.guests[0].drop();
  clock.advance(11 * 60_000);
  hub.sweep();
  assert.equal(hub.roomCount, 1, 'the empty game closed after 10 min');
  clock.advance(20 * 60_000);
  hub.sweep();
  assert.equal(hub.roomCount, 0, 'the idle lobby closed after 30 min');
  lobby.host.read();
  assert.equal(lobby.host.ended, 'expired');
  assert.equal(hub.stats.roomsExpired, 2);
});

test('too many messages in a second closes the connection; ping gets a pong', () => {
  const { hub } = makeHub();
  const d = new Device(hub).hello();
  d.say({ type: 'ping', t: 5 });
  assert.equal(d.conn.inbox.at(-1)?.type, 'pong');
  for (let i = 0; i < 25; i++) d.say({ type: 'ping', t: i });
  assert.equal(d.conn.closed, true);
  assert.equal(d.errors.at(-1), 'rate');
});

test('room creations are limited per address per hour', () => {
  const { hub, clock } = makeHub({ createsPerHour: 3 });
  const d = new Device(hub, 'ios', '10.9.9.9').hello();
  for (let i = 0; i < 4; i++) d.say({ type: 'create', settings: SETTINGS, avatar: 'fox', unlocked: false });
  assert.deepEqual(d.errors, ['rate']);
  clock.advance(61 * 60_000);
  d.say({ type: 'create', settings: SETTINGS, avatar: 'fox', unlocked: false });
  assert.deepEqual(d.errors, ['rate'], 'an hour later it works again');
});

test('a second connection with the same token takes the seat over', () => {
  const { hub } = makeHub();
  const { host } = room(hub, 1);
  const first = host.reconnect();
  host.hello().say({ type: 'resume', code: host.code!, token: host.token! });
  assert.equal(first.closed, true);
  assert.equal(host.seat, 'p1');
  const stranger = new Device(hub).hello().say({ type: 'resume', code: host.code!, token: 'f'.repeat(32) });
  assert.deepEqual(stranger.errors, ['notFound']);
});

test('a connection that goes silent (no pings) is let go; a pinging one stays', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1);
  for (let t = 0; t < 4; t++) {
    clock.advance(30_000);
    host.say({ type: 'ping', t });
    hub.sweep();
  }
  assert.equal(host.conn.closed, false, 'pinging every 30 s keeps the line');
  assert.equal(guests[0].conn.closed, true, 'two minutes of silence: closed');
  host.read();
  assert.equal(host.room?.seats[1].online, false, 'and shown as away');
});
