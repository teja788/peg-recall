/**
 * Peg Recall — the animated peg doll that stands in a hole on the round board.
 *
 * The drawing itself lives in the art layer (`PegDoll`); everything here is
 * movement. A peg is drawn twice, wood under colour, and the colour layer's
 * opacity is what "turns the cap over" — a tilted wooden peg has no back face
 * to flip, so a 250 ms cross-fade is both truer to the toy and cheaper than a
 * rotateY. Positions come from the board, so this component only ever moves
 * relative to its own resting place.
 *
 * Reduce Motion: cross-fades only. No rise, no bob, no lift, no arc.
 */
import { PEG_DOLL_ASPECT, PegDoll, type ArtTheme } from '@art';
import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { PegColor } from '../engine/types';

/** Fraction of the peg's height it sinks into the hole before the reveal. */
const SUNK = 0.4;
/** Fraction of the peg's height it lifts when picked. */
const LIFT = 0.18;
const LIFT_SCALE = 1.08;
/** Base offset from the box centre, in peg widths — lets us scale about the base. */
const BASE_OFFSET = 1.775 - PEG_DOLL_ASPECT / 2;

export const PEG_ANIM = {
  riseRingStagger: 60,
  riseAngleStagger: 8,
  /** cap colour -> wood when the reveal ends */
  fall: 250,
  fallStagger: 12,
  /** the pick lift */
  lift: 180,
  /** how long a matched peg sits lifted before it flies */
  matchHold: 200,
  fly: 400,
  /** how long a missed peg stays up so everyone can see it */
  missHold: 900,
  settle: 250,
} as const;

/* ------------------------------------------------------------------ shared */

interface DollProps {
  width: number;
  color: PegColor;
  showShapes: boolean;
  theme: ArtTheme;
}

/** Wood doll with the coloured doll cross-faded on top. */
function Faces({
  width,
  color,
  showShapes,
  theme,
  colour,
}: DollProps & { colour: SharedValue<number> }) {
  const colourStyle = useAnimatedStyle(() => ({ opacity: colour.value }));
  return (
    <>
      <PegDoll width={width} color={null} faceUp={false} theme={theme} />
      <Animated.View style={[StyleSheet.absoluteFill, colourStyle]}>
        <PegDoll width={width} color={color} faceUp showShape={showShapes} theme={theme} />
      </Animated.View>
    </>
  );
}

/* --------------------------------------------------------------- board peg */

export interface PegProps extends DollProps {
  /** colour showing (reveal, or a peg that was just picked) */
  faceUp: boolean;
  /** the opening reveal is running: the peg rises out of its hole */
  rising: boolean;
  /** ms before this peg rises */
  riseDelay: number;
  /** ms before this peg's cap fades back to wood */
  fallDelay: number;
  /** an overlay clone is playing this peg's move — keep the hole clear */
  ghost: boolean;
}

function PegImpl({
  width,
  color,
  showShapes,
  theme,
  faceUp,
  rising,
  riseDelay,
  fallDelay,
  ghost,
}: PegProps) {
  const reduced = useReducedMotion();
  const up = useSharedValue(rising && !reduced ? 0 : 1);
  const colour = useSharedValue(faceUp ? 1 : 0);
  const bob = useSharedValue(0);
  const vis = useSharedValue(ghost ? 0 : 1);

  // rise out of the hole when the reveal starts
  useEffect(() => {
    if (!rising || reduced) {
      up.value = 1;
      return;
    }
    up.value = 0;
    up.value = withDelay(riseDelay, withSpring(1, { damping: 11, stiffness: 150, mass: 0.7 }));
  }, [rising, riseDelay, reduced, up]);

  // the stagger only matters at the instant the cap turns over, so it is read
  // through a ref — a changing `fallDelay` must never restart a live fade
  const fallRef = useRef(fallDelay);
  fallRef.current = fallDelay;

  // cap colour on / off, with a little press-down bob on the way down
  useEffect(() => {
    const down = !faceUp;
    const delay = down ? fallRef.current : 0;
    colour.value = withDelay(
      delay,
      withTiming(faceUp ? 1 : 0, {
        duration: reduced ? 160 : PEG_ANIM.fall,
        easing: Easing.inOut(Easing.quad),
      }),
    );
    if (down && !reduced) {
      bob.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) }),
        ),
      );
    }
  }, [faceUp, reduced, colour, bob]);

  useEffect(() => {
    vis.value = ghost ? 0 : withTiming(1, { duration: 120 });
  }, [ghost, vis]);

  const boxH = width * PEG_DOLL_ASPECT;

  const body = useAnimatedStyle(() => {
    if (reduced) return { opacity: vis.value, transform: [] };
    const dy = (1 - up.value) * SUNK * boxH + bob.value * 0.06 * boxH;
    return {
      opacity: vis.value * Math.min(1, 0.1 + 1.1 * up.value),
      transform: [{ translateY: dy }],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[{ width, height: boxH }, body]}>
      <Faces
        width={width}
        color={color}
        showShapes={showShapes}
        theme={theme}
        colour={colour}
      />
    </Animated.View>
  );
}

export const Peg = memo(PegImpl);

/* ------------------------------------------------------------- moving peg */

export interface MovingPegProps extends DollProps {
  /** true: lift, hold, then fly to the tray. false: lift, hold, settle back. */
  matched: boolean;
  /** board-local vector from this peg's resting place to the tray centre */
  flyTo: { x: number; y: number } | null;
  /** changes per move so the timeline always restarts */
  nonce: number;
}

/**
 * The peg the active player just picked, drawn as an overlay above every other
 * peg so the lift is never hidden behind the row standing in front of it.
 *
 * Match (850 ms budget):  lift 180 · hold 200 · fly 400  = 780
 * Miss  (1400 ms budget): lift 180 · hold 900 · settle 250 = 1330
 */
function MovingPegImpl({
  width,
  color,
  showShapes,
  theme,
  matched,
  flyTo,
  nonce,
}: MovingPegProps) {
  const reduced = useReducedMotion();
  const lift = useSharedValue(0);
  const colour = useSharedValue(0);
  const fly = useSharedValue(0);

  useEffect(() => {
    const rise = { duration: PEG_ANIM.lift, easing: Easing.out(Easing.cubic) } as const;
    const back = { duration: PEG_ANIM.settle, easing: Easing.inOut(Easing.quad) } as const;

    if (reduced) {
      // crossfade only: colour in, then out again (a match fades with the flight)
      colour.value = withSequence(
        withTiming(1, { duration: 160 }),
        withDelay(
          matched ? PEG_ANIM.matchHold : PEG_ANIM.missHold,
          withTiming(0, { duration: matched ? PEG_ANIM.fly : PEG_ANIM.settle }),
        ),
      );
      if (matched) {
        fly.value = withDelay(
          PEG_ANIM.lift + PEG_ANIM.matchHold,
          withTiming(1, { duration: PEG_ANIM.fly }),
        );
      }
      return;
    }

    lift.value = withTiming(1, rise);
    if (matched) {
      colour.value = withTiming(1, rise);
      fly.value = withDelay(
        PEG_ANIM.lift + PEG_ANIM.matchHold,
        withTiming(1, { duration: PEG_ANIM.fly, easing: Easing.inOut(Easing.quad) }),
      );
    } else {
      lift.value = withSequence(
        withTiming(1, rise),
        withDelay(PEG_ANIM.missHold, withTiming(0, back)),
      );
      colour.value = withSequence(
        withTiming(1, rise),
        withDelay(PEG_ANIM.missHold, withTiming(0, back)),
      );
    }
    // the timeline is owned by `nonce`: exactly one run per move
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const boxH = width * PEG_DOLL_ASPECT;
  const fx = flyTo?.x ?? 0;
  const fy = flyTo?.y ?? -boxH * 2;
  const shadowW = width * 0.9;

  const body = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1 - fly.value, transform: [] };
    const f = fly.value;
    const s = (1 + (LIFT_SCALE - 1) * lift.value) * (1 - 0.5 * f);
    // a slight arc: out of the board first, then down into the tray
    const arc = -Math.sin(Math.PI * f) * boxH * 0.45;
    return {
      opacity: f > 0.82 ? (1 - f) / 0.18 : 1,
      transform: [
        { translateX: fx * f },
        {
          translateY:
            -lift.value * LIFT * boxH + (s - 1) * BASE_OFFSET * width + fy * f + arc,
        },
        { scale: s },
      ],
    };
  });

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: (theme === 'dark' ? 0.42 : 0.26) * lift.value * (1 - fly.value),
    transform: [{ scale: 1 + 0.3 * lift.value }],
  }));

  return (
    <View pointerEvents="none" style={{ width, height: boxH }}>
      {reduced ? null : (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: width / 2 - shadowW / 2,
              top: width * 1.775 - shadowW * 0.13,
              width: shadowW,
              height: shadowW * 0.26,
              borderRadius: shadowW / 2,
              backgroundColor: theme === 'dark' ? '#000000' : '#3A2A1B',
            },
            shadowStyle,
          ]}
        />
      )}
      <Animated.View style={[StyleSheet.absoluteFill, body]}>
        <Faces
          width={width}
          color={color}
          showShapes={showShapes}
          theme={theme}
          colour={colour}
        />
      </Animated.View>
    </View>
  );
}

export const MovingPeg = memo(MovingPegImpl);

export default Peg;
