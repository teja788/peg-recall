/**
 * Color Catch — peg shape glyphs.
 *
 * One glyph per peg colour so the board stays readable with "Differentiate
 * Without Colour" on, or for anyone whose colour vision makes two pegs blur
 * together. Mapping is fixed by PLAN.md section 4:
 *
 *   orange ●   sky ▲   blue ■   green ★   yellow ♥   purple ◆
 *
 * Drawn as real paths, never text: font glyph metrics differ across iOS
 * versions and would drift off-centre.
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { PegColor } from '../../engine/types';
import { SHAPE_PATHS, SHAPE_VIEWBOX } from './shapePaths';

export { SHAPE_PATHS, SHAPE_VIEWBOX } from './shapePaths';

export interface ShapeProps {
  color: PegColor;
  size: number;
  fill: string;
}

/**
 * The glyph for one peg colour, filling a `size` x `size` square.
 * The same-colour stroke rounds off the sharp corners of the triangle,
 * star and diamond so nothing looks spiky next to the round pegs.
 */
export function Shape({ color, size, fill }: ShapeProps) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${SHAPE_VIEWBOX} ${SHAPE_VIEWBOX}`}>
      <Path
        d={SHAPE_PATHS[color]}
        fill={fill}
        stroke={fill}
        strokeWidth={1.1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default Shape;
