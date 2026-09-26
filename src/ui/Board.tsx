/**
 * Color Catch — the round board, seen from a 3/4 angle (PLAN.md section 2).
 *
 * A wooden disc lying on the table with peg dolls standing in drilled holes.
 * Layout comes from `roundLayout()` (peg index i ↔ positions[i]); the art layer
 * squashes those circle-space points onto the tilted ellipse. Pegs are painted
 * back to front so near rows overlap far ones, and the touch targets are laid
 * over the top in the same order, so the peg you can see is the peg you hit.
 *
 * Never scrolls: the disc is sized from whatever box the parent hands us (the
 * game screen works that out in src/ui/gameLayout.ts), so on a small phone it
 * shrinks and on an iPad it grows to fill the screen. Pegs, holes and touch
 * targets all scale with the disc.
 */
import {
  PEG_DOLL_ASPECT,
  PEG_DOLL_CAP_HEIGHT,
  PEG_DOLL_STAND_HEIGHT,
  PerspectiveBoard,
  boardCentre,
  boardHeight,
  holeSizeFor,
  pegDollAnchor,
  pegWidthFor,
  projectHole,
  type ArtTheme,
} from '@art';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { GameState } from '../engine/types';
import { roundLayout, type RoundLayout } from '../layout/roundLayout';
import { PEG_PAINT, useTheme } from '../theme';
import { MovingPeg, PEG_ANIM, Peg } from './Peg';

/**
 * How hard the board is tilted. 1 = seen from straight above.
 *
 * Both numbers come from the readability pass (assets/source/ART-NOTES.md):
 * the reference toy sits at 0.61 and reads instantly, our old 0.50 / 0.58 did
 * not, because the squashed rows put every peg's head over the base of the
 * peg behind it. The invariant to keep when touching these: the head height
 * (`PEG_DOLL_CAP_HEIGHT * pegWidth`) must stay below the projected row pitch
 * (`spacing * 0.866 * tilt`) — `metricsFor()` logs both in dev.
 */
export const BOARD_TILT = 0.62;
/** Tilt used when the screen is tall enough to spend the height on the disc. */
export const BOARD_TILT_TALL = 0.66;
/** Breathing room between the disc and the edge of the box we were given. */
const SIDE_MARGIN = 16;
/**
 * Only for a board that sizes itself (no `width`): the game screen passes its
 * own width, worked out from the space actually on screen, and is not capped.
 */
const MAX_BOARD = 1400;
/**
 * The disc never shrinks below this, however short the window is. A squat
 * window (a landscape phone, an iPad Stage Manager sliver) leaves so little
 * height once the banner and the die have taken theirs that the fit-to-height
 * maths comes out at zero — and a zero-width board renders nothing at all. A
 * board that overflows its box and gets clipped is recoverable; a blank screen
 * is not. Callers shrink their own chrome first, and only then let the disc
 * spill (app/game.tsx).
 */
export const MIN_BOARD = 180;
/** Minimum touch target (PLAN.md section 4 asks for 52 where it can be had). */
const TOUCH = 52;

/**
 * A tall screen (a phone in portrait) can afford the deeper 3/4 view: the disc
 * gets its full width and spends the extra height on perspective. A squat one
 * (iPad, a Stage Manager window) flattens back out so the board still fits.
 */
export function boardTiltFor(width: number, height: number): number {
  return height / Math.max(1, width) >= 2.0 ? BOARD_TILT_TALL : BOARD_TILT;
}

export interface BoardProps {
  state: GameState;
  showShapes: boolean;
  /** true while an animation owns the screen or it is not this human's turn */
  disabled: boolean;
  onPick: (pegIndex: number) => void;
  /** window coordinates of each player's tray, for the capture flight */
  trayAnchors?: Record<string, { x: number; y: number }>;
  /** bumped once per resolved move, so the flight restarts cleanly */
  moveNonce?: number;
  /**
   * Disc diameter in points. The screen owns this number so it can lay the
   * banner and the die out against the same geometry; leave it out and the
   * board falls back to filling whatever box it is dropped in.
   */
  width?: number;
  /** Vertical squash of the disc; see `boardTiltFor()`. */
  tilt?: number;
  /**
   * Changes whenever the board may have moved in the window without its own
   * layout changing (rotation, a Split View resize): the capture flight's
   * origin is measured again.
   */
  measureKey?: string;
}

interface Metrics {
  layout: RoundLayout;
  /** drawn width of one peg doll */
  pegWidth: number;
  holeSize: number;
  /** total height of the board + the pegs poking above it */
  height: number;
  /** how far the disc is pushed down to make room for the back row's caps */
  overhang: number;
  /** peg box top-left inside the board container, painted back to front */
  pegs: {
    index: number;
    left: number;
    top: number;
    /** projected y, only used for the z-sort */
    depth: number;
    ring: number;
    ringOrder: number;
  }[];
  hit: { w: number; h: number; dy: number };
}

/** Geometry of a board `width` points across holding `pegCount` pegs. */
function metricsFor(pegCount: number, width: number, tilt: number = BOARD_TILT): Metrics {
  const layout = roundLayout(pegCount, width);
  const pegWidth = pegWidthFor(layout.spacing);
  const holeSize = holeSizeFor(pegWidth);
  const centre = boardCentre(width, tilt);
  const anchor = pegDollAnchor(pegWidth);
  const boxH = pegWidth * PEG_DOLL_ASPECT;

  let top = 0;
  let bottom = boardHeight(width, tilt);
  const raw = layout.positions.map((p) => {
    const q = projectHole(p.x, p.y, tilt);
    const y = centre.y + q.y - anchor.y;
    top = Math.min(top, y);
    bottom = Math.max(bottom, y + boxH);
    return { p, x: centre.x + q.x - anchor.x, y };
  });
  const overhang = -top;

  // ring order: positions come out of roundLayout sorted by ring, then clockwise
  const ringOrder = new Map<number, number>();
  const seen = new Map<number, number>();
  for (const { p } of raw) {
    const n = seen.get(p.ring) ?? 0;
    seen.set(p.ring, n + 1);
    ringOrder.set(p.index, n);
  }

  const pegs = raw
    .map(({ p, x, y }) => ({
      index: p.index,
      left: x,
      top: y + overhang,
      depth: p.y,
      ring: p.ring,
      ringOrder: ringOrder.get(p.index) ?? 0,
    }))
    .sort((a, b) => a.depth - b.depth || a.left - b.left);

  // The touch cell sits over the peg, not over the hole: on a tilted board the
  // head is a full peg-height above the hole it stands in, and players tap what
  // they can see. Cells overlap (rows are only spacing*0.57 apart once the
  // board is squashed) and the nearer peg, painted and mounted later, wins.
  const capTop = pegWidth * PEG_DOLL_STAND_HEIGHT;
  const hit = {
    w: Math.max(TOUCH, layout.spacing),
    h: Math.max(TOUCH, capTop),
    dy: -capTop,
  };

  return { layout, pegWidth, holeSize, height: overhang + bottom, overhang, pegs, hit };
}

/** Height of the whole scene as a multiple of its width, for a peg count. */
const ratioCache = new Map<string, number>();
export function boardHeightRatio(pegCount: number, tilt: number = BOARD_TILT): number {
  const key = `${pegCount}:${tilt}`;
  let r = ratioCache.get(key);
  if (r == null) {
    r = metricsFor(pegCount, 1000, tilt).height / 1000;
    ratioCache.set(key, r);
  }
  return r;
}

/**
 * One peg's touch target. Memoised with a per-index press handler, so a move
 * re-renders only the cells whose peg actually changed instead of rebuilding
 * 40 Pressables with fresh closures on every store update.
 */
const PegHit = memo(function PegHit({
  index,
  label,
  off,
  onPick,
  left,
  top,
  width,
  height,
}: {
  index: number;
  label: string;
  off: boolean;
  onPick: (pegIndex: number) => void;
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  const onPress = useCallback(() => onPick(index), [onPick, index]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off }}
      disabled={off}
      hitSlop={6}
      onPress={onPress}
      style={{ position: 'absolute', left, top, width, height }}
    />
  );
});

function BoardImpl({
  state,
  showShapes,
  disabled,
  onPick,
  trayAnchors,
  moveNonce = 0,
  width: fixedWidth,
  tilt = BOARD_TILT,
  measureKey,
}: BoardProps) {
  const t = useTheme();
  const theme: ArtTheme = t.scheme;
  const pegCount = state.spec.pegs;
  const [box, setBox] = useState({ w: 0, h: 0 });
  const boardRef = useRef<View>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  // The flip-down wave only runs on the edge out of the reveal. Derived with
  // the "adjust state while rendering" pattern rather than by writing a ref
  // mid-render: a ref write is a side effect, so under StrictMode's double
  // render (or a render React throws away) the edge is seen once and lost.
  // `staggerDown` then stays set until the next phase change, which is
  // harmless — Peg reads `fallDelay` through a ref and never restarts a live
  // fade on it.
  const [prevPhase, setPrevPhase] = useState(state.phase);
  const [staggerDown, setStaggerDown] = useState(false);
  if (prevPhase !== state.phase) {
    setPrevPhase(state.phase);
    setStaggerDown(prevPhase === 'reveal');
  }

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((cur) => (cur.w === width && cur.h === height ? cur : { w: width, h: height }));
  }, []);

  const onBoardLayout = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) =>
      setOrigin((cur) => (cur.x === x && cur.y === y ? cur : { x, y })),
    );
  }, []);

  useEffect(() => {
    if (measureKey == null) return;
    const id = requestAnimationFrame(onBoardLayout);
    return () => cancelAnimationFrame(id);
  }, [measureKey, onBoardLayout]);

  const width = useMemo(() => {
    if (fixedWidth != null) return Math.max(0, Math.floor(fixedWidth));
    if (box.w <= 0 || box.h <= 0) return 0;
    const ratio = boardHeightRatio(pegCount, tilt);
    const fit = Math.min(box.w - SIDE_MARGIN * 2, box.h / ratio, MAX_BOARD);
    // never below MIN_BOARD — a short box clips the disc rather than blanking
    // it — but never wider than the box either, which is the one thing that
    // would push pegs off the side where they cannot be tapped
    return Math.floor(Math.max(0, Math.min(box.w, Math.max(MIN_BOARD, fit))));
  }, [fixedWidth, box.w, box.h, pegCount, tilt]);

  const m = useMemo(
    () => (width > 0 ? metricsFor(pegCount, width, tilt) : null),
    [pegCount, width, tilt],
  );

  const holes = useMemo(
    () => m?.layout.positions.map((p) => ({ x: p.x, y: p.y })) ?? [],
    [m],
  );

  const reported = useRef('');
  if (__DEV__ && m && width > 0) {
    // the whole diagnostic — the string build included — is dev-only; in a
    // release build this block is dropped instead of formatting six numbers
    // on every render
    const rowPitch = m.layout.spacing * 0.866 * tilt;
    const capH = m.pegWidth * PEG_DOLL_CAP_HEIGHT;
    const line =
      `pegs=${pegCount} board=${width}x${Math.round(m.height)} tilt=${tilt}` +
      ` spacing=${m.layout.spacing.toFixed(1)} pegWidth=${m.pegWidth.toFixed(1)}` +
      ` hit=${Math.round(m.hit.w)}x${Math.round(m.hit.h)}` +
      ` rowPitch=${rowPitch.toFixed(1)} capH=${capH.toFixed(1)}` +
      ` clear=${capH < rowPitch ? 'yes' : 'NO'}` +
      ` box=${Math.round(box.w)}x${Math.round(box.h)}`;
    if (reported.current !== line) {
      reported.current = line;
      // dev only: read back with the browser console when checking touch sizes
      console.log('[peg-recall board]', line);
    }
  }

  const wrap = fixedWidth != null ? styles.fixedWrap : styles.wrap;

  if (!m || width <= 0) {
    return <View onLayout={onLayout} style={wrap} />;
  }

  const anchor = pegDollAnchor(m.pegWidth);
  const move = state.phase === 'result' && state.lastMove ? state.lastMove : null;
  const movingPeg = move ? state.pegs[move.pegIndex] : null;
  const movingAt = move ? m.pegs.find((p) => p.index === move.pegIndex) : undefined;

  let flyTo: { x: number; y: number } | null = null;
  if (move?.matched && movingAt) {
    const tray = trayAnchors?.[move.playerId];
    if (tray) {
      // from the centre of the peg's box to the centre of the tray
      flyTo = {
        x: tray.x - origin.x - (movingAt.left + m.pegWidth / 2),
        y: tray.y - origin.y - (movingAt.top + (m.pegWidth * PEG_DOLL_ASPECT) / 2),
      };
    }
  }

  return (
    <View onLayout={onLayout} style={wrap}>
      <View
        ref={boardRef}
        onLayout={onBoardLayout}
        accessibilityLabel={`Round board, ${pegCount} pegs`}
        style={{ width, height: m.height }}
      >
        {/* the disc */}
        <View style={{ position: 'absolute', left: 0, top: m.overhang }}>
          <PerspectiveBoard
            width={width}
            yScale={tilt}
            holes={holes}
            holeSize={m.holeSize}
            theme={theme}
          />
        </View>

        {/* pegs, back row first */}
        {m.pegs.map((slot) => {
          const peg = state.pegs[slot.index];
          if (!peg || peg.state === 'captured') return null;
          const ghost = move?.pegIndex === slot.index;
          return (
            <View
              key={peg.index}
              style={{ position: 'absolute', left: slot.left, top: slot.top, pointerEvents: 'none' }}
            >
              <Peg
                width={m.pegWidth}
                color={peg.color}
                showShapes={showShapes}
                theme={theme}
                faceUp={peg.state === 'revealed' && !ghost}
                rising={state.phase === 'reveal'}
                riseDelay={
                  slot.ring * PEG_ANIM.riseRingStagger +
                  slot.ringOrder * PEG_ANIM.riseAngleStagger
                }
                fallDelay={staggerDown ? Math.min(slot.index, 28) * PEG_ANIM.fallStagger : 0}
                ghost={ghost}
              />
            </View>
          );
        })}

        {/* Touch targets, same order so the nearer peg wins an overlap.
            VoiceOver walks them top-left to bottom-right by position (iOS
            orders absolutely-placed siblings geometrically, and RN 0.83's
            `experimental_accessibilityOrder` is behind a native flag that is
            off in Expo builds), which is the same back-to-front order they are
            mounted in. So the number each one is read out with is its place
            in that walk — "Peg 1" is the first peg a swipe lands on, "Peg 2"
            the next — with its ring kept alongside as a spatial hint. */}
        {m.pegs.map((slot, order) => {
          const peg = state.pegs[slot.index];
          if (!peg) return null;
          const off = peg.state !== 'hidden' || disabled;
          const what =
            peg.state === 'captured'
              ? 'taken'
              : peg.state === 'revealed'
                ? PEG_PAINT[peg.color].label
                : 'hidden';
          return (
            <PegHit
              key={`hit-${peg.index}`}
              index={peg.index}
              label={`Peg ${order + 1}, ring ${slot.ring + 1}, ${what}`}
              off={off}
              onPick={onPick}
              left={slot.left + m.pegWidth / 2 - m.hit.w / 2}
              top={slot.top + anchor.y + m.hit.dy}
              width={m.hit.w}
              height={m.hit.h}
            />
          );
        })}

        {/* the peg being played, above everything else */}
        {move && movingPeg && movingAt ? (
          <View style={{ position: 'absolute', left: movingAt.left, top: movingAt.top, pointerEvents: 'none' }}>
            <MovingPeg
              key={`${move.pegIndex}-${moveNonce}`}
              width={m.pegWidth}
              color={movingPeg.color}
              showShapes={showShapes}
              theme={theme}
              matched={move.matched}
              flyTo={flyTo}
              nonce={moveNonce}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  /** when the screen sizes the disc, the board is exactly as tall as it draws */
  fixedWrap: { alignItems: 'center', justifyContent: 'center' },
});

/**
 * Memoised: the game screen re-renders on every busy / pause / feedback flip,
 * most of which change nothing the board draws.
 */
export const Board = memo(BoardImpl);

export default Board;
