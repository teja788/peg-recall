/**
 * Color Catch — the wooden colour die (PLAN.md section 2).
 *
 * Drawn in the same 3/4 view as the board, so the die reads as a cube sitting
 * on the same table. A roll is 600 ms of wobble with the colours flicking past
 * every 70 ms (plus 300 ms for each dead colour the engine had to reroll past),
 * then it lands on the rolled colour with a short bounce.
 */
import { WoodDie, type ArtTheme } from '@art';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PEG_COLORS, type PegColor } from '../engine/types';
import { PEG_PAINT, useTheme } from '../theme';

/** Height of the die art as a multiple of its width (see woodDieScene). */
const DIE_ASPECT = 0.9;
/** How far it wobbles while it tumbles. */
const WOBBLE_DEG = 25;
/** Colour flicker interval while tumbling. */
const FLICKER = 70;
/** Extra tumble per dead colour the engine rolled past. */
const REROLL_MS = 300;
/** Apple's minimum is 44; the die is the one control everybody taps. */
const TAP_MIN = 64;

export interface DieProps {
  /** the colour the engine rolled, or null before the roll */
  dieColor: PegColor | null;
  /** colours still on the board — the tumble only shows reachable colours */
  colors?: PegColor[];
  /** how many dead colours the engine rerolled past on this roll */
  rerolls?: number;
  canRoll: boolean;
  showShapes: boolean;
  size?: number;
  onRoll: () => void;
  onTumbleSound?: () => void;
}

export function Die({
  dieColor,
  colors,
  rerolls = 0,
  canRoll,
  showShapes,
  size = 96,
  onRoll,
  onTumbleSound,
}: DieProps) {
  const t = useTheme();
  const theme: ArtTheme = t.scheme;
  const reduced = useReducedMotion();
  const pool = colors && colors.length > 0 ? colors : [...PEG_COLORS];
  const [face, setFace] = useState<PegColor | null>(dieColor);
  const [tumbling, setTumbling] = useState(false);

  const wobble = useSharedValue(0);
  const scale = useSharedValue(1);
  const flicker = useRef<ReturnType<typeof setInterval> | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prev = useRef<PegColor | null>(dieColor);
  const poolRef = useRef(pool);
  poolRef.current = pool;

  const stop = useCallback(() => {
    if (flicker.current) clearInterval(flicker.current);
    if (settle.current) clearTimeout(settle.current);
    flicker.current = null;
    settle.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    const was = prev.current;
    prev.current = dieColor;
    if (dieColor == null) {
      stop();
      setFace(null);
      setTumbling(false);
      return;
    }
    if (was === dieColor) {
      setFace(dieColor);
      return;
    }

    const total = t.timing.dieTumble + REROLL_MS * Math.max(0, rerolls);
    setTumbling(true);
    onTumbleSound?.();
    stop();

    // colours flick past, only ones still reachable on the board
    let i = 0;
    flicker.current = setInterval(() => {
      i += 1;
      const p = poolRef.current;
      setFace(p[i % p.length]);
    }, FLICKER);

    if (!reduced) {
      const seg = 150;
      const reps = Math.max(1, Math.round((total - 120) / (seg * 2)));
      wobble.value = withSequence(
        withRepeat(
          withSequence(
            withTiming(1, { duration: seg, easing: Easing.inOut(Easing.quad) }),
            withTiming(-1, { duration: seg, easing: Easing.inOut(Easing.quad) }),
          ),
          reps,
          false,
        ),
        withTiming(0, { duration: 120, easing: Easing.out(Easing.cubic) }),
      );
      scale.value = withSequence(
        withTiming(0.9, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(1.05, { duration: Math.max(120, total - 220), easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
        // the landing bounce
        withTiming(1.1, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 160, easing: Easing.out(Easing.back(2.2)) }),
      );
    }

    settle.current = setTimeout(() => {
      stop();
      setFace(dieColor);
      setTumbling(false);
    }, total);
    // one run per rolled colour
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dieColor]);

  const animated = useAnimatedStyle(() =>
    reduced
      ? { transform: [] }
      : { transform: [{ rotate: `${wobble.value * WOBBLE_DEG}deg` }, { scale: scale.value }] },
  );

  const paint = face ? PEG_PAINT[face] : null;
  const disabled = !canRoll || tumbling;
  const h = size * DIE_ASPECT;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        tumbling ? 'Die rolling' : paint ? `Die shows ${paint.label}` : 'Roll the die'
      }
      accessibilityHint={canRoll ? 'Rolls the colour you must find' : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onRoll}
      hitSlop={16}
      style={{
        minWidth: TAP_MIN,
        minHeight: TAP_MIN,
        width: Math.max(TAP_MIN, size),
        height: Math.max(TAP_MIN, h),
        alignItems: 'center',
        justifyContent: 'center',
        opacity: canRoll || paint ? 1 : 0.6,
      }}
    >
      <Animated.View style={[{ width: size, height: h }, animated]}>
        <WoodDie size={size} color={face} showShape={showShapes} theme={theme} />
      </Animated.View>
    </Pressable>
  );
}

export default Die;
