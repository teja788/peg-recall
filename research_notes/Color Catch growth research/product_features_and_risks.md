# Color Catch: product features for retention and sharing, and compliance risks for kids' and family apps (iOS, 2025-2026)

Research date: 2026-10-14. App facts below come from the repo (`store-assets/listing.json`, `src/store/statsModel.ts`): no ads, no third-party analytics SDK, App Privacy "Data Not Collected", parental gate (one-digit sum) before every purchase and restore, rated 4+, not in Kids Category, SKStoreReviewController prompt, Expo Updates check to u.expo.dev. "Opt-in analytics" means Apple App Analytics, which only counts users who chose to share data with developers.

## A1. Retention mechanics: daily challenge, streaks, achievements, collections, events, progression

### Takeaway
The best-evidenced levers for a casual puzzle game are a daily shared puzzle with a shareable result (Wordle) and a streak protected by a freeze. The public data shows modest gains (streak wager: +14% D7 at Duolingo; one extra freeze: +0.38% DAU), not huge jumps. Color Catch's 1–4% D1 sits far below casual benchmarks (about 27–45%). That points to a first-session problem, or to a tiny opt-in sample, before it points to a missing meta-game.

### Cited Findings
- Benchmarks: "good" mobile game retention in 2026 is about 27% D1, 8–14% D7 and 3–7% D30, with match and puzzle games leading — [Segwise](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies.md). Another source puts casual games at 35–45% D1, 12–20% D7 and 5–10% D30 — [Solsten](https://solsten.io/blog/d1-d7-d30-retention-in-gaming). The two sources disagree, but both are an order of magnitude above 1–4%.
- Habit loops (daily streak, a daily content drop, fitting into a daily routine) drive long-tail retention. Raising retention starts with "nailing first-session onboarding", then progression and live-ops content, balanced difficulty and win-back — [Segwise](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies.md).
- Redecor's "My Design Journal" mission feature raised D14 and D30 retention by about 11% each (a casual-game case study) — [Liquid & Grit casual report](https://www.liquidandgrit.com/october-2023-casual-report/) (via search snippet; the full page was not read).
- Duolingo streak freeze: raising the number of freezes a user can hold from 1 to 2 gave a relative +0.38% in daily active learners. The streak wager gave statistically significant gains in D1, D7 and D14 retention, with D7 up 14% — [Duolingo blog](https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals); [Lenny's Newsletter](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks).
- Over four years, Duolingo's retention work cut daily churn by more than 40% and contributed to about 4.5x DAU growth — [Duolingo growth breakdown (secondary)](https://marishalakhiani.substack.com/p/breaking-down-duolingos-growth-model).
- Wordle: a single daily answer plus a shareable result built routines and streak comparison. Scarcity (everyone gets the same puzzle, once a day) made the shared result a talking point — [Wordle/NYT write-up (secondary)](https://vestcallcenter.nbxsoluciones.com/wordle-the-new-york-times-how-a-viral-puzzle-became-a-cultural-phenomenon); [TechCrunch on NYT user growth](https://techcrunch.com/2022/05/04/wordle-new-york-times-user-growth).
- A one-and-done daily puzzle has a known failure mode: players finish the daily and leave. A practitioner write-up covers how to fix it — [PeerPush case study](https://peerpush.com/blog/how-we-fixed-a-one-and-done-problem-on-a-daily-puzzle-game) (title only; not read).
- Game Center leaderboards and achievements are available in Expo through the community module `expo-game-center` (auth, leaderboards, achievements, native UI, a config plugin for the entitlement, mocks for Expo Go) — [expo-game-center README](https://unpkg.com/expo-game-center@1.0.0/README.md).

### Inferences
- Priority 1: daily board, same seed for everyone each day, computed on device from the date. That keeps it offline and keeps "Data Not Collected". Add a streak counter with one automatic free "rest day" (freeze) a week. This copies Wordle's daily cadence and Duolingo's freeze, and needs no server or Expo native work.
- Priority 2: cosmetic unlockables earned by play: peg skins and boards (the "themes pending" item in project memory), and sticker or badge rewards for kids (first match, first win vs Fox, 7-day streak). Keep these local. Selling themes is a separate decision (see B5).
- Game Center is optional. It brings an account and network surface, and leaderboards matter little to families and seniors. Achievements could double as the badge system, but this is lower priority than the daily board.
- Seasonal events (Diwali or Christmas peg colors) are cheap cosmetic swaps that also give "What's New" and promotional-text hooks.
- Because App Analytics counts only opted-in users, the 1–4% D1 may come from a very small sample. Check the cohort size before treating it as real.

### Gaps
- No public D1/D7/D30 lift data was found for Game Center achievements, collections or seasonal events in small casual games. GameAnalytics and Deconstructor of Fun pages were not reached within the search budget.
- No public data was found on retention of family or pass-and-play games specifically.

## A2. Social: async challenges, SharePlay/FaceTime, online rooms, local Wi-Fi, Game Center turn-based

### Takeaway
A text or emoji result share (WhatsApp or iMessage) is the best-evidenced and cheapest sharing mechanic: Wordle's emoji grid drove its growth. Real-time remote play (SharePlay, online rooms) is high effort, needs native code and conflicts with "no server, no data".

### Cited Findings
- Wordle added the shareable emoji grid on Nov 9, 2021. It reached about 300,000 daily players by late December 2021 and about 2 million by early January 2022. Players shared it in WhatsApp chats, on Facebook and in texts to family — [Wordle write-up (secondary)](https://vestcallcenter.nbxsoluciones.com/wordle-the-new-york-times-how-a-viral-puzzle-became-a-cultural-phenomenon); [AOL/Yahoo on NYT users](https://www.aol.com/news/wordle-brought-tens-millions-users-150000203.html).
- NYT kept the share grid spoiler-free (it does not reveal the answer), which let the result travel without ruining the puzzle — same source as above.
- Apple added SharePlay to Game Center: players on a FaceTime call or in a Messages group can jump into a game together — [Apple tech talk 110338](https://developer.apple.com/videos/play/tech-talks/110338/).
- No Expo or React Native module covering GroupActivities/SharePlay was found. `expo-game-center` covers auth, leaderboards and achievements only — [expo-game-center README](https://unpkg.com/expo-game-center@1.0.0/README.md).

### Inferences
- Priority 1: a share card after the daily board, for example "Color Catch #123 🟥🟨🟩 found 25/25 in 31 rolls 🔥 streak 6" plus the App Store link, sent through React Native's built-in `Share` API. No new dependency, no data collected, and it works in WhatsApp (key for India and the hi locale).
- Priority 2: an async "beat my score" challenge, done as a seed number inside the share text ("Board #4821"). The friend types or taps it, and a deep link through the app scheme opens the same board. No server needed; it must still work offline.
- SharePlay with grandparents is attractive for an editorial story, but needs native Swift (GroupActivities) through a custom Expo module, plus a sync layer. Defer it until the daily board and sharing show traction.
- Online rooms add a server, accounts or identifiers and moderation, and would break the "Data Not Collected" and kids-safety story (see B). Skip.

### Gaps
- No published data was found quantifying how much SharePlay or Game Center turn-based play adds to retention.

## A3. Platforms and surfaces: iPad, Apple TV, Mac, Watch, widgets, Live Activities, App Clips, App Intents, Vision Pro

### Takeaway
Expo SDK 55 ships `expo-widgets` (alpha) for iOS home-screen widgets and Live Activities written in JSX through `@expo/ui`, with no Swift. A "today's board" widget is the cheapest new surface. iPad-first layout already exists. Apple TV, Watch, Vision Pro and App Clips are poor value for this app now.

### Cited Findings
- `expo-widgets` builds iOS home-screen widgets and Live Activities from Expo UI components (VStack, HStack, Text) with no separate Xcode target or SwiftUI code. It is alpha, may have breaking changes and is not in Expo Go (needs a development build). Install: `npx expo install expo-widgets` — [Expo docs v55 widgets](https://docs.expo.dev/versions/v55.0.0/sdk/widgets); [Expo docs latest](https://docs.expo.dev/versions/latest/sdk/widgets/).
- Docs for v56–v58 also exist, so the package carried on after SDK 55 — [Expo docs v58](https://docs.expo.dev/versions/v58.0.0/sdk/widgets/).

### Inferences
- Widget: "Today's board is ready · streak 6" with a tap that deep-links into the daily board. The widget is a daily reminder with no push notifications (no permission prompt, no data). Medium effort; alpha risk.
- Live Activities do not fit a 3–4 minute game. Skip.
- Mac: "Designed for iPad" apps on Apple Silicon Macs need only an App Store Connect checkbox. It is near-zero effort but must be tested (pointer, window sizes).
- Apple TV (a family living-room game) would need react-native-tvos and focus-based navigation: high effort. Watch and Vision Pro: skip.
- App Intents/Siri ("Start today's Color Catch"): low value.

### Gaps
- Apple's opt-in setting for "Designed for iPad" on Mac and react-native-tvos support for SDK 55 were not verified this session.
- `@bacons/apple-targets` status for SDK 55 was not verified.
- No primary source was found on which surfaces App Store editors favour.

## A4. Accessibility as a growth angle (Accessibility Nutrition Labels)

### Takeaway
Apple added Accessibility Nutrition Labels to App Store product pages in 2025. Color Catch already supports most labelled features (VoiceOver, Larger Text/Dynamic Type, Reduced Motion, Differentiate Without Color via shapes, Dark Interface). Declaring them is a near-free listing win and is due to become mandatory.

### Cited Findings
- Accessibility Nutrition Labels add a product-page section that lists accessibility features (VoiceOver, Voice Control, Larger Text, Sufficient Contrast, Reduced Motion, captions and more) so users can check before downloading — [Apple newsroom May 2025](https://www.apple.com/in/newsroom/2025/05/apple-unveils-powerful-accessibility-features-coming-later-this-year); [App Store Connect Help](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels).
- They are voluntary at first, but "over time" developers will be required to declare accessibility support to submit new apps and updates. Account Holder, Admin, App Manager, Marketing or Finance roles can edit them — [App Store Connect Help](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/manage-accessibility-nutrition-labels); [Yahoo Tech](https://tech.yahoo.com/home/articles/apple-adds-accessibility-labels-app-120000024.html).

### Inferences
- Declare the labels for iPhone and iPad now, but only after testing each claim with the device setting on (VoiceOver full game loop, Larger Text at the largest size, Reduce Motion, Sufficient Contrast on the wood board). Apple's criteria say a label applies only if the common tasks can be completed with it.
- The colour-blind shapes mode is a real point of difference for a colour game. Lead with it in the promotional text and in any editorial pitch (Apple features accessibility around Global Accessibility Awareness Day in May).

### Gaps
- The exact per-label evaluation criteria and the mandatory date were not fetched this session.
- No data was found linking the labels to conversion.

## A5. Senior-friendly design

### Takeaway
Research on older adults supports large targets, short tasks and no time pressure, plus clear colours, sounds and simple rewards with plain language. Color Catch already meets most of these (tap-only, big targets, no timer except the look phase).

### Cited Findings
- In a study of 12 adults aged 55–89, 32px targets suited pointing and 64px helped steering. Shorter (6 s) tasks had fewer errors than 12 s tasks — [UMBC/MDSOAR thesis](https://mdsoar.org/items/f8126765-567c-4808-8359-6d79cd3951a8/full).
- Older adults value images, colours, sounds and soundtrack despite sensory limits. Games for them should have simple rewards, reinforcement messages and adapted language — [Abakós empirical study](https://pucminas.emnuvens.com.br/abakos/article/view/P.2316-9451.2017v6n1p76).
- Larger touch targets prevent the mis-taps that discourage play; "patience modes" remove time pressure — [arXiv 2604.04351](https://arxiv.org/pdf/2604.04351) (design paper, not an outcome study).

### Inferences
- The one time-pressured element is the "look" countdown. Offer a "take your time" option (look until I tap Ready) for seniors and kids, beyond Kid mode's longer look. Keep miss feedback gentle.
- Use plain words ("Your turn, Grandma"). Named seats already exist.

### Gaps
- No retention data specific to seniors in casual games was found. AARP gaming surveys were not reached.

## A6. Onboarding and time to first fun

### Takeaway
Industry sources rank first-session onboarding as the first lever for D1. The current flow sends a new user to a Home screen with four mode cards, a size row and an opponent row, with the tutorial behind a "?". A guided first game would likely help D1 most.

### Cited Findings
- Retention improvement starts with "nailing first-session onboarding" — [Segwise](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies.md).
- The current first run: Home shows the mode cards, board-size row and opponent row, and How to Play is behind the "?" icon — repo `store-assets/listing.json` (reviewNotes).

### Inferences
- On first launch, skip Home and drop the player straight into a guided Small (16-peg) game vs Bunny, with coach marks for Look → Roll → Find. Aim for first fun in under 30 seconds and a likely first win. Show Home after that game.
- Ask for the rating only after a win, as the code already does. Fire the "Ready for more?" card after a win, not after a loss.

### Gaps
- No public numbers were found for interactive tutorials vs static ones in casual games.

## A7. Sound, haptics and juice

### Takeaway
Lab studies show "juicy" feedback (including haptics) raises enjoyment and the sense of immersion, but the effects are mixed: too much amplification can lower motivation or performance. No study ties juice directly to D1/D7 retention or ratings.

### Cited Findings
- Juicy vibrotactile embellishments improved enjoyment, aesthetic appeal, immersion and meaning — [Waterloo Haptic Experience Lab](https://uwaterloo.ca/haptic-experience-lab/projects/juicy-haptic-design-vibrotactile-embellishments-can-improve).
- A 2024 CHI study found that feedback tied to success raised curiosity, competence and effectance, while plain amplification unexpectedly reduced them. An earlier study found players rated the juicy version higher but performed worse in it — [arXiv 2512.13695 / KIT summary](https://arxiv.org/html/2512.13695); [Good feedback for bad players](https://adk.elsevierpure.com/en/publications/good-feedback-for-bad-players-a-preliminary-study-of-juicy-interf).

### Inferences
- Add haptics with `expo-haptics` on match, miss and win, with an off switch, and respect Reduce Motion. Tie the celebration to success (match or win) rather than every tap.

### Gaps
- No causal data was found linking polish to store ratings or retention.

## B. Rules and risks: Apple guidelines, COPPA, GDPR-K/UK AADC, India DPDP, age ratings, health claims, dark patterns

### Takeaway
As an offline, no-data, non-Kids-Category app with a parental gate, Color Catch is in a low-risk position. The live risks are: (1) metadata wording that implies children are the main audience (2.3.8 / 5.1.4); (2) any new feature that sends data (daily-board server, Game Center, online rooms, analytics SDK), which would bring in COPPA's amended rule, the UK code and India DPDP parental consent; (3) health or "memory improvement" claims; (4) upsell cards seen by kids if they nudge or confuse.

### Cited Findings
**Apple App Review Guidelines (current page fetched 2026-10-14)** — [Apple](https://developer.apple.com/app-store/review/guidelines/)
- 1.3: Kids Category apps must not have links out, purchases or "other distractions" unless behind a parental gate. No third-party analytics or ads, except limited exceptions. Once users expect Kids Category behaviour, the app must keep meeting the rules "even if you decide to deselect the category".
- 2.3.8: "Use of terms like 'For Kids' and 'For Children' in app metadata is reserved in the App Store for the Kids Category." Icons, screenshots and previews must suit 4+.
- 5.1.4: apps "intended primarily for kids" should not include third-party analytics or advertising. Apps that collect or can share personal info from a minor need a privacy policy and must follow children's privacy laws. "Apps not in the Kids Category cannot include any terms in app name, subtitle, icon, screenshots or description that imply the main audience for the app is children." The Kids Category parental gate is "not the same as" verifiable parental consent under privacy law.
- 2.3.7: subtitles must not "make unverifiable product claims".
- 1.4.1: health claims need disclosed data and methodology, or the app is rejected. The guidelines have no specific "brain training" clause.
- 3.1.1: unlocking features or a full version must use in-app purchase.

**Apple age ratings and Declared Age Range**
- New 13+, 16+ and 18+ tiers alongside 4+ and 9+ (announced July 2025). New required questionnaire items cover in-app controls, capabilities (for example social sharing or account creation), medical or wellness topics and violent themes. Developers had to answer by January 31, 2026, or updates would not be accepted — [9to5Mac](https://9to5mac.com/2025/07/24/apple-notifies-developers-of-new-app-store-age-rating-system/); [AppleInsider](https://appleinsider.com/articles/25/07/25/app-store-developers-must-now-provide-age-rating-details); [Apple dev forums](https://developer.apple.com/forums/thread/810473).
- The Declared Age Range API (iOS 26, Sept 2025) returns an age band rather than a birthdate. A Feb 24, 2026 beta update was made for laws in Brazil, Australia, Singapore, Utah and Louisiana. Age categories are shared for new accounts in Utah after May 6, 2026 and in Louisiana after July 1, 2026 — [Gigazine](https://gigazine.net/gsc_news/en/20260225-apple-rolls-out-age-verification-tools); [PPC Land](https://ppc.land/declared-age-range/).
- New guideline text (1.2.1(a), 4.7.5) requires an "age restriction mechanism based on verified or declared age", but only for creator and mini-app platforms that host content above the app's rating — [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/).

**COPPA amended rule (US)**
- Published in the Federal Register April 22, 2025, effective June 23, 2025, with compliance required by April 22, 2026. It adds a written data-retention policy, a written security programme, separate parental consent for third-party disclosure, an expanded definition of personal information (biometrics, government IDs) and a new "mixed audience" category that must age-screen before collecting data — [Davis Polk](https://www.davispolk.com/insights/client-update/ftc-prioritizes-coppa-enforcement-new-compliance-obligations-take-effect); [Toy Association](https://toyassociation.org/PressRoom2/News/2026-News/updated-coppa-rule-requirements-take-effect-april-22.aspx).
- The FTC calls protecting kids "a high priority". Recent settlements: Cognosphere $20M, Disney $10M, Apitor. A Feb 25, 2026 policy allows limited data collection for age verification. Penalties reach up to $53,088 per violation — [Davis Polk](https://www.davispolk.com/insights/client-update/ftc-prioritizes-coppa-enforcement-new-compliance-obligations-take-effect); [compliancehub (secondary)](https://compliancehub.wiki/coppa-april-22-deadline-ftc-updated-rule-compliance/).

**UK Age Appropriate Design Code (ICO)**
- 16 standards that apply to online services, games included, that are "likely to be accessed" by under-18s in the UK. They require high-privacy defaults and data minimisation, and ban nudge techniques that push children to give data, weaken privacy or "carry on using the service longer than they had intended". The ICO's example of a nudge: a "yes" button much larger than the "no thanks" button — [ICO code PDF](https://ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services-2-1.pdf); [WSGR summary](https://www.wsgrdataadvisor.com/2020/01/update-uks-age-appropriate-design-code/).

**India DPDP Rules 2025**
- Notified Nov 14, 2025, with a phased rollout to May 14, 2027. Processing data of anyone under 18 needs verifiable parental consent (Rule 10: identity documents, DigiLocker tokens and similar). Tracking, behavioural monitoring and targeted ads aimed at children are banned — [India Briefing](https://www.india-briefing.com/news/dpdp-rules-2025-india-data-protection-law-compliance-40769.html); [SCC Online](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/).

**Health claims**
- Lumos Labs (Lumosity) paid $2M in 2016 to settle FTC charges that it made unfounded claims its games improved work and school performance and delayed cognitive decline — [FTC press release](https://ftc.gov/news-events/press-releases/2016/01/lumosity-pay-2-million-settle-ftc-deceptive-advertising-charges).

**Dark patterns and child purchases**
- In the Epic Games (Fortnite) case, $245M in refunds was ordered over dark patterns: confusing button layouts caused one-press purchases and let children make charges without parents. Epic was barred from charging without affirmative consent — [FTC](https://www.ftc.gov/node/80648); [PYMNTS](https://www.pymnts.com/news/regulation/2023/ftc-says-epic-games-set-to-refund-245-million-to-fortnite-players/).

### Inferences
- **COPPA:** collecting no personal information means COPPA's consent duties are not triggered today. The App Privacy label and review notes are consistent with that: the Expo Updates check sends no personal data. The amended rule matters the moment a feature adds a persistent identifier: a third-party analytics SDK, Game Center, a server-backed daily board, push tokens or online rooms. A family game with child-appealing art is likely a "mixed audience" service and would then need age screening and consent. Keep the daily board seeded on device.
- **Metadata (most concrete current risk):** the listing opens with "kids, parents and grandparents" (family framing, likely fine), and the settings include "Kid mode". Never use "for kids" or "for children" in the name, subtitle, keywords or screenshot captions, and keep screenshots showing adults and families too (2.3.8 / 5.1.4). The 1.3 note about "deselecting" does not apply, because the app was never in the Kids Category.
- **Age rating:** 4+ stays correct. The Jan 31, 2026 questionnaire items should already be answered, or 1.2.1 could not have shipped. If a share or WhatsApp result feature ships, re-answer the "capabilities: social sharing" question. Declared Age Range is not required for this app: it is not a creator or mini-app platform and holds no content above 4+. It is optional, and only worth it if age-gated features are ever added.
- **Health claims:** keep "fun with family" wording. Avoid "improves memory", "brain training", "keeps your mind sharp" and "good for seniors' brains" in metadata, promo text, Apple Search Ads and social posts. These fall under 2.3.7 "unverifiable product claims", the FTC precedent above, and the new age-rating question on "medical or wellness topics".
- **Free-try and upsell cards (Epic, UK AADC):** the parental gate on every purchase already blocks the Epic-style failure (a child buying with one tap). The remaining risk is nudging. "Liked it? / Ready for more?" cards shown to kids should have an equally prominent "Not now", should not repeat after every game, and should not use urgency, guilt or cartoon pressure. For the UK code, avoid streak mechanics that guilt children into playing longer ("Your streak will die!"); keep the streak gentle with a freeze. A one-digit sum (7 + 5) is a weak gate for 8–10-year-olds. Apple accepts it outside the Kids Category, but a harder gate (two-digit multiplication, or a word answer) reduces the risk of kids buying.
- **GDPR-K / EU:** with no processing of personal data there is little exposure. The same "add an identifier, then it applies" logic holds (the age of consent is 13–16 depending on the member state).

### Gaps
- EU GDPR Article 8 and the EU Digital Services Act guidance on minors (2025) were not fetched.
- Texas, Utah and Louisiana app-store age-verification laws: their duties fall on Apple, but developer duties and court status (for example any injunction against the Texas law) were not checked.
- How strict Apple is about "Kid mode" wording outside the Kids Category: no rejection reports were found.
