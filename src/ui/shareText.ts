/**
 * The message "Share result" hands to the share sheet: four short lines that
 * read as one WhatsApp bubble (no "Read more"), with the App Store link (no /play page: D3 = no),
 * or from the web game, the web game's own address (PLAN-web-online.md).
 *
 * Pure TypeScript (no React Native), so the tests can run it in every language.
 * The computer is never named in a share: it shows as 🤖 (PLAN-v1.3 D2).
 */

import { BOARD_SPECS, PEG_COLORS, type AvatarId, type BoardSize, type GameState, type PegColor } from '../engine/types';
import { tr } from '../i18n';
import { isolate, joinNames, playerLabel } from './names';

export const PLAY_URL = 'https://apps.apple.com/app/id6813625311';

/** One per peg colour; there is no pink square, so the pinkish "purple" is a heart. */
const EMOJI: Record<PegColor, string> = {
  red: '🟥',
  violet: '🟪',
  blue: '🟦',
  green: '🟩',
  yellow: '🟨',
  purple: '💗',
};
export const COLOR_ROW = PEG_COLORS.map((c) => EMOJI[c]).join('');

const COMPUTER = '🤖';

/** What a share needs from a finished game: plain data, so it can be stored. */
export interface ShareResult {
  /** the daily board's number, when it was one */
  daily?: number;
  board: BoardSize;
  /** seat order */
  players: { name?: string; avatar: AvatarId; ai: boolean; score: number; won: boolean }[];
  suddenDeath: boolean;
  /** every roll in the game, all players */
  rolls: number;
}

export function resultOf(state: GameState): ShareResult {
  return {
    board: state.config.boardSize,
    players: state.config.players.map((p) => ({
      ...(p.name ? { name: p.name } : {}),
      avatar: p.avatar,
      ai: p.kind === 'ai',
      score: state.scores[p.id] ?? 0,
      won: state.winnerIds.includes(p.id),
    })),
    suddenDeath: state.suddenDeath,
    rolls: state.turn,
  };
}

/** "Maya wins!", "Maya and Leo share the win!", "Maya wins the sudden death!". */
export function headlineFor(winners: string[], suddenDeath: boolean): string {
  if (winners.length === 0) return tr('over.none');
  if (winners.length > 1) return tr('over.share', { names: joinNames(winners) });
  return tr(suddenDeath ? 'over.winsSudden' : 'over.wins', { name: isolate(winners[0]) });
}

/** `url`: where the message sends friends (the App Store unless told otherwise;
 *  the web game passes its own address, see `shareUrl`). */
export function shareText(r: ShareResult, url: string = PLAY_URL): string {
  const label = (p: ShareResult['players'][number]) => (p.ai ? COMPUTER : playerLabel(p));
  const headline = headlineFor(r.players.filter((p) => p.won).map(label), r.suddenDeath);
  const scores = [...r.players]
    .sort((a, b) => b.score - a.score || Number(b.won) - Number(a.won))
    .map((p) => `${isolate(label(p))} ${p.score}`)
    .join(' · ');
  const pegs = tr('board.pegsShort', { n: BOARD_SPECS[r.board].pegs });
  return [
    `🎯 ${r.daily != null ? tr('share.titleDaily', { n: r.daily }) : tr('share.title', { board: tr(`board.${r.board}`) })}`,
    `🏆 ${headline} ${scores}`,
    `${COLOR_ROW} ${tr('share.rolls', { pegs, n: r.rolls })}`,
    `${tr('share.cta')} 👉 ${url}`,
  ].join('\n');
}
