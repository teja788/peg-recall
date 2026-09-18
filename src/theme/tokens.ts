/**
 * Color Catch — design tokens.
 * Values come straight from PLAN.md section 4 (Okabe-Ito peg palette, warm
 * neutral surfaces, no pure white / pure black).
 */
import type { PegColor } from '../engine/types';

/** Okabe-Ito peg palette + the glyph shown when "shapes on pegs" is on. */
export interface PegPaint {
  fill: string;
  rim: string;
  shape: string;
  label: string;
}

/** Fills are PLAN.md section 4 verbatim; rims match src/ui/art/palette.ts so
 *  the drawn art and the laid-out UI never disagree by a shade. */
export const PEG_PAINT: Record<PegColor, PegPaint> = {
  orange: { fill: '#E69F00', rim: '#B87E00', shape: '●', label: 'Orange' },
  sky: { fill: '#56B4E9', rim: '#3F92C0', shape: '▲', label: 'Sky blue' },
  blue: { fill: '#0072B2', rim: '#005688', shape: '■', label: 'Blue' },
  green: { fill: '#009E73', rim: '#00795A', shape: '★', label: 'Green' },
  yellow: { fill: '#F0E442', rim: '#B8A800', shape: '♥', label: 'Yellow' },
  purple: { fill: '#CC79A7', rim: '#A65D86', shape: '◆', label: 'Purple' },
};

/** Shorthand map requested by the spec: colour -> shape glyph (●▲■★♥◆). */
export const PEG_SHAPES: Record<PegColor, string> = {
  orange: '●',
  sky: '▲',
  blue: '■',
  green: '★',
  yellow: '♥',
  purple: '◆',
};

/** A glyph dark enough to read on the yellow peg, light enough on the blue one. */
export function shapeInkFor(color: PegColor): string {
  return color === 'yellow' ? '#6B6200' : '#FFFFFF';
}

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

/** Layout constants used by the board + touch-target rules. */
export const layout = {
  pegGap: 6,
  pegMax: 96,
  pegMinComfort: 52,
  pegMinKid: 56,
  tapMin: 44,
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
