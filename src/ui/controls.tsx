import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

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

/** Big tappable card — the three modes on Home. One tap starts the game. */
export function ModeCard({
  title,
  subtitle,
  glyph,
  accent,
  art,
  onPress,
  style,
}: {
  title: string;
  subtitle: string;
  glyph: string;
  accent: string;
  /** a little board thumbnail, drawn instead of the coloured glyph disc */
  art?: React.ReactNode;
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
      {art ? (
        <View style={{ width: 72, alignItems: 'center', justifyContent: 'center' }}>{art}</View>
      ) : (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text allowFontScaling={false} style={{ fontSize: 28 }}>
            {glyph}
          </Text>
        </View>
      )}
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
});
