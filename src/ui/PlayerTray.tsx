import { Avatar, AVATAR_NAMES, TRAY_PEG_ASPECT, TrayPeg } from '@art';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PegColor, PlayerSpec } from '../engine/types';
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
  /** colours of the pegs this player has taken, oldest first */
  captured?: PegColor[];
  /** how many pegs to stand in the tray before collapsing to "+n" */
  maxPegs?: number;
  /** tap to cycle the avatar (home / setup only) */
  onPress?: () => void;
  size?: number;
  /** reports the tray centre in window coordinates, for the capture flight */
  onAnchor?: (id: string, point: { x: number; y: number }) => void;
}

/** The row of captured pegs standing in a player's tray. */
function CapturedRow({
  colors,
  max,
  width,
  theme,
  ink,
}: {
  colors: PegColor[];
  max: number;
  width: number;
  theme: 'light' | 'dark';
  ink: string;
}) {
  const shown = colors.slice(-max);
  const extra = colors.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', minHeight: width * TRAY_PEG_ASPECT }}>
      {shown.map((c, i) => (
        <MotiView
          key={`${i}-${c}`}
          from={{ opacity: 0, translateY: -6, scale: 0.7 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 13, stiffness: 180 }}
          style={{ marginRight: -width * 0.18 }}
        >
          <TrayPeg width={width} color={c} theme={theme} />
        </MotiView>
      ))}
      {extra > 0 ? (
        <Text
          allowFontScaling={false}
          style={{
            fontSize: Math.max(10, Math.round(width * 0.9)),
            fontWeight: '700',
            marginLeft: 6,
            marginBottom: 2,
            color: ink,
          }}
        >
          +{extra}
        </Text>
      ) : null}
    </View>
  );
}

export function PlayerTray({
  spec,
  score = 0,
  caption,
  active,
  captured,
  maxPegs = 8,
  onPress,
  size = 44,
  onAnchor,
}: PlayerTrayProps) {
  const t = useTheme();
  const glow = useSharedValue(active ? 1 : 0);
  const ref = useRef<View>(null);
  const pegWidth = Math.max(10, Math.round(size * 0.3));

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
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexShrink: 1 }}>
          <Text style={{ ...t.type.heading, color: t.c.text }}>{caption ?? score}</Text>
          {captured && captured.length > 0 ? (
            <View style={{ marginLeft: t.spacing.sm }}>
              <CapturedRow
                colors={captured}
                max={maxPegs}
                width={pegWidth}
                theme={t.scheme}
                ink={t.c.textDim}
              />
            </View>
          ) : null}
        </View>
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
