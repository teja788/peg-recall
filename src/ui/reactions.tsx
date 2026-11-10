/**
 * Reactions in an online room: a 💬 button that opens a drawer of preset emoji
 * and phrases (protocol.ts REACTION_*), and the bubbles they become on every
 * screen. Only ids travel, so each device shows a phrase in its own language,
 * and nobody can type anything. Bubbles animate transform and opacity only, on
 * the UI thread, take no taps, and at most three are on screen at once.
 */
import { Avatar } from '@art';
import React from 'react';
import { AccessibilityInfo, Modal, Pressable, Text, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '../i18n';
import { REACTION_EMOJI, REACTION_PHRASES, REACT_COOLDOWN_MS, type ReactionId, type SeatInfo } from '../online/protocol';
import { count } from '../store/analytics';
import { useRoom } from '../store/room';
import { useSettings } from '../store/settings';
import { useTheme } from '../theme';
import { Chip, IconButton } from './controls';
import { useReduceMotion } from './feedback';
import { seatName } from './online';

const SHOW_MS = 1900;
const MAX_BUBBLES = 3;

function reactionText(id: ReactionId): string {
  return id in REACTION_EMOJI ? REACTION_EMOJI[id as keyof typeof REACTION_EMOJI] : tr(`react.${id}` as 'react.hi');
}

/** The 💬 button and its drawer. Dimmed while the last reaction cools down. */
export function ReactButton({ size = 48 }: { size?: number }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = React.useState(false);
  const [cooling, setCooling] = React.useState(false);
  const room = useRoom((s) => s.room);
  const seat = useRoom((s) => s.seat);
  const muted = useRoom((s) => s.muted);
  const others = room?.seats.filter((x) => x.kind === 'human' && x.id !== seat) ?? [];

  const send = (id: ReactionId) => {
    setOpen(false);
    if (!useRoom.getState().react(id)) return;
    count({ react: 1 });
    setCooling(true);
    setTimeout(() => setCooling(false), REACT_COOLDOWN_MS);
  };

  return (
    <>
      <View style={{ opacity: cooling ? 0.45 : 1 }}>
        <IconButton glyph="💬" label={tr('react.button')} onPress={() => setOpen(true)} size={size} tone="filled" />
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('common.close')}
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', paddingTop: insets.top + 72, alignItems: 'center' }}
        >
          {/* a Pressable of its own, so taps inside the card do not close it */}
          <Pressable
            accessibilityViewIsModal
            onPress={() => {}}
            style={{
              width: '92%',
              maxWidth: 420,
              padding: t.spacing.lg,
              gap: t.spacing.md,
              borderRadius: t.radii.lg,
              backgroundColor: t.c.card,
            }}
          >
            <Text accessibilityRole="header" style={{ ...t.type.heading, color: t.c.text, textAlign: 'center' }}>
              {tr('react.title')}
            </Text>
            {/* one row of six on a 320-pt phone: 6 × 44 + 5 × 4 */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
              {(Object.keys(REACTION_EMOJI) as (keyof typeof REACTION_EMOJI)[]).map((id) => (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={tr(`react.e.${id}`)}
                  onPress={() => send(id)}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pressed ? t.c.line : 'transparent',
                  })}
                >
                  <Text style={{ fontSize: 28 }}>{REACTION_EMOJI[id]}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: t.spacing.sm }}>
              {REACTION_PHRASES.map((id) => (
                <Chip key={id} text={tr(`react.${id}`)} onPress={() => send(id)} />
              ))}
            </View>
            {others.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: t.spacing.sm }}>
                {others.map((x) => {
                  const off = muted.includes(x.id);
                  return (
                    <Chip
                      key={x.id}
                      text={`${off ? '🔕' : '🔔'} ${tr(off ? 'react.unmute' : 'react.mute', { name: seatName(x) })}`}
                      selected={off}
                      onPress={() => useRoom.getState().toggleMute(x.id)}
                    />
                  );
                })}
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type Shown = { n: number; seat: SeatInfo; id: ReactionId };

/** The bubbles, stacked under the 💬 button on its side of the screen
 *  (`inset` from that edge), newest at the bottom. */
export function ReactionBubbles({ top, side, inset }: { top: number; side: 'left' | 'right'; inset: number }) {
  const last = useRoom((s) => s.lastReaction);
  const room = useRoom((s) => s.room);
  const me = useRoom((s) => s.seat);
  const muted = useRoom((s) => s.muted);
  const on = useSettings((s) => s.reactionsOn);
  const [shown, setShown] = React.useState<Shown[]>([]);
  /** what had already arrived when this screen opened: never replayed */
  const seen = React.useRef(last?.n ?? 0);

  React.useEffect(() => {
    if (!last || last.n <= seen.current) return;
    seen.current = last.n;
    const seat = room?.seats.find((x) => x.id === last.seat);
    // own reactions always show (they went out); others' only when wanted
    if (!seat || (last.seat !== me && (!on || muted.includes(last.seat)))) return;
    setShown((list) => [...list, { ...last, seat }].slice(-MAX_BUBBLES));
    const timer = setTimeout(() => setShown((list) => list.filter((x) => x.n !== last.n)), SHOW_MS);
    if (last.seat !== me) {
      AccessibilityInfo.announceForAccessibility(tr('react.said', { name: seatName(seat), text: reactionText(last.id) }));
    }
    return () => clearTimeout(timer);
    // a new reaction is a new `n`; room/mute changes alone show nothing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.n]);

  if (!shown.length) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        [side]: inset,
        maxWidth: '78%',
        alignItems: side === 'left' ? 'flex-start' : 'flex-end',
        gap: 6,
      }}
    >
      {shown.map((x) => (
        <Bubble key={x.n} seat={x.seat} id={x.id} />
      ))}
    </View>
  );
}

function Bubble({ seat, id }: { seat: SeatInfo; id: ReactionId }) {
  const t = useTheme();
  const reduced = useReduceMotion();
  const v = useSharedValue(0);
  React.useEffect(() => {
    v.value = withSequence(
      withTiming(1, { duration: reduced ? 120 : 220, easing: Easing.out(Easing.back(1.6)) }),
      withDelay(SHOW_MS - 600, withTiming(2, { duration: 280, easing: Easing.in(Easing.quad) })),
    );
  }, [v, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 1, 2], [0, 1, 0]),
    transform: reduced
      ? []
      : [
          { translateY: interpolate(v.value, [0, 1, 2], [10, 0, -14]) },
          { scale: interpolate(v.value, [0, 1, 2], [0.8, 1, 1]) },
        ],
  }));
  const emoji = id in REACTION_EMOJI;
  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 6,
          paddingLeft: 6,
          paddingRight: 14,
          borderRadius: 999,
          backgroundColor: t.c.card,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
        style,
      ]}
    >
      <Avatar id={seat.avatar} size={28} />
      <Text numberOfLines={1} style={{ ...t.type.body, color: t.c.text, flexShrink: 1 }}>
        <Text style={{ fontWeight: '700' }}>{seatName(seat)}</Text>
        {'  '}
        <Text style={emoji ? { fontSize: 22 } : undefined}>{reactionText(id)}</Text>
      </Text>
    </Animated.View>
  );
}
