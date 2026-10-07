# Color Catch v1.3: WhatsApp-shareable results

Date: 2026-10-07. Status: **plan, waiting on the owner's decisions (section 2)**. Build starts after 1.2.0 clears review. Other growth ideas: `GROWTH-IDEAS.md`.

## 1. Goal

Turn every finished game into a neat WhatsApp message that makes a friend or relative want to play. Downloads are the bottleneck (27 new in 30 days, half from India), and a share in a family group is the cheapest recommendation there is.

What success looks like 4 weeks after 1.3 is live: new downloads per week at least double the 1.2 baseline (`downloads.mjs`).

## 2. Decisions needed (owner)

| # | Decision | Recommendation |
|---|---|---|
| D1 | Ship the **daily board** (same board for everyone each day, Wordle-style) in 1.3, or only "share this game"? | **Yes, both.** The daily number ("#12") is what makes people compare and share again tomorrow. |
| D2 | Do shared messages include **player names**? | **Yes, but off for the computer, and kids can be "Player 2".** Names make it personal; the share is always started by the user. |
| D3 | Where does the link go? | **Our site page** (`/play`), not the App Store directly: iPhone/iPad → App Store, Android → "coming soon" + a free web board later. Most Indian friends are on Android. |
| D4 | Parental gate before sharing? | **No.** The app is not in the Kids Category (gate rule 1.3 doesn't apply), and nothing leaves the device except what the user sends. |
| D5 | Hindi in the same build? | **Decided 2026-10-07: Hindi comes after 1.3, as 1.3.1** (section 7). D1–D4 are still open. |

## 3. What gets built

### S1. "Share result" on the game-over sheet (~½ day)

- New button under "Play again" in `src/ui/GameOverSheet.tsx`.
- `Share.share({ message })` from react-native: built in, no new dependency, opens the iOS share sheet with WhatsApp on top. On web, react-native-web uses `navigator.share`; fallback is `https://wa.me/?text=…` via `Linking`.
- A pure `shareText(state, locale)` in a new `src/ui/shareText.ts`, so it's unit-testable without React.

Message (English example; ≤ 6 lines, so it reads as one bubble without "Read more"):

```
🎯 Color Catch · Classic board
🏆 Maya wins! Maya 14 · Fox 11
🟥🟨🟩🟦🟪💗 25 pegs in 18 rolls
Can you beat us? 👉 https://teja788.github.io/peg-recall/play
```

Daily board version:

```
🎯 Color Catch #12 · daily board
🟥🟨🟩🟦🟪💗 Found 23/25 in 14 rolls
Beat my memory 👉 https://teja788.github.io/peg-recall/play
```

- Color row: the six peg colors as emoji, in palette order (red 🟥, yellow 🟨, green 🟩, blue 🟦, violet 🟪, pink 💗; there is no pink square, so use the heart).
- All text goes through `tr()`, in all 12 language files (13 UI languages). Numbers and names via the existing `isolate()` / `playerLabel()` so right-to-left and long names stay intact.
- Sudden-death and shared-win cases reuse `gameOverHeadline()`.

### S2. Daily board (~1 day)

- Home gets a "Today's board #N" button (Classic, solo vs Fox, free for everyone, so it never sits behind the unlock).
- `seed = daysSince(2026-09-24)` (launch day) → same board and same die order for everyone that day. The engine already takes `config.seed` (`src/engine/types.ts`).
- The result is stored locally (best per day, plus a streak). No server, so App Privacy stays "Data Not Collected".
- Played today already → the button shows the result and "Share" instead of "Play".

### S3. A link that works from WhatsApp (~2 h)

- New `docs/play.html` on the existing GitHub Pages site (`teja788.github.io/peg-recall`).
- **Open Graph tags** (`og:title`, `og:description`, `og:image` = the 1.2 header image at 1200×630), so WhatsApp shows a big colorful card instead of a bare link. This is what makes the share look neat.
- On iPhone/iPad, redirect to `https://apps.apple.com/app/id6813625311`, plus a Smart App Banner (`apple-itunes-app` meta).
- On Android and desktop, show "Color Catch is on iPhone and iPad. Android is coming soon," with screenshots (and later the free web board, idea 2.2 in `GROWTH-IDEAS.md`).
- Also fix `docs/index.html`: it has no App Store link today.

## 4. Checks

- `shareText()` unit tests: every language, 1/2/3 players, a tie, sudden death, daily board, a long name, and a length budget (≤ 300 chars).
- i18n test: the new keys exist in all languages (the existing `src/i18n/__tests__` pattern).
- Daily seed test: the same date gives the same board, and the next day gives a different one.
- Web smoke test: game over → Share → the text is right.
- iPad TestFlight (owner): share to WhatsApp, then check the preview card and that the link opens the App Store. Then share to a family member on Android and confirm the page looks fine.
- WhatsApp preview check before release: paste the `/play` link into a chat and confirm the image card shows.

## 5. Release

1. Bump to 1.3.0, then `npm test` and `tsc`.
2. EAS build, then TestFlight, then the owner's iPad check (section 4).
3. Update the "What's New" text in 14 languages: "Share your result on WhatsApp + a new board every day".
4. Submit 1.3.0. Then publish an In-App Event "Daily board" (free, shows in search).
5. Measure weekly with `downloads.mjs` against the baseline in `GROWTH-IDEAS.md`.

Rough total: **~2 days** of build work + 1 build/TestFlight round.

## 6. Not in 1.3 (on purpose)

- An image card for the share (needs `react-native-view-shot` + `expo-sharing`). The text + OG preview card covers it; add later if shares look plain.
- Leaderboards or accounts: these need a server and data collection, which breaks "Data Not Collected".
- Hindi: 1.3.1 (section 7).

## 7. Next: v1.3.1 Hindi (decided, after 1.3)

Why: India is the top country (12 of 27 downloads), and none of the 13 UI languages is Indian. Few memory games have a Hindi store page.

1. **UI:** a new `src/i18n/hi.ts` with every key, the 1.3 share and daily-board text included. Check button and pill fit, since Devanagari runs taller. Check the font: Nunito has no Devanagari, so confirm the system fallback renders cleanly on iPad.
2. **Store listing:** an `hi` locale in `store-assets/listing.json`. Research keywords in Hindi and Hinglish, not translations (the per-country keyword method in the ship-ios-app skill). Use a unique store name with a fallback ready.
3. **Screenshots + images:** Hindi frames (`screenshot-frames/hi/`), captions in `captions.json`, and a `search-hi.png` via `compose-creative.mjs`.
4. **Review:** Codex review of the Hindi text, plus a native speaker in the family. Use warm, simple words for kids and grandparents.
5. **Release:** 1.3.1, then build, TestFlight, then the owner's iPad check in Hindi (iPad Settings → Apps → Color Catch → Language, or `?lang=hi` on web), then submit.

Rough size: ~1 day. Telugu and Tamil can follow the same steps if Hindi moves downloads.
