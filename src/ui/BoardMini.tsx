/**
 * Peg Recall — a thumbnail of the real board: the same tilted disc, the same
 * peg dolls, seven pegs. Static (no state, no animation) so it costs nothing to
 * put one on every card on Home, and so the very first screen already looks
 * like the game.
 */
import {
  PEG_DOLL_ASPECT,
  PegDoll,
  PerspectiveBoard,
  boardCentre,
  boardHeight,
  holeSizeFor,
  pegDollAnchor,
  pegWidthFor,
  projectHole,
  type ArtTheme,
} from '@art';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import type { PegColor } from '../engine/types';
import { roundLayout } from '../layout/roundLayout';

/** Same tilt as the game board. */
const TILT = 0.5;

export interface BoardMiniProps {
  /** Width of the disc in points. The view is ~0.82x that tall. */
  width: number;
  /** One entry per peg; `null` stands a plain wooden peg in that hole. */
  colors: (PegColor | null)[];
  theme: ArtTheme;
}

export function BoardMini({ width, colors, theme }: BoardMiniProps) {
  const m = useMemo(() => {
    const layout = roundLayout(colors.length, width);
    const pegWidth = pegWidthFor(layout.spacing);
    const centre = boardCentre(width, TILT);
    const anchor = pegDollAnchor(pegWidth);
    const boxH = pegWidth * PEG_DOLL_ASPECT;
    let top = 0;
    let bottom = boardHeight(width, TILT);
    const raw = layout.positions.map((p) => {
      const q = projectHole(p.x, p.y, TILT);
      const y = centre.y + q.y - anchor.y;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + boxH);
      return { index: p.index, left: centre.x + q.x - anchor.x, y, depth: p.y };
    });
    const overhang = -top;
    return {
      pegWidth,
      holeSize: holeSizeFor(pegWidth),
      overhang,
      height: overhang + bottom,
      holes: layout.positions.map((p) => ({ x: p.x, y: p.y })),
      pegs: raw
        .map((r) => ({ ...r, top: r.y + overhang }))
        .sort((a, b) => a.depth - b.depth || a.left - b.left),
    };
  }, [colors.length, width]);

  return (
    <View pointerEvents="none" style={{ width, height: m.height }}>
      <View style={{ position: 'absolute', left: 0, top: m.overhang }}>
        <PerspectiveBoard
          width={width}
          yScale={TILT}
          holes={m.holes}
          holeSize={m.holeSize}
          theme={theme}
        />
      </View>
      {m.pegs.map((p) => (
        <View key={p.index} style={{ position: 'absolute', left: p.left, top: p.top }}>
          <PegDoll
            width={m.pegWidth}
            color={colors[p.index] ?? null}
            faceUp={colors[p.index] != null}
            theme={theme}
          />
        </View>
      ))}
    </View>
  );
}

export default BoardMini;
