/**
 * Round-board peg layout.
 * Pure TypeScript, no React Native imports. Deterministic for a given peg count.
 *
 * Pegs sit on concentric circles (rings), like the wooden toy: e.g. 25 pegs =
 * 1 centre + 8 + 16. Rings are spaced ≥ 1 unit apart and pegs on a ring are
 * ≥ 1 unit apart, so nothing touches. Ring 0 is innermost.
 */

export interface PegPosition {
  index: number;
  /** Centre in board-local points, origin = board centre. */
  x: number;
  y: number;
  /** Angle in radians from +x axis, useful for staggered animations. */
  angle: number;
  /** Shell number (0 = centre). */
  ring: number;
}

export interface RoundLayout {
  /** Board diameter actually used (== the diameter passed in). */
  diameter: number;
  /** Board radius. */
  radius: number;
  /** Peg diameter (touch/visual size). */
  pegSize: number;
  /** Lattice spacing between neighbouring peg centres. */
  spacing: number;
  positions: PegPosition[];
}

interface UnitPoint { x: number; y: number; dist: number; angle: number; ring: number }

/**
 * Ring plans: pegs per concentric circle, inner → outer. Chosen so every ring
 * looks like a circle (like the wooden toy) and adjacent pegs never touch.
 * Unknown counts fall back to a generated plan.
 */
export const RING_PLANS: Record<number, number[]> = {
  9: [1, 8],
  16: [4, 12],
  19: [1, 6, 12],
  24: [8, 16],
  25: [1, 8, 16],
  36: [6, 12, 18],
  40: [8, 14, 18],
};

function fallbackPlan(n: number): number[] {
  const plan: number[] = [];
  let left = n;
  let k = 0;
  while (left > 0) {
    const cap = k === 0 ? 1 : 6 * k;
    const take = Math.min(cap, left);
    plan.push(take);
    left -= take;
    k++;
  }
  // A trailing ring holding a single peg would be a shell with one occupant
  // sitting on the axis of the one below it — hand that peg to the ring below.
  while (plan.length > 1 && plan[plan.length - 1] === 1) {
    plan.pop();
    plan[plan.length - 1] += 1;
  }
  return plan;
}

/** Minimum ring radius (in spacing units) so neighbours on that ring are ≥ 1 apart. */
function ringRadiusFor(count: number, prevRadius: number, hasPrev: boolean): number {
  // Any ring after the first sits at least one spacing outside the one below
  // it — a lone peg included, which would otherwise land on the centre.
  const floor = hasPrev ? prevRadius + 1 : 0;
  if (count <= 1) return floor;
  const chord = 1 / (2 * Math.sin(Math.PI / count));
  return Math.max(chord, floor);
}

/** Choose `n` unit-spaced points on concentric circles. */
export function unitCluster(n: number): UnitPoint[] {
  if (n <= 0) return [];
  const plan = RING_PLANS[n] ?? fallbackPlan(n);
  const out: UnitPoint[] = [];
  let prev = 0;
  let hasPrev = false;
  plan.forEach((count, ring) => {
    const r = ringRadiusFor(count, prev, hasPrev);
    // Stagger alternate rings by half a step; start at 12 o'clock.
    const offset = ring % 2 === 1 ? Math.PI / count : 0;
    for (let i = 0; i < count; i++) {
      const t = -Math.PI / 2 + offset + (i * 2 * Math.PI) / count;
      const x = r * Math.cos(t);
      const y = r * Math.sin(t);
      out.push({ x, y, dist: r, angle: Math.atan2(y, x), ring });
    }
    prev = r;
    hasPrev = true;
  });
  return out;
}

/**
 * Compute a round layout for `pegCount` pegs inside a board of `diameter`.
 * `gapRatio` = gap between pegs as a fraction of spacing (0.12 → 12%).
 * `padRatio` = extra rim between outer pegs and board edge, in spacings.
 */
export function roundLayout(
  pegCount: number,
  diameter: number,
  opts: { gapRatio?: number; padRatio?: number } = {},
): RoundLayout {
  const gapRatio = opts.gapRatio ?? 0.10;
  const padRatio = opts.padRatio ?? 0.25;
  const cluster = unitCluster(pegCount);
  const maxDist = cluster.reduce((m, p) => Math.max(m, p.dist), 0);
  // Board radius in spacing units: outermost centre + half a peg + rim.
  const radiusUnits = maxDist + 0.5 + padRatio;
  const spacing = diameter / 2 / radiusUnits;
  const pegSize = spacing * (1 - gapRatio);

  const clockwiseFromTop = (a: UnitPoint) => {
    const t = Math.atan2(a.x, -a.y);
    return t < 0 ? t + Math.PI * 2 : t;
  };
  const ordered = [...cluster].sort((a, b) => a.ring - b.ring || clockwiseFromTop(a) - clockwiseFromTop(b));

  const positions: PegPosition[] = ordered.map((p, index) => ({
    index,
    x: p.x * spacing,
    y: p.y * spacing,
    angle: p.angle,
    ring: p.ring,
  }));

  return { diameter, radius: diameter / 2, pegSize, spacing, positions };
}

/** Neighbouring pegs (centre distance ≤ ~1.5 spacings). */
export function neighbours(layout: RoundLayout, index: number): number[] {
  const p = layout.positions[index];
  const s = layout.spacing;
  return layout.positions
    .filter((q) => q.index !== index && Math.hypot(q.x - p.x, q.y - p.y) <= s * 1.5)
    .map((q) => q.index);
}
