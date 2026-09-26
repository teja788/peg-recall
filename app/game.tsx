import { WOOD_DIE_ASPECT } from '@art';
import { usePreventRemove } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGame } from '../src/store/game';
import { maybeRequestReview } from '../src/store/reviewPrompt';
import { useSettings, type GameMode } from '../src/store/settings';
import { PEG_PAINT, useTheme } from '../src/theme';
import { Backdrop } from '../src/ui/Backdrop';
import { Board, MIN_BOARD, boardHeightRatio, boardTiltFor } from '../src/ui/Board';
import { Die } from '../src/ui/Die';
import { GameOverSheet, gameOverHeadline, suddenDeathLine } from '../src/ui/GameOverSheet';
import { PauseSheet } from '../src/ui/PauseSheet';
import { PlayerTray, trayChromeWidth } from '../src/ui/PlayerTray';
import { RevealCountdown } from '../src/ui/RevealCountdown';
import { TurnBanner } from '../src/ui/TurnBanner';
import { IconButton, PauseGlyph } from '../src/ui/controls';
import { activePlayerSpec, availableColors, isHumanTurn, revealDurationMs } from '../src/ui/engine';
import {
  hapticFlip,
  hapticMatch,
  useAnnouncement,
  useReduceMotion,
  useSounds,
} from '../src/ui/feedback';
import { TRAY_GAP, tableLayout } from '../src/ui/gameLayout';
import { playerLabel, possessive } from '../src/ui/names';

import type { GameState, Peg, PegColor } from '../src/engine/types';

function isMode(v: unknown): v is GameMode {
  return v === 'ai' || v === '2p' || v === '3p';
}

/* ------------------------------------------------------------- proportions */

/*
 * The screen is one table. Where the banner, the disc, the die and the trays
 * go — stacked on a phone, the chrome in a side column on an iPad in
 * landscape — and how big each is, comes from `tableLayout()`
 * (src/ui/gameLayout.ts): the disc takes the space first, the rest is sized
 * around it.
 */

/** Confetti in the peg palette, so the win still reads as this game. */
const CONFETTI = Object.values(PEG_PAINT).map((p) => p.fill);

/** Wait before asking for a review: the sheet is up and the confetti is done. */
const REVIEW_DELAY_MS = 1500;

/** Did a person (not the computer) win this finished game? */
function humanWon(state: GameState): boolean {
  return (
    state.phase === 'gameOver' &&
    state.config.players.some((p) => p.kind === 'human' && state.winnerIds.includes(p.id))
  );
}

type Captures = Record<string, PegColor[]>;

/**
 * Pegs each player has taken, oldest first — the little row in their tray.
 * An array whose contents did not change keeps its identity from `prev`, so
 * the memoised trays of the players who did not just score do not re-render.
 */
function capturesOf(pegs: Peg[], prev: Captures): Captures {
  const by: Captures = {};
  for (const p of pegs) {
    if (p.state === 'captured' && p.capturedBy) (by[p.capturedBy] ??= []).push(p.color);
  }
  for (const id of Object.keys(by)) {
    const old = prev[id];
    if (old && old.length === by[id].length && old.every((c, i) => c === by[id][i])) by[id] = old;
  }
  return by;
}

/**
 * The banner line, its tone, and what VoiceOver should say at this moment.
 *
 * The spoken line is richer than the banner, since it cannot lean on what is
 * on screen: who caught what, the colour a missed peg turned out to be, what
 * the die landed on. Transient lines ("…is rolling") say nothing, so the
 * announcer's settle delay lets them pass.
 */
function tableCopy(
  state: GameState | null,
  busy: boolean,
): { banner: string; tone: 'normal' | 'accent'; say: string } {
  if (!state) return { banner: '', tone: 'normal', say: '' };
  const active = activePlayerSpec(state);
  const name = playerLabel(active);
  const colour = (c: PegColor) => PEG_PAINT[c].label;

  switch (state.phase) {
    case 'reveal': {
      const banner = state.suddenDeath ? 'Sudden death — look and remember!' : 'Look and remember!';
      const seconds = Math.round(revealDurationMs(state) / 1000);
      return {
        banner,
        tone: 'accent',
        say: `${state.suddenDeath ? "It's a tie. " : ''}${banner} ${seconds} seconds.`,
      };
    }
    case 'result': {
      const move = state.lastMove;
      if (!move) break;
      const who = playerLabel(
        state.config.players.find((p) => p.id === move.playerId) ?? active,
      );
      const peg = state.pegs[move.pegIndex];
      return move.matched
        ? { banner: 'Match!', tone: 'accent', say: `Match! ${who} caught ${colour(move.dieColor)}.` }
        : {
            banner: 'Not that one',
            tone: 'normal',
            say: peg ? `Not that one. That peg is ${colour(peg.color)}.` : 'Not that one.',
          };
    }
    case 'gameOver': {
      // The sheet covers the banner, but a sudden-death finish is not a clear
      // board — the mini board still has pegs standing on it.
      const headline = gameOverHeadline(state);
      const tie = suddenDeathLine(state);
      return {
        banner: state.suddenDeath ? headline : 'Board clear!',
        tone: 'normal',
        say: tie ? `${headline} ${tie}` : headline,
      };
    }
    case 'pick': {
      if (!state.dieColor) break;
      if (busy) return { banner: `${name} is rolling…`, tone: 'accent', say: '' };
      const c = colour(state.dieColor);
      return {
        banner: `Find ${c}`,
        tone: 'accent',
        say: active.kind === 'ai' ? `${name} rolled ${c}.` : `Die shows ${c}. Find ${c}.`,
      };
    }
    default:
      break;
  }
  return active.kind === 'ai'
    ? { banner: `${name} is thinking…`, tone: 'normal', say: `${possessive(name)} turn.` }
    : {
        banner: `${possessive(name)} turn`,
        tone: 'normal',
        say: `${possessive(name)} turn. Tap the die.`,
      };
}

function sameCaptures(a: Captures, b: Captures): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

export default function GameScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const reduced = useReduceMotion();
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
  /** set by the pause menu's Home button: stops the leave guard below */
  const [leaving, setLeaving] = useState(false);
  /**
   * The board as it was when Home was tapped. Leaving tears the game down at
   * once (no AI move, sound or haptic can fire on the way out), which empties
   * the store — this is what stays on screen during the exit transition.
   */
  const [frozen, setFrozen] = useState<GameState | null>(null);
  const started = useRef(false);
  const chime = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** measured height of the box the banner + board + die share (stacked
   *  layout), tagged with the window size it was measured at */
  const [tableBox, setTableBox] = useState({ key: '', h: 0 });

  /* ------------------------------------------------- lifecycle */

  // `started` guards against starting a second game on every render. Fast
  // Refresh keeps the ref but runs the cleanup below, which nulls the store —
  // so an empty store always means "no game running", whatever the ref says.
  const hasState = state != null;
  useEffect(() => {
    // a teardown on the way out empties the store too; that is not a cue to deal
    if (!hydrated || leaving) return;
    if (!hasState) started.current = false;
    if (started.current) return;
    started.current = true;
    start(mode, useSettings.getState());
  }, [hydrated, hasState, mode, start, leaving]);

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

  // The chime, like the confetti, is for a person winning — not for the
  // computer beating one.
  const celebrate = state != null && humanWon(state);
  useEffect(() => {
    if (celebrate) play('win');
  }, [celebrate, play]);

  /* ----------------------------------------------- review prompt */

  // Once per finished game, a moment after the sheet is up (the confetti has
  // had its moment) and only if it is still up: never from a button, never
  // mid-game. The store decides whether to actually ask; it never throws.
  const overKey = state?.phase === 'gameOver' ? `${state.config.seed}:${state.turn}` : null;
  const reviewedKey = useRef<string | null>(null);
  useEffect(() => {
    if (!overKey || leaving || reviewedKey.current === overKey) return;
    const id = setTimeout(() => {
      const g = useGame.getState().state;
      if (!g || g.phase !== 'gameOver' || AppState.currentState !== 'active') return;
      reviewedKey.current = overKey;
      const humans = g.config.players.filter((p) => p.kind === 'human');
      void maybeRequestReview({
        humanWon: humanWon(g),
        passAndPlay: humans.length > 1,
      }).catch(() => {});
    }, REVIEW_DELAY_MS);
    return () => clearTimeout(id);
  }, [overKey, leaving]);

  /* --------------------------------------------------- actions */

  const onAnchor = useCallback((id: string, point: { x: number; y: number }) => {
    setTrayAnchors((cur) =>
      cur[id] && cur[id].x === point.x && cur[id].y === point.y ? cur : { ...cur, [id]: point },
    );
  }, []);

  /** Back to Home, whether we were pushed from it or deep-linked straight here.
   *  The game is torn down on the spot rather than resumed: resuming re-armed
   *  every frozen timer, so an AI move, a sound or a haptic could fire during
   *  the exit. `frozen` keeps the last board drawn while the screen fades.
   *
   *  The leave is a two-step: `leaving` has to be committed before the router
   *  call, or the guard below (which only sees rendered state) would catch our
   *  own navigation and re-open the pause menu instead of letting us out. */
  const goHome = useCallback(() => {
    if (chime.current) clearTimeout(chime.current);
    setFrozen(useGame.getState().state);
    setLeaving(true);
    teardown();
  }, [teardown]);

  useEffect(() => {
    if (!leaving) return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [leaving, router]);

  const openPause = useCallback(() => {
    if (useGame.getState().state?.phase === 'gameOver') return;
    pause();
  }, [pause]);

  /** Restart from the pause menu: a new seed, and the board running again. */
  const restart = useCallback(() => {
    rematch();
  }, [rematch]);

  /* ------------------------------------------- leaving the game */

  // Backgrounding the app is not a pause the player asked for, but leaving a
  // live board on screen behind the app switcher (and letting the AI's timers
  // keep firing into a screen nobody is looking at) is worse. Store state is
  // read fresh inside, so this listener is mounted once and never goes stale.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') return;
      const g = useGame.getState();
      if (!g.state || g.paused || g.state.phase === 'gameOver') return;
      g.pause();
    });
    return () => sub.remove();
  }, []);

  // Android hardware back: open the menu rather than dropping the game. From
  // the menu it closes the menu; only the menu's Home button actually leaves.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const g = useGame.getState();
      if (!g.state || g.state.phase === 'gameOver') return false;
      if (g.paused) g.resume();
      else g.pause();
      return true;
    });
    return () => sub.remove();
  }, []);

  // …and the same for every other way off this screen: the iOS swipe-back
  // gesture, a header back, `router.back()`. `usePreventRemove` blocks the
  // native dismissal too, which a plain `beforeRemove` listener cannot.
  // Game over is not guarded — there is nothing left to interrupt — and nor is
  // a leave we started ourselves (`leaving`). Web is left out on purpose: the
  // browser's Back owns the history entry (see the Esc handler below), and a
  // guard there fights `popstate` instead of trapping it.
  usePreventRemove(
    Platform.OS !== 'web' && !leaving && state != null && state.phase !== 'gameOver',
    openPause,
  );

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

  /* --------------------------------------------- what is drawn */

  /** the live game, or — while leaving — the board as Home found it */
  const view = state ?? (leaving ? frozen : null);

  // Pegs each player has taken on the MAIN board. A sudden-death tie-break
  // swaps in a fresh 3x3 board, and deriving this from its pegs emptied every
  // tray at the very moment the tie was being decided; the engine keeps the
  // main totals in `scores` for the same reason. So the trays hold what they
  // had until the next real board. (Adjust-state-while-rendering, not an
  // effect: no frame ever shows the empty trays.)
  const [captured, setCaptured] = useState<Captures>({});
  if (view && !view.suddenDeath) {
    const now = capturesOf(view.pegs, captured);
    if (!sameCaptures(now, captured)) setCaptured(now);
  }

  const onPick = useCallback((pegIndex: number) => dispatch({ type: 'PICK', pegIndex }), [dispatch]);
  const onRoll = useCallback(() => dispatch({ type: 'ROLL' }), [dispatch]);

  /* ----------------------------------------------- composition */

  const winKey = `${win.width}x${win.height}`;
  const onTableLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      setTableBox((cur) => (cur.key === winKey && Math.abs(cur.h - h) < 0.5 ? cur : { key: winKey, h }));
    },
    [winKey],
  );
  // a box measured before a rotation or a Split View resize is not this box
  const tableH = tableBox.key === winKey ? tableBox.h : 0;

  const pegCount = view?.spec.pegs ?? 25;
  const playerCount = view?.config.players.length ?? 2;
  const L = useMemo(() => {
    const T = tableLayout({
      width: win.width,
      height: win.height,
      insets: { top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right },
      players: playerCount,
      ratioFor: (tilt) => boardHeightRatio(pegCount, tilt),
      tiltFor: boardTiltFor,
      minBoard: MIN_BOARD,
      measuredBox: tableH,
    });
    return { ...T, px: (n: number) => Math.round(n * T.scale) };
  }, [
    win.width,
    win.height,
    insets.top,
    insets.bottom,
    insets.left,
    insets.right,
    tableH,
    pegCount,
    playerCount,
  ]);
  /** tells the trays and the board to re-measure where they sit in the window */
  const measureKey = `${L.mode}:${winKey}:${L.width}`;

  const { banner, tone, say } = tableCopy(view, busy);
  // VoiceOver (iOS has no live regions): turn changes, "Find X", match/miss,
  // what the die landed on, the result. Silent while paused or leaving.
  useAnnouncement(paused || leaving ? '' : say);

  if (!view) {
    return (
      <Backdrop>
        <View style={{ flex: 1 }} accessibilityLabel="Loading game" />
      </Backdrop>
    );
  }
  // everything below draws `view`; while leaving it is a still frame
  const human = isHumanTurn(view);
  const canRoll = !leaving && view.phase === 'roll' && human && !busy && !paused;
  const canPick = !leaving && view.phase === 'pick' && human && !busy && !paused;
  const won = humanWon(view);

  const trayCount = view.config.players.length;
  const stacked = L.mode === 'stacked';
  // Stacked: the trays share the row beside the pause button, each an equal
  // share; the name gets whatever of that share the avatar and padding leave
  // (capped at 64 / 100 pt), so all three stay on one line on a 375-pt phone
  // and a long name ellipsizes instead of wrapping a tray onto a second row.
  // Past ~1.4x Dynamic Type they still wrap rather than clip.
  // Side column: one tray per line, each the column's full width.
  const dense = stacked && trayCount > 2;
  const traySize = L.px(dense ? 30 : 36);
  const trayGap = L.px(dense ? t.spacing.xs + 2 : t.spacing.sm);
  const trayRow = win.width - insets.left - insets.right - 2 * t.spacing.md - L.px(48) - t.spacing.sm;
  const trayShare = stacked ? (trayRow - trayGap * (trayCount - 1)) / trayCount : L.colW;
  const nameMaxWidth = Math.max(
    32,
    Math.min(
      stacked ? L.px(dense ? 64 : 100) : L.colW,
      Math.floor(trayShare - trayChromeWidth(traySize, L.scale, dense) - 2),
    ),
  );

  const trays = view.config.players.map((p, i) => (
    <PlayerTray
      key={p.id}
      spec={p}
      score={view.scores[p.id] ?? 0}
      captured={captured[p.id]}
      maxPegs={dense ? 2 : 4}
      active={i === view.activePlayer && view.phase !== 'gameOver'}
      size={traySize}
      scale={L.scale}
      onAnchor={onAnchor}
      measureKey={measureKey}
      nameMaxWidth={nameMaxWidth}
      dense={dense}
    />
  ));

  const pauseButton = (
    <IconButton
      icon={<PauseGlyph size={Math.round(L.px(48) * 0.5)} color={t.c.text} />}
      label="Pause"
      hint="Stops the game and opens the menu"
      onPress={openPause}
      size={L.px(48)}
      tone="filled"
    />
  );
  const soundButton = (
    <IconButton
      glyph={soundOn ? '🔊' : '🔇'}
      label={soundOn ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}
      onPress={() => toggleSetting('soundOn')}
      size={L.px(44)}
      tone="filled"
    />
  );

  const turnBanner = <TurnBanner text={banner} tone={tone} scale={L.chromeScale} />;

  const board = (
    <Board
      state={view}
      width={L.width}
      tilt={L.tilt}
      showShapes={showShapes}
      disabled={!canPick}
      onPick={onPick}
      trayAnchors={trayAnchors}
      moveNonce={view.turn}
      measureKey={measureKey}
    />
  );

  /* die / countdown, with room for the hint under it so nothing jumps */
  const dieSlot = (
    <View style={{ height: L.dieBlock, alignItems: 'center' }}>
      <View
        style={{
          height: Math.round(L.die * WOOD_DIE_ASPECT),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {view.phase === 'reveal' ? (
          <RevealCountdown
            size={Math.round(64 * L.chromeScale)}
            durationMs={revealDurationMs(view)}
            paused={paused || leaving}
            boardId={view.config.seed}
            onDone={() => dispatch({ type: 'REVEAL_DONE' })}
          />
        ) : (
          <Die
            dieColor={view.dieColor}
            colors={availableColors(view)}
            rerolls={view.dieRerolls ?? 0}
            canRoll={canRoll}
            showShapes={showShapes}
            size={L.die}
            onRoll={onRoll}
            onTumbleSound={() => play('roll')}
          />
        )}
      </View>
      {view.phase === 'roll' && human ? (
        <Text
          numberOfLines={1}
          style={{
            ...t.type.caption,
            fontSize: Math.round(t.type.caption.fontSize * L.chromeScale),
            lineHeight: Math.round(t.type.caption.lineHeight * L.chromeScale),
            color: t.c.onBackdropMuted,
            marginTop: Math.round(4 * L.chromeScale),
          }}
        >
          Tap the die
        </Text>
      ) : null}
    </View>
  );

  /* Overlays are siblings of the inset-padded column, not children of it:
     a scrim laid out inside that column starts below the status bar and
     leaves a live strip of board showing above it — which during the
     reveal is a strip of face-up pegs the pause menu is meant to hide. */
  const overlays = (
    <>
    {view.phase === 'gameOver' && won && !reduced ? (
      <View style={{ ...StyleSheet.absoluteFillObject, pointerEvents: 'none' }}>
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

    {view.phase === 'gameOver' ? (
      <GameOverSheet state={view} onRematch={rematch} onHome={goHome} />
    ) : null}

    {/* while leaving, the menu stays up over the still frame it was
        closed from (the teardown has already lifted `paused`) */}
    {(paused || leaving) && view.phase !== 'gameOver' ? (
      <PauseSheet onResume={resume} onRestart={restart} onHome={goHome} />
    ) : null}
    </>
  );

  if (!stacked) {
    // Wide window: the disc takes the full height, the chrome moves beside it
    // — one column on the right (pause + sound, trays, then the die under the
    // right thumb), or, when that column is too tall for the window (a phone
    // on its side), the trays on the left and the die on the right.
    const split = L.mode === 'split';
    const buttons = (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {pauseButton}
        {soundButton}
      </View>
    );
    const trayColumn = <View style={{ rowGap: L.px(TRAY_GAP) }}>{trays}</View>;
    return (
      <Backdrop>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            paddingTop: insets.top + L.edge,
            paddingBottom: insets.bottom + L.edge,
            paddingLeft: insets.left + L.edge,
            paddingRight: insets.right + L.edge,
            columnGap: L.edge,
          }}
        >
          {split ? (
            <View style={{ width: L.colW, rowGap: L.px(16) }}>
              {buttons}
              {trayColumn}
            </View>
          ) : null}

          {/* above the columns, so a captured peg flies over the trays */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            {turnBanner}
            <View style={{ height: L.bannerGap }} />
            {board}
          </View>

          <View style={{ width: L.colW }}>
            {split ? null : (
              <View style={{ rowGap: L.px(16) }}>
                {buttons}
                {trayColumn}
              </View>
            )}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{dieSlot}</View>
          </View>
        </View>
        {overlays}
      </Backdrop>
    );
  }

  return (
    <Backdrop>
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {/* trays */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: insets.left + t.spacing.md,
          paddingRight: insets.right + t.spacing.md,
          paddingTop: L.px(t.spacing.xs),
          gap: t.spacing.sm,
        }}
      >
        {pauseButton}
        {/* wraps rather than clipping: at the larger Dynamic Type sizes three
            trays no longer fit across a phone on one line */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            alignItems: 'center',
            columnGap: trayGap,
            rowGap: L.px(t.spacing.xs),
            flexShrink: 1,
          }}
        >
          {trays}
        </View>
      </View>

      {/* the table: banner, disc and die read as one block, centred together.
          It paints over the tray row (a captured peg flies up into it), and
          only clips when a squat window has pushed the disc to its floor. */}
      <View
        onLayout={onTableLayout}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: L.overflows ? 'hidden' : 'visible',
          zIndex: 1,
        }}
      >
        {turnBanner}

        <View style={{ height: L.bannerGap }} />

        {board}

        <View style={{ height: L.dieGap }} />

        {/* die / countdown, directly under the disc */}
        {dieSlot}
      </View>

      {/* bottom controls */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: insets.left + t.spacing.md,
          paddingRight: insets.right + t.spacing.md,
          paddingBottom: insets.bottom + t.spacing.xs,
        }}
      >
        {soundButton}
      </View>
    </View>
    {overlays}
    </Backdrop>
  );
}
