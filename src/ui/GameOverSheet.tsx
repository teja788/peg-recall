import { Avatar } from '@art';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { GameState } from '../engine/types';
import { useTheme } from '../theme';
import { playerName } from './PlayerTray';

export interface GameOverSheetProps {
  state: GameState;
  onRematch: () => void;
  onHome: () => void;
}

export function GameOverSheet({ state, onRematch, onHome }: GameOverSheetProps) {
  const t = useTheme();
  const reduced = useReducedMotion();
  // driven by hand rather than by `entering`: layout animations do not fire
  // reliably on every target, and a sheet that never appears is a dead end
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(1, {
      duration: reduced ? 140 : 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [enter, reduced]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: enter.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduced ? enter.value : 1,
    transform: [{ translateY: reduced ? 0 : (1 - enter.value) * 320 }],
  }));
  const winners = state.config.players.filter((p) => state.winnerIds.includes(p.id));
  const headline =
    winners.length === 0
      ? 'Game over'
      : winners.length > 1
        ? `${winners.map(playerName).join(' and ')} share the win!`
        : `${playerName(winners[0])} wins!`;

  const ordered = [...state.config.players].sort(
    (a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0),
  );

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: t.c.scrim, justifyContent: 'flex-end' },
        scrimStyle,
      ]}
    >
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
        <Text
          accessibilityRole="header"
          style={{ ...t.type.title, color: t.c.text, textAlign: 'center' }}
        >
          {headline}
        </Text>

        <View style={{ gap: t.spacing.sm }}>
          {ordered.map((p) => {
            const won = state.winnerIds.includes(p.id);
            return (
              <View
                key={p.id}
                accessible
                accessibilityLabel={`${playerName(p)}, ${state.scores[p.id] ?? 0} pegs`}
                style={[
                  styles.row,
                  {
                    borderRadius: t.radii.md,
                    padding: t.spacing.md,
                    backgroundColor: won ? t.c.page : 'transparent',
                    borderWidth: 2,
                    borderColor: won ? t.c.accent : t.c.line,
                  },
                ]}
              >
                <Avatar id={p.avatar} size={40} />
                <Text style={{ ...t.type.body, color: t.c.text, flex: 1, marginLeft: t.spacing.md }}>
                  {playerName(p)}
                  {p.kind === 'ai' ? ' 🤖' : ''}
                </Text>
                <Text style={{ ...t.type.heading, color: won ? t.c.accent : t.c.text }}>
                  {state.scores[p.id] ?? 0}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ gap: t.spacing.md }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play again"
            onPress={onRematch}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: t.c.accent,
                borderRadius: t.radii.lg,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={{ ...t.type.heading, color: t.c.accentInk }}>Play again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to home"
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
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
});

export default GameOverSheet;
