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
import Svg, { Circle } from 'react-native-svg';

import type { PegColor } from '../engine/types';
import { roundLayout } from '../layout/roundLayout';

/** Same tilt as the game board's squat branch (`BOARD_TILT`). */
const TILT = 0.62;

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
    <View style={{ width, height: m.height, pointerEvents: 'none' }}>
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

export interface BoardGlyphProps {
  /** Width and height of the square the glyph fills. */
  size: number;
  /** How many pegs to plot — the whole point of the glyph. */
  pegs: number;
  /** Peg dots. */
  color: string;
  /** The board rim. */
  rim: string;
}

/**
 * The board seen from straight above, reduced to a rim and one dot per peg.
 * Unlike `BoardMini` this is flat and tiny on purpose: it goes inside a size
 * picker, where the only thing worth reading at a glance is how busy the
 * board gets. Same `roundLayout` as the real board, so the rings match.
 */
export function BoardGlyph({ size, pegs, color, rim }: BoardGlyphProps) {
  const m = useMemo(() => {
    const l = roundLayout(pegs, size - 2);
    return { dots: l.positions, r: Math.max(0.9, (l.pegSize / 2) * 0.82) };
  }, [pegs, size]);
  const c = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={c - 0.6} fill="none" stroke={rim} strokeWidth={1.2} />
      {m.dots.map((p) => (
        <Circle key={p.index} cx={c + p.x} cy={c + p.y} r={m.r} fill={color} />
      ))}
    </Svg>
  );
}

export default BoardMini;
