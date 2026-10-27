/**
 * Whether this build can sell the unlock. The App Store builds can; the web
 * build cannot (storefront.web.ts), and that also turns off the free tries
 * there: browser storage can be cleared at will, so a try would never run out.
 */
export const hasStore = true;
