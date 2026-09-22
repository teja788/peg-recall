/**
 * Color Catch — 3/4-view geometry: the tilted round board, the upright peg
 * dolls that stand in it, and the wooden colour die.
 *
 * Pure TypeScript. No React, no react-native-svg, so `npx tsx` can import this
 * straight from a node script and serialise the same numbers the app draws
 * (see assets/source/build-peg-preview.ts → assets/source/preview-pegs.html).
 *
 * Every piece of art is described as a flat list of primitives (`Prim`) plus
 * the gradients it references, inside a rectangular `Scene` box: a tilted board
 * is wide and flat, a peg doll is tall and thin. Two consumers render the same
 * description — `src/ui/art/scene3d.tsx` with react-native-svg in the app, and
 * `assets/source/build-peg-preview.ts` as plain SVG text in the browser — so
 * the preview page cannot drift away from what the app draws, and node counts
 * are countable in a test (`src/ui/art/__tests__/nodeBudget.test.ts`).
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
import { PEG_COLORS, type PegColor } from '../../engine/types';
import { PEG_GLYPH_ON, PEG_HEX, PEG_RIM, WOOD, shade } from './palette';
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

/** A drawing authored in a rectangular box. */
export interface Scene {
  w: number;
  h: number;
  grads: Grad[];
  prims: Prim[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** A 2D point, as a tuple, for the polygon helpers below. */
type Pt = readonly [number, number];

/**
 * A closed polygon with every corner radiused by `r` (quadratic corners, which
 * is what a rounded wooden edge looks like at these sizes). Corners tighter
 * than `2r` of edge simply take as much rounding as the edge can give.
 */
function roundPoly(pts: readonly Pt[], r: number): string {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = pts[(i + n - 1) % n];
    const here = pts[i];
    const next = pts[(i + 1) % n];
    const towards = (to: Pt): Pt => {
      const dx = to[0] - here[0];
      const dy = to[1] - here[1];
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(r, len / 2) / len;
      return [here[0] + dx * k, here[1] + dy * k];
    };
    const a = towards(prev);
    const b = towards(next);
    d += `${i === 0 ? 'M' : 'L'} ${r2(a[0])} ${r2(a[1])} `;
    d += `Q ${r2(here[0])} ${r2(here[1])} ${r2(b[0])} ${r2(b[1])} `;
  }
  return `${d}Z`;
}

/* =================================================================== peg == */

/**
 * Peg doll proportions, as multiples of the peg's width. The width is the
 * widest point (the head); the stem is only a little narrower, so the peg
 * reads as a slim turned pin rather than a mushroom.
 *
 * Measured off the reference toy (see assets/source/ART-NOTES.md, "Board
 * readability"): head 35 px wide on a 29 px stem (1.21x), head as tall as it
 * is wide, stem 1.46 head-widths long, whole peg 2.5 head-widths tall. The
 * numbers below are those, trimmed a few percent so a peg is 1.2 lattice
 * spacings tall instead of 1.18 — close enough to read the same, short enough
 * that the row two shells back still shows its base above this one's head.
 */
const P = {
  /** total height / width */
  aspect: 2.35,
  /** head half-width = half the box */
  capRx: 0.5,
  /** y of the head's widest line */
  capEqY: 0.54,
  /** y of the top of the head */
  capTopY: 0.06,
  /** how far the head's underside bulges below its widest line */
  capUnderRy: 0.36,
  /** stem half-width — 1.19x narrower than the head, as on the real toy */
  bodyRx: 0.42,
  /** stem top, tucked under the head */
  bodyTopY: 0.6,
  /** y of the base centre — the point that lands on a hole */
  baseY: 2.2,
  /** half-height of the base ellipse (the board-level foreshortening) */
  baseRy: 0.1,
  /** bottom of the coloured band on the stem, face-up only */
  bandY: 1.24,
} as const;

/** Height / width of the box `pegDollScene()` draws into. */
export const PEG_DOLL_ASPECT = P.aspect;

/** y of the base centre inside the box, as a fraction of the peg's width. */
export const PEG_DOLL_BASE_Y = P.baseY;

/**
 * Height of the head alone, in peg widths. Keep this below the projected row
 * pitch (`spacing * 0.866 * yScale`) or a peg's head swallows the base of the
 * peg standing behind it and the grid stops reading as rows.
 */
export const PEG_DOLL_CAP_HEIGHT = P.capEqY + P.capUnderRy - P.capTopY;

/** Height of the peg above its base, in peg widths. */
export const PEG_DOLL_STAND_HEIGHT = P.baseY - P.capTopY;

/**
 * Where the base centre of a peg sits inside its own box, in points.
 * Place this point on a projected hole centre to stand the peg in the hole.
 */
export function pegDollAnchor(width: number): { x: number; y: number } {
  return { x: r2(width * 0.5), y: r2(width * P.baseY) };
}

/** Cap / body / band tones for one peg, face-up or face-down. */
function dollTones(color: PegColor | null, faceUp: boolean, theme: ArtTheme) {
  const w = WOOD[theme];
  if (faceUp && color) {
    return {
      cap: PEG_HEX[color],
      capDark: shade(PEG_RIM[color], -0.14),
      band: PEG_RIM[color],
      body: w.pegBody,
      gloss: color === 'yellow' ? 0.32 : 0.45,
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
 *
 * The 2-3 gradients are all objectBoundingBox, so their *contents* depend only
 * on `(color, faceUp, theme)` — `uid` exists to name them, not to vary them.
 * Callers in the app should go through `cachedPegDollScene()` in pegDoll.tsx,
 * which keys `uid` by that triple and hands every matching doll one shared
 * scene instead of rebuilding this for each of the 40 pegs on a board.
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
    // Contact shadow: two stacked ellipses, the wider one faint, so the peg
    // sits *in* the board instead of floating over it. Pooled a touch to the
    // right of the base, away from the light.
    {
      t: 'ellipse',
      cx: r2(cx + u(0.04)),
      cy: r2(baseY + u(0.045)),
      rx: r2(bodyRx * 1.65),
      ry: r2(baseRy * 1.05),
      fill: w.shadow,
      opacity: theme === 'light' ? 0.13 : 0.24,
    },
    {
      t: 'ellipse',
      cx: r2(cx + u(0.03)),
      cy: r2(baseY + u(0.03)),
      rx: r2(bodyRx * 1.12),
      ry: r2(baseRy * 0.78),
      fill: w.shadow,
      opacity: theme === 'light' ? 0.22 : 0.38,
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

  // Specular highlight, upper left of the head.
  const hlY = capEqY - u(0.27);
  prims.push({
    t: 'ellipse',
    cx: r2(cx - capRx * 0.4),
    cy: r2(hlY),
    rx: r2(capRx * 0.27),
    ry: r2(u(0.12)),
    fill: '#FFFFFF',
    opacity: t.gloss,
    transform: `rotate(-24 ${r2(cx - capRx * 0.4)} ${r2(hlY)})`,
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

/**
 * Default vertical squash of the board ellipse.
 *
 * Measured off the reference toy: its disc is 511 x 311 px, i.e. 0.61, with
 * the peg rings sitting on an ellipse of exactly that ratio. We sit a little
 * flatter still (0.66) because our hex lattice packs rows 0.866 spacings
 * apart where the reference's shells are 1.27 apart — the extra squash back
 * would put a peg's head over the base of the peg two shells behind it.
 */
export const BOARD_Y_SCALE = 0.66;
/**
 * Default thickness of the visible wooden side, as a fraction of the width.
 * The reference uses 0.055; a hair more keeps it reading as a chunky toy disc
 * now that the flatter ellipse shows more of the top face.
 */
export const BOARD_EDGE_RATIO = 0.065;
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
export const PEG_WIDTH_OF_SPACING = 0.5;

/** Drawn peg width for a board laid out with this lattice `spacing`. */
export function pegWidthFor(spacing: number): number {
  return spacing * PEG_WIDTH_OF_SPACING;
}

/**
 * Recommended hole diameter for a peg of width `pegWidth`.
 *
 * Wider than the peg's *stem* (0.84 x pegWidth) on purpose: the drilled rim
 * has to stay visible all the way round the base, or a peg reads as sitting
 * on the board rather than in it — and an empty hole has to read as a hole.
 */
export function holeSizeFor(pegWidth: number): number {
  return pegWidth * 1.06;
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
 * 17 fixed prims + one faint row-guide groove per shell + 2 per hole.
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
  const glowId = `pvg${uid}`;
  const wallId = `pvw${uid}`;

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
  const wall =
    `M ${r2(cx - rx)} ${r2(cy)} L ${r2(cx - rx)} ${r2(cy + edge)} ` +
    `A ${r2(rx)} ${r2(ry)} 0 0 0 ${r2(cx + rx)} ${r2(cy + edge)} ` +
    `L ${r2(cx + rx)} ${r2(cy)} ` +
    `A ${r2(rx)} ${r2(ry)} 0 0 1 ${r2(cx - rx)} ${r2(cy)} Z`;
  // Cylindrical shading around the wall...
  prims.push({ t: 'path', d: wall, fill: `url(#${sideId})` });
  // ...and the light falling off towards its bottom edge.
  prims.push({ t: 'path', d: wall, fill: `url(#${wallId})` });

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
    opacity: theme === 'light' ? 0.3 : 0.12,
  });
  // Turned groove: the shallow ring a lathe leaves just inside the edge.
  const rg = ri * 0.93;
  prims.push({
    t: 'ellipse',
    cx: r2(cx),
    cy: r2(cy),
    rx: r2(rg),
    ry: r2(rg * yScale),
    fill: 'none',
    stroke: w.groove,
    sw: r2(Math.max(0.8, width * 0.0055)),
    opacity: theme === 'light' ? 0.42 : 0.5,
  });

  // Row guides: one faint groove under each shell of holes. Barely there on
  // purpose — enough for the eye to follow a ring round the board and see
  // which pegs belong to it, not enough to read as decoration.
  const radii: number[] = [];
  for (const h of holes) {
    const r = Math.hypot(h.x, h.y);
    if (r < 1) continue;
    if (!radii.some((q) => Math.abs(q - r) < Math.max(1, width * 0.006))) radii.push(r);
  }
  for (const r of radii) {
    prims.push({
      t: 'ellipse',
      cx: r2(cx),
      cy: r2(cy),
      rx: r2(r),
      ry: r2(r * yScale),
      fill: 'none',
      stroke: w.groove,
      sw: r2(Math.max(0.7, width * 0.004)),
      opacity: theme === 'light' ? 0.07 : 0.09,
    });
  }

  // Grain: shallow arcs across the face, squashed with everything else.
  for (const [k, bow] of [
    [-0.72, 0.06],
    [-0.46, -0.07],
    [-0.14, 0.08],
    [0.18, -0.07],
    [0.48, 0.07],
    [0.72, -0.05],
  ] as const) {
    const gy = cy + k * ri * yScale;
    const half = Math.sqrt(Math.max(0, 1 - k * k)) * ri * 0.94;
    prims.push({
      t: 'path',
      d: `M ${r2(cx - half)} ${r2(gy)} Q ${r2(cx)} ${r2(gy + bow * ri * yScale)} ${r2(cx + half)} ${r2(gy)}`,
      fill: 'none',
      stroke: w.grain,
      sw: r2(Math.max(0.8, width * 0.005)),
      opacity: theme === 'light' ? 0.09 : 0.1,
      round: true,
    });
  }

  // Warm specular sweep over the top-left of the face — a soft-edged radial, so
  // it reads as varnish catching the window rather than as a painted blob.
  prims.push({
    t: 'ellipse',
    cx: r2(cx - ri * 0.3),
    cy: r2(cy - ri * yScale * 0.4),
    rx: r2(ri * 0.62),
    ry: r2(ri * yScale * 0.5),
    fill: `url(#${glowId})`,
  });

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
      opacity: theme === 'light' ? 0.5 : 0.34,
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
        cx: 0.44,
        cy: 0.32,
        r: 0.82,
        stops: [
          { offset: 0, color: w.faceLit },
          { offset: 0.55, color: shade(w.faceLit, -0.08) },
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
          { offset: 0, color: w.rimDeep },
          { offset: 0.3, color: w.rim },
          { offset: 0.66, color: shade(w.rim, -0.18) },
          { offset: 1, color: shade(w.rimDeep, -0.16) },
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
      {
        id: wallId,
        kind: 'linear',
        x1: 0.5,
        y1: 0,
        x2: 0.5,
        y2: 1,
        stops: [
          { offset: 0, color: w.rimDeep, opacity: 0 },
          { offset: 0.45, color: w.rimDeep, opacity: 0.1 },
          { offset: 1, color: shade(w.rimDeep, -0.3), opacity: 0.62 },
        ],
      },
      {
        id: glowId,
        kind: 'radial',
        cx: 0.5,
        cy: 0.5,
        r: 0.5,
        stops: [
          { offset: 0, color: '#FFF6E0', opacity: theme === 'light' ? 0.24 : 0.12 },
          { offset: 0.6, color: '#FFF0D2', opacity: theme === 'light' ? 0.08 : 0.04 },
          { offset: 1, color: '#FFECC8', opacity: 0 },
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

/** Die proportions, as fractions of the scene box width. */
const D = {
  /** half-width of the cube */
  hw: 0.4,
  /** top face half-depth / half-width — how far the block is tipped back */
  tip: 0.52,
  /** height of the two visible side faces */
  side: 0.42,
  /** top vertex, down from the top of the box */
  top: 0.06,
  /** corner radius of every face */
  round: 0.055,
  /** top-face pip radius, as a fraction of the top face's half-diagonals */
  pip: 0.5,
  /** side-face pip radius, as a fraction of the cube's half-width */
  sidePip: 0.235,
  /** how much of the face slope the side pips are sheared by */
  pipShear: 0.6,
  /** room left under the block for its contact shadow */
  shadowPad: 0.09,
} as const;

/**
 * Height / width of the box `woodDieScene()` draws into.
 *
 * Derived from `D`, never hand-written: the box runs from the top vertex down
 * past the two visible side faces to the bottom of the near corner, plus the
 * room the contact shadow needs. Callers that size a container for the die
 * (src/ui/Die.tsx) must use this, or the art sits off-centre inside its own
 * box and the tumble rotates about the wrong point.
 */
export const WOOD_DIE_ASPECT = D.top + 2 * D.hw * D.tip + D.side + D.shadowPad;

/**
 * The two decorative colours on the side faces, for a die showing `color`.
 *
 * A real colour die carries a different colour on every face, so the two we can
 * see must never repeat the rolled one. Stepping two and four places round the
 * six-colour wheel gives a fixed, well-separated pair per roll — decorative,
 * deterministic, and never mistakable for the answer.
 */
const WHEEL: readonly PegColor[] = PEG_COLORS;
function sidePips(color: PegColor): { front: PegColor; right: PegColor } {
  const n = WHEEL.length;
  const i = WHEEL.indexOf(color);
  return { front: WHEEL[(i + 2) % n], right: WHEEL[(i + 4) % n] };
}

/**
 * A rounded wooden colour die in the same 3/4 view as the board: a lit top face
 * carrying the rolled colour as one big glossy pip, a front and a right face
 * each carrying a smaller pip in another palette colour, radiused edges with a
 * lit bevel along the top, and a soft contact shadow. Before the first roll it
 * is a plain block of wood with a "?" engraved into the top face.
 *
 * 15 prims at most (9 un-rolled).
 */
export function woodDieScene(
  size: number,
  color: PegColor | null,
  showShape = false,
  theme: ArtTheme = 'light',
  uid = 'd',
): Scene {
  const w = WOOD[theme];
  const u = (k: number) => size * k;
  const cx = size / 2;

  const hw = u(D.hw);
  const hh = hw * D.tip;
  const sideH = u(D.side);
  const y0 = u(D.top);
  const rr = u(D.round);

  // Cube corners: T is the far corner of the top face, M the near one, and the
  // three B* corners are the bottom of the block.
  const T: Pt = [cx, y0];
  const L: Pt = [cx - hw, y0 + hh];
  const R: Pt = [cx + hw, y0 + hh];
  const M: Pt = [cx, y0 + hh * 2];
  const BL: Pt = [cx - hw, y0 + hh + sideH];
  const BM: Pt = [cx, y0 + hh * 2 + sideH];
  const BR: Pt = [cx + hw, y0 + hh + sideH];

  const topId = `dt${uid}`;
  const frontId = `df${uid}`;
  const rightId = `dr${uid}`;
  const edgeId = `de${uid}`;

  const prims: Prim[] = [
    // Contact shadow on the table.
    {
      t: 'ellipse',
      cx: r2(cx + u(0.012)),
      cy: r2(BM[1] + u(0.028)),
      rx: r2(hw * 0.86),
      ry: r2(u(0.042)),
      fill: w.shadow,
      opacity: theme === 'light' ? 0.26 : 0.44,
    },
    // The whole block, rounded. The faces below are drawn inset by the same
    // radius, so what stays visible of this is exactly the bevelled edge.
    {
      t: 'path',
      d: roundPoly([T, R, BR, BM, BL, L], rr * 1.1),
      fill: `url(#${edgeId})`,
    },
    // Front-left face.
    { t: 'path', d: roundPoly([L, M, BM, BL], rr), fill: `url(#${frontId})` },
    // Right face, turned furthest from the light.
    { t: 'path', d: roundPoly([M, R, BR, BM], rr), fill: `url(#${rightId})` },
    // Top face, with the lit bevel running round its edges.
    {
      t: 'path',
      d: roundPoly([T, R, M, L], rr),
      fill: `url(#${topId})`,
      stroke: w.dieBevel,
      sw: r2(Math.max(0.7, u(0.009))),
      opacity: theme === 'light' ? 0.85 : 0.6,
    },
    // The vertical corner where the two side faces meet, catching the light.
    {
      t: 'path',
      d: `M ${r2(cx)} ${r2(M[1] + rr * 0.6)} L ${r2(cx)} ${r2(BM[1] - rr * 0.9)}`,
      fill: 'none',
      stroke: w.dieCorner,
      sw: r2(Math.max(0.8, u(0.018))),
      opacity: theme === 'light' ? 0.34 : 0.2,
      round: true,
    },
    // Two grain streaks down the front face.
    {
      t: 'path',
      d:
        `M ${r2(cx - hw * 0.78)} ${r2(y0 + hh * 1.35 + sideH * 0.08)} ` +
        `Q ${r2(cx - hw * 0.5)} ${r2(y0 + hh * 1.5 + sideH * 0.5)} ` +
        `${r2(cx - hw * 0.72)} ${r2(y0 + hh * 1.45 + sideH * 0.92)} ` +
        `M ${r2(cx - hw * 0.28)} ${r2(y0 + hh * 1.72 + sideH * 0.1)} ` +
        `Q ${r2(cx - hw * 0.04)} ${r2(y0 + hh * 1.85 + sideH * 0.5)} ` +
        `${r2(cx - hw * 0.2)} ${r2(y0 + hh * 1.78 + sideH * 0.9)}`,
      fill: 'none',
      stroke: w.dieGrain,
      sw: r2(Math.max(0.6, u(0.008))),
      opacity: 0.085,
      round: true,
    },
  ];

  // Big pip on the top face, squashed onto the tipped plane. Declared out here
  // because the glyph box below has to fit inside it.
  const prx = hw * D.pip;
  const pry = hh * D.pip;

  if (color) {
    const sides = sidePips(color);
    const slope = hh / hw;

    const pcy = y0 + hh;
    prims.push({
      t: 'ellipse',
      cx: r2(cx),
      cy: r2(pcy),
      rx: r2(prx),
      ry: r2(pry),
      fill: PEG_HEX[color],
      stroke: shade(PEG_RIM[color], -0.12),
      sw: r2(Math.max(0.7, u(0.011))),
    });
    // The paint sits a hair below the wood: a dark arc inside its far edge.
    prims.push({
      t: 'path',
      d:
        `M ${r2(cx - prx * 0.93)} ${r2(pcy)} ` +
        `A ${r2(prx * 0.93)} ${r2(pry * 0.93)} 0 0 1 ${r2(cx + prx * 0.93)} ${r2(pcy)}`,
      fill: 'none',
      stroke: shade(PEG_RIM[color], -0.4),
      sw: r2(Math.max(0.6, u(0.011))),
      opacity: 0.45,
      round: true,
    });
    // Gloss on the paint, to the near-left where the board's light comes from.
    prims.push({
      t: 'ellipse',
      cx: r2(cx - prx * 0.3),
      cy: r2(pcy + pry * 0.28),
      rx: r2(prx * 0.36),
      ry: r2(pry * 0.3),
      fill: '#FFFFFF',
      opacity: color === 'yellow' ? 0.3 : 0.44,
    });

    // One pip per side face, sheared onto its plane, with its own small gloss.
    // The shear is deliberately softened (D.pipShear): a pip sheared by the
    // full face slope reads as a smeared oval rather than as a painted dot, and
    // the eye happily accepts the gentler lean on a stylised toy.
    const face = (fx: number, sgn: 1 | -1, c: PegColor, dim: number) => {
      const fy = y0 + hh * 1.5 + sideH * 0.5;
      const pr = hw * D.sidePip;
      const sh = slope * D.pipShear;
      const m = `matrix(1 ${r2(sgn * sh)} 0 1 0 ${r2(-sgn * sh * fx)})`;
      prims.push({
        t: 'circle',
        cx: r2(fx),
        cy: r2(fy),
        r: r2(pr),
        fill: PEG_HEX[c],
        stroke: shade(PEG_RIM[c], -0.12),
        sw: r2(Math.max(0.6, u(0.009))),
        opacity: dim,
        transform: m,
      });
      prims.push({
        t: 'ellipse',
        cx: r2(fx - pr * 0.3),
        cy: r2(fy - pr * 0.34),
        rx: r2(pr * 0.34),
        ry: r2(pr * 0.24),
        fill: '#FFFFFF',
        opacity: 0.3 * dim,
        transform: m,
      });
    };
    face(cx - hw * 0.5, 1, sides.front, 1);
    face(cx + hw * 0.5, -1, sides.right, 0.82);
  }

  // Top-face lettering: the engraved "?" before the first roll, or the colour's
  // shape glyph on top of the big pip.
  //
  // Scaled UNIFORMLY, and deliberately not sheared or squashed onto the tipped
  // plane: the glyphs are the colour-blind cue (PLAN.md section 4), and a
  // non-uniform scale turns ● into an ellipse and ■ into a rectangle — exactly
  // the pairs the glyph set exists to keep apart. The box is therefore the
  // largest *upright square* that still fits, with 8% clearance: inscribed in
  // the pip's ellipse (half-side a·b/√(a²+b²)) once a colour is showing, and in
  // the top-face rhombus (side 2·hw·hh/(hw+hh)) before the first roll.
  const gside =
    (color ? (2 * prx * pry) / Math.hypot(prx, pry) : (2 * hw * hh) / (hw + hh)) * 0.92;
  const gs = gside / SHAPE_VIEWBOX;
  const gm = (dy: number) =>
    `matrix(${r2(gs)} 0 0 ${r2(gs)} ` +
    `${r2(cx - gside / 2)} ${r2(y0 + hh + dy - gside / 2)})`;
  if (!color) {
    const cut = `${Q_STEM} ${Q_DOT}`;
    // Cut: dark stroke. Then the lit lower wall of the groove, a hair below it.
    prims.push({
      t: 'path',
      d: cut,
      fill: 'none',
      stroke: w.dieGrain,
      sw: 2.6,
      round: true,
      transform: gm(0),
      opacity: 0.55,
    });
    prims.push({
      t: 'path',
      d: cut,
      fill: 'none',
      stroke: w.dieCut,
      sw: 1.4,
      round: true,
      transform: gm(u(0.012)),
      opacity: 0.6,
    });
  } else if (showShape) {
    prims.push({
      t: 'path',
      d: SHAPE_PATHS[color],
      fill: PEG_GLYPH_ON[color],
      stroke: PEG_GLYPH_ON[color],
      sw: 1.1,
      round: true,
      transform: gm(0),
    });
  }

  const grads: Grad[] = [
    // Top face: brightest at the far-left corner, rolling off towards the near
    // right, so the block reads as lit from over the player's left shoulder.
    {
      id: topId,
      kind: 'linear',
      x1: 0.1,
      y1: 0,
      x2: 0.92,
      y2: 1,
      stops: [
        { offset: 0, color: shade(w.dieTop, 0.24) },
        { offset: 0.5, color: w.dieTop },
        { offset: 1, color: shade(w.dieTop, -0.1) },
      ],
    },
    {
      id: frontId,
      kind: 'linear',
      x1: 0,
      y1: 0,
      x2: 0.6,
      y2: 1,
      stops: [
        { offset: 0, color: shade(w.dieFront, 0.14) },
        { offset: 0.55, color: w.dieFront },
        { offset: 1, color: shade(w.dieFront, -0.14) },
      ],
    },
    {
      id: rightId,
      kind: 'linear',
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 0.7,
      stops: [
        { offset: 0, color: shade(w.dieRight, 0.06) },
        { offset: 0.6, color: w.dieRight },
        { offset: 1, color: shade(w.dieRight, -0.22) },
      ],
    },
    // The bevel band showing between the faces: lit along the top, shaded at
    // the bottom of the block.
    {
      id: edgeId,
      kind: 'linear',
      x1: 0.5,
      y1: 0,
      x2: 0.5,
      y2: 1,
      stops: [
        { offset: 0, color: shade(w.dieTop, 0.2) },
        { offset: 0.42, color: w.dieFront },
        { offset: 1, color: w.dieEdge },
      ],
    },
  ];

  return { w: size, h: r2(u(WOOD_DIE_ASPECT)), grads, prims };
}
