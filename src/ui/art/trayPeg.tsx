/**
 * Color Catch — a captured peg standing in a player's tray.
 *
 * Same peg doll as on the board, always face-up and never wearing a shape
 * glyph: a tray peg is a score counter, so its colour is the whole message and
 * at tray size (≈ 14–20 pt wide) a glyph would only turn to mush.
 */
import React, { memo, useMemo } from 'react';
import type { PegColor } from '../../engine/types';
import type { ArtTheme } from './palette';
import { cachedPegDollScene } from './pegDoll';
import { PEG_DOLL_ASPECT } from './perspectiveModel';
import { SvgScene } from './scene3d';

/** Height / width of a tray peg — the same doll, so the same ratio. */
export const TRAY_PEG_ASPECT = PEG_DOLL_ASPECT;

export interface TrayPegProps {
  /** Width of the cap in points. */
  width: number;
  color: PegColor;
  theme?: ArtTheme;
}

function TrayPegImpl({ width, color, theme = 'light' }: TrayPegProps) {
  // Same cached scene as the board's dolls: a tray peg is just the face-up doll
  // at tray width, so it costs one scene build per colour, not one per peg.
  const scene = useMemo(
    () => cachedPegDollScene(width, color, true, false, theme),
    [width, color, theme],
  );
  return <SvgScene scene={scene} />;
}

export const TrayPeg = memo(TrayPegImpl);

export default TrayPeg;
