/**
 * The word filter for names in online play (PLAN-web-online.md §B9, D11).
 * The server runs it on every name it is sent (protocol.ts), so a name with
 * a rude word is never shown to the room; the app runs it as the name is
 * typed, to say so at once.
 *
 * A name is folded before it is compared with blockedWords.ts: lower case,
 * no accents (Latin), no vowel marks (Arabic), no nukta (Indic), and spaces,
 * dots and symbols between the letters taken out. It is checked as typed and
 * again with look-alike digits read as letters (5h1t → shit). A letter
 * typed several times still matches once (fuuuck), and a word from the
 * WHOLE list has to be a whole word of the name, or the whole name.
 *
 * Plain string code, no \p{…} in regular expressions: Hermes runs it too.
 */

import { cleanName } from '../store/settingsModel';
import { ANYWHERE, SYMBOLS, WHOLE } from './blockedWords';

/** A word as runs of one letter: "boob" → b×1 o×2 b×1. */
interface Runs {
  ch: string[];
  n: number[];
}

/** Digits and symbols people type for the letters they look like. */
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '!': 'i',
};

/** Letters that decomposing leaves whole, written the way the lists are. */
const LETTERS: [RegExp, string][] = [
  [/ß/g, 'ss'],
  [/[đð]/g, 'd'],
  [/ø/g, 'o'],
  [/æ/g, 'ae'],
  [/œ/g, 'oe'],
  [/ł/g, 'l'],
  [/ı/g, 'i'],
  [/ة/g, 'ه'],
  [/ى/g, 'ي'],
  [/ـ/g, ''], // Arabic tatweel: stretches a word, means nothing
  [/ँ/g, 'ं'], // Devanagari candrabindu → anusvara
  [/ঁ/g, 'ং'], // Bengali candrabindu → anusvara
];

/** Marks that change nothing for the filter: Latin accents, Arabic vowel
 *  signs, and the nukta of Devanagari, Bengali, Gurmukhi, Gujarati, Odia
 *  and Kannada. */
const MARKS = /[̀-ًͯ-़়਼઼଼಼ٰٟ]/g;

function fold(raw: string): string {
  let s = raw;
  try {
    s = s.normalize('NFKC');
  } catch {
    /* no normalize on this engine: compare as typed */
  }
  s = s.toLowerCase();
  for (const [re, to] of LETTERS) s = s.replace(re, to);
  try {
    s = s.normalize('NFD');
  } catch {
    /* as above */
  }
  return s.replace(MARKS, '');
}

/** Not part of a word: ASCII other than a-z, Latin-1 punctuation and
 *  symbols, general punctuation to the dingbats (spaces, zero-width
 *  characters, arrows, shapes), CJK punctuation, variation selectors,
 *  private use, emoji, and the digits and full stops of the app's scripts. */
function isSeparator(cp: number): boolean {
  if (cp < 0x80) return cp < 0x61 || cp > 0x7a;
  return (
    cp <= 0xbf ||
    cp === 0xd7 ||
    cp === 0xf7 ||
    (cp >= 0x2000 && cp <= 0x2bff) ||
    (cp >= 0x3000 && cp <= 0x303f) ||
    cp === 0x30fb ||
    (cp >= 0xe000 && cp <= 0xf8ff) ||
    (cp >= 0xfe00 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff0f) ||
    cp >= 0x1f000 ||
    cp === 0x060c ||
    cp === 0x061b ||
    cp === 0x061f ||
    (cp >= 0x0660 && cp <= 0x066d) ||
    cp === 0x06d4 ||
    (cp >= 0x06f0 && cp <= 0x06f9) ||
    (cp >= 0x0964 && cp <= 0x096f) ||
    (cp >= 0x09e6 && cp <= 0x09ef) ||
    (cp >= 0x0be6 && cp <= 0x0bef) ||
    (cp >= 0x0c66 && cp <= 0x0c6f) ||
    (cp >= 0x0ce6 && cp <= 0x0cef) ||
    (cp >= 0x0e50 && cp <= 0x0e59)
  );
}

function runsOf(chars: string[]): Runs {
  const r: Runs = { ch: [], n: [] };
  for (const c of chars) {
    const last = r.ch.length - 1;
    if (last >= 0 && r.ch[last] === c) r.n[last] += 1;
    else {
      r.ch.push(c);
      r.n.push(1);
    }
  }
  return r;
}

/** The name's words and all its letters run together, as runs. */
function wordsOf(folded: string): { joined: Runs; words: Runs[] } {
  const words: string[][] = [];
  let word: string[] = [];
  for (const c of Array.from(folded)) {
    if (isSeparator(c.codePointAt(0) ?? 0)) {
      if (word.length) words.push(word);
      word = [];
    } else {
      word.push(c);
    }
  }
  if (word.length) words.push(word);
  return { joined: runsOf(([] as string[]).concat(...words)), words: words.map(runsOf) };
}

/**
 * `term` inside `hay`, each of its letters typed at least as many times.
 * `strict` (whole words, which hide in names): a letter typed more often
 * than in the word counts only from two extra on, so "fuuk" matches "fuk"
 * but the name Bonner does not match "boner".
 */
function contains(hay: Runs, term: Runs, strict: boolean): boolean {
  const k = term.ch.length;
  outer: for (let i = 0; i + k <= hay.ch.length; i++) {
    for (let j = 0; j < k; j++) {
      const n = hay.n[i + j];
      const want = term.n[j];
      if (hay.ch[i + j] !== term.ch[j] || n < want || (strict && n !== want && n < want + 2)) continue outer;
    }
    return true;
  }
  return false;
}

function same(hay: Runs, term: Runs): boolean {
  return hay.ch.length === term.ch.length && contains(hay, term, true);
}

function prepare(list: readonly string[]): Runs[] {
  return list.map((w) => wordsOf(fold(w)).joined).filter((r) => r.ch.length > 0);
}

const anywhere = prepare(ANYWHERE);
const whole = prepare(WHOLE);

/** True when the name has a word the room should not see. */
export function isBlockedName(name: string): boolean {
  if (!name) return false;
  if (SYMBOLS.some((s) => name.includes(s))) return true;
  const plain = fold(name);
  const leet = Array.from(plain, (c) => LEET[c] ?? c).join('');
  for (const text of plain === leet ? [plain] : [plain, leet]) {
    const { joined, words } = wordsOf(text);
    if (anywhere.some((t) => contains(joined, t, false))) return true;
    if (whole.some((t) => same(joined, t) || words.some((w) => same(w, t)))) return true;
  }
  return false;
}

/** The name to play under online: cleaned like any name, or undefined (the
 *  seat shows its animal) when it is empty or refused. */
export function onlineName(raw: unknown): string | undefined {
  const name = cleanName(raw);
  return name && !isBlockedName(name) ? name : undefined;
}
