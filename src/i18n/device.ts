/**
 * Picks the app's language once, at launch, from the device's preferred
 * locales (on the web, navigator.languages). Imported first thing by the entry
 * (index.ts), so every screen's first render is already in that language.
 * iOS restarts the app when its language changes, so once is enough.
 */
import { getLocales } from 'expo-localization';

import { isRtl, lang, pickLang, setLang } from './index';

try {
  // web only: ?lang=de opens the app in that language (testing, links)
  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lang');
  setLang(pickLang([asked, ...getLocales().map((l) => l.languageTag)]));
} catch {
  /* no locale info: stay in English */
}

// Arabic: on iOS the layout mirrors by itself (ar is in app.json's
// supportedLocales, so React Native's I18nManager.isRTL is set at launch). The
// web needs the page told; boards stay left to right (direction: 'ltr').
if (typeof document !== 'undefined') {
  document.documentElement.lang = lang();
  document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
}
