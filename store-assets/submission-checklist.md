# Color Catch - App Store submission checklist

Ordered. The sequence matters: it comes from the `ship-ios-app` playbook (proven end to end on
Vivekananda Archive, July 2026) and each step exists because skipping it cost hours last time.
Commands are run from the repo root: `/Users/raviteja/Documents/Experiments/apps/memory_chess`.

Legend: **[you]** = must be done by the user (Apple ID, 2FA, payments, Finder dialogs).

---

## 0. Clocks already running

- [x] Apple Developer Program active - Team `9WU98AXT3W` (PLAN phase 0).
- [x] Expo account `seeker88`.
- [ ] Disk space: `df -h /System/Volumes/Data`. Simulator boots and EAS uploads need room; clear
      browser/npm/pip caches if tight (4 GB RAM, 2015 MacBook Air).
- [ ] **[you]** `npx eas-cli login` once, so later commands can run `--non-interactive`.

## 1. Web pages live before anything else

- [x] Deployed: `store-assets/site/index.html`, `privacy.html`, `support.html` are live at
      `https://teja788.github.io/peg-recall/` (verified with `curl -sI` on 2026-09-22, all three
      return `HTTP/2 200`). Note: the deployed copies predate the 2026-09-22 privacy-policy wording
      fix for the Expo update check (A5) — redeploy `store-assets/site/` before submitting so the
      live pages match the repo.
- [ ] Open all three URLs on a phone browser once more after redeploying, and check the links
      between them work. Apple clicks the privacy and support URLs during review; a 404 is a rejection.
- [x] Final URLs are in `store-assets/listing.md` section 13 (the doubled `peg-recall/pegrecall/`
      path in the Support/Marketing URLs was a bug, fixed 2026-09-22).

## 2. Repo prep before the first cloud build

- [ ] **`.easignore` at the repo root** (this directory - not inside a subfolder, where it is
      silently ignored). Start from `.gitignore`, keep `node_modules/`, `.expo/`, `dist/`,
      `web-build/`, `/ios`, `/android`, `.DS_Store`, and add web-only/dev clutter to slim the
      upload. Never exclude anything under `assets/` or `src/` - excluded-but-imported files fail
      the cloud bundle step with "Unable to resolve module".
- [ ] Icon check: `assets/icon.png` must be a real 1024x1024 full-bleed square, no transparency, no
      baked rounded corners. A placeholder icon is a guaranteed rejection.
- [ ] `app.json` sanity (already true today, re-verify): `expo.version` `1.0.0`,
      `ios.bundleIdentifier` `com.raviteja.pegrecall`, `ios.supportsTablet: true`,
      `ios.infoPlist.ITSAppUsesNonExemptEncryption: false`, `orientation: portrait`.
- [ ] `npx expo-doctor` - warnings in the build log are non-fatal; clean up with
      `npx expo install --fix` if it complains about versions.
- [ ] `npx eas-cli init --non-interactive --force` - links the project and writes `projectId`
      into `app.json`.

## 3. OTA updates - wire in BEFORE the store build

- [ ] `expo-updates` is already a dependency. Run `npx eas-cli update:configure` so the
      production/preview **channels** exist and the store binary ships update-aware from day one.
- [ ] Confirm `eas.json` build profiles carry `"channel": "production"` (and `"preview"` for
      TestFlight-only builds).
- [ ] Note for later: JS/content-only fixes ship in minutes with
      `eas-cli update --channel production --message "..."`, no review - but only to installs on the
      same `version`.

## 4. First EAS build

- [ ] **[you]** Run the first build in your own terminal - Apple ID password and 2FA prompts appear:
      `npx eas-cli build --platform ios --profile production`.
- [ ] Monitor with a background poll of `npx eas-cli build:list --json --non-interactive`
      (IN_QUEUE -> IN_PROGRESS -> FINISHED, ~5-8 min).
- [ ] If it errors: `logFiles[0]` from `build:list` is a **brotli** file (starts `8bff...`) -
      decompress with node `zlib.brotliDecompressSync`, grep the `EAGER_BUNDLE` phase for the real
      JS error. Signed URLs expire in 15 minutes; refetch from `build:list`.

## 5. Screenshots

- [ ] **OPEN ITEM (2026-09-22):** `store-assets/screenshots/iphone-6.5/` has only 2 of the 6 required
      shots (`01-home.png`, `02-reveal.png`) and there is no `iphone-6.5` full set beyond those two.
      There is no iPad screenshot set at all - `store-assets/screenshots/` has no 12.9"/2048×2732
      folder. Both must be captured before submission; App Store Connect requires the full 6.5"
      iPhone set and, since this app supports iPad, an iPad set too.
- [ ] Follow `store-assets/screenshots-plan.md`: six shots, 6.5" iPhone **1284 x 2778** and 12.9"
      iPad **2048 x 2732**, portrait.
- [ ] Capture via simulator + `simctl openurl` deep links (`exp://.../--/game?mode=ai|2p|3p`,
      `/settings`) + `idb ui tap` for one-off taps. The iOS Simulator MCP panel crashes on macOS 12
      - don't retry it.
- [ ] Copy finals to `~/Downloads/pegrecall-screenshots/` immediately - scratchpad `/tmp` is purged.

## 6. Create the App Store Connect record

- [x] The ASC app record already exists - id `6813625311`, on file in `eas.json` under
      `submit.production.ios.ascAppId` (welded to `com.raviteja.pegrecall`, PLAN decision 10).
- [ ] **[you]** `npx eas-cli submit --platform ios --latest` - uploads the binary to that existing
      record. Apple then processes it for 15-30 minutes until TestFlight shows "Ready to Submit".
- [ ] While waiting: install the TestFlight build on a device if one is available, or smoke-test the
      simulator build once more (all three modes, settings toggles, dark mode, a full game to the
      confetti screen).

## 7. Fill the listing (App Store Connect web UI)

Copy comes from `store-assets/listing.md`. **Save section by section and reload the page to verify
values persisted** - ASC silently discards programmatic input and a later Save can wipe fields that
only look filled (it once wiped hand-typed contact info).

- [ ] **App Information:** name `Color Catch - Memory Chess` (checked available 2026-09-19), subtitle `Dice Match Board Game, Family`,
      primary category **Games > Board**, secondary **Games > Family**, content rights = no
      third-party content, Made for Kids = **No**.
- [ ] **Age rating questionnaire:** every answer None/No -> result **4+**.
- [ ] **Version page (1.0.0 - change it, ASC defaults to "1.0"):** promotional text, description,
      keyword field (98/100 string), support URL, marketing URL, copyright.
- [ ] **Screenshots:** drag the two sets in from Finder (native file dialog - user action).
- [ ] **App Privacy:** privacy policy URL, "we do not collect data" -> **Data Not Collected**, then
      press **Publish**. An unpublished privacy card blocks submission.
- [ ] **Pricing:** Free ($0.00) -> Confirm. No in-app purchases.
- [ ] **Availability:** all countries and regions -> Confirm.
- [ ] **App Review Information:** paste the review notes from `listing.md` section 11, fill contact
      name/phone/email (`ravibitspilani@gmail.com`), and **uncheck "Sign-in required"** - there is no
      login.
- [ ] **Release option:** Manually release this version after approval.
- [ ] Reload every page one final time and confirm each field really stuck.

## 8. Submit

- [ ] **[you]** "Add for Review" -> "Submit for Review". Get explicit go-ahead before this click.
- [ ] Expect 24-48 hours for review. "Publish today" means "submit today".

## 9. If Apple asks about the business model (Guideline 2.1 / 3.1.1 info request)

Free apps regularly get an automated "how does this app make money?" question. Boilerplate answer:

```
Color Catch 1.0 is completely free. It contains no advertising, no in-app purchases, no
subscriptions, no paid unlocks and no external payment links. There is no revenue associated
with this version.

The app is a self-contained offline board game. It has no accounts, no login, no server
component, and no third-party SDKs of any kind (no analytics, no ads, no attribution). Playing
the game makes no network requests; on launch the app may contact Expo's update service
(u.expo.dev) to check for an app update, a request that carries no personal data and no
gameplay data. It collects no data from users, which is why App Privacy is declared as "Data Not
Collected".

The app is published as a personal project. If a future version introduces advertising or an
in-app purchase, the App Privacy details and the published privacy policy will be updated before
that version is submitted.
```

- [ ] Keep the answer factual - do not promise a monetization plan that does not exist yet.

## 10. After approval

- [ ] Release the version manually when you are ready.
- [ ] Check the live product page on a phone: screenshots in the right order, privacy and support
      links working, subtitle not truncated.
- [ ] Record the ASC app ID next to the Team ID in PLAN.md for the next update.
- [ ] Post-launch fixes: JS/content -> `eas update` (minutes, no review). Native or version bump ->
      edit `version` in `app.json` -> `eas build` -> `eas submit` -> new ASC version + release notes.
- [ ] If app behaviour ever changes (ads, purchases, online play), update the privacy and support
      pages **before** the new build is submitted.
