/**
 * Color Catch — the die as a chunky isometric cube.
 *
 * `dieFace.tsx` (flat rounded square) stays the right choice for small inline
 * badges, e.g. "Owl rolled blue" in a banner. This one is the object you tap:
 * a lit top face carrying the rolled colour and its shape glyph, two darker
 * side faces, and a contact shadow, so the tumble animation has something
 * solid to rotate.
 *
 * 4 prims + 1–2 for the glyph. No gradients: flat faces keep the isometric
 * read crisp at small sizes.
 */
import React, { useMemo } from 'react';
import type { PegColor } from '../../engine/types';
import type { ArtTheme } from './palette';
import { SvgDrawing } from './renderPrims';
import { dieCubeDrawing } from './svgModel';

export interface DieCubeProps {
  /** Box side in points. Reads well from about 48 up. */
  size: number;
  /** Rolled colour, or null before the roll / mid-tumble → neutral "?" face. */
  color: PegColor | null;
  /** Draw the colour's shape glyph on the top face. */
  showShape: boolean;
  /** Only tweaks the neutral "?" ink; the cube itself is colour-driven. */
  theme?: ArtTheme;
}

export function DieCube({ size, color, showShape, theme = 'light' }: DieCubeProps) {
  const drawing = useMemo(
    () => dieCubeDrawing(size, color, showShape, theme),
    [size, color, showShape, theme],
  );
  return <SvgDrawing drawing={drawing} />;
}

export default DieCube;
