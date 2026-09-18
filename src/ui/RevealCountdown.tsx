import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RevealCountdownProps {
  durationMs: number;
  onDone: () => void;
  size?: number;
  /** pause menu is up: the ring holds still and keeps the time it had left */
  paused?: boolean;
}

/** A ring that empties over the reveal, then hands control back to the game. */
export function RevealCountdown({
  durationMs,
  onDone,
  size = 64,
  paused = false,
}: RevealCountdownProps) {
  const t = useTheme();
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(1);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
  /** ms still to run — survives a pause, reset by a new reveal */
  const left = useRef(durationMs);
  const done = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // a new reveal (or a new board size) refills the ring
  useEffect(() => {
    done.current = false;
    left.current = durationMs;
    setSecondsLeft(Math.ceil(durationMs / 1000));
    progress.value = 1;
  }, [durationMs, progress]);

  // unmounting is final, whatever the pause state says
  useEffect(() => () => {
    done.current = true;
  }, []);

  useEffect(() => {
    if (paused) return;
    if (done.current) {
      // The ring ran out in the same instant the pause menu opened, so the
      // store refused the REVEAL_DONE it sent. We are still on screen, which
      // means the reveal never ended — ask again now the board is live.
      if (left.current <= 0) onDoneRef.current();
      return;
    }
    const total = left.current;
    const started = Date.now();

    // withTiming runs from wherever the ring was frozen down to empty, so the
    // remaining sweep and the remaining seconds stay in step after a pause
    progress.value = withTiming(0, { duration: total, easing: Easing.linear });

    setSecondsLeft(Math.ceil(total / 1000));
    tick.current = setInterval(() => {
      setSecondsLeft(Math.ceil(Math.max(0, total - (Date.now() - started)) / 1000));
    }, 250);

    timeout.current = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      left.current = 0;
      onDoneRef.current();
    }, total);

    return () => {
      if (timeout.current) clearTimeout(timeout.current);
      if (tick.current) clearInterval(tick.current);
      left.current = Math.max(0, total - (Date.now() - started));
      cancelAnimation(progress);
    };
  }, [paused, durationMs, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityLabel={`Memorise the board. ${secondsLeft} seconds left`}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* a cream token on the table, so the ring never sits on bare backdrop */}
        <Circle cx={size / 2} cy={size / 2} r={r + stroke / 2} fill={t.c.card} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={t.c.line}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={t.c.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ ...t.type.heading, color: t.c.text }}>{secondsLeft}</Text>
    </View>
  );
}

export default RevealCountdown;
