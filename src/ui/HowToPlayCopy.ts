/**
 * Color Catch — the words on the "How to play" screen.
 *
 * Plain data, no React Native: the peg counts in it are read from the engine's
 * own tables rather than typed in, so the rules page cannot drift from the
 * rules, and the test next door can check the copy without a renderer.
 *
 * Written for a parent reading aloud to a five-year-old and for a grandparent
 * who has never seen the app: everyday words, short sentences, one idea each,
 * no jargon, no numbers of seconds.
 */

import { BOARD_SPECS, type BoardSize } from '../engine/types';
import { BOARD_CYCLE, BOARD_NAME } from '../store/settingsModel';

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
    {
      id: 'look',
      title: 'Look',
      body: 'The pegs show their colors, then turn to plain wood. Remember where each color is!',
    },
    {
      id: 'roll',
      title: 'Roll',
      body: 'Tap the die. It shows you a color.',
    },
    {
      id: 'find',
      title: 'Find',
      body: bonusTurnOnMatch
        ? 'Tap the peg you think is that color. Right? Keep it and go again. Wrong? Everyone sees its color, then it hides.'
        : 'Tap the peg you think is that color. Right? Keep it. Wrong? Everyone sees its color, then it hides.',
    },
    {
      id: 'win',
      title: 'Win',
      body: kidMode
        ? 'When the board is empty, most pegs wins. Tie? You all win!'
        : 'When the board is empty, most pegs wins. Tie? Play a tiny board. First peg wins.',
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
  return `From ${BOARD_NAME[first]} with ${BOARD_SPECS[first].pegs} pegs to ${BOARD_NAME[last]} with ${BOARD_SPECS[last].pegs}`;
}

export function waysToPlay(): Tip[] {
  return [
    {
      id: 'ai',
      title: 'Play the computer',
      body: 'Bunny is easy. Fox is medium. Owl is hard.',
    },
    {
      id: 'friends',
      title: 'Play together',
      body: '2 or 3 people take turns on one phone or tablet. Type your names before you start.',
    },
    {
      id: 'board',
      title: 'Board size',
      body: `${boardSizesLine()}. Start small.`,
    },
  ];
}

export function tips(): Tip[] {
  return [
    {
      id: 'kid',
      title: 'Kid mode',
      body: 'A longer look at the colors. Ties are shared wins.',
    },
    {
      id: 'shapes',
      title: 'Shapes on pegs',
      body: 'Each color also gets a shape. Good if colors look alike.',
    },
    {
      id: 'bonus',
      title: 'Bonus turn',
      body: 'On to start: get a peg, go again. Turn it off to always take turns.',
    },
    {
      id: 'watch',
      title: 'Watch',
      body: 'Watch every turn. A wrong peg shows everyone its color.',
    },
  ];
}

/** Where the Kid mode, Shapes and Bonus turn switches live. */
export const TIPS_FOOTNOTE = 'Kid mode, Shapes and Bonus turn are in Settings.';
