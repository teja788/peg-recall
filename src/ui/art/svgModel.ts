/**
 * Peg Recall — geometry of the round board, the pegs and the die.
 *
 * Pure TypeScript: no React, no react-native-svg. Every piece of art is
 * described as a small list of primitives (`Prim`) plus the gradients it
 * references. Two renderers consume the same description:
 *
 *   - src/ui/art/renderPrims.tsx  → react-native-svg, in the app
 *   - assets/source/preview.ts    → plain SVG text, for the browser preview
 *
 * So the preview page cannot drift away from what the app draws, and node
 * counts (board ≤ ~60 + 2/hole, peg ≤ 8, die ≤ 8) are countable in a test.
 *
 * No blur filters anywhere: soft shadows are stacks of low-opacity ellipses,
 * which rasterise identically in react-native-svg and in WebKit.
 */
import type { PegColor } from '../../engine/types';
import { NEUTRAL, PEG_GLYPH_ON, PEG_HEX, PEG_RIM, WOOD, shade } from './palette';
import type { ArtTheme } from './palette';
import { SHAPE_PATHS, SHAPE_VIEWBOX } from './shapePaths';

/* ------------------------------------------------------------------ prims */

export interface GradStop {
  offset: number;
  color: string;
  opacity?: number;
}

/** A gradient in objectBoundingBox units (0..1 across the shape's box). */
export interface Grad {
  id: string;
  kind: 'radial' | 'linear';
  /** radial */
  cx?: number;
  cy?: number;
  r?: number;
  /** linear */
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  stops: GradStop[];
}

interface Paintable {
  fill?: string;
  stroke?: string;
  sw?: number;
  opacity?: number;
  /** round line caps, for the little lit arcs */
  round?: boolean;
  transform?: string;
}

export type Prim =
  | ({ t: 'circle'; cx: number; cy: number; r: number } & Paintable)
  | ({ t: 'ellipse'; cx: number; cy: number; rx: number; ry: number } & Paintable)
  | ({ t: 'path'; d: string } & Paintable);

export interface Drawing {
  /** Side of the square the art is authored in (also the viewBox size). */
  size: number;
  grads: Grad[];
  prims: Prim[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ board */

/** One peg hole, in the board's own coordinate space (origin = top-left). */
export interface Hole {
  x: number;
  y: number;
  /** Peg size at this hole; the hole is drawn at 0.9x of it. */
  size: number;
}

/**
 * The round wooden board: drop shadow, rim, bevel ring, gradient face,
 * four faint grain arcs, and one shallow hole per position.
 *
 * `uid` disambiguates gradient ids when several boards are on screen.
 */
export function roundBoardDrawing(
  diameter: number,
  holes: readonly Hole[],
  theme: ArtTheme,
  uid = 'b',
): Drawing {
  const w = WOOD[theme];
  const c = diameter / 2;
  // Leave a sliver of room at the bottom for the drop shadow to peek out.
  const R = c * 0.972;
  const faceId = `pbf${uid}`;
  const holeId = `pbh${uid}`;

  const prims: Prim[] = [];

  // Drop shadow: three stacked ellipses, faintest and widest first.
  const drop = diameter * 0.022;
  for (const [k, op] of [
    [1.0, 0.45],
    [0.975, 0.7],
    [0.945, 1.0],
  ] as const) {
    prims.push({
      t: 'ellipse',
      cx: c,
      cy: r2(c + drop),
      rx: r2(R * k),
      ry: r2(R * k * 0.985),
      fill: w.shadow,
      opacity: r2(w.shadowOpacity * op),
    });
  }

  // Rim, bevel ring, face.
  prims.push({ t: 'circle', cx: c, cy: c, r: r2(R), fill: w.rim });
  prims.push({ t: 'circle', cx: c, cy: c, r: r2(R * 0.955), fill: w.bevel });
  const rf = R * 0.932;
  prims.push({ t: 'circle', cx: c, cy: c, r: r2(rf), fill: `url(#${faceId})` });
  // Thin lit edge where the face meets the bevel.
  prims.push({
    t: 'circle',
    cx: c,
    cy: c,
    r: r2(rf * 0.995),
    fill: 'none',
    stroke: '#FFFFFF',
    sw: r2(Math.max(1, diameter * 0.004)),
    opacity: theme === 'light' ? 0.22 : 0.08,
  });

  // Grain: quadratic arcs between two points of the face circle. The control
  // point sits inside the circle, so the curve can never leave the board.
  for (const [k, bow] of [
    [-0.62, 0.1],
    [-0.24, -0.08],
    [0.22, 0.09],
    [0.6, -0.07],
  ] as const) {
    const y = c + k * rf;
    const half = Math.sqrt(Math.max(0, rf * rf - (k * rf) * (k * rf))) * 0.94;
    const cyc = y + bow * rf;
    prims.push({
      t: 'path',
      d: `M ${r2(c - half)} ${r2(y)} Q ${c} ${r2(cyc)} ${r2(c + half)} ${r2(y)}`,
      fill: 'none',
      stroke: w.grain,
      sw: r2(Math.max(1, diameter * 0.005)),
      opacity: 0.18,
      round: true,
    });
  }

  // Holes. Two prims each: the inset well, and the lit lip at its bottom.
  for (const h of holes) {
    const hr = (h.size * 0.9) / 2;
    prims.push({ t: 'circle', cx: r2(h.x), cy: r2(h.y), r: r2(hr), fill: `url(#${holeId})` });
    const lr = hr * 0.88;
    const a0 = Math.PI * 0.16;
    const a1 = Math.PI * 0.84;
    prims.push({
      t: 'path',
      d:
        `M ${r2(h.x + lr * Math.cos(a0))} ${r2(h.y + lr * Math.sin(a0))} ` +
        `A ${r2(lr)} ${r2(lr)} 0 0 0 ${r2(h.x + lr * Math.cos(a1))} ${r2(h.y + lr * Math.sin(a1))}`,
      fill: 'none',
      stroke: w.holeLip,
      sw: r2(Math.max(0.8, hr * 0.14)),
      opacity: theme === 'light' ? 0.5 : 0.35,
      round: true,
    });
  }

  return {
    size: diameter,
    grads: [
      {
        id: faceId,
        kind: 'radial',
        cx: 0.5,
        cy: 0.4,
        r: 0.72,
        stops: [
          { offset: 0, color: w.faceLit },
          { offset: 1, color: w.face },
        ],
      },
      {
        id: holeId,
        kind: 'linear',
        x1: 0.5,
        y1: 0,
        x2: 0.5,
        y2: 1,
        stops: [
          { offset: 0, color: w.holeDeep },
          { offset: 1, color: w.hole },
        ],
      },
    ],
    prims,
  };
}

/* -------------------------------------------------------------------- peg */

/** Cap / body / shading for one peg, face-up or face-down. */
function pegTones(color: PegColor | null, faceUp: boolean, theme: ArtTheme) {
  const w = WOOD[theme];
  if (faceUp && color) {
    const cap = PEG_HEX[color];
    const body = PEG_RIM[color];
    return {
      cap,
      capRim: shade(body, -0.12),
      bodyTop: body,
      bodyBottom: shade(body, -0.34),
      gloss: color === 'yellow' ? 0.26 : 0.36,
    };
  }
  return {
    cap: w.pegCap,
    capRim: shade(w.pegCapRim, -0.06),
    bodyTop: w.pegBody,
    bodyBottom: shade(w.pegBody, -0.3),
    gloss: w.gloss,
  };
}

/**
 * A peg seen from slightly above: elliptical cap, short cylinder, contact
 * shadow. Authored in a `size` x `size` box so it drops straight onto a hole
 * centre; the cap sits a little above the box centre, the shadow below it.
 */
export function pegDrawing(
  size: number,
  color: PegColor | null,
  faceUp: boolean,
  theme: ArtTheme,
  uid = 'p',
): Drawing {
  const w = WOOD[theme];
  const t = pegTones(color, faceUp, theme);
  const bodyId = `pgb${uid}`;

  const cx = size / 2;
  const capCy = size * 0.4;
  const rx = size * 0.42;
  const ry = size * 0.27;
  const bottom = capCy + size * 0.24;

  const prims: Prim[] = [
    // contact shadow
    {
      t: 'ellipse',
      cx: r2(cx + size * 0.015),
      cy: r2(bottom + size * 0.1),
      rx: r2(rx * 0.98),
      ry: r2(ry * 0.42),
      fill: w.shadow,
      opacity: theme === 'light' ? 0.2 : 0.34,
    },
    // cylinder body
    {
      t: 'path',
      d:
        `M ${r2(cx - rx)} ${r2(capCy)} L ${r2(cx - rx)} ${r2(bottom)} ` +
        `A ${r2(rx)} ${r2(ry)} 0 0 0 ${r2(cx + rx)} ${r2(bottom)} ` +
        `L ${r2(cx + rx)} ${r2(capCy)} Z`,
      fill: `url(#${bodyId})`,
    },
    // top cap
    { t: 'ellipse', cx: r2(cx), cy: r2(capCy), rx: r2(rx), ry: r2(ry), fill: t.cap },
    // cap edge
    {
      t: 'ellipse',
      cx: r2(cx),
      cy: r2(capCy),
      rx: r2(rx * 0.985),
      ry: r2(ry * 0.975),
      fill: 'none',
      stroke: t.capRim,
      sw: r2(Math.max(0.8, size * 0.03)),
      opacity: 0.75,
    },
    // highlight on the cap
    {
      t: 'ellipse',
      cx: r2(cx - rx * 0.28),
      cy: r2(capCy - ry * 0.34),
      rx: r2(rx * 0.42),
      ry: r2(ry * 0.36),
      fill: '#FFFFFF',
      opacity: t.gloss,
    },
  ];

  return {
    size,
    grads: [
      {
        id: bodyId,
        kind: 'linear',
        x1: 0.18,
        y1: 0,
        x2: 0.86,
        y2: 1,
        stops: [
          { offset: 0, color: shade(t.bodyTop, 0.12) },
          { offset: 0.45, color: t.bodyTop },
          { offset: 1, color: t.bodyBottom },
        ],
      },
    ],
    prims,
  };
}

/** Cap only — cheap enough to draw dozens of, for far-away or static pegs. */
export function pegTopDrawing(
  size: number,
  color: PegColor | null,
  faceUp: boolean,
  theme: ArtTheme,
): Drawing {
  const t = pegTones(color, faceUp, theme);
  const cx = size / 2;
  const cy = size * 0.5;
  const rx = size * 0.42;
  const ry = size * 0.27;
  return {
    size,
    grads: [],
    prims: [
      { t: 'ellipse', cx: r2(cx), cy: r2(cy), rx: r2(rx), ry: r2(ry), fill: t.cap },
      {
        t: 'ellipse',
        cx: r2(cx),
        cy: r2(cy),
        rx: r2(rx * 0.985),
        ry: r2(ry * 0.975),
        fill: 'none',
        stroke: t.capRim,
        sw: r2(Math.max(0.8, size * 0.03)),
        opacity: 0.75,
      },
      {
        t: 'ellipse',
        cx: r2(cx - rx * 0.28),
        cy: r2(cy - ry * 0.34),
        rx: r2(rx * 0.42),
        ry: r2(ry * 0.36),
        fill: '#FFFFFF',
        opacity: t.gloss,
      },
    ],
  };
}

/* -------------------------------------------------------------------- die */

/** "?" for the un-rolled die. Authored in the same 64-box as dieFace.tsx. */
const QUESTION_STEM =
  'M23.7 24.2 C23.7 19.4 27.4 15.8 32.2 15.8 C36.9 15.8 40.5 19.1 40.5 23.6 C40.5 29.9 32.2 30.4 32.2 37.1';
const QUESTION_DOT = 'M32.2 44.3a3.3 3.3 0 1 0 0-6.6a3.3 3.3 0 1 0 0 6.6Z';
const QUESTION_BOX = 64;

/**
 * Place a square glyph box, upright, centred on the isometric top face.
 *
 * Deliberately NOT skewed onto the face: the glyphs are the colour-blind cue
 * (PLAN.md section 4), and an isometric shear turns the square into a diamond
 * and the diamond into a square — exactly the two it must keep apart. `side`
 * stays inside the rhombus' inscribed circle.
 */
function glyphTransform(box: number, cx: number, cy: number, side: number) {
  const k = side / box;
  return `translate(${r2(cx - side / 2)} ${r2(cy - side / 2)}) scale(${r2(k)})`;
}

/**
 * The die as a chunky isometric cube: lit top face carrying the rolled colour
 * (and its shape glyph), two darker side faces, soft contact shadow.
 */
export function dieCubeDrawing(
  size: number,
  color: PegColor | null,
  showShape: boolean,
  theme: ArtTheme = 'light',
  uid = 'd',
): Drawing {
  const top = color ? PEG_HEX[color] : NEUTRAL.board;
  const left = color ? shade(PEG_RIM[color], -0.08) : '#E6DCCC';
  const right = color ? shade(PEG_RIM[color], -0.34) : '#D2C5B1';
  const edge = color ? shade(PEG_RIM[color], -0.2) : NEUTRAL.faceDownRim;
  const ink = theme === 'dark' ? '#8A8076' : NEUTRAL.inkSoft;

  const cx = size / 2;
  const hw = size * 0.38;
  const hh = size * 0.19;
  const topY = size * 0.13;
  const midY = topY + hh;
  const botY = topY + hh * 2;
  const sideH = size * 0.3;

  const prims: Prim[] = [
    // contact shadow
    {
      t: 'ellipse',
      cx: r2(cx),
      cy: r2(botY + sideH + size * 0.055),
      rx: r2(hw * 0.92),
      ry: r2(size * 0.055),
      fill: '#2B2622',
      opacity: 0.18,
    },
    // left side
    {
      t: 'path',
      d:
        `M ${r2(cx - hw)} ${r2(midY)} L ${r2(cx)} ${r2(botY)} ` +
        `L ${r2(cx)} ${r2(botY + sideH)} L ${r2(cx - hw)} ${r2(midY + sideH)} Z`,
      fill: left,
    },
    // right side
    {
      t: 'path',
      d:
        `M ${r2(cx)} ${r2(botY)} L ${r2(cx + hw)} ${r2(midY)} ` +
        `L ${r2(cx + hw)} ${r2(midY + sideH)} L ${r2(cx)} ${r2(botY + sideH)} Z`,
      fill: right,
    },
    // top face
    {
      t: 'path',
      d:
        `M ${r2(cx)} ${r2(topY)} L ${r2(cx + hw)} ${r2(midY)} ` +
        `L ${r2(cx)} ${r2(botY)} L ${r2(cx - hw)} ${r2(midY)} Z`,
      fill: top,
      stroke: edge,
      sw: r2(Math.max(1, size * 0.018)),
    },
  ];

  const glyphSide = size * 0.3;
  if (color === null) {
    const m = glyphTransform(QUESTION_BOX, cx, midY, glyphSide * 1.06);
    prims.push({
      t: 'path',
      d: QUESTION_STEM,
      fill: 'none',
      stroke: ink,
      sw: 5,
      round: true,
      transform: m,
    });
    prims.push({ t: 'path', d: QUESTION_DOT, fill: ink, transform: m });
  } else if (showShape) {
    prims.push({
      t: 'path',
      d: SHAPE_PATHS[color],
      fill: PEG_GLYPH_ON[color],
      stroke: PEG_GLYPH_ON[color],
      sw: 1.1,
      round: true,
      transform: glyphTransform(SHAPE_VIEWBOX, cx, midY, glyphSide),
    });
  }

  return { size, grads: [], prims };
}
