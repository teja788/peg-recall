/**
 * The App Store side of the unlock and the tip jar, over expo-iap (StoreKit 2
 * on device, no server, nothing collected). The web build resolves
 * purchases.web.ts instead: there is no StoreKit in a browser.
 *
 * Every call here answers instead of throwing: a store that is down, a
 * simulator, a missing product all end as "no price" or 'failed', never as a
 * crash in the middle of a family game.
 */
import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAppTransactionIOS,
  getAvailablePurchases,
  initConnection,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type Purchase,
} from 'expo-iap';
import { Platform } from 'react-native';

import { PRODUCT_IDS, UNLOCK_ID, isGrandfathered, type BuyResult, type ProductId } from './purchasesModel';
import { useSettings } from './settings';

let connected: Promise<boolean> | null = null;
function connect() {
  connected ??= initConnection().then(
    () => true,
    () => {
      connected = null; // try again on the next tap
      return false;
    },
  );
  return connected;
}

function grant() {
  if (!useSettings.getState().unlocked) useSettings.getState().set('unlocked', true);
}

/** Give what was bought, then tell StoreKit it is delivered. Safe to run twice
 *  for one transaction (the purchase call and the update listener both do). */
async function deliver(p: Purchase) {
  if (p.productId === UNLOCK_ID) grant();
  await finishTransaction({ purchase: p, isConsumable: p.productId !== UNLOCK_ID }).catch(() => {});
}

/**
 * At launch (app/_layout.tsx): deliver anything StoreKit replays (an Ask to
 * Buy approved later, a purchase interrupted by a crash), and quietly check
 * whether this player already owns everything. None of these ask for an
 * Apple ID: AppTransaction.shared and Transaction.currentEntitlements only
 * read what the device already has.
 */
let started = false;
export function startPurchases() {
  if (started || Platform.OS !== 'ios') return;
  started = true;
  purchaseUpdatedListener((p) => void deliver(p));
  void (async () => {
    if (!(await connect())) return;
    if (!(await checkGrandfathered())) await checkOwned();
  })();
}

/** true (and granted) if this Apple Account first got the app before 1.2. */
async function checkGrandfathered(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    // iOS 16+; on 15 this throws and savedBeforeUnlock (settingsStore) covers it
    if (isGrandfathered(await getAppTransactionIOS())) {
      grant();
      return true;
    }
  } catch {
    /* no app transaction (simulator, iOS 15, offline first launch) */
  }
  return false;
}

/** true if the unlock is among the current entitlements (granted if so). */
async function checkOwned(): Promise<boolean> {
  try {
    const owned = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
    if (owned.some((p) => p.productId === UNLOCK_ID)) {
      grant();
      return true;
    }
  } catch {
    /* offline: the persisted flag still stands */
  }
  return false;
}

let prices: Promise<Partial<Record<ProductId, string>>> | null = null;

/** Localized prices ("$0.99", "0,99 €"), by product. Missing = hide the price. */
export function loadPrices(): Promise<Partial<Record<ProductId, string>>> {
  prices ??= (async () => {
    if (!(await connect())) throw new Error('no store');
    const list = await fetchProducts({ skus: PRODUCT_IDS, type: 'in-app' });
    const out: Partial<Record<ProductId, string>> = {};
    for (const p of list ?? []) out[p.id as ProductId] = p.displayPrice;
    if (!Object.keys(out).length) throw new Error('no products');
    return out;
  })().catch(() => {
    prices = null; // ask again next time the sheet opens
    return {};
  });
  return prices;
}

export async function buy(id: ProductId): Promise<BuyResult> {
  try {
    if (!(await connect())) return 'failed';
    const res = await requestPurchase({
      request: { apple: { sku: id }, google: { skus: [id] } },
      type: 'in-app',
    });
    const p = Array.isArray(res) ? res[0] : res;
    if (!p) return 'failed';
    await deliver(p as Purchase);
    return 'done';
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    if (code === ErrorCode.UserCancelled) return 'cancelled';
    // Ask to Buy: the approval, if it comes, arrives through the listener
    if (code === ErrorCode.DeferredPayment || code === ErrorCode.Pending) return 'pending';
    return 'failed';
  }
}

/** "Restore purchase": syncs with the App Store (may ask for the Apple ID
 *  password, which is fine here: a grown-up asked for it). */
export async function restore(): Promise<boolean> {
  if (!(await connect())) return false;
  try {
    await restorePurchases();
  } catch {
    /* cancelled sign-in: still look at what the device has */
  }
  // after a sync the app transaction is fresh too: an early player who
  // reinstalled offline gets their free unlock back here
  return (await checkOwned()) || checkGrandfathered();
}
