# Code audit — Color Catch (2026-09-22)

Baseline at audit time: `tsc` clean, 53 tests pass, no secrets committed, AI verified not to read hidden state, expo-audio / pause / timer code verified correct.

Tick an item only after the fix is verified (typecheck + tests + manual check where noted).

## A. Ship-blockers

- [x] A1 Sudden death reuses stale AI brains — `src/store/game.ts:274`. Rebuild each AI with `createAi()` before `observeOpening`.
- [x] A2 `observeOpening` passes `turn: 0` — `src/store/game.ts:214`. Pass `state.turn` (Fox/Bunny near-blind in sudden death).
- [x] A3 expo-audio plugin injects mic usage string + `UIBackgroundModes: audio` — `app.json` plugins. Configure `microphonePermission:false`, `recordAudioAndroid:false`, `enableBackgroundPlayback:false`; delete duplicated `android.permissions`.
- [x] A4 Support/Marketing URLs have doubled `peg-recall/pegrecall/` path — `store-assets/listing.md:217-218`.
- [x] A5 Privacy policy + review notes claim "no network requests" while expo-updates is configured — `docs/privacy.html`, `store-assets/site/privacy.html`, `store-assets/listing.md`, `submission-checklist.md`. Document the update check.
- [x] A6 expo-doctor: `newArchEnabled` invalid in SDK 55 schema; `expo-asset` missing peer dep; SDK 57 duplicates of expo-asset/expo-font/expo-constants nested in node_modules; `expo-updates` / `react-native-web` ranges drift.

## B. Bugs

- [x] B1 Die reroll tumble unbounded (up to 64 × 300 ms) — `src/store/game.ts:269`. Cap animated rerolls.
- [x] B2 Restart-from-pause during reveal gives half-drained countdown — `src/ui/RevealCountdown.tsx:46`, `app/game.tsx:359`. Key the countdown per board.
- [x] B3 Double tap on Home card pushes two game screens — `app/index.tsx:50`. Navigation latch.
- [x] B4 Sound toggle replays win chime / flip haptics — `src/ui/feedback.ts:48`, `app/game.tsx:123-137`. Make `play` stable.
- [x] B5 No AppState / BackHandler handling — `app/game.tsx`. Pause on background; Android back opens pause menu.
- [x] B6 Captured pegs written into AI memory instead of removed — `src/store/game.ts:204`. Pass `captured`.
- [x] B7 Wide-short window renders blank board — `app/game.tsx:224`, `src/ui/Board.tsx:243`. Floor the board width.
- [x] B8 `RESTART` while paused leaves `paused:true` — `src/store/game.ts:254-264`.
- [x] B9 `later()` during pause computes `due` from wrong epoch — `src/store/game.ts:63-68`.
- [x] B10 `Date.now()` read twice; explicit seed shared between board and AI rng — `src/store/game.ts:232`.
- [x] B11 `ringRadiusFor` places a trailing 1-peg ring at radius 0 (pegs coincide for n=2,8,20,38) — `src/layout/roundLayout.ts:50-69`.
- [x] B12 Die art is 0.986 of width, container assumes 0.9 — `src/ui/Die.tsx:26`, `perspectiveModel.ts:987`. Export the ratio.
- [x] B13 Status bar `auto` over dark backdrop — `app/_layout.tsx:27`. Use `light`.
- [x] B14 Pause/game-over scrim does not cover status-bar strip — `app/game.tsx:279,436`.

## C. AI quality

- [x] C1 `evict` tie-break by index biases opening memory to high indices — `src/engine/ai.ts:66-79`. Random tie-break; update `ai.test.ts:49`.
- [x] C2 Slip uses grid adjacency on a ring-rendered board — `src/engine/ai.ts:208`. Use `roundLayout.neighbours()`.
- [x] C3 Decay is per-pick not per-round; difficulty varies with player count / board size — `src/engine/ai.ts:192`. Decide and document.

## D. Accessibility / rendering

- [x] D1 Glyph ink contrast fails on orange 2.25:1, sky 2.31:1, purple 3.06:1 — `src/ui/art/palette.ts:34-41`. Dark ink.
- [x] D2 Two `PegDoll`s mounted per peg permanently (81 SVG surfaces / ~1,880 nodes at 40 pegs) — `src/ui/Peg.tsx:73-78`.
- [x] D3 Per-doll gradient `Defs` (≈200 gradients for 14 distinct) — `pegDoll.tsx:56`. Partial: scenes memoised per (color, faceUp, theme), ids keyed by that triple; full hoist into one board-level `<Svg>` is a ~1-day follow-up touching Board.tsx/BoardMini.tsx.
- [x] D4 Die top glyph scaled non-uniformly — `perspectiveModel.ts:888-892`.
- [x] D5 `allowFontScaling={false}` on meaningful text; tray row cannot wrap — `src/ui/controls.tsx`, `PlayerTray.tsx`, `app/game.tsx:307`.
- [x] D6 `showShapes` off by default; die is colour-only — `src/store/settings.ts:22`. Decide.

## E. Performance / React hygiene

- [x] E1 Captured-peg row keys by position; whole row re-animates on capture — `src/ui/PlayerTray.tsx:51-57`.
- [x] E2 Dev diagnostic string built every render in release — `src/ui/Board.tsx:223-239`.
- [x] E3 `wasReveal.current` mutated during render — `src/ui/Board.tsx:189-191`.
- [x] E4 `useSettings()` whole-store subscription — `app/settings.tsx:26`.

## F. Dead code / consistency

- [x] F1 Abandoned flat-art stack: `roundBoard.tsx`, `peg3d.tsx`, `dieCube.tsx`, `dieFace.tsx`, `renderPrims.tsx` (+ unused exports `pegTopDrawing`, `Shape`, `AVATAR_IDS`, `AVATAR_ACCENT`, `BOARD_EDGE_RATIO`, `PEG_DOLL_ANCHOR`, `PEG_DOLL_CAP_TOP_Y`). `index.ts:22` "icon" claim is false.
- [x] F2 Engine/store dead code: `cycleBoardSize`, `reset` (settings), `hapticMiss`, `aiParams` export, `boardSpec`, `activeSeats`, `hiddenPegsByColor` re-export, `ai`/`rng` namespace exports, `Rules.deadColor`, `mode` field in game store.
- [x] F3 Theme dead code: `PEG_SHAPES`, `shapeInkFor`, `layout` token block — `src/theme/tokens.ts`. Tokens duplicate `PEG_HEX`/`PEG_RIM`; import instead.
- [x] F4 Stray hard-coded hexes — `svgModel.ts:418`, `Peg.tsx:298`, `perspectiveModel.ts:777,786,910`. `WHEEL` duplicates `PEG_COLORS`.
- [x] F5 `package.json` name `pegrecall`; README title "(Memory Chess)". Rename package to `color-catch`.
- [x] F6 `.easignore` missing `/ios`, `/android`, `.DS_Store`.
- [x] F7 Submission checklist vs reality: pages live? (`PLAN.md:144` vs `submission-checklist.md:21-24`); ASC record already exists (`:75`); only 2 of 6 iPhone screenshots, no iPad set. Docs reconciled; pages verified live over HTTPS (redeploy needed for new privacy wording). OPEN: screenshots still 2 of 6, no iPad set.
- [x] F8 `.claude/settings.json` tracked despite `.gitignore` rule. `expo-system-ui` kept: its plugin writes `UIUserInterfaceStyle` for `userInterfaceStyle: automatic`. `.claude/settings.json` left tracked (benign).

## G. Test gaps

Result: 83 tests (was 53), `tsc` clean, expo-doctor 19/20 (Xcode host version only).

- [x] G1 `src/store/game.ts` and `settings.ts` have zero tests. Add: SD brain reset + turn, captured flag, reroll cap, restart-while-paused, pause/resume timers, `sanitize` on bad JSON.
- [x] G2 `roundLayout` for counts outside `RING_PLANS` (min inter-peg distance > 0).
- [x] G3 SVG node-count budget test (docblock claims one exists).
