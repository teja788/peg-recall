/**
 * Peg Recall — the pause menu.
 *
 * Same scrim + slide-up as GameOverSheet, so stopping mid-game and finishing a
 * game feel like the same piece of furniture. Three targets only: carry on,
 * deal a fresh board, or leave.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';

export interface PauseSheetProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export function PauseSheet({ onResume, onRestart, onHome }: PauseSheetProps) {
  const t = useTheme();
  const reduced = useReducedMotion();
  // driven by hand for the same reason as GameOverSheet: `entering` does not
  // fire reliably on every target, and a menu that never appears is a dead end
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(1, {
      duration: reduced ? 140 : 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [enter, reduced]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: enter.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduced ? enter.value : 1,
    transform: [{ translateY: reduced ? 0 : (1 - enter.value) * 320 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }, scrimStyle]}>
      {/* Near-opaque on purpose: pausing during the reveal must not leave the
          face-up pegs studyable behind a light scrim. Tapping it resumes. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Resume game"
        onPress={onResume}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: t.c.backdropBottom, opacity: 0.96 },
        ]}
      />
      <Animated.View
        accessibilityViewIsModal
        style={[
          {
            backgroundColor: t.c.card,
            borderTopLeftRadius: t.radii.xl,
            borderTopRightRadius: t.radii.xl,
            padding: t.spacing.xl,
            paddingBottom: t.spacing.xxl + t.spacing.lg,
            gap: t.spacing.lg,
          },
          sheetStyle,
        ]}
      >
        <View style={{ gap: t.spacing.xs }}>
          <Text
            accessibilityRole="header"
            style={{ ...t.type.title, color: t.c.text, textAlign: 'center' }}
          >
            Paused
          </Text>
          <Text style={{ ...t.type.caption, color: t.c.textDim, textAlign: 'center' }}>
            The board is frozen — nobody is peeking.
          </Text>
        </View>

        <View style={{ gap: t.spacing.md }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resume"
            onPress={onResume}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: t.c.accent,
                borderRadius: t.radii.lg,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={{ ...t.type.heading, color: t.c.accentInk }}>Resume</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Restart"
            accessibilityHint="Deals a new board and starts over"
            onPress={onRestart}
            style={({ pressed }) => [
              styles.btn,
              {
                borderRadius: t.radii.lg,
                borderWidth: 2,
                borderColor: t.c.line,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={{ ...t.type.heading, color: t.c.text }}>Restart</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Home"
            accessibilityHint="Leaves this game and returns to the main menu"
            onPress={onHome}
            style={({ pressed }) => [
              styles.btn,
              {
                borderRadius: t.radii.lg,
                borderWidth: 2,
                borderColor: t.c.line,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={{ ...t.type.heading, color: t.c.text }}>Home</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
});

export default PauseSheet;
