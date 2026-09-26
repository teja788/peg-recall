/**
 * Color Catch — design tokens.
 * Peg colours come from src/ui/art/palette.ts (v1.1: red, violet, blue, green,
 * yellow, purple); surfaces are warm neutrals, no pure white / pure black.
 */
import { PEG_HEX, PEG_RIM } from '../ui/art/palette';

import type { PegColor } from '../engine/types';

/** A peg colour as the UI frames it: fill, rim and its spoken name. */
export interface PegPaint {
  fill: string;
  rim: string;
  label: string;
}

/**
 * Fill and rim are *taken from* src/ui/art/palette.ts rather than repeated
 * here: the art layer is the one place a peg colour is defined, so the drawn
 * peg and the UI that frames it can never drift apart by a shade. Only the
 * spoken label belongs to this layer (the shape glyphs are drawn from
 * src/ui/art/shapePaths.ts).
 */
export const PEG_PAINT: Record<PegColor, PegPaint> = {
  red: { fill: PEG_HEX.red, rim: PEG_RIM.red, label: 'Red' },
  violet: { fill: PEG_HEX.violet, rim: PEG_RIM.violet, label: 'Violet' },
  blue: { fill: PEG_HEX.blue, rim: PEG_RIM.blue, label: 'Blue' },
  green: { fill: PEG_HEX.green, rim: PEG_RIM.green, label: 'Green' },
  yellow: { fill: PEG_HEX.yellow, rim: PEG_RIM.yellow, label: 'Yellow' },
  purple: { fill: PEG_HEX.purple, rim: PEG_RIM.purple, label: 'Purple' },
};

export interface Surfaces {
  page: string;
  /** Table backdrop: top of the vertical gradient (see src/ui/Backdrop.tsx). */
  backdropTop: string;
  /** Table backdrop: bottom of the vertical gradient. */
  backdropBottom: string;
  /** Argyle lattice drawn over the backdrop, at BACKDROP_PATTERN_OPACITY. */
  backdropPattern: string;
  /** Ink the vignette darkens the backdrop's edges with. */
  backdropVignette: string;
  /** Primary text sitting directly on the backdrop (>= 4.5:1 on backdropTop). */
  onBackdrop: string;
  /** Secondary text on the backdrop (still >= 4.5:1 — see the note below). */
  onBackdropMuted: string;
  board: string;
  card: string;
  pegDown: string;
  pegHole: string;
  text: string;
  textDim: string;
  accent: string;
  accentInk: string;
  line: string;
  shadow: string;
  scrim: string;
}

/**
 * The backdrop is a painted table, not a flat page (user feedback 2026-09-19:
 * "background is too dull"). It is deliberately a deeper teal than the Toy
 * Theater reference board: white body text has to clear WCAG AA (4.5:1) sitting
 * straight on it, and the reference blue (#3E9BC9) only reaches 3.1:1. At
 * #2A7399 pure white is 5.2:1 and the 90%-white secondary ink is 4.6:1.
 */
export const LIGHT: Surfaces = {
  page: '#F6F1E8',
  backdropTop: '#2A7399',
  backdropBottom: '#1B5478',
  backdropPattern: '#FFFFFF',
  backdropVignette: '#0B3550',
  onBackdrop: '#FFFFFF',
  onBackdropMuted: 'rgba(255,255,255,0.90)',
  board: '#FFFDF8',
  card: '#FFFDF8',
  pegDown: '#D9D0C3',
  pegHole: '#E9E2D6',
  text: '#2B2622',
  textDim: '#7A6F63',
  accent: '#0072B2',
  accentInk: '#FFFDF8',
  line: '#E2D9CB',
  shadow: '#2B2622',
  scrim: 'rgba(43,38,34,0.45)',
};

export const DARK: Surfaces = {
  page: '#1E1B18',
  backdropTop: '#16324A',
  backdropBottom: '#0E2233',
  backdropPattern: '#8FC3E3',
  backdropVignette: '#000000',
  onBackdrop: 'rgba(255,255,255,0.92)',
  onBackdropMuted: 'rgba(255,255,255,0.72)',
  board: '#2A2622',
  card: '#2A2622',
  pegDown: '#3A342E',
  pegHole: '#231F1B',
  text: '#EDE6DA',
  textDim: '#A2978A',
  accent: '#56B4E9',
  accentInk: '#1E1B18',
  line: '#3A342E',
  shadow: '#000000',
  scrim: 'rgba(0,0,0,0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 40, lineHeight: 46, fontWeight: '800' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 21, lineHeight: 27, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 23, fontWeight: '500' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
} as const;

/** Animation durations (PLAN.md section 2). */
export const timing = {
  flip: 250,
  flipStagger: 12,
  dieTumble: 600,
  matchTotal: 850,
  missTotal: 1400,
  aiRollDelay: 400,
  aiThinkMin: 700,
  aiThinkMax: 1300,
  bannerSlide: 260,
} as const;
