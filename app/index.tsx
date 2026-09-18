import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BOARD_LABEL,
  DIFFICULTY_LABEL,
  useSettings,
  type GameMode,
} from '../src/store/settings';
import { useTheme } from '../src/theme';
import { Chip, IconButton, ModeCard } from '../src/ui/controls';
import { PEG_PAINT } from '../src/theme/tokens';

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const soundOn = useSettings((s) => s.soundOn);
  const boardSize = useSettings((s) => s.boardSize);
  const difficulty = useSettings((s) => s.difficulty);
  const toggle = useSettings((s) => s.toggle);
  const cycleBoardSize = useSettings((s) => s.cycleBoardSize);
  const setSetting = useSettings((s) => s.set);

  const play = useCallback(
    (mode: GameMode) => {
      setSetting('lastMode', mode);
      router.push({ pathname: '/game', params: { mode } });
    },
    [router, setSetting],
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.c.page }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: t.spacing.sm,
          paddingTop: insets.top + t.spacing.sm,
          paddingHorizontal: t.spacing.lg,
        }}
      >
        <IconButton
          glyph={soundOn ? '🔊' : '🔇'}
          label={soundOn ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}
          onPress={() => toggle('soundOn')}
        />
        <IconButton
          glyph="⚙️"
          label="Settings"
          onPress={() => router.push('/settings')}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.spacing.xl,
          paddingBottom: insets.bottom + t.spacing.xl,
          gap: t.spacing.md,
          flexGrow: 1,
          justifyContent: 'center',
        }}
      >
        <View style={{ marginBottom: t.spacing.lg }}>
          <Text accessibilityRole="header" style={{ ...t.type.display, color: t.c.text }}>
            Peg Recall
          </Text>
          <Text style={{ ...t.type.body, color: t.c.textDim, marginTop: t.spacing.xs }}>
            Roll a colour. Remember where it was.
          </Text>
        </View>

        <ModeCard
          title="Play vs Computer"
          subtitle={`Opponent: ${DIFFICULTY_LABEL[difficulty]}`}
          glyph="🤖"
          accent={PEG_PAINT.sky.fill}
          onPress={() => play('ai')}
        />
        <ModeCard
          title="2 Players"
          subtitle="Pass and play on one device"
          glyph="✌️"
          accent={PEG_PAINT.green.fill}
          onPress={() => play('2p')}
        />
        <ModeCard
          title="3 Players"
          subtitle="Take turns around the table"
          glyph="🎉"
          accent={PEG_PAINT.orange.fill}
          onPress={() => play('3p')}
        />

        <View style={{ flexDirection: 'row', marginTop: t.spacing.lg }}>
          <Chip
            text={BOARD_LABEL[boardSize]}
            label={`Board size, ${BOARD_LABEL[boardSize]}`}
            hint="Changes the board size"
            onPress={cycleBoardSize}
          />
        </View>
      </ScrollView>
    </View>
  );
}
