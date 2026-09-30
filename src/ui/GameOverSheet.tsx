import { Avatar } from '@art';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GameState, PlayerSpec } from '../engine/types';
import { tr, trn } from '../i18n';
import { useTheme } from '../theme';
import { useReduceMotion } from './feedback';
import { isolate, joinNames, playerLabel } from './names';

export interface GameOverSheetProps {
  state: GameState;
  onRematch: () => void;
  onHome: () => void;
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
  if (winners.length === 0) return tr('over.none');
  if (winners.length > 1) return tr('over.share', { names: joinNames(winners.map(playerLabel)) });
  const name = isolate(playerLabel(winners[0]));
  return tr(state.suddenDeath ? 'over.winsSudden' : 'over.wins', { name });
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

export function GameOverSheet({ state, onRematch, onHome }: GameOverSheetProps) {
  const t = useTheme();
  const reduced = useReduceMotion();
  const insets = useSafeAreaInsets();
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
                      marginLeft: t.spacing.md,
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
