/**
 * Color Catch — static preview of the 3/4-view board, peg dolls and wooden die.
 *
 *   npx tsx assets/source/build-peg-preview.ts
 *   open assets/source/preview-pegs.html
 *
 * Renders the very same `Scene`s the app draws (perspectiveModel.ts) as plain
 * SVG text, so the preview page cannot drift away from the components. Nothing
 * here is bundled into the app.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { roundLayout } from '../../src/layout/roundLayout';
import { PEG_COLORS } from '../../src/engine/types';
import type { PegColor } from '../../src/engine/types';
import { NEUTRAL } from '../../src/ui/art/palette';
import type { ArtTheme } from '../../src/ui/art/palette';
import {
  BOARD_Y_SCALE,
  PEG_DOLL_ASPECT,
  boardCentre,
  boardHeight,
  PEG_WIDTH_OF_SPACING,
  holeSizeFor,
  pegDollAnchor,
  pegDollScene,
  perspectiveBoardScene,
  projectHole,
  woodDieScene,
} from '../../src/ui/art/perspectiveModel';
import type { Grad, Prim, Scene } from '../../src/ui/art/perspectiveModel';

/* ------------------------------------------------------- scene -> svg text */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function attrs(o: Record<string, string | number | undefined>): string {
  return Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${typeof v === 'string' ? esc(v) : v}"`)
    .join('');
}

function gradSvg(g: Grad): string {
  const stops = g.stops
    .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`)
    .join('');
  return g.kind === 'radial'
    ? `<radialGradient id="${g.id}" cx="${g.cx}" cy="${g.cy}" r="${g.r}">${stops}</radialGradient>`
    : `<linearGradient id="${g.id}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${stops}</linearGradient>`;
}

function primSvg(p: Prim): string {
  const common = {
    fill: p.fill ?? 'none',
    stroke: p.stroke,
    'stroke-width': p.sw,
    opacity: p.opacity,
    transform: p.transform,
    'stroke-linecap': p.round ? 'round' : undefined,
    'stroke-linejoin': p.round ? 'round' : undefined,
  };
  switch (p.t) {
    case 'circle':
      return `<circle${attrs({ cx: p.cx, cy: p.cy, r: p.r, ...common })}/>`;
    case 'ellipse':
      return `<ellipse${attrs({ cx: p.cx, cy: p.cy, rx: p.rx, ry: p.ry, ...common })}/>`;
    case 'path':
      return `<path${attrs({ d: p.d, ...common })}/>`;
  }
}

/** Inline a scene at (x, y) of a larger canvas. */
function place(scene: Scene, x: number, y: number): { defs: string; body: string } {
  return {
    defs: scene.grads.map(gradSvg).join(''),
    body: `<g transform="translate(${x} ${y})">${scene.prims.map(primSvg).join('')}</g>`,
  };
}

/* --------------------------------------------------------------- the board */

/** Deterministic pseudo-random, so the preview is byte-stable between runs. */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SceneOpts {
  theme: ArtTheme;
  showShapes: boolean;
}

function boardScene(width: number, { theme, showShapes }: SceneOpts): { svg: string; h: number } {
  const PEGS = 25;
  const layout = roundLayout(PEGS, width);
  // A tilted board packs the rows together vertically, so the peg is drawn
  // narrower than its lattice cell: the wood has to show between the pegs.
  const pegW = layout.spacing * PEG_WIDTH_OF_SPACING;
  const holeSize = holeSizeFor(pegW);
  const yScale = BOARD_Y_SCALE;
  const c = boardCentre(width, yScale);
  const anchor = pegDollAnchor(pegW);

  // The back row sticks up above the board box; the canvas grows to fit it.
  const minY = Math.min(...layout.positions.map((p) => p.y)) * yScale;
  const top = Math.ceil(Math.max(0, anchor.y - (c.y + minY)));
  const boardH = boardHeight(width, yScale);
  const dieSize = width * 0.16;
  // Every gradient id on the page has to be unique: these SVGs share one HTML
  // document, and `url(#id)` resolves across the whole of it.
  const tag = `${theme}${showShapes ? 's' : ''}`;
  const die = woodDieScene(dieSize, 'sky', showShapes, theme, `bd${tag}`);
  const canvasH = top + boardH + die.h + width * 0.03;

  const defs: string[] = [];
  const body: string[] = [];

  const board = perspectiveBoardScene(width, layout.positions, holeSize, theme, yScale, undefined, tag);
  const bp = place(board, 0, top);
  defs.push(bp.defs);
  body.push(bp.body);

  // ~40% of the pegs face-up, spread across all six colours.
  const rnd = mulberry(7);
  const colors: PegColor[] = layout.positions.map(() => PEG_COLORS[Math.floor(rnd() * 6)]);
  const up: boolean[] = layout.positions.map(() => rnd() < 0.4);
  // A few already captured, so the empty holes in the board can be judged too.
  const gone = new Set([3, 11, 19]);

  // Back to front: a peg painted later overlaps the ones behind it.
  const order = [...layout.positions].sort((a, b) => a.y - b.y);
  for (const p of order) {
    if (gone.has(p.index)) continue;
    const q = projectHole(p.x, p.y, yScale);
    const peg = pegDollScene(pegW, colors[p.index], up[p.index], showShapes, theme, `x${tag}${p.index}`);
    const pp = place(peg, c.x + q.x - anchor.x, top + c.y + q.y - anchor.y);
    defs.push(pp.defs);
    body.push(pp.body);
  }

  const dp = place(die, (width - dieSize) / 2, top + boardH + width * 0.01);
  defs.push(dp.defs);
  body.push(dp.body);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.ceil(canvasH)}" ` +
    `viewBox="0 0 ${width} ${Math.ceil(canvasH)}">` +
    `<defs>${defs.join('')}</defs>${body.join('')}</svg>`;
  return { svg, h: canvasH };
}

/** A row of tray pegs, one per colour, plus a face-down peg for comparison. */
function trayRow(pegW: number, theme: ArtTheme): string {
  const gap = pegW * 1.5;
  const items: (PegColor | null)[] = [...PEG_COLORS, null];
  const w = gap * items.length;
  const h = pegW * PEG_DOLL_ASPECT + pegW * 0.1;
  const defs: string[] = [];
  const body: string[] = [];
  items.forEach((c, i) => {
    const s = pegDollScene(pegW, c, c !== null, false, theme, `t${theme}${i}`);
    const p = place(s, i * gap + (gap - pegW) / 2, 0);
    defs.push(p.defs);
    body.push(p.body);
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(w)}" height="${Math.ceil(h)}" ` +
    `viewBox="0 0 ${Math.ceil(w)} ${Math.ceil(h)}">` +
    `<defs>${defs.join('')}</defs>${body.join('')}</svg>`
  );
}

/** A row of dice: every colour plus the un-rolled one. */
function dieRow(size: number, theme: ArtTheme, showShapes: boolean): string {
  const gap = size * 1.15;
  const items: (PegColor | null)[] = [null, ...PEG_COLORS];
  const w = gap * items.length;
  const tag = `${theme}${showShapes ? 's' : ''}`;
  const one = woodDieScene(size, null, false, theme, `r${tag}0`);
  const parts = items.map((c, i) =>
    place(woodDieScene(size, c, showShapes, theme, `r${tag}${i}`), i * gap, 0),
  );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(w)}" height="${Math.ceil(one.h)}" ` +
    `viewBox="0 0 ${Math.ceil(w)} ${Math.ceil(one.h)}">` +
    `<defs>${parts.map((p) => p.defs).join('')}</defs>${parts.map((p) => p.body).join('')}</svg>`
  );
}

/* ---------------------------------------------------------------- the page */

const W = 360;
const light = boardScene(W, { theme: 'light', showShapes: false });
const lightShapes = boardScene(W, { theme: 'light', showShapes: true });
const dark = boardScene(W, { theme: 'dark', showShapes: false });

const html = `<!doctype html>
<meta charset="utf-8">
<title>Color Catch - peg + board preview</title>
<style>
  body { margin: 0; padding: 24px; font: 13px/1.5 -apple-system, system-ui, sans-serif;
         background: ${NEUTRAL.page}; color: ${NEUTRAL.ink}; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  p.note { margin: 0 0 20px; color: ${NEUTRAL.inkSoft}; }
  .row { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
  .card { background: #FFFDF8; border: 1px solid #E2D8C7; border-radius: 12px; padding: 12px 12px 8px; }
  .card.dark { background: #1E1B18; border-color: #3A342E; color: #EDE6DA; }
  .card h2 { font-size: 12px; font-weight: 600; margin: 0 0 8px; letter-spacing: .04em;
             text-transform: uppercase; opacity: .65; }
  .strip { margin-top: 24px; }
  .strip .card { display: inline-block; }
</style>
<h1>Color Catch - 3/4 board, peg dolls, wooden die</h1>
<p class="note">Generated by <code>npx tsx assets/source/build-peg-preview.ts</code> from
  <code>src/ui/art/perspectiveModel.ts</code>. 25 pegs via <code>roundLayout()</code>,
  yScale ${BOARD_Y_SCALE}, ~40% face-up, z-sorted back to front.</p>

<div class="row">
  <div class="card"><h2>Light</h2>${light.svg}</div>
  <div class="card"><h2>Light + shapes</h2>${lightShapes.svg}</div>
  <div class="card dark"><h2>Dark</h2>${dark.svg}</div>
</div>

<div class="strip row">
  <div class="card"><h2>Pegs (light)</h2>${trayRow(44, 'light')}</div>
  <div class="card dark"><h2>Pegs (dark)</h2>${trayRow(44, 'dark')}</div>
</div>

<div class="strip row">
  <div class="card"><h2>Die</h2>${dieRow(64, 'light', false)}</div>
  <div class="card"><h2>Die + shapes</h2>${dieRow(64, 'light', true)}</div>
  <div class="card dark"><h2>Die (dark)</h2>${dieRow(64, 'dark', false)}</div>
</div>
`;

const out = join(__dirname, 'preview-pegs.html');
writeFileSync(out, html);
console.log('wrote', out);
