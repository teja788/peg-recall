import React, { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Shape } from '@art';

import type { Peg as PegModel } from '../engine/types';
import { PEG_PAINT, shapeInkFor, useTheme } from '../theme';

export interface PegProps {
  peg: PegModel;
  size: number;
  row: number;
  col: number;
  /** face-up = reveal phase, a peg just picked, or a peg mid-capture */
  faceUp: boolean;
  showShapes: boolean;
  disabled: boolean;
  /** stagger for the flip-down wave (ms) */
  delay?: number;
  /** board-local vector to the winner's tray, for the capture flight */
  flyTo?: { x: number; y: number } | null;
  onPress?: (index: number) => void;
}

function PegImpl({
  peg,
  size,
  row,
  col,
  faceUp,
  showShapes,
  disabled,
  delay = 0,
  flyTo,
  onPress,
}: PegProps) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const paint = PEG_PAINT[peg.color];
  const captured = peg.state === 'captured';

  const flip = useSharedValue(faceUp ? 1 : 0);
  const fly = useSharedValue(captured ? 1 : 0);
  const press = useSharedValue(0);

  // the stagger only matters at the instant the peg turns over, so it is read
  // through a ref — a changing `delay` prop must never restart a live flip
  const delayRef = useRef(delay);
  delayRef.current = delay;

  useEffect(() => {
    flip.value = withDelay(
      delayRef.current,
      withTiming(faceUp ? 1 : 0, {
        duration: reduced ? 180 : t.timing.flip,
        easing: Easing.inOut(Easing.cubic),
      }),
    );
  }, [faceUp, reduced, flip, t.timing.flip]);

  useEffect(() => {
    if (!captured) return;
    // flip (250) finishes, then the peg flies to the tray (400)
    fly.value = withDelay(
      reduced ? 250 : t.timing.flip,
      withTiming(1, { duration: 400, easing: Easing.in(Easing.quad) }),
    );
  }, [captured, reduced, fly, t.timing.flip]);

  const outer = useAnimatedStyle(() => {
    const f = fly.value;
    const dx = (flyTo?.x ?? 0) * f;
    const dy = (flyTo?.y ?? -120) * f;
    return {
      opacity: 1 - f,
      transform: [
        { translateX: dx },
        { translateY: dy },
        { scale: (1 - 0.55 * f) * (1 - 0.06 * press.value) },
      ],
    };
  });

  const back = useAnimatedStyle(() =>
    reduced
      ? { opacity: 1 - flip.value }
      : {
          opacity: 1,
          transform: [{ perspective: 600 }, { rotateY: `${flip.value * 180}deg` }],
        },
  );

  const front = useAnimatedStyle(() =>
    reduced
      ? { opacity: flip.value }
      : {
          opacity: 1,
          transform: [{ perspective: 600 }, { rotateY: `${180 + flip.value * 180}deg` }],
        },
  );

  const label = captured
    ? 'taken'
    : faceUp
      ? paint.label
      : 'hidden';

  const glyph = Math.max(12, Math.round(size * 0.42));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Row ${row + 1} column ${col + 1}, ${label}`}
      accessibilityState={{ disabled: disabled || captured }}
      disabled={disabled || captured}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 120 });
      }}
      onPress={() => onPress?.(peg.index)}
      style={{ width: size, height: size }}
      hitSlop={size < 44 ? Math.ceil((44 - size) / 2) : 0}
    >
      {/* the hole the peg sits in — visible once the peg is gone */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            backgroundColor: t.c.pegHole,
            borderWidth: 1,
            borderColor: t.scheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(43,38,34,0.08)',
          },
        ]}
      />
      <Animated.View style={[StyleSheet.absoluteFill, outer]} pointerEvents="none">
        {/* face down */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.face,
            {
              borderRadius: size / 2,
              backgroundColor: t.c.pegDown,
              borderColor: t.scheme === 'dark' ? '#4A4239' : '#C6BBAA',
            },
            back,
          ]}
        />
        {/* face up */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.face,
            {
              borderRadius: size / 2,
              backgroundColor: paint.fill,
              borderColor: paint.rim,
            },
            front,
          ]}
        >
          {showShapes ? (
            <Shape color={peg.color} size={glyph} fill={shapeInkFor(peg.color)} />
          ) : null}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backfaceVisibility: 'hidden',
  },
});

export const Peg = memo(PegImpl);
export default Peg;
