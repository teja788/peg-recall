import { useRouter } from 'expo-router';
import React from 'react';
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
import { PlayerTray } from '../src/ui/PlayerTray';
import type { Difficulty } from '../src/engine/types';

const DIFFICULTIES: Difficulty[] = ['bunny', 'fox', 'owl'];
const DIFFICULTY_GLYPH: Record<Difficulty, string> = { bunny: '🐰', fox: '🦊', owl: '🦉' };

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // per-slice selectors: subscribing to the whole store re-renders this screen
  // (and every PlayerTray in it) on any unrelated settings write
  const soundOn = useSettings((s) => s.soundOn);
  const showShapes = useSettings((s) => s.showShapes);
  const bonusTurnOnMatch = useSettings((s) => s.bonusTurnOnMatch);
  const kidMode = useSettings((s) => s.kidMode);
  const boardSize = useSettings((s) => s.boardSize);
  const difficulty = useSettings((s) => s.difficulty);
  const avatars = useSettings((s) => s.avatars);
  const toggle = useSettings((s) => s.toggle);
  const setSetting = useSettings((s) => s.set);
  const cycleAvatar = useSettings((s) => s.cycleAvatar);

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
          subtitle="A shape as well as a colour, for colour-blind play"
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

        <Text style={{ ...t.type.label, color: t.c.onBackdropMuted, marginTop: t.spacing.md }}>
          Players
        </Text>
        <Text style={{ ...t.type.caption, color: t.c.onBackdropMuted, marginTop: -t.spacing.xs }}>
          Tap an animal to change it. The computer always wears its own face.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
          {avatars.map((avatar, seat) => (
            <PlayerTray
              key={seat}
              spec={{ id: `seat${seat}`, kind: 'human', avatar }}
              caption={`P${seat + 1}`}
              active={false}
              size={40}
              onPress={() => cycleAvatar(seat)}
            />
          ))}
        </View>

        <Text style={{ ...t.type.label, color: t.c.onBackdropMuted, marginTop: t.spacing.md }}>Stats</Text>
        <View
          style={{
            padding: t.spacing.lg,
            borderRadius: t.radii.md,
            backgroundColor: t.c.card,
            borderWidth: 1,
            borderColor: t.c.line,
          }}
        >
          <Text style={{ ...t.type.body, color: t.c.textDim }}>
            Wins, streaks and best times land here in a later build.
          </Text>
        </View>
      </ScrollView>
    </Backdrop>
  );
}
