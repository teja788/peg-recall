import { test } from 'node:test';
import assert from 'node:assert/strict';

import { activePlayerSpec } from '../../../src/engine';
import { MISSED_LIMIT, PROTOCOL } from '../../../src/online/protocol';
import type { Room } from '../room';
import { Device, SETTINGS, makeHub, playOut, room, type FakeClock } from './helpers';

/** Let time pass in 250 ms steps until `done`: the host plays their own turns
 *  at once, and `pingers` ping every 5 s as a live device does. */
function run(clock: FakeClock, host: Device, pingers: Device[], done: () => boolean, limitMs = 10 * 60_000) {
  for (let t = 0; t < limitMs && !done(); t += 250) {
    clock.advance(250);
    if (t % 5_000 === 0) for (const d of pingers) d.say({ type: 'ping', t });
    host.read();
    for (const d of pingers) d.read();
    if (host.myMove()) host.move();
  }
}

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
  const old = new Device(hub).hello(PROTOCOL - 1, 1); // #12: protocol 1 had no breaks or reactions
  assert.deepEqual([old.errors, old.conn.closed], [['update'], true]);
  const oldRules = new Device(hub).hello(PROTOCOL, 0);
  assert.deepEqual(oldRules.errors, ['update']);
  const newer = new Device(hub).hello(PROTOCOL + 1, 1);
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

/* ------------------------------------------------ audit fixes (Oct 28) */

test('F05: resume spam from another seat cannot stall an away player’s stand-in', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1);
  host.say({ type: 'start' });
  guests[0].read();
  guests[0].drop();
  // Maya plays her own turns and, every 100 ms, sends a (valid) resume
  for (let t = 0; t < 60_000; t += 100) {
    host.read();
    if (host.myMove()) host.move();
    host.say({ type: 'resume', code: host.code!, token: host.token! });
    clock.advance(100);
  }
  host.read();
  const standIns = host.actions.filter((a) => a.by === 'p2' && a.standIn);
  assert.ok(standIns.filter((a) => a.action.type === 'ROLL').length >= 3, `stand-in rolls: ${standIns.length}`);
  assert.ok(standIns.some((a) => a.action.type === 'PICK'));
});

test('F05: a stand-in roll keeps its deadline when the clock is re-armed', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1);
  host.say({ type: 'start' });
  guests[0].read();
  guests[0].drop();
  // play until a stand-in has rolled once (so p2 is played at computer pace)
  for (let i = 0; i < 4000 && !host.actions.some((a) => a.standIn); i++) {
    if (host.myMove()) host.move();
    clock.advance(50);
    host.read();
  }
  // next time it is p2's roll, spam resumes: the roll still comes 400 ms after the phase began
  for (let i = 0; i < 4000; i++) {
    host.read();
    const s = host.state!;
    if (s.phase === 'roll' && s.activePlayer === 1) break;
    if (host.myMove()) host.move();
    clock.advance(50);
  }
  const began = host.actions.at(-1)!.at;
  for (let t = 0; t < 1000; t += 100) {
    host.say({ type: 'resume', code: host.code!, token: host.token! });
    clock.advance(100);
  }
  host.read();
  const roll = host.actions.find((a) => a.at >= began && a.by === 'p2' && a.action.type === 'ROLL')!;
  assert.ok(roll, 'the stand-in rolled');
  assert.equal(roll.at - began, 400);
});

test('host handover: a dropped-out host passes the room on after 30 s (lobby)', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1);
  host.drop();
  clock.advance(29_000);
  guests[0].say({ type: 'start' });
  assert.deepEqual(guests[0].errors, ['notHost']);
  clock.advance(2_000);
  guests[0].read();
  assert.equal(guests[0].room?.host, 'p2');
  guests[0].say({ type: 'addBot', difficulty: 'fox' });
  guests[0].say({ type: 'start' });
  assert.equal(guests[0].state?.phase, 'reveal', 'the new host can start');
});

test('host handover: none if the host comes back in time, none during a game', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1);
  const old = host.reconnect();
  void old;
  clock.advance(10_000);
  host.hello().say({ type: 'resume', code: host.code!, token: host.token! });
  clock.advance(40_000);
  host.read();
  assert.equal(host.room?.host, 'p1');
  host.say({ type: 'start' });
  host.drop();
  clock.advance(40_000);
  guests[0].read();
  assert.equal(guests[0].room?.host, 'p1', 'mid-game the host stays (nothing needs a host then)');
});

test('F09: a removed player cannot rejoin from the same address; others still can', () => {
  const { hub } = makeHub();
  const { host, guests } = room(hub, 1);
  host.say({ type: 'removeSeat', seat: 'p2' });
  const again = new Device(hub, 'web', guests[0].ip).hello().say({ type: 'join', code: host.code!, name: 'Other', avatar: 'cat' });
  assert.deepEqual(again.errors, ['removed']);
  const someoneElse = new Device(hub, 'web', '10.9.0.1').hello().say({ type: 'join', code: host.code!, avatar: 'cat' });
  assert.deepEqual(someoneElse.errors, []);
});

test('F09: a removal on one home Wi-Fi does not lock out the rest of the family there', () => {
  const { hub } = makeHub();
  const { host } = room(hub, 0);
  // two more devices at the host's home; the host removes one (a double join)
  const twice = new Device(hub, 'web', host.ip).hello().say({ type: 'join', code: host.code!, avatar: 'cat' });
  host.read();
  host.say({ type: 'removeSeat', seat: twice.seat! });
  const mum = new Device(hub, 'web', host.ip).hello().say({ type: 'join', code: host.code!, name: 'Mum', avatar: 'owl' });
  assert.deepEqual(mum.errors, [], 'the host is still here from that address');
});

test('F04: the same seat in a second window: the first is told "replaced" and let go', () => {
  const { hub } = makeHub();
  const { host } = room(hub, 1);
  const tab = new Device(hub, 'web', host.ip).hello();
  tab.say({ type: 'resume', code: host.code!, token: host.token! });
  host.read();
  assert.equal(host.ended, 'replaced');
  assert.equal(host.conn.closed, true);
  assert.equal(tab.seat, 'p1');
});

test('abuse: connections per address are capped; wrong codes count across connections', () => {
  const { hub } = makeHub({ connsPerAddress: 3 });
  const devices = Array.from({ length: 4 }, () => new Device(hub, 'web', '10.7.7.7'));
  assert.deepEqual(devices.map((d) => d.conn.closed), [false, false, false, true]);
  assert.deepEqual(devices[3].conn.inbox, [{ type: 'error', code: 'rate' }]);
  devices[0].drop();
  assert.equal(new Device(hub, 'web', '10.7.7.7').conn.closed, false, 'a slot frees up when one closes');

  const { hub: hub2 } = makeHub();
  const guessers = Array.from({ length: 3 }, () => new Device(hub2, 'web', '10.8.8.8').hello());
  for (let i = 0; i < 11; i++) guessers[i % 3].say({ type: 'join', code: String(100000 + i), avatar: 'cat' });
  assert.ok(guessers.some((g) => g.errors.includes('rate')), 'the 11th wrong code from one address is refused');
});

test('a finished game’s room closes 15 min after the end', () => {
  const { hub, clock } = makeHub({ idleMs: 24 * 60 * 60_000 });
  const { host, all } = room(hub, 1);
  host.say({ type: 'start' });
  playOut(clock, all);
  assert.equal(hub.roomCount, 1);
  clock.advance(14 * 60_000);
  hub.sweep();
  assert.equal(hub.roomCount, 1);
  clock.advance(2 * 60_000);
  hub.sweep();
  assert.equal(hub.roomCount, 0);
  host.read();
  assert.equal(host.ended, 'expired');
});

test('missed turns in a row: a warning at 2, the computer takes the seat at 3; a move resets the count', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1, { timer: 'quick' });
  const dadi = guests[0];
  host.say({ type: 'start' });
  clock.advance(4_100); // Small board reveal: 4 s
  // Dadi's device is awake (it pings): her turns that run out are counted
  const runUntil = (done: () => boolean, limitMs = 10 * 60_000) => run(clock, host, [dadi], done, limitMs);
  const missed = () => host.room?.seats.find((s) => s.id === 'p2')?.missed ?? 0;

  runUntil(() => missed() === 1);
  assert.equal(missed(), 1, 'one turn ran out (its roll and pick count once)');
  // Dadi plays her next turn herself: the count starts again
  runUntil(() => !!dadi.state && activePlayerSpec(dadi.state).id === 'p2' && dadi.state.phase === 'roll');
  dadi.say({ type: 'intent', action: { type: 'ROLL' } });
  host.read();
  dadi.read();
  assert.equal(missed(), 0, 'a move of her own resets it');

  runUntil(() => missed() === 2);
  assert.equal(dadi.room?.seats.find((s) => s.id === 'p2')?.missed, 2, 'Dadi sees the warning count');
  assert.equal(dadi.ended, null, 'still in the game at 2');
  runUntil(() => dadi.ended !== null);
  assert.equal(dadi.ended, 'idle', 'the third missed turn takes her seat');
  const p2 = host.room?.seats.find((s) => s.id === 'p2');
  assert.equal(p2?.online, false);
  // the computer finishes her seat: the game still ends
  runUntil(() => host.state?.phase === 'gameOver', 30 * 60_000);
  assert.equal(host.state?.phase, 'gameOver');
});

test('a break: nobody moves for up to 2 minutes, then 3-2-1 and a fresh turn clock; once per game; taker or host ends it', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1, { timer: 'quick' });
  const dadi = guests[0];
  host.say({ type: 'start' });
  clock.advance(4_100); // the reveal ends
  host.read();
  dadi.read();
  assert.equal(host.state?.phase, 'roll');
  const seq = host.seq;

  dadi.say({ type: 'break' });
  host.read();
  assert.equal(host.room?.pause?.by, 'p2');
  host.say({ type: 'intent', action: { type: 'ROLL' } }); // dropped while on a break
  clock.advance(110_000); // far past Quick's 20 s: no stand-in either
  host.read();
  assert.equal(host.seq, seq, 'nothing moved during the break');

  clock.advance(10_500); // 2 minutes up: the 3-2-1 starts
  host.read();
  assert.ok(host.room?.pause?.resumeAt, 'counting in');
  clock.advance(3_100);
  host.read();
  assert.equal(host.room?.pause, undefined, 'play goes on');
  clock.advance(19_000); // a whole Quick turn again from the restart
  host.read();
  assert.equal(host.seq, seq, 'the mover got a fresh clock');
  host.say({ type: 'intent', action: { type: 'ROLL' } });
  host.read();
  assert.equal(host.seq, seq + 1);

  dadi.say({ type: 'break' });
  dadi.read();
  assert.deepEqual(dadi.errors, ['bad'], 'one break each per game');

  host.say({ type: 'break' });
  dadi.say({ type: 'endBreak' });
  dadi.read();
  assert.deepEqual(dadi.errors, ['bad', 'notHost'], 'only its taker or the host ends it');
  host.say({ type: 'endBreak' });
  clock.advance(3_100);
  host.read();
  assert.equal(host.room?.pause, undefined);
});

test('step away: the computer plays their turns at its pace, never counted as missed; a move brings them back', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1, { timer: 'relaxed' });
  const dadi = guests[0];
  host.say({ type: 'start' });
  clock.advance(4_100);
  dadi.say({ type: 'away', away: true });
  host.read();
  assert.equal(host.room?.seats.find((s) => s.id === 'p2')?.away, true);
  // the host plays; Dadi's turns go by at computer pace, far under Relaxed's minute
  const t0 = clock.now();
  for (let i = 0; i < 400 && clock.now() - t0 < 4 * 60_000; i++) {
    clock.advance(250);
    host.read();
    if (host.state && activePlayerSpec(host.state).id === 'p1') {
      if (host.state.phase === 'roll') host.say({ type: 'intent', action: { type: 'ROLL' } });
      else if (host.state.phase === 'pick') {
        const peg = host.state.pegs.find((p) => p.state === 'hidden');
        if (peg) host.say({ type: 'intent', action: { type: 'PICK', pegIndex: peg.index } });
      }
    }
    const covered = host.actions.filter((x) => x.by === 'p2').length >= 2;
    if (covered && host.state && activePlayerSpec(host.state).id === 'p2' && host.state.phase === 'roll') break;
  }
  const stood = host.actions.filter((a) => a.by === 'p2');
  assert.ok(stood.length > 0 && stood.every((a) => a.standIn), 'the computer played for Dadi');
  assert.ok(clock.now() - t0 < 60_000, 'at computer pace, not after the turn clock');
  assert.equal(host.room?.seats.find((s) => s.id === 'p2')?.missed, undefined, 'never counted as missed');
  dadi.read();
  dadi.say({ type: 'intent', action: { type: 'ROLL' } });
  host.read();
  assert.equal(host.room?.seats.find((s) => s.id === 'p2')?.away, undefined, 'a move of her own: she is back');
  assert.equal(host.actions.at(-1)?.by, 'p2');
  assert.equal(host.actions.at(-1)?.standIn, undefined);
});

test('reactions: passed on to the others only, preset ids only, one per 1.5 s per person on the server', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 2);
  const [dadi, ravi] = guests;
  const reacts = (d: Device) => d.messages.filter((m) => m.type === 'react');
  dadi.say({ type: 'react', id: 'party' });
  dadi.say({ type: 'react', id: 'gg' }); // too soon: dropped
  for (const d of [host, dadi, ravi]) d.read();
  assert.deepEqual(reacts(host), [{ type: 'react', seat: 'p2', id: 'party' }]);
  assert.deepEqual(reacts(ravi), [{ type: 'react', seat: 'p2', id: 'party' }]);
  assert.equal(reacts(dadi).length, 0, 'never echoed to its sender');
  clock.advance(1_500); // #15: the app waits 2 s; jitter can bring it in sooner
  dadi.say({ type: 'react', id: 'gg' });
  host.read();
  assert.equal(reacts(host).length, 2);
  dadi.say({ type: 'react', id: 'you are bad' } as never); // not a preset: refused by the parser
  host.read();
  assert.equal(reacts(host).length, 2, 'only preset ids get through');
});

/* ------------------------------------------------ audit fixes (Nov 10) */

const seatOf = (d: Device, id: string) => d.room?.seats.find((s) => s.id === id);

test('#1: a missed turn counts once per sitting, however many bonus picks the stand-in makes', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1, { timer: 'quick' });
  const dadi = guests[0];
  host.say({ type: 'start' });
  let picks = 0; // stand-in picks for Dadi in this sitting
  let bonus = false;
  let seen = 0;
  run(
    clock,
    host,
    [dadi],
    () => {
      for (; seen < host.actions.length; seen++) {
        const a = host.actions[seen];
        if (a.by === 'p1') picks = 0;
        if (a.by === 'p2' && a.standIn && a.action.type === 'PICK' && ++picks >= 2) bonus = true;
      }
      assert.ok((seatOf(host, 'p2')?.missed ?? 0) <= 1, `missed ${seatOf(host, 'p2')?.missed} in one sitting`);
      // a new sitting of hers: she rolls herself (the count starts again), the pick runs out
      const lastBy = [...host.actions].reverse().find((a) => a.by)?.by;
      if (dadi.myMove() && dadi.state!.phase === 'roll' && lastBy !== 'p2') dadi.move();
      return (bonus && picks === 0) || dadi.ended !== null || host.state?.phase === 'gameOver';
    },
    30 * 60_000,
  );
  assert.ok(bonus, 'the stand-in had a bonus turn (else this test proves nothing)');
  assert.equal(dadi.ended, null);
  assert.equal(seatOf(host, 'p2')?.missed, 1);
});

test('#2: stepping away and back over and over does not hold the reveal face up', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1);
  host.say({ type: 'start' });
  for (let i = 0; i < 10; i++) {
    guests[0].say({ type: 'away', away: i % 2 === 0 });
    clock.advance(500);
  }
  host.read();
  assert.equal(host.state?.phase, 'roll', 'the 4 s reveal ended on time');
});

test('#3: a device gone quiet (a locked phone) is played for, but its turns are not counted', () => {
  const { hub, clock } = makeHub();
  for (const pings of [false, true]) {
    const { host } = room(hub, 1, { timer: 'quick' });
    host.say({ type: 'start' });
    clock.advance(4_100);
    if (pings) {
      clock.advance(10_000);
      host.say({ type: 'ping', t: 1 });
    }
    clock.advance(pings ? 11_000 : 21_000);
    host.read();
    assert.deepEqual([host.actions.at(-1)?.by, host.actions.at(-1)?.standIn], ['p1', true]);
    assert.equal(seatOf(host, 'p1')?.missed, pings ? 1 : undefined, pings ? 'heard from: counted' : 'silent: not counted');
  }
});

test('#4: back after everyone dropped: the mover gets a whole turn, and dropping again buys no time', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1, { timer: 'quick' });
  const dadi = guests[0];
  host.say({ type: 'start' });
  clock.advance(4_100);
  dadi.read();
  host.drop();
  dadi.drop();
  clock.advance(5 * 60_000);
  host.reconnect();
  host.hello().say({ type: 'resume', code: host.code!, token: host.token! });
  const seq = host.seq;
  clock.advance(19_000);
  host.read();
  assert.equal(host.seq, seq, 'a whole Quick turn from coming back');
  assert.equal(seatOf(host, 'p1')?.missed, undefined);
  // Dadi is back; Maya drops and comes back at once: her clock runs on
  dadi.reconnect();
  dadi.hello().say({ type: 'resume', code: host.code!, token: dadi.token! });
  host.drop();
  host.reconnect();
  host.hello().say({ type: 'resume', code: host.code!, token: host.token! });
  clock.advance(1_500);
  host.read();
  assert.deepEqual([host.actions.at(-1)?.by, host.actions.at(-1)?.standIn], ['p1', true]);
});

test('#5: a break taken on a result holds it: nothing moves until play goes on', () => {
  const { hub, clock } = makeHub();
  const { host } = room(hub, 1, { timer: 'quick' });
  host.say({ type: 'start' });
  clock.advance(4_100);
  host.read();
  host.move().move();
  assert.equal(host.state?.phase, 'result');
  host.say({ type: 'break' });
  const seq = host.seq;
  clock.advance(60_000);
  host.read();
  assert.equal(host.seq, seq, 'the result stayed showing');
  host.say({ type: 'endBreak' });
  clock.advance(3_100);
  host.read();
  assert.equal(host.room?.pause, undefined);
  clock.advance(3_000);
  host.read();
  assert.ok(host.seq > seq, 'and then finished');
});

test('#8: after a roll that ran out, the pick follows at computer pace', () => {
  const { hub, clock } = makeHub();
  const { host } = room(hub, 1, { timer: 'quick' });
  host.say({ type: 'start' });
  clock.advance(4_100);
  clock.advance(20_500);
  host.read();
  const roll = host.actions.at(-1)!;
  assert.deepEqual([roll.by, roll.standIn, roll.action.type], ['p1', true, 'ROLL']);
  clock.advance(3_000);
  host.read();
  const pick = host.actions.find((a) => a.seq > roll.seq && a.action.type === 'PICK');
  assert.ok(pick && pick.standIn && pick.at - roll.at < 3_000, 'not another 20 s');
});

test('#10: a seat left mid-game is free again once the game is over', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 2, { maxSeats: 3 });
  host.say({ type: 'start' });
  guests[1].say({ type: 'leave' });
  playOut(clock, [host, guests[0]]);
  host.read();
  assert.equal(host.room?.status, 'over');
  assert.deepEqual(host.room?.seats.map((s) => s.id), ['p1', 'p2']);
  const back = new Device(hub, 'web', guests[1].ip).hello().say({ type: 'join', code: host.code!, avatar: 'cat' });
  assert.deepEqual(back.errors, [], 'not "room full"');
  assert.equal(back.seat, 'p3');
});

test('#13: a stepped-away player’s late tap (the computer just rolled) changes nothing', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1);
  const dadi = guests[0];
  host.say({ type: 'start' });
  dadi.say({ type: 'away', away: true });
  for (let i = 0; i < 4000 && !(host.state?.phase === 'pick' && activePlayerSpec(host.state).id === 'p2'); i++) {
    if (host.myMove()) host.move();
    clock.advance(50);
    host.read();
  }
  assert.equal(host.state?.phase, 'pick');
  dadi.read();
  dadi.say({ type: 'intent', action: { type: 'ROLL' } });
  clock.advance(3_000);
  host.read();
  assert.ok(host.actions.some((a) => a.by === 'p2' && a.standIn && a.action.type === 'PICK'), 'the stand-in picked');
  assert.equal(seatOf(host, 'p2')?.away, true, 'still away');
  assert.equal(seatOf(host, 'p2')?.missed, undefined, 'never counted');
});

test('#14: the idle limit reached on the pick that ends the game: they see the result, not a removal', () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1, { timer: 'quick', kidMode: true });
  const dadi = guests[0];
  const theRoom = (hub as unknown as { rooms: Map<string, Room> }).rooms.get(host.code!)!;
  const hidden = () => dadi.state!.pegs.filter((p) => p.state === 'hidden').length;
  let found = false;
  for (let game = 0; game < 10 && !found; game++) {
    host.say({ type: game ? 'rematch' : 'start' });
    // both play, until Dadi is to roll for the last peg (or the host took it)
    for (let i = 0; i < 40_000 && !found && host.state?.phase !== 'gameOver'; i++) {
      clock.advance(50);
      host.read();
      dadi.read();
      if (host.myMove()) host.move();
      if (dadi.myMove()) {
        if (dadi.state!.phase === 'roll' && hidden() === 1) found = true;
        else dadi.move();
      }
    }
  }
  assert.ok(found, 'Dadi had the last peg in one of the games');
  dadi.move(); // her own roll; the pick then runs out with two misses already
  theRoom.seats.find((s) => s.id === 'p2')!.missed = MISSED_LIMIT - 1;
  run(clock, host, [dadi], () => dadi.state?.phase === 'gameOver', 60_000);
  assert.equal(dadi.state?.phase, 'gameOver');
  assert.equal(dadi.ended, null, 'not removed');
});

test("I'm back on your own turn restarts the clock once per turn, not every toggle", () => {
  const { hub, clock } = makeHub();
  const { host, guests } = room(hub, 1, { timer: 'quick' });
  const dadi = guests[0];
  host.say({ type: 'start' });
  clock.advance(4_100);
  host.read();
  // whoever moves first toggles away and back, again and again
  const mover = host.myMove() ? host : dadi;
  const seq = host.seq;
  mover.say({ type: 'away', away: true });
  mover.say({ type: 'away', away: false }); // a fresh 20 s
  for (let i = 0; i < 6; i++) {
    clock.advance(5_000);
    mover.say({ type: 'away', away: true });
    mover.say({ type: 'away', away: false }); // no more fresh clocks
  }
  host.read();
  assert.ok(host.seq > seq, 'the computer moved within the turn time: toggling cannot stall the game');
});
