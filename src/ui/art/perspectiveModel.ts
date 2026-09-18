/**
 * Peg Recall — 3/4-view geometry: the tilted round board, the upright peg
 * dolls that stand in it, and the wooden colour die.
 *
 * Pure TypeScript. No React, no react-native-svg, so `npx tsx` can import this
 * straight from a node script and serialise the same numbers the app draws
 * (see assets/source/build-peg-preview.ts → assets/source/preview-pegs.html).
 *
 * Reuses the `Prim` / `Grad` primitive vocabulary from svgModel.ts, but each
 * function here returns a `Scene` (a rectangular box) rather than a `Drawing`
 * (a square one): a tilted board is wide and flat, a peg doll is tall and thin.
 *
 * Coordinate conventions
 * ----------------------
 * - Board: `holes` arrive in *circle space* — the untilted, board-centred
 *   coordinates that `roundLayout()` produces. `projectHole()` squashes them
 *   onto the ellipse; `boardCentre()` says where the board's centre sits inside
 *   the scene box.
 * - Peg: authored in a box `width` wide and `width * PEG_DOLL_ASPECT` tall,
 *   with the *base* of the peg at `pegDollAnchor(width)`. Put that point on a
 *   projected hole centre and the peg stands in the hole.
 *
 * No blur filters: soft shadows are stacks of low-opacity ellipses, which
 * rasterise identically in react-native-svg and in WebKit.
 */
import type { PegColor } from '../../engine/types';
import { NEUTRAL, PEG_GLYPH_ON, PEG_HEX, PEG_RIM, WOOD, shade } from './palette';
import type { ArtTheme } from './palette';
import { SHAPE_PATHS, SHAPE_VIEWBOX } from './shapePaths';
import type { Grad, Prim } from './svgModel';

export type { Grad, Prim } from './svgModel';

/** A drawing authored in a rectangular box. */
export interface Scene {
  w: number;
  h: number;
  grads: Grad[];
  prims: Prim[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/* =================================================================== peg == */

/**
 * Peg doll proportions, as multiples of the peg's width. The width is the
 * widest point (the cap); the body is narrower so the cap reads as a mushroom
 * sitting on a turned stem.
 */
const P = {
  /** total height / width */
  aspect: 1.9,
  /** dome half-width = half the box */
  capRx: 0.5,
  /** y of the dome's widest line */
  capEqY: 0.5,
  /** y of the top of the dome */
  capTopY: 0.09,
  /** how far the dome's underside bulges below its widest line */
  capUnderRy: 0.13,
  /** body half-width */
  bodyRx: 0.36,
  /** body top, tucked under the dome */
  bodyTopY: 0.42,
  /** y of the base centre — the point that lands on a hole */
  baseY: 1.775,
  /** half-height of the base ellipse (the board-level foreshortening) */
  baseRy: 0.115,
  /** bottom of the coloured band on the body, face-up only */
  bandY: 0.94,
} as const;

/** Height / width of the box `pegDollScene()` draws into. */
export const PEG_DOLL_ASPECT = P.aspect;

/**
 * Where the base centre of a peg sits inside its own box, in points.
 * Place this point on a projected hole centre to stand the peg in the hole.
 */
export function pegDollAnchor(width: number): { x: number; y: number } {
  return { x: r2(width * 0.5), y: r2(width * P.baseY) };
}

/** Same thing as fractions of the box, for callers doing transform maths. */
export const PEG_DOLL_ANCHOR = {
  x: 0.5,
  y: P.baseY / P.aspect,
} as const;

/** Cap / body / band tones for one peg, face-up or face-down. */
function dollTones(color: PegColor | null, faceUp: boolean, theme: ArtTheme) {
  const w = WOOD[theme];
  if (faceUp && color) {
    return {
      cap: PEG_HEX[color],
      capDark: shade(PEG_RIM[color], -0.14),
      band: PEG_RIM[color],
      body: w.pegBody,
      gloss: color === 'yellow' ? 0.3 : 0.42,
    };
  }
  return {
    cap: w.pegCap,
    capDark: shade(w.pegCapRim, -0.1),
    band: null,
    body: w.pegBody,
    gloss: w.gloss,
  };
}

/**
 * One upright peg doll: contact shadow, turned cylindrical body, a coloured
 * band under the cap when face-up, a domed cap, its specular highlight, and an
 * optional shape glyph on the front of the cap.
 *
 * 5 prims face-down, 6 face-up, 7 with a glyph — well under the 10-node budget.
 */
export function pegDollScene(
  width: number,
  color: PegColor | null,
  faceUp: boolean,
  showShape = false,
  theme: ArtTheme = 'light',
  uid = 'p',
): Scene {
  const w = WOOD[theme];
  const t = dollTones(color, faceUp, theme);
  const u = (k: number) => width * k;
  const cx = width / 2;
  const bodyId = `pdb${uid}`;
  const bandId = `pdn${uid}`;
  const capId = `pdc${uid}`;

  const bodyRx = u(P.bodyRx);
  const baseY = u(P.baseY);
  const baseRy = u(P.baseRy);
  const capRx = u(P.capRx);
  const capEqY = u(P.capEqY);

  /** left edge -> base curve -> right edge, closed at `topY`. */
  const stem = (topY: number, bottomY: number, ry: number) =>
    `M ${r2(cx - bodyRx)} ${r2(topY)} L ${r2(cx - bodyRx)} ${r2(bottomY)} ` +
    `A ${r2(bodyRx)} ${r2(ry)} 0 0 0 ${r2(cx + bodyRx)} ${r2(bottomY)} ` +
    `L ${r2(cx + bodyRx)} ${r2(topY)} Z`;

  const prims: Prim[] = [
    // Contact shadow, pooled a touch to the right of the base.
    {
      t: 'ellipse',
      cx: r2(cx + u(0.03)),
      cy: r2(baseY + u(0.035)),
      rx: r2(bodyRx * 1.18),
      ry: r2(baseRy * 0.8),
      fill: w.shadow,
      opacity: theme === 'light' ? 0.2 : 0.36,
    },
    // Turned body.
    { t: 'path', d: stem(u(P.bodyTopY), baseY, baseRy), fill: `url(#${bodyId})` },
  ];

  // Coloured band: the part of the stem the cap colour runs down onto.
  if (t.band) {
    prims.push({
      t: 'path',
      d: stem(u(P.bodyTopY), u(P.bandY), bodyRx * 0.34),
      fill: `url(#${bandId})`,
    });
  }

  // Dome: tall arc over the top, shallow arc bulging under the widest line.
  prims.push({
    t: 'path',
    d:
      `M ${r2(cx - capRx)} ${r2(capEqY)} ` +
      `A ${r2(capRx)} ${r2(capEqY - u(P.capTopY))} 0 0 1 ${r2(cx + capRx)} ${r2(capEqY)} ` +
      `A ${r2(capRx)} ${r2(u(P.capUnderRy))} 0 0 1 ${r2(cx - capRx)} ${r2(capEqY)} Z`,
    fill: `url(#${capId})`,
    stroke: t.capDark,
    sw: r2(Math.max(0.6, u(0.018))),
    opacity: 1,
  });

  // Specular highlight, upper left of the dome.
  prims.push({
    t: 'ellipse',
    cx: r2(cx - capRx * 0.38),
    cy: r2(capEqY - u(0.24)),
    rx: r2(capRx * 0.26),
    ry: r2(u(0.13)),
    fill: '#FFFFFF',
    opacity: t.gloss,
    transform: `rotate(-24 ${r2(cx - capRx * 0.38)} ${r2(capEqY - u(0.24))})`,
  });

  // Shape glyph, small, on the front of the cap.
  if (faceUp && color && showShape) {
    const gs = u(0.42) / SHAPE_VIEWBOX;
    const gy = gs * 0.9;
    prims.push({
      t: 'path',
      d: SHAPE_PATHS[color],
      fill: PEG_GLYPH_ON[color],
      stroke: PEG_GLYPH_ON[color],
      sw: 1.1,
      round: true,
      transform:
        `matrix(${r2(gs)} 0 0 ${r2(gy)} ` +
        `${r2(cx - gs * SHAPE_VIEWBOX * 0.5)} ${r2(capEqY - u(0.1) - (gy * SHAPE_VIEWBOX) / 2)})`,
    });
  }

  const grads: Grad[] = [
    // Body: lit on the left, shaded on the right, faint bounce light at the very edge.
    {
      id: bodyId,
      kind: 'linear',
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 0,
      stops: [
        { offset: 0, color: shade(t.body, 0.1) },
        { offset: 0.3, color: shade(t.body, 0.26) },
        { offset: 0.78, color: shade(t.body, -0.24) },
        { offset: 1, color: shade(t.body, -0.06) },
      ],
    },
    // Dome: light from the upper left, rolling off to the lower right.
    {
      id: capId,
      kind: 'radial',
      cx: 0.34,
      cy: 0.26,
      r: 0.86,
      stops: [
        { offset: 0, color: shade(t.cap, 0.3) },
        { offset: 0.55, color: t.cap },
        { offset: 1, color: shade(t.cap, -0.22) },
      ],
    },
  ];
  if (t.band) {
    grads.push({
      id: bandId,
      kind: 'linear',
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 0,
      stops: [
        { offset: 0, color: shade(t.band, 0.2) },
        { offset: 0.34, color: t.band },
        { offset: 1, color: shade(t.band, -0.3) },
      ],
    });
  }

  return { w: width, h: width * P.aspect, grads, prims };
}

/* ================================================================= board == */

/** Default vertical squash of the board ellipse (PLAN.md: 0.55–0.6). */
export const BOARD_Y_SCALE = 0.58;
/** Default thickness of the visible wooden side, as a fraction of the width. */
export const BOARD_EDGE_RATIO = 0.09;
/** Room left under the wooden side for the ground shadow. */
const BOARD_SHADOW_PAD = 0.03;

/**
 * Peg width as a fraction of the lattice spacing from `roundLayout()`.
 *
 * Tilting the board squashes the rows together vertically but leaves the pegs
 * their full width, so a peg drawn at the layout's own `pegSize` (0.9 x
 * spacing) turns the board into a wall of caps. Slim pegs let the wood show
 * between them, as on the physical toy. The touch target stays generous
 * because the peg is `PEG_DOLL_ASPECT` times as tall as it is wide.
 */
export const PEG_WIDTH_OF_SPACING = 0.64;

/** Drawn peg width for a board laid out with this lattice `spacing`. */
export function pegWidthFor(spacing: number): number {
  return spacing * PEG_WIDTH_OF_SPACING;
}

/** Recommended hole diameter for a peg of width `pegWidth`. */
export function holeSizeFor(pegWidth: number): number {
  return pegWidth * 0.78;
}

/** Squash a circle-space offset from the board centre onto the tilted ellipse. */
export function projectHole(x: number, y: number, yScale: number): { x: number; y: number } {
  return { x, y: y * yScale };
}

/** Total height of the scene box `perspectiveBoardScene()` draws into. */
export function boardHeight(
  width: number,
  yScale: number = BOARD_Y_SCALE,
  edge: number = width * BOARD_EDGE_RATIO,
): number {
  return width * yScale + edge + width * BOARD_SHADOW_PAD;
}

/** Where the centre of the board's top face sits inside that scene box. */
export function boardCentre(
  width: number,
  yScale: number = BOARD_Y_SCALE,
): { x: number; y: number } {
  return { x: width / 2, y: (width * yScale) / 2 };
}

export interface PerspectiveHole {
  /** Circle-space offset from the board centre (straight from roundLayout). */
  x: number;
  y: number;
}

/**
 * The round board seen from a 3/4 angle: ground shadow, the wooden side wall,
 * the flat rim, the gradient top face, a few grain arcs, and one shallow
 * drilled hole per position.
 *
 * 11 fixed prims + 2 per hole.
 */
export function perspectiveBoardScene(
  width: number,
  holes: readonly PerspectiveHole[],
  holeSize: number,
  theme: ArtTheme = 'light',
  yScale: number = BOARD_Y_SCALE,
  edge: number = width * BOARD_EDGE_RATIO,
  uid = 'b',
): Scene {
  const w = WOOD[theme];
  const rx = width / 2;
  const ry = rx * yScale;
  const { x: cx, y: cy } = boardCentre(width, yScale);
  const faceId = `pvf${uid}`;
  const sideId = `pvs${uid}`;
  const holeId = `pvh${uid}`;

  const prims: Prim[] = [];

  // Ground shadow: three stacked ellipses, widest and faintest first.
  for (const [k, op] of [
    [1.0, 0.4],
    [0.96, 0.7],
    [0.9, 1.0],
  ] as const) {
    prims.push({
      t: 'ellipse',
      cx: r2(cx + width * 0.006),
      cy: r2(cy + edge + width * 0.012),
      rx: r2(rx * k),
      ry: r2(ry * k * 0.62),
      fill: w.shadow,
      opacity: r2(w.shadowOpacity * op),
    });
  }

  // Wooden side wall: the strip between the top ellipse and the same ellipse
  // dropped by `edge`. Closed along the bottom half of the top ellipse.
  prims.push({
    t: 'path',
    d:
      `M ${r2(cx - rx)} ${r2(cy)} L ${r2(cx - rx)} ${r2(cy + edge)} ` +
      `A ${r2(rx)} ${r2(ry)} 0 0 0 ${r2(cx + rx)} ${r2(cy + edge)} ` +
      `L ${r2(cx + rx)} ${r2(cy)} ` +
      `A ${r2(rx)} ${r2(ry)} 0 0 1 ${r2(cx - rx)} ${r2(cy)} Z`,
    fill: `url(#${sideId})`,
  });

  // Flat outer rim of the top face.
  prims.push({ t: 'ellipse', cx: r2(cx), cy: r2(cy), rx: r2(rx), ry: r2(ry), fill: w.rim });
  // Bevel between rim and face.
  const rf = rx * 0.94;
  prims.push({
    t: 'ellipse',
    cx: r2(cx),
    cy: r2(cy),
    rx: r2(rf),
    ry: r2(rf * yScale),
    fill: w.bevel,
  });
  // Face.
  const ri = rx * 0.915;
  prims.push({
    t: 'ellipse',
    cx: r2(cx),
    cy: r2(cy),
    rx: r2(ri),
    ry: r2(ri * yScale),
    fill: `url(#${faceId})`,
  });
  // Thin lit lip where the face meets the bevel.
  prims.push({
    t: 'ellipse',
    cx: r2(cx),
    cy: r2(cy),
    rx: r2(ri * 0.996),
    ry: r2(ri * yScale * 0.996),
    fill: 'none',
    stroke: '#FFFFFF',
    sw: r2(Math.max(0.8, width * 0.004)),
    opacity: theme === 'light' ? 0.24 : 0.09,
  });

  // Grain: shallow arcs across the face, squashed with everything else.
  for (const [k, bow] of [
    [-0.6, 0.08],
    [-0.2, -0.07],
    [0.24, 0.08],
    [0.58, -0.06],
  ] as const) {
    const gy = cy + k * ri * yScale;
    const half = Math.sqrt(Math.max(0, 1 - k * k)) * ri * 0.94;
    prims.push({
      t: 'path',
      d: `M ${r2(cx - half)} ${r2(gy)} Q ${r2(cx)} ${r2(gy + bow * ri * yScale)} ${r2(cx + half)} ${r2(gy)}`,
      fill: 'none',
      stroke: w.grain,
      sw: r2(Math.max(0.8, width * 0.005)),
      opacity: 0.16,
      round: true,
    });
  }

  // Holes: a squashed well plus a lit lip along its lower inside edge.
  const hrx = holeSize / 2;
  const hry = hrx * yScale;
  for (const h of holes) {
    const p = projectHole(h.x, h.y, yScale);
    const hx = cx + p.x;
    const hy = cy + p.y;
    prims.push({
      t: 'ellipse',
      cx: r2(hx),
      cy: r2(hy),
      rx: r2(hrx),
      ry: r2(hry),
      fill: `url(#${holeId})`,
    });
    const lx = hrx * 0.82;
    const ly = hry * 0.82;
    const a0 = Math.PI * 0.14;
    const a1 = Math.PI * 0.86;
    prims.push({
      t: 'path',
      d:
        `M ${r2(hx + lx * Math.cos(a0))} ${r2(hy + ly * Math.sin(a0))} ` +
        `A ${r2(lx)} ${r2(ly)} 0 0 0 ${r2(hx + lx * Math.cos(a1))} ${r2(hy + ly * Math.sin(a1))}`,
      fill: 'none',
      stroke: w.holeLip,
      sw: r2(Math.max(0.6, hry * 0.3)),
      opacity: theme === 'light' ? 0.45 : 0.3,
      round: true,
    });
  }

  return {
    w: width,
    h: boardHeight(width, yScale, edge),
    grads: [
      {
        id: faceId,
        kind: 'radial',
        cx: 0.46,
        cy: 0.34,
        r: 0.76,
        stops: [
          { offset: 0, color: w.faceLit },
          { offset: 1, color: w.face },
        ],
      },
      {
        id: sideId,
        kind: 'linear',
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 0,
        stops: [
          { offset: 0, color: shade(w.rim, -0.34) },
          { offset: 0.34, color: w.rim },
          { offset: 0.72, color: shade(w.rim, -0.16) },
          { offset: 1, color: shade(w.rim, -0.44) },
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

/* =================================================================== die == */

/** "?" for the un-rolled die, authored in the same 24-box as the shape glyphs. */
const Q_STEM =
  'M8.2 9.1 C8.2 6.4 10.2 4.6 12.7 4.6 C15.2 4.6 17.2 6.3 17.2 8.6 C17.2 11.9 12.6 12.3 12.6 15.6';
const Q_DOT = 'M12.6 20.4a1.7 1.7 0 1 0 0-3.4a1.7 1.7 0 1 0 0 3.4Z';

/**
 * A wooden die in the same 3/4 view as the board: lit top face, two darker
 * side faces, a big coloured dot on top and a small one on each visible side.
 * Neutral wood with a faint "?" when no colour has been rolled yet.
 *
 * 9 prims at most.
 */
export function woodDieScene(
  size: number,
  color: PegColor | null,
  showShape = false,
  theme: ArtTheme = 'light',
): Scene {
  const w = WOOD[theme];
  const cx = size / 2;
  const hw = size * 0.36;
  const hh = hw * BOARD_Y_SCALE * 0.86;
  const topY = size * 0.08;
  const midY = topY + hh;
  const botY = topY + hh * 2;
  const sideH = size * 0.34;

  const topWood = w.faceLit;
  const leftWood = shade(w.rim, -0.06);
  const rightWood = shade(w.rim, -0.32);
  const edgeWood = shade(w.bevel, -0.1);

  const dot = color ? PEG_HEX[color] : null;
  const dotRim = color ? PEG_RIM[color] : null;
  const ink = theme === 'dark' ? '#9A8E80' : NEUTRAL.inkSoft;

  const prims: Prim[] = [
    // Contact shadow.
    {
      t: 'ellipse',
      cx: r2(cx),
      cy: r2(botY + sideH + size * 0.045),
      rx: r2(hw * 0.94),
      ry: r2(size * 0.05),
      fill: w.shadow,
      opacity: theme === 'light' ? 0.2 : 0.36,
    },
    // Front-left face.
    {
      t: 'path',
      d:
        `M ${r2(cx - hw)} ${r2(midY)} L ${r2(cx)} ${r2(botY)} ` +
        `L ${r2(cx)} ${r2(botY + sideH)} L ${r2(cx - hw)} ${r2(midY + sideH)} Z`,
      fill: leftWood,
    },
    // Right face.
    {
      t: 'path',
      d:
        `M ${r2(cx)} ${r2(botY)} L ${r2(cx + hw)} ${r2(midY)} ` +
        `L ${r2(cx + hw)} ${r2(midY + sideH)} L ${r2(cx)} ${r2(botY + sideH)} Z`,
      fill: rightWood,
    },
    // Top face.
    {
      t: 'path',
      d:
        `M ${r2(cx)} ${r2(topY)} L ${r2(cx + hw)} ${r2(midY)} ` +
        `L ${r2(cx)} ${r2(botY)} L ${r2(cx - hw)} ${r2(midY)} Z`,
      fill: topWood,
      stroke: edgeWood,
      sw: r2(Math.max(0.8, size * 0.014)),
    },
  ];

  if (dot && dotRim) {
    // Big pip on the top face, squashed to lie flat on it. With shapes on it
    // grows a little and carries the glyph instead of standing alone.
    const pipK = showShape ? 0.46 : 0.34;
    prims.push({
      t: 'ellipse',
      cx: r2(cx),
      cy: r2(midY),
      rx: r2(hw * pipK),
      ry: r2(hh * pipK),
      fill: dot,
      stroke: dotRim,
      sw: r2(Math.max(0.6, size * 0.012)),
    });
    // One small pip per visible side face, sheared onto its plane.
    const slope = hh / hw;
    const lx = cx - hw * 0.5;
    const ly = (midY + botY) / 2 + sideH * 0.5;
    prims.push({
      t: 'circle',
      cx: r2(lx),
      cy: r2(ly),
      r: r2(size * 0.055),
      fill: dot,
      opacity: 0.86,
      transform: `matrix(1 ${r2(slope)} 0 1 0 ${r2(-slope * lx)})`,
    });
    const rrx = cx + hw * 0.5;
    const rry = (midY + botY) / 2 + sideH * 0.5;
    prims.push({
      t: 'circle',
      cx: r2(rrx),
      cy: r2(rry),
      r: r2(size * 0.055),
      fill: dot,
      opacity: 0.7,
      transform: `matrix(1 ${r2(-slope)} 0 1 0 ${r2(slope * rrx)})`,
    });
  }

  // Glyph (or the "?") on the top face: the box squashed to the face aspect.
  const gk = color ? 0.62 : 1.05;
  const gsx = (hw * gk) / SHAPE_VIEWBOX;
  const gsy = (hh * gk) / SHAPE_VIEWBOX;
  const gm =
    `matrix(${r2(gsx)} 0 0 ${r2(gsy)} ` +
    `${r2(cx - (gsx * SHAPE_VIEWBOX) / 2)} ${r2(midY - (gsy * SHAPE_VIEWBOX) / 2)})`;
  if (!color) {
    prims.push({ t: 'path', d: Q_STEM, fill: 'none', stroke: ink, sw: 2.4, round: true, transform: gm, opacity: 0.7 });
    prims.push({ t: 'path', d: Q_DOT, fill: ink, transform: gm, opacity: 0.7 });
  } else if (showShape) {
    prims.push({
      t: 'path',
      d: SHAPE_PATHS[color],
      fill: PEG_GLYPH_ON[color],
      stroke: PEG_GLYPH_ON[color],
      sw: 1.1,
      round: true,
      transform: gm,
    });
  }

  return { w: size, h: botY + sideH + size * 0.12, grads: [], prims };
}
