import { Avatar, AVATAR_NAMES, TRAY_PEG_ASPECT, TrayPeg } from '@art';
import React, { memo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { PegColor, PlayerSpec } from '../engine/types';
import { useTheme } from '../theme';
import { spacing } from '../theme/tokens';
import { useReduceMotion } from './feedback';
import { playerLabel } from './names';

/**
 * The tray text scales with Dynamic Type, but only so far: three trays share
 * one row above the board, and past ~1.4x the score stops fitting beside the
 * captured pegs. Capping beats switching scaling off — the score is the whole
 * point of the tray, so it has to grow for people who need it to.
 */
const MAX_TEXT_SCALE = 1.4;

/** Card border, each side. */
const BORDER = 2;
/** Dense (three-across) spacing: card side padding, avatar-to-text gap. */
const DENSE_PAD = 6;
const DENSE_GAP = 4;

/**
 * Width of everything in a tray except its text column: border, side padding,
 * avatar and the gap after it. The game screen subtracts this from each
 * tray's share of the row to size `nameMaxWidth`, so three trays stay on one
 * line on a 375-pt phone. Must mirror the layout in `PlayerTrayImpl`.
 */
export function trayChromeWidth(size: number, scale = 1, dense = false): number {
  const px = (n: number) => Math.round(n * scale);
  return 2 * BORDER + 2 * px(dense ? DENSE_PAD : spacing.md) + size + px(dense ? DENSE_GAP : spacing.sm);
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
  /** grows the card with the board on an iPad (see BOARD_CHROME_SCALE) */
  scale?: number;
  /** reports the tray centre in window coordinates, for the capture flight */
  onAnchor?: (id: string, point: { x: number; y: number }) => void;
  /**
   * Changes whenever the tray may have moved in the window without its own
   * layout changing (a rotation, a Split View resize, the trays moving to a
   * side column): the anchor is measured again.
   */
  measureKey?: string;
  /**
   * Widest the name may draw, in points, before it ellipsizes (≈64 pt with
   * three trays across a phone, ≈100 with two — less on a 375-pt phone; see
   * `trayChromeWidth`). Unset: as wide as the name.
   */
  nameMaxWidth?: number;
  /** tighter padding and no "+n", for three trays sharing a phone-width row */
  dense?: boolean;
}

/** The drop-in a captured peg makes as it lands in the tray. */
const DROP_SPRING = { damping: 13, stiffness: 180 } as const;

/**
 * One captured peg, dropping in from just above with a small spring on mount.
 *
 * Driven by a shared value rather than a Reanimated `entering` preset: the
 * motion is a custom three-way (fade, drop, grow) spring, and layout
 * animations do not fire reliably on every target (see GameOverSheet). This
 * replaced the one `moti` view in the app.
 */
function DropIn({ offset, reduced, children }: { offset: number; reduced: boolean; children: ReactNode }) {
  const v = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) v.value = withSpring(1, DROP_SPRING);
    // mount-only: a peg lands once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, v.value),
    transform: [{ translateY: -6 * (1 - v.value) }, { scale: 0.7 + 0.3 * v.value }],
  }));
  return <Animated.View style={[{ marginRight: offset }, style]}>{children}</Animated.View>;
}

/** The row of captured pegs standing in a player's tray. */
function CapturedRow({
  colors,
  max,
  width,
  theme,
  ink,
  showExtra,
}: {
  colors: PegColor[];
  max: number;
  width: number;
  theme: 'light' | 'dark';
  ink: string;
  /** the "+n" overflow count; dense trays drop it (the score says it) */
  showExtra: boolean;
}) {
  const reduced = useReduceMotion();
  const shown = colors.slice(-max);
  const extra = colors.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', minHeight: width * TRAY_PEG_ASPECT }}>
      {/* keyed by the peg's absolute position in `colors`, not by its slot in
          the window: keying by slot makes every peg in the row a "new" peg on
          each capture, so the whole row replays the drop-in animation */}
      {shown.map((c, i) => (
        <DropIn key={colors.length - shown.length + i} offset={-width * 0.18} reduced={reduced}>
          <TrayPeg width={width} color={c} theme={theme} />
        </DropIn>
      ))}
      {showExtra && extra > 0 ? (
        <Text
          maxFontSizeMultiplier={MAX_TEXT_SCALE}
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

function PlayerTrayImpl({
  spec,
  score = 0,
  caption,
  active,
  captured,
  maxPegs = 8,
  onPress,
  size = 44,
  scale = 1,
  onAnchor,
  measureKey,
  nameMaxWidth,
  dense = false,
}: PlayerTrayProps) {
  const t = useTheme();
  const name = playerLabel(spec);
  const animal = AVATAR_NAMES[spec.avatar] ?? spec.avatar;
  /** a typed name hides the animal, so VoiceOver says it as well */
  const customName = name !== animal;
  const px = (n: number) => Math.round(n * scale);
  const captionType = {
    ...t.type.caption,
    fontSize: px(t.type.caption.fontSize),
    lineHeight: px(t.type.caption.lineHeight),
  };
  const heading = {
    ...t.type.heading,
    fontSize: px(t.type.heading.fontSize),
    lineHeight: px(t.type.heading.lineHeight),
  };
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

  // onLayout only fires when this view's own frame changes; a parent moving
  // it (the column shifting on a resize) needs a fresh measure too
  useEffect(() => {
    if (measureKey == null) return;
    const id = requestAnimationFrame(onLayout);
    return () => cancelAnimationFrame(id);
  }, [measureKey, onLayout]);

  const body = (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: t.c.card,
          borderRadius: px(t.radii.md),
          paddingVertical: px(t.spacing.sm),
          paddingHorizontal: px(dense ? DENSE_PAD : t.spacing.md),
          shadowColor: t.c.accent,
        },
        animated,
      ]}
    >
      <Avatar id={spec.avatar} size={size} />
      {/* minWidth 0 lets this column (and the name in it) shrink below its
          content width, so a long name ellipsizes instead of pushing the
          tray row onto a second line */}
      <View style={{ marginLeft: px(dense ? DENSE_GAP : t.spacing.sm), flexShrink: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 0 }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={MAX_TEXT_SCALE}
            style={{
              ...captionType,
              color: active ? t.c.accent : t.c.textDim,
              flexShrink: 1,
              minWidth: 0,
              maxWidth: nameMaxWidth,
            }}
          >
            {name}
          </Text>
          {spec.kind === 'ai' ? (
            <Text maxFontSizeMultiplier={MAX_TEXT_SCALE} style={captionType}>
              {' 🤖'}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexShrink: 1 }}>
          <Text maxFontSizeMultiplier={MAX_TEXT_SCALE} style={{ ...heading, color: t.c.text }}>
            {caption ?? score}
          </Text>
          {captured && captured.length > 0 ? (
            <View style={{ marginLeft: px(dense ? DENSE_GAP : t.spacing.sm) }}>
              <CapturedRow
                colors={captured}
                max={maxPegs}
                width={pegWidth}
                theme={t.scheme}
                ink={t.c.textDim}
                showExtra={!dense}
              />
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );

  // "Maya, fox, 3 pegs, their turn" — the animal only when a typed name hides
  // it, so the default reads "Fox, computer, 3 pegs" as before
  const who = customName ? `${name}, ${animal.toLowerCase()}` : name;
  const label = caption
    ? `${caption}, ${who}`
    : `${who}${spec.kind === 'ai' ? ', computer' : ''}, ${score} ${
        score === 1 ? 'peg' : 'pegs'
      }${active ? ', their turn' : ''}`;

  if (!onPress) {
    return (
      <View
        ref={ref}
        onLayout={onLayout}
        accessible
        accessibilityLabel={label}
        style={{ flexShrink: 1, minWidth: 0 }}
      >
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
    flexShrink: 1,
    minWidth: 0,
    borderWidth: BORDER,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});

/**
 * Memoised: the screen passes a stable spec, a stable per-player `captured`
 * array and a stable `onAnchor`, so a move re-renders only the trays whose
 * score, pegs or turn actually changed.
 */
export const PlayerTray = memo(PlayerTrayImpl);

export default PlayerTray;
