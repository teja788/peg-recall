/**
 * Peg Recall — peg shape glyph paths.
 *
 * Split out of shapes.tsx so that pure modules (svgModel.ts, and the node
 * preview script that imports it) can read the paths without pulling in
 * react-native-svg. shapes.tsx re-exports both names, so existing imports of
 * `SHAPE_PATHS` / `SHAPE_VIEWBOX` from './shapes' keep working.
 */
import type { PegColor } from '../../engine/types';

/** All glyphs are authored in a 24x24 box, optically centred on (12, 12). */
export const SHAPE_VIEWBOX = 24;

export const SHAPE_PATHS: Record<PegColor, string> = {
  // ● circle
  orange: 'M12 3.6a8.4 8.4 0 1 0 0 16.8a8.4 8.4 0 1 0 0-16.8Z',
  // ▲ triangle
  sky: 'M12 4.6 L20.2 18.5 L3.8 18.5 Z',
  // ■ rounded square
  blue: 'M7 4.6 H17 A2.4 2.4 0 0 1 19.4 7 V17 A2.4 2.4 0 0 1 17 19.4 H7 A2.4 2.4 0 0 1 4.6 17 V7 A2.4 2.4 0 0 1 7 4.6 Z',
  // ★ five-point star
  green:
    'M12 3.7 L14.35 9.06 L20.18 9.64 L15.8 13.54 L17.05 19.26 L12 16.3 L6.95 19.26 L8.2 13.54 L3.82 9.64 L9.65 9.06 Z',
  // ♥ heart
  yellow:
    'M12 20.3 C12 20.3 3.4 15 3.4 9.2 C3.4 6.3 5.6 4.3 8.1 4.3 C9.9 4.3 11.2 5.3 12 6.5 C12.8 5.3 14.1 4.3 15.9 4.3 C18.4 4.3 20.6 6.3 20.6 9.2 C20.6 15 12 20.3 12 20.3 Z',
  // ◆ diamond
  purple: 'M12 3.5 L20.5 12 L12 20.5 L3.5 12 Z',
};
