import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DieFace } from '@art';

import { PEG_COLORS, type PegColor } from '../engine/types';
import { PEG_PAINT, useTheme } from '../theme';

export interface DieProps {
  /** the colour the engine rolled, or null before the roll */
  dieColor: PegColor | null;
  /** colours still on the board — the tumble only shows reachable colours */
  colors?: PegColor[];
  canRoll: boolean;
  showShapes: boolean;
  size?: number;
  onRoll: () => void;
  onTumbleSound?: () => void;
}

export function Die({
  dieColor,
  colors,
  canRoll,
  showShapes,
  size = 92,
  onRoll,
  onTumbleSound,
}: DieProps) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const pool = colors && colors.length > 0 ? colors : [...PEG_COLORS];
  const [face, setFace] = useState<PegColor | null>(dieColor);
  const [tumbling, setTumbling] = useState(false);
  const spin = useSharedValue(0);
  const pop = useSharedValue(1);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prev = useRef<PegColor | null>(dieColor);

  useEffect(
    () => () => {
      if (interval.current) clearInterval(interval.current);
      if (settle.current) clearTimeout(settle.current);
    },
    [],
  );

  useEffect(() => {
    const was = prev.current;
    prev.current = dieColor;
    if (dieColor == null) {
      setFace(null);
      setTumbling(false);
      return;
    }
    if (was === dieColor) {
      setFace(dieColor);
      return;
    }
    // a fresh roll: 600 ms of colours going past, then it lands
    setTumbling(true);
    onTumbleSound?.();
    let i = 0;
    if (interval.current) clearInterval(interval.current);
    interval.current = setInterval(() => {
      i += 1;
      setFace(pool[i % pool.length]);
    }, 70);
    if (!reduced) {
      spin.value = withTiming(1, { duration: t.timing.dieTumble, easing: Easing.out(Easing.cubic) });
    }
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (interval.current) clearInterval(interval.current);
      interval.current = null;
      setFace(dieColor);
      setTumbling(false);
      spin.value = 0;
      pop.value = withSequence(
        withTiming(1.12, { duration: 90 }),
        withTiming(1, { duration: 140 }),
      );
    }, t.timing.dieTumble);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dieColor]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateX: `${spin.value * 720}deg` },
      { scale: pop.value },
    ],
  }));

  const paint = face ? PEG_PAINT[face] : null;
  const disabled = !canRoll || tumbling;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        tumbling
          ? 'Die rolling'
          : paint
            ? `Die shows ${paint.label}`
            : 'Roll the die'
      }
      accessibilityHint={canRoll ? 'Rolls the colour you must find' : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onRoll}
      hitSlop={12}
      style={{ opacity: canRoll || paint ? 1 : 0.55 }}
    >
      <Animated.View
        style={[
          styles.die,
          {
            width: size,
            height: size,
            borderRadius: size * 0.26,
            shadowColor: t.c.shadow,
          },
          animated,
        ]}
      >
        {face ? (
          <DieFace color={face} size={size} showShape={showShapes} />
        ) : (
          // the art layer's neutral face is cream, which glares in dark mode —
          // the un-rolled die is drawn from the theme instead
          <View
            style={[
              styles.blank,
              {
                width: size,
                height: size,
                borderRadius: size * 0.22,
                backgroundColor: t.c.pegDown,
                borderColor: t.c.line,
              },
            ]}
          >
            <Text
              allowFontScaling={false}
              style={{ fontSize: Math.round(size * 0.42), color: t.c.textDim, fontWeight: '700' }}
            >
              ?
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  blank: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  die: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});

export default Die;
