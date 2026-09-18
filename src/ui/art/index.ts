/** Peg Recall — art layer. Everything visual that is drawn rather than laid out. */
export { Avatar, AVATAR_NAMES, AVATAR_ACCENT, AVATAR_IDS } from './avatars';
export type { AvatarProps } from './avatars';
export { Shape, SHAPE_PATHS, SHAPE_VIEWBOX } from './shapes';
export type { ShapeProps } from './shapes';
export { DieFace } from './dieFace';
export type { DieFaceProps } from './dieFace';
export { PEG_HEX, PEG_RIM, PEG_GLYPH_ON, NEUTRAL, WOOD, shade } from './palette';
export type { ArtTheme, WoodTones } from './palette';
export { RoundBoard } from './roundBoard';
export type { RoundBoardProps, Hole } from './roundBoard';
export { Peg3D, PegTop } from './peg3d';
export type { Peg3DProps, PegTopProps } from './peg3d';
export { DieCube } from './dieCube';
export type { DieCubeProps } from './dieCube';
export { SvgDrawing } from './renderPrims';
export { roundBoardDrawing, pegDrawing, pegTopDrawing, dieCubeDrawing } from './svgModel';
export type { Drawing, Prim, Grad } from './svgModel';

/* ------------------------------------------------------------------------ */
/* The 3/4-view family (PLAN.md section 2). This is what the game screen uses;
 * the flat-top RoundBoard / Peg3D / DieCube above are kept only for the icon
 * and preview scripts. */

export { PerspectiveBoard } from './boardPerspective';
export type { PerspectiveBoardProps, PerspectiveHole } from './boardPerspective';
export {
  BOARD_Y_SCALE,
  BOARD_EDGE_RATIO,
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
  PEG_DOLL_ANCHOR,
  PEG_DOLL_BASE_Y,
  PEG_DOLL_CAP_HEIGHT,
  PEG_DOLL_CAP_TOP_Y,
  PEG_DOLL_STAND_HEIGHT,
} from './perspectiveModel';
export type { Scene } from './perspectiveModel';
export { PegDoll } from './pegDoll';
export type { PegDollProps } from './pegDoll';
export { WoodDie } from './dieWood';
export type { WoodDieProps } from './dieWood';
export { TrayPeg, TRAY_PEG_ASPECT } from './trayPeg';
export type { TrayPegProps } from './trayPeg';
export { SvgScene } from './scene3d';
