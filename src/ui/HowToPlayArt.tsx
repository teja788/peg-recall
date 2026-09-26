/**
 * Color Catch — the little pictures on the "How to play" screen.
 *
 * Every one is the game's own art (the peg dolls, the wooden die, the board
 * thumbnail, the animal faces), so a player who reads the rules recognises the
 * same things on the board a minute later. All static: nothing here animates,
 * so there is nothing for Reduce Motion to switch off.
 *
 * Purely decorative. The screen hides each picture from VoiceOver/TalkBack and
 * says everything in the step's label instead.
 */
import {
  Avatar,
  PEG_DOLL_ASPECT,
  PerspectiveBoard,
  SvgScene,
  WoodDie,
  boardCentre,
  boardHeight,
  holeSizeFor,
  pegDollAnchor,
  pegDollScene,
  pegWidthFor,
  projectHole,
  type ArtTheme,
} from '@art';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { AvatarId, PegColor } from '../engine/types';
import { roundLayout } from '../layout/roundLayout';
import { BoardGlyph } from './BoardMini';
import type { StepId } from './HowToPlayCopy';

/* ---------------------------------------------------------- local pegs */

/**
 * The peg doll, with gradient ids of this screen's own.
 *
 * `PegDoll` keys its gradient ids by content ("pdbredL"), which is safe on
 * native (each <Svg> resolves its own defs) but not on the web: there
 * `url(#pdbredL)` resolves to the FIRST element with that id in the document,
 * and with this screen presented over Home that is one of Home's board
 * thumbnails — inside a `display: none` screen, where Chrome paints no
 * gradient at all, so every peg here came out as a bare outline. A prefix of
 * our own keeps the lookup on this screen.
 */
function Doll({
  width,
  color,
  faceUp,
  showShape = false,
  theme,
}: {
  width: number;
  color: PegColor | null;
  faceUp: boolean;
  showShape?: boolean;
  theme: ArtTheme;
}) {
  const scene = useMemo(
    () =>
      pegDollScene(
        width,
        color,
        faceUp,
        showShape,
        theme,
        `htp${color && faceUp ? color : 'wood'}${theme === 'dark' ? 'D' : 'L'}`,
      ),
    [width, color, faceUp, showShape, theme],
  );
  return <SvgScene scene={scene} />;
}

/** Same tilt as `BoardMini` (and the game board's squat branch). */
const TILT = 0.62;

/**
 * `BoardMini` drawn with `Doll`: the tilted disc with seven pegs standing in
 * it, back row first so the near pegs overlap the far ones.
 */
function MiniBoard({
  width,
  colors,
  theme,
}: {
  width: number;
  colors: (PegColor | null)[];
  theme: ArtTheme;
}) {
  const m = useMemo(() => {
    const layout = roundLayout(colors.length, width);
    const pegWidth = pegWidthFor(layout.spacing);
    const centre = boardCentre(width, TILT);
    const anchor = pegDollAnchor(pegWidth);
    const boxH = pegWidth * PEG_DOLL_ASPECT;
    let top = 0;
    let bottom = boardHeight(width, TILT);
    const raw = layout.positions.map((p) => {
      const q = projectHole(p.x, p.y, TILT);
      const y = centre.y + q.y - anchor.y;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + boxH);
      return { index: p.index, left: centre.x + q.x - anchor.x, y, depth: p.y };
    });
    const overhang = -top;
    return {
      pegWidth,
      holeSize: holeSizeFor(pegWidth),
      overhang,
      height: overhang + bottom,
      holes: layout.positions.map((p) => ({ x: p.x, y: p.y })),
      pegs: raw
        .map((r) => ({ ...r, top: r.y + overhang }))
        .sort((a, b) => a.depth - b.depth || a.left - b.left),
    };
  }, [colors.length, width]);

  return (
    <View style={{ width, height: m.height, pointerEvents: 'none' }}>
      <View style={{ position: 'absolute', left: 0, top: m.overhang }}>
        <PerspectiveBoard
          width={width}
          yScale={TILT}
          holes={m.holes}
          holeSize={m.holeSize}
          theme={theme}
        />
      </View>
      {m.pegs.map((p) => (
        <View key={p.index} style={{ position: 'absolute', left: p.left, top: p.top }}>
          <Doll
            width={m.pegWidth}
            color={colors[p.index] ?? null}
            faceUp={colors[p.index] != null}
            theme={theme}
          />
        </View>
      ))}
    </View>
  );
}

/** Width of the picture column in a step card. */
export const STEP_ART_WIDTH = 76;
/** Height every step picture is centred in, so the four cards line up. */
const STEP_ART_HEIGHT = 70;
/** Width of the small picture beside a "Ways to play" / "Tips" row. */
export const ROW_ART_WIDTH = 56;

/** Centre, ring of six: every colour but one on show, and none of the pairs
 *  people mix up (blue/violet, red/green, violet/purple, red/purple) touching
 *  on the ring. */
const LOOK_COLORS: PegColor[] = ['blue', 'red', 'yellow', 'violet', 'green', 'purple', 'yellow'];

/** A round tick badge pinned to a peg's shoulder. */
function Badge({ color, ink }: { color: string; ink: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={9} fill={color} stroke={ink} strokeWidth={1.5} />
      <Path
        d="M5.6 10.4 L8.7 13.3 L14.4 7"
        fill="none"
        stroke={ink}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** A rolled die with the matching peg next to it, and a tick. */
function DieAndPeg({
  die,
  peg,
  theme,
  badge,
  ink,
}: {
  die: PegColor;
  peg: PegColor;
  theme: ArtTheme;
  badge: string;
  ink: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
      <WoodDie size={34} color={die} theme={theme} />
      <View>
        <Doll width={26} color={peg} faceUp theme={theme} />
        <View style={{ position: 'absolute', top: -6, right: -10 }}>
          <Badge color={badge} ink={ink} />
        </View>
      </View>
    </View>
  );
}

/** A winner's animal with the pegs they caught lined up in front. */
function Winner({ theme }: { theme: ArtTheme }) {
  const caught: PegColor[] = ['red', 'blue', 'yellow', 'green'];
  return (
    <View style={{ alignItems: 'center' }}>
      <Avatar id="fox" size={38} />
      <View style={{ flexDirection: 'row', gap: 1, marginTop: -4 }}>
        {caught.map((c, i) => (
          <Doll key={i} width={14} color={c} faceUp theme={theme} />
        ))}
      </View>
    </View>
  );
}

export interface ArtColors {
  theme: ArtTheme;
  /** fill of the "match" badge */
  good: string;
  /** stroke of the badge, and card background it sits on */
  badgeInk: string;
}

/** The picture for one step of the rules. */
export function StepArt({ id, colors }: { id: StepId; colors: ArtColors }) {
  const { theme } = colors;
  let art: React.ReactNode;
  switch (id) {
    case 'look':
      art = <MiniBoard width={70} colors={LOOK_COLORS} theme={theme} />;
      break;
    case 'roll':
      art = <WoodDie size={54} color="blue" theme={theme} />;
      break;
    case 'find':
      art = (
        <DieAndPeg die="blue" peg="blue" theme={theme} badge={colors.good} ink={colors.badgeInk} />
      );
      break;
    case 'win':
      art = <Winner theme={theme} />;
      break;
  }
  return (
    <View
      style={{
        width: STEP_ART_WIDTH,
        height: STEP_ART_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {art}
    </View>
  );
}

/** A few animal faces overlapping, like players round a table. */
export function AvatarStack({ ids, size = 26 }: { ids: AvatarId[]; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {ids.map((id, i) => (
        <View key={id} style={{ marginLeft: i === 0 ? 0 : -size * 0.42 }}>
          <Avatar id={id} size={size} />
        </View>
      ))}
    </View>
  );
}

/** The picture beside one "Ways to play" or "Tips" row. */
export function RowArt({
  id,
  theme,
  ink,
  rim,
}: {
  id: string;
  theme: ArtTheme;
  /** dots of the board glyph */
  ink: string;
  /** rim of the board glyph */
  rim: string;
}) {
  let art: React.ReactNode = null;
  switch (id) {
    case 'ai':
      art = <AvatarStack ids={['bunny', 'fox', 'owl']} size={24} />;
      break;
    case 'friends':
      art = <AvatarStack ids={['bear', 'frog', 'cat']} size={24} />;
      break;
    case 'board':
      art = <BoardGlyph size={34} pegs={25} color={ink} rim={rim} />;
      break;
    case 'kid':
      art = <Avatar id="bunny" size={32} />;
      break;
    case 'shapes':
      art = <Doll width={26} color="violet" faceUp showShape theme={theme} />;
      break;
    case 'bonus':
      art = <WoodDie size={34} color="green" theme={theme} />;
      break;
    case 'watch':
      art = <Doll width={24} color="red" faceUp theme={theme} />;
      break;
  }
  return (
    <View style={{ width: ROW_ART_WIDTH, alignItems: 'center', justifyContent: 'center' }}>
      {art}
    </View>
  );
}
