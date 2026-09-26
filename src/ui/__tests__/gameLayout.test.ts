import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BOARD_SIDE_MARGIN, chromeScaleFor, tableLayout, type TableInput } from '../gameLayout';

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

test('phones in portrait keep the stacked layout and a disc as wide as the tray margin allows', () => {
  // width, height, status bar, home indicator, disc (v1.0 had 360 / 377 / 412:
  // 96% of the width, which left the disc 7.5-9 pt from the edge)
  const phones: [number, number, number, number, number][] = [
    [375, 667, 20, 0, 351],
    [393, 852, 59, 34, 369],
    [430, 932, 59, 34, 406],
  ];
  for (const [w, h, top, bottom, disc] of phones) {
    const L = at(w, h, { insets: { top, bottom, left: 0, right: 0 } });
    assert.equal(L.mode, 'stacked', `${w}x${h}`);
    assert.equal(L.width, disc, `${w}x${h}`);
  }
});

test('the stacked disc never sits closer to the edge than the trays (A22)', () => {
  assert.equal(BOARD_SIDE_MARGIN, 12);
  // 375 pt phone: 96% would be 360 pt, 7.5 pt a side; the margin caps it at 351
  const L = at(375, 667, { insets: { top: 20, bottom: 0, left: 0, right: 0 } });
  assert.equal(L.mode, 'stacked');
  assert.equal(L.width, 375 - 2 * BOARD_SIDE_MARGIN);
  // the margin is measured inside the safe area
  const inset = at(375, 812, { insets: { top: 44, bottom: 34, left: 10, right: 10 } });
  assert.ok(inset.width <= 375 - 20 - 2 * BOARD_SIDE_MARGIN, `${inset.width}`);
  // wide windows are still held by the 96% cap, not the margin
  const pad = at(834, 1194, { measuredBox: 2000 });
  assert.equal(pad.mode, 'stacked');
  assert.equal(pad.width, Math.floor(834 * 0.96));
  for (let w = 320; w <= 1024; w += 7) {
    const P = at(w, w * 2.2, { measuredBox: w * 3 });
    if (P.mode !== 'stacked') continue;
    assert.ok((w - P.width) / 2 >= BOARD_SIDE_MARGIN, `${w}: ${P.width}`);
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
