# Color Catch v1.3: share, daily board, and real numbers

Date: 2026-10-23 (replaces the Oct 7 draft). Status: **decided Oct 24: 1.3 = S1 share (App Store link, no /play page) + S2 daily board. S3, S4, S5 deferred.**. Hindi, the old 1.3.1, already shipped in 1.2.1. Other ideas: `GROWTH-IDEAS.md`.

## 1. Why these four things

App Store Connect, Sep 22 – Oct 21 (opt-in devices only):

| Number | Value | What it says |
|---|---|---|
| Impressions → page views | 7.9K → 149 (2%) | The store page is the weak spot. The PPO test (running, store-only) works on this. |
| First-time downloads | 72 (~4/day this week) | Growing, but small. |
| Day-1 to day-28 retention | under 4% | Most players never come back. Nothing pulls them back tomorrow. |
| Purchases | 0 | We can't tell whether anyone opens the unlock sheet. |

So 1.3 does four things:
1. **Bring players back tomorrow:** a daily board (S2).
2. **Let players bring friends:** a WhatsApp-ready result (S1 + S3).
3. **Measure the funnel:** anonymous analytics (S4).
4. **Clean up the words App Review flags in screenshots:** "Kid mode", "Try free" (S5).

Success 4 weeks after 1.3 is live: day-7 retention above 10%, new downloads per week doubled against the 1.2.1 week (`downloads.mjs`), and a first funnel count of unlock-sheet opens.

## 2. Decisions needed (owner)

| # | Decision | Recommendation |
|---|---|---|
| D1 ✅ yes (Oct 24) | Ship the **daily board** (same board for everyone each day, Wordle-style)? | **Yes.** It is the only item aimed at the 4% retention. |
| D2 ✅ yes (Oct 24) | Do shared messages include **player names**? | **Yes**, except the computer's. Kids can be "Player 2". The user starts every share. |
| D3 ❌ no for now (Oct 24) | Where does the shared link go? | **Our `/play` page** with a preview card. iPhone/iPad goes on to the Family custom product page; Android shows "coming soon". |
| D4 ❌ no for now (Oct 24) | Add **anonymous analytics** (PostHog)? | **Yes, anonymous only:** no person profiles, no session replay, no advertising ID, 6 events. The App Privacy label changes from "Data Not Collected" to "Usage Data, not linked to you". |
| D5 ❌ no for now (Oct 24) | New names for **"Kid mode"** and the **"Try free"** badge? | **"Gentle mode"** and **"Try once"**. |

D4 is the only one that changes a promise on the store page; say no and 1.3 still ships the rest.

## 3. What gets built

### S1. "Share result" on the game-over sheet (~½ day)

- New button under "Play again" in `src/ui/GameOverSheet.tsx`.
- `Share.share({ message })` from react-native (no new dependency; WhatsApp sits at the top of the iOS share sheet). On web: `navigator.share`, falling back to `https://wa.me/?text=…`.
- A pure `shareText(state, locale)` in `src/ui/shareText.ts`, so it's unit-testable.
- At most 6 lines, so WhatsApp shows it as one bubble:

```
🎯 Color Catch #12 · daily board
🟥🟨🟩🟦🟪💗 Found 23/25 in 14 rolls
Can you beat me? 👉 https://teja788.github.io/peg-recall/play
```

- All text goes through `tr()` in all 19 UI languages, and names and numbers through `isolate()` / `playerLabel()` (Arabic is RTL).

### S2. Daily board (~1 day)

- Home gets "Today's board #N": Classic board, solo vs Fox, always free (never behind the unlock).
- `seed = daysSince(2026-09-24)` gives everyone the same board and die order that day. The engine already takes `config.seed`.
- Best result and a streak are stored on the device. No server.
- Already played today: the button shows the result and "Share".

### S6–S8. Added Oct 24 (owner: yes)

- **S6 Daily reminder:** optional, asked after the first daily game and in Settings; local notifications only, at most 2 after the last daily game, no push token, no data collected.
- **S7 Weekend daily board on Big:** Saturday and Sunday use the Big board (normally paid) for that one game. No "free" wording.
- **S8 Streak moments:** best streak on the daily card; a celebration at 3, 7, 14 and 30 days.

### S3. `/play` link page (~2 h)

- `docs/play.html` on GitHub Pages, with Open Graph tags (the 1.2 header image at 1200×630), so WhatsApp shows a big colorful card.
- iPhone/iPad: redirect to the Family custom product page URL (or the plain App Store page until that page is live), plus a Smart App Banner.
- Android/desktop: "Color Catch is on iPhone and iPad. Android is coming soon," with screenshots.
- Add an App Store link to `docs/index.html` (it has none).

### S4. Anonymous analytics, if D4 = yes (~½ day + privacy updates)

- `posthog-react-native` (Expo-supported), set up with `personProfiles: 'never'`, autocapture off and session replay off.
- 6 events: `game_started` (mode, board), `game_finished`, `daily_played`, `unlock_sheet_opened` (which locked item led there), `purchase_started`, `purchase_result` (bought / cancelled / failed).
- Events are queued offline and sent later, so "Play anywhere, even offline" still holds.
- Update `docs/privacy.html` and the App Privacy answers in App Store Connect before submitting.

### S5. Wording clean-up (~1 h)

- "Kid mode" → D5 name, in all 19 languages (`settings.kid`, `howto.kidTitle`, `howto.footnote`). The internal setting key stays, so saved settings carry over.
- "Try free" / "one game, free" → "Try once" / "one game to try".
- Then screenshots may show the Settings row again.

## 4. Checks

- Unit tests: `shareText()` (every language, 1–4 players, a tie, sudden death, daily board, a long name, ≤ 300 chars), the daily seed (same date = same board, next day = different), the i18n keys in all languages.
- Web smoke test: game over → Share → the text is right; the daily board opens; analytics events appear in PostHog.
- iPad TestFlight (owner): share to WhatsApp, check the preview card, check the link opens the App Store; play the daily board two days running.
- Full guideline audit of every locale, image and in-app text before submitting (as for 1.2.1).

## 5. Release

1. Bump to 1.3.0, then `npm test` and `tsc`.
2. EAS build with the default Xcode 26 image, then TestFlight, then the owner's iPad check.
3. What's New in 20 languages: "Share your result on WhatsApp, plus a new board every day".
4. Audit, then submit 1.3.0. After approval, an In-App Event "Daily board".
5. Weekly check: `downloads.mjs` plus App Analytics retention, and the PostHog funnel.

Rough total: **~2½ days of build work** (3 with analytics) + 1 TestFlight round + 1–2 days of review.

## 6. Not in 1.3 (on purpose)

- **Expo SDK upgrade (55 → 58)** for Xcode 27 and full-screen on iPhone Duo. Apple will at some point require the iOS 27 SDK for new uploads (it usually announces this for spring), so plan it as **1.4**, with a launch test on an iOS 27 device.
- An image card for the share (`react-native-view-shot`). The text plus the preview card is enough to start.
- Leaderboards or accounts: these need a server and personal data.
- Google Play: right after 1.3 (`GROWTH-IDEAS.md` §6).

## 7. Store work that runs alongside (no build)

- The PPO test "Colorful first 3 + Bright icon" (uploading Oct 23; then owner submits and starts it).
- Custom product pages: Seniors, Kids, Family, No ads, Color-blind. Submit them together with the PPO test to save a review round. The Family page URL is the one S3 links to.

## 8. Before the 1.3 screenshot upload (found Oct 24)

- Reshoot the en, fr and pt frames for 1.3 anyway: they predate the 4-player home card and will lack the daily board card. Use neutral player names (no Nana / Mamie / Vovó) in `capture-screenshots.mjs`, then recompose every locale that uses them (en-*, fr-*, pt-*, the PPO set).
- `src/i18n/nb.ts` `board.huge` 'Kjempestort' is cut off on the iPhone board tile: use 'Kjempe' and update the `no` description to match.
- cs caption 03-family: no-break space after the one-letter "s" ("s celou").
- Recompose `hi` screenshots: Indic captions now get line-height 1.32 (two lines collided at 1.08).
- Search-result images: 6 locales have none (hi, ru, vi, id, th, ar-SA). After the reshoot, re-render all 34 with `compose-creative.mjs` and check each one by eye (submission checklist §5). The header has no text and serves every locale.
