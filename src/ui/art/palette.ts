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
 * Wood tones for the round board and the pegs standing in it.
 * Warm and low-contrast on purpose (PLAN.md section 4, "easy on the eyes"):
 * the board is furniture, the peg colours are the information.
 */
export interface WoodTones {
  /** Board face, centre of the radial gradient (lit). */
  faceLit: string;
  /** Board face, outer edge of the radial gradient. */
  face: string;
  /** Outer rim of the board. */
  rim: string;
  /** Bevel ring between rim and face. */
  bevel: string;
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
}

export const WOOD: Record<ArtTheme, WoodTones> = {
  light: {
    faceLit: '#EFD9B8',
    face: '#E3C9A4',
    rim: '#C9A77C',
    bevel: '#B8926A',
    grain: '#B5906A',
    holeDeep: '#8E6C48',
    hole: '#B78F63',
    holeLip: '#F2E3CA',
    shadow: '#3A2A1B',
    shadowOpacity: 0.16,
    pegCap: '#D9C3A5',
    pegCapRim: '#B9986F',
    pegBody: '#B9986F',
    gloss: 0.3,
  },
  dark: {
    faceLit: '#7B5B40',
    face: '#6B4F36',
    rim: '#4E3826',
    bevel: '#3E2C1D',
    grain: '#805F42',
    holeDeep: '#241A10',
    hole: '#42301F',
    holeLip: '#8E6E4C',
    shadow: '#000000',
    shadowOpacity: 0.34,
    pegCap: '#C0A382',
    pegCapRim: '#9C7C56',
    pegBody: '#9C7C56',
    gloss: 0.2,
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
