/**
 * How players are named in text: tray labels, "Maya's turn", "Maya and Leo
 * share the win!". Pure TypeScript (no React Native) so the stats model and the
 * tests can use it too.
 */

import type { AvatarId } from '../engine/types';
import { ANIMAL_NAME } from '../store/settingsModel';

/** The name a seat goes by: its typed name, else its animal ("Fox"). */
export function playerLabel(spec: { name?: string; avatar: AvatarId }): string {
  const typed = typeof spec.name === 'string' ? spec.name.trim() : '';
  if (typed) return typed;
  const animal = ANIMAL_NAME[spec.avatar];
  if (animal) return animal;
  const id = String(spec.avatar ?? '');
  return id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Player';
}

/**
 * Right-to-left letters: Hebrew, Arabic, Syriac, Thaana, NKo, Samaritan,
 * Mandaic, Arabic extended (U+0590–U+08FF), Hebrew/Arabic presentation forms,
 * and the supplementary RTL blocks (U+10800–U+10FFF, U+1E800–U+1EFFF) as
 * surrogate pairs. Explicit ranges, no \p{...}: Hermes-safe.
 */
const RTL = /[֐-ࣿיִ-﷿ﹰ-ﻼ]|[\uD802\uD803\uD83A\uD83B][\uDC00-\uDFFF]/;

export function hasRtl(text: string): boolean {
  return RTL.test(text);
}

const FSI = '⁨';
const PDI = '⁩';

/**
 * An RTL name dropped into an English sentence can drag the punctuation after
 * it ("'s", ",", "and") to the wrong side. First-strong isolates fence it off.
 * Plain names are returned untouched so ordinary strings stay readable.
 */
function isolate(name: string): string {
  return hasRtl(name) ? FSI + name + PDI : name;
}

/** "Maya's", "James'" (a name ending in s takes a bare apostrophe). */
export function possessive(name: string): string {
  const n = name.trim();
  const ends = n.charAt(n.length - 1);
  return isolate(n) + (ends === 's' || ends === 'S' ? "'" : "'s");
}

/** "Maya", "Maya and Leo", "Maya, Leo and Sam". */
export function joinNames(names: string[]): string {
  const parts = names.map((n) => isolate(n.trim()));
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
