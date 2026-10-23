# Expo SDK upgrade research: 55 to 58 (Color Catch)

Researched 2026-10-23. Read-only: nothing in the repo was changed. This file was meant for `reports/expo-sdk-upgrade-research.md`.

## Summary

1. **Target SDK 58, and go straight there from 55.** SDK 58 is the first SDK where the UIScene lifecycle is on by default (prebuild generates `SceneDelegate.swift`). SDK 56 has no scene support at all. SDK 57 has it only as an opt-in (`expo@57.0.23`+), and that opt-in still has an open window bug (#50363).
2. **Apple's deadline is "April 2027", with no exact day.** From then on, iPhone and iPad uploads must be built with the iOS 27 SDK (Apple Developer News, Sep 9 2026). Xcode 26 builds stay valid until then, so nothing has to ship this month.
3. **Little code has to change.** The app needs one import moved (`usePreventRemove` now comes from `expo-router`), the `@react-navigation/native` dependency dropped, the EAS image changed to `sdk-58`, `web.output` set explicitly, and `expo-iap` bumped from 5.8.2 to 6.1.1. Everything else is version bumps from `npx expo install --fix`.
4. **The two Xcode 27 plugins can go.** SDK 56+ raises the app and expo-router minimum to iOS 16.4, so the expo-router guard does nothing any more. The pods plugin is probably a no-op too. Delete both, and keep the pods one only if the first Xcode 27.1 build log shows a pod target below iOS 15.
5. **When:** start as its own branch once 1.2.1 is settled, ideally in **November 2026**, and ship by **January 2027** at the latest, which leaves a three-month buffer. Expect about one working day of hands-on work on this Mac, plus EAS, TestFlight and review wait times. The main risks are iPad layout under iOS 27 window resizing, the purchase flow under the new scene lifecycle, and the Hermes and Reanimated changes.

---

## 1. Which SDK adopts UIScene

| SDK | Scene lifecycle | Notes |
|---|---|---|
| 55 (current) | None | Built with Xcode 27, the app dies at launch with "UIScene life cycle is required for apps built with this SDK" (TN3187). This is what caused the 2.1(a) rejection. |
| 56 | None | Issue [#46664](https://github.com/expo/expo/issues/46664) reproduces the launch crash on a blank SDK 56 app. Expo's fix was released for SDK 57 only. SDK 56 also needs Xcode 26.4 or newer. |
| 57 | **Opt-in** from `expo@57.0.23` | Set `ios.enableSceneSupport: true` in `expo-build-properties` (57.0.20 or newer). This makes `AppDelegate` conform to `ExpoReactNativeFactoryProvider` and points the scene manifest at `EXExpoAppSceneDelegate`. ([expo.fyi/ios-scene-lifecycle](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md), [#46664 comment](https://github.com/expo/expo/issues/46664)) |
| **58** | **On by default, with no opt-out** | `prebuild` generates `SceneDelegate.swift` and `UIApplicationSceneManifest`, and the scene delegate creates the window. Expo forwards URL, user-activity, lifecycle and quick-action events to `ExpoAppDelegate` subscribers. `enableSceneSupport` is ignored, and prebuild warns about it. ([SDK 58 changelog](https://expo.dev/changelog/sdk-58), [How to upgrade to SDK 58](https://expo.dev/blog/how-to-upgrade-to-sdk-58)) |

**Known issues** (GitHub expo/expo, checked 2026-10-23):
- [#50363](https://github.com/expo/expo/issues/50363) (open): on the SDK 57 opt-in, `currentViewController()` still uses `UIApplication.shared.keyWindow`, so system sheets can fail to present. It is fixed in `expo-modules-core@58.0.3`, and the backport to 57 is not merged. **This is the main reason to skip 57.**
- [#50230](https://github.com/expo/expo/issues/50230) (closed): warm deep links did not reach JS under the scene lifecycle. Fixed during the SDK 58 beta.
- [#49915](https://github.com/expo/expo/issues/49915) / [#51340](https://github.com/expo/expo/issues/51340): `expo-store-review` fails to compile ("cannot find 'SceneGeometry'") when `expo-modules-core` is older than the version it expects. **This app uses expo-store-review**, so make sure `npx expo install --fix` aligns `expo-modules-core`.
- [#51956](https://github.com/expo/expo/issues/51956), [#51957](https://github.com/expo/expo/issues/51957): a Swift 6 strict-concurrency warning in the generated AppDelegate, and a deprecated URL hook. Neither breaks the default build settings.
- [#52063](https://github.com/expo/expo/issues/52063): `expo run:ios` cannot find the simulator on Xcode 27 because DeviceHub replaced Simulator.app. This only affects local runs and doesn't matter here (EAS builds, iPad tests).
- Expo's scene guide lists these symptoms: a black screen means the scene manifest is missing; `Linking.getInitialURL()` returning null on cold start means you need the latest 58 patch; doubled URLs mean a manual `RCTLinkingManager` call should be removed.
- iOS 27 makes apps resizable. `requireFullScreen` no longer opts out, and orientation locks may have no effect. The app is `"orientation": "portrait"` with `supportsTablet: true`, so the **iPad layout has to cope with arbitrary window sizes**.

## 2. Apple's deadline

- **Announced Sep 9, 2026** in "App Store submissions now open for the latest OS releases" ([Apple Developer News](https://developer.apple.com/news/?id=submit-27)): *"Starting April 2027, apps and games uploaded to App Store Connect need to meet the following minimum requirements: iOS and iPadOS apps must be built with the iOS 27 & iPadOS 27 SDK or later."* Also reported by [MacTech](https://www.mactech.com/2026/09/10/app-store-submissions-now-open-for-the-latest-os-releases/).
- **No exact day has been announced.** An Apple representative said Apple can't confirm dates before it announces them ([forum thread 839939](https://developer.apple.com/forums/thread/839939)). The current [Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/) page still lists only the Xcode 26 rule (in force since Apr 28, 2026). By precedent (Apr 29 2024, Apr 28 2026), expect late April 2027.
- On iOS 26 SDK builds running on iOS 27, Apple only "strives for binary compatibility" and "highly recommends adopting UIScene as soon as possible" ([forum thread 813300](https://developer.apple.com/forums/thread/813300)). Keep testing the current Xcode 26 build on the iPadOS 27 iPad.
- Also on the same April 2027 date: screenshots for iPhone Duo become required (Apple news, Oct 5 2026). This is a separate task from the upgrade.

## 3. Breaking changes, SDK 55 to 58, for what this app uses

### Version jumps (from each SDK's `bundledNativeModules.json`)

| Package | 55 (now) | 56 | 57 | **58** |
|---|---|---|---|---|
| react-native | 0.83.10 | 0.85.3 | 0.86.3 | **0.88.0** |
| react / react-dom | 19.2.0 | 19.2.3 | 19.2.3 | **19.3.0** |
| expo-router | 55.0.18 | 56.2.x | 57.0.x | **58.0.25** |
| react-native-gesture-handler | 2.30 | 2.31 | 2.32 | **3.3.0 (major)** |
| react-native-reanimated / worklets | 4.2.1 / 0.7.4 | 4.3.1 / 0.8.3 | 4.5.1 / 0.10.1 | **4.7.1 / 0.13.0** |
| react-native-screens | 4.23 | 4.26 | 4.26 | **4.30** |
| react-native-safe-area-context | 5.6.2 | 5.7.0 | 5.7.0 | **5.10.1** |
| react-native-svg | 15.15.3 | 15.15.4 | 15.15.4 | **15.16.0** |
| react-native-web | 0.21.0 | 0.21.0 | 0.21.0 | **0.21.4** |
| All `expo-*` modules | 55.x | 56.x | 57.x | **58.x** |
| Minimum iOS | 15.1 | **16.4** | 16.4 | **16.4** |
| Minimum Xcode | 26 | **26.4** | 26.4 | Xcode 27.1 image via the `sdk-58` alias |
| Node | | ≥ 20.19.4 | | **22.13+ / 24.3+ / 26** (this Mac runs 22.23.1, which is fine) |

New Architecture: SDK 55 is already New Architecture only, and Reanimated 4 / RNGH 3 need it, so nothing changes here.

### Changes that touch this app

**SDK 56** ([changelog](https://expo.dev/changelog/sdk-56), [router 55 to 56](https://docs.expo.dev/router/migrate/sdk-55-to-56/))
- **expo-router no longer depends on React Navigation**, and app code may no longer import `@react-navigation/*`. `app/game.tsx:2` imports `usePreventRemove` from `@react-navigation/native`. **Must change** (see the SDK 58 notes for the final import). Also remove `@react-navigation/native` from `package.json`, because expo-doctor warns when both are installed.
- **Minimum iOS is 16.4.** Devices stuck on iOS 15 or older (iPhone 7, iPhone SE 1st gen, early iPads) lose updates. Check App Store Connect analytics for how many users run iOS 15 before shipping.
- **Hermes V1 is the default.** There is a known memory regression with reanimated/worklets ([#46519](https://github.com/expo/expo/issues/46519)), fixed in `expo@57.0.9`. The app uses Reanimated in 11 files, which is one more reason not to stop at 56.
- `expo/fetch` replaces global `fetch`. The app doesn't use it.
- `expo-updates` turns on bsdiff patches. Harmless.
- `expo` no longer bundles `@expo/vector-icons`. The app doesn't use it.
- TypeScript in the template is now 6.0.3. `expo install --fix` may bump `typescript ~5.9.2`; re-run `tsc`.

**SDK 57** ([changelog](https://expo.dev/changelog/sdk-57))
- RN 0.86 "intended to have no breaking changes from 0.85".
- `expo prebuild` cleans `ios/` by default. This app uses CNG and has no `ios/` folder, so it doesn't matter.
- No API breaks in packages this app uses.

**SDK 58** ([changelog](https://expo.dev/changelog/sdk-58), [router 57 to 58](https://docs.expo.dev/router/migrate/sdk-57-to-58/))
- **Scene lifecycle** (section 1). The app has no custom AppDelegate, and its only custom plugins edit the Podfile, Swift in node_modules and asset catalogs, so no AppDelegate migration is needed.
- **`usePreventRemove`**: import it from **`expo-router`** (exported from `build/exports.d.ts` in 58.0.25). Its signature is `usePreventRemove(prevent, callback?, options?) => disablePrevention`. The app's call (`usePreventRemove(cond, openPause)`) neither repeats nor replaces the blocked action, so the guide says "only needs changes when the callback repeats or replaces the blocked action". The app sets `leaving` and commits it before navigating, which matches the new "dispatch waits until after commit" behaviour. Still, **retest leaving a game** (pause menu → Home, swipe-back while playing). The hook now also blocks web page unloads while active. The app passes `false` on web, so this is fine.
- **`web.output` now defaults to `"server"`.** `app.json` → `web` sets no `output`. Set `"output": "single"` (or `"static"`) explicitly, or the web build and export change behaviour. Async routes on web are on by default; `asyncRoutes: { web: false }` turns them off if the smoke test shows flicker.
- Stack headers on iOS 26+ become transparent Liquid Glass by default. **Not relevant**, because the app sets `headerShown: false`. `initialRouteName`, `redirect`, `initialParams` and `freezeOnBlur` were removed; the app uses none of them. Ancestor params are no longer copied to child routes; `game` reads its own params, so retest anyway.
- **RN 0.88 Strict TypeScript API is the default.** Deep `react-native/Libraries/*` imports become type errors and ref types change (for example `ViewInstance`). Run `tsc`. The temporary opt-out is `customConditions` in `tsconfig.json`. `react-native-confetti-cannon` 1.5.2 deep-imports `react-native/Libraries/Animated/...`, but as Flow `import type`, which Babel strips, so it won't break at runtime. RN also removed `InteractionManager`, the `Touchable` root export, `Modal animated`, and `StatusBar backgroundColor/translucent`. The app uses `expo-status-bar` with only `style`, so none of this applies, but grep again after the bump.
- **react-native-gesture-handler 3** ([upgrade guide](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-3/)): the `Gesture.Pan()` builder still works but is marked `@deprecated` in 3.3.0, and `GestureDetector` and `GestureHandlerRootView` are still exported. `src/ui/PlayersSheet.tsx` (drag sheet) keeps working with no change. Migrating to `usePanGesture` (`onEnd` becomes `onDeactivate`, `success` becomes `!canceled`) is optional and can wait.
- **expo-localization**: iOS no longer force-enables RTL through `supportsRTL`; layout direction follows `I18nManager`. The app ships **Arabic (`ar`)**, so check the Arabic layout on the iPad.
- expo-sqlite: libSQL was removed. The app only uses `expo-sqlite/kv-store`, so it is unaffected.
- expo-audio, expo-haptics, expo-linear-gradient, expo-constants, expo-status-bar, expo-system-ui, expo-store-review, expo-linking and expo-asset: no breaking changes listed.
- `version` in app.json no longer affects the *fingerprint*. The app uses `runtimeVersion.policy: appVersion`, so this doesn't apply. **Bump the app version (for example 1.3.0)** so no OTA update built on SDK 58 can reach 1.2.1 binaries.
- R8 is on by default for Android release builds. iOS-only app, so it doesn't matter.
- Expo Go for 58 is still "coming in a few weeks", but the iPad tests use Safari web and TestFlight anyway.

### expo-iap

- Installed 5.8.2; **latest 6.1.1** (Oct 18, 2026; 6.0.0 on Oct 9). Peer deps: `expo: *`, `react: *`, `react-native: *`, plus optional Amazon libraries, so there is no SDK pin. 6.1.1 is developed against `expo ^57.0.12` / RN 0.86.2 (its devDeps). **No issue mentions SDK 58 or iOS 27** ([npm](https://www.npmjs.com/package/expo-iap), [releases](https://github.com/hyodotdev/openiap/releases?q=expo-iap&expanded=true); the repo moved to `hyodotdev/openiap`).
- The functions the app imports in `src/store/purchases.ts` (`initConnection`, `fetchProducts`, `requestPurchase`, `finishTransaction`, `getAvailablePurchases`, `restorePurchases`, `purchaseUpdatedListener`, `getAppTransactionIOS`, `ErrorCode`, `onlyIncludeActiveItemsIOS`) all still exist in 6.1.1, with the same top-level declarations. The 6.0.0 major is "community providers / Client Protocol 1.0.0", and its type-level changes aren't documented, so run `tsc`.
- Under the scene lifecycle it is fine: the iOS side hooks in through `ExpoAppDelegateSubscriber` (still forwarded), and OpenIAP 4.0.3 buys with `product.purchase(confirmIn: scene)`, finding the scene through `connectedScenes` rather than `keyWindow`. Podspec minimum is iOS 13.4.
- Recommendation: upgrade to `expo-iap@^6.1.1` with the SDK bump and test the purchase flow fully in sandbox. Fallback: 5.8.2 should still build, but it has never been tested against RN 0.88.

## 4. Are the two Xcode 27 plugins still needed on SDK 58?

| Plugin | Verdict | Why |
|---|---|---|
| `plugins/withExpoRouterXcode27Fix.js` | **Remove** | expo-router 58.0.25 still has the unguarded `baseUiAction.subtitle = subtitle` (and `menuAction.subtitle`) in `ios/LinkPreview/LinkPreviewNativeActionView.swift`. But the error only fired because the app targeted iOS 15.1, and SDK 56+ sets both the app (Podfile `platform :ios, '16.4'`) and the expo-router podspec to iOS 16.4, so the API is always available. If kept, it still finds the pattern and patches harmlessly. It would only break prebuild if the file moved, since `readFileSync` would throw. |
| `plugins/withPodsDeploymentTarget.js` | **Probably remove; check the first build** | The SDK 58 Podfile template still has `post_install do \|installer\|`, so the plugin would still apply. Its job is to lift pods below iOS 15 (SDWebImage, ReachabilitySwift, RNSVGFilters), and those pods come from versions that all bump in 58. Lazy path: delete it, build once on the `sdk-58` image, and restore it only if Xcode 27.1 complains about a pod's deployment target. Keeping it costs nothing either. |
| `plugins/withAlternateIcons.js` | Keep | Unrelated to Xcode 27. It writes `Images.xcassets` and build settings, and prebuild still produces both. |

## 5. Upgrade plan

**Go straight to 58**, even though Expo's walkthrough says *"We recommend upgrading SDK versions incrementally, one at a time"* ([docs](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)). Here's why:
- 56 and 57 don't solve the problem (56 has no scene support; 57's opt-in has the open #50363).
- The app uses CNG (no native folders to migrate), and its code surface is small: 5 router files, one `@react-navigation` import, and one gesture.
- Each npm install plus EAS build costs about an hour on this Mac, and that would happen three times over.

Read all three router migration guides (55→56, 56→57, 57→58) once, as a checklist. If something breaks badly, fall back to 57 + `enableSceneSupport`.

### Steps

1. **Branch**: `git switch -c sdk-58`. No stash or reset, because the worktree is shared.
2. **Bump**: `npm install expo@^58.0.0` then `npx expo install --fix`, which aligns every `expo-*`, RN 0.88, React 19.3, RNGH 3, Reanimated 4.7 / worklets 0.13, screens, safe-area and svg. Then `npm install expo-iap@^6.1.1`, `npm uninstall @react-navigation/native`, and `npx expo-doctor@latest`.
3. **Code edits**:
   - `app/game.tsx`: `import { usePreventRemove } from 'expo-router';`
   - `app.json`: add `"output": "single"` under `web`. Remove the two Xcode 27 plugin entries and their files.
   - `eas.json`: in `build.production.ios.image`, replace `macos-sequoia-15.6-xcode-26.2` with `"sdk-58"`, or delete the line (`latest` also points to Xcode 27.1).
   - Bump `expo.version` to 1.3.0.
4. **Checks**: `npx tsc --noEmit` (fix any Strict TS API ref types), `npm test`, and a grep for `InteractionManager|Touchable|react-native/Libraries`.
5. **Web smoke test** (see the memory recipe): run `expo start --web` in the background, play a full game, open the players sheet drag, settings and how-to-play modals, and check the Esc pause and browser Back.
6. **iPad Safari**: `npx expo start --web --lan` on the owner's iPad, as a quick visual check.
7. **EAS build**: `eas build -p ios --profile production`. Check the log for the Xcode 27.1 image and for pod deployment-target warnings. Optionally run `npx expo prebuild --clean -p ios` locally first, to confirm `SceneDelegate.swift` and `UIApplicationSceneManifest` exist. Locally that costs RAM and time, while on EAS it's free.
8. **TestFlight on the iPadOS 27 iPad**:
   - The app launches. This is the original 2.1(a) failure.
   - Cold start and background/foreground: the game auto-pauses, and settings and stats persist.
   - Leaving a game through the pause menu, and swipe-back while playing.
   - The players sheet drag.
   - Sounds and haptics.
   - Resize the window in iPadOS 27 windowing (Stage Manager / split), in both portrait and landscape: the layout must not clip.
   - Switch the device to Arabic and check the RTL layout.
   - The review prompt (expo-store-review). It is only shown in TestFlight/sandbox, so trigger it the way the app does.
   - The Bright alternate icon is still in the binary.
9. **Purchases in sandbox** (TestFlight uses the sandbox):
   - Load the price of the $2.99 unlock and the tips.
   - Buy the unlock → the unlock shows → kill and relaunch → still unlocked.
   - Restore on a fresh install.
   - Buy a tip; it is consumable, so it's finished and can be bought again.
   - Cancel a purchase; it must not leave the app stuck in "busy".
   - Interrupted purchase: kill the app mid-sheet, relaunch, and the transaction is replayed through `purchaseUpdatedListener`.
   - The grandfathered path (`getAppTransactionIOS`) still resolves.
10. **Submit**: run the full guideline audit (per memory) before submitting.

### Time estimate (2015 MacBook Air, 4 GB RAM, builds on EAS)

| Step | Estimate |
|---|---|
| npm install / expo install --fix (big dependency tree on 4 GB) | 20–40 min |
| Code edits + tsc/test fixes | 30–90 min (more if Strict TS ref types ripple) |
| Web smoke + iPad Safari | 30–45 min |
| EAS build (queue + build) + TestFlight processing | 45–90 min wall time, unattended |
| TestFlight + sandbox purchase pass on iPad | 45–60 min (owner) |
| **Total hands-on** | **about 3–5 h, so one working day**; plus App Review 1–3 days |

### Risks

- **Scene lifecycle regressions in a young SDK** (58 went stable Oct 15, 2026). Wait for a few `58.0.x` patches and always use the latest one. The #50230-style linking bug is already fixed; the app has a `pegrecall` scheme but no deep-link features.
- **iPadOS 27 resizing**: `requireFullScreen` no longer helps, and a portrait-only layout can be squeezed into odd sizes. This is the most likely visual bug, and a 4.0/4.2-style review risk.
- **Purchases**: the expo-iap 6.x major has never been tested on RN 0.88, and money is involved. Do the full sandbox pass, and keep 5.8.2 as the fallback.
- **Reanimated 4.7 / worklets 0.13 + Hermes V1**: watch memory and animation smoothness on the iPad (the Hermes V1 regression is fixed only from 57.0.9 onward, so it's fine on 58).
- **Dropping iOS 15 users** (minimum 16.4).
- **OTA updates**: the 1.2.1 binaries must never receive an SDK 58 update. Bumping the version handles this under the `appVersion` runtime policy.
- **expo-store-review compile error** if `expo-modules-core` is misaligned (#49915). `expo install --fix` plus expo-doctor catches it.
- **Doing nothing is not an option**: after April 2027 no update can be uploaded on SDK 55.

## Sources

- Expo: [SDK 58](https://expo.dev/changelog/sdk-58), [SDK 58 beta](https://expo.dev/changelog/sdk-58-beta), [How to upgrade to SDK 58](https://expo.dev/blog/how-to-upgrade-to-sdk-58), [SDK 57](https://expo.dev/changelog/sdk-57), [SDK 56](https://expo.dev/changelog/sdk-56), [scene lifecycle guide](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md), [router 55→56](https://docs.expo.dev/router/migrate/sdk-55-to-56/), [router 57→58](https://docs.expo.dev/router/migrate/sdk-57-to-58/), [upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [build-properties v58](https://docs.expo.dev/versions/v58.0.0/sdk/build-properties/)
- GitHub expo/expo issues: [#46664](https://github.com/expo/expo/issues/46664), [#50363](https://github.com/expo/expo/issues/50363), [#50230](https://github.com/expo/expo/issues/50230), [#49915](https://github.com/expo/expo/issues/49915), [#51340](https://github.com/expo/expo/issues/51340), [#51956](https://github.com/expo/expo/issues/51956), [#51957](https://github.com/expo/expo/issues/51957), [#52063](https://github.com/expo/expo/issues/52063), [#46519](https://github.com/expo/expo/issues/46519)
- Apple: [Developer News, Sep 9 2026](https://developer.apple.com/news/?id=submit-27), [Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/), [forum 813300 (TN3187)](https://developer.apple.com/forums/thread/813300), [forum 839939](https://developer.apple.com/forums/thread/839939)
- Libraries: [expo-iap on npm](https://www.npmjs.com/package/expo-iap), [openiap releases](https://github.com/hyodotdev/openiap/releases?q=expo-iap&expanded=true), [RNGH 3 upgrade guide](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-3/)
- Version tables: `bundledNativeModules.json` from `expo@55.0.31`, `56.0.24`, `57.0.31` and `58.0.17` (unpkg), plus the npm tarballs of `expo-router@58.0.25`, `expo-iap@6.1.1`, `react-native-gesture-handler@3.3.0` and `expo-template-bare-minimum@58.0.26`, inspected in a scratch directory.
