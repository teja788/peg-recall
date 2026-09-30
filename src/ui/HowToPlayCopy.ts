/**
 * Color Catch — the words on the "How to play" screen.
 *
 * Plain data, no React Native: the peg counts in it are read from the engine's
 * own tables rather than typed in, so the rules page cannot drift from the
 * rules, and the test next door can check the copy without a renderer.
 *
 * Written for a parent reading aloud to a five-year-old and for a grandparent
 * who has never seen the app: everyday words, short sentences, one idea each,
 * no jargon, no numbers of seconds. The words themselves are in src/i18n.
 */

import { BOARD_SPECS, type BoardSize } from '../engine/types';
import { tr } from '../i18n';
import { BOARD_CYCLE } from '../store/settingsModel';

/** The settings the rules actually depend on. */
export interface RulesContext {
  bonusTurnOnMatch: boolean;
  kidMode: boolean;
}

export type StepId = 'look' | 'roll' | 'find' | 'win';

export interface Step {
  id: StepId;
  title: string;
  body: string;
}

/**
 * The four steps, worded for the settings in force: "go again" only when the
 * bonus turn is on, and the tie rule the game will actually use.
 */
export function howToPlaySteps({ bonusTurnOnMatch, kidMode }: RulesContext): Step[] {
  return [
    { id: 'look', title: tr('howto.lookTitle'), body: tr('howto.lookBody') },
    { id: 'roll', title: tr('howto.rollTitle'), body: tr('howto.rollBody') },
    {
      id: 'find',
      title: tr('howto.findTitle'),
      body: tr(bonusTurnOnMatch ? 'howto.findBodyBonus' : 'howto.findBody'),
    },
    {
      id: 'win',
      title: tr('howto.winTitle'),
      body: tr(kidMode ? 'howto.winBodyKid' : 'howto.winBody'),
    },
  ];
}

export interface Tip {
  id: string;
  title: string;
  body: string;
}

/** Board sizes as one line: "From Small with 16 pegs to Huge with 40". */
export function boardSizesLine(): string {
  const first: BoardSize = BOARD_CYCLE[0];
  const last: BoardSize = BOARD_CYCLE[BOARD_CYCLE.length - 1];
  return tr('howto.sizes', {
    first: tr(`board.${first}`),
    firstPegs: BOARD_SPECS[first].pegs,
    last: tr(`board.${last}`),
    lastPegs: BOARD_SPECS[last].pegs,
  });
}

export function waysToPlay(): Tip[] {
  return [
    { id: 'ai', title: tr('howto.aiTitle'), body: tr('howto.aiBody') },
    { id: 'friends', title: tr('howto.friendsTitle'), body: tr('howto.friendsBody') },
    { id: 'board', title: tr('board.size'), body: tr('howto.boardBody', { sizes: boardSizesLine() }) },
  ];
}

export function tips(): Tip[] {
  return [
    { id: 'kid', title: tr('howto.kidTitle'), body: tr('howto.kidBody') },
    { id: 'shapes', title: tr('howto.shapesTitle'), body: tr('howto.shapesBody') },
    { id: 'bonus', title: tr('howto.bonusTitle'), body: tr('howto.bonusBody') },
    { id: 'watch', title: tr('howto.watchTitle'), body: tr('howto.watchBody') },
  ];
}

/** Where the Kid mode, Shapes and Bonus turn switches live. */
export function tipsFootnote(): string {
  return tr('howto.footnote');
}
