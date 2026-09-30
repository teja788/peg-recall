/**
 * Picks the app's language once, at launch, from the device's preferred
 * locales (on the web, navigator.languages). Imported first thing by the entry
 * (index.ts), so every screen's first render is already in that language.
 * iOS restarts the app when its language changes, so once is enough.
 */
import { getLocales } from 'expo-localization';

import { pickLang, setLang } from './index';

try {
  setLang(pickLang(getLocales().map((l) => l.languageTag)));
} catch {
  /* no locale info: stay in English */
}
