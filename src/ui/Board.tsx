import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { GameState } from '../engine/types';
import { useTheme } from '../theme';
import { Peg } from './Peg';

export interface BoardProps {
  state: GameState;
  showShapes: boolean;
  /** true while an animation owns the screen or it is not this human's turn */
  disabled: boolean;
  onPick: (pegIndex: number) => void;
  /** window coordinates of each player's tray, for the capture flight */
  trayAnchors?: Record<string, { x: number; y: number }>;
}

/**
 * Fixed-size grid. Never scrolls: the peg size is derived from whatever space
 * the parent gives us, capped at 96 pt so an iPad board stays a board.
 */
export function Board({ state, showShapes, disabled, onPick, trayAnchors }: BoardProps) {
  const t = useTheme();
  const { cols, rows } = state.spec;
  const [box, setBox] = useState({ w: 0, h: 0 });
  const viewRef = useRef<View>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  // track the flip-down wave that follows the opening reveal
  const wasReveal = useRef(state.phase === 'reveal');
  const staggerDown = wasReveal.current && state.phase !== 'reveal';
  if (state.phase !== 'reveal') wasReveal.current = false;
  if (state.phase === 'reveal') wasReveal.current = true;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((cur) => (cur.w === width && cur.h === height ? cur : { w: width, h: height }));
  }, []);

  const onSurfaceLayout = useCallback(() => {
    viewRef.current?.measureInWindow((x, y) =>
      setOrigin((cur) => (cur.x === x && cur.y === y ? cur : { x, y })),
    );
  }, []);

  const gap = t.layout.pegGap;
  // the 5x8 'huge' board needs every point of height it can get on an iPhone
  const pad = rows >= 8 ? t.spacing.sm : t.spacing.md;
  const availW = Math.max(0, box.w - pad * 2);
  const availH = Math.max(0, box.h - pad * 2);
  const size = Math.floor(
    Math.min(
      (availW - gap * (cols - 1)) / cols,
      (availH - gap * (rows - 1)) / rows,
      t.layout.pegMax,
    ),
  );
  const ready = size > 0 && Number.isFinite(size);
  const gridW = ready ? size * cols + gap * (cols - 1) : 0;
  const gridH = ready ? size * rows + gap * (rows - 1) : 0;

  return (
    <View onLayout={onLayout} style={styles.wrap}>
      {ready ? (
        <View
          ref={viewRef}
          onLayout={onSurfaceLayout}
          accessibilityLabel={`Board, ${rows} rows by ${cols} columns`}
          style={{
            width: gridW + pad * 2,
            height: gridH + pad * 2,
            padding: pad,
            backgroundColor: t.c.board,
            borderRadius: t.radii.lg,
            flexDirection: 'row',
            flexWrap: 'wrap',
          }}
        >
          {state.pegs.map((peg, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const owner = peg.capturedBy;
            const anchor = owner ? trayAnchors?.[owner] : undefined;
            const pegCenterX = col * (size + gap) + size / 2 + pad;
            const pegCenterY = row * (size + gap) + size / 2 + pad;
            const flyTo = anchor
              ? { x: anchor.x - origin.x - pegCenterX, y: anchor.y - origin.y - pegCenterY }
              : null;
            return (
              <View
                key={peg.index}
                style={{
                  width: size,
                  height: size,
                  marginRight: col === cols - 1 ? 0 : gap,
                  marginBottom: row === rows - 1 ? 0 : gap,
                }}
              >
                <Peg
                  peg={peg}
                  size={size}
                  row={row}
                  col={col}
                  faceUp={peg.state !== 'hidden'}
                  showShapes={showShapes}
                  disabled={disabled}
                  delay={staggerDown ? Math.min(row + col, 12) * t.timing.flipStagger : 0}
                  flyTo={flyTo}
                  onPress={onPick}
                />
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Board;
