/**
 * "Who's playing?" — the sheet between tapping a mode on Home and the game.
 *
 * Built the way the family score-keeping and pass-and-play apps do it: every
 * seat is already filled in (the last lineup, else the animal's name), so the
 * fastest path is one extra tap on Play; names typed before come back as chips,
 * so a child can pick "Maya" without the keyboard; "Play again" on the game-over
 * sheet skips this entirely.
 *
 * An overlay on Home rather than a router formSheet: on web a formSheet route
 * is a plain full page (the drawer build is still behind an unstable flag), and
 * inside a native sheet KeyboardAvoidingView measures from the sheet's top, not
 * the screen's, so the pinned Play button could end up under the keyboard. Here
 * the overlay covers the whole screen, so the keyboard maths is exact on every
 * target, and it looks and moves like the pause / game-over sheets.
 */
import { Avatar } from '@art';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AvatarId } from '../engine/types';
import {
  ANIMAL_NAME,
  BOARD_NAME,
  DIFFICULTY_LABEL,
  DIFFICULTY_TIER,
  NAME_INPUT_MAX,
  humanAvatarVsAi,
  nameToStore,
  useSettings,
  type GameMode,
} from '../store/settings';
import { useTheme } from '../theme';
import { useReduceMotion } from './feedback';
import { CHIPS_SHOWN, chipTarget, inLineup, seatLabel } from './lineup';

const SEATS: Record<GameMode, number> = { ai: 1, '2p': 2, '3p': 3 };
const MODE_TITLE: Record<GameMode, string> = {
  ai: 'vs Computer',
  '2p': '2 Players',
  '3p': '3 Players',
};
const AVATAR_SIZE = 44;
/** Past this the rows stop growing: three of them share the sheet on an SE. */
const MAX_SCALE = 1.6;
/** Wider than this the sheet stops being a bottom sheet and floats centred. */
const TABLET = 700;
const SHEET_MAX = 520;
/** How long a blurred field still counts as "the one a chip fills": on web the
 *  field loses focus on mousedown, before the chip's click lands. */
const FOCUS_GRACE_MS = 400;
/** A drag this far down (or this fast) on the header closes the sheet. */
const DISMISS_DRAG = 110;
const DISMISS_VELOCITY = 900;

export interface PlayersSheetProps {
  mode: GameMode;
  /** start the game (Home's navigation, with its double-tap latch) */
  onPlay: () => void;
  /** back to Home, nothing started */
  onClose: () => void;
}

export function PlayersSheet({ mode, onPlay, onClose }: PlayersSheetProps) {
  const t = useTheme();
  const reduced = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const tablet = width >= TABLET && height >= 600;

  const names = useSettings((s) => s.names);
  const avatars = useSettings((s) => s.avatars);
  const recentNames = useSettings((s) => s.recentNames);
  const difficulty = useSettings((s) => s.difficulty);
  const boardSize = useSettings((s) => s.boardSize);
  const setName = useSettings((s) => s.setName);
  const cycleAvatar = useSettings((s) => s.cycleAvatar);
  const rememberNames = useSettings((s) => s.rememberNames);

  const seats = SEATS[mode];
  /** The animal each seat is shown (and will play) with. */
  const shown = (seat: number): AvatarId =>
    mode === 'ai' && seat === 0 ? humanAvatarVsAi(avatars[0], difficulty) : avatars[seat];

  /* ---------------------------------------------------------- name fields */

  // What is being typed, per seat, until it is committed. A seat with no edit
  // shows its stored name, or its animal's — so while a seat is on its default
  // the text follows the animal when the avatar changes.
  const [edits, setEdits] = useState<(string | null)[]>([null, null, null]);
  const [focused, setFocused] = useState<number | null>(null);
  const lastFocus = useRef<{ seat: number; at: number } | null>(null);
  const inputs = useRef<(TextInput | null)[]>([]);
  const rowY = useRef<number[]>([]);
  const seatsY = useRef(0);
  const scroller = useRef<ScrollView>(null);

  const textFor = (seat: number) =>
    edits[seat] ?? (names[seat] || ANIMAL_NAME[shown(seat)]);

  const commit = useCallback(
    (seat: number) => {
      const raw = edits[seat];
      if (raw == null) return;
      const avatar =
        mode === 'ai' && seat === 0 ? humanAvatarVsAi(avatars[0], difficulty) : avatars[seat];
      setName(seat, nameToStore(raw, avatar));
      setEdits((e) => e.map((v, i) => (i === seat ? null : v)));
    },
    [edits, mode, avatars, difficulty, setName],
  );

  /** Every seat's name as it would be stored right now, edits included. */
  const storedNow = [0, 1, 2].map((seat) =>
    edits[seat] != null ? nameToStore(edits[seat], shown(seat)) : (names[seat] ?? ''),
  );

  const cycle = (seat: number) => {
    if (mode === 'ai') {
      const from = shown(0);
      cycleAvatar(0, { seats: 1, avoid: [difficulty], from });
    } else {
      cycleAvatar(seat, { seats });
    }
  };

  const pickChip = (name: string) => {
    const recent = lastFocus.current;
    const focus =
      focused ?? (recent && Date.now() - recent.at < FOCUS_GRACE_MS ? recent.seat : null);
    const seat = chipTarget(focus, storedNow, seats);
    if (seat < 0) return;
    // the chip replaces whatever was being typed in that seat
    setEdits((e) => e.map((v, i) => (i === seat ? null : v)));
    setName(seat, nameToStore(name, shown(seat)));
  };

  /* ------------------------------------------------------ play and close */

  const started = useRef(false);
  const play = () => {
    if (started.current) return;
    started.current = true;
    for (let seat = 0; seat < seats; seat++) {
      if (edits[seat] != null) setName(seat, nameToStore(edits[seat], shown(seat)));
    }
    setEdits([null, null, null]);
    rememberNames(seats);
    Keyboard.dismiss();
    onPlay();
  };

  const enter = useSharedValue(0);
  const drag = useSharedValue(0);
  const closing = useRef(false);

  useEffect(() => {
    enter.value = withTiming(1, {
      duration: reduced ? 140 : 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [enter, reduced]);

  const close = useCallback(() => {
    if (closing.current || started.current) return;
    closing.current = true;
    Keyboard.dismiss();
    enter.value = withTiming(0, { duration: reduced ? 120 : 200 }, (done) => {
      if (done) runOnJS(onClose)();
    });
  }, [enter, reduced, onClose]);

  // Android back, and Escape on a web keyboard, close the sheet like the ✕
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    let off: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close();
      };
      document.addEventListener('keydown', onKey);
      off = () => document.removeEventListener('keydown', onKey);
    }
    return () => {
      sub.remove();
      off?.();
    };
  }, [close]);

  // swipe the header down to dismiss, like a native sheet
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY(8)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DRAG || e.velocityY > DISMISS_VELOCITY) close();
      else drag.value = withTiming(0, { duration: 160 });
    });

  const scrimStyle = useAnimatedStyle(() => ({ opacity: enter.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduced ? enter.value : 1,
    transform: [{ translateY: (reduced ? 0 : (1 - enter.value) * 360) + drag.value }],
  }));

  /* ------------------------------------------------------------ keyboard */

  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardUp(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardUp(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  /** Bring a focused row into view once the keyboard has squeezed the list. */
  const reveal = (seat: number) => {
    setTimeout(() => {
      const y = seatsY.current + (rowY.current[seat] ?? 0) - t.spacing.sm;
      scroller.current?.scrollTo({ y: Math.max(0, y), animated: true });
    }, 280);
  };

  /* ---------------------------------------------------------------- view */

  const chips = recentNames.slice(0, CHIPS_SHOWN);
  const sectionLabel = { ...t.type.label, color: t.c.textDim } as const;
  const radius = t.radii.xl;

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, { zIndex: 10 }, scrimStyle]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        importantForAccessibility="no"
        accessibilityElementsHidden
        onPress={close}
        style={[StyleSheet.absoluteFill, { backgroundColor: t.c.scrim }]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
        style={{
          flex: 1,
          justifyContent: tablet ? 'center' : 'flex-end',
          paddingTop: insets.top + t.spacing.sm,
          paddingBottom: tablet ? insets.bottom + t.spacing.lg : 0,
          paddingHorizontal: tablet ? t.spacing.xl : 0,
        }}
      >
        <Animated.View
          style={[
            {
              width: '100%',
              maxWidth: tablet ? SHEET_MAX : undefined,
              alignSelf: 'center',
              flexShrink: 1,
              backgroundColor: t.c.card,
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
              borderBottomLeftRadius: tablet ? radius : 0,
              borderBottomRightRadius: tablet ? radius : 0,
              overflow: 'hidden',
            },
            sheetStyle,
          ]}
        >
          {/* header: grabber, title, close. Dragging it down closes the sheet. */}
          <GestureDetector gesture={pan}>
            <View style={{ paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.sm }}>
              {tablet ? null : (
                <View
                  style={{
                    alignSelf: 'center',
                    width: 40,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: t.c.line,
                    marginBottom: t.spacing.sm,
                  }}
                />
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text
                    accessibilityRole="header"
                    maxFontSizeMultiplier={1.4}
                    style={{ ...t.type.title, color: t.c.text }}
                  >
                    Who&apos;s playing?
                  </Text>
                  <Text
                    maxFontSizeMultiplier={1.4}
                    style={{ ...t.type.caption, color: t.c.textDim, marginTop: 2 }}
                  >
                    {`${MODE_TITLE[mode]} · ${BOARD_NAME[boardSize]} board`}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  accessibilityHint="Back to the home screen without starting"
                  onPress={close}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: t.c.page,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text allowFontScaling={false} style={{ fontSize: 20, color: t.c.textDim }}>
                    ✕
                  </Text>
                </Pressable>
              </View>
            </View>
          </GestureDetector>

          <ScrollView
            ref={scroller}
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{
              paddingHorizontal: t.spacing.xl,
              paddingTop: t.spacing.lg,
              paddingBottom: t.spacing.md,
              gap: t.spacing.md,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            alwaysBounceVertical={false}
            showsVerticalScrollIndicator={false}
          >
            <View
              onLayout={(e) => {
                seatsY.current = e.nativeEvent.layout.y;
              }}
              style={{
                paddingHorizontal: t.spacing.md,
                borderRadius: t.radii.md,
                backgroundColor: t.c.page,
                borderWidth: 1,
                borderColor: t.c.line,
              }}
            >
              {Array.from({ length: seats }, (_, seat) => {
                const avatar = shown(seat);
                const animal = ANIMAL_NAME[avatar];
                const last = seat === seats - 1;
                const isFocused = focused === seat;
                return (
                  <View
                    key={seat}
                    onLayout={(e) => {
                      rowY.current[seat] = e.nativeEvent.layout.y;
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: t.spacing.md,
                      paddingVertical: t.spacing.sm,
                      borderTopWidth: seat > 0 ? 1 : 0,
                      borderTopColor: t.c.line,
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={seatLabel(seat, animal, storedNow[seat])}
                      accessibilityHint="Changes to the next animal"
                      onPress={() => cycle(seat)}
                      hitSlop={6}
                      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                    >
                      <Avatar id={avatar} size={AVATAR_SIZE} />
                    </Pressable>
                    <Text
                      importantForAccessibility="no"
                      accessibilityElementsHidden
                      maxFontSizeMultiplier={1.3}
                      style={{ ...t.type.label, color: t.c.textDim, minWidth: 24 }}
                    >
                      {`P${seat + 1}`}
                    </Text>
                    <TextInput
                      ref={(el) => {
                        inputs.current[seat] = el;
                      }}
                      value={textFor(seat)}
                      onChangeText={(v) => setEdits((e) => e.map((x, i) => (i === seat ? v : x)))}
                      onFocus={() => {
                        setFocused(seat);
                        lastFocus.current = { seat, at: Date.now() };
                        reveal(seat);
                      }}
                      onBlur={() => {
                        lastFocus.current = { seat, at: Date.now() };
                        setFocused((f) => (f === seat ? null : f));
                        commit(seat);
                      }}
                      onSubmitEditing={() => {
                        commit(seat);
                        if (last) play();
                        else inputs.current[seat + 1]?.focus();
                      }}
                      selectTextOnFocus
                      accessibilityLabel={`Player ${seat + 1} name`}
                      accessibilityHint={`Leave as ${animal} or type a name`}
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoComplete="off"
                      textContentType="none"
                      spellCheck={false}
                      importantForAutofill="no"
                      returnKeyType={last ? 'go' : 'next'}
                      enterKeyHint={last ? 'go' : 'next'}
                      // "Next" keeps the keyboard up while focus moves down a
                      // row; only the last field (Go) lets it close
                      submitBehavior={last ? 'blurAndSubmit' : 'submit'}
                      // react-native-web 0.21 knows only the older prop
                      {...(Platform.OS === 'web' ? { blurOnSubmit: last } : null)}
                      maxLength={NAME_INPUT_MAX}
                      maxFontSizeMultiplier={MAX_SCALE}
                      selectionColor={t.c.accent}
                      cursorColor={t.c.accent}
                      style={{
                        ...t.type.body,
                        flex: 1,
                        minWidth: 0,
                        minHeight: 48,
                        paddingVertical: t.spacing.sm,
                        paddingHorizontal: t.spacing.md,
                        color: t.c.text,
                        backgroundColor: t.c.card,
                        borderRadius: t.radii.sm,
                        // always 2 wide so focusing only changes the colour
                        borderWidth: 2,
                        borderColor: isFocused ? t.c.accent : t.c.line,
                      }}
                    />
                  </View>
                );
              })}
            </View>

            {mode === 'ai' ? (
              <View
                accessible
                accessibilityLabel={`Against the computer: ${DIFFICULTY_LABEL[difficulty]}, ${DIFFICULTY_TIER[difficulty]}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.md,
                  paddingHorizontal: t.spacing.md,
                }}
              >
                <Text maxFontSizeMultiplier={1.4} style={sectionLabel}>
                  vs
                </Text>
                <Avatar id={difficulty} size={36} />
                <Text maxFontSizeMultiplier={1.4} style={{ ...t.type.body, color: t.c.text }}>
                  {DIFFICULTY_LABEL[difficulty]}
                </Text>
                <Text
                  maxFontSizeMultiplier={1.4}
                  style={{ ...t.type.caption, color: t.c.textDim, flex: 1, minWidth: 0 }}
                >
                  {`${DIFFICULTY_TIER[difficulty]} · change it on Home`}
                </Text>
              </View>
            ) : null}

            {chips.length > 0 ? (
              <View style={{ gap: t.spacing.sm }}>
                <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={sectionLabel}>
                  Played before
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
                  {chips.map((name) => {
                    const used = inLineup(name, storedNow, seats);
                    return (
                      <Pressable
                        key={name}
                        accessibilityRole="button"
                        accessibilityLabel={name}
                        accessibilityHint={used ? 'Already playing' : 'Puts this name on a seat'}
                        accessibilityState={{ selected: used, disabled: used }}
                        disabled={used}
                        onPress={() => pickChip(name)}
                        style={({ pressed }) => ({
                          minHeight: 44,
                          justifyContent: 'center',
                          paddingHorizontal: t.spacing.lg,
                          borderRadius: t.radii.pill,
                          borderWidth: 2,
                          borderColor: used ? t.c.accent : t.c.line,
                          backgroundColor: used ? t.c.page : t.c.card,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Text
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.4}
                          style={{ ...t.type.label, color: used ? t.c.accent : t.c.text }}
                        >
                          {used ? `✓ ${name}` : name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Text maxFontSizeMultiplier={1.4} style={{ ...t.type.caption, color: t.c.textDim }}>
                Tap an animal to change it, or a name to type your own.
              </Text>
            )}
          </ScrollView>

          {/* pinned under the list, so the keyboard pushes it up, never over it */}
          <View
            style={{
              paddingHorizontal: t.spacing.xl,
              paddingTop: t.spacing.sm,
              paddingBottom:
                tablet || keyboardUp
                  ? t.spacing.lg
                  : Math.max(insets.bottom, t.spacing.lg) + t.spacing.sm,
              borderTopWidth: 1,
              borderTopColor: t.c.line,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Play"
              accessibilityHint="Starts the game"
              onPress={play}
              style={({ pressed }) => ({
                minHeight: 56,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: t.radii.lg,
                backgroundColor: t.c.accent,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text maxFontSizeMultiplier={1.4} style={{ ...t.type.heading, color: t.c.accentInk }}>
                Play
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
