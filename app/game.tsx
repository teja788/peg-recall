import { WOOD_DIE_ASPECT } from '@art';
import { usePreventRemove } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  I18nManager,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { reportUrl } from '../src/online/config';
import { useGame } from '../src/store/game';
import { useRoom } from '../src/store/room';
import { maybeRequestReview, reviewDue } from '../src/store/reviewPrompt';
import { hasStore } from '../src/store/storefront';
import { dailyBoard, dailyNumber } from '../src/store/stats';
import {
  deal,
  isLocked,
  moreToTry,
  upsellCard,
  useSettings,
  withTries,
  type GameMode,
  type Lockable,
  type Settings,
} from '../src/store/settings';
import { PEG_PAINT, useTheme } from '../src/theme';
import { Backdrop } from '../src/ui/Backdrop';
import { Board, MIN_BOARD, boardHeightRatio, boardTiltFor } from '../src/ui/Board';
import { Die } from '../src/ui/Die';
import { GameOverSheet, gameOverHeadline, suddenDeathLine } from '../src/ui/GameOverSheet';
import { PauseSheet } from '../src/ui/PauseSheet';
import { PlayerTray, trayChromeWidth } from '../src/ui/PlayerTray';
import { RevealCountdown } from '../src/ui/RevealCountdown';
import { TurnBanner } from '../src/ui/TurnBanner';
import { UnlockSheet } from '../src/ui/UnlockSheet';
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
import { isolate, playerLabel } from '../src/ui/names';
import { RemovePlayers, seatName } from '../src/ui/online';
import { tr, trn } from '../src/i18n';

import type { GameState, Peg, PegColor } from '../src/engine/types';

function isMode(v: unknown): v is GameMode {
  return v === 'ai' || v === '2p' || v === '3p' || v === '4p';
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
  // isolated, so a right-to-left name cannot drag the words around it
  const name = isolate(playerLabel(active));
  const colour = (c: PegColor) => tr(`color.${c}`);

  switch (state.phase) {
    case 'reveal': {
      const banner = tr(state.suddenDeath ? 'game.lookSudden' : 'game.look');
      const seconds = Math.round(revealDurationMs(state) / 1000);
      return {
        banner,
        tone: 'accent',
        say: `${state.suddenDeath ? `${tr('game.tie')} ` : ''}${banner} ${trn('seconds', seconds)}.`,
      };
    }
    case 'result': {
      const move = state.lastMove;
      if (!move) break;
      const who = isolate(
        playerLabel(state.config.players.find((p) => p.id === move.playerId) ?? active),
      );
      const peg = state.pegs[move.pegIndex];
      return move.matched
        ? {
            banner: tr('game.match'),
            tone: 'accent',
            say: tr('game.matchSay', { name: who, color: colour(move.dieColor) }),
          }
        : {
            banner: tr('game.miss'),
            tone: 'normal',
            say: peg ? tr('game.missSay', { color: colour(peg.color) }) : tr('game.miss'),
          };
    }
    case 'gameOver': {
      // The sheet covers the banner, but a sudden-death finish is not a clear
      // board — the mini board still has pegs standing on it.
      const headline = gameOverHeadline(state);
      const tie = suddenDeathLine(state);
      return {
        banner: state.suddenDeath ? headline : tr('game.boardClear'),
        tone: 'normal',
        say: tie ? `${headline} ${tie}` : headline,
      };
    }
    case 'pick': {
      if (!state.dieColor) break;
      if (busy) return { banner: tr('game.rolling', { name }), tone: 'accent', say: '' };
      const c = colour(state.dieColor);
      return {
        banner: tr('game.find', { color: c }),
        tone: 'accent',
        say:
          active.kind === 'ai'
            ? tr('game.aiRolled', { name, color: c })
            : tr('game.dieShows', { color: c }),
      };
    }
    default:
      break;
  }
  return active.kind === 'ai'
    ? { banner: tr('game.thinking', { name }), tone: 'normal', say: tr('game.turn', { name }) }
    : {
        banner: tr('game.turn', { name }),
        tone: 'normal',
        say: tr('game.turnSay', { name }),
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
  // iOS swaps paddingLeft/Right in RTL, but insets are physical edges (the
  // iPhone Duo's island is on one side): pre-swap so each lands on its edge.
  const swap = I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL;
  const padL = swap ? insets.right : insets.left;
  const padR = swap ? insets.left : insets.right;
  const win = useWindowDimensions();
  const reduced = useReduceMotion();
  const params = useLocalSearchParams<{ mode?: string; daily?: string; room?: string }>();
  /** the mode asked for; `deal` decides what is actually played */
  const requested: GameMode = isMode(params.mode) ? params.mode : 'ai';
  /** Home's "Today's board": the first game here is the daily board */
  const isDaily = params.daily === '1';
  /** an online game (?room=482913): the room server deals and referees it */
  const roomCode = typeof params.room === 'string' && params.room ? params.room : null;
  const online = roomCode != null;
  const remote = useGame((s) => s.remote);
  const waiting = useGame((s) => s.waiting);
  const roomInfo = useRoom((s) => s.room);
  const roomStatus = useRoom((s) => s.status);
  const roomEnded = useRoom((s) => s.ended);
  /** online: the room menu is up (the board does not stop for it) */
  const [menu, setMenu] = useState(false);
  const unlocked = useSettings((s) => s.unlocked);

  const hydrated = useSettings((s) => s.hydrated);
  const showShapes = useSettings((s) => s.showShapes);
  const soundOn = useSettings((s) => s.soundOn);
  const toggleSetting = useSettings((s) => s.toggle);

  const state = useGame((s) => s.state);
  const daily = useGame((s) => s.daily);
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
  /** `leaving`, but set at once: a second tap in the same frame sees it */
  const leavingNow = useRef(false);
  /** online, this board is no longer the room's (it ended, or a reload lost
   *  it): off to the room page, past the leave guard */
  const terminal = online && !leaving && (roomEnded != null || remote == null);
  const started = useRef(false);
  /** the locked items the game on the table plays on their free try */
  const trial = useRef<Lockable[]>([]);
  /** the game-over card (see `upsellCard`), for the game-over it was picked on */
  const [upsell, setUpsell] = useState<{ key: string; card: 'unlock' | 'more'; more: ('big' | 'owl')[] } | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const chime = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** measured height of the box the banner + board + die share (stacked
   *  layout), tagged with the window size it was measured at */
  const [tableBox, setTableBox] = useState({ key: '', h: 0 });

  /* ------------------------------------------------- lifecycle */

  // `started` guards against starting a second game on every render. Fast
  // Refresh keeps the ref but runs the cleanup below, which nulls the store —
  // so an empty store always means "no game running", whatever the ref says.
  const hasState = state != null;

  /**
   * A new game from the stored settings. A locked item with its free try left
   * is played, and the try is used up right here, as the game starts.
   * `once` plays this game on other choices without storing them.
   */
  const dealNew = useCallback(
    (once?: Partial<Pick<Settings, 'boardSize' | 'difficulty'>>, daily = false) => {
      const s = useSettings.getState();
      if (daily) {
        // Classic (Big at weekends) vs Fox on the standard rules, never behind
        // the unlock, and seeded by the day: the same board and dice for everyone
        const n = dailyNumber(Date.now());
        start('ai', { ...s, boardSize: dailyBoard(n), difficulty: 'fox', bonusTurnOnMatch: true, kidMode: false }, n, n);
        trial.current = [];
        return;
      }
      const d = deal(requested, { ...s, ...once });
      start(d.mode, d.settings);
      trial.current = d.tries;
      if (d.tries.length) s.set('triesUsed', withTries(s.triesUsed, d.tries));
    },
    [requested, start],
  );

  useEffect(() => {
    // online, the room deals (src/store/room.ts)
    if (online) return;
    // a teardown on the way out empties the store too; that is not a cue to deal
    if (!hydrated || leaving) return;
    if (!hasState) started.current = false;
    if (started.current) return;
    started.current = true;
    dealNew(undefined, isDaily);
  }, [hydrated, hasState, dealNew, leaving, isDaily, online]);

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
  // online, only the winner's own screen celebrates
  const celebrate =
    state != null &&
    (online ? state.phase === 'gameOver' && !!remote && state.winnerIds.includes(remote.seat) : humanWon(state));
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
    // a game played on a free try gets the "Liked it?" card instead; the
    // rating waits for the next game-over
    if (trial.current.length) return;
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
    // a second tap would freeze the emptied store and draw nothing on the way out
    if (leavingNow.current) return;
    leavingNow.current = true;
    if (chime.current) clearTimeout(chime.current);
    setFrozen((cur) => cur ?? useGame.getState().state);
    setLeaving(true);
    // online: out of the room too (the computer finishes this game for us)
    if (online) useRoom.getState().leave();
    teardown();
  }, [teardown, online]);

  useEffect(() => {
    if (!leaving) return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [leaving, router]);

  const openPause = useCallback(() => {
    if (useGame.getState().state?.phase === 'gameOver') return;
    if (online) setMenu(true);
    else pause();
  }, [pause, online]);

  /** online: the host deals the next game for everyone */
  const onlineRematch = useCallback(() => useRoom.getState().rematch(), []);

  /** Play again / Restart: a new seed, and the board running again. A game
   *  played on a free try is not replayed: it deals again from the settings,
   *  which (the try now used) fall back to the free choices. */
  const restart = useCallback(() => {
    if (leavingNow.current) return; // never a new game mid-exit
    setUnlocking(false);
    // a weekend daily is on the Big board for everyone; replaying it is not
    const g = useGame.getState();
    const lockedDaily = g.daily != null && !!g.state && isLocked(useSettings.getState().unlocked, g.state.config.boardSize);
    if (trial.current.length || lockedDaily) dealNew();
    else rematch();
  }, [rematch, dealNew]);

  /* ----------------------------------------------- upsell card */

  // Picked once per game-over, when it begins: what the card offers must not
  // change under the player (nor vanish when the rating prompt marks itself).
  useEffect(() => {
    // no offers on an online game: it is the room's, not this device's
    if (!overKey || online) return;
    const g = useGame.getState().state;
    if (!g || g.phase !== 'gameOver') return;
    const s = useSettings.getState();
    const won = humanWon(g);
    const card = upsellCard(s, {
      tries: trial.current.length,
      humanWon: won,
      vsComputer: g.config.players.some((p) => p.kind === 'ai'),
      boardSize: g.config.boardSize,
      reviewDue: reviewDue({
        humanWon: won,
        passAndPlay: g.config.players.filter((p) => p.kind === 'human').length > 1,
      }),
      noTries: !hasStore,
    });
    setUpsell(card ? { key: overKey, card, more: moreToTry(s) } : null);
    // both once-ever cards: "Ready for more?", and the web game's "Liked it?"
    if (card === 'more' || (card && !hasStore)) s.set('moreOffered', true);
  }, [overKey, online]);

  /** "Ready for more?" → straight into a game on the Big board and/or vs Owl.
   *  Only this game: the stored choices stay, so Play again after the try goes
   *  back to them (a Bunny player is not left on Fox). */
  const tryMore = useCallback(
    (more: ('big' | 'owl')[]) => {
      // a second tap would land on the new game and deal it again without its try
      if (leavingNow.current || useGame.getState().state?.phase !== 'gameOver') return;
      setUpsell(null);
      dealNew({
        ...(more.includes('big') ? { boardSize: 'big' as const } : {}),
        ...(more.includes('owl') ? { difficulty: 'owl' as const } : {}),
      });
    },
    [dealNew],
  );

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
    Platform.OS !== 'web' && !leaving && !terminal && state != null && state.phase !== 'gameOver',
    openPause,
  );

  // online with no board from the room (a reload), or the room ended: the
  // room page rejoins, or says what happened. Declared after the guard above,
  // which `terminal` has already released by the time this runs (audit F03).
  useEffect(() => {
    if (terminal) router.replace({ pathname: '/room/[code]', params: { code: roomCode } });
  }, [terminal, roomCode, router]);

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
        <View style={{ flex: 1 }} accessibilityLabel={tr('game.loading')} />
      </Backdrop>
    );
  }
  // everything below draws `view`; while leaving it is a still frame
  const human = isHumanTurn(view);
  // online, only this device's seat moves, and each tap goes to the server once
  const mine = online ? remote != null && activePlayerSpec(view).id === remote.seat : human;
  const canRoll = !leaving && view.phase === 'roll' && mine && !busy && !paused && !waiting;
  const canPick = !leaving && view.phase === 'pick' && mine && !busy && !paused && !waiting;
  const won = online
    ? view.phase === 'gameOver' && !!remote && view.winnerIds.includes(remote.seat)
    : humanWon(view);
  // never for an unlocked player (a purchase from the card hides it at once)
  const card = !online && !unlocked && upsell && upsell.key === overKey ? upsell.card : null;
  const hostSeat = roomInfo?.seats.find((x) => x.id === roomInfo.host);
  const awaySeat = roomInfo?.seats.find((x) => x.kind === 'human' && !x.online && x.id !== remote?.seat);
  const onlineNote = !online
    ? ''
    : roomStatus === 'connecting' || roomStatus === 'reconnecting'
      ? tr('online.reconnecting')
      : awaySeat
        ? tr('online.awayLine', { name: seatName(awaySeat) })
        : '';

  const trayCount = view.config.players.length;
  const stacked = L.mode === 'stacked';
  // Stacked: the trays share the row beside the pause button, each an equal
  // share; the name gets whatever of that share the avatar and padding leave
  // (capped at 64 / 100 pt), so all three stay on one line on a 375-pt phone
  // and a long name ellipsizes instead of wrapping a tray onto a second row.
  // Past ~1.4x Dynamic Type they still wrap rather than clip.
  // Four trays on a phone-width row leave no room for names: they go
  // compact (avatar and score only; the banner says whose turn it is).
  // Side column: one tray per line, each the column's full width.
  const dense = stacked && trayCount > 2;
  const trayGap = L.px(dense ? t.spacing.xs + 2 : t.spacing.sm);
  const trayRow = win.width - insets.left - insets.right - 2 * t.spacing.md - L.px(48) - t.spacing.sm;
  const trayShare = stacked ? (trayRow - trayGap * (trayCount - 1)) / trayCount : L.colW;
  const compact = stacked && trayCount > 3 && trayShare - trayChromeWidth(L.px(30), L.scale, true) < 40;
  // the narrowest phones (320 pt) fit four chips on one row only smaller
  const tight = compact && trayShare < 58;
  const traySize = L.px(compact ? (tight ? 22 : 26) : dense ? 30 : 36);
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
      compact={compact}
    />
  ));

  const pauseButton = (
    <IconButton
      icon={<PauseGlyph size={Math.round(L.px(48) * 0.5)} color={t.c.text} />}
      label={tr('game.pause')}
      hint={tr('game.pauseHint')}
      onPress={openPause}
      size={L.px(48)}
      tone="filled"
    />
  );
  const soundButton = (
    <IconButton
      glyph={soundOn ? '🔊' : '🔇'}
      label={tr(soundOn ? 'common.soundOn' : 'common.soundOff')}
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
      {view.phase === 'roll' && mine ? (
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
          {tr('game.tapDie')}
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
      <GameOverSheet
        state={view}
        daily={daily ?? undefined}
        onRematch={online ? onlineRematch : restart}
        onHome={goHome}
        waitNote={
          online && remote && roomInfo && roomInfo.host !== remote.seat
            ? tr('online.waitNext', { name: hostSeat ? seatName(hostSeat) : '' })
            : undefined
        }
        upsell={
          card === 'unlock'
            ? {
                title: tr('upsell.likedTitle'),
                line: tr('unlock.what'),
                action: tr('upsell.look'),
                onAction: () => setUnlocking(true),
                onDismiss: () => setUpsell(null),
              }
            : card === 'more' && upsell
              ? {
                  title: tr('upsell.moreTitle'),
                  line: tr(
                    upsell.more.length > 1
                      ? 'upsell.moreBoth'
                      : upsell.more[0] === 'big'
                        ? 'upsell.moreBig'
                        : 'upsell.moreOwl',
                  ),
                  action: tr('upsell.moreButton'),
                  onAction: () => tryMore(upsell.more),
                  onDismiss: () => setUpsell(null),
                }
              : undefined
        }
      />
    ) : null}

    {unlocking && view.phase === 'gameOver' ? (
      <UnlockSheet onClose={() => setUnlocking(false)} />
    ) : null}

    {/* while leaving, the menu stays up over the still frame it was
        closed from (the teardown has already lifted `paused`) */}
    {!online && (paused || leaving) && view.phase !== 'gameOver' ? (
      <PauseSheet onResume={resume} onRestart={restart} onHome={goHome} />
    ) : null}

    {online && menu && view.phase !== 'gameOver' ? (
      <PauseSheet
        onResume={() => setMenu(false)}
        onHome={goHome}
        title={tr('online.menu')}
        body={tr('online.menuBody')}
        homeLabel={tr('online.leave')}
        homeHint={tr('online.leaveHint')}
        extra={{
          label: tr('online.report'),
          onPress: () => void Linking.openURL(reportUrl(roomCode, remote?.seat ?? null)).catch(() => {}),
        }}
      >
        {roomInfo && remote ? (
          <RemovePlayers
            room={roomInfo}
            me={remote.seat}
            onRemove={(seat) => useRoom.getState().removeSeat(seat)}
          />
        ) : null}
      </PauseSheet>
    ) : null}

    {onlineNote ? (
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + t.spacing.sm,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={{
            ...t.type.caption,
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.45)',
            paddingHorizontal: t.spacing.md,
            paddingVertical: 4,
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          {onlineNote}
        </Text>
      </View>
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
            paddingLeft: padL + L.edge,
            paddingRight: padR + L.edge,
            columnGap: L.edge,
            // keeps the board's zIndex in here; see the stacked layout below
            zIndex: 0,
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
    {/* zIndex 0 makes this column its own stacking context. Without it the
        native side flattens this layout-only View away, the table's zIndex 1
        lands among the overlays, and the board paints over the game-over
        sheet, hiding Play again / Home (web stacks z-index the same way). */}
    <View style={{ flex: 1, paddingTop: insets.top, zIndex: 0 }}>
      {/* trays */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: padL + t.spacing.md,
          paddingRight: padR + t.spacing.md,
          paddingTop: L.px(t.spacing.xs),
          gap: t.spacing.sm,
        }}
      >
        {pauseButton}
        {/* wraps rather than clipping: at the larger Dynamic Type sizes three
            (or four compact) trays no longer fit across a phone on one line */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            alignItems: 'center',
            columnGap: tight ? L.px(t.spacing.xs) : trayGap,
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
          paddingLeft: padL + t.spacing.md,
          paddingRight: padR + t.spacing.md,
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
