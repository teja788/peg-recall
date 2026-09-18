/** The four clips, statically required so Metro bundles them. */
export type SoundName = 'flip' | 'match' | 'roll' | 'win';

export const SOUND_SOURCES = {
  flip: require('../../assets/sounds/flip.m4a'),
  match: require('../../assets/sounds/match.m4a'),
  roll: require('../../assets/sounds/roll.m4a'),
  win: require('../../assets/sounds/win.m4a'),
};
