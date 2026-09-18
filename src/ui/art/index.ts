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
