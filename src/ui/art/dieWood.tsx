/**
 * Peg Recall — the wooden colour die (PLAN.md section 2, "The die is a wooden
 * cube with coloured dots").
 *
 * Drawn in the same 3/4 view as the board: a lit top face carrying the rolled
 * colour as a big pip, two darker side faces each carrying a small pip, and a
 * soft contact shadow. Before the first roll it is plain wood with a faint "?".
 *
 * Node budget: 9 prims.
 */
import React, { useMemo } from 'react';
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
  const scene = useMemo(
    () => woodDieScene(size, color, showShape, theme),
    [size, color, showShape, theme],
  );
  return <SvgScene scene={scene} />;
}

export default WoodDie;
