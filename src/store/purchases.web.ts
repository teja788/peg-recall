/**
 * Web counterpart of purchases.ts: no StoreKit in a browser, so the web build
 * (iPad Safari against `expo start --web`) plays the flow through: a made-up
 * price, a purchase that succeeds once the math question is answered, and a
 * restore that finds nothing.
 */
import { PRODUCT_IDS, UNLOCK_ID, type BuyResult, type ProductId } from './purchasesModel';
import { useSettings } from './settings';

const FAKE_PRICE: Record<ProductId, string> = {
  'com.raviteja.pegrecall.unlock': '$2.99',
  'com.raviteja.pegrecall.tip.small': '$0.99',
  'com.raviteja.pegrecall.tip.medium': '$2.99',
  'com.raviteja.pegrecall.tip.large': '$4.99',
};

export function startPurchases() {}

export async function loadPrices(): Promise<Partial<Record<ProductId, string>>> {
  return Object.fromEntries(PRODUCT_IDS.map((id) => [id, FAKE_PRICE[id]]));
}

export async function buy(id: ProductId): Promise<BuyResult> {
  await new Promise((r) => setTimeout(r, 600));
  if (id === UNLOCK_ID) useSettings.getState().set('unlocked', true);
  return 'done';
}

export async function restore(): Promise<boolean> {
  return useSettings.getState().unlocked;
}
