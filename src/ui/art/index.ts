/**
 * Color Catch — art layer. Everything visual that is drawn rather than laid out.
 *
 * One family only: the 3/4 view (PLAN.md section 2) — a tilted wooden disc,
 * upright peg dolls standing in it, and a wooden colour die on the same table.
 * The geometry is pure TypeScript in perspectiveModel.ts; the components here
 * are thin react-native-svg renderers over it, so `npx tsx` can build the
 * preview page (assets/source/build-peg-preview.ts) from the same numbers.
 *
 * The app icon does NOT come through here: assets/source/build-svg.js writes
 * icon.svg standalone, with its own copy of the constants it needs.
 */

export { Avatar, AVATAR_NAMES } from './avatars';
export type { AvatarProps } from './avatars';

export { SHAPE_PATHS, SHAPE_VIEWBOX } from './shapePaths';

export { PEG_HEX, PEG_RIM, PEG_GLYPH_ON, NEUTRAL, WOOD, shade } from './palette';
export type { ArtTheme, WoodTones } from './palette';

export { PerspectiveBoard } from './boardPerspective';
export type { PerspectiveBoardProps, PerspectiveHole } from './boardPerspective';
export {
  BOARD_Y_SCALE,
  PEG_WIDTH_OF_SPACING,
  boardCentre,
  boardHeight,
  holeSizeFor,
  pegWidthFor,
  projectHole,
  perspectiveBoardScene,
  pegDollScene,
  pegDollAnchor,
  woodDieScene,
  PEG_DOLL_ASPECT,
  PEG_DOLL_BASE_Y,
  PEG_DOLL_CAP_HEIGHT,
  PEG_DOLL_STAND_HEIGHT,
  WOOD_DIE_ASPECT,
} from './perspectiveModel';
export type { Grad, GradStop, Prim, Scene } from './perspectiveModel';

export { PegDoll } from './pegDoll';
export type { PegDollProps } from './pegDoll';
export { WoodDie } from './dieWood';
export type { WoodDieProps } from './dieWood';
export { TrayPeg, TRAY_PEG_ASPECT } from './trayPeg';
export type { TrayPegProps } from './trayPeg';
export { SvgScene } from './scene3d';
