import { Avatar } from '@art';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BOARD_CYCLE,
  BOARD_NAME,
  DIFFICULTY_LABEL,
  DIFFICULTY_TIER,
  useSettings,
  type GameMode,
} from '../src/store/settings';
import { useTheme } from '../src/theme';
import { Backdrop } from '../src/ui/Backdrop';
import { BoardGlyph, BoardMini } from '../src/ui/BoardMini';
import { IconButton, ModeCard, OptionPill } from '../src/ui/controls';
import { PEG_PAINT } from '../src/theme/tokens';
import { BOARD_SPECS, type Difficulty, type PegColor } from '../src/engine/types';

/** Seven pegs each, so every card shows the board in a different mood. */
const PREVIEWS: Record<'ai' | '2p' | '3p', (PegColor | null)[]> = {
  ai: ['sky', null, 'blue', null, 'sky', null, 'orange'],
  '2p': ['green', 'orange', null, 'green', null, 'purple', null],
  '3p': ['orange', 'purple', 'yellow', null, 'sky', 'green', null],
};

/** Easiest first, so the row reads left-to-right as "gets harder". */
const OPPONENTS: Difficulty[] = ['bunny', 'fox', 'owl'];

/** A short phone (iPhone SE / 8) has no room for the tagline, and the cards
 *  give up four points each, so the option rows never push Home into a scroll. */
const SHORT_SCREEN = 700;
/** Tablets: the column stops growing and sits in the middle. */
const MAX_COLUMN = 560;

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < SHORT_SCREEN;
  const soundOn = useSettings((s) => s.soundOn);
  const boardSize = useSettings((s) => s.boardSize);
  const difficulty = useSettings((s) => s.difficulty);
  const toggle = useSettings((s) => s.toggle);
  const setSetting = useSettings((s) => s.set);

  // A second tap lands before the push has rendered, and the stack ends up two
  // game screens deep — Back then drops you onto another game instead of Home.
  // The latch is cleared when Home is focused again, i.e. once we are back.
  const navigating = useRef(false);
  useFocusEffect(
    useCallback(() => {
      navigating.current = false;
    }, []),
  );

  const go = useCallback(
    (href: Parameters<typeof router.push>[0]) => {
      if (navigating.current) return;
      navigating.current = true;
      router.push(href);
    },
    [router],
  );

  const play = useCallback(
    (mode: GameMode) => {
      if (navigating.current) return;
      setSetting('lastMode', mode);
      go({ pathname: '/game', params: { mode } });
    },
    [go, setSetting],
  );

  const cardStyle = compact ? { minHeight: 84 } : undefined;
  const cardArt = compact ? 56 : 68;
  const gap = compact ? t.spacing.sm : t.spacing.md;
  const glyphSize = compact ? 22 : 26;
  const avatarSize = compact ? 28 : 32;
  const rowLabel = { ...t.type.label, color: t.c.onBackdropMuted, marginBottom: t.spacing.xs };

  return (
    <Backdrop>
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
          tone="filled"
        />
        <IconButton
          glyph="⚙️"
          label="Settings"
          onPress={() => go('/settings')}
          tone="filled"
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.spacing.xl,
          paddingBottom: insets.bottom + t.spacing.lg,
          gap,
          flexGrow: 1,
          justifyContent: 'center',
          width: '100%',
          maxWidth: MAX_COLUMN + t.spacing.xl * 2,
          alignSelf: 'center',
        }}
      >
        <View style={{ marginBottom: compact ? 0 : t.spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              ...t.type.display,
              color: t.c.onBackdrop,
              textShadowColor: 'rgba(0,0,0,0.28)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 6,
            }}
          >
            Color Catch
          </Text>
          {compact ? null : (
            <Text style={{ ...t.type.body, color: t.c.onBackdropMuted, marginTop: t.spacing.xs }}>
              Roll a colour. Remember where it was.
            </Text>
          )}
        </View>

        <ModeCard
          title="Play vs Computer"
          subtitle={`Opponent: ${DIFFICULTY_LABEL[difficulty]}`}
          glyph="🤖"
          accent={PEG_PAINT.sky.fill}
          art={<BoardMini width={cardArt} colors={PREVIEWS.ai} theme={t.scheme} />}
          onPress={() => play('ai')}
          style={cardStyle}
        />
        <ModeCard
          title="2 Players"
          subtitle="Pass and play on one device"
          glyph="✌️"
          accent={PEG_PAINT.green.fill}
          art={<BoardMini width={cardArt} colors={PREVIEWS['2p']} theme={t.scheme} />}
          onPress={() => play('2p')}
          style={cardStyle}
        />
        <ModeCard
          title="3 Players"
          subtitle="Take turns around the table"
          glyph="🎉"
          accent={PEG_PAINT.orange.fill}
          art={<BoardMini width={cardArt} colors={PREVIEWS['3p']} theme={t.scheme} />}
          onPress={() => play('3p')}
          style={cardStyle}
        />

        <View>
          <Text style={rowLabel}>Board</Text>
          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            {BOARD_CYCLE.map((b) => {
              const pegs = BOARD_SPECS[b].pegs;
              const on = boardSize === b;
              return (
                <OptionPill
                  key={b}
                  selected={on}
                  title={BOARD_NAME[b]}
                  hint={`${pegs} pegs`}
                  label={`${BOARD_NAME[b]} board, ${pegs} pegs`}
                  onPress={() => setSetting('boardSize', b)}
                  art={
                    <BoardGlyph
                      size={glyphSize}
                      pegs={pegs}
                      color={on ? t.c.accent : t.c.onBackdrop}
                      rim={on ? t.c.pegDown : 'rgba(255,255,255,0.35)'}
                    />
                  }
                />
              );
            })}
          </View>
        </View>

        <View>
          <Text style={rowLabel}>Opponent</Text>
          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            {OPPONENTS.map((d) => (
              <OptionPill
                key={d}
                selected={difficulty === d}
                title={DIFFICULTY_LABEL[d]}
                hint={DIFFICULTY_TIER[d]}
                label={`${DIFFICULTY_LABEL[d]} opponent, ${DIFFICULTY_TIER[d]}`}
                onPress={() => setSetting('difficulty', d)}
                art={<Avatar id={d} size={avatarSize} />}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </Backdrop>
  );
}
