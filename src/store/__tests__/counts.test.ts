// Copied from the ship-ios-app skill (app-counts/test); the server-side tests stay there.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { COUNTS_KEY, createCounts, localDay } from '../counts';








function device(start = Date.parse('2026-11-10T10:00:00')) {
  const mem = new Map<string, string>();
  const bodies: any[] = [];
  let clock = start;
  let status = 200;
  const counts = () =>
    createCounts({
      app: 'color-catch',
      url: 'https://x/c',
      storage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => void mem.set(k, v) },
      version: '1.4.0',
      platform: 'ios-pad',
      lang: 'en',
      installedAt: async () => Date.parse('2026-11-03T09:00:00'),
      now: () => clock,
      fetch: (async (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(init.body as string));
        if (status === 0) throw new Error('offline');
        return { ok: status < 300, status } as Response;
      }) as typeof fetch,
    });
  return {
    mem, bodies, counts,
    tick: (ms: number) => (clock += ms),
    setStatus: (s: number) => (status = s),
  };
}

test('first post of the day carries first + age; later ones only counts', async () => {
  const d = device();
  const c = d.counts();
  c.add({ 'game.classic': 1 });
  await c.flush();
  c.add({ 'game.classic': 2 });
  await c.flush();
  assert.deepEqual(d.bodies[0].days, [
    { day: '2026-11-10', n: { 'game.classic': 1 }, first: { v: '1.4.0', platform: 'ios-pad', lang: 'en', age: 7 } },
  ]);
  assert.deepEqual(d.bodies[1].days, [{ day: '2026-11-10', n: { 'game.classic': 2 } }]);
  await c.flush(); // nothing new: no post
  assert.equal(d.bodies.length, 2);
});

test('offline counts wait, survive a restart, and go out with the next day', async () => {
  const d = device();
  d.setStatus(0);
  const c = d.counts();
  c.add({ g: 1 });
  await c.flush();
  d.tick(864e5);
  d.setStatus(200);
  const again = d.counts(); // app restarted the next day
  await again.flush();
  const last = d.bodies.at(-1).days;
  assert.deepEqual(last.map((x: any) => [x.day, x.n, x.first?.age]), [
    ['2026-11-10', { g: 1 }, 7],
    ['2026-11-11', {}, 8],
  ]);
});

test('a 400 drops what was sent; a 500 keeps it', async () => {
  const d = device();
  const c = d.counts();
  c.add({ g: 1 });
  d.setStatus(500);
  await c.flush();
  d.setStatus(400);
  await c.flush();
  d.setStatus(200);
  await c.flush();
  assert.equal(d.bodies.length, 2);
});

test('foreground time becomes secs, capped per stretch', async () => {
  const d = device();
  const c = d.counts();
  c.foreground(true);
  d.tick(90_000);
  c.foreground(false);
  await new Promise((r) => setTimeout(r, 0));
  await c.flush();
  const all = d.bodies.flatMap((b) => b.days.map((x: any) => x.n.secs ?? 0));
  assert.equal(all.reduce((a: number, b: number) => a + b, 0), 90);
  c.foreground(true);
  d.tick(10 * 3600_000);
  c.foreground(false);
  await new Promise((r) => setTimeout(r, 0));
  await c.flush();
  assert.equal(d.bodies.at(-1).days.at(-1).n.secs, 3 * 3600);
});

test('unknown install date sends age -1; bad keys are dropped', async () => {
  const d = device();
  d.mem.set(COUNTS_KEY, JSON.stringify({ install: null, days: {} }));
  const c = d.counts();
  c.add({ 'Bad Key': 1, ok: 1, neg: -2 });
  await c.flush();
  assert.equal(d.bodies[0].days[0].first.age, -1);
  assert.deepEqual(d.bodies[0].days[0].n, { ok: 1 });
});

test('localDay uses the device time zone', () => {
  assert.equal(localDay(new Date(2026, 0, 5, 23, 59).getTime()), '2026-01-05');
});
