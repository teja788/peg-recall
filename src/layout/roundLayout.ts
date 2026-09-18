/**
 * Round-board peg layout.
 * Pure TypeScript, no React Native imports. Deterministic for a given peg count.
 *
 * Pegs sit on a hexagonal lattice. We take complete concentric "shells"
 * (grouped by distance from the centre) until the next shell would overflow,
 * then fill the remainder of that shell with evenly spaced points by angle,
 * so 16 / 25 / 36 / 40 pegs all form a tidy disc.
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

interface UnitPoint { x: number; y: number; dist: number; angle: number }

/** Hex-lattice points with unit spacing, out to a generous radius. */
function latticePoints(maxRadiusUnits: number): UnitPoint[] {
  const pts: UnitPoint[] = [];
  const rowH = Math.sqrt(3) / 2;
  const rows = Math.ceil(maxRadiusUnits / rowH) + 1;
  for (let r = -rows; r <= rows; r++) {
    const y = r * rowH;
    const offset = (r & 1) ? 0.5 : 0;
    const cols = Math.ceil(maxRadiusUnits) + 1;
    for (let c = -cols; c <= cols; c++) {
      const x = c + offset;
      const dist = Math.hypot(x, y);
      if (dist <= maxRadiusUnits + 1e-9) {
        pts.push({ x, y, dist, angle: Math.atan2(y, x) });
      }
    }
  }
  return pts;
}

/** Group lattice points into shells by distance (rounded to 3 decimals). */
function shells(pts: UnitPoint[]): UnitPoint[][] {
  const map = new Map<number, UnitPoint[]>();
  for (const p of pts) {
    const key = Math.round(p.dist * 1000);
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, arr]) => arr.sort((a, b) => a.angle - b.angle));
}

/** Choose `n` unit-lattice points forming a round cluster. */
export function unitCluster(n: number): UnitPoint[] {
  if (n <= 0) return [];
  const all = shells(latticePoints(Math.sqrt(n) + 2));
  const out: UnitPoint[] = [];
  for (const shell of all) {
    const need = n - out.length;
    if (need <= 0) break;
    if (shell.length <= need) {
      out.push(...shell);
    } else {
      // Partial shell: pick `need` points evenly spaced by angle.
      const m = shell.length;
      const picked = new Set<number>();
      for (let i = 0; i < need; i++) picked.add(Math.floor((i * m) / need));
      // Rotate so the gap pattern is symmetric about the vertical axis.
      const chosen = [...picked].map((i) => shell[i]);
      out.push(...chosen);
    }
  }
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

  // Stable index order: by ring, then by angle starting at 12 o'clock clockwise.
  const ringOf = new Map<number, number>();
  let ring = 0;
  let lastKey = -1;
  const sorted = [...cluster].sort((a, b) => a.dist - b.dist || a.angle - b.angle);
  for (const p of sorted) {
    const key = Math.round(p.dist * 1000);
    if (key !== lastKey) { if (lastKey !== -1) ring++; lastKey = key; }
    ringOf.set(p.x * 1000 + p.y, ring);
  }
  const clockwiseFromTop = (a: UnitPoint) => {
    // screen y grows downward; convert to angle from top, clockwise.
    const t = Math.atan2(a.x, -a.y);
    return t < 0 ? t + Math.PI * 2 : t;
  };
  const ordered = [...cluster].sort((a, b) => {
    const ra = ringOf.get(a.x * 1000 + a.y)!;
    const rb = ringOf.get(b.x * 1000 + b.y)!;
    return ra - rb || clockwiseFromTop(a) - clockwiseFromTop(b);
  });

  const positions: PegPosition[] = ordered.map((p, index) => ({
    index,
    x: p.x * spacing,
    y: p.y * spacing,
    angle: p.angle,
    ring: ringOf.get(p.x * 1000 + p.y)!,
  }));

  return { diameter, radius: diameter / 2, pegSize, spacing, positions };
}

/** Orthogonal-ish neighbours on the round board (lattice distance ≈ 1). */
export function neighbours(layout: RoundLayout, index: number): number[] {
  const p = layout.positions[index];
  const s = layout.spacing;
  return layout.positions
    .filter((q) => q.index !== index && Math.hypot(q.x - p.x, q.y - p.y) <= s * 1.05)
    .map((q) => q.index);
}
