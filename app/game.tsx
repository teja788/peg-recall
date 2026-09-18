import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGame } from '../src/store/game';
import { useSettings, type GameMode } from '../src/store/settings';
import { PEG_PAINT, useTheme } from '../src/theme';
import { Backdrop } from '../src/ui/Backdrop';
import { Board, MAX_BOARD, boardHeightRatio, boardTiltFor } from '../src/ui/Board';
import { Die } from '../src/ui/Die';
import { GameOverSheet } from '../src/ui/GameOverSheet';
import { PauseSheet } from '../src/ui/PauseSheet';
import { PlayerTray, playerName } from '../src/ui/PlayerTray';
import { RevealCountdown } from '../src/ui/RevealCountdown';
import { TurnBanner } from '../src/ui/TurnBanner';
import { IconButton, PauseGlyph } from '../src/ui/controls';
import { activePlayerSpec, availableColors, isHumanTurn, revealDurationMs } from '../src/ui/engine';
import { hapticFlip, hapticMatch, useSounds } from '../src/ui/feedback';

import type { PegColor } from '../src/engine/types';

function isMode(v: unknown): v is GameMode {
  return v === 'ai' || v === '2p' || v === '3p';
}

/* ------------------------------------------------------------- proportions */

/**
 * The screen is one table: the banner sits just above the disc, the die just
 * below it, and the three of them are centred as a single block in whatever
 * height is left between the trays and the bottom controls (PLAN.md section 2).
 *
 * All of the chrome is sized off the disc, so an iPad board twice the size of
 * the phone's does not end up ringed by phone-sized furniture.
 */

/** How much of the screen width the disc may take. */
const BOARD_OF_WIDTH = 0.92;
/** Board width the chrome below was drawn against (a 390 pt phone). */
const CHROME_BASE = 360;
/** Chrome never shrinks below the phone size, and stops growing at 1.6x. */
const CHROME_MAX = 1.6;
/** Gap between the banner and the top of the disc, at scale 1. */
const BANNER_GAP = 12;
/** Gap between the bottom of the disc and the die, at scale 1. */
const DIE_GAP = 16;
/** Die width at scale 1; the art is 0.9 as tall as it is wide. */
const DIE_SIZE = 104;
/** Room kept for the "Tap the die" hint, at scale 1, so nothing jumps. */
const HINT_H = 24;
/** Banner line box at scale 1. */
const BANNER_H = 28;

/** Confetti in the peg palette, so the win still reads as this game. */
const CONFETTI = [
  PEG_PAINT.orange.fill,
  PEG_PAINT.sky.fill,
  PEG_PAINT.blue.fill,
  PEG_PAINT.green.fill,
  PEG_PAINT.yellow.fill,
  PEG_PAINT.purple.fill,
];

export default function GameScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const reduced = useReducedMotion();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: GameMode = isMode(params.mode) ? params.mode : 'ai';

  const hydrated = useSettings((s) => s.hydrated);
  const showShapes = useSettings((s) => s.showShapes);
  const soundOn = useSettings((s) => s.soundOn);
  const toggleSetting = useSettings((s) => s.toggle);

  const state = useGame((s) => s.state);
  const busy = useGame((s) => s.busy);
  const feedback = useGame((s) => s.feedback);
  const paused = useGame((s) => s.paused);
  const start = useGame((s) => s.start);
  const dispatch = useGame((s) => s.dispatch);
  const rematch = useGame((s) => s.rematch);
  const pause = useGame((s) => s.pause);
  const resume = useGame((s) => s.resume);
  const teardown = useGame((s) => s.teardown);

  const play = useSounds();
  const [trayAnchors, setTrayAnchors] = useState<Record<string, { x: number; y: number }>>({});
  const started = useRef(false);
  const chime = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** measured height of the box the banner + board + die share */
  const [tableH, setTableH] = useState(0);

  /* ------------------------------------------------- lifecycle */

  // `started` guards against starting a second game on every render. Fast
  // Refresh keeps the ref but runs the cleanup below, which nulls the store —
  // so an empty store always means "no game running", whatever the ref says.
  const hasState = state != null;
  useEffect(() => {
    if (!hydrated) return;
    if (!hasState) started.current = false;
    if (started.current) return;
    started.current = true;
    start(mode, useSettings.getState());
  }, [hydrated, hasState, mode, start]);

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

  /** Back to Home, whether we were pushed from it or deep-linked straight here.
   *  `resume` first so the paused flag never outlives the screen. */
  const goHome = useCallback(() => {
    resume();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router, resume]);

  const openPause = useCallback(() => {
    if (useGame.getState().state?.phase === 'gameOver') return;
    pause();
  }, [pause]);

  /** Restart from the pause menu: a new seed, and the board running again. */
  const restart = useCallback(() => {
    rematch();
  }, [rematch]);

  /* -------------------------------------------------- web: Esc key */

  // Esc opens the menu and closes it again — the keyboard equivalent of the
  // pause button. (Browser Back is deliberately left alone: expo-router owns
  // `popstate`, and a history guard fights it rather than trapping it. Back
  // already does the sane thing and leaves the game.)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const w = globalThis.window as Window | undefined;
    if (!w) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const g = useGame.getState();
      if (g.paused) g.resume();
      else if (g.state && g.state.phase !== 'gameOver') g.pause();
    };
    w.addEventListener('keydown', onKey);
    return () => w.removeEventListener('keydown', onKey);
  }, []);

  /** pegs each player has taken, oldest first — the little row in their tray */
  const pegs = state?.pegs;
  const captured = useMemo(() => {
    const by: Record<string, PegColor[]> = {};
    for (const p of pegs ?? []) {
      if (p.state === 'captured' && p.capturedBy) {
        (by[p.capturedBy] ??= []).push(p.color);
      }
    }
    return by;
  }, [pegs]);

  const onPick = useCallback((pegIndex: number) => dispatch({ type: 'PICK', pegIndex }), [dispatch]);
  const onRoll = useCallback(() => dispatch({ type: 'ROLL' }), [dispatch]);

  /* ----------------------------------------------- composition */

  const onTableLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setTableH((cur) => (Math.abs(cur - h) < 0.5 ? cur : h));
  }, []);

  const pegCount = state?.spec.pegs ?? 25;
  const L = useMemo(() => {
    const cap = Math.min(win.width * BOARD_OF_WIDTH, MAX_BOARD);
    const scale = Math.min(CHROME_MAX, Math.max(1, cap / CHROME_BASE));
    const px = (n: number) => Math.round(n * scale);
    const bannerH = px(BANNER_H);
    const tilt = boardTiltFor(win.width, win.height);
    const ratio = boardHeightRatio(pegCount, tilt);

    // until the first layout lands, guess the middle box so nothing jumps far
    const box =
      tableH > 0 ? tableH : win.height - insets.top - insets.bottom - px(69) - px(52);

    // 1. size the disc against the smallest the chrome can be
    let die = px(DIE_SIZE);
    let bannerGap = px(BANNER_GAP);
    let dieGap = px(DIE_GAP);
    const room = box - bannerH - bannerGap - dieGap - Math.round(die * 0.9) - px(HINT_H);
    const width = Math.max(0, Math.floor(Math.min(cap, room / ratio)));

    // 2. a tall phone leaves height over once the disc has hit its width cap.
    //    Spend some of it on a bigger die and a little more air around the
    //    disc — the rest stays as the margin the block is centred in, so the
    //    banner, the board and the die still read as one object.
    const spare = Math.max(0, room - width * ratio);
    const grow = Math.min(spare * 0.25, die * 0.35);
    die = Math.round(die + grow);
    const left = spare - grow * 0.9;
    bannerGap += Math.round(Math.min(left * 0.1, px(8)));
    dieGap += Math.round(Math.min(left * 0.15, px(12)));

    const dieBlock = Math.round(die * 0.9) + px(HINT_H);
    return { scale, px, die, dieBlock, bannerGap, dieGap, bannerH, tilt, width };
  }, [win.width, win.height, insets.top, insets.bottom, tableH, pegCount]);

  if (!state) {
    return (
      <Backdrop>
        <View style={{ flex: 1 }} accessibilityLabel="Loading game" />
      </Backdrop>
    );
  }

  const human = isHumanTurn(state);
  const active = activePlayerSpec(state);
  const canRoll = state.phase === 'roll' && human && !busy && !paused;
  const canPick = state.phase === 'pick' && human && !busy && !paused;
  const humanWon =
    state.phase === 'gameOver' &&
    state.config.players.some((p) => p.kind === 'human' && state.winnerIds.includes(p.id));

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

  const trayCount = state.config.players.length;

  return (
    <Backdrop>
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {/* trays */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: t.spacing.md,
          paddingTop: L.px(t.spacing.xs),
          gap: t.spacing.sm,
        }}
      >
        <IconButton
          icon={<PauseGlyph size={Math.round(L.px(48) * 0.5)} color={t.c.text} />}
          label="Pause"
          hint="Stops the game and opens the menu"
          onPress={openPause}
          size={L.px(48)}
          tone="filled"
        />
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: L.px(t.spacing.sm),
            flexShrink: 1,
          }}
        >
          {state.config.players.map((p, i) => (
            <PlayerTray
              key={p.id}
              spec={p}
              score={state.scores[p.id] ?? 0}
              captured={captured[p.id]}
              maxPegs={trayCount > 2 ? 2 : 4}
              active={i === state.activePlayer && state.phase !== 'gameOver'}
              size={L.px(trayCount > 2 ? 30 : 36)}
              scale={L.scale}
              onAnchor={onAnchor}
            />
          ))}
        </View>
      </View>

      {/* the table: banner, disc and die read as one block, centred together */}
      <View
        onLayout={onTableLayout}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <TurnBanner text={banner} tone={tone} scale={L.scale} />

        <View style={{ height: L.bannerGap }} />

        <Board
          state={state}
          width={L.width}
          tilt={L.tilt}
          showShapes={showShapes}
          disabled={!canPick}
          onPick={onPick}
          trayAnchors={trayAnchors}
          moveNonce={state.turn}
        />

        <View style={{ height: L.dieGap }} />

        {/* die / countdown, directly under the disc */}
        <View style={{ height: L.dieBlock, alignItems: 'center' }}>
          <View
            style={{
              height: Math.round(L.die * 0.9),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {state.phase === 'reveal' ? (
              <RevealCountdown
                size={L.px(64)}
                durationMs={revealDurationMs(state)}
                paused={paused}
                onDone={() => dispatch({ type: 'REVEAL_DONE' })}
              />
            ) : (
              <Die
                dieColor={state.dieColor}
                colors={availableColors(state)}
                rerolls={state.dieRerolls ?? 0}
                canRoll={canRoll}
                showShapes={showShapes}
                size={L.die}
                onRoll={onRoll}
                onTumbleSound={() => play('roll')}
              />
            )}
          </View>
          {state.phase === 'roll' && human ? (
            <Text
              style={{
                ...t.type.caption,
                fontSize: L.px(t.type.caption.fontSize),
                lineHeight: L.px(t.type.caption.lineHeight),
                color: t.c.onBackdropMuted,
                marginTop: L.px(4),
              }}
            >
              Tap the die
            </Text>
          ) : null}
        </View>
      </View>

      {/* bottom controls */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: t.spacing.md,
          paddingBottom: insets.bottom + t.spacing.xs,
        }}
      >
        <IconButton
          glyph={soundOn ? '🔊' : '🔇'}
          label={soundOn ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}
          onPress={() => toggleSetting('soundOn')}
          size={L.px(44)}
          tone="filled"
        />
      </View>

      {state.phase === 'gameOver' && humanWon && !reduced ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            pointerEvents: 'none',
          }}
        >
          <ConfettiCannon
            count={120}
            origin={{ x: win.width / 2, y: -20 }}
            fadeOut
            autoStart
            explosionSpeed={320}
            fallSpeed={2600}
            colors={CONFETTI}
          />
        </View>
      ) : null}

      {state.phase === 'gameOver' ? (
        <GameOverSheet state={state} onRematch={rematch} onHome={goHome} />
      ) : null}

      {paused && state.phase !== 'gameOver' ? (
        <PauseSheet onResume={resume} onRestart={restart} onHome={goHome} />
      ) : null}
    </View>
    </Backdrop>
  );
}
