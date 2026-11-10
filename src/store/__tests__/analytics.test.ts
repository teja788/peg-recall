import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../../engine';
import { count, gameKeys, setCounts } from '../analytics';
import { DEFAULT_SETTINGS } from '../settingsModel';
import { configFor } from '../game';

test('gameKeys: how a game was played, never who', () => {
  const vsAi = createGame(configFor('ai', DEFAULT_SETTINGS, 1));
  assert.deepEqual(gameKeys(vsAi, { daily: true }), {
    game: 1,
    'game.ai': 1,
    [`board.${vsAi.config.boardSize}`]: 1,
    'players.2': 1,
    daily: 1,
  });
  const local = createGame(configFor('3p', DEFAULT_SETTINGS, 1));
  assert.equal(gameKeys(local)['game.local'], 1);
  assert.equal(gameKeys(local, { online: true })['game.online'], 1);
  assert.equal(gameKeys(local)['players.3'], 1);
});

test('count is a no-op until a counter is set, and never throws', () => {
  count({ game: 1 });
  const seen: Record<string, number>[] = [];
  setCounts({ add: (n) => void seen.push(n), flush: async () => {}, foreground: () => {} });
  count({ share: 1 });
  setCounts({ add: () => { throw new Error('x'); }, flush: async () => {}, foreground: () => {} });
  count({ share: 1 });
  setCounts(null);
  assert.deepEqual(seen, [{ share: 1 }]);
});
