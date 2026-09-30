/**
 * Purchases: the parts that are just data and pure functions (the store calls
 * live in purchases.ts / purchases.web.ts). One non-consumable unlock, three
 * consumable tips that unlock nothing, and a grown-ups-only math question in
 * front of every purchase and restore.
 */

export const UNLOCK_ID = 'com.raviteja.pegrecall.unlock';
export const TIP_IDS = [
  'com.raviteja.pegrecall.tip.small',
  'com.raviteja.pegrecall.tip.medium',
  'com.raviteja.pegrecall.tip.large',
] as const;
export type ProductId = typeof UNLOCK_ID | (typeof TIP_IDS)[number];
export const PRODUCT_IDS: ProductId[] = [UNLOCK_ID, ...TIP_IDS];

/** How a purchase ended, in words the sheet can show. */
export type BuyResult = 'done' | 'cancelled' | 'pending' | 'failed';

/**
 * Store builds before 1.2.0 (build numbers 1, 2 and 4) had everything free:
 * anyone who first got the app from one of them keeps it all. Only a
 * Production app transaction counts, so TestFlight, Sandbox and App Review
 * (whose originalAppVersion is always "1.0") still see the paywall.
 */
export const FIRST_PAID_BUILD = 5;

export function isGrandfathered(
  tx: { environment?: string | null; originalAppVersion?: string | null } | null | undefined,
): boolean {
  if (!tx || String(tx.environment).toLowerCase() !== 'production') return false;
  // originalAppVersion is CFBundleVersion: a bare build number for this app
  const build = String(tx.originalAppVersion ?? '').trim();
  return /^\d+$/.test(build) && Number(build) < FIRST_PAID_BUILD;
}

/* ---------------------------------------------------------- parental gate */

export interface MathQuestion {
  text: string;
  /** spoken form: VoiceOver reads "×" as "multiplied by" at best */
  label: string;
  answer: number;
}

/**
 * A one-digit sum, e.g. "7 + 5" (the owner's pick: quick for grown-ups).
 * `rand` returns [0, 1), like Math.random.
 */
export function mathQuestion(rand: () => number = Math.random): MathQuestion {
  const pick = () => 2 + Math.floor(rand() * 8); // 2..9
  const a = pick();
  const b = pick();
  return { text: `${a} + ${b} = ?`, label: `What is ${a} plus ${b}?`, answer: a + b };
}

/** Typed text against the answer: digits only, spaces ignored. */
export function isRightAnswer(q: MathQuestion, typed: string): boolean {
  const s = typed.replace(/\s/g, '');
  return /^\d+$/.test(s) && Number(s) === q.answer;
}
