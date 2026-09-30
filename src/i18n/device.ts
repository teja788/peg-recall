/**
 * Picks the app's language once, at launch, from the device's preferred
 * locales (on the web, navigator.languages). Imported first thing by the entry
 * (index.ts), so every screen's first render is already in that language.
 * iOS restarts the app when its language changes, so once is enough.
 */
import { getLocales } from 'expo-localization';

import { pickLang, setLang } from './index';

try {
  // web only: ?lang=de opens the app in that language (testing, links)
  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lang');
  setLang(pickLang([asked, ...getLocales().map((l) => l.languageTag)]));
} catch {
  /* no locale info: stay in English */
}
