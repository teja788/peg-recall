import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BOARD_CYCLE,
  BOARD_LABEL,
  DIFFICULTY_HINT,
  DIFFICULTY_LABEL,
  useSettings,
} from '../src/store/settings';
import { useTheme } from '../src/theme';
import { Backdrop } from '../src/ui/Backdrop';
import { Chip, IconButton, ToggleRow } from '../src/ui/controls';
import { PillButton, RateRow, StatsCard } from '../src/ui/StatsCard';
import type { Difficulty } from '../src/engine/types';

const DIFFICULTIES: Difficulty[] = ['bunny', 'fox', 'owl'];
const DIFFICULTY_GLYPH: Record<Difficulty, string> = { bunny: '🐰', fox: '🦊', owl: '🦉' };

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // per-slice selectors: subscribing to the whole store re-renders this screen
  // on any unrelated settings write
  const soundOn = useSettings((s) => s.soundOn);
  const showShapes = useSettings((s) => s.showShapes);
  const bonusTurnOnMatch = useSettings((s) => s.bonusTurnOnMatch);
  const kidMode = useSettings((s) => s.kidMode);
  const boardSize = useSettings((s) => s.boardSize);
  const difficulty = useSettings((s) => s.difficulty);
  const toggle = useSettings((s) => s.toggle);
  const setSetting = useSettings((s) => s.set);

  return (
    <Backdrop>
      <View style={{ paddingTop: insets.top }} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: t.spacing.md,
          paddingVertical: t.spacing.sm,
        }}
      >
        <IconButton
          glyph="‹"
          label="Close settings"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          tone="filled"
        />
        <Text
          accessibilityRole="header"
          style={{ ...t.type.title, color: t.c.onBackdrop, marginLeft: t.spacing.sm }}
        >
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: t.spacing.lg,
          paddingBottom: insets.bottom + t.spacing.xxl,
          gap: t.spacing.md,
        }}
      >
        <ToggleRow
          title="Sound"
          subtitle="Soft clicks and a chime on a match"
          value={soundOn}
          onToggle={() => toggle('soundOn')}
        />
        <ToggleRow
          title="Shapes on pegs"
          subtitle="Color-blind help: every color gets its own shape"
          value={showShapes}
          onToggle={() => toggle('showShapes')}
        />
        <ToggleRow
          title="Bonus turn on a match"
          subtitle="Keep rolling while you keep matching"
          value={bonusTurnOnMatch}
          onToggle={() => toggle('bonusTurnOnMatch')}
        />
        <ToggleRow
          title="Kid mode"
          subtitle="Longer look at the board, ties are shared wins"
          value={kidMode}
          onToggle={() => toggle('kidMode')}
        />

        <Text style={{ ...t.type.label, color: t.c.onBackdropMuted, marginTop: t.spacing.md }}>
          Board size
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
          {BOARD_CYCLE.map((b) => (
            <Chip
              key={b}
              text={BOARD_LABEL[b]}
              selected={boardSize === b}
              onPress={() => setSetting('boardSize', b)}
            />
          ))}
        </View>

        <Text style={{ ...t.type.label, color: t.c.onBackdropMuted, marginTop: t.spacing.md }}>
          Computer opponent
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
          {DIFFICULTIES.map((d) => (
            <Chip
              key={d}
              text={`${DIFFICULTY_GLYPH[d]}  ${DIFFICULTY_LABEL[d]}`}
              label={DIFFICULTY_LABEL[d]}
              hint={DIFFICULTY_HINT[d]}
              selected={difficulty === d}
              onPress={() => setSetting('difficulty', d)}
            />
          ))}
        </View>
        <Text style={{ ...t.type.caption, color: t.c.onBackdropMuted }}>
          {DIFFICULTY_HINT[difficulty]}
        </Text>

        <Text
          accessibilityRole="header"
          style={{ ...t.type.label, color: t.c.onBackdropMuted, marginTop: t.spacing.md }}
        >
          Stats
        </Text>
        <StatsCard />
        <ForgetNamesRow />
        <RateRow />
      </ScrollView>
    </Backdrop>
  );
}

/**
 * Names now live on the "Who's playing?" sheet; all Settings keeps is the way
 * to wipe them (every seat back to its animal, no recent-name chips). Confirmed
 * inline, like Reset stats: no system dialog.
 */
function ForgetNamesRow() {
  const t = useTheme();
  const names = useSettings((s) => s.names);
  const recentNames = useSettings((s) => s.recentNames);
  const forgetNames = useSettings((s) => s.forgetNames);
  const [confirming, setConfirming] = useState(false);
  const saved = new Set(
    [...names, ...recentNames].filter(Boolean).map((n) => n.toLowerCase()),
  ).size;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        minHeight: 56,
        paddingVertical: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        borderRadius: t.radii.md,
        backgroundColor: t.c.card,
        borderWidth: 1,
        borderColor: t.c.line,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: t.spacing.sm,
      }}
    >
      {confirming ? (
        <>
          <Text style={{ ...t.type.body, color: t.c.text, flexGrow: 1 }}>Forget all names?</Text>
          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            <PillButton text="Cancel" label="Cancel, keep names" onPress={() => setConfirming(false)} />
            <PillButton
              text="Forget"
              label="Forget all player names"
              filled
              onPress={() => {
                forgetNames();
                setConfirming(false);
              }}
            />
          </View>
        </>
      ) : (
        <>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={{ ...t.type.body, color: t.c.text }}>Player names</Text>
            <Text style={{ ...t.type.caption, color: t.c.textDim, marginTop: 2 }}>
              {saved === 0
                ? 'None saved. Everyone plays as their animal.'
                : `${saved} ${saved === 1 ? 'name' : 'names'} saved on this device`}
            </Text>
          </View>
          {saved > 0 ? (
            <PillButton
              text="Forget player names"
              onPress={() => setConfirming(true)}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
