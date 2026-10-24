import { Avatar } from '@art';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GameState, PlayerSpec } from '../engine/types';
import { tr, trn } from '../i18n';
import { dailyMilestone, useStats } from '../store/stats';
import { remindersSupported, turnOnReminders } from '../store/reminders';
import { useSettings } from '../store/settings';
import { useTheme } from '../theme';
import { useReduceMotion } from './feedback';
import { isolate, playerLabel } from './names';
import { headlineFor, resultOf, shareText } from './shareText';
import { PillButton } from './StatsCard';

export interface UpsellCardProps {
  title: string;
  line: string;
  /** the primary button: opens the Unlock sheet, or starts a free try */
  action: string;
  onAction: () => void;
  /** "Not now": the card goes, the sheet stays */
  onDismiss: () => void;
}

export interface GameOverSheetProps {
  state: GameState;
  /** the daily board's number, when this was it (the share says so) */
  daily?: number;
  onRematch: () => void;
  onHome: () => void;
  /** at most one gentle card under the buttons (see `upsellCard`) */
  upsell?: UpsellCardProps;
}

/**
 * The words at the top of the sheet. Exported so the game screen can have
 * VoiceOver say exactly what the sheet shows.
 *
 * A sudden-death finish gets its own line: the main-board scores are level by
 * definition, so "Fox wins!" over two equal numbers read as a bug.
 */
export function gameOverHeadline(state: GameState): string {
  const winners = state.config.players.filter((p) => state.winnerIds.includes(p.id));
  return headlineFor(winners.map(playerLabel), state.suddenDeath);
}

/**
 * The system share sheet (WhatsApp on top on iOS). On the web it is
 * navigator.share; a browser without it gets WhatsApp's own link instead.
 */
export async function shareMessage(message: string): Promise<void> {
  try {
    await Share.share({ message });
  } catch (e) {
    if (Platform.OS !== 'web' || (e as { name?: string })?.name === 'AbortError') return;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).catch(() => {});
  }
}

/** The seats that played the sudden-death board, or [] if there was none. */
function suddenDeathPlayers(state: GameState): PlayerSpec[] {
  if (!state.suddenDeath) return [];
  const seats = state.activeSeats ?? state.config.players.map((_, i) => i);
  return seats.map((i) => state.config.players[i]).filter((p): p is PlayerSpec => p != null);
}

/**
 * "Tied on 12 pegs. Sudden death: Maya 1, Leo 0." — the tie that forced the
 * mini board, and its tally, for the players who played it. Null otherwise.
 */
export function suddenDeathLine(state: GameState): string | null {
  const tied = suddenDeathPlayers(state);
  if (tied.length === 0) return null;
  const main = state.scores[tied[0].id] ?? 0;
  const sd = state.suddenDeathScores ?? {};
  const tally = tied.map((p) => `${isolate(playerLabel(p))} ${sd[p.id] ?? 0}`).join(tr('list.sep'));
  return trn('over.tied', main, { tally });
}

/** A quiet card inside the sheet: never a popup, never in the way of Play again. */
function UpsellCard({ title, line, action, onAction, onDismiss }: UpsellCardProps) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.c.page,
        borderRadius: t.radii.md,
        borderWidth: 1,
        borderColor: t.c.line,
        padding: t.spacing.lg,
        gap: t.spacing.sm,
      }}
    >
      <Text accessibilityRole="header" style={{ ...t.type.label, color: t.c.text }}>
        {title}
      </Text>
      <Text style={{ ...t.type.caption, color: t.c.textDim }}>{line}</Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: t.spacing.md,
          marginTop: t.spacing.xs,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          onPress={onAction}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: t.spacing.lg,
            borderRadius: t.radii.pill,
            backgroundColor: t.c.accent,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ ...t.type.label, color: t.c.accentInk }}>{action}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('upsell.notNow')}
          onPress={onDismiss}
          hitSlop={8}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: t.spacing.sm,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ ...t.type.label, color: t.c.textDim }}>{tr('upsell.notNow')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** "🔥 7 days in a row!" under the headline, on the day a daily streak reaches 3, 7, 14 or 30. */
function StreakMoment({ daily }: { daily: number }) {
  const t = useTheme();
  const reduced = useReduceMotion();
  const n = useStats((s) => dailyMilestone(s.daily, daily));
  const pop = useSharedValue(0);
  useEffect(() => {
    if (n == null) return;
    pop.value = withDelay(320, reduced ? withTiming(1, { duration: 200 }) : withSpring(1, { damping: 9, stiffness: 140 }));
  }, [n, pop, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value),
    transform: [{ scale: reduced ? 1 : 0.6 + 0.4 * pop.value }],
  }));
  if (n == null) return null;
  return (
    <Animated.Text
      accessibilityLiveRegion="polite"
      style={[{ ...t.type.body, color: t.c.accent, fontWeight: '700', textAlign: 'center' }, style]}
    >
      {`🔥 ${trn('daily.inARow', n)}`}
    </Animated.Text>
  );
}

/** "Remind me tomorrow?": asks iOS only on the tap. Shown once ever. */
function ReminderOffer() {
  const t = useTheme();
  const [answer, setAnswer] = useState<boolean | null>(null);
  const text = answer == null ? tr('reminder.ask') : tr(answer ? 'reminder.on' : 'reminder.blocked');
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.spacing.md,
      }}
    >
      <Text style={{ ...t.type.body, color: t.c.text, flexShrink: 1 }}>{text}</Text>
      {answer == null ? (
        <PillButton text={tr('reminder.yes')} filled onPress={() => void turnOnReminders().then(setAnswer)} />
      ) : null}
    </View>
  );
}

export function GameOverSheet({ state, daily, onRematch, onHome, upsell }: GameOverSheetProps) {
  const t = useTheme();
  const reduced = useReduceMotion();
  const insets = useSafeAreaInsets();
  // driven by hand rather than by `entering`: layout animations do not fire
  // reliably on every target, and a sheet that never appears is a dead end
  const enter = useSharedValue(0);
  const playAgain = useRef<View>(null);
  // decided as the sheet opens, so marking the offer as shown keeps it up
  const [offerReminder] = useState(
    () => daily != null && remindersSupported && !useSettings.getState().reminderAsked,
  );

  useEffect(() => {
    if (daily == null) return;
    // the next reminders come at this time of day (see `reminderPlan`)
    const s = useSettings.getState();
    s.set('lastDailyAt', Date.now());
    if (offerReminder) s.set('reminderAsked', true);
    // once per finished board: the sheet mounts at game over
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** "Not now": the card goes, and VoiceOver lands on Play again rather than
   *  wherever iOS puts it when the focused button disappears */
  const dismiss = () => {
    upsell?.onDismiss();
    setTimeout(() => {
      const el = playAgain.current;
      if (!el) return;
      if (Platform.OS === 'web') (el as unknown as HTMLElement).focus?.();
      else AccessibilityInfo.sendAccessibilityEvent(el, 'focus');
    }, 50);
  };

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

  const headline = gameOverHeadline(state);
  const tieLine = suddenDeathLine(state);
  const sd = state.suddenDeathScores ?? {};
  const tiedIds = new Set(suddenDeathPlayers(state).map((p) => p.id));

  // main-board score first; on a sudden-death finish the tie-break decides
  // the order among the tied players, so the winner is always on top
  const ordered = [...state.config.players].sort(
    (a, b) =>
      (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0) ||
      (tiedIds.has(b.id) ? (sd[b.id] ?? 0) : 0) - (tiedIds.has(a.id) ? (sd[a.id] ?? 0) : 0),
  );

  return (
    // Modal for VoiceOver on the OUTER overlay, so nothing behind the scrim
    // (the board, the trays, the pause button) can be swiped to.
    <Animated.View
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: t.c.scrim,
          justifyContent: 'flex-end',
          paddingTop: insets.top + 8,
        },
        scrimStyle,
      ]}
    >
      <Animated.View
        style={[
          {
            backgroundColor: t.c.card,
            borderTopLeftRadius: t.radii.xl,
            borderTopRightRadius: t.radii.xl,
            flexShrink: 1,
            overflow: 'hidden',
          },
          sheetStyle,
        ]}
      >
        {/* scrolls only when it has to: three rows and two buttons outgrow an
            SE at the largest text sizes */}
        <ScrollView
          style={{ flexGrow: 0, flexShrink: 1 }}
          contentContainerStyle={{
            // a full-width row of buttons across an iPad in landscape reads
            // as a banner, not a menu: the content keeps a phone-ish measure
            width: '100%',
            maxWidth: 600,
            alignSelf: 'center',
            padding: t.spacing.xl,
            paddingBottom: t.spacing.xxl + t.spacing.lg,
            gap: t.spacing.lg,
          }}
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: t.spacing.xs }}>
            <Text
              accessibilityRole="header"
              style={{ ...t.type.title, color: t.c.text, textAlign: 'center' }}
            >
              {headline}
            </Text>
            {tieLine ? (
              <Text style={{ ...t.type.caption, color: t.c.textDim, textAlign: 'center' }}>
                {tieLine}
              </Text>
            ) : null}
            {daily != null ? <StreakMoment daily={daily} /> : null}
          </View>

          <View style={{ gap: t.spacing.sm }}>
            {ordered.map((p) => {
              const won = state.winnerIds.includes(p.id);
              const name = playerLabel(p);
              const score = state.scores[p.id] ?? 0;
              const tieBreak = tiedIds.has(p.id);
              return (
                <View
                  key={p.id}
                  accessible
                  accessibilityLabel={[
                    name,
                    p.kind === 'ai' ? tr('common.computer') : null,
                    trn('pegs', score),
                    tieBreak ? tr('over.inSudden', { n: sd[p.id] ?? 0 }) : null,
                    won ? tr('over.winner') : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
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
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                      ...t.type.body,
                      color: t.c.text,
                      flex: 1,
                      minWidth: 0,
                      marginStart: t.spacing.md,
                    }}
                  >
                    {name}
                    {p.kind === 'ai' ? ' 🤖' : ''}
                  </Text>
                  {tieBreak ? (
                    <Text
                      numberOfLines={1}
                      style={{
                        ...t.type.caption,
                        color: t.c.textDim,
                        marginHorizontal: t.spacing.sm,
                      }}
                    >
                      {tr('over.suddenBadge', { n: sd[p.id] ?? 0 })}
                    </Text>
                  ) : null}
                  <Text style={{ ...t.type.heading, color: won ? t.c.accent : t.c.text }}>
                    {score}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={{ gap: t.spacing.md }}>
            <Pressable
              ref={playAgain}
              accessibilityRole="button"
              accessibilityLabel={tr('over.playAgain')}
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
              <Text style={{ ...t.type.heading, color: t.c.accentInk }}>{tr('over.playAgain')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('share.button')}
              onPress={() => void shareMessage(shareText({ ...resultOf(state), daily }))}
              style={({ pressed }) => [
                styles.btn,
                {
                  borderRadius: t.radii.lg,
                  borderWidth: 2,
                  borderColor: t.c.accent,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={{ ...t.type.heading, color: t.c.accent }}>{tr('share.button')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('over.backHome')}
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
              <Text style={{ ...t.type.heading, color: t.c.text }}>{tr('common.home')}</Text>
            </Pressable>
          </View>

          {offerReminder ? <ReminderOffer /> : null}

          {/* under the buttons: with four players on a small phone, a card
              above them pushed Play again and Home off the screen */}
          {upsell ? <UpsellCard {...upsell} onDismiss={dismiss} /> : null}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
});

export default GameOverSheet;
