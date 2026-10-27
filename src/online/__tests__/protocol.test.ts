import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_MESSAGE_CHARS,
  formatCode,
  normalizeCode,
  parseClientMessage,
  parseServerMessage,
  type RoomSettings,
} from '../protocol';

const SETTINGS: RoomSettings = { board: 'classic', bonusTurnOnMatch: true, kidMode: false, maxSeats: 4, timer: 'relaxed' };
const send = (m: unknown) => parseClientMessage(JSON.stringify(m));

test('room codes: six digits, typed any reasonable way', () => {
  assert.equal(normalizeCode('482913'), '482913');
  assert.equal(normalizeCode('482 913'), '482913');
  assert.equal(normalizeCode(' 482-913 '), '482913');
  for (const bad of ['48291', '4829134', 'ABC123', '', '٤٨٢٩١٣', 482913, null]) {
    assert.equal(normalizeCode(bad), null, String(bad));
  }
  assert.equal(formatCode('482913'), '482 913');
});

test('every client message shape is accepted exactly', () => {
  assert.deepEqual(send({ type: 'hello', protocol: 1, rules: 1, app: 'web', appVersion: '1.3.0' }), {
    type: 'hello',
    protocol: 1,
    rules: 1,
    app: 'web',
    appVersion: '1.3.0',
  });
  assert.deepEqual(send({ type: 'create', settings: SETTINGS, name: 'Maya', avatar: 'fox', unlocked: false }), {
    type: 'create',
    settings: SETTINGS,
    name: 'Maya',
    avatar: 'fox',
    unlocked: false,
  });
  assert.deepEqual(send({ type: 'join', code: '482 913', avatar: 'owl' }), { type: 'join', code: '482913', avatar: 'owl' });
  assert.deepEqual(send({ type: 'resume', code: '482913', token: 'a'.repeat(32) }), {
    type: 'resume',
    code: '482913',
    token: 'a'.repeat(32),
  });
  assert.deepEqual(send({ type: 'addBot', difficulty: 'owl' }), { type: 'addBot', difficulty: 'owl' });
  assert.deepEqual(send({ type: 'removeSeat', seat: 'p3' }), { type: 'removeSeat', seat: 'p3' });
  for (const type of ['start', 'rematch', 'leave']) assert.deepEqual(send({ type }), { type });
  assert.deepEqual(send({ type: 'intent', action: { type: 'ROLL' } }), { type: 'intent', action: { type: 'ROLL' } });
  assert.deepEqual(send({ type: 'intent', action: { type: 'PICK', pegIndex: 39 } }), {
    type: 'intent',
    action: { type: 'PICK', pegIndex: 39 },
  });
  assert.deepEqual(send({ type: 'ping', t: 123.5 }), { type: 'ping', t: 123.5 });
});

test('extra fields are dropped: only the known shape gets through', () => {
  const m = send({ type: 'join', code: '482913', avatar: 'cat', admin: true, __proto__: { x: 1 } });
  assert.deepEqual(m, { type: 'join', code: '482913', avatar: 'cat' });
  const create = send({ type: 'create', settings: { ...SETTINGS, secret: 1 }, avatar: 'fox', unlocked: true });
  assert.deepEqual(create && create.type === 'create' ? create.settings : null, SETTINGS);
});

test('names are cleaned like the app cleans them; an empty one means "no name"', () => {
  const m = send({ type: 'join', code: '482913', avatar: 'fox', name: '  ‮Maya\u0000 \n Rose  ' });
  assert.deepEqual(m, { type: 'join', code: '482913', avatar: 'fox', name: 'Maya Rose' });
  const long = send({ type: 'join', code: '482913', avatar: 'fox', name: 'A'.repeat(40) });
  assert.equal(long && long.type === 'join' ? long.name : '', 'A'.repeat(12));
  assert.deepEqual(send({ type: 'join', code: '482913', avatar: 'fox', name: ' ​ ' }), {
    type: 'join',
    code: '482913',
    avatar: 'fox',
  });
  assert.equal(send({ type: 'join', code: '482913', avatar: 'fox', name: 42 }), null);
});

test('a name with a rude word is dropped, not refused: that player shows as their animal', () => {
  assert.deepEqual(send({ type: 'join', code: '482913', avatar: 'fox', name: 'B1g D!ck' }), {
    type: 'join',
    code: '482913',
    avatar: 'fox',
  });
  const create = send({ type: 'create', settings: SETTINGS, name: 'sh1t', avatar: 'owl', unlocked: false });
  assert.ok(create && create.type === 'create' && create.name === undefined);
  assert.equal(send({ type: 'join', code: '482913', avatar: 'fox', name: 'Cassandra' })?.type, 'join');
});

test('anything else is refused', () => {
  const bad: unknown[] = [
    { type: 'hello', protocol: 1, rules: 1, app: 'android', appVersion: '1' },
    { type: 'hello', protocol: '1', rules: 1, app: 'ios', appVersion: '1' },
    { type: 'create', settings: { ...SETTINGS, maxSeats: 5 }, avatar: 'fox', unlocked: false },
    { type: 'create', settings: { ...SETTINGS, board: 'giant' }, avatar: 'fox', unlocked: false },
    { type: 'create', settings: SETTINGS, avatar: 'dragon', unlocked: false },
    { type: 'create', settings: SETTINGS, avatar: 'fox' },
    { type: 'join', code: '12345', avatar: 'fox' },
    { type: 'resume', code: '482913', token: 'not-a-token' },
    { type: 'addBot', difficulty: 'tiger' },
    { type: 'removeSeat', seat: 'p5' },
    { type: 'intent', action: { type: 'PICK', pegIndex: 40 } },
    { type: 'intent', action: { type: 'PICK', pegIndex: -1 } },
    { type: 'intent', action: { type: 'PICK', pegIndex: 1.5 } },
    { type: 'intent', action: { type: 'RESTART' } },
    { type: 'intent', action: { type: 'REVEAL_DONE' } },
    { type: 'ping', t: 'now' },
    { type: 'chat', text: 'hi' },
    { notype: true },
    ['hello'],
  ];
  for (const m of bad) assert.equal(send(m), null, JSON.stringify(m));
  assert.equal(parseClientMessage('{not json'), null);
  assert.equal(parseClientMessage(42), null);
  const huge = JSON.stringify({ type: 'ping', t: 1, pad: 'x'.repeat(MAX_MESSAGE_CHARS) });
  assert.equal(parseClientMessage(huge), null, 'oversized messages are dropped unread');
});

test('server messages: the envelope the device acts on is checked', () => {
  assert.ok(parseServerMessage(JSON.stringify({ type: 'welcome', serverTime: 1 })));
  assert.ok(parseServerMessage(JSON.stringify({ type: 'action', seq: 3, action: { type: 'ROLL' }, by: 'p1', at: 5, hash: 'abcd1234' })));
  assert.ok(parseServerMessage(JSON.stringify({ type: 'error', code: 'full' })));
  assert.ok(parseServerMessage(JSON.stringify({ type: 'ended', reason: 'expired' })));
  assert.equal(parseServerMessage(JSON.stringify({ type: 'error' })), null);
  assert.equal(parseServerMessage(JSON.stringify({ type: 'action', seq: 'x' })), null);
  assert.equal(parseServerMessage(JSON.stringify({ type: 'started', config: {}, seq: 1, at: 0 })), null);
  assert.equal(parseServerMessage('nope'), null);
});
