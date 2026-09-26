import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';
import { useReduceMotion } from './feedback';

/**
 * Dynamic Type cap for the banner. It is one line in a pill between the trays
 * and the disc; past ~1.3x a name-bearing line ("Grandma's turn") no longer
 * fits and gets cut. The line shrinks to fit before it truncates, too.
 */
const MAX_TEXT_SCALE = 1.3;

/** One line of text that slides in whenever it changes. */
export function TurnBanner({
  text,
  tone,
  scale = 1,
}: {
  text: string;
  tone?: 'normal' | 'accent';
  /** grows the line with the board on an iPad (see BOARD_CHROME_SCALE) */
  scale?: number;
}) {
  const t = useTheme();
  const reduced = useReduceMotion();
  const [shown, setShown] = useState(text);
  const slide = useSharedValue(0);
  const fade = useSharedValue(1);
  const prev = useRef(text);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (prev.current === text) return;
    prev.current = text;
    const half = t.timing.bannerSlide / 2;
    if (reduced) {
      fade.value = withSequence(
        withTiming(0, { duration: half }),
        withTiming(1, { duration: half }),
      );
    } else {
      slide.value = withSequence(
        withTiming(-18, { duration: half, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: half, easing: Easing.out(Easing.back(1.4)) }),
      );
      fade.value = withSequence(
        withTiming(0, { duration: half }),
        withTiming(1, { duration: half }),
      );
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(text), half);
  }, [text, reduced, slide, fade, t.timing.bannerSlide]);

  const animated = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: slide.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: Math.round(28 * scale),
          // a cream pill, so the line stays legible on the teal table backdrop
          alignSelf: 'center',
          maxWidth: '94%',
          paddingHorizontal: Math.round(t.spacing.lg * scale),
          paddingVertical: Math.round(t.spacing.xs * scale),
          borderRadius: t.radii.pill,
          backgroundColor: t.c.card,
          shadowColor: t.c.shadow,
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        },
        animated,
      ]}
      // Android reads this out by itself; iOS has no live regions, so the
      // game screen speaks the same moments through useAnnouncement
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={shown}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={MAX_TEXT_SCALE}
        style={{
          ...t.type.heading,
          fontSize: Math.round(t.type.heading.fontSize * scale),
          lineHeight: Math.round(t.type.heading.lineHeight * scale),
          color: tone === 'accent' ? t.c.accent : t.c.text,
        }}
      >
        {shown}
      </Text>
    </Animated.View>
  );
}

export default TurnBanner;
