/**
 * Color Catch — react-native-svg renderer for the rectangular `Scene`s in
 * perspectiveModel.ts.
 *
 * One `Scene` in, one `<Svg>` out, in a box `w` x `h`: a tilted board is wide
 * and flat, a peg doll is tall and thin. Deliberately dumb — no layout, no
 * state, all the geometry lives in the model, which the browser preview
 * (assets/source/build-peg-preview.ts) renders with the same numbers.
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
import type { Grad, Prim, Scene } from './perspectiveModel';

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
    transform: p.transform,
    strokeLinecap: p.round ? ('round' as const) : undefined,
    strokeLinejoin: p.round ? ('round' as const) : undefined,
  };
  switch (p.t) {
    case 'circle':
      return <Circle key={key} cx={p.cx} cy={p.cy} r={p.r} {...common} />;
    case 'ellipse':
      return <Ellipse key={key} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} {...common} />;
    case 'path':
      return <Path key={key} d={p.d} {...common} />;
  }
}

export interface SvgSceneProps {
  scene: Scene;
  /** Rendered size in points; defaults to the authored box. */
  width?: number;
  height?: number;
}

export function SvgScene({ scene, width, height }: SvgSceneProps) {
  return (
    <Svg
      width={width ?? scene.w}
      height={height ?? scene.h}
      viewBox={`0 0 ${scene.w} ${scene.h}`}
      style={NO_TOUCH}
    >
      {scene.grads.length > 0 ? <Defs>{scene.grads.map(gradient)}</Defs> : null}
      {scene.prims.map(prim)}
    </Svg>
  );
}

export default SvgScene;
