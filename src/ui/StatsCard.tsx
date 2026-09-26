import { Avatar } from '@art';
import React, { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';

import type { Difficulty } from '../engine/types';
import { WRITE_REVIEW_URL } from '../store/reviewPrompt';
import { DIFFICULTY_LABEL } from '../store/settings';
import { useStats } from '../store/stats';
import { useTheme } from '../theme';

const DIFFICULTIES: Difficulty[] = ['bunny', 'fox', 'owl'];
/** A win rate over one or two games says nothing, so it waits for the third. */
const MIN_GAMES_FOR_RATE = 3;
const ROW_AVATAR = 36;

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** The card surface every settings block sits on (matches ToggleRow). */
function useCardStyle() {
  const t = useTheme();
  return {
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radii.md,
    backgroundColor: t.c.card,
    borderWidth: 1,
    borderColor: t.c.line,
  } as const;
}

/** Small pill button used for Reset / Cancel (and Settings' Forget / Cancel). */
export function PillButton({
  text,
  label,
  onPress,
  filled,
}: {
  text: string;
  label?: string;
  onPress: () => void;
  filled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? text}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: t.spacing.lg,
        justifyContent: 'center',
        borderRadius: t.radii.pill,
        backgroundColor: filled ? t.c.accent : t.c.card,
        borderWidth: 2,
        borderColor: filled ? t.c.accent : t.c.line,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ ...t.type.label, color: filled ? t.c.accentInk : t.c.text }}>{text}</Text>
    </Pressable>
  );
}

/**
 * Settings → Stats: who has won how often on this device, and the record
 * against each computer opponent. Everything shown comes from `useStats`,
 * which only ever lives on the device.
 */
export function StatsCard() {
  const t = useTheme();
  const card = useCardStyle();
  const players = useStats((s) => s.players);
  const vsAi = useStats((s) => s.vsAi);
  const gamesFinished = useStats((s) => s.gamesFinished);
  const reset = useStats((s) => s.reset);
  const [confirming, setConfirming] = useState(false);

  const ranked = useMemo(
    () =>
      Object.values(players)
        .filter((p) => p.played > 0)
        .sort(
          (a, b) =>
            b.wins - a.wins ||
            b.played - a.played ||
            b.lastPlayed - a.lastPlayed ||
            a.label.localeCompare(b.label),
        ),
    [players],
  );
  const opponents = DIFFICULTIES.filter((d) => (vsAi[d]?.played ?? 0) > 0);
  const empty = ranked.length === 0 && opponents.length === 0;

  const subheading = { ...t.type.label, color: t.c.textDim } as const;
  const rowText = { ...t.type.body, color: t.c.text } as const;
  const rowDetail = { ...t.type.caption, color: t.c.textDim, marginTop: 1 } as const;
  const row = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingVertical: t.spacing.xs,
  } as const;

  if (empty) {
    return (
      <View style={card}>
        <Text style={{ ...t.type.body, color: t.c.textDim }}>
          Finish a game to start the scoreboard.
        </Text>
      </View>
    );
  }

  return (
    <View style={[card, { gap: t.spacing.sm }]}>
      {ranked.length > 0 ? (
        <>
          <Text accessibilityRole="header" style={subheading}>
            Players
          </Text>
          {ranked.map((p) => {
            const rate =
              p.played >= MIN_GAMES_FOR_RATE ? Math.round((p.wins / p.played) * 100) : null;
            const detail = `${plural(p.wins, 'win')} · ${p.played} played${
              rate === null ? '' : ` · ${rate}%`
            }`;
            const spoken = `${p.label}: ${plural(p.wins, 'win')}, ${plural(p.played, 'game')} played${
              rate === null ? '' : `, ${rate} percent`
            }`;
            return (
              <View key={p.key} accessible accessibilityLabel={spoken} style={row}>
                <Avatar id={p.avatar} size={ROW_AVATAR} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={rowText}>
                    {p.label}
                  </Text>
                  <Text style={rowDetail}>{detail}</Text>
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      {opponents.length > 0 ? (
        <>
          <Text
            accessibilityRole="header"
            style={[subheading, ranked.length > 0 ? { marginTop: t.spacing.sm } : null]}
          >
            Vs computer
          </Text>
          {opponents.map((d) => {
            const r = vsAi[d];
            const losses = Math.max(0, r.played - r.wins);
            const name = DIFFICULTY_LABEL[d];
            const detail = `${r.wins}–${losses} of ${r.played} · streak ${r.streak} · best ${r.bestStreak}`;
            const spoken = `Against ${name}: ${plural(r.wins, 'win')}, ${plural(
              losses,
              'loss',
              'losses',
            )}, of ${plural(r.played, 'game')}. Current streak ${r.streak}, best ${r.bestStreak}`;
            return (
              <View key={d} accessible accessibilityLabel={spoken} style={row}>
                <Avatar id={d} size={ROW_AVATAR} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={rowText}>
                    {name}
                  </Text>
                  <Text style={rowDetail}>{detail}</Text>
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      <View
        style={{
          marginTop: t.spacing.sm,
          paddingTop: t.spacing.md,
          borderTopWidth: 1,
          borderTopColor: t.c.line,
        }}
      >
        {confirming ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: t.spacing.sm,
            }}
          >
            <Text style={{ ...t.type.body, color: t.c.text, flexGrow: 1 }}>Reset all stats?</Text>
            <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
              <PillButton
                text="Cancel"
                label="Cancel, keep stats"
                onPress={() => setConfirming(false)}
              />
              <PillButton
                text="Reset"
                label="Reset all stats"
                filled
                onPress={() => {
                  reset();
                  setConfirming(false);
                }}
              />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <Text style={{ ...t.type.caption, color: t.c.textDim, flex: 1 }}>
              {plural(gamesFinished, 'game')} finished on this device
            </Text>
            <PillButton text="Reset stats" onPress={() => setConfirming(true)} />
          </View>
        )}
      </View>
    </View>
  );
}

/** "Rate Color Catch" — opens the App Store's write-a-review page. Not on web. */
export function RateRow() {
  const t = useTheme();
  if (Platform.OS === 'web') return null;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Rate Color Catch"
      accessibilityHint="Opens the App Store"
      onPress={() => {
        Linking.openURL(WRITE_REVIEW_URL).catch(() => {
          /* no store on this device (simulator): nothing useful to say */
        });
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 56,
        paddingVertical: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        borderRadius: t.radii.md,
        backgroundColor: t.c.card,
        borderWidth: 1,
        borderColor: t.c.line,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flex: 1, paddingRight: t.spacing.md }}>
        <Text style={{ ...t.type.body, color: t.c.text }}>Rate Color Catch</Text>
        <Text style={{ ...t.type.caption, color: t.c.textDim, marginTop: 2 }}>
          A quick review helps other families find it
        </Text>
      </View>
      <Text allowFontScaling={false} style={{ fontSize: 22, color: t.c.textDim }}>
        ›
      </Text>
    </Pressable>
  );
}
