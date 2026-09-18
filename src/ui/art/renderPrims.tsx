/**
 * Color Catch — react-native-svg renderer for the drawings in svgModel.ts.
 *
 * Deliberately dumb: one `Drawing` in, one `<Svg>` out, no layout, no state.
 * Everything clever lives in svgModel.ts, which the browser preview renders
 * with the same numbers.
 */
import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import type { Drawing, Grad, Prim } from './svgModel';

/** Art never takes a tap; the board's own Pressables sit above it. */
const NO_TOUCH = { pointerEvents: 'none' } as const;

function gradient(g: Grad) {
  const stops = g.stops.map((s, i) => (
    <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
  ));
  return g.kind === 'radial' ? (
    <RadialGradient key={g.id} id={g.id} cx={g.cx} cy={g.cy} r={g.r}>
      {stops}
    </RadialGradient>
  ) : (
    <LinearGradient key={g.id} id={g.id} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
      {stops}
    </LinearGradient>
  );
}

function prim(p: Prim, key: number) {
  const common = {
    fill: p.fill ?? 'none',
    stroke: p.stroke,
    strokeWidth: p.sw,
    opacity: p.opacity,
    strokeLinecap: p.round ? ('round' as const) : undefined,
    strokeLinejoin: p.round ? ('round' as const) : undefined,
  };
  switch (p.t) {
    case 'circle':
      return <Circle key={key} cx={p.cx} cy={p.cy} r={p.r} {...common} />;
    case 'ellipse':
      return <Ellipse key={key} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} {...common} />;
    case 'path':
      return <Path key={key} d={p.d} transform={p.transform} {...common} />;
  }
}

export interface SvgDrawingProps {
  drawing: Drawing;
  /** Rendered size in points; defaults to the authored size. */
  width?: number;
  height?: number;
}

export function SvgDrawing({ drawing, width, height }: SvgDrawingProps) {
  const s = drawing.size;
  return (
    <Svg
      width={width ?? s}
      height={height ?? s}
      viewBox={`0 0 ${s} ${s}`}
      style={NO_TOUCH}
    >
      {drawing.grads.length > 0 ? <Defs>{drawing.grads.map(gradient)}</Defs> : null}
      {drawing.prims.map(prim)}
    </Svg>
  );
}

export default SvgDrawing;
