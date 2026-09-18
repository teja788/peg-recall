import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGame } from '../src/store/game';
import { useSettings, type GameMode } from '../src/store/settings';
import { PEG_PAINT, useTheme } from '../src/theme';
import { Board } from '../src/ui/Board';
import { Die } from '../src/ui/Die';
import { GameOverSheet } from '../src/ui/GameOverSheet';
import { PlayerTray, playerName } from '../src/ui/PlayerTray';
import { RevealCountdown } from '../src/ui/RevealCountdown';
import { TurnBanner } from '../src/ui/TurnBanner';
import { IconButton } from '../src/ui/controls';
import { activePlayerSpec, availableColors, isHumanTurn, revealDurationMs } from '../src/ui/engine';
import { hapticFlip, hapticMatch, useSounds } from '../src/ui/feedback';

function isMode(v: unknown): v is GameMode {
  return v === 'ai' || v === '2p' || v === '3p';
}

export default function GameScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: GameMode = isMode(params.mode) ? params.mode : 'ai';

  const hydrated = useSettings((s) => s.hydrated);
  const showShapes = useSettings((s) => s.showShapes);
  const soundOn = useSettings((s) => s.soundOn);
  const toggleSetting = useSettings((s) => s.toggle);

  const state = useGame((s) => s.state);
  const busy = useGame((s) => s.busy);
  const feedback = useGame((s) => s.feedback);
  const start = useGame((s) => s.start);
  const dispatch = useGame((s) => s.dispatch);
  const rematch = useGame((s) => s.rematch);
  const teardown = useGame((s) => s.teardown);

  const play = useSounds();
  const [trayAnchors, setTrayAnchors] = useState<Record<string, { x: number; y: number }>>({});
  const started = useRef(false);
  const chime = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------------------------------------------- lifecycle */

  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;
    start(mode, useSettings.getState());
  }, [hydrated, mode, start]);

  useEffect(
    () => () => {
      if (chime.current) clearTimeout(chime.current);
      teardown();
    },
    [teardown],
  );

  /* ------------------------------------------- sound + haptics */

  useEffect(() => {
    if (!feedback) return;
    hapticFlip();
    play('flip');
    if (feedback.kind === 'match') {
      hapticMatch();
      if (chime.current) clearTimeout(chime.current);
      chime.current = setTimeout(() => play('match'), t.timing.flip);
    }
    // a miss is deliberately silent — no chime, no buzz
  }, [feedback, play, t.timing.flip]);

  useEffect(() => {
    if (state?.phase === 'gameOver') play('win');
  }, [state?.phase, play]);

  /* --------------------------------------------------- actions */

  const onAnchor = useCallback((id: string, point: { x: number; y: number }) => {
    setTrayAnchors((cur) =>
      cur[id] && cur[id].x === point.x && cur[id].y === point.y ? cur : { ...cur, [id]: point },
    );
  }, []);

  /** Back to Home, whether we were pushed from it or deep-linked straight here. */
  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const onPick = useCallback((pegIndex: number) => dispatch({ type: 'PICK', pegIndex }), [dispatch]);
  const onRoll = useCallback(() => dispatch({ type: 'ROLL' }), [dispatch]);

  if (!state) {
    return (
      <View style={{ flex: 1, backgroundColor: t.c.page }} accessibilityLabel="Loading game" />
    );
  }

  const human = isHumanTurn(state);
  const active = activePlayerSpec(state);
  const canRoll = state.phase === 'roll' && human && !busy;
  const canPick = state.phase === 'pick' && human && !busy;

  let banner = '';
  let tone: 'normal' | 'accent' = 'normal';
  if (state.phase === 'reveal') {
    banner = state.suddenDeath ? 'Sudden death — look and remember!' : 'Look and remember!';
    tone = 'accent';
  } else if (state.phase === 'result' && state.lastMove) {
    banner = state.lastMove.matched ? 'Match!' : 'Not that one';
    tone = state.lastMove.matched ? 'accent' : 'normal';
  } else if (state.phase === 'gameOver') {
    banner = 'Board clear!';
  } else if (state.phase === 'pick' && state.dieColor) {
    banner = busy ? `${playerName(active)} is rolling…` : `Find ${PEG_PAINT[state.dieColor].label}`;
    tone = 'accent';
  } else {
    banner = active.kind === 'ai' ? `${playerName(active)} is thinking…` : `${playerName(active)}'s turn`;
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.c.page, paddingTop: insets.top }}>
      {/* trays */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: t.spacing.md,
          gap: t.spacing.sm,
        }}
      >
        <IconButton glyph="‹" label="Leave game and go home" onPress={goHome} />
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: t.spacing.sm,
          }}
        >
          {state.config.players.map((p, i) => (
            <PlayerTray
              key={p.id}
              spec={p}
              score={state.scores[p.id] ?? 0}
              active={i === state.activePlayer && state.phase !== 'gameOver'}
              size={state.config.players.length > 2 ? 32 : 40}
              onAnchor={onAnchor}
            />
          ))}
        </View>
      </View>

      <View style={{ paddingVertical: t.spacing.sm }}>
        <TurnBanner text={banner} tone={tone} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: t.spacing.md }}>
        <Board
          state={state}
          showShapes={showShapes}
          disabled={!canPick}
          onPick={onPick}
          trayAnchors={trayAnchors}
        />
      </View>

      {/* die / countdown */}
      <View
        style={{
          minHeight: 132,
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: insets.bottom + t.spacing.md,
          paddingTop: t.spacing.md,
        }}
      >
        {state.phase === 'reveal' ? (
          <RevealCountdown
            durationMs={revealDurationMs(state)}
            onDone={() => dispatch({ type: 'REVEAL_DONE' })}
          />
        ) : (
          <Die
            dieColor={state.dieColor}
            colors={availableColors(state)}
            canRoll={canRoll}
            showShapes={showShapes}
            onRoll={onRoll}
            onTumbleSound={() => play('roll')}
          />
        )}
        {state.phase === 'roll' && human ? (
          <Text style={{ ...t.type.caption, color: t.c.textDim, marginTop: t.spacing.sm }}>
            Tap the die
          </Text>
        ) : null}
      </View>

      <View
        style={{
          position: 'absolute',
          left: t.spacing.md,
          bottom: insets.bottom + t.spacing.md,
        }}
      >
        <IconButton
          glyph={soundOn ? '🔊' : '🔇'}
          label={soundOn ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}
          onPress={() => toggleSetting('soundOn')}
          size={44}
        />
      </View>

      {state.phase === 'gameOver' ? (
        <GameOverSheet state={state} onRematch={rematch} onHome={goHome} />
      ) : null}
    </View>
  );
}
