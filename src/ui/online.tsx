/**
 * Pieces the online screens share (app/online.tsx, app/join/[code].tsx,
 * app/room/[code].tsx): the page frame, the "you" row (animal + name, kept
 * in Settings like the pass-and-play names), buttons, and the words for the
 * connection's state and the server's refusals.
 */
import { Avatar } from '@art';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ConnStatus } from '../online/client';
import type { EndReason, ErrorCode } from '../online/protocol';
import { chevron, tr } from '../i18n';
import { NAME_INPUT_MAX, animalName, useSettings } from '../store/settings';
import { useTheme } from '../theme';
import { Backdrop } from './Backdrop';
import { IconButton } from './controls';

/** The column the online screens share: a back button, a title, then content. */
export function OnlineFrame({
  title,
  onBack,
  children,
  overlay,
}: {
  title: string;
  /** default: back, or Home when there is nowhere to go back to */
  onBack?: () => void;
  children: React.ReactNode;
  /** a sheet over the whole screen (the Unlock sheet) */
  overlay?: React.ReactNode;
}) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const side = Math.max(insets.left, insets.right);
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <Backdrop>
      <View style={{ paddingTop: insets.top }} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          paddingHorizontal: t.spacing.md + side,
          paddingVertical: t.spacing.sm,
        }}
      >
        <IconButton glyph={chevron('‹')} label={tr('settings.close')} onPress={back} tone="filled" />
        <Text accessibilityRole="header" style={{ ...t.type.title, color: t.c.onBackdrop, flexShrink: 1 }}>
          {title}
        </Text>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: t.spacing.lg,
          paddingHorizontal: t.spacing.lg + side,
          paddingBottom: insets.bottom + t.spacing.xxl,
          gap: t.spacing.md,
          width: '100%',
          maxWidth: 560 + 2 * t.spacing.lg,
          alignSelf: 'center',
        }}
      >
        {children}
      </ScrollView>
      {overlay}
    </Backdrop>
  );
}

/** A white card on the table, like Settings' rows. */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          padding: t.spacing.lg,
          borderRadius: t.radii.md,
          backgroundColor: t.c.card,
          borderWidth: 1,
          borderColor: t.c.line,
          gap: t.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Full-width button: filled for the main action, else a card-white one
 *  (both read on the table backdrop and on a card). */
export function WideButton({
  text,
  onPress,
  filled,
  disabled,
  hint,
}: {
  text: string;
  onPress: () => void;
  filled?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        borderRadius: t.radii.lg,
        backgroundColor: filled ? t.c.accent : t.c.card,
        borderWidth: filled ? 0 : 2,
        borderColor: t.c.line,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ ...t.type.heading, color: filled ? t.c.accentInk : t.c.text }}>{text}</Text>
    </Pressable>
  );
}

/**
 * Who you are in the room: your animal (tap for the next one) and your name,
 * both kept as seat 1 of "Who's playing?", so they are there next time.
 */
export function YouRow() {
  const t = useTheme();
  const avatar = useSettings((s) => s.avatars[0]);
  const name = useSettings((s) => s.names[0]);
  const setName = useSettings((s) => s.setName);
  const cycleAvatar = useSettings((s) => s.cycleAvatar);
  const [text, setText] = React.useState(name);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={animalName(avatar)}
        accessibilityHint={tr('players.seatHint')}
        onPress={() => cycleAvatar(0, { seats: 1 })}
        hitSlop={6}
      >
        <Avatar id={avatar} size={48} />
      </Pressable>
      <TextInput
        value={text}
        onChangeText={(v) => {
          // kept as typed here, stored cleaned at once: a tap on Create or
          // Join right after typing must not lose the name
          setText(v);
          setName(0, v);
        }}
        placeholder={animalName(avatar)}
        placeholderTextColor={t.c.textDim}
        accessibilityLabel={tr('online.yourName')}
        maxLength={NAME_INPUT_MAX}
        autoCorrect={false}
        returnKeyType="done"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 48,
          paddingHorizontal: t.spacing.md,
          borderRadius: t.radii.md,
          borderWidth: 2,
          borderColor: t.c.line,
          color: t.c.text,
          ...t.type.body,
        }}
      />
    </View>
  );
}

/** What the server said no to, in words. */
export function errorText(code: ErrorCode): string {
  switch (code) {
    case 'notFound':
    case 'full':
    case 'started':
    case 'update':
    case 'rules':
    case 'rate':
    case 'needsUnlock':
      return tr(`online.err.${code}`);
    default:
      return tr('online.err.unknown');
  }
}

/** Why this device is no longer in a room, in words. */
export function endedText(reason: EndReason): string {
  if (reason === 'removed') return tr('online.ended.removed');
  if (reason === 'serverRestart') return tr('online.ended.restart');
  return tr('online.ended.closed');
}

/** "Connecting…" / "Reconnecting…" while the line is not up; nothing once it is. */
export function StatusLine({ status }: { status: ConnStatus }) {
  const t = useTheme();
  const text =
    status === 'connecting' ? tr('online.connecting') : status === 'reconnecting' ? tr('online.reconnecting') : '';
  if (!text) return null;
  return (
    <Text accessibilityLiveRegion="polite" style={{ ...t.type.label, color: t.c.onBackdrop, textAlign: 'center' }}>
      {text}
    </Text>
  );
}

/** A note in a card: a refusal, or why a room ended. */
export function Note({ text }: { text: string }) {
  const t = useTheme();
  return (
    <Card style={{ borderColor: t.c.accent }}>
      <Text accessibilityLiveRegion="polite" style={{ ...t.type.body, color: t.c.text }}>
        {text}
      </Text>
    </Card>
  );
}

/** The name a seat shows: its typed name, else its animal's. */
export function seatName(seat: { name?: string; avatar: Parameters<typeof animalName>[0] }): string {
  return seat.name || animalName(seat.avatar);
}

