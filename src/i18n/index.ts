/**
 * The app's words, in the device's language. English (en.ts) is the source of
 * truth: every other file is typed `Strings`, so a missing or extra key is a
 * compile error, and the test next door checks that the {placeholders} match.
 *
 * Pure TypeScript: the language is picked once at launch by ./device.ts (which
 * needs expo-localization); until then, and in the tests, it is English.
 */

import { ar } from './ar';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { hi } from './hi';
import { id } from './id';
import { it } from './it';
import { ja } from './ja';
import { ko } from './ko';
import { nl } from './nl';
import { pl } from './pl';
import { pt } from './pt';
import { ru } from './ru';
import { th } from './th';
import { tr as trDict } from './tr';
import { vi } from './vi';
import { zh } from './zh';

export type Key = keyof typeof en;
/** "pegs" for the plural pair 'pegs.one' / 'pegs.other'. */
type PluralBase = { [K in Key]: K extends `${infer B}.one` ? B : never }[Key];
/** Every English key, plus the extra plural forms a language may need
 *  (Polish: 3 pionki, 5 pionków; Arabic's dual: قطعتان). A missing or unknown key is a compile error. */
export type Strings = Record<Key, string> & Partial<Record<`${PluralBase}.${'two' | 'few' | 'many'}`, string>>;

/** zh is Traditional Chinese (zh-Hant), used for every Chinese locale. */
export const DICTS = { en, de, fr, pt, ja, es, it, ko, zh, tr: trDict, nl, pl, hi, ru, vi, id, th, ar } satisfies Record<
  string,
  Strings
>;
export type Lang = keyof typeof DICTS;
export const LANGS = Object.keys(DICTS) as Lang[];

let current: Lang = 'en';

/** The language the app speaks. */
export function lang(): Lang {
  return current;
}

export function setLang(l: Lang): void {
  current = l;
}

/** Arabic reads right to left (the layout mirrors; see device.ts). */
export function isRtl(): boolean {
  return current === 'ar';
}

/** A back ‹ / forward › chevron pointing the way the UI reads: flipped in
 *  Arabic, and fenced with LRMs so the bidi algorithm cannot flip it again. */
export function chevron(g: '‹' | '›'): string {
  return isRtl() ? `\u200E${g === '‹' ? '›' : '‹'}\u200E` : g;
}

/** First supported language among the preferred locales ("de-AT" → de, any
 *  "zh-…" → zh, which is Traditional Chinese), else English. */
export function pickLang(tags: readonly (string | null | undefined)[]): Lang {
  for (const tag of tags) {
    const code = String(tag ?? '').toLowerCase().split(/[-_]/)[0];
    if (code in DICTS) return code as Lang;
  }
  return 'en';
}

type Vars = Record<string, string | number>;

/** `tr('game.find', { color: 'Red' })` → "Find Red". Numbers are formatted for the language. */
export function tr(key: Key, vars?: Vars): string {
  const s = DICTS[current][key] ?? en[key];
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = vars[k];
    if (v == null) return m;
    return typeof v === 'number' ? formatNumber(v) : v;
  });
}

export type PluralCategory = 'one' | 'two' | 'few' | 'many' | 'other';

/** The plural form for `n` in language `l` (CLDR, via Intl.PluralRules). */
export function pluralCategory(l: Lang, n: number): PluralCategory {
  try {
    const c = new Intl.PluralRules(l).select(n);
    return c === 'one' || c === 'two' || c === 'few' || c === 'many' ? c : 'other';
  } catch {
    // no Intl.PluralRules (an older Hermes): the same rules for whole numbers
    if (l === 'ja' || l === 'ko' || l === 'zh' || l === 'vi' || l === 'id' || l === 'th') return 'other';
    const d = n % 10;
    const h = n % 100;
    if (l === 'pl') {
      if (n === 1) return 'one';
      return d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'few' : 'many';
    }
    if (l === 'ru') {
      if (d === 1 && h !== 11) return 'one';
      return d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'few' : 'many';
    }
    if (l === 'ar') {
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      return h >= 3 && h <= 10 ? 'few' : h >= 11 ? 'many' : 'other';
    }
    return n === 1 || ((l === 'fr' || l === 'pt' || l === 'hi') && n === 0) ? 'one' : 'other';
  }
}

/** `trn('pegs', 3)` → "3 pegs", "3 pionki", "5 pionków": the language's plural
 *  form (`.one` / `.two` / `.few` / `.many`), else `.other`. */
export function trn(base: PluralBase, n: number, vars?: Vars): string {
  const dict: Partial<Record<string, string>> = DICTS[current];
  const key = `${base}.${pluralCategory(current, n)}`;
  return tr((key in dict ? key : `${base}.other`) as Key, { n, ...vars });
}

/** Western digits everywhere (Arabic too): scores and counts drawn outside
 *  tr() are plain numbers, and the two must match. */
const numberLocale = () => `${current}-u-nu-latn`;

function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(numberLocale()).format(n);
  } catch {
    return String(n);
  }
}

/** 0.73 → "73%" / "73 %", as the language writes it. */
export function percent(x: number): string {
  try {
    return new Intl.NumberFormat(numberLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(x);
  } catch {
    return `${Math.round(x * 100)}%`;
  }
}

/** A key's text in every language (animal names, so a typed "Eule" is still the owl). */
export function everyLanguage(key: Key): string[] {
  return LANGS.map((l) => DICTS[l][key]);
}
