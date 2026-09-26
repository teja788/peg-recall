import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '../theme';

/** The two bars of a pause button. Drawn, not typed: ⏸ renders as a colour
 *  emoji on some platforms and as nothing at all on others. */
export function PauseGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={7.4} y={4.5} width={3.6} height={15} rx={1.6} fill={color} />
      <Rect x={13} y={4.5} width={3.6} height={15} rx={1.6} fill={color} />
    </Svg>
  );
}

/** A question mark for "How to play". Drawn, not typed, for the same reason as
 *  the pause bars: ❓ is a red emoji on iOS and a plain "?" is too thin to sit
 *  next to the speaker and gear. */
export function QuestionGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8.2 8.6 C8.2 6.2 10 4.6 12.2 4.6 C14.5 4.6 16.2 6.1 16.2 8.2 C16.2 10 15 10.9 13.8 11.7 C12.8 12.4 12.2 13.1 12.2 14.4 V15"
        fill="none"
        stroke={color}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12.2} cy={19.1} r={1.8} fill={color} />
    </Svg>
  );
}

/** 44 pt round button holding one glyph (speaker, gear, back…) or drawn icon. */
export function IconButton({
  glyph,
  icon,
  label,
  hint,
  onPress,
  size = 48,
  tone = 'plain',
}: {
  glyph?: string;
  /** drawn icon, used instead of `glyph` */
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  onPress: () => void;
  size?: number;
  tone?: 'plain' | 'filled';
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone === 'filled' ? t.c.card : 'transparent',
        borderWidth: tone === 'filled' ? 1 : 0,
        borderColor: t.c.line,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {icon ?? (
        <Text
          allowFontScaling={false}
          style={{ fontSize: Math.round(size * 0.46), color: t.c.text }}
        >
          {glyph}
        </Text>
      )}
    </Pressable>
  );
}

/** Pill that cycles through a list of values on tap. */
export function Chip({
  text,
  label,
  hint,
  onPress,
  selected,
}: {
  text: string;
  label?: string;
  hint?: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? text}
      accessibilityHint={hint}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: t.spacing.lg,
        justifyContent: 'center',
        borderRadius: t.radii.pill,
        backgroundColor: selected ? t.c.accent : t.c.card,
        borderWidth: 2,
        // a cream ring keeps the selected (accent-blue) chip from melting into
        // the teal backdrop it sits on
        borderColor: selected ? t.c.card : t.c.line,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ ...t.type.label, color: selected ? t.c.accentInk : t.c.text }}>{text}</Text>
    </Pressable>
  );
}

/**
 * One choice in a segmented row (board size, computer opponent).
 *
 * Laid out as a column — a picture, a name, a one-word hint — so four of them
 * still fit across a 375 pt phone. Unselected pills are translucent white so
 * the whole row reads as *options* sitting on the table; the chosen one lifts
 * onto a card surface. Nothing here is required to start a game: the row is
 * there to be noticed, not to be filled in.
 */
export function OptionPill({
  art,
  title,
  hint,
  selected,
  label,
  onPress,
}: {
  /** small drawing above the label — a board glyph or an avatar */
  art: React.ReactNode;
  title: string;
  hint?: string;
  selected: boolean;
  /** spoken name; falls back to "title, hint" */
  label?: string;
  onPress: () => void;
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const was = useRef(selected);

  // A small dip-and-settle the moment a pill becomes the chosen one. Only on
  // the transition — a pill that is merely already selected must not twitch on
  // every re-render.
  useEffect(() => {
    if (selected && !was.current && !reduced) {
      scale.value = withSequence(
        withTiming(0.96, { duration: 0 }),
        withTiming(1, { duration: 150 }),
      );
    }
    was.current = selected;
  }, [selected, reduced, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? (hint ? `${title}, ${hint}` : title)}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.75 : 1 })}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            borderRadius: t.radii.md,
            paddingVertical: t.spacing.sm,
            paddingHorizontal: t.spacing.xs,
            backgroundColor: selected ? t.c.card : 'rgba(255,255,255,0.14)',
            borderColor: selected ? t.c.accent : 'rgba(255,255,255,0.22)',
          },
          animated,
        ]}
      >
        {art}
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={{
            ...t.type.caption,
            marginTop: 3,
            color: selected ? t.c.text : t.c.onBackdrop,
          }}
        >
          {title}
        </Text>
        {/* "25 pegs" / "Tricky" is information, not decoration, so it scales
            with Dynamic Type — capped, because four pills share one row. */}
        {hint ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 11,
              lineHeight: 14,
              fontWeight: '600',
              color: selected ? t.c.textDim : t.c.onBackdropMuted,
            }}
          >
            {hint}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** Big tappable card — the three modes on Home. A tap opens "Who's playing?". */
export function ModeCard({
  title,
  subtitle,
  art,
  onPress,
  style,
}: {
  title: string;
  subtitle: string;
  /** a little board thumbnail on the left */
  art: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: t.c.card,
          borderRadius: t.radii.lg,
          borderColor: t.c.line,
          shadowColor: t.c.shadow,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <View style={{ width: 72, alignItems: 'center', justifyContent: 'center' }}>{art}</View>
      <View style={{ flex: 1, marginLeft: t.spacing.lg }}>
        <Text style={{ ...t.type.heading, color: t.c.text }}>{title}</Text>
        <Text style={{ ...t.type.caption, color: t.c.textDim, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <Text allowFontScaling={false} style={{ fontSize: 22, color: t.c.textDim }}>
        ›
      </Text>
    </Pressable>
  );
}

/** Settings row with an on/off switch rendered as a pill (no Switch import). */
export function ToggleRow({
  title,
  subtitle,
  value,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ checked: value }}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: 56,
          paddingVertical: t.spacing.md,
          paddingHorizontal: t.spacing.lg,
          borderRadius: t.radii.md,
          backgroundColor: t.c.card,
          borderWidth: 1,
          borderColor: t.c.line,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, paddingRight: t.spacing.md }}>
        <Text style={{ ...t.type.body, color: t.c.text }}>{title}</Text>
        {subtitle ? (
          <Text style={{ ...t.type.caption, color: t.c.textDim, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      <View
        style={{
          width: 56,
          height: 32,
          borderRadius: 16,
          padding: 3,
          backgroundColor: value ? t.c.accent : t.c.pegDown,
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.c.card }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  pill: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
