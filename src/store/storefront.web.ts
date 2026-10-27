/**
 * Web counterpart of storefront.ts. The published web game has no store: the
 * locked items point to the App Store and there are no free tries. During
 * development (`expo start --web`, the iPad Safari checks) the old play-through
 * stays, so the purchase flow can still be tried in a browser.
 */
export const hasStore = __DEV__;
