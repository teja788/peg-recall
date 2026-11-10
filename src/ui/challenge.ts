/**
 * "Beat my score": a daily board's result as a link, …/d/47?s=8&r=14&by=Ravi,
 * that opens board #47 for a friend with "Ravi caught 8 pegs in 14 rolls.
 * Beat it!", and at game over says who won. Everything is in the link itself;
 * nothing is stored anywhere.
 *
 * The link is untrusted input that ends up on screen, so it is read strictly.
 * Pure TypeScript (no React Native), so the tests can run it.
 */

import { tr, trn } from '../i18n';
import { isolate } from './names';

export interface Challenge {
  /** the board's number */
  n: number;
  /** pegs caught */
  s: number;
  /** rolls in the game */
  r: number;
  /** the sender's name, cleaned; none shows as "A friend" */
  by?: string;
}

const NAME_MAX = 16;

/** Anything but letters, marks, digits and spaces. Built at run time: an engine
 *  without Unicode property escapes gets null, and links then carry no name. */
const NOT_NAME = (() => {
  try {
    return new RegExp('[^\\p{L}\\p{M}\\p{Nd} ]', 'gu');
  } catch {
    return null;
  }
})();

/** Letters, marks, digits and single spaces, at most 16 characters; anything
 *  else (punctuation, URLs' slashes, emoji, control and bidi characters) goes. */
export function cleanChallengeName(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !NOT_NAME) return undefined;
  let s = raw;
  try {
    s = s.normalize('NFC');
  } catch {
    /* the raw string is still filtered below */
  }
  s = s.replace(NOT_NAME, '').replace(/ +/g, ' ').trim();
  return Array.from(s).slice(0, NAME_MAX).join('').trim() || undefined;
}

/** A whole number from 0 to `max`, written plainly ("08", "1e1", "-1", "2.5" are not). */
function whole(v: unknown, max: number): number | null {
  if (typeof v !== 'string' || !/^(0|[1-9]\d{0,5})$/.test(v)) return null;
  const n = Number(v);
  return n <= max ? n : null;
}

/**
 * The board and challenge a link asks for. `today` is today's board number:
 * a link can be at most one board ahead (time zones). A bad board number opens
 * today's board; a bad score or roll count opens the board with no challenge.
 */
export function parseChallenge(
  q: { n?: unknown; s?: unknown; r?: unknown; by?: unknown },
  today: number,
): { n: number; challenge: Challenge | null } {
  const n = whole(q.n, today + 1);
  if (n == null) return { n: today, challenge: null };
  const s = whole(q.s, 40);
  const r = whole(q.r, 999);
  if (s == null || r == null) return { n, challenge: null };
  const by = cleanChallengeName(q.by);
  return { n, challenge: { n, s, r, ...(by ? { by } : {}) } };
}

/** `base`: the web game's address, without a trailing slash. */
export function challengeUrl(base: string, c: Challenge): string {
  const by = cleanChallengeName(c.by);
  return `${base}/d/${c.n}?s=${c.s}&r=${c.r}${by ? `&by=${encodeURIComponent(by)}` : ''}`;
}

const sender = (c: Challenge) => (c.by ? isolate(c.by) : tr('challenge.friend'));

/** "Ravi caught 8 pegs in 14 rolls. Beat it!" */
export function challengeBanner(c: Challenge): string {
  return tr('challenge.banner', { name: sender(c), pegs: trn('pegs', c.s), n: c.r });
}

/** "You 9 · Ravi 8 — You beat Ravi!": pegs only, equal is a tie. */
export function challengeVerdict(c: Challenge, mine: number): string {
  const name = sender(c);
  const outcome =
    mine > c.s
      ? c.by
        ? tr('challenge.beat', { name })
        : tr('challenge.win')
      : mine < c.s
        ? tr('challenge.lost', { name })
        : tr('challenge.tie');
  return `${tr('challenge.score', { me: mine, name, them: c.s })} — ${outcome}`;
}
