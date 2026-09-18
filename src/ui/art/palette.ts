/**
 * Peg Recall — art-layer colour constants.
 *
 * Self-contained on purpose: src/ui/art/** must be usable by any screen without
 * reaching into the wider theme, and the engine layer must stay free of colour.
 * Values mirror PLAN.md section 4 (Okabe-Ito, colour-blind safe).
 */
import type { PegColor } from '../../engine/types';

/** Peg fill per colour. */
export const PEG_HEX: Record<PegColor, string> = {
  orange: '#E69F00',
  sky: '#56B4E9',
  blue: '#0072B2',
  green: '#009E73',
  yellow: '#F0E442',
  purple: '#CC79A7',
};

/** Rim/edge colour. Yellow needs a darker rim to stay visible on cream. */
export const PEG_RIM: Record<PegColor, string> = {
  orange: '#B87E00',
  sky: '#3F92C0',
  blue: '#005688',
  green: '#00795A',
  yellow: '#B8A800',
  purple: '#A65D86',
};

/**
 * Glyph colour to draw on top of a peg of this colour.
 * Yellow is too light for white, so it gets the dark rim instead.
 */
export const PEG_GLYPH_ON: Record<PegColor, string> = {
  orange: '#FFFFFF',
  sky: '#FFFFFF',
  blue: '#FFFFFF',
  green: '#FFFFFF',
  yellow: '#6B6200',
  purple: '#FFFFFF',
};

/** Warm neutrals shared by the art layer. */
export const NEUTRAL = {
  page: '#F6F1E8',
  board: '#FFFDF8',
  faceDown: '#D9D0C3',
  faceDownRim: '#C4B8A6',
  ink: '#2B2622',
  inkSoft: '#6B6158',
} as const;

/** Light or dark appearance. The art layer only ever needs these two. */
export type ArtTheme = 'light' | 'dark';

/**
 * Wood tones for the round board, the pegs standing in it and the die.
 *
 * Honey/golden rather than beige: sampled from the reference toy and from the
 * reference game's board (see assets/source/ART-NOTES.md). The board is still
 * furniture and the peg colours are still the information, but furniture made
 * of real oiled beech, not of cardboard.
 */
export interface WoodTones {
  /** Board face, centre of the radial gradient (lit). */
  faceLit: string;
  /** Board face, outer edge of the radial gradient. */
  face: string;
  /** Outer rim of the board. */
  rim: string;
  /** Darkest tone of the side wall, at its bottom edge. */
  rimDeep: string;
  /** Bevel ring between rim and face. */
  bevel: string;
  /** Thin turned groove cut into the face just inside the bevel. */
  groove: string;
  /** Grain arcs across the face. */
  grain: string;
  /** Deepest part of a peg hole (its upper inner wall). */
  holeDeep: string;
  /** Lower, lit part of a peg hole. */
  hole: string;
  /** Thin lit lip along the bottom inside edge of a hole. */
  holeLip: string;
  /** Drop / contact shadow ink. */
  shadow: string;
  /** Opacity of the board drop shadow (darkest of the stack). */
  shadowOpacity: number;
  /** Natural (face-down) peg: top cap. */
  pegCap: string;
  /** Natural peg: cap edge. */
  pegCapRim: string;
  /** Natural peg: cylinder body. */
  pegBody: string;
  /** Strength of the white highlight on a cap. */
  gloss: number;
  /** Die: the lit top face. */
  dieTop: string;
  /** Die: the front-left face. */
  dieFront: string;
  /** Die: the right face, turned furthest from the light. */
  dieRight: string;
  /** Die: the line where two faces meet. */
  dieEdge: string;
  /** Die: grain streaks and the engraved "?" of the un-rolled die. */
  dieGrain: string;
}

export const WOOD: Record<ArtTheme, WoodTones> = {
  light: {
    faceLit: '#ECC788',
    face: '#CE9F60',
    rim: '#B8875A',
    rimDeep: '#8F6238',
    bevel: '#A9794C',
    groove: '#9A6C40',
    grain: '#9A6E42',
    holeDeep: '#5E4326',
    hole: '#7A5A3A',
    holeLip: '#F3DCB0',
    shadow: '#3A2612',
    shadowOpacity: 0.2,
    pegCap: '#E6C68F',
    pegCapRim: '#BE9260',
    pegBody: '#DEBA82',
    gloss: 0.34,
    dieTop: '#F0D3A0',
    dieFront: '#D6B37E',
    dieRight: '#BC9159',
    dieEdge: '#9A7448',
    dieGrain: '#8A6534',
  },
  dark: {
    faceLit: '#A67940',
    face: '#8A6031',
    rim: '#6E4C29',
    rimDeep: '#4A3218',
    bevel: '#5A3D20',
    groove: '#4E3419',
    grain: '#C0955C',
    holeDeep: '#2A1C0C',
    hole: '#453014',
    holeLip: '#B08B58',
    shadow: '#000000',
    shadowOpacity: 0.4,
    pegCap: '#D5AC73',
    pegCapRim: '#A37A47',
    pegBody: '#BE945B',
    gloss: 0.26,
    dieTop: '#B98D55',
    dieFront: '#9C7340',
    dieRight: '#80592D',
    dieEdge: '#5C3F20',
    dieGrain: '#5A3E1D',
  },
};

/**
 * Shift a #rrggbb colour towards black (amount &lt; 0) or white (amount &gt; 0).
 * Used to derive the shaded side of a peg or a die from its peg colour, so the
 * palette above stays the single source of truth for hue.
 */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * k);
  const r = mix((n >> 16) & 0xff);
  const g = mix((n >> 8) & 0xff);
  const b = mix(n & 0xff);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
}
