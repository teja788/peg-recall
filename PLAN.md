# Peg Memory Game — iPhone + iPad Plan

App name: **Color Catch** (App Store subtitle: "Memory Chess"). Store name "Color Catch - Memory Chess" (26 chars) - name confirmed available in App Store Connect 2026-09-19, so this is the one we ship. Fallback (only if ASC later pushes back on the compound name): name "Color Catch", subtitle "Memory Chess", alternate keyword string in `store-assets/listing.md` section 3.
Date: 2026-09-18. Status: decisions made (section 9), Phase 1 in progress.

---

## 1. The game (as shipped in v1)

- A grid of face-down pegs. 6 colors. Pegs shown face-up for a few seconds at start, then flipped.
- On your turn: tap the die → it shows a color → tap one peg.
  - Match: the peg flies to your tray (+1). Miss: peg shows its color for ~1 s, flips back. Everyone saw it.
- Board empty → most pegs wins.
- Die only shows colors that still exist on the board (auto reroll), so the game always ends.
- Modes in v1: **vs Computer** (Easy / Medium / Hard), **2 Players**, **3 Players** (pass-and-play, one device).
- Online play: phase 2 (section 7).

Board sizes:

| Name | Grid | Pegs | Who |
|---|---|---|---|
| Small | 4×4 | 16 | kids default |
| Classic | 5×5 | 25 | default |
| Big | 6×6 | 36 | adults |
| Huge | 5×8 (tall) | 40 | adults, iPad best |

## 2. Flow (target: 2 taps from launch to first move)

```
Home ──► [Play vs Computer] ──► Game (reveal → die → peg)
     ├─► [2 Players]        ──► Game
     ├─► [3 Players]        ──► Game
     └─► gear: sound, shapes-on-pegs, board size, difficulty, stats
```

Home screen shows only: app name, three big illustrated mode cards, a board-size chip (remembers last choice), speaker toggle, gear.

**Board is ROUND** (decided 2026-09-18): a circular wooden board like the physical toy, pegs packed in a hex/circular cluster (positions = hex-packed points nearest the centre, so any peg count 16/25/36/40 forms a disc). **Peg style follows the Toy Theater reference (decided 2026-09-18):** the board is viewed from a 3/4 angle (drawn as an ellipse, y-scale ≈ 0.55–0.6, with a visible wooden side/edge), pegs are upright wooden cylinders with a domed coloured cap ("peg doll"), cap and body turn plain wood when hidden, and pegs further back overlap pegs in front (z-sort by y). The die is a wooden cube with coloured dots. Captured pegs stand in the player's tray. Rich animation is a priority: reanimated 4 for flips/fly-to-tray, Moti for declarative micro-animations, react-native-confetti-cannon on win, die tumble with rotation + scale, subtle board tilt on tap. Prefer open-source libs over hand-rolled code.

In-game screen (portrait only, never scrolls):

```
┌──────────────────────────────┐
│ 🦊 Fox  3   🦉 Owl  2   🐻 1 │  ← trays, active one glows
│      "Owl's turn"            │  ← banner slides on change
│                              │
│   ○ ○ ○ ○ ○                  │
│   ○ ○ ○ ○ ○                  │
│   ○ ○ ○ ○ ○   (board)        │
│   ○ ○ ○ ○ ○                  │
│   ○ ○ ○ ○ ○                  │
│                              │
│          [ 🎲 die ]          │  ← tap to roll; shows color
│  ⏸                           │
└──────────────────────────────┘
```

Players are animal avatars (Fox, Owl, Bear, Frog…), tap the avatar to cycle. No keyboard, no names required.
iPad "Table Mode" (later): banners rotated toward each player around the board.

Game state machine and timings:

| State | Timing |
|---|---|
| Reveal | 16 pegs: 4 s · 25: 6 s · 36: 8 s · 40: 9 s (kid mode ×1.5). Shrinking ring countdown. |
| Flip-down wave | 250 ms per peg, 12 ms stagger |
| Die roll | 600 ms tumble (+300 ms if reroll) |
| AI pick | 700–1300 ms "thinking" |
| Match | flip 250 → chime 200 → fly to tray 400 |
| Miss | flip 250 → hold 900 → flip back 250 |
| Game over | confetti + scoreboard, Rematch / Home |

A 25-peg two-player game runs about 3–4 minutes.

## 3. Computer opponent

"Belief memory": AI records each peg it has seen with the turn it was seen. On its turn with die color c, each remembered peg of color c is recalled with probability `p0 × d^turnsSince`. Forgotten entries are deleted (no sudden re-remembering). Occasional "slip" to an adjacent peg so it feels human.

| Parameter | Easy (Bunny) | Medium (Fox) | Hard (Owl) |
|---|---|---|---|
| Memorizes initial reveal, per peg | 0.15 | 0.30 | 0.55 |
| Base recall p0 | 0.55 | 0.72 | 0.92 |
| Decay d per turn | 0.85 | 0.93 | 0.975 |
| Max pegs tracked | 4 | 10 | unlimited |
| Slip to adjacent peg | 0.15 | 0.06 | 0.02 |
| No memory of that color | any face-down peg | unseen pegs (30% may retry known-wrong) | unseen pegs only |

## 4. Look and feel ("easy on the eyes")

Peg colors: Okabe-Ito palette, distinguishable under all common color-blindness types. Optional shape on each peg and die face (toggle, auto-on when iOS "Differentiate Without Color" is set).

| Peg | Hex | Shape |
|---|---|---|
| Orange | #E69F00 | ● |
| Sky blue | #56B4E9 | ▲ |
| Blue | #0072B2 | ■ |
| Green | #009E73 | ★ |
| Yellow | #F0E442 (rim #B8A800) | ♥ |
| Purple | #CC79A7 | ◆ |

Backgrounds: warm neutrals, no pure white/black.

| Role | Light | Dark |
|---|---|---|
| Page | #F6F1E8 | #1E1B18 |
| Board surface | #FFFDF8 | #2A2622 |
| Face-down peg | #D9D0C3 | #3A342E |
| Text | #2B2622 | #EDE6DA |
| Accent | #0072B2 | #56B4E9 |

Touch targets: pegs ≥ 52 pt on iPhone (kids ≥ 56), capped at 96 pt on iPad. 40-peg board is laid out 5 wide × 8 tall so it fits iPhone portrait. Tap only: no drag, no long-press, no double-tap. Ignore taps during animations.

Sound: nothing on launch, soft short clips (<300 ms), a "flip" tick and a "match" chime, silence on a miss. Speaker toggle on home and pause. Haptics: light on flip, success on match (iPhone only).

Accessibility: Dynamic Type on text, VoiceOver labels per peg ("row 2 column 3, hidden"), Reduce Motion → crossfade instead of 3D flip.

## 5. Tech stack (fits this Mac: macOS 12, Xcode 14.2, 4 GB RAM)

| Layer | Choice | Why |
|---|---|---|
| Framework | Expo SDK 55, React Native 0.83, expo-router | Only current SDK that runs in Expo Go on the iOS 16.2 simulator you have. SDK 56+ needs iOS 16.4. |
| Builds | EAS Build cloud + expo-updates (OTA) | No local Xcode build needed. Proven path (Vivekananda Archive, July 2026). |
| Animation | react-native-reanimated 4 + gesture-handler, moti, react-native-confetti-cannon | UI-thread flips, declarative micro-animations, confetti. All in Expo Go. Skia reserved for later texture/shader polish. |
| Sound / haptics | expo-audio, expo-haptics | expo-av is removed in SDK 55. |
| State / save | zustand + expo-sqlite/kv-store | Sync, in Expo Go. MMKV is not. |
| Online (phase 2) | Supabase (Postgres + Realtime + RLS) | Free tier, anonymous sign-in, board hidden server-side via RLS + a reveal RPC. |
| Skipped | Skia, Game Center turn-based (no maintained RN wrapper, board leaks), Bluetooth/Wi-Fi local play | |

Deadline to note: Apple requires iOS 27 SDK from April 2027. Ship v1 on SDK 55, then upgrade in Q1 2027 (after which the 16.2 simulator is dead; test via TestFlight on a real device).

Targets: < 25 MB download, < 2 s cold start, < 100 ms tap-to-flip.

## 6. Build phases and time estimates

Estimates assume Claude writes the code and you test on the simulator.

| Phase | Deliverable | Time |
|---|---|---|
| 0. Clocks | Already have: Apple Developer account (Team 9WU98AXT3W), Expo account seeker88. Repo github.com/teja788/peg-recall (public, needed for free GitHub Pages). Pages: https://teja788.github.io/peg-recall/ → privacy.html + support.html served from /docs | you: 10 min |
| 1. Core | ✅ 2026-09-18: engine (40 tests), round layout (13 tests), art (peg dolls, perspective board, wooden die, icon, sounds), screens. Integration of round board + animations in progress | done |
| 2. Modes | ✅ vs Computer (Bunny/Fox/Owl), 2P, 3P, avatars, 4 board sizes — built with Phase 1 | done |
| 3. Polish | Palette, dark mode, sound, haptics, Reduce Motion, VoiceOver done with Phase 1. Game-screen composition + iPad chrome scaling in progress (2026-09-18) | in progress |
| 4. Persist | ✅ Settings + rules toggles persisted (sqlite kv-store). Stats screen still TODO | mostly done |
| 5. Ship prep | ✅ Icon, splash, privacy + support pages live at https://teja788.github.io/peg-recall/ (verified `curl -sI` 200 on 2026-09-22 — redeploy after the 2026-09-22 privacy-copy fix, see submission-checklist.md #1), listing copy (store-assets/), EAS linked (@seeker88/pegrecall), eas.json (ASC app id 6813625311 already on record), .easignore, OTA channels. ✅ Runs in Expo Go 55 on the iOS 16.2 simulator (home + game verified 2026-09-18). TODO: store screenshots (only 2 of 6 required iPhone 6.5" shots exist, no iPad 2048×2732 set — see submission-checklist.md open item), first EAS build (user runs it), TestFlight | mostly done |
| 6. Submit | EAS build → eas submit → review (24–48 h) | 1 h + wait |

Realistic: playable on simulator in 2 days, submitted within a week of enrollment.

## 7. Phase 2: online play (after v1 ships)

- Async turn-based (like Words With Friends), not real-time. Fits kids and adults, tolerant of bad networks.
- Supabase: `matches` table with board stored in a column no client can read (RLS), `reveal(match_id, cell)` as a SECURITY DEFINER function that returns only the tapped cell's color and applies the rule. Realtime channel pushes turn changes. Anonymous auth, invite via share link / 6-letter code.
- Needs a parental gate before any online feature if you opt into Kids Category. No chat.
- Push notification "your turn" via expo-notifications.

Also later: solo "clear the board in fewest rolls", 60-second blitz, daily challenge (seeded board + die sequence, shareable score), Table Mode on iPad.

## 8. App Store rules that shape decisions

- Rate 4+. Ship with zero third-party SDKs (no analytics, no ads) so Kids Category stays possible.
- Privacy policy URL required even with no data collected. Fill App Privacy as "Data Not Collected".
- Real 1024×1024 icon, no placeholder. `ITSAppUsesNonExemptEncryption: false`.
- iPad: support all size classes, don't require full screen (Stage Manager).

## 9. Decisions (made 2026-09-18)

Rules
1. Bonus turn on a correct pick: **ON (physical rulebook)**. Toggle in settings to turn off.
2. Dead color on the die (no pegs of that color left): **auto-reroll** vs skip turn vs wildcard.
3. Tie at the end: **sudden-death mini-board** vs shared win. Kid mode: shared win.
4. Miss: peg auto-flips after ~1 s, or **stays up until the next tap** (kids look away).
5. Extra win conditions ("first to 4 of one color", "one of each color") as toggles in v1 or later? **Later.**

Product
6. Difficulty names: **Bunny / Fox / Owl**.
7. Monetization: **free for v1**. Ads + paid unlock come later. Consequence: do NOT opt into Kids Category (it forbids third-party ad SDKs); ship 4+ rating. Plan an ad-free "unlock" IAP behind a parental gate when ads arrive.
8. Kids Category: **no**. 4+ rating only.
9. **iPhone + iPad together in v1.**
10. App name: **Color Catch**, subtitle "Memory Chess". (Renamed from "Peg Recall" 2026-09-19; bundle id, slug and the github.io/peg-recall privacy URL deliberately keep the old identifier - the ASC app record 6813625311 is welded to `com.raviteja.pegrecall`.)

Assets
11. Do you want me to generate the art (SVG pegs, avatars, icon) or will you supply it? **I generate.**
12. Language: English only for v1? **Yes.**

Existing infra
13. Do you already have an Apple Developer account and Expo account from the July app? **Assume yes.**
14. Privacy/support web pages: reuse the same site as the previous app? **Assume yes.**
