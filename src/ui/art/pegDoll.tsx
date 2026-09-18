/**
 * Peg Recall — the upright peg doll (PLAN.md section 2, "Peg style").
 *
 * A turned wooden stem with a domed cap on top, like the physical toy: light
 * wood on the left, shaded on the right, a colour band running down under the
 * cap when the peg is face-up, plain wood when it is face-down.
 *
 * The box is `width` wide and `width * PEG_DOLL_ASPECT` tall, with the base of
 * the peg at `pegDollAnchor(width)` — put that point on a projected hole centre
 * (see boardPerspective.tsx) and the peg stands in the hole. Pegs must be
 * painted back to front (z-sorted by projected y) so the near rows overlap the
 * far ones.
 *
 * Node budget: 5 prims face-down, 6 face-up, 7 with a shape glyph.
 */
import React, { useId, useMemo } from 'react';
import type { PegColor } from '../../engine/types';
import type { ArtTheme } from './palette';
import {
  PEG_DOLL_ANCHOR,
  PEG_DOLL_ASPECT,
  PEG_DOLL_BASE_Y,
  PEG_DOLL_CAP_HEIGHT,
  PEG_DOLL_CAP_TOP_Y,
  PEG_DOLL_STAND_HEIGHT,
  pegDollAnchor,
  pegDollScene,
} from './perspectiveModel';
import { SvgScene } from './scene3d';

export {
  PEG_DOLL_ASPECT,
  PEG_DOLL_ANCHOR,
  PEG_DOLL_BASE_Y,
  PEG_DOLL_CAP_HEIGHT,
  PEG_DOLL_CAP_TOP_Y,
  PEG_DOLL_STAND_HEIGHT,
  pegDollAnchor,
  pegDollScene,
};

export interface PegDollProps {
  /** Width of the cap — the widest point of the peg. */
  width: number;
  /** Peg colour, or null for a peg whose colour is not known to the player. */
  color: PegColor | null;
  /** Face-up: coloured cap and band. Face-down: plain wood. */
  faceUp: boolean;
  /** Draw the colour's shape glyph on the front of the cap. */
  showShape?: boolean;
  theme?: ArtTheme;
}

export function PegDoll({ width, color, faceUp, showShape = false, theme = 'light' }: PegDollProps) {
  // Unique per mounted peg: two pegs on screen must not share gradient ids.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const scene = useMemo(
    () => pegDollScene(width, color, faceUp, showShape, theme, uid),
    [width, color, faceUp, showShape, theme, uid],
  );
  return <SvgScene scene={scene} />;
}

export default PegDoll;
