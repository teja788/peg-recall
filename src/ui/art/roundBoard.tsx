/**
 * Peg Recall — the round wooden board (PLAN.md section 2, "Board is ROUND").
 *
 * A circular board like the physical toy: warm wood face with a soft radial
 * light, a darker bevel ring inside the rim, four faint grain arcs, a low drop
 * shadow, and one shallow drilled hole per peg position.
 *
 * Draw it once as a background and position pegs on top at the same `holes`
 * coordinates — the holes are what a peg sits in, so an empty (captured) slot
 * still reads as part of the board.
 *
 * Node budget: 11 fixed prims + 2 per hole, no filters, so a 40-peg board is
 * ~91 nodes and still cheap to re-render during animations.
 */
import React, { useId, useMemo } from 'react';
import type { ArtTheme } from './palette';
import { SvgDrawing } from './renderPrims';
import { roundBoardDrawing } from './svgModel';
import type { Hole } from './svgModel';

export type { Hole } from './svgModel';

export interface RoundBoardProps {
  /** Board width and height in points. Designed to look right from 300 to 700. */
  diameter: number;
  /**
   * Hole centres in board-local points, origin at the board's TOP-LEFT corner
   * (so `roundLayout()` positions become `{ x: p.x + diameter / 2, ... }`).
   * `size` is the peg size at that hole; the hole is drilled at 0.9x of it.
   */
  holes: readonly Hole[];
  theme: ArtTheme;
}

export function RoundBoard({ diameter, holes, theme }: RoundBoardProps) {
  // Unique per mounted board, so two boards on screen cannot share gradient ids.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const drawing = useMemo(
    () => roundBoardDrawing(diameter, holes, theme, uid),
    [diameter, holes, theme, uid],
  );
  return <SvgDrawing drawing={drawing} />;
}

export default RoundBoard;
