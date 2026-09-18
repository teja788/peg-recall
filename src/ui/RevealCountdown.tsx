import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
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
}

/** A ring that empties over the reveal, then hands control back to the game. */
export function RevealCountdown({ durationMs, onDone, size = 64 }: RevealCountdownProps) {
  const t = useTheme();
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(1);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
  const done = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    done.current = false;
    progress.value = 1;
    progress.value = withTiming(0, { duration: durationMs, easing: Easing.linear });

    const started = Date.now();
    setSecondsLeft(Math.ceil(durationMs / 1000));
    tick.current = setInterval(() => {
      const left = Math.max(0, durationMs - (Date.now() - started));
      setSecondsLeft(Math.ceil(left / 1000));
    }, 250);

    timeout.current = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      onDoneRef.current();
    }, durationMs);

    return () => {
      done.current = true;
      if (timeout.current) clearTimeout(timeout.current);
      if (tick.current) clearInterval(tick.current);
    };
  }, [durationMs, progress]);

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
