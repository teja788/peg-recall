/**
 * Color Catch — where the game screen puts the disc, the die and the trays.
 *
 * Pure maths (no React Native import), so it runs under `npm test`.
 *
 * The disc is the game, so it gets the space first and everything else is
 * sized around it. Three arrangements, and the screen takes whichever gives
 * the disc the most room:
 *
 *   stacked  trays on top, banner / disc / die in a column (phones, iPad in
 *            portrait, a portrait Split View pane). The disc spans ~96% of the
 *            width when the height allows.
 *   side     the disc on the left, full height; one column on the right holds
 *            the pause + sound buttons, the trays, and the die under them (iPad
 *            landscape, a wide Stage Manager window). Same idea as the chess
 *            apps: board = the short side, controls in a side panel.
 *   split    trays in a column on the left, the die in a column on the right,
 *            the disc between them — for windows too short to stack trays and
 *            die in one column (a phone turned sideways).
 *
 * Chrome (die, trays, banner) is sized off the window's short side rather than
 * off the disc: it scales 1:1 across phones (a 375 pt phone is scale 1, the
 * same numbers the screen always used) and at half rate beyond that, topping
 * out at 2x on a 13" iPad — big enough not to look like phone furniture on a
 * tablet, not so big it eats the board.
 */
import { WOOD_DIE_ASPECT } from './art/perspectiveModel';

export type TableMode = 'stacked' | 'side' | 'split';

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TableInput {
  /** window size in points */
  width: number;
  height: number;
  insets: Insets;
  /** how many trays */
  players: number;
  /** board height as a multiple of its width, for a tilt */
  ratioFor: (tilt: number) => number;
  /** the tilt the board uses in a box of this size */
  tiltFor: (width: number, height: number) => number;
  /** the disc never shrinks below this (see MIN_BOARD in Board.tsx) */
  minBoard: number;
  /**
   * Measured height of the stacked layout's middle box (banner + disc + die).
   * Dynamic Type can wrap the tray row, so the real number beats the estimate.
   */
  measuredBox?: number;
}

export interface TableLayout {
  mode: TableMode;
  /** size multiplier for trays, buttons and the die */
  scale: number;
  /** type scale for the banner, hint and countdown (shrinks with a squeeze) */
  chromeScale: number;
  /** disc diameter */
  width: number;
  tilt: number;
  die: number;
  /** die + hint */
  dieBlock: number;
  bannerH: number;
  bannerGap: number;
  dieGap: number;
  hintH: number;
  /** side / split: width of a side column; 0 when stacked */
  colW: number;
  /** side / split: gap to the window edge and between columns */
  edge: number;
  /** the disc is at its floor and may not fit its box */
  overflows: boolean;
}

/* ------------------------------------------------------------ proportions */

/** How much of the usable width the disc may take in the stacked layout. */
export const BOARD_OF_WIDTH = 0.96;
/** Gap between the banner and the top of the disc, at scale 1. */
const BANNER_GAP = 12;
/** Gap between the bottom of the disc and the die, at scale 1. */
const DIE_GAP = 16;
/** Die width at scale 1. */
const DIE_SIZE = 104;
/** Room kept for the "Tap the die" hint, at scale 1, so nothing jumps. */
const HINT_H = 24;
/** Banner pill at scale 1: the heading's 27 pt line + 4 pt padding each side. */
const BANNER_H = 35;
/**
 * Stacked: air kept between the block and the tray row above it (and the
 * sound row below), at scale 1 — the active tray grows 5% and glows.
 */
const AIR = 20;
/** Stacked: the tray row above the table and the sound row below it, at 1. */
const TOP_ROW = 69;
const BOTTOM_ROW = 52;
/** Side column width at scale 1 (fits a tray with an 8-letter name). */
const COL_W = 150;
/** Side column: the pause / sound button row, a tray, and the gaps. */
const BUTTON_ROW = 48;
const TRAY_H = 66;
/** Gap between trays in a side column, at scale 1 (the screen uses it too). */
export const TRAY_GAP = 8;
const SECTION_GAP = 16;
/** Side: margin to the window edges and between the columns. */
const EDGE = 16;
/**
 * How far the side columns may shrink their chrome to fit the height before
 * that arrangement gives up: one column only a little (it has the most to
 * hold), two columns further, since the next fallback is a postage stamp.
 */
const SIDE_MIN_SQUEEZE = 0.9;
const SPLIT_MIN_SQUEEZE = 0.8;
/** Side has to beat stacked by this much to be worth switching to. */
const SIDE_BIAS = 1.04;

/** Scale of the chrome for a window: 1:1 with phones, half rate beyond, ≤ 2. */
export function chromeScaleFor(width: number, height: number): number {
  const s = Math.min(width, height) / 375;
  if (s <= 1.2) return Math.max(1, s);
  return Math.min(2, 1.2 + (s - 1.2) * 0.5);
}

const round = Math.round;

/* ---------------------------------------------------------------- stacked */

function stacked(inp: TableInput, scale: number, box?: number): TableLayout {
  const { width: W, height: H, insets } = inp;
  const px = (n: number) => round(n * scale);
  const usableW = W - insets.left - insets.right;
  // (the epsilon keeps 375 * 0.96 at 360, not 359.99…)
  const cap = Math.floor(usableW * BOARD_OF_WIDTH + 1e-6);
  const tilt = inp.tiltFor(W, H);
  const ratio = inp.ratioFor(tilt);
  const table = box && box > 0 ? box : H - insets.top - insets.bottom - px(TOP_ROW) - px(BOTTOM_ROW);

  let die = px(DIE_SIZE);
  let bannerH = px(BANNER_H);
  let bannerGap = px(BANNER_GAP);
  let dieGap = px(DIE_GAP);
  let hintH = px(HINT_H);
  let air = px(AIR);
  const chromeH = () => air + bannerH + bannerGap + dieGap + round(die * WOOD_DIE_ASPECT) + hintH;
  const squeezeBy = (f: number) => {
    air = round(air * f);
    die = Math.max(40, round(die * f));
    bannerH = Math.max(16, round(bannerH * f));
    bannerGap = round(bannerGap * f);
    dieGap = round(dieGap * f);
    hintH = round(hintH * f);
  };

  // 1. When the height is what stops the disc reaching its width cap (an iPad
  //    in portrait, Safari's toolbars), the chrome gives way first: an iPad
  //    die may shrink back toward phone size to buy the disc its width. A
  //    phone's chrome is already at its floor and is left alone.
  let squeeze = 1;
  const full = chromeH();
  if (table - full < cap * ratio && scale > 1) {
    const want = (table - cap * ratio) / full;
    const floorSq = Math.max(1 / scale, 0.7);
    squeeze = Math.min(1, Math.max(floorSq, want));
    if (squeeze < 1) squeezeBy(squeeze);
  }

  // 2. A wide, short window has no height left once the chrome has taken its
  //    share, and the fit-to-height maths comes out at or below zero — a
  //    blank screen. Shrink the chrome by whatever buys the disc its floor.
  const floor = Math.min(cap, inp.minBoard);
  if (table - chromeH() < floor * ratio) {
    const now = chromeH();
    const f = Math.max(0.5, Math.min(1, (table - floor * ratio) / Math.max(1, now)));
    squeezeBy(f);
    squeeze *= f;
  }

  const room = table - chromeH();
  const width = Math.max(floor, Math.floor(Math.min(cap, room / ratio)));

  // 3. A tall screen has height over once the disc has hit its width cap.
  //    Spend some of it on a bigger die and a little air around the disc —
  //    the rest stays as the margin the block is centred in.
  const spare = Math.max(0, room - width * ratio);
  const grow = Math.min(spare * 0.25, die * 0.35);
  die = round(die + grow);
  const left = spare - grow * 0.9;
  bannerGap += round(Math.min(left * 0.1, px(8)));
  dieGap += round(Math.min(left * 0.15, px(12)));

  return {
    mode: 'stacked',
    scale,
    chromeScale: scale * squeeze,
    width,
    tilt,
    die,
    dieBlock: round(die * WOOD_DIE_ASPECT) + hintH,
    bannerH,
    bannerGap,
    dieGap,
    hintH,
    colW: 0,
    edge: 0,
    overflows: room < width * ratio,
  };
}

/* ------------------------------------------------------------ side, split */

/** Height the side column(s) need at scale 1. */
function columnNeed(players: number, split: boolean): number {
  const trays = players * TRAY_H + Math.max(0, players - 1) * TRAY_GAP;
  const dieBlock = DIE_SIZE * WOOD_DIE_ASPECT + HINT_H;
  const top = BUTTON_ROW + SECTION_GAP + trays;
  return split ? Math.max(top, dieBlock) : top + SECTION_GAP + dieBlock;
}

function side(inp: TableInput, base: number, split: boolean): TableLayout | null {
  const { width: W, height: H, insets } = inp;
  const edge = EDGE;
  const availH = H - insets.top - insets.bottom - 2 * edge;
  const need = columnNeed(inp.players, split);

  // the column may squeeze its chrome a little to fit; past that, not this mode
  const sq = Math.min(1, availH / (need * base));
  if (sq < (split ? SPLIT_MIN_SQUEEZE : SIDE_MIN_SQUEEZE)) return null;
  const scale = base * sq;
  const px = (n: number) => round(n * scale);

  const colW = px(COL_W);
  const tilt = inp.tiltFor(W, H);
  const ratio = inp.ratioFor(tilt);
  const bannerH = px(BANNER_H);
  const bannerGap = px(BANNER_GAP);
  const discW = W - insets.left - insets.right - 2 * edge - (split ? 2 : 1) * (colW + edge);
  const discH = availH - bannerH - bannerGap;
  const floor = inp.minBoard;
  const width = Math.max(floor, Math.floor(Math.min(discW, discH / ratio)));

  // spare column height buys a bigger die (as in the stacked layout)
  let die = px(DIE_SIZE);
  const hintH = px(HINT_H);
  const spare = Math.max(0, availH - need * scale);
  const grow = Math.min(spare * 0.25, die * 0.35, colW - die);
  die = round(die + Math.max(0, grow));

  return {
    mode: split ? 'split' : 'side',
    scale,
    chromeScale: scale,
    width,
    tilt,
    die,
    dieBlock: round(die * WOOD_DIE_ASPECT) + hintH,
    bannerH,
    bannerGap,
    dieGap: 0,
    hintH,
    colW,
    edge,
    overflows: width > discW || width * ratio > discH,
  };
}

/* ------------------------------------------------------------------ pick */

/**
 * Lay the table out for a window. The arrangement is chosen on estimates
 * alone (so a measurement cannot flip it back and forth); the stacked layout
 * then refines its numbers against the measured box.
 */
export function tableLayout(inp: TableInput): TableLayout {
  const scale = chromeScaleFor(inp.width, inp.height);
  const est = stacked(inp, scale);
  const one = side(inp, scale, false);
  const two = side(inp, scale, true);

  // one column beats two unless two gives the disc clearly more room
  let wide = one;
  if (two && (!one || two.width > one.width * 1.02)) wide = two;

  if (wide && wide.width > est.width * SIDE_BIAS && !wide.overflows) return wide;
  return inp.measuredBox && inp.measuredBox > 0 ? stacked(inp, scale, inp.measuredBox) : est;
}
