import { Platform, type ViewStyle } from 'react-native';

/**
 * Web: an animated view gets its own compositor layer. Unpromoted, a JS
 * transform/opacity update re-rasters part of the one full-screen layer every
 * frame, and Mali Bifrost drivers (Galaxy M12, Mali-G52, Nov 2026) botch
 * partial tile updates: noise blocks, stale and torn pegs. Firefox works
 * around the same driver bug by never updating part of a tile. Put it on every
 * Animated.View that moves during a game.
 */
export const OWN_LAYER = (Platform.OS === 'web' ? { willChange: 'transform, opacity' } : null) as ViewStyle | null;
