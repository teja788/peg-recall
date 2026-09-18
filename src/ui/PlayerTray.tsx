import { Avatar, AVATAR_NAMES } from '@art';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PlayerSpec } from '../engine/types';
import { useTheme } from '../theme';

/** Display names live with the art, so a new avatar only lands in one place. */
export const AVATAR_NAME = AVATAR_NAMES;

export function playerName(spec: PlayerSpec): string {
  return spec.name ?? AVATAR_NAME[spec.avatar] ?? 'Player';
}

export interface PlayerTrayProps {
  spec: PlayerSpec;
  /** pegs taken; ignored when `caption` is given */
  score?: number;
  /** replaces the score line — used by the setup picker ("Player 1") */
  caption?: string;
  active: boolean;
  /** tap to cycle the avatar (home / setup only) */
  onPress?: () => void;
  size?: number;
  /** reports the tray centre in window coordinates, for the capture flight */
  onAnchor?: (id: string, point: { x: number; y: number }) => void;
}

export function PlayerTray({
  spec,
  score = 0,
  caption,
  active,
  onPress,
  size = 44,
  onAnchor,
}: PlayerTrayProps) {
  const t = useTheme();
  const glow = useSharedValue(active ? 1 : 0);
  const ref = useRef<View>(null);

  useEffect(() => {
    glow.value = withTiming(active ? 1 : 0, { duration: 220 });
  }, [active, glow]);

  const animated = useAnimatedStyle(() => ({
    borderColor: glow.value > 0.5 ? t.c.accent : t.c.line,
    transform: [{ scale: 1 + 0.05 * glow.value }],
    shadowOpacity: 0.28 * glow.value,
  }));

  const onLayout = useCallback(() => {
    if (!onAnchor) return;
    ref.current?.measureInWindow((x, y, w, h) =>
      onAnchor(spec.id, { x: x + w / 2, y: y + h / 2 }),
    );
  }, [onAnchor, spec.id]);

  const body = (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: t.c.card,
          borderRadius: t.radii.md,
          paddingVertical: t.spacing.sm,
          paddingHorizontal: t.spacing.md,
          shadowColor: t.c.accent,
        },
        animated,
      ]}
    >
      <Avatar id={spec.avatar} size={size} />
      <View style={{ marginLeft: t.spacing.sm }}>
        <Text
          numberOfLines={1}
          style={{ ...t.type.caption, color: active ? t.c.accent : t.c.textDim }}
        >
          {playerName(spec)}
          {spec.kind === 'ai' ? ' 🤖' : ''}
        </Text>
        <Text style={{ ...t.type.heading, color: t.c.text }}>{caption ?? score}</Text>
      </View>
    </Animated.View>
  );

  const label = caption
    ? `${caption}, ${playerName(spec)}`
    : `${playerName(spec)}${spec.kind === 'ai' ? ', computer' : ''}, ${score} ${
        score === 1 ? 'peg' : 'pegs'
      }${active ? ', their turn' : ''}`;

  if (!onPress) {
    return (
      <View ref={ref} onLayout={onLayout} accessible accessibilityLabel={label}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      ref={ref as never}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Changes this player's animal"
      onPress={onPress}
      style={{ minHeight: 44 }}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default PlayerTray;
