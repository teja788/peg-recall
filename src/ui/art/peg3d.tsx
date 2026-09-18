/**
 * Peg Recall — a peg, drawn pseudo-3D.
 *
 * Viewed from slightly above: an elliptical top cap over a short cylinder with
 * a diagonal gradient down its body, plus a soft contact shadow so it looks
 * like it is standing in a hole rather than painted on the board.
 *
 * Face-down is natural wood. Face-up tints cap and body with the peg colour
 * from palette.ts. The shape glyph (accessibility) is NOT drawn here: the
 * caller overlays `<Shape/>` on the cap so it can animate independently.
 *
 * 5 prims per peg (shadow, body, cap, cap edge, highlight) + 1 gradient.
 * `PegTop` is the 3-prim, gradient-free version for when many pegs are static.
 */
import React, { useId, useMemo } from 'react';
import type { PegColor } from '../../engine/types';
import type { ArtTheme } from './palette';
import { SvgDrawing } from './renderPrims';
import { pegDrawing, pegTopDrawing } from './svgModel';

export interface Peg3DProps {
  /** Box side in points; the peg fills it. Matches `roundLayout().pegSize`. */
  size: number;
  /** Peg colour, or null for a peg whose colour is unknown to this view. */
  color: PegColor | null;
  /** true → tinted in `color`; false → natural wood, colour hidden. */
  faceUp: boolean;
  theme: ArtTheme;
}

export function Peg3D({ size, color, faceUp, theme }: Peg3DProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const drawing = useMemo(
    () => pegDrawing(size, color, faceUp, theme, uid),
    [size, color, faceUp, theme, uid],
  );
  return <SvgDrawing drawing={drawing} />;
}

export type PegTopProps = Peg3DProps;

/** Cap only, centred in the box: cheap, and right for a peg lying in a tray. */
export function PegTop({ size, color, faceUp, theme }: PegTopProps) {
  const drawing = useMemo(
    () => pegTopDrawing(size, color, faceUp, theme),
    [size, color, faceUp, theme],
  );
  return <SvgDrawing drawing={drawing} />;
}

export default Peg3D;
