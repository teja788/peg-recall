/**
 * Color Catch — a captured peg standing in a player's tray.
 *
 * Same peg doll as on the board, always face-up and never wearing a shape
 * glyph: a tray peg is a score counter, so its colour is the whole message and
 * at tray size (≈ 14–20 pt wide) a glyph would only turn to mush.
 */
import React, { useId, useMemo } from 'react';
import type { PegColor } from '../../engine/types';
import type { ArtTheme } from './palette';
import { PEG_DOLL_ASPECT, pegDollScene } from './perspectiveModel';
import { SvgScene } from './scene3d';

/** Height / width of a tray peg — the same doll, so the same ratio. */
export const TRAY_PEG_ASPECT = PEG_DOLL_ASPECT;

export interface TrayPegProps {
  /** Width of the cap in points. */
  width: number;
  color: PegColor;
  theme?: ArtTheme;
}

export function TrayPeg({ width, color, theme = 'light' }: TrayPegProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const scene = useMemo(
    () => pegDollScene(width, color, true, false, theme, uid),
    [width, color, theme, uid],
  );
  return <SvgScene scene={scene} />;
}

export default TrayPeg;
