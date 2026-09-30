/**
 * The app's words, in the device's language. English (en.ts) is the source of
 * truth: every other file is typed `Strings`, so a missing or extra key is a
 * compile error, and the test next door checks that the {placeholders} match.
 *
 * Pure TypeScript: the language is picked once at launch by ./device.ts (which
 * needs expo-localization); until then, and in the tests, it is English.
 */

import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { ja } from './ja';
import { pt } from './pt';

export type Key = keyof typeof en;
export type Strings = Record<Key, string>;

export const DICTS = { en, de, fr, pt, ja, es, it } satisfies Record<string, Strings>;
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

/** First supported language among the preferred locales ("de-AT" → de), else English. */
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

type PluralBase = { [K in Key]: K extends `${infer B}.one` ? B : never }[Key];

/** `trn('pegs', 3)` → "3 pegs": the `.one` form for one (and zero in French), else `.other`. */
export function trn(base: PluralBase, n: number, vars?: Vars): string {
  const one = n === 1 || (current === 'fr' && n === 0);
  return tr(`${base}.${one ? 'one' : 'other'}` as Key, { n, ...vars });
}

function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(current).format(n);
  } catch {
    return String(n);
  }
}

/** 0.73 → "73%" / "73 %", as the language writes it. */
export function percent(x: number): string {
  try {
    return new Intl.NumberFormat(current, { style: 'percent', maximumFractionDigits: 0 }).format(x);
  } catch {
    return `${Math.round(x * 100)}%`;
  }
}

/** A key's text in every language (animal names, so a typed "Eule" is still the owl). */
export function everyLanguage(key: Key): string[] {
  return LANGS.map((l) => DICTS[l][key]);
}
