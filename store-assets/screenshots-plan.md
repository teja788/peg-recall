# Peg Recall - screenshot plan (v1.0)

Six screenshots, captured twice: once on a 6.5" iPhone and once on a 12.9" iPad. Same story in
the same order on both devices, so the App Store page reads consistently when a shopper switches
the device tab.

| Set | Required size | How it is produced on this Mac |
|---|---|---|
| 6.5" iPhone | **1284 x 2778** portrait | iPhone 14 Pro Max simulator (iOS 16.2) captures 1290 x 2796, then `sips -z 2778 1284` |
| 12.9" iPad Pro | **2048 x 2732** portrait | iPad Pro 12.9" simulator captures 2048 x 2732 natively |

The app is portrait only, so every shot is portrait. Upload at most 10 per set; six is enough and
Apple shows the first three in search results - shots 1-3 carry the pitch on their own.

## Reaching each state

Routes: `/` (home), `/game?mode=ai|2p|3p`, `/settings`.

- In Expo Go: `xcrun simctl openurl booted "exp://127.0.0.1:8081/--/game?mode=3p"`
- In a standalone / TestFlight build: `xcrun simctl openurl booted "pegrecall://game?mode=3p"`

`mode` is the only route parameter. Board size, computer difficulty, shapes-on-pegs, kid mode and
avatars live in the persisted settings store (`expo-sqlite/kv-store`, key `pegrecall.settings.v1`),
not in the URL - set them once from `/settings` (a handful of `idb ui tap` taps) and they stick
across relaunches for the whole capture session. Because the store is a SQLite database rather
than an AsyncStorage JSON blob, do not try to seed it by writing a file; tap it in.

Deep links land straight on a fresh game, so each shot below starts from a clean state and needs
only a few taps of play to reach the moment described.

---

## Shot 1 - Home, three ways to play

- **Route:** `/`
- **State:** home screen, board-size chip showing `Classic · 5×5`, speaker on, three illustrated
  mode cards visible (Play vs Computer, 2 Players, 3 Players). Light theme.
- **Caption:** "Three ways to play"
- **Why:** first impression - names the product, shows it is a game for one, two or three people,
  and shows how few controls there are.

## Shot 2 - The look, before the pegs flip

- **Route:** `/game?mode=ai` (capture during the reveal window - 6 s on Classic, 9 s on Huge;
  switch kid mode on in `/settings` first to get 1.5x longer and a calmer capture window)
- **State:** every peg face-up in full colour on the round wooden board, shrinking countdown ring
  running, trays at the top still empty. This is the prettiest frame in the app.
- **Caption:** "Look. Remember. Go."
- **Why:** the hero shot. Sells the wooden-toy art and the whole premise in one image.

## Shot 3 - Roll the die, find the colour

- **Route:** `/game?mode=ai` (let the reveal finish, tap the die, capture while the colour is
  showing and the board is face-down)
- **State:** board all face-down, die showing one clear colour (blue #0072B2 or orange #E69F00 -
  avoid yellow, it photographs weakly), turn banner reading the human player's turn, one or two
  pegs already in each tray so the game looks underway.
- **Caption:** "Roll a color, find it"
- **Why:** explains the single rule that makes the game different from plain pairs-matching.

## Shot 4 - Shapes on, and a match landing

- **Route:** `/settings` -> switch on "Shapes on pegs" -> `/game?mode=ai`
- **State:** shapes visible on the peg caps and on the die face, mid-match frame with a peg flying
  toward the tray (or just landed), player tray clearly ahead of the Owl opponent's tray. Set
  difficulty to Owl in `/settings` so the opponent label reads Owl.
- **Caption:** "Shapes for every eye"
- **Why:** the accessibility differentiator, shown rather than claimed - and it doubles as the
  "you score points" shot.

## Shot 5 - Pass and play, three trays

- **Route:** `/game?mode=3p`
- **State:** three player trays across the top (fox, owl, bear avatars), the active tray glowing,
  turn banner sliding in with the active player's name, mid-game board with roughly half the pegs
  gone. Use Big (6x6) on iPhone and Huge (5x8) on iPad.
- **Caption:** "Pass and play together"
- **Why:** the family/table-game promise, on one device, no accounts, no second phone.

## Shot 6 - Win screen, and the quiet promise

- **Route:** `/game?mode=ai`, played to the end (Small 4x4 board makes this quick - set it in
  `/settings` first, then switch back to Classic afterwards)
- **State:** game-over scoreboard with confetti, winner's tray full, Rematch and Home buttons
  visible. Capture in **dark mode** (simulator: Settings > Developer > Dark Appearance) so the set
  ends by showing the app has a night look.
- **Caption:** "Free. Offline. No ads."
- **Why:** closes on the payoff plus the trust message that matters most to parents.

---

## iPad differences

- Same six shots, same order, same captions.
- Use the larger boards (Big or Huge) for shots 2-5: an iPad screenshot of a 4x4 board looks empty.
- Check the board and trays are centred with comfortable margins and that pegs are capped at the
  96 pt maximum, not stretched.
- iPad must not require full screen (Stage Manager) - worth an eyeball check while capturing.

## Caption overlay treatment

- Same template on all twelve images: caption in the top ~18% of the frame, screenshot below.
- Background band `#F6F1E8` light / `#1E1B18` dark, text `#2B2622` / `#EDE6DA`, accent `#0072B2`.
- One short line each, 3-5 words, sentence case, no exclamation marks, no fake device frames.
- Keep the caption band out of the way of the countdown ring and the trays.

## Capture recipe (from the ship-ios-app playbook)

1. Close heavy apps first - this Mac has 4 GB RAM and the simulator takes 5-10 minutes to boot.
2. Run Metro with `--no-dev --minify` so no dev banner appears; the first open can auto-reload and
   look like a crash - reopen the `exp://` URL.
3. Clean the status bar: `xcrun simctl status_bar booted override --batteryState charged
   --batteryLevel 100 --cellularBars 4 --wifiBars 3` (the time override is flaky on iOS 16.2).
4. Navigate with `simctl openurl` deep links; one-off taps with
   `idb ui tap --udid <udid> X Y` (the iOS Simulator MCP panel crashes on macOS 12 - don't retry it).
5. Capture: `xcrun simctl io booted screenshot shot-N.png`, then `sips -z 2778 1284 shot-N.png`
   for the iPhone set.
6. **Copy finals to `~/Downloads/pegrecall-screenshots/` immediately** - scratchpad `/tmp` files get
   purged. The ASC uploader is a native file dialog, so the user drags them in from Finder.
7. Name files `iphone65-1-home.png` ... `ipad129-6-win.png` so the upload order is obvious.
