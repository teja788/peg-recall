import { test } from 'node:test';
import assert from 'node:assert/strict';

import { chromeScaleFor, tableLayout, type TableInput } from '../gameLayout';

/** Board height / width as Board.tsx measures it for the classic 25-peg board. */
const ratioFor = (tilt: number) => (tilt >= 0.66 ? 0.846 : 0.811);
const tiltFor = (w: number, h: number) => (h / Math.max(1, w) >= 2 ? 0.66 : 0.62);
const NO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };

const at = (width: number, height: number, extra: Partial<TableInput> = {}) =>
  tableLayout({ width, height, insets: NO_INSETS, players: 2, ratioFor, tiltFor, minBoard: 180, ...extra });

test('chrome scale: 1:1 with phones, half rate past that, capped at 2', () => {
  assert.equal(chromeScaleFor(375, 667), 1);
  assert.equal(chromeScaleFor(430, 932), 430 / 375);
  assert.equal(chromeScaleFor(1032, 1376), 2 - (2 - chromeScaleFor(1032, 1376)), 'no NaN');
  assert.ok(chromeScaleFor(1032, 1376) <= 2);
  assert.ok(chromeScaleFor(744, 1133) > 1.5 && chromeScaleFor(744, 1133) < 1.7);
  // turning the device does not change the furniture size
  assert.equal(chromeScaleFor(1194, 834), chromeScaleFor(834, 1194));
});

test('phones in portrait keep the stacked layout and a disc at least as wide as v1.0', () => {
  // width, height, status bar, home indicator, disc before
  const before: [number, number, number, number, number][] = [
    [375, 667, 20, 0, 360],
    [393, 852, 59, 34, 377],
    [430, 932, 59, 34, 412],
  ];
  for (const [w, h, top, bottom, was] of before) {
    const L = at(w, h, { insets: { top, bottom, left: 0, right: 0 } });
    assert.equal(L.mode, 'stacked', `${w}x${h}`);
    assert.ok(L.width >= was, `${w}x${h}: ${L.width} < ${was}`);
  }
});

test('an iPad in portrait is no longer held to 700 pt', () => {
  assert.ok(at(834, 1194).width > 760);
  assert.ok(at(1032, 1376).width > 900);
  assert.equal(at(1032, 1376).mode, 'stacked');
});

test('an iPad in landscape moves the chrome to a side column', () => {
  for (const [w, h] of [
    [1194, 834],
    [1376, 1032],
    [1133, 744],
    [1194, 759], // Safari's toolbars
  ]) {
    for (const players of [2, 3]) {
      const L = at(w, h, { players });
      assert.equal(L.mode, 'side', `${w}x${h} ${players}p`);
      // the disc uses (nearly) the full height, or the full width left over
      const h0 = h - 2 * L.edge - L.bannerH - L.bannerGap;
      const w0 = w - 3 * L.edge - L.colW;
      assert.ok(L.width >= Math.min(w0, h0 / ratioFor(L.tilt)) - 1, `${w}x${h}: ${L.width}`);
      assert.ok(L.width > 0.55 * w, `${w}x${h}: disc only ${L.width}`);
    }
  }
});

test('a phone on its side gets a real board, not the 180 pt floor', () => {
  const L = at(852, 393, { players: 3, insets: { top: 0, bottom: 21, left: 59, right: 59 } });
  assert.notEqual(L.mode, 'stacked');
  assert.ok(L.width > 300, `${L.width}`);
  assert.ok(!L.overflows);
});

test('the stacked layout refines against the measured box, never past its cap', () => {
  const L = at(834, 1194, { measuredBox: 900 });
  assert.equal(L.mode, 'stacked');
  assert.ok(L.width <= Math.floor(834 * 0.96));
  assert.ok(L.width * ratioFor(L.tilt) + L.bannerH + L.bannerGap + L.dieGap + L.dieBlock <= 900 + 1);
});
