/**
 * Color Catch — player avatars.
 *
 * Six flat animal faces, each on its own muted accent disc so a player is
 * identifiable by colour at a glance and by silhouette when the tray is small.
 * Authored in a 48x48 box; the accent disc is the full circle r=24 at (24,24),
 * so an avatar can be dropped anywhere without its own background.
 *
 * Kept deliberately plain: no gradients, no filters, under ~12 nodes each, so a
 * three-player tray plus a 40-peg board still animates at 60 fps on an old
 * iPhone.
 */
import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { AvatarId } from '../../engine/types';

export const AVATAR_NAMES: Record<AvatarId, string> = {
  fox: 'Fox',
  owl: 'Owl',
  bear: 'Bear',
  frog: 'Frog',
  bunny: 'Bunny',
  cat: 'Cat',
};

/** Muted disc behind each face. Distinct in hue, all low-chroma and warm-safe. */
export const AVATAR_ACCENT: Record<AvatarId, string> = {
  fox: '#F6D3B0',
  owl: '#C3D2E6',
  bear: '#E6D6BC',
  frog: '#C4DFC3',
  bunny: '#F0D6E0',
  cat: '#D9D2E9',
};

/** Display order used by avatar pickers. */
export const AVATAR_IDS: readonly AvatarId[] = ['fox', 'owl', 'bear', 'frog', 'bunny', 'cat'];

const INK = '#3A2E26';

function Fox() {
  return (
    <G>
      <Path d="M10 18 L12.5 6.5 L20 12 Z" fill="#D2762F" />
      <Path d="M38 18 L35.5 6.5 L28 12 Z" fill="#D2762F" />
      <Path d="M12.8 15.4 L13.8 10 L17.6 12.8 Z" fill="#F3C9A6" />
      <Path d="M35.2 15.4 L34.2 10 L30.4 12.8 Z" fill="#F3C9A6" />
      <Path d="M24 11 C32.5 11 38 17.5 38 25 C38 32.5 32 38.8 24 38.8 C16 38.8 10 32.5 10 25 C10 17.5 15.5 11 24 11 Z" fill="#E8873C" />
      <Path d="M24 23 C30 23 35 26.2 35 30.2 C35 35 30 38.8 24 38.8 C18 38.8 13 35 13 30.2 C13 26.2 18 23 24 23 Z" fill="#FDF7EF" />
      <Circle cx={18.8} cy={22.4} r={2.1} fill={INK} />
      <Circle cx={29.2} cy={22.4} r={2.1} fill={INK} />
      <Ellipse cx={24} cy={29} rx={2.5} ry={1.9} fill={INK} />
      <Path d="M24 30.9 V32.6 M20.8 32.8 Q24 35.4 27.2 32.8" fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
    </G>
  );
}

function Owl() {
  return (
    <G>
      <Path d="M12 15 L14.5 6.5 L21 12 Z" fill="#6E7A93" />
      <Path d="M36 15 L33.5 6.5 L27 12 Z" fill="#6E7A93" />
      <Path d="M24 10 C33 10 39 17 39 25 C39 33 32 39.2 24 39.2 C16 39.2 9 33 9 25 C9 17 15 10 24 10 Z" fill="#7F8CA6" />
      <Circle cx={16.6} cy={23} r={7} fill="#F5EFE3" />
      <Circle cx={31.4} cy={23} r={7} fill="#F5EFE3" />
      <Circle cx={16.6} cy={23.4} r={3} fill={INK} />
      <Circle cx={31.4} cy={23.4} r={3} fill={INK} />
      <Path d="M24 24.6 L27.2 29.8 L20.8 29.8 Z" fill="#E8A33D" />
      <Path d="M15 33.5 Q24 37.5 33 33.5" fill="none" stroke="#6E7A93" strokeWidth={2} strokeLinecap="round" />
    </G>
  );
}

function Bear() {
  return (
    <G>
      <Circle cx={12.6} cy={14} r={6.2} fill="#A0764F" />
      <Circle cx={35.4} cy={14} r={6.2} fill="#A0764F" />
      <Circle cx={12.6} cy={14} r={3.2} fill="#D0AC85" />
      <Circle cx={35.4} cy={14} r={3.2} fill="#D0AC85" />
      <Circle cx={24} cy={26} r={14} fill="#B4885E" />
      <Ellipse cx={24} cy={31} rx={8.6} ry={6.2} fill="#EEE0CB" />
      <Circle cx={18.6} cy={22.6} r={2.1} fill={INK} />
      <Circle cx={29.4} cy={22.6} r={2.1} fill={INK} />
      <Ellipse cx={24} cy={28.4} rx={2.8} ry={2.1} fill={INK} />
      <Path d="M24 30.6 V32.4 M20.6 32.6 Q24 35.4 27.4 32.6" fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
    </G>
  );
}

function Frog() {
  return (
    <G>
      <Path d="M24 18 C33 18 39.5 23 39.5 29.2 C39.5 35 32.5 39.4 24 39.4 C15.5 39.4 8.5 35 8.5 29.2 C8.5 23 15 18 24 18 Z" fill="#6FB56B" />
      <Circle cx={15} cy={17.5} r={7} fill="#7CC178" />
      <Circle cx={33} cy={17.5} r={7} fill="#7CC178" />
      <Circle cx={15} cy={17.5} r={4.3} fill="#FDF9EE" />
      <Circle cx={33} cy={17.5} r={4.3} fill="#FDF9EE" />
      <Circle cx={15} cy={18.2} r={2.2} fill={INK} />
      <Circle cx={33} cy={18.2} r={2.2} fill={INK} />
      <Path d="M16 30.5 Q24 36.2 32 30.5" fill="none" stroke="#3E7A44" strokeWidth={2.1} strokeLinecap="round" />
      <Circle cx={13.5} cy={27.5} r={1.6} fill="#8FC98B" />
      <Circle cx={34.5} cy={27.5} r={1.6} fill="#8FC98B" />
    </G>
  );
}

function Bunny() {
  return (
    <G>
      <Path d="M19.5 18.5 C16.4 12.5 16 4.6 19.6 4.6 C23.2 4.6 22.6 12.5 21.6 18.5 Z" fill="#F0E7E1" />
      <Path d="M28.5 18.5 C31.6 12.5 32 4.6 28.4 4.6 C24.8 4.6 25.4 12.5 26.4 18.5 Z" fill="#F0E7E1" />
      <Path d="M20 16.4 C18.6 12.4 18.5 7.8 19.9 7.8 C21.3 7.8 21.1 12.4 20.8 16.4 Z" fill="#E9B8C6" />
      <Path d="M28 16.4 C29.4 12.4 29.5 7.8 28.1 7.8 C26.7 7.8 26.9 12.4 27.2 16.4 Z" fill="#E9B8C6" />
      <Circle cx={24} cy={27} r={12.6} fill="#F5EDE7" />
      <Circle cx={19.3} cy={25.4} r={2.1} fill={INK} />
      <Circle cx={28.7} cy={25.4} r={2.1} fill={INK} />
      <Path d="M24 30.8 L26.2 28.6 L21.8 28.6 Z" fill="#E29AAE" />
      <Path d="M24 30.8 V32.3 M21.2 32.5 Q24 35 26.8 32.5" fill="none" stroke="#C08296" strokeWidth={1.4} strokeLinecap="round" />
    </G>
  );
}

function Cat() {
  return (
    <G>
      <Path d="M13 20 L11.5 9 L22 14 Z" fill="#A0968F" />
      <Path d="M35 20 L36.5 9 L26 14 Z" fill="#A0968F" />
      <Path d="M14.4 17.6 L13.6 11.8 L19.2 14.6 Z" fill="#E3B7BE" />
      <Path d="M33.6 17.6 L34.4 11.8 L28.8 14.6 Z" fill="#E3B7BE" />
      <Circle cx={24} cy={26} r={13} fill="#ADA39B" />
      <Ellipse cx={18.8} cy={24} rx={2.2} ry={2.7} fill={INK} />
      <Ellipse cx={29.2} cy={24} rx={2.2} ry={2.7} fill={INK} />
      <Path d="M24 29.6 L26 27.7 L22 27.7 Z" fill="#E29AAE" />
      <Path d="M24 29.6 V31.1 M21.2 31.3 Q24 33.8 26.8 31.3" fill="none" stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
      <Path d="M9.5 26.6 L15.8 27.6 M9.8 30.6 L16 29.4 M38.5 26.6 L32.2 27.6 M38.2 30.6 L32 29.4" fill="none" stroke="#7E756F" strokeWidth={1.2} strokeLinecap="round" />
    </G>
  );
}

const FACES: Record<AvatarId, () => React.ReactElement> = {
  fox: Fox,
  owl: Owl,
  bear: Bear,
  frog: Frog,
  bunny: Bunny,
  cat: Cat,
};

export interface AvatarProps {
  id: AvatarId;
  size: number;
}

/** One animal face on its accent disc, filling a `size` x `size` square. */
export function Avatar({ id, size }: AvatarProps) {
  const Face = FACES[id];
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={24} fill={AVATAR_ACCENT[id]} />
      <Face />
    </Svg>
  );
}

export default Avatar;
