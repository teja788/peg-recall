/**
 * Color Catch — the SVG node budget the art layer's docblocks promise.
 *
 * perspectiveModel.ts is pure TypeScript precisely so the numbers it draws can
 * be counted without a renderer. The board is re-rendered on every pick and
 * every peg animates, so what matters is the *total* element count of a board
 * at rest: one `<Svg>` surface per doll plus the board's own, each surface's
 * prims, and each surface's `<Defs>` gradients (which react-native-svg turns
 * into brush objects per SvgView).
 *
 *   npx tsx --test src/ui/art/__tests__/nodeBudget.test.ts
 *
 * Budgets are the counts measured after the D2/D3 passes, with ~10% headroom.
 * A failure here is not necessarily a bug — it means the art got heavier and
 * somebody should have decided to spend that.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PEG_COLORS, type PegColor } from '../../../engine/types';
import { roundLayout } from '../../../layout/roundLayout';
import { PEG_GLYPH_ON, PEG_HEX, shade } from '../palette';
import {
  WOOD_DIE_ASPECT,
  holeSizeFor,
  pegDollScene,
  pegWidthFor,
  perspectiveBoardScene,
  woodDieScene,
  type Scene,
} from '../perspectiveModel';

/** Elements one `Scene` costs: its prims, plus one per gradient it defines. */
const nodes = (s: Scene) => s.prims.length + s.grads.length;

/* --------------------------------------------------------------- one doll */

test('a peg doll stays inside its 10-prim budget', () => {
  const down = pegDollScene(40, null, false);
  const up = pegDollScene(40, 'blue', true);
  const glyph = pegDollScene(40, 'blue', true, true);

  assert.equal(down.prims.length, 5, 'face-down: 2 shadows, body, dome, highlight');
  assert.equal(up.prims.length, 6, 'face-up adds the coloured band');
  assert.equal(glyph.prims.length, 7, 'the shape glyph is the 7th');

  // The band gradient is emitted only when there is a band to paint.
  assert.equal(down.grads.length, 2, 'face-down needs body + cap only');
  assert.equal(up.grads.length, 3, 'face-up adds the band gradient');
  assert.equal(glyph.grads.length, 3, 'a glyph is a flat fill, not a gradient');
});

test('a doll box is as tall as PEG_DOLL_ASPECT says', () => {
  const s = pegDollScene(40, 'green', true);
  assert.equal(s.w, 40);
  assert.equal(s.h, 40 * 2.35);
});

/* ---------------------------------------------------------------- the die */

test('the die stays inside its 15-prim budget', () => {
  assert.equal(woodDieScene(96, null).prims.length, 9, 'un-rolled: block + the "?" cut');
  assert.equal(woodDieScene(96, 'red').prims.length, 14, 'rolled, no glyph');
  assert.equal(woodDieScene(96, 'red', true).prims.length, 15, 'rolled, with the glyph');
  assert.equal(woodDieScene(96, 'red', true).grads.length, 4);
});

test('WOOD_DIE_ASPECT is the box woodDieScene actually returns (B12)', () => {
  // Die.tsx sizes its container from this constant; if the two drift, the
  // tumble rotates about a point that is not the cube's centre.
  for (const size of [64, 96, 140]) {
    const s = woodDieScene(size, 'blue', true);
    assert.ok(
      Math.abs(s.h - size * WOOD_DIE_ASPECT) <= 0.01,
      `h ${s.h} != ${size} * ${WOOD_DIE_ASPECT}`,
    );
  }
  // The literal it replaced was 0.9, ~9% short.
  assert.ok(WOOD_DIE_ASPECT > 0.98 && WOOD_DIE_ASPECT < 0.99, String(WOOD_DIE_ASPECT));
});

test('the die top glyph is scaled uniformly, so a circle stays round (D4)', () => {
  for (const color of [null, 'red'] as const) {
    const s = woodDieScene(96, color, true);
    // Only the lettering: the side pips are circles/ellipses and *are* sheared
    // onto their faces on purpose, which is fine — a dot has no orientation.
    const glyphs = s.prims.filter((p) => p.t === 'path' && p.transform?.startsWith('matrix('));
    assert.ok(glyphs.length > 0, 'expected a glyph on the top face');
    for (const g of glyphs) {
      const [a, b, c, d] = g.transform!.slice(7).split(' ').map(Number);
      assert.equal(b, 0, 'no shear');
      assert.equal(c, 0, 'no shear');
      assert.equal(a, d, `non-uniform scale ${a} x ${d}`);
    }
  }
});

/* ------------------------------------------------------------- the boards */

/** Every react-native-svg element scene3d.tsx emits for one scene. */
const elements = (s: Scene) =>
  1 + // <Svg>
  (s.grads.length ? 1 : 0) + // <Defs>
  s.grads.length +
  s.grads.reduce((a, g) => a + g.stops.length, 0) + // <Stop>s
  s.prims.length;

/** What a board of `pegCount` pegs costs, at rest, after D2. */
function boardCost(pegCount: number, width = 560) {
  const layout = roundLayout(pegCount, width);
  const pegWidth = pegWidthFor(layout.spacing);
  const board = perspectiveBoardScene(width, layout.positions, holeSizeFor(pegWidth));
  // D2: one doll per peg, not two. Face-down is what a board sits at.
  const doll = pegDollScene(pegWidth, null, false);
  return {
    surfaces: 1 + pegCount,
    nodes: nodes(board) + pegCount * nodes(doll),
    elements: elements(board) + pegCount * elements(doll),
  };
}

test('board node counts match the docblocks and stay inside budget', () => {
  // Measured after D2 (one doll per peg, not two) with ~10% headroom. At rest,
  // 40 pegs: 41 Svg surfaces, 385 shapes+gradients, 762 react-native-svg
  // elements — down from 81 / 745 / 1,602 when every peg mounted both faces.
  const budget: Record<number, { surfaces: number; nodes: number; elements: number }> = {
    16: { surfaces: 18, nodes: 185, elements: 362 },
    25: { surfaces: 28, nodes: 274, elements: 540 },
    36: { surfaces: 40, nodes: 384, elements: 760 },
    40: { surfaces: 45, nodes: 424, elements: 838 },
  };
  for (const pegCount of [16, 25, 36, 40]) {
    const got = boardCost(pegCount);
    const cap = budget[pegCount];
    assert.ok(
      got.surfaces <= cap.surfaces,
      `${pegCount} pegs: ${got.surfaces} Svg surfaces > ${cap.surfaces}`,
    );
    assert.ok(got.nodes <= cap.nodes, `${pegCount} pegs: ${got.nodes} nodes > ${cap.nodes}`);
    assert.ok(
      got.elements <= cap.elements,
      `${pegCount} pegs: ${got.elements} elements > ${cap.elements}`,
    );
  }
});

test('the board itself is 17 fixed prims + a row guide per shell + 2 per hole', () => {
  const width = 560;
  for (const pegCount of [16, 25, 36, 40]) {
    const layout = roundLayout(pegCount, width);
    const pegWidth = pegWidthFor(layout.spacing);
    const board = perspectiveBoardScene(width, layout.positions, holeSizeFor(pegWidth));
    const shells = new Set(
      layout.positions
        .map((p) => Math.hypot(p.x, p.y))
        .filter((r) => r >= 1)
        .map((r) => Math.round(r / Math.max(1, width * 0.006))),
    ).size;
    // `shells` is an upper bound on the grooves the scene merges into one.
    assert.ok(
      board.prims.length <= 17 + shells + 2 * pegCount,
      `${pegCount}: ${board.prims.length} prims`,
    );
    assert.ok(board.prims.length >= 17 + 2 * pegCount, `${pegCount}: ${board.prims.length} prims`);
    assert.equal(board.grads.length, 5);
  }
});

/* ------------------------------------------------------- glyph contrast D1 */

/** WCAG 2.1 relative luminance of an #rrggbb colour. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * chan((n >> 16) & 0xff) + 0.7152 * chan((n >> 8) & 0xff) + 0.0722 * chan(n & 0xff)
  );
}

/** WCAG 2.1 contrast ratio, 1:1 to 21:1. */
function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('contrast() agrees with the two values WCAG pins down', () => {
  assert.ok(Math.abs(contrast('#FFFFFF', '#000000') - 21) < 1e-9);
  assert.ok(Math.abs(contrast('#777777', '#FFFFFF') - 4.478) < 0.005);
});

test('every peg glyph clears 3:1 on its own cap (D1)', () => {
  // The cap is a radial gradient: `shade(fill, +0.3)` at the lit centre through
  // `fill` to `shade(fill, -0.22)` at the rim (see pegDollScene). The glyph
  // sits over the middle of it, so all three have to pass.
  for (const color of PEG_COLORS as readonly PegColor[]) {
    const ink = PEG_GLYPH_ON[color];
    const fill = PEG_HEX[color];
    for (const [where, bg] of [
      ['flat fill', fill],
      ['lit stop', shade(fill, 0.3)],
      ['dark stop', shade(fill, -0.22)],
    ] as const) {
      const ratio = contrast(ink, bg);
      assert.ok(ratio >= 3, `${color} glyph on its ${where}: ${ratio.toFixed(2)}:1`);
    }
  }
});

test('light caps carry dark ink; the dark caps keep white (D1)', () => {
  for (const color of ['green', 'purple', 'yellow'] as const) {
    assert.notEqual(PEG_GLYPH_ON[color], '#FFFFFF', `${color} must not use white ink`);
  }
  // Red (5.66:1), violet (8.28:1) and blue (5.19:1) are dark enough for white;
  // a dark same-hue ink would fall to 2-3:1 on them.
  for (const color of ['red', 'violet', 'blue'] as const) {
    assert.equal(PEG_GLYPH_ON[color], '#FFFFFF', `${color} keeps white ink`);
  }
});
