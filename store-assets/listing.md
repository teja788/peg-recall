# Peg Recall - App Store Connect listing copy (v1.0)

Everything below is ready to paste into App Store Connect. Placeholders in `{{ }}` are the
only things you must fill in yourself. Character counts were measured, not estimated.

Source of truth for facts: `PLAN.md` (sections 1-4, 8, 9). Nothing here claims a feature the
app does not ship: no online play, no stats screen, no purchases.

---

## 1. App name (30 max)

```
Peg Recall - Memory Chess
```
**25 / 30 characters.**

Fallback if App Store Connect rejects the compound name (duplicate-name or "keyword stuffing"
push-back): use `Peg Recall` (10) as the name and `Memory Chess` (12) as the subtitle, then move
the freed subtitle words into the keyword field (see the alternate keyword string below).

## 2. Subtitle (30 max)

```
Color Dice Match Game, Family
```
**29 / 30 characters.**

No word repeats the name, so every character buys new search coverage: *color*, *dice*, *match*,
*game*, *family*. Combined with the name this already ranks for "memory game", "peg game",
"dice color game", "color match game", "family memory game", "memory chess".

Alternates (same rules, pick one and stay with it):
- `Color Dice Match for Families` - 29
- `Color Dice Match, Family Fun` - 28

## 3. Keyword field (100 max, comma-separated, no spaces)

```
brain,training,kid,toddler,preschool,board,pair,concentration,pass,play,player,puzzle,2,3,offline
```
**97 / 100 characters.**

Rules applied: no spaces after commas, singular forms only (Apple indexes plurals), nothing
repeated from the name or subtitle, no app name, no "app", no "free", no competitor brands.

What the combinations cover (Apple builds phrases across name + subtitle + keywords):

| Target phrase | Built from |
|---|---|
| memory game / peg game | name + subtitle |
| brain training, brain game | keywords + subtitle |
| kids memory game, memory for kids | keywords + name |
| toddler / preschool game | keywords + subtitle |
| family board game | subtitle + keywords |
| matching pairs, color pairs | subtitle + keywords |
| concentration game | keywords + subtitle (the classic name for this genre) |
| pass and play, 2 player game, 3 player game | keywords |
| offline game, puzzle game | keywords + subtitle |

If you use the fallback name `Peg Recall` + subtitle `Memory Chess`, swap in this keyword
string instead (**100 / 100**), which re-adds the colour and dice terms lost from the subtitle:

```
color,dice,match,family,brain,kid,toddler,board,pair,concentration,pass,play,player,2,3,offline,game
```

## 4. Promotional text (170 max - editable any time, no review needed)

```
Free, and free of everything else too: no ads, no sign-in, no data collected. Just a wooden board of colored pegs, a die, and how much you can remember.
```
**152 / 170 characters.**

## 5. Description (4000 max)

```
Look at the board. Remember what you saw. Then find it again.

Peg Recall is the old wooden peg memory game, brought to your iPhone and iPad. Colored pegs stand on a round board. You get a few seconds to look, then every peg turns face-down. Roll the die, it lands on a color, and tap the peg you think is that color. Match it and the peg walks over to your tray. Miss, and it shows its color for a moment before flipping back - so everyone at the table learns something. When the board is empty, the biggest tray wins.

A game takes three or four minutes, and you are two taps from your first move.

PLAY ALONE OR TOGETHER
- Play the computer at three levels. Bunny forgets a lot and is kind to small players, Fox remembers about half the board, and Owl remembers nearly everything.
- Pass one device around for 2 or 3 players. No second device, no invitations, no waiting.
- Everyone picks an animal - fox, owl, bear, frog, bunny, cat - so nobody has to type a name.

A BOARD THAT GROWS WITH YOU
- Small (16 pegs) for little players, Classic (25), Big (36), and Huge (40) when you want a real test.
- Kid mode gives a longer look at the board and turns a tie into a shared win.
- Bonus turn on a match is on by default, straight from the original rulebook - and you can switch it off.

EASY ON THE EYES, AND ON EVERYONE
- Six colors chosen to stay apart for every common kind of color blindness, on warm wooden backgrounds instead of harsh white.
- Switch on Shapes on Pegs and each color carries its own shape - circle, triangle, square, star, heart, diamond - on the pegs and on the die, so the whole game can be played by shape.
- Light and dark, Dynamic Type, VoiceOver labels on every peg, and Reduce Motion support.
- Big, tap-only targets. No dragging, no long presses, nothing a four-year-old has to be taught.

QUIET BY DESIGN
- No advertising. Nothing to buy. No account, no sign-up, no email address.
- No data collected, and no analytics or third-party kits inside the app at all.
- Works entirely offline, on a plane, in a car, anywhere.
- Sound is two soft clips you can turn off in one tap, and the game stays silent when you launch it.

Built for iPhone and iPad. Rated 4+.

Questions or ideas: ravibitspilani@gmail.com
```
**2237 / 4000 characters.** First 170 characters (the part shown before "more") end inside the
second paragraph, so the hook and the "what is this" sentence are both above the fold.

## 6. What's New (version 1.0)

```
The first release of Peg Recall.

- Play the computer at three levels: Bunny, Fox, Owl.
- 2 and 3 player pass-and-play on one device.
- Four board sizes, from 16 pegs up to 40.
- Kid mode, bonus-turn rule toggle, animal avatars.
- Color-blind-friendly palette with optional shapes on pegs, dark mode, VoiceOver and Reduce Motion support.
- Free, offline, no ads, no accounts.
```

For a brand-new app ASC often labels this field "Description of what's new"; if it is not shown
for 1.0, keep this text for the 1.0.1 release notes.

## 7. Category

- **Primary:** Games > Board
- **Secondary:** Games > Family
- **Made for Kids (Kids Category):** No. (PLAN decision 8 - the Kids Category forbids
  third-party ad SDKs, and ads are a possible later step.)

## 8. Age rating questionnaire

Answer **None / No to every question**. Expected result: **4+**.

| Question group | Answer |
|---|---|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Prolonged Graphic or Sadistic Realistic Violence | None |
| Profanity or Crude Humor | None |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| Medical/Treatment Information | None |
| Alcohol, Tobacco, or Drug Use or References | None |
| Simulated Gambling | None |
| Sexual Content or Nudity | None |
| Graphic Sexual Content and Nudity | None |
| Contests | None |
| Unrestricted Web Access | No |
| Gambling (real money) | No |
| Frequent/Intense in-app controls or user-generated content | No |
| Made for Kids | No |
| Age Verification / Age Assurance prompts | None |

## 9. App Privacy

- **Privacy Policy URL:** `https://teja788.github.io/peg-recall/pegrecall/privacy.html` - must be live before you submit.
- **Data Collection:** select **"No, we do not collect data from this app"** -> the whole
  questionnaire collapses to **Data Not Collected**.
- **Tracking:** none. No ATT prompt, no `NSUserTrackingUsageDescription`.
- Remember to press **Publish** on the App Privacy section - an unpublished privacy card blocks
  the submission.

Backing facts: no accounts, no network calls, no analytics/crash/ads SDKs, settings and game
records stored only in the app's own on-device storage (`expo-sqlite/kv-store`).

## 10. Pricing and availability

- **Price:** Free ($0.00), no in-app purchases, no subscriptions.
- **Availability:** all countries and regions.
- **Pre-orders:** no.
- **Release:** manual release after approval (so you choose the launch moment).

## 11. App Review Information

- **Sign-in required:** unchecked. There is no login of any kind, so no demo account is needed.
- **Contact:** `{{FIRST NAME}}` / `{{LAST NAME}}` / `{{PHONE}}` / `ravibitspilani@gmail.com`
- **Attachment:** none needed.

**Review notes (paste as-is):**

```
Peg Recall is a single-binary offline memory game. There is no login, no account, no server and no network access of any kind - the app never makes a network request, and it collects no data (App Privacy: Data Not Collected). No demo account is required.

How to reach everything quickly from a cold launch:

1. Home screen - three mode cards, plus a board-size chip, a speaker toggle and a gear icon.
2. "Play vs Computer" -> a game against the computer opponent. Difficulty (Bunny / Fox / Owl) is chosen under the gear icon.
3. "2 Players" and "3 Players" -> pass-and-play on this one device; each seat takes a turn in sequence on the same screen. No second device and no connection are needed.
4. Gear icon -> settings: sound, shapes on pegs (a color-blind accessibility option that puts a distinct shape on each color), bonus-turn rule, kid mode, board size (16/25/36/40 pegs), computer difficulty and player avatars.

How a turn works: at the start of a game all pegs are shown face-up for a few seconds with a countdown ring, then they flip face-down. Tap the die to roll a color, then tap a peg. A match goes to your tray; a miss reveals the peg for about a second and flips it back. When the board is empty the player with the most pegs wins. A 25-peg game takes 3-4 minutes; choose the Small (16 peg) board for the fastest run-through.

The app is free, contains no advertising, no in-app purchases and no third-party SDKs. It is rated 4+ but is not submitted to the Kids Category. Universal build: iPhone and iPad, portrait.
```

## 12. Copyright

```
2026 {{YOUR NAME EXACTLY AS ON THE APPLE DEVELOPER ACCOUNT}}
```
Example format: `2026 Raviteja Endigeri`. No "(c)" symbol - App Store Connect adds it.

## 13. URLs

| Field | Value |
|---|---|
| Support URL (required) | `https://teja788.github.io/peg-recall/pegrecall/support.html` |
| Marketing URL (optional) | `https://teja788.github.io/peg-recall/pegrecall/index.html` |
| Privacy Policy URL (required) | `https://teja788.github.io/peg-recall/pegrecall/privacy.html` |

`https://teja788.github.io/peg-recall` = the same static host used for the previous app (PLAN item 14). Deploy the three
files in `store-assets/site/` there and check each URL loads over HTTPS on a phone before
submitting - Apple clicks them.

## 14. Version and build

- ASC version string must equal `expo.version` in `app.json`: **1.0.0** (ASC defaults to "1.0" -
  change it).
- Bundle ID: `com.raviteja.pegrecall`.
- Content rights: the app contains no third-party content - answer **No**.
- Encryption: `ITSAppUsesNonExemptEncryption: false` is already set in `app.json`, so no
  export-compliance questions should appear.
