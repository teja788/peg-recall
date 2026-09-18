/**
 * Peg Recall — the wooden colour die (PLAN.md section 2, "The die is a wooden
 * cube with coloured dots").
 *
 * Drawn in the same 3/4 view as the board: a rounded block of light wood whose
 * lit top face carries the rolled colour as one big glossy pip, with a smaller
 * pip in another palette colour on each of the two visible side faces, and a
 * soft contact shadow. Before the first roll it is plain wood with an engraved
 * "?" on the top face.
 *
 * Node budget: 15 prims (9 before the first roll).
 */
import React, { useId, useMemo } from 'react';
import type { PegColor } from '../../engine/types';
import type { ArtTheme } from './palette';
import { woodDieScene } from './perspectiveModel';
import { SvgScene } from './scene3d';

export { woodDieScene };

export interface WoodDieProps {
  /** Width of the cube's bounding box in points. */
  size: number;
  /** Rolled colour, or null for the un-rolled die. */
  color: PegColor | null;
  /** Draw the colour's shape glyph on the top pip. */
  showShape?: boolean;
  theme?: ArtTheme;
}

export function WoodDie({ size, color, showShape = false, theme = 'light' }: WoodDieProps) {
  // Unique per mounted die, so two dice cannot share gradient ids.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const scene = useMemo(
    () => woodDieScene(size, color, showShape, theme, uid),
    [size, color, showShape, theme, uid],
  );
  return <SvgScene scene={scene} />;
}

export default WoodDie;
