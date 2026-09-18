/**
 * Color Catch — the die.
 *
 * A rounded square in the rolled peg colour, optionally carrying that colour's
 * shape glyph. Before the roll (and mid-tumble) `color` is null and the die
 * shows a calm neutral "?" face.
 */
import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import type { PegColor } from '../../engine/types';
import { NEUTRAL, PEG_GLYPH_ON, PEG_HEX, PEG_RIM } from './palette';
import { SHAPE_PATHS } from './shapes';

/** Authored in a 64x64 box. */
const VB = 64;
/** Glyph paths live in a 24-box; this centres one at 60% of the die. */
const GLYPH_SCALE = (VB * 0.6) / 24;
const GLYPH_OFFSET = (VB - VB * 0.6) / 2;

/** "?" drawn as a stroked path — see shapes.tsx on why not text. */
const QUESTION = 'M23.7 24.2 C23.7 19.4 27.4 15.8 32.2 15.8 C36.9 15.8 40.5 19.1 40.5 23.6 C40.5 29.9 32.2 30.4 32.2 37.1';

export interface DieFaceProps {
  color: PegColor | null;
  size: number;
  showShape: boolean;
}

export function DieFace({ color, size, showShape }: DieFaceProps) {
  const fill = color ? PEG_HEX[color] : NEUTRAL.board;
  const rim = color ? PEG_RIM[color] : NEUTRAL.faceDownRim;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      {/* body */}
      <Rect x={3} y={3} width={VB - 6} height={VB - 6} rx={14} fill={fill} />
      <Rect
        x={4}
        y={4}
        width={VB - 8}
        height={VB - 8}
        rx={13}
        fill="none"
        stroke={rim}
        strokeWidth={2}
        opacity={0.85}
      />
      {/* top highlight, so the die reads as a physical object */}
      <Rect x={9} y={8} width={VB - 18} height={16} rx={8} fill="#FFFFFF" opacity={0.14} />

      {color === null ? (
        <>
          <Path
            d={QUESTION}
            fill="none"
            stroke={NEUTRAL.inkSoft}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <Path
            d="M32.2 44.3a3.3 3.3 0 1 0 0-6.6a3.3 3.3 0 1 0 0 6.6Z"
            fill={NEUTRAL.inkSoft}
          />
        </>
      ) : showShape ? (
        <Path
          d={SHAPE_PATHS[color]}
          fill={PEG_GLYPH_ON[color]}
          stroke={PEG_GLYPH_ON[color]}
          strokeWidth={1.1}
          strokeLinejoin="round"
          strokeLinecap="round"
          transform={`translate(${GLYPH_OFFSET} ${GLYPH_OFFSET}) scale(${GLYPH_SCALE})`}
        />
      ) : null}
    </Svg>
  );
}

export default DieFace;
