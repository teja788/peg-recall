/**
 * Web counterpart of purchases.ts: no StoreKit in a browser. The published web
 * game sells nothing (storefront.web.ts): no prices, and a purchase or restore
 * never succeeds. In development the old play-through stays for testing the
 * sheet: a made-up price, a purchase that succeeds once the math question is
 * answered, and a restore that finds nothing.
 */
import { PRODUCT_IDS, UNLOCK_ID, type BuyResult, type ProductId } from './purchasesModel';
import { useSettings } from './settings';
import { hasStore } from './storefront';

const FAKE_PRICE: Record<ProductId, string> = {
  'com.raviteja.pegrecall.unlock': '$2.99',
  'com.raviteja.pegrecall.tip.small': '$0.99',
  'com.raviteja.pegrecall.tip.medium': '$2.99',
  'com.raviteja.pegrecall.tip.large': '$4.99',
};

export function startPurchases() {}

export async function loadPrices(): Promise<Partial<Record<ProductId, string>>> {
  if (!hasStore) return {};
  return Object.fromEntries(PRODUCT_IDS.map((id) => [id, FAKE_PRICE[id]]));
}

export async function buy(id: ProductId): Promise<BuyResult> {
  if (!hasStore) return 'failed';
  await new Promise((r) => setTimeout(r, 600));
  if (id === UNLOCK_ID) useSettings.getState().set('unlocked', true);
  return 'done';
}

export async function restore(): Promise<boolean> {
  return hasStore && useSettings.getState().unlocked;
}
