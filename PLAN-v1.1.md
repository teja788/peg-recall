# Color Catch v1.1 — report and plan

Date: 2026-09-26. Status: **decisions made, build in progress** (section 1a overrides anything below it).

## 1a. Decisions (2026-09-26, by the owner)

| # | Decision |
|---|---|
| D1 | **Palette = owner's proposal**, not "R": red replaces orange, violet replaces sky blue; blue, green, yellow, purple unchanged. Ids `orange→red`, `sky→violet`, same slot order, same shapes per slot. |
| D2 | Name **`Color Catch: Memory Board Game`** (30). Subtitle with "Kids": **`Kids & Family: Pass and Play`** (28). Keywords (100): `toddler,preschool,senior,concentration,2,3,two,player,peg,dice,brain,offline,match,pair,recall,night`. "Kids" alone is fine outside the Kids Category; never write "for Kids" / "for Children" (guideline 2.3.8). |
| D3 | v1.1 adds **per-player stats** and the **rating prompt**. **No** Toy 24 board. **No** toddler mode. Speed setting not approved → not in v1.1. |
| D4 | **No ads**, ever. Any future money = one-time unlock behind a parental gate. |
| D6 | Names move **out of Settings** into a "Who's playing?" sheet after tapping a mode: prefilled with the last lineup (default = animal name), recent-name chips, big Play button (1 extra tap), "Play again, same players" on game over skips it. Settings keeps only "Forget player names". Shapes on pegs stay **off** by default. |
| D7 | **No EAS build / submit** until the owner says so (more inputs may come). |
| D8 | Board must fill the screen on every device (iPad landscape: trays + die move to side columns; no fixed 700 pt cap). |
| D9 | "How to play" screen, opened from a **?** icon next to sound + settings on Home. Not auto-shown on first launch. |
| D5 | `package.json` scripts reverted; stale `ios/` deleted; `npm test` script added; `expo-store-review` installed. |

Inputs: four parallel research passes (code audit, palette + names design, competitor research, ASO audit). Baseline at report time: `tsc` clean, 82/83 tests pass (1 stale test, see A2), expo-doctor 18/20 (local Xcode + one dep range).

Supporting files:
- `assets/source/palette/` — colour-math scripts (`node evaluate.mjs`) and `preview.png` (every candidate palette rendered on the peg gradient, normal + simulated colour blindness, light + dark board).

---

## 0. Headlines

1. **The live App Store page is not the planned listing.** It shipped 2026-09-24 as **"Peg Recall"**, no subtitle, category Games/Entertainment (not Board/Family), no promo text, uncaptioned screenshots in the wrong order. It ranks for nothing except "peg recall". ASO score 22/100. This is the single biggest growth problem, and the name/subtitle/category fix rides on the v1.1 submission.
2. **"Memory Chess" is a dead search term** (no autocomplete, results are chess apps). Drop it from the name.
3. **New palette: red, yellow, green, blue, violet, pink.** Your proposal (red for saffron, violet for sky) works once violet goes very deep and the old pinkish "purple" becomes an honest pink. The weakest pair improves by 2x for normal vision and 1.5x for colour-blind players.
4. **Custom names are cheap**: the engine already has `PlayerSpec.name` and the tray already reads it. The work is the settings UI and text layout.
5. **No iOS app does the peg-and-die game.** The one direct competitor is an Android app with ads. The most-requested genre features are stats and adjustable speed.

---

## 1. Decisions needed (5)

| # | Decision | Recommendation |
|---|---|---|
| D1 | Palette: literal proposal or tuned "R" palette | **R** (section 3). Literal keeps the old pink "purple" next to a light violet → violet/blue collapses for colour-blind players (ΔE 3.0). |
| D2 | App name + subtitle | **"Color Catch: Memory Board Game"** / **"Family Game Night: Pass & Play"** (section 6). |
| D3 | v1.1 scope beyond colours + names | Include: audit fixes, review prompt, per-name win stats, speed setting, 24-peg "Toy" board. Defer the rest to v1.2 (section 7). |
| D4 | Ads plan (PLAN decision 7: "ads later") | **Drop ads.** ~35% of 1-star kids-app reviews are about ads. If monetising later: one-time "peg sets" unlock behind a parental gate. |
| D5 | Uncommitted `package.json` change (`expo run:ios`) | **Revert.** This Mac has Xcode 14.2; SDK 55 needs Xcode 26, so `npm run ios` can't work here. Also delete the half-generated `ios/` folder (EAS ignores it, so builds are unaffected). |

---

## 2. Code audit

### Must fix in v1.1 (High)

| ID | Problem | Where | Fix | Effort |
|---|---|---|---|---|
| A1 | Die tumble is uncapped. The store waits for at most 3 rerolls, but the Die animates all of them. With one colour left, 48% of rolls reroll more than 3 times: the player is told "Find Blue" while the die still flickers; at 7+ rerolls the AI picks before the die lands and the rolled colour is never shown. Up to ~20 s of tumble. (Earlier fix B1 was incomplete.) | `src/ui/Die.tsx:106` | Use `tumbleMs(rerolls)` from the store | 10 min |
| A2 | Test suite is red: "shapes on pegs are on by default" fails since commit 0bcd23c turned shapes off | `src/store/__tests__/settings.test.ts:16` | Update the test to the new default (off) | 5 min |
| A3 | Sudden death is confusing: trays empty when it starts, sudden-death pegs don't count, then "Fox wins!" shows over two equal scores and the banner says "Board clear!" on a non-empty board | `app/game.tsx:249-258,365,414`, `GameOverSheet.tsx:41-51` | Keep main-board captures, show "won the sudden death" + its tally, fix the banner | 1–2 h |
| A4 | VoiceOver announces nothing on iOS (turn changes, "Find X", match/miss, die result). `accessibilityLiveRegion` is Android-only. The listing claims VoiceOver support. | `src/ui/TurnBanner.tsx:90` | `AccessibilityInfo.announceForAccessibility` on banner change + die landing, debounced | 45 min |

### Should fix in v1.1 (Medium)

| ID | Problem | Where | Fix | Effort |
|---|---|---|---|---|
| A5 | AI never picks a peg it forgot: the `knownWrong` entry (which holds the peg's *true* colour) survives the forget and excludes it. Owl picked the forgotten peg 0 times in 1,981 trials. | `src/engine/ai.ts:252,269-274` | `delete knownWrong[index]` on forget, add test | 20 min |
| A6 | Flip-down remounts ~80 SVG dolls on a 40-peg board at the busiest moment (partly undoes earlier fix D2) | `src/ui/Peg.tsx:89-97,151-161` | Stable fragment tree; derive `fading` during render | 45 min |
| A7 | Pause/game-over sheets aren't modal for VoiceOver; pausing during the reveal lets VoiceOver read peg colours | `PauseSheet.tsx:60`, `GameOverSheet.tsx:62` | Move `accessibilityViewIsModal` to the outer overlay | 15 min |
| A8 | Settings hydrate race: a slow read (>2 s) loses to defaults, then the next save overwrites the user's settings | `src/store/settings.ts:58-72` | "Real read done" flag; hold writes until the read settles | 30 min |
| A9 | Die slot still sized at 0.9 aspect; the die art is 0.986 and overflows its slot by 9–12 pt (earlier fix B12 incomplete) | `app/game.tsx:60,289,324,457` | Use `WOOD_DIE_ASPECT` | 10 min |
| A10 | Pause → Home calls `resume()`, so an AI move, sound or haptic can fire during the exit | `app/game.tsx:165-168` | `teardown()` instead | 10 min |
| A11 | "Stats… in a later build" placeholder is an App Review rejection risk (guideline 2.1/2.2) | `app/settings.tsx:148-161` | Replace with real per-name stats (section 5) or remove | 5 min |
| A12 | Reduce Motion doesn't stop the 14 Hz die colour flicker | `src/ui/Die.tsx:113` | Skip the flicker when reduced | 10 min |
| A13 | Dynamic Type overflow: countdown digit outgrows its ring, banner truncates, sheets don't scroll on an SE | `RevealCountdown.tsx:140`, `TurnBanner.tsx:95`, sheets | `maxFontSizeMultiplier` caps, ScrollView in sheets | 45 min |
| A14 | Board and trays re-render 4–6 times per move (40 Pressables with fresh closures) | `app/game.tsx:91-94`, `Board.tsx`, `PlayerTray.tsx` | `React.memo` + stable per-index handler | 30 min |

### Cleanup (Low)

| ID | Problem | Fix | Effort |
|---|---|---|---|
| A15 | `moti` pulls in framer-motion etc. (~525 KB, 8% of all JS) for one drop-in animation in `PlayerTray.tsx:67` | Replace with Reanimated `entering`, drop moti | 30 min |
| A16 | Dead code: `hapticMiss`, `adjacentIndices`, 7 unused re-exports in `src/ui/engine.ts`, `PEG_PAINT.shape`, ModeCard `glyph`/`accent`, `lastMode` | Delete | 20 min |
| A17 | Win chime plays when the computer wins (confetti doesn't) | Gate on human win | 5 min |
| A18 | `sanitize` accepts duplicate avatars; requires exactly 3 (adding seats later would silently reset); no schema version | Validate + add version field | 10 min |
| A19 | Tooling: no `npm test` script; `development` EAS profile needs `expo-dev-client` (not installed); `@react-navigation/native` range drift | Add script; `npx expo install @react-navigation/native` | 15 min |
| A20 | Splash still uses old art; Android adaptive icon still template blue `#E6F4FE` | Regenerate from the new icon | 30 min |
| A21 | VoiceOver swipe order follows depth, not ring order | Sort accessibility order by ring | 15 min |
| A22 | Board side margin 7.5 pt on 375 pt phones (below the trays' 12 pt) | Cosmetic, optional | 5 min |

Verified OK: new icon (1024×1024, no alpha); 96% board width fits every iPhone/iPad size and split view, touch targets ≥ 52 pt; earlier fixes B2, B5, B9, D2, E1 still hold; EAS builds unaffected by local `ios/`.

Audit total: **about 9 hours** of work.

**Release note:** `runtimeVersion: appVersion` means 1.1.0 is a new runtime. Any OTA fix for 1.0 users must be published from a config still set to 1.0.0.

---

## 3. Peg palette

### Why the pairs look alike
- Pegs are drawn with a radial gradient (±25 lightness) plus gloss. Sky and blue are the **same hue** and differ only in lightness, which the gradient eats: blue's lit centre almost equals sky's rim (ΔE 5.4).
- Saffron and yellow are 28° apart in hue and both sit in the wood's honey tones. Saffron is also the colour closest to the board itself.
- The palette (Okabe-Ito) was designed for flat chart fills, not small shaded caps.

### Options compared (CIEDE2000; higher = easier to tell apart; "grad" = worst pair across the gradient)

| Palette | Normal (grad) | Worst for protan | Worst for deutan | Worst for tritan | Weakest pair |
|---|---|---|---|---|---|
| Current | 13.6 | 9.5 | 8.1 | 7.6 | sky / blue |
| Your proposal, literal (red, violet for sky, keep pinkish purple) | 14.3 | **3.0** | 6.0 | 7.6 | violet / purple; violet / blue for colour-blind |
| Literal + purple → pink | 19.6 | 3.0 | 6.0 | 7.6 | violet / blue for colour-blind |
| **R (recommended)** | **26.7** | **15.1** | **11.4** | **13.0** | blue / violet |

See `assets/source/palette/preview.png`.

### Recommended palette R

| id (slot) | Label | Fill | Rim | Glyph ink (contrast ≥ 3:1 on all stops) | Shape |
|---|---|---|---|---|---|
| `red` (was orange) | Red | `#C8231A` | `#A01C15` | `#FFFFFF` | ♥ heart |
| `violet` (was sky) | Violet (or "Purple" — one-string change) | `#5A0A96` | `#480878` | `#FFFFFF` | ■ square |
| `blue` | Blue | `#046FC7` | `#03599F` | `#FFFFFF` | ▲ triangle |
| `green` | Green | `#12BE78` | `#0E9860` | `#063D26` | ★ star |
| `yellow` | Yellow | `#F6E72E` | `#BBB023` | `#635D13` | ● circle |
| `pink` (was purple) | Pink | `#F0A0CF` | `#C080A6` | `#563A4B` | ◆ diamond |

- Honours your intent: red replaces saffron, violet replaces sky blue, blue stays (slightly brighter).
- Violet is deep so it separates from blue by lightness, which colour-blind players still see.
- **Honest limit:** red/green and blue/violet can't be fully colour-blind-safe together. Shapes are reassigned so exactly those pairs get the most different shapes (♥/★, ▲/■). Retitle the toggle "Shapes on pegs (color-blind help)" and show the shape in the banner ("Find Red ♥") when on.
- Rename the ids (`orange→red`, `sky→violet`, `purple→pink`) in the **same slot order** so seeded boards and the die's pip wheel are unchanged. Nothing persisted stores colour ids, so there's no migration.

### Files to change
- Code: `src/engine/types.ts`, `src/ui/art/palette.ts`, `src/theme/tokens.ts`, `src/ui/art/shapePaths.ts`, `app/index.tsx` (previews, card accents), `app/game.tsx` (confetti → derive from `PEG_PAINT`), `assets/source/build-peg-preview.ts`.
- Tests: `nodeBudget.test.ts` (literals + ink expectations), `store/__tests__/game.test.ts:106`; **new** palette-separation test (normal grad ≥ 24, each CVD type ≥ 11) ported from `assets/source/palette/colormath.mjs`.
- Store/docs: `store-assets/listing.md:99` (drop "every common kind of color blindness"), `capture-screenshots.mjs:338`, peg swatches in `docs/index.html` + `store-assets/site/index.html`, PLAN.md §4, ART-NOTES.md. App icon: repaint the orange peg red.
- All 12 screenshots must be reshot.

Effort: **5–6 h** (code 1.5, tests 1, simulator check 1, screenshots 1, copy 1).

---

## 4. Custom player names

### UX
> **Superseded by D6 (built 2026-09-26):** names are asked on a "Who's playing?" sheet after tapping a mode (`src/ui/PlayersSheet.tsx`, an overlay on Home): each seat prefilled with its last name or its animal's, recent-name chips, big Play button; "Play again" skips it; Settings keeps only "Forget player names". The sketch below is the original Settings design.

Names live in **Settings → Players**; Home stays 2 taps from the first move. Blank = the animal's name. The computer is always Bunny/Fox/Owl.

```
Players
Names are optional – leave blank to use the animal.
┌──────────────────────────────────────────┐
│ (🦊)  P1  [ Maya              ⓧ ]        │  tap animal to cycle, as today
│ (🦉)  P2  [ Owl  ← placeholder   ]        │
│ (🐻)  P3  [ Bear ← placeholder   ]        │
└──────────────────────────────────────────┘

Game, 3 players on iPhone SE:
[⏸] [🦊 Maya 3●●] [🦉 Leo 1●] [🐻 Grandm… 0]
          ( Maya's turn )
```

### Model
- `Settings.names: string[]` (length 3, `''` = animal). Max 12 characters counted by code point (emoji-safe); input cap 24 for pastes.
- `cleanName()`: trim, collapse whitespace, strip control/bidi characters, cut at 12 without splitting emoji.
- Migration: same storage key; v1.0 data has no `names`, so defaults fill in. A bad entry becomes `''` without resetting the others.
- `seatsFor()` sets `name` on human seats only. Engine unchanged.

### Where names appear
- Tray (`PlayerTray.tsx`): width cap (~64 pt with 3 players, ~100 pt with 2), tail ellipsis, VoiceOver "Maya, fox, 3 pegs, their turn".
- Banner (`app/game.tsx`): new `possessive()` → "Maya's turn", "James' turn".
- Game over (`GameOverSheet.tsx`): new `joinNames()` → "Maya, Leo and Sam share the win!" (today prints "A and B and C").
- Settings inputs: `autoCapitalize="words"`, no autocorrect, no contact autofill, Next/Done keys, `automaticallyAdjustKeyboardInsets` on the ScrollView.

### Store/privacy
Names never leave the device: not user-generated content under Apple's rules. Age rating 4+ and "Data Not Collected" stay. Add "player names you type" to the on-device list in `privacy.html`. Update `listing.md:91` ("so nobody has to type a name").

Effort: **7–8 h** (model + tests 1.5, settings UI 2.5, tray/banner/game-over/VoiceOver 1.5, docs 0.5, QA on SE / Dynamic Type / web 1.5).

---

## 5. What similar games have that Color Catch lacks

### Market
| App | Notes |
|---|---|
| Color Memory Chess (Android only) | The only direct digital copy. Ads. 4.5★, 10K+ installs. Reviews ask for more. |
| Toy Theater Memory Chess (web) | 24/36/40 pins, computer or up to 6 friends. |
| Chicken Cha Cha Cha (iPad) | Closest mechanic cousin. **Delisted** — this niche is empty on iOS. |
| Memory • Classic Game | 4.6★ / 10K ratings. Time attack, 25 levels, themes, 24 languages. Complaints: ads, Game Center popup. |
| Memory Matches 2 | 4.8★ / 9.5K. 4 modes, daily streak, star unlocks. Complaint: "accuracy rates luck, not memory". |
| Memory Games with Animals | 4.2★ / 25K. Complaint: "you don't know if you are getting better". |

Also: a large **seniors / stroke-recovery / therapist** audience ("too fast for seniors"), and the physical toy sells heavily in **India**.

### Ranked gaps

**v1.1 (recommended):**
1. **Per-name stats**: wins per player and per difficulty, win streak vs Fox/Owl, head-to-head. Replaces the placeholder (A11). Recall % counts only pegs already seen (fixes the "luck" complaint). *3–4 h, fits names work.*
2. **Speed setting**: Relaxed / Normal / Quick (animation length, miss-hold time, AI think time, reveal time). Serves seniors and toddlers. *≤ half day.*
3. **"Toy 24" board**: 24 pegs = 4 of each colour, like the real toy. The 25-peg board can't split evenly across 6 colours. *≤ half day.*
4. **In-app review prompt** (see section 6). *1 h.*

**v1.2:**
5. Toy win rules: "first to collect all of one colour" and "one of each colour (rainbow)" — from the toy's own rule sheets.
6. ~~Toddler "open board" mode~~ — rejected by owner 2026-09-26.
7. Resume a game after iOS kills the app (engine state is plain data).
8. 4–6 players and mixed seats (2 kids + Bunny).
9. In-app localization (Spanish, Portuguese-BR, French, German, Hindi first).

**Later:** solo memory ladder with levels and stars; daily board (offline, seeded, no streak penalty); sticker book + optional Game Center; peg-set themes as a one-time IAP behind a parental gate; iPad table mode; Android build via EAS (the only competitor is Android-only).

### Avoid
1. Ads, especially full-screen.
2. Mid-game paywalls, "ask your parents" nags, purchases without Restore.
3. Streak punishment, login bonuses, push nags aimed at kids.
4. Rewarded rating prompts (against App Store rules).
5. Slow animations that ignore taps; a Game Center login at launch.

---

## 6. ASO

### Current state: 22/100
Title 2/10 · Subtitle 0 · Keywords 3 · Description 4 · Screenshots 3 · Video 0 · Ratings 1 · Icon 7 · Rankings 1 · Conversion 1.

### Keyword picks (evidence: Apple autocomplete + median rating count of the top 10 results)
| Keyword | Popularity | Competition | Put in |
|---|---|---|---|
| memory game | High | Medium (median 8K ratings) | Name |
| color memory game | Medium | **Very low** (leader has 191 ratings) | Name — best winnable term |
| memory board game | Low | Low | Name (free by-product) |
| family game night | Medium | Medium | Subtitle |
| pass and play | Low–med | Top exact-title app has 0 ratings | Subtitle |
| kid, toddler, preschool, senior, concentration, 2/two player, peg, dice, brain, offline, match, pair, recall | — | — | Keyword field |
| memory chess | **None** (chess results) | — | Drop |

### v1.1 metadata (ready to paste, counts measured)
- **Name (30/30):** `Color Catch: Memory Board Game`
- **Subtitle (30/30):** `Family Game Night: Pass & Play`
- **Keywords (98/100):** `kid,toddler,preschool,senior,concentration,2,3,two,player,peg,dice,brain,offline,match,pair,recall`
- **Promo text (151/170):** `New in 1.1: bolder peg colors that are easier to tell apart, and type your own player names. Still free, with no ads, no sign-in and no data collected.`
- **Category:** Games → subcategories **Board** (primary) and **Family**.
- **Description opening (170, the visible fold):** `The wooden peg memory game for kids, families and grandparents. Look at the colored pegs, remember where they stand, then roll the die and find the color. Most pegs wins.`
- Description changes: players bullet → "Type each player's name, or skip the keyboard and pick an animal"; colours bullet → "Six bold colors - red, yellow, green, blue, violet and pink…"; shapes bullet → "Color blind? Switch on Shapes on Pegs…".
- **What's New 1.1:**
  ```
  New colors, and your own names.

  - Fresh peg colors: red replaces orange and violet replaces sky blue, so every peg is easier to tell apart at a glance - especially on small boards and in dim light.
  - Type a name for each player. Prefer the animals? They are still there, and still one tap.
  - Shapes on Pegs is still one switch away for anyone who finds colors hard to tell apart.
  - Small fixes and polish.

  Enjoying Color Catch? A rating on the App Store helps other families find it.
  ```
- Alternative name `Color Catch: Kids Memory Game` targets the biggest search ("memory games for kids") but "for kids" wording outside the Kids Category risks rejection (guideline 2.3.8). Only with a Kids Category opt-in, which is irreversible — stay out for now.

### Screenshots (reshoot all for the new palette, shapes off, captions on)
1. Reveal board, full colour — `Look. Remember. Find it.`
2. Die showing red/violet over the hidden board — `Roll a color. Pick the peg.`
3. 3-player trays with typed names — `Pass and play with the family`
4. vs computer — `Bunny, Fox or Owl: pick a rival`
5. Board sizes + kid mode — `From 16 pegs to 40`
6. Shapes on — `Shapes for color-blind players`
7. Dark-mode win + confetti — `Free. Offline. No ads.`

Never lead with a face-down board: the first 3 shots show in search results. Fix "Roll a colour" (UK spelling) on Home for the US listing.

### Growth levers, in order
1. Name, subtitle, keywords, category in the 1.1 submission. Reload every App Store Connect field after saving (it silently dropped edits last time).
2. **Today, no review needed:** paste promo text; add Accessibility Nutrition Labels (VoiceOver *after* A4 ships, Dark Interface, Larger Text, Reduced Motion).
3. In-app review prompt (`expo-store-review`): on the game-over sheet ~1.5 s after confetti, after ≥ 3 finished games on ≥ 2 days, only after a human win or finished pass-and-play, once per version. Plus a "Rate Color Catch" row in Settings.
4. Captioned screenshots (above).
5. Spanish (Mexico) localization — the US store indexes it, so it adds keyword space in the US too. Name `Color Catch: Memorama`, subtitle `Juego de Mesa para la Familia`.
6. English (UK) — default for the UK and **India**. Keywords use "colour".
7. Custom product pages (kids / seniors / game night) after 1.1 is approved.
8. 15–20 s app preview video (board flips down → roll → match → confetti).
9. Marketing page: App Store badge, `apple-itunes-app` meta tag, consistent name.
10. Later: In-App Events once a daily board exists; A/B tests once impressions reach thousands per week; Google Play.

---

## 7. Plan

Effort is focused work time for one person; parallel agents compress the build phases to roughly a day of wall-clock time.

| Phase | What | Effort | Depends on |
|---|---|---|---|
| **P0 — today, no build** | Paste promo text; add accessibility labels (skip VoiceOver until A4); check App Store Connect → App Information for the name/category drift; decide D1–D5 | 30 min | — |
| **P1 — fixes** | A1–A14, then A15–A22; revert `package.json` scripts, delete `ios/`; add `npm test` | ~9 h | D5 |
| **P2 — palette** | Section 3, incl. separation test and red icon peg | 5–6 h | D1 |
| **P3 — names + stats** | Section 4, plus per-name win stats replacing the placeholder | 10–12 h | P1 (A8, A18 touch settings) |
| **P4 — v1.1 extras** | Speed setting, Toy 24 board, review prompt | ~1 day | P1 |
| **P5 — store** | Reshoot 12 screenshots with captions; metadata; es-MX + en-GB listings; privacy + site copy; marketing page | ~5 h | P2, P3 |
| **P6 — ship** | Bump to 1.1.0 (new runtime), EAS build, device QA (SE, Pro Max, iPad incl. rotation), submit | ~3 h + review wait | all |

Agent split for P1–P4 (disjoint files, no `git stash`):
- Agent 1: engine + store fixes (A1, A3, A5, A8, A10, A18) + settings model for names.
- Agent 2: palette (types, palette, tokens, shapes, tests).
- Agent 3: UI fixes (A4, A6, A7, A9, A12–A14, A15) + names UI (tray, banner, game-over, settings rows).
- Me: integration, test run, simulator/web check.

## 8. Checklist

- [x] D1–D7 decided
- [ ] P0 promo text + accessibility labels live
- [x] P1 fixes, tests green (150/150; A20 splash/Android icon, A22 margin left open)
- [x] P2 palette (red #CE1202, violet #6201DA)
- [x] P3 names ("Who's playing?" sheet) + stats
- [x] P4 review prompt (speed + Toy 24 dropped)
- [x] D8 adaptive board (stacked / side / split layouts) + web gradient fix
- [x] D9 How to play screen (? icon), copy rewritten simple (4 steps)
- [ ] Device QA: keyboard on SE, VoiceOver in sheets, sudden death, Dynamic Type, iPad split view
- [ ] P5 screenshots + metadata + localizations
- [ ] P6 1.1.0 submitted
