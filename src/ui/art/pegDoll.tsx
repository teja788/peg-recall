/**
 * Color Catch — the upright peg doll (PLAN.md section 2, "Peg style").
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
import React, { memo, useMemo } from 'react';
import type { PegColor } from '../../engine/types';
import type { ArtTheme } from './palette';
import {
  PEG_DOLL_ASPECT,
  PEG_DOLL_BASE_Y,
  PEG_DOLL_CAP_HEIGHT,
  PEG_DOLL_STAND_HEIGHT,
  pegDollAnchor,
  pegDollScene,
  type Scene,
} from './perspectiveModel';
import { SvgScene } from './scene3d';

export {
  PEG_DOLL_ASPECT,
  PEG_DOLL_BASE_Y,
  PEG_DOLL_CAP_HEIGHT,
  PEG_DOLL_STAND_HEIGHT,
  pegDollAnchor,
  pegDollScene,
};

/* ------------------------------------------------------------ scene cache */

/**
 * Gradient id for one doll, derived from what the gradient actually *contains*.
 *
 * A doll's three gradients (body, band, cap) are authored in objectBoundingBox
 * units, so their definitions depend only on `(color, faceUp, theme)` — not on
 * the peg's size, and not on which peg it is. Giving every mounted doll a
 * `useId()` of its own therefore produced ~200 distinct gradient definitions on
 * a 40-peg board for 14 distinct gradients, and defeated every chance of
 * sharing the built scene.
 *
 * Keying the ids by content instead is safe on native: react-native-svg
 * resolves `url(#…)` against the brushes defined inside the *same* `<Svg>` root
 * (SvgView.mDefinedBrushes), so two dolls never see each other's defs. A
 * browser does not — it takes the first element with that id in the whole
 * document, which may sit in a hidden screen and then paints nothing — so on
 * web `SvgScene` suffixes each surface's ids at render time (scene3d.tsx). The
 * shared, cached scene is untouched either way.
 */
const gradKey = (color: PegColor | null, faceUp: boolean, theme: ArtTheme) =>
  `${color && faceUp ? color : 'wood'}${theme === 'dark' ? 'D' : 'L'}`;

/**
 * Built scenes, shared by every doll that draws the same thing.
 *
 * A board hands every peg the same `width`, so this collapses 40-plus scene
 * builds per render pass (each one laying out path strings and gradient stop
 * lists) down to one per distinct look — at most 13 for a board plus its tray
 * (wood + six colours, with and without glyphs) per theme and width.
 */
const SCENES = new Map<string, Scene>();
/** A resize walks `width` through a range; don't let the cache grow forever. */
const SCENE_CACHE_MAX = 96;

/** `pegDollScene`, memoised on everything it reads. */
export function cachedPegDollScene(
  width: number,
  color: PegColor | null,
  faceUp: boolean,
  showShape: boolean,
  theme: ArtTheme,
): Scene {
  const key = `${Math.round(width * 100)}|${color ?? ''}|${faceUp ? 1 : 0}|${
    showShape ? 1 : 0
  }|${theme}`;
  const hit = SCENES.get(key);
  if (hit) return hit;
  if (SCENES.size >= SCENE_CACHE_MAX) SCENES.clear();
  const scene = pegDollScene(width, color, faceUp, showShape, theme, gradKey(color, faceUp, theme));
  SCENES.set(key, scene);
  return scene;
}

/* ------------------------------------------------------------------- doll */

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

function PegDollImpl({
  width,
  color,
  faceUp,
  showShape = false,
  theme = 'light',
}: PegDollProps) {
  const scene = useMemo(
    () => cachedPegDollScene(width, color, faceUp, showShape, theme),
    [width, color, faceUp, showShape, theme],
  );
  return <SvgScene scene={scene} />;
}

/** Memoised: a board re-renders on every pick, but a peg's art rarely changes. */
export const PegDoll = memo(PegDollImpl);

export default PegDoll;
