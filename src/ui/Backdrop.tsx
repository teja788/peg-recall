/**
 * Color Catch — the table the whole game sits on.
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
import { Platform, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Svg, { Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '../theme';

/** Argyle cell, in points. */
const CELL = 36;
/** Faint enough to be texture rather than pattern. */
const PATTERN_OPACITY = 0.07;
/** How dark the corners get. */
const VIGNETTE_MAX = 0.4;

/**
 * Web: the lattice and vignette as one <img>, not inline SVG. Inline, Chrome
 * re-rasterised the pattern under every moving peg, and a budget Samsung
 * (Nov 2026) painted noise blocks and left stale peg pieces on the board.
 */
function webBackdrop(w: number, h: number, pattern: string, vignette: string) {
  const d = (CELL / 2).toString();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<defs><pattern id="a" width="${CELL}" height="${CELL}" patternUnits="userSpaceOnUse">` +
    `<path d="M${d} 0 L${CELL} ${d} L${d} ${CELL} L0 ${d} Z" fill="none" stroke="${pattern}" stroke-width="1.25"/>` +
    `<path d="M0 0 L${CELL} ${CELL} M${CELL} 0 L0 ${CELL}" fill="none" stroke="${pattern}" stroke-width="0.6"/>` +
    `</pattern><radialGradient id="v" cx="50%" cy="44%" rx="72%" ry="62%">` +
    `<stop offset="0" stop-color="${vignette}" stop-opacity="0"/>` +
    `<stop offset="0.6" stop-color="${vignette}" stop-opacity="0.06"/>` +
    `<stop offset="1" stop-color="${vignette}" stop-opacity="${VIGNETTE_MAX}"/>` +
    `</radialGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#a)" opacity="${PATTERN_OPACITY}"/>` +
    `<rect width="${w}" height="${h}" fill="url(#v)"/></svg>`;
  return React.createElement('img', {
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    alt: '',
    draggable: false,
    style: { position: 'absolute', top: 0, left: 0, width: w, height: h, pointerEvents: 'none', userSelect: 'none' },
  });
}

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
      {size.w > 0 && size.h > 0 && Platform.OS === 'web' ? (
        webBackdrop(size.w, size.h, t.c.backdropPattern, t.c.backdropVignette)
      ) : size.w > 0 && size.h > 0 ? (
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
