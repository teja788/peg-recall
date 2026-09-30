/**
 * How players are named in text: tray labels, "Maya's turn", "Maya and Leo
 * share the win!", in the app's language. Pure TypeScript (no React Native) so the stats model and the
 * tests can use it too.
 */

import type { AvatarId } from '../engine/types';
import { tr } from '../i18n';
import { AVATAR_CYCLE, animalName } from '../store/settingsModel';

/** The name a seat goes by: its typed name, else its animal ("Fox", "Fuchs"). */
export function playerLabel(spec: { name?: string; avatar: AvatarId }): string {
  const typed = typeof spec.name === 'string' ? spec.name.trim() : '';
  if (typed) return typed;
  if (AVATAR_CYCLE.includes(spec.avatar)) return animalName(spec.avatar);
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
 * An RTL name dropped into a left-to-right sentence can drag the punctuation
 * after it (",", "and", "'s turn") to the wrong side. First-strong isolates
 * fence it off. Plain names are returned untouched so ordinary strings stay
 * readable.
 */
export function isolate(name: string): string {
  return hasRtl(name) ? FSI + name + PDI : name;
}

/** "Maya", "Maya and Leo", "Maya, Leo and Sam" (in the app's language). */
export function joinNames(names: string[]): string {
  const parts = names.map((n) => isolate(n.trim()));
  if (parts.length <= 1) return parts[0] ?? '';
  return parts.slice(0, -1).join(tr('list.sep')) + tr('list.and') + parts[parts.length - 1];
}
