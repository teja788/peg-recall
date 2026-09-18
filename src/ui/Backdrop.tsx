/**
 * Peg Recall — the table the whole game sits on.
 *
 * One shared backdrop for Home, Game and Settings: a vertical teal gradient,
 * a faint argyle lattice so the surface has some weave to it, and a vignette
 * that darkens the edges so the middle of the screen — where the board is —
 * reads as the lit part of the table.
 *
 * The vignette only ever *darkens*. Making the centre lighter instead would
 * push the brightest pixel above the gradient's top colour, and every contrast
 * number in tokens.ts is measured against that top colour.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Svg, { Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '../theme';

/** Argyle cell, in points. */
const CELL = 36;
/** Faint enough to be texture rather than pattern. */
const PATTERN_OPACITY = 0.07;
/** How dark the corners get. */
const VIGNETTE_MAX = 0.4;

export interface BackdropProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function Backdrop({ children, style }: BackdropProps) {
  const t = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((cur) =>
      Math.abs(cur.w - width) < 0.5 && Math.abs(cur.h - height) < 0.5
        ? cur
        : { w: Math.ceil(width), h: Math.ceil(height) },
    );
  }, []);

  return (
    <View
      onLayout={onLayout}
      style={[{ flex: 1, backgroundColor: t.c.backdropBottom }, style]}
    >
      <LinearGradient
        colors={[t.c.backdropTop, t.c.backdropBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {size.w > 0 && size.h > 0 ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={size.w} height={size.h}>
            <Defs>
              <Pattern
                id="argyle"
                width={CELL}
                height={CELL}
                patternUnits="userSpaceOnUse"
              >
                <Path
                  d={`M${CELL / 2} 0 L${CELL} ${CELL / 2} L${CELL / 2} ${CELL} L0 ${CELL / 2} Z`}
                  fill="none"
                  stroke={t.c.backdropPattern}
                  strokeWidth={1.25}
                />
                <Path
                  d={`M0 0 L${CELL} ${CELL} M${CELL} 0 L0 ${CELL}`}
                  fill="none"
                  stroke={t.c.backdropPattern}
                  strokeWidth={0.6}
                />
              </Pattern>
              <RadialGradient id="vignette" cx="50%" cy="44%" rx="72%" ry="62%">
                <Stop offset="0" stopColor={t.c.backdropVignette} stopOpacity={0} />
                <Stop offset="0.6" stopColor={t.c.backdropVignette} stopOpacity={0.06} />
                <Stop offset="1" stopColor={t.c.backdropVignette} stopOpacity={VIGNETTE_MAX} />
              </RadialGradient>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={size.w}
              height={size.h}
              fill="url(#argyle)"
              opacity={PATTERN_OPACITY}
            />
            <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#vignette)" />
          </Svg>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export default Backdrop;
