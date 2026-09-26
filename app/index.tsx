import { Avatar } from '@art';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
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
import { IconButton, ModeCard, OptionPill, QuestionGlyph } from '../src/ui/controls';
import { joinNames, playerLabel } from '../src/ui/names';
import { PlayersSheet } from '../src/ui/PlayersSheet';
import { BOARD_SPECS, type AvatarId, type Difficulty, type PegColor } from '../src/engine/types';

/**
 * Seven pegs each (index 0 is the centre, 1-6 the ring around it), so every
 * card shows the board in a different mood. No card mixes the pairs players
 * mix up (blue/violet, red/green, violet/purple), and red never stands next to
 * purple.
 */
const PREVIEWS: Record<'ai' | '2p' | '3p', (PegColor | null)[]> = {
  ai: ['yellow', null, 'violet', null, 'violet', null, 'red'],
  '2p': ['green', 'blue', null, 'green', null, 'purple', null],
  '3p': ['yellow', 'blue', 'red', null, 'purple', 'blue', null],
};

/**
 * Card subtitles. Once someone has typed a name they read as the matchup
 * ("Maya vs Fox", "Maya and Leo"); until then, as what the mode is. Seats with
 * no name fall back to their animal, as they do in the game.
 */
function modeSubtitles(
  names: readonly string[] | undefined,
  avatars: readonly AvatarId[],
  difficulty: Difficulty,
): Record<GameMode, string> {
  const named = (seat: number) => !!names?.[seat];
  const label = (seat: number) =>
    playerLabel({ name: names?.[seat] || undefined, avatar: avatars[seat] });
  // joinNames fences off right-to-left names so " vs" / "and" stay put
  const list = (seats: number[]) => joinNames(seats.map(label));
  return {
    ai: named(0)
      ? `${list([0])} vs ${DIFFICULTY_LABEL[difficulty]}`
      : `Opponent: ${DIFFICULTY_LABEL[difficulty]}`,
    '2p': named(0) || named(1) ? list([0, 1]) : 'Pass and play on one device',
    '3p': named(0) || named(1) || named(2) ? list([0, 1, 2]) : 'Take turns around the table',
  };
}

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
  const names = useSettings((s) => s.names);
  const avatars = useSettings((s) => s.avatars);
  const subtitles = modeSubtitles(names, avatars, difficulty);

  // A second tap lands before the push has rendered, and the stack ends up two
  // game screens deep — Back then drops you onto another game instead of Home.
  // The latch is cleared when Home is focused again, i.e. once we are back.
  const navigating = useRef(false);
  /** The mode whose "Who's playing?" sheet is up, if any. */
  const [setup, setSetup] = useState<GameMode | null>(null);
  useFocusEffect(
    useCallback(() => {
      navigating.current = false;
      // the sheet stays up while Home fades out under the game, and is gone
      // by the time anyone comes back
      return () => setSetup(null);
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

  /** A mode card: ask who's playing first (one more tap, on Play). */
  const choose = useCallback((mode: GameMode) => {
    if (navigating.current) return;
    setSetup(mode);
  }, []);

  const play = useCallback(
    (mode: GameMode) => {
      go({ pathname: '/game', params: { mode } });
    },
    [go],
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
          icon={<QuestionGlyph size={26} color={t.c.text} />}
          label="How to play"
          onPress={() => go('/how-to-play')}
          tone="filled"
        />
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
              Roll a color. Remember where it was.
            </Text>
          )}
        </View>

        <ModeCard
          title="Play vs Computer"
          subtitle={subtitles.ai}
          art={<BoardMini width={cardArt} colors={PREVIEWS.ai} theme={t.scheme} />}
          onPress={() => choose('ai')}
          style={cardStyle}
        />
        <ModeCard
          title="2 Players"
          subtitle={subtitles['2p']}
          art={<BoardMini width={cardArt} colors={PREVIEWS['2p']} theme={t.scheme} />}
          onPress={() => choose('2p')}
          style={cardStyle}
        />
        <ModeCard
          title="3 Players"
          subtitle={subtitles['3p']}
          art={<BoardMini width={cardArt} colors={PREVIEWS['3p']} theme={t.scheme} />}
          onPress={() => choose('3p')}
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

      {setup ? (
        <PlayersSheet
          key={setup}
          mode={setup}
          onPlay={() => play(setup)}
          onClose={() => setSetup(null)}
        />
      ) : null}
    </Backdrop>
  );
}
