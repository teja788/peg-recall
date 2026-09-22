/**
 * Color Catch — the round board seen from a 3/4 angle (PLAN.md section 2).
 *
 * The board is a disc lying on a table: an ellipse with a visible wooden side
 * below it, a flat rim, a soft radial light on the face, a few grain arcs and
 * one shallow drilled hole per peg position. Draw it once as a background, then
 * stand `PegDoll`s on the projected hole centres, back row first.
 *
 * Placing a peg, from a `roundLayout()` position `p`:
 *
 *   const c = boardCentre(width, yScale);
 *   const q = projectHole(p.x, p.y, yScale);
 *   const a = pegDollAnchor(pegWidth);
 *   left = c.x + q.x - a.x;
 *   top  = c.y + q.y - a.y;
 *
 * Node budget: 17 fixed prims, one faint row-guide groove per shell of holes,
 * and 2 per hole, over 5 gradients — 51 prims at 16 pegs and 100 at 40. Counted
 * in src/ui/art/__tests__/nodeBudget.test.ts, along with the whole board.
 */
import React, { useId, useMemo } from 'react';
import type { ArtTheme } from './palette';
import {
  BOARD_EDGE_RATIO,
  BOARD_Y_SCALE,
  boardCentre,
  boardHeight,
  holeSizeFor,
  pegWidthFor,
  PEG_WIDTH_OF_SPACING,
  perspectiveBoardScene,
  projectHole,
} from './perspectiveModel';
import type { PerspectiveHole } from './perspectiveModel';
import { SvgScene } from './scene3d';

export {
  BOARD_Y_SCALE,
  boardCentre,
  boardHeight,
  holeSizeFor,
  pegWidthFor,
  PEG_WIDTH_OF_SPACING,
  projectHole,
  perspectiveBoardScene,
};
export type { PerspectiveHole };

export interface PerspectiveBoardProps {
  /** Width of the board in points — the long axis of the ellipse. */
  width: number;
  /** Vertical squash of the ellipse. 1 = seen from straight above. */
  yScale?: number;
  /** Thickness of the visible wooden side, in points. */
  edge?: number;
  /** Hole centres in circle space, origin at the board centre (roundLayout). */
  holes: readonly PerspectiveHole[];
  /** Hole diameter before the vertical squash; see `holeSizeFor()`. */
  holeSize: number;
  theme: ArtTheme;
}

export function PerspectiveBoard({
  width,
  yScale = BOARD_Y_SCALE,
  edge = width * BOARD_EDGE_RATIO,
  holes,
  holeSize,
  theme,
}: PerspectiveBoardProps) {
  // Unique per mounted board, so two boards cannot share gradient ids.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const scene = useMemo(
    () => perspectiveBoardScene(width, holes, holeSize, theme, yScale, edge, uid),
    [width, holes, holeSize, theme, yScale, edge, uid],
  );
  return <SvgScene scene={scene} />;
}

export default PerspectiveBoard;
