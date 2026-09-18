/**
 * Color Catch — visual check page for the art layer.
 *
 *   npx tsx assets/source/preview.ts && open assets/source/preview.html
 *
 * Renders the SAME drawing descriptions the app uses (src/ui/art/svgModel.ts)
 * as plain SVG text, so what the browser shows is what react-native-svg draws.
 * Peg positions come from the real src/layout/roundLayout.ts.
 */
import * as fs from 'fs';
import * as path from 'path';
import { roundLayout } from '../../src/layout/roundLayout';
import {
  dieCubeDrawing,
  pegDrawing,
  roundBoardDrawing,
} from '../../src/ui/art/svgModel';
import type { Drawing } from '../../src/ui/art/svgModel';
import { PEG_COLORS } from '../../src/engine/types';
import type { PegColor } from '../../src/engine/types';
import { NEUTRAL } from '../../src/ui/art/palette';
import type { ArtTheme } from '../../src/ui/art/palette';

const HERE = __dirname;

/* ----------------------------------------------------- Drawing -> SVG text */

const attr = (k: string, v: string | number | undefined) =>
  v === undefined ? '' : ` ${k}="${v}"`;

function paint(p: {
  fill?: string;
  stroke?: string;
  sw?: number;
  opacity?: number;
  round?: boolean;
  transform?: string;
}) {
  return (
    attr('fill', p.fill ?? 'none') +
    attr('stroke', p.stroke) +
    attr('stroke-width', p.sw) +
    attr('opacity', p.opacity) +
    (p.round ? ' stroke-linecap="round" stroke-linejoin="round"' : '') +
    attr('transform', p.transform)
  );
}

/** Serialise a Drawing to an SVG fragment (no <svg> wrapper). */
export function drawingBody(d: Drawing): string {
  const defs = d.grads.length
    ? '<defs>' +
      d.grads
        .map((g) => {
          const stops = g.stops
            .map(
              (s) =>
                `<stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`,
            )
            .join('');
          return g.kind === 'radial'
            ? `<radialGradient id="${g.id}" cx="${g.cx}" cy="${g.cy}" r="${g.r}">${stops}</radialGradient>`
            : `<linearGradient id="${g.id}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${stops}</linearGradient>`;
        })
        .join('') +
      '</defs>'
    : '';
  const body = d.prims
    .map((p) => {
      if (p.t === 'circle') return `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}"${paint(p)}/>`;
      if (p.t === 'ellipse')
        return `<ellipse cx="${p.cx}" cy="${p.cy}" rx="${p.rx}" ry="${p.ry}"${paint(p)}/>`;
      return `<path d="${p.d}"${paint(p)}/>`;
    })
    .join('\n');
  return defs + '\n' + body;
}

function svg(d: Drawing, extra = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.size}" height="${d.size}" viewBox="0 0 ${d.size} ${d.size}"${extra}>
${drawingBody(d)}
</svg>`;
}

/** Count the SVG elements in a drawing, for the node budget. */
const nodes = (d: Drawing) => d.prims.length;

/* ------------------------------------------------------------ board scene */

/**
 * A full board: the wooden board plus a peg standing in every hole, positioned
 * exactly the way the Board component will (peg box centred on the hole).
 */
function boardScene(
  pegCount: number,
  diameter: number,
  theme: ArtTheme,
  mode: 'all' | 'some' | 'mid',
) {
  const layout = roundLayout(pegCount, diameter);
  const c = diameter / 2;
  const holes = layout.positions.map((p) => ({
    x: p.x + c,
    y: p.y + c,
    size: layout.pegSize,
  }));
  const board = roundBoardDrawing(diameter, holes, theme, `${theme}${pegCount}`);
  const parts = [drawingBody(board)];
  layout.positions.forEach((p, i) => {
    // 'mid' = a game in progress: every third peg already captured, so the
    // empty holes have to look like part of the board on their own.
    if (mode === 'mid' && i % 3 === 1) return;
    const up = mode === 'all' || i % 3 === 0;
    const color: PegColor = PEG_COLORS[i % PEG_COLORS.length];
    const peg = pegDrawing(layout.pegSize, color, up, theme, `${theme}${pegCount}${i}`);
    const x = p.x + c - layout.pegSize / 2;
    const y = p.y + c - layout.pegSize / 2;
    parts.push(`<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">${drawingBody(peg)}</g>`);
  });
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}">\n${parts.join('\n')}\n</svg>`,
    layout,
    boardNodes: nodes(board),
  };
}

/* ------------------------------------------------------------------- page */

const iconSvg = fs.readFileSync(path.join(HERE, 'icon.svg'), 'utf8');
const iconAt = (px: number) => iconSvg.replace('width="1024" height="1024"', `width="${px}" height="${px}"`);

const classic = boardScene(25, 560, 'light', 'some');
const classicDark = boardScene(25, 560, 'dark', 'some');
const midGame = boardScene(25, 420, 'light', 'mid');
const small = boardScene(16, 300, 'light', 'all');
const huge = boardScene(40, 700, 'light', 'some');

const pegRow = (theme: ArtTheme) =>
  [
    pegDrawing(96, null, false, theme, `pd${theme}`),
    ...PEG_COLORS.map((c, i) => pegDrawing(96, c, true, theme, `pu${theme}${i}`)),
  ]
    .map((d) => svg(d))
    .join('');

const dieRow = [
  dieCubeDrawing(110, null, false),
  ...PEG_COLORS.map((c) => dieCubeDrawing(110, c, true)),
]
  .map((d) => svg(d))
  .join('');

const html = `<!doctype html>
<meta charset="utf-8">
<title>Color Catch — art preview</title>
<style>
  body { margin: 0; padding: 24px 32px 64px; font: 14px/1.5 -apple-system, system-ui, sans-serif;
         background: ${NEUTRAL.page}; color: ${NEUTRAL.ink}; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #8A7F72;
       margin: 28px 0 10px; font-weight: 600; }
  .row { display: flex; flex-wrap: wrap; gap: 24px; align-items: center; }
  .dark { background: #1E1B18; padding: 18px; border-radius: 18px; }
  .note { color: #8A7F72; font-size: 12px; margin: 0 0 6px; }
  .card { background: #FFFDF8; border-radius: 18px; padding: 18px; }
  svg { display: block; }
</style>
<h1>Color Catch — art preview</h1>
<p class="note">board ${classic.boardNodes} nodes at 25 pegs (11 fixed + 2/hole) ·
peg ${nodes(pegDrawing(96, 'orange', true, 'light'))} nodes ·
die ${nodes(dieCubeDrawing(96, 'orange', true))} nodes ·
peg size ${classic.layout.pegSize.toFixed(1)} pt on a 560 pt classic board.</p>

<h2>App icon — icon.svg at 220 / 120 / 60</h2>
<div class="row">${iconAt(220)}${iconAt(120)}${iconAt(60)}</div>

<h2>Classic board — 25 pegs, 560 pt, light &amp; dark</h2>
<div class="row">${classic.svg}<div class="dark">${classicDark.svg}</div></div>

<h2>Mid-game (empty holes) 420 pt · small board 16 pegs, 300 pt</h2>
<div class="row">${midGame.svg}${small.svg}</div>

<h2>Huge board — 40 pegs, 700 pt</h2>
<div class="row">${huge.svg}</div>

<h2>Pegs — face-down, then the six colours</h2>
<div class="row card">${pegRow('light')}</div>
<div class="row dark" style="margin-top:12px">${pegRow('dark')}</div>

<h2>Die</h2>
<div class="row card">${dieRow}</div>
`;

fs.writeFileSync(path.join(HERE, 'preview.html'), html);
console.log('wrote preview.html');
console.log(
  'board nodes 16/25/40:',
  small.boardNodes,
  classic.boardNodes,
  huge.boardNodes,
  '| peg nodes',
  nodes(pegDrawing(96, 'orange', true, 'light')),
  '| die nodes',
  nodes(dieCubeDrawing(96, 'orange', true)),
);
