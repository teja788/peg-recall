/**
 * Peg Recall — the round board, seen from a 3/4 angle (PLAN.md section 2).
 *
 * A wooden disc lying on the table with peg dolls standing in drilled holes.
 * Layout comes from `roundLayout()` (peg index i ↔ positions[i]); the art layer
 * squashes those circle-space points onto the tilted ellipse. Pegs are painted
 * back to front so near rows overlap far ones, and the touch targets are laid
 * over the top in the same order, so the peg you can see is the peg you hit.
 *
 * Never scrolls: the disc is sized from whatever box the parent hands us, so on
 * a small phone it shrinks and on an iPad it stops growing at 700 pt.
 */
import {
  PEG_DOLL_ASPECT,
  PerspectiveBoard,
  boardCentre,
  boardHeight,
  holeSizeFor,
  pegDollAnchor,
  pegWidthFor,
  projectHole,
  type ArtTheme,
} from '@art';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { GameState } from '../engine/types';
import { roundLayout, type RoundLayout } from '../layout/roundLayout';
import { PEG_PAINT, useTheme } from '../theme';
import { MovingPeg, PEG_ANIM, Peg } from './Peg';

/** How hard the board is tilted. 1 = seen from straight above. */
export const BOARD_TILT = 0.5;
/** Breathing room between the disc and the edge of the box we were given. */
const SIDE_MARGIN = 16;
/** A board wider than this stops being a toy and starts being a table. */
const MAX_BOARD = 700;
/** Minimum touch target (PLAN.md section 4 asks for 52 where it can be had). */
const TOUCH = 52;

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
function metricsFor(pegCount: number, width: number): Metrics {
  const layout = roundLayout(pegCount, width);
  const pegWidth = pegWidthFor(layout.spacing);
  const holeSize = holeSizeFor(pegWidth);
  const centre = boardCentre(width, BOARD_TILT);
  const anchor = pegDollAnchor(pegWidth);
  const boxH = pegWidth * PEG_DOLL_ASPECT;

  let top = 0;
  let bottom = boardHeight(width, BOARD_TILT);
  const raw = layout.positions.map((p) => {
    const q = projectHole(p.x, p.y, BOARD_TILT);
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

  // The touch cell sits over the cap, not over the hole: on a tilted board the
  // cap is a full peg-height above the hole it stands in, and players tap what
  // they can see. Cells overlap (rows are only spacing*0.43 apart once the
  // board is squashed) and the nearer peg, painted and mounted later, wins.
  const capTop = pegWidth * 1.685;
  const hit = {
    w: Math.max(TOUCH, layout.spacing),
    h: Math.max(TOUCH, capTop),
    dy: -capTop,
  };

  return { layout, pegWidth, holeSize, height: overhang + bottom, overhang, pegs, hit };
}

/** Height of the whole scene as a multiple of its width, for a peg count. */
function heightRatio(pegCount: number): number {
  return metricsFor(pegCount, 1000).height / 1000;
}

export function Board({
  state,
  showShapes,
  disabled,
  onPick,
  trayAnchors,
  moveNonce = 0,
}: BoardProps) {
  const t = useTheme();
  const theme: ArtTheme = t.scheme;
  const pegCount = state.spec.pegs;
  const [box, setBox] = useState({ w: 0, h: 0 });
  const boardRef = useRef<View>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  // the flip-down wave only runs on the edge out of the reveal
  const wasReveal = useRef(state.phase === 'reveal');
  const staggerDown = wasReveal.current && state.phase !== 'reveal';
  wasReveal.current = state.phase === 'reveal';

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((cur) => (cur.w === width && cur.h === height ? cur : { w: width, h: height }));
  }, []);

  const onBoardLayout = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) =>
      setOrigin((cur) => (cur.x === x && cur.y === y ? cur : { x, y })),
    );
  }, []);

  const width = useMemo(() => {
    if (box.w <= 0 || box.h <= 0) return 0;
    const ratio = heightRatio(pegCount);
    return Math.floor(
      Math.max(0, Math.min(box.w - SIDE_MARGIN * 2, box.h / ratio, MAX_BOARD)),
    );
  }, [box.w, box.h, pegCount]);

  const m = useMemo(() => (width > 0 ? metricsFor(pegCount, width) : null), [pegCount, width]);

  const holes = useMemo(
    () => m?.layout.positions.map((p) => ({ x: p.x, y: p.y })) ?? [],
    [m],
  );

  const reported = useRef('');
  if (m && width > 0) {
    const line = `pegs=${pegCount} board=${width}x${Math.round(m.height)} spacing=${m.layout.spacing.toFixed(1)} pegWidth=${m.pegWidth.toFixed(1)} hit=${Math.round(m.hit.w)}x${Math.round(m.hit.h)} rowPitch=${(m.layout.spacing * 0.866 * BOARD_TILT).toFixed(1)} box=${Math.round(box.w)}x${Math.round(box.h)}`;
    if (reported.current !== line && __DEV__) {
      reported.current = line;
      // dev only: read back with the browser console when checking touch sizes
      console.log('[peg-recall board]', line);
    }
  }

  if (!m || width <= 0) {
    return <View onLayout={onLayout} style={styles.wrap} />;
  }

  const anchor = pegDollAnchor(m.pegWidth);
  const move = state.phase === 'result' && state.lastMove ? state.lastMove : null;
  const movingPeg = move ? state.pegs[move.pegIndex] : null;
  const movingAt = move ? m.pegs.find((p) => p.index === move.pegIndex) : undefined;

  let flyTo: { x: number; y: number } | null = null;
  if (move?.matched && movingAt) {
    const tray = trayAnchors?.[move.playerId];
    if (tray) {
      flyTo = {
        x: tray.x - origin.x - (movingAt.left + m.pegWidth / 2),
        y: tray.y - origin.y - (movingAt.top + anchor.y),
      };
    }
  }

  return (
    <View onLayout={onLayout} style={styles.wrap}>
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
            yScale={BOARD_TILT}
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
              pointerEvents="none"
              style={{ position: 'absolute', left: slot.left, top: slot.top }}
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

        {/* touch targets, same order so the nearer peg wins an overlap */}
        {m.pegs.map((slot) => {
          const peg = state.pegs[slot.index];
          if (!peg) return null;
          const off = peg.state !== 'hidden' || disabled;
          const label =
            peg.state === 'captured'
              ? 'taken'
              : peg.state === 'revealed'
                ? PEG_PAINT[peg.color].label
                : 'hidden';
          return (
            <Pressable
              key={`hit-${peg.index}`}
              accessibilityRole="button"
              accessibilityLabel={`Ring ${slot.ring + 1}, peg ${slot.ringOrder + 1}, ${label}`}
              accessibilityState={{ disabled: off }}
              disabled={off}
              hitSlop={6}
              onPress={() => onPick(peg.index)}
              style={{
                position: 'absolute',
                left: slot.left + m.pegWidth / 2 - m.hit.w / 2,
                top: slot.top + anchor.y + m.hit.dy,
                width: m.hit.w,
                height: m.hit.h,
              }}
            />
          );
        })}

        {/* the peg being played, above everything else */}
        {move && movingPeg && movingAt ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: movingAt.left, top: movingAt.top }}
          >
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
});

export default Board;
