# ASO tactics for 2025–2026: small iOS casual/family game (Color Catch: Memory Match Game)

Research date: 2026-10-14. About 22 tool calls. Vendor blogs (AppTweak, MobileAction, Adapty, SplitMetrics, ASOMobile and so on) report what the industry has observed. Apple does not document how it weights ranking factors. Anything not backed by an Apple source is marked as such.

App baseline, for reference in the inferences below: 4,320 impressions, 80 product page views, 42 downloads in 30 days. Impression→page view = 1.9%. Page view→download is about 52% (42/80). ASC "conversion" (downloads / unique impressions) = 1.21%. 0 US ratings.

---

## 1. Keyword strategy for 2025–2026 (field weights, cross-localization, keyword-linked CPPs, how many keywords, long tail)

### Takeaway
The title still carries the most weight, then the subtitle, then the 100-character keyword field. In-app purchase display names and in-app event names and descriptions are also indexed, and screenshot captions may be (this is disputed). Each storefront also indexes one or more secondary locales. For India, France and most of the app's other markets that secondary locale is English (UK), which makes the en-GB keyword field the most widely reused keyword space. Since July 2025, custom product pages (CPPs) can be tied to keywords and shown in organic search. As of October 29, 2025 an app can have up to 70 CPPs.

### Cited Findings
- **Indexed fields:** app name (30 chars), subtitle (30), keyword field (100), in-app purchase display names, in-app event titles, and screenshot caption text ("added June 2025 via OCR"). The description is not indexed on iOS. — [SplitMetrics ranking factors, Sep 2025](https://splitmetrics.com/blog/apple-app-store-ranking-factors/); [AppScreenshotStudio indexed fields](https://appscreenshotstudio.com/tools/app-store-indexed-fields)
- **Field weight:** "The algorithm gives more weight to keywords in the title than to the same keywords anywhere else." The subtitle is second and the keyword field third. No numeric weights are published. — [ASOMobile 2026 ranking factors](https://asomobile.net/en/blog/app-store-listing-2026-what-actually-affects-rankings/)
- **Screenshot captions (conflicting):** AppsOps (May 30, 2026) says ranking data "from June 2025 forward" shows apps moving in rank after they added keywords to captions, starting in English-speaking markets. It says practitioners have reproduced this, Phiture and AppTweak have documented it, and Apple "has consistently declined to confirm." — [AppsOps](https://appsops.store/news/custom-product-pages-organic-search-caption-ranking-2026). ASOMobile (2026) disagrees: "Screenshots aren't directly indexed for text" and only affect ranking indirectly through conversion. — [ASOMobile](https://asomobile.net/en/blog/app-store-listing-2026-what-actually-affects-rankings/)
- **IAP and event fields:** IAPs and in-app events affect ranking through their title and description fields. — [ASOMobile](https://asomobile.net/en/blog/app-store-listing-2026-what-actually-affects-rankings/). One source gives the IAP name limit as 64 characters. — [SplitMetrics/AppScreenshotStudio via search snippet](https://appscreenshotstudio.com/tools/app-store-indexed-fields) (unverified; check the limit ASC actually enforces)
- **Download velocity and updates:** download velocity is treated as a ranking signal ("a sudden spike signals… traction"). "74% of the top 1,000 apps… update at least once a month" (42matters, via ASOMobile). The claim that inactivity is treated as abandonment is vendor opinion. — [ASOMobile](https://asomobile.net/en/blog/app-store-listing-2026-what-actually-affects-rankings/)
- **Cross-localization table (MobileAction, Apr 15, 2026):**
  - US: en-US plus Spanish (MX), Russian, Chinese (Simplified), Arabic, French, Portuguese (BR), Chinese (Traditional), Vietnamese, Korean.
  - India: Hindi plus English (UK).
  - France: French plus English (UK).
  - Germany, Brazil, Mexico, Indonesia, Vietnam, Thailand and Saudi Arabia: the local language plus English (UK).
  - UK: en-GB plus en-AU. Canada: en-CA plus fr-CA.
  - — [MobileAction cross-localization](https://www.mobileaction.co/blog/app-store-cross-localization/)
- **Phrases stay inside one locale:** "Phrase combinations only form within a single locale, not across them." Avoid repeating keywords across locales so each one adds new coverage. This is based on industry observation; Apple does not document it. — [MobileAction](https://www.mobileaction.co/blog/app-store-cross-localization/)
- **Size of the US opportunity:** the US has 9 secondary locales, so an app can index about 10 times the keyword space of a single locale. — [MobileAction / AppTweak via search](https://www.apptweak.com/en/aso-blog/how-to-benefit-from-cross-localization-on-the-app-store)
- **Keyword CPPs in organic search:** since July 2025, a CPP can appear in organic search when the app ranks for a keyword assigned to it, replacing the default page for that search. Keywords come from the keyword field. Each keyword combination can belong to only one page. — [Adapty CPP guide 2026](https://adapty.io/blog/custom-product-pages-app-store/); [MobileAction help: organic CPP results](https://helpcenter.mobileaction.co/en/organic-cpp-results)
- **CPP limit:** raised from 35 to 70 on October 29, 2025. — [Adapty](https://adapty.io/blog/custom-product-pages-app-store/); [AppsOps](https://appsops.store/news/custom-product-pages-organic-search-caption-ranking-2026)
- **CPPs are a competitive tactic:** casual games such as Solitaire Cash and Solitaire Smash run keyword-specific CPPs for high-intent keywords. — [AppTweak CPP explorer](https://www.apptweak.com/en/aso-blog/custom-product-pages-now-on-apptweak-app-store-examples?format=md)
- **Ranking volatility:** ASO World tracked "thousands of keyword ranking losses" in May 2026. — [AppsOps](https://appsops.store/news/custom-product-pages-organic-search-caption-ranking-2026)

### Inferences
- **Fix the en-GB listing first (high leverage).** en-GB is the secondary locale for India and France, the app's #1 and #3 countries, and for most of its other markets. If en-GB is missing or just copies en-US, the app misses a second English keyword field in all of those storefronts. Fill it with English long-tail terms that are not in en-US, and put audience words in the en-GB subtitle (for example "for kids & seniors").
- **Use the US secondary locales.** The app already ships ru, vi and ar-SA, and the US indexes Russian, Vietnamese and Arabic. Those keyword fields therefore also count in US search. A common practice is to add English long-tail terms to some of them, such as color, peg, code breaker, mastermind-style or offline. Risk: this can conflict with Apple's guideline that metadata should be relevant to the locale, so do it moderately. It may also be useful to add es-MX, fr-FR, pt-BR, zh-Hans, zh-Hant or ko if any of them are missing.
- **Rename the IAPs to carry keywords.** The display names of the $2.99 unlock and the tip IAPs are indexed. A name like "Unlock All Modes – Family Pack" helps search; a generic "Unlock" does not. Make sure the wording stays truthful, and do not imply any memory or brain benefit.
- **Put a keyword in each caption.** Whether captions are indexed is disputed, but a caption costs nothing extra. Give each of the first 3 screenshot captions one target keyword in plain words (for example "Color code puzzle for the whole family").
- **How many keywords a small app can rank for:** no source gave a reliable number (see Gaps). The practical approach is to aim for the top 10 on 2- to 3-word long-tail phrases with low competition rather than head terms like "memory game" or "puzzle". With 42 downloads a month, download velocity is too low to win head terms.
- **Map each CPP to a keyword cluster that isn't used elsewhere** (seniors, kids, no ads, color blind). Also put those words in the keyword field of the locale the CPP targets. A CPP can only use keywords the app already indexes.

### Gaps
- No public data says how many keywords a new app with fewer than 100 downloads a month typically ranks for. Vendor tools (AppTweak, Astro, MobileAction) show this per app, and it is worth checking in one of them.
- Apple has not confirmed the screenshot caption OCR indexing or the IAP name length limit.
- The exact list of US secondary locales differs slightly between sources, and Apple does not publish one.

---

## 2. Ratings and reviews

### Takeaway
Apple shows the summary rating on the product page and in search results. With 0 ratings in the US, search results show no stars at all, which probably hurts the 1.9% impression→page view rate. Apple allows a rating prompt 3 times in any 365 days and says to ask right after the user completes something. Every review can be answered. Resetting the summary rating is optional and Apple discourages it unless the rating is low.

### Cited Findings
- On timing: "Make the request when users are most likely to feel satisfaction with your app, such as when they've completed an action, level, or task. Make sure not to interrupt their activity." — [Apple: Ratings and reviews](https://developer.apple.com/app-store/ratings-and-reviews/)
- "You can prompt for ratings up to three times in a 365-day period." — [Apple](https://developer.apple.com/app-store/ratings-and-reviews/)
- On resets: the summary rating is per territory and can be reset with a new version, but Apple says to do it "sparingly… having few ratings may discourage potential users," and a reset does not remove written reviews. — [Apple](https://developer.apple.com/app-store/ratings-and-reviews/)
- On replies: "You can respond to all reviews of your app, regardless of when they were written." Replies should be concise and respectful, with no marketing language. — [Apple](https://developer.apple.com/app-store/ratings-and-reviews/)
- "Individual ratings inform your app's summary rating, which is displayed on your product page and in search results." — [Apple](https://developer.apple.com/app-store/ratings-and-reviews/)
- **Effect on conversion:** NP Digital (Apr 2024, 49 companies, so older data) measured relative conversion by star rating: 5★ = 1.00, 4.5★ = 0.96, 4★ = 0.83, 3★ = 0.57, 2★ = 0.15, 1★ = 0.08. — [Neil Patel](https://neilpatel.com/marketing-stats/app-downloads-vs-ratings/). Another vendor analysis reports CVR of 13.5% at 4.5–5★, 10.2% at 4.0–4.4★ (−24%), and 6.7% at 3.5–3.9★ (−50%). — [Unstar study](https://unstar.app/blog/how-negative-reviews-affect-app-downloads-data-study) (vendor source, methodology unclear)
- In a survey, 46% of respondents said 4★ is the lowest average rating they would accept. — [Alchemer](https://www.alchemer.com/resources/blog/mobile-ratings-good-bad-ugly/) (older survey, possibly outdated)
- **Effect on ranking (vendor claim, unconfirmed by Apple):** below 3.5★ means "noticeably lower visibility" and above 4.0★ rankings "start to improve." The rating trend matters, and recent reviews count more. — [ASOMobile 2026](https://asomobile.net/en/blog/app-store-listing-2026-what-actually-affects-rankings/)

### Inferences
- **Getting the first US ratings matters most.** With 0 ratings, the search card shows no stars. Ratings are per territory, so ratings from India do not appear in the US.
- **Use `StoreKit.requestReview` (SKStoreReviewController / expo-store-review).** Trigger it after a win, for example after the 3rd completed game, and never on a loss or during play. Don't show a pre-prompt that asks "Do you like it?"; Apple's guidance is not to interrupt. The "Liked it?" card on game over (commit c8685ea) is a natural place: call `requestReview` when the user taps a positive answer there. Since iOS shows the prompt at most 3 times a year, it does no harm to request on every eligible win.
- **Ask testers and friends in the US for real ratings.** Do not incentivize ratings; Apple guideline 5.6.x prohibits that.
- **Reply to every review in the main languages** (en, hi, fr). It is cheap and Apple encourages it.
- **Don't reset the rating.** There are too few ratings to make a reset worthwhile.

### Gaps
- I found no 2025–2026 study that quantifies the effect of rating *count* (as opposed to the average) on conversion, and none that measures what showing 0 ratings costs in search tap-through.

---

## 3. Screenshots, icon, video and conversion benchmarks

### Takeaway
The app converts well once people reach the product page (about 52% of page views become downloads). It loses people at the search and browse result: 1.9% of impressions become page views and about 1% become downloads. The US App Store average install rate (a download straight from the search or browse result) is about 3.8%. Games average lower than other categories, and board games are among the lowest at about 1.2%. Results on video are mixed, and Apple's own example test favored no video.

### Cited Findings
- **US App Store 2025 averages (AppTweak):** page view→download CVR 8.56% across categories (Google Play 16.15%). Install rate (direct download from search or browse results) 3.8%. Lowest category: Games–Trivia at 5.2% CVR. Highest: Food & Drink at 52.8%. — [AppTweak benchmarks per category](https://www.apptweak.com/en/aso-blog/average-app-conversion-rate-per-category?format=md)
- **Games targets (aggregator):** the snippet says "For games a realistic target is 3–5%" and "racing 20.6% while board games convert at just 1.2%." — [Adapty conversion rate](https://adapty.io/blog/app-store-conversion-rate/) (came from a search snippet; the metric definition was not verified)
- **iOS impression→install benchmark:** about 3.6–3.8%. — [AppTweak/Adapty via search](https://adapty.io/blog/app-store-conversion-rate/)
- **Kids, Family and Board benchmarks:** the AppTweak page I fetched does not break out Board, Puzzle, Family, Kids or Education. — [AppTweak](https://www.apptweak.com/en/aso-blog/average-app-conversion-rate-per-category?format=md)
- **Video previews: claims conflict.**
  - StoreMaven (2024, 500+ tests): video lifted conversion 20–35%, games highest at +35%.
  - SplitMetrics (2025, 200+ experiments): video beat static screenshots in 78% of tests, median +22%.
  - A 2026 analysis says "App preview videos don't reliably convert better than screenshots in 2026." It says the 20–40% figure traces back to an anecdotal vendor claim with no methodology, and cites Phiture that most users skip the video.
  - Sources for the above: [TrySonar](https://trysonar.app/blog/app-preview-video-conversion-impact); [AppScreenshotStudio 2026](https://appscreenshotstudio.com/blog/app-preview-videos-vs-screenshots-2026-conversion-data)
- **Apple's own PPO example:** the treatment added a preview video as the first asset. The original page without the video did better, "contrary to the developer's hypothesis." — [Apple: Product page optimization](https://developer.apple.com/app-store/product-page-optimization)
- **Games app (iOS 26) creative advice:** refresh video assets and check that screenshots render correctly in both the new landscape and portrait layouts. — [MobileAction: Apple's new Games app](https://www.mobileaction.co/blog/apples-new-games-app/)

### Inferences
- **The leak is before the product page.** An install rate of about 1% against a 3.8% average, together with a 52% page view→download rate, points to the search card: icon, name, first screenshots and missing stars. On iOS 27 the new search results asset is also part of that card. A PPO test changes the product page and *also* what appears in search, so the icon and first-3 screenshots test that is already planned is the right test. Judge it on impression→download, not page view→download.
- **Video:** don't use a video as the first asset unless a PPO test shows it wins. If you add one, keep it under 30 seconds and readable without sound (autoplay is muted), showing pegs falling into place within the first 2 seconds.
- **Test volume:** at about 4k impressions a month, a PPO test with 2–3 arms will take many weeks to reach confidence. Use a single treatment with bold changes (for example a different icon colour family) rather than small tweaks.
- **Kids, seniors and color-blind CPPs:** lead with large, high-contrast boards. For the color-blind page, show the symbol or pattern mode on screenshot 1. Captions should describe what is in the game ("Big pegs, easy to see", "Plays offline, no ads") and not claim any cognitive benefit.

### Gaps
- I did not find 2025–2026 icon A/B results specific to casual or family games, and no published iOS impression→download benchmark for the Kids or Family category. Using Board at about 1.2% as the nearest proxy is uncertain because the metric definition is unclear.

---

## 4. In-app events

### Takeaway
Games publish a lot of in-app events (more than half of the 2.68M events in 2025; about 190 per games app). Event cards are indexed for search, can appear under the app's card in search results (so the app shows twice for one query), and can be featured on the Today, Games and Apps tabs. I found no public quantified data on how much they lift downloads.

### Cited Findings
- 2.68M in-app events were published in 2025. Games account for more than half, averaging close to 190 events per app. — [MobileAction 2026 ASO report: IAE impact](https://www.mobileaction.co/report/2026-aso-report/in-app-events-and-their-aso-impact/)
- **Event types:** Special Event 38.3%, Major Update 23.7%, Premiere, Challenge, Live Event and New Season at about 8–9% each, Competition 3.8%. — [MobileAction](https://www.mobileaction.co/report/2026-aso-report/in-app-events-and-their-aso-impact/)
- Events are spread evenly across countries, each top country holding about 4% of all events. — [MobileAction by country](https://www.mobileaction.co/report/2026-aso-report/in-app-events-by-country/)
- That MobileAction report contains no quantified figures for downloads, rankings or conversion. — [MobileAction](https://www.mobileaction.co/report/2026-aso-report/in-app-events-and-their-aso-impact/)
- "In-App Events may appear on the Today, Games, and Apps tabs." In-app events are a nomination type. — [Apple: Getting featured](https://developer.apple.com/app-store/getting-featured/)
- In search, in-app events show beneath the product card, so a title can appear twice for the same query. MobileAction's advice is to run events continuously. — [MobileAction: Games app](https://www.mobileaction.co/blog/apples-new-games-app/)
- In-app events let you rank for more keywords, and you can target each event by country and language. — [AppTweak IAE](https://www.apptweak.com/en/aso-blog/in-app-events-are-now-available-on-apptweak-and-apptweak-only?format=md)

### Inferences
- **Run events back to back.** Event names and descriptions are indexed and each event card appears in search, so a continuous run of 1–4 week Challenge or Special Event events is close to a free extra listing and extra keyword slots. Give each event a keyword the main metadata doesn't cover (for example "Diwali Colors Challenge" for India, "Halloween Color Puzzle", "Grandparents Day Challenge").
- **Localize every event** into hi, fr and en-GB, since those are the top markets.
- **Nominate each event** at least 2 weeks ahead, or up to 3 months ahead for wider consideration (see section 5).
- **Event content must be real:** a new board theme or a daily challenge. The event card cannot just advertise the $2.99 unlock.

### Gaps
- I found no reliable 2025–2026 data on how much in-app events lift downloads or rankings. Apple's in-app event approval time was not confirmed here; it is typically similar to App Review, but plan at least a week to be safe.

---

## 5. Apple featuring

### Takeaway
Since 2024, nominations are made in App Store Connect under Featuring Nominations. Apple wants at least 2 weeks' notice and recommends up to 3 months for wider consideration. Apple lists six criteria: user experience, UI design, innovation, uniqueness, accessibility and localization. Apple also runs a permanent section for indie games.

### Cited Findings
- **Apple's criteria, verbatim:**
  - User experience
  - UI design
  - Innovation ("new technologies that solve a unique problem")
  - Uniqueness
  - Accessibility ("a great experience for a broad range of users with well integrated features")
  - Localization ("high-quality support for multiple languages with culturally relevant and appropriate content")
  - — [Apple: Getting featured](https://developer.apple.com/app-store/getting-featured/)
- **Nomination types:** new apps or games, significant updates, in-app events, developer stories, app launches. — [Apple](https://developer.apple.com/app-store/getting-featured/)
- "Please give our team a minimum of two weeks notice… we recommend submitting a nomination up to three months in advance." — [Apple](https://developer.apple.com/app-store/getting-featured/)
- "Whether you're an indie developer or a household name, you have an opportunity to be featured." — [Apple](https://developer.apple.com/app-store/getting-featured/)
- Featuring Nominations went live in App Store Connect in 2024 (TechCrunch, Nov 2024). — [TechCrunch](https://techcrunch.com/2024/11/13/apple-now-lets-app-developers-apply-to-be-featured-on-the-app-store); [AppleInsider, Jun 2024](https://appleinsider.com/articles/24/06/13/developers-can-now-nominate-apps-and-updates-for-app-store-promotions)
- Apple has a permanent App Store section for indie games, chosen by its editors. — [PocketGamer.biz](https://www.pocketgamer.biz/news/65307/apple-opens-permanent-app-store-page-for-indies/)
- One secondary source adds "product page quality" as a seventh scoring criterion. Apple's page does not list it. — [Gummicube / search snippet](https://www.gummicube.com/blog/featuring-nominations-live-in-app-store-connect)

### Inferences
- **The app's featuring case is strong.** It is accessible (a color-blind mode, large targets for seniors), has 20 locales including Arabic RTL, Hindi and Thai, and fits the family audience. The nomination should lead with **accessibility and localization**, the two criteria Apple names that most small games lack. Mention VoiceOver, Dynamic Type and Reduce Motion if the app supports them. Supporting Apple technologies such as Game Center challenges or iPad layouts helps both the "Innovation" criterion and visibility in the Games app.
- **Line up nominations with dates.** Submit an in-app event nomination about 6–8 weeks before seasonal moments (Diwali, the holidays, Grandparents Day), and a "significant update" nomination for each release.
- **Indie-game section:** the nomination text can call the app a solo-developer, offline, no-ads indie game.

### Gaps
- I did not verify specific recent examples of solo developers featured through nominations; none came up in my searches.
- No data on how often nominations from small developers lead to a feature.

---

## 6. New App Store features in 2025–2026 (creative assets for iOS 27, the Games app, Apple Ads, other changes)

### Takeaway
On October 5, 2026, Apple turned on **creative assets**: a product page header (3840×1646, 21:9) and a **search results asset** (3:2, 1920×1280 up to 3840×2560). Both are managed in an App Store Asset Library with a preview tool. They show only on iOS and iPadOS 27 and later, sit alongside screenshots rather than replacing them, can be used in PPO and CPPs, and are reviewed without a new app version. The **Games app** (iOS 26, fall 2025) recommends games by algorithm and puts in-app events and Game Center challenges at the center.

### Cited Findings
- **Creative assets:** Apple added product page headers, search result assets, the Asset Library and a preview tool that supports dark mode and different devices. — [Apple Developer News (Oct 2026)](https://developer.apple.com/news/?id=ljpl7kyn); see also [Apple: Get ready for new creative assets](https://developer.apple.com/news/?id=kug6m2ea)
- **Details:**
  - Launched Oct 5, 2026.
  - "show only on iOS 27 or iPadOS 27 and later."
  - "do not replace" screenshots or previews.
  - PPO supports "up to 3 treatments per test," each with its own Header and Search Results tab.
  - Assets are reviewed on their own, with "no new app version" needed.
  - Apple Ads custom creative was still "coming this fall."
  - Advice for indie apps: make the search results asset first, test one placement per PPO treatment, localize for the main markets, and submit seasonal assets as standalone submissions.
  - Screenshots for "iPhone Duo" will be required from April 2027.
  - — [Adapty: Asset Library](https://adapty.io/blog/app-store-asset-library/)
- **Sizes:** header 3840×1646; search results asset 1920×1280 to 3840×2560; JPG or PNG. — [Adapty / search summary](https://adapty.io/blog/app-store-asset-library/); [DEV.to](https://dev.to/teroxai/app-store-creative-assets-sizes-api-upload-and-review-231j)
- **Games app:**
  - Recommendations are "algorithm-driven… adapt to downloads, play activity, and personal interests."
  - In-app events appear under product cards in search.
  - Game Center challenges and other activities are emphasized.
  - The article noted no editorial collections at launch.
  - Games-specific impressions and downloads metrics in App Store Connect from Nov 2025.
  - Recommended actions: run in-app events continuously, try Game Center challenges, use metadata and tags well, and show iPad and Mac gameplay.
  - — [MobileAction: Apple's new Games app](https://www.mobileaction.co/blog/apples-new-games-app/)
- The Games app launched with iOS 26, iPadOS 26, macOS 26 and tvOS 26. Industry reaction has been mixed: some say it "doesn't fix discoverability." — [Gummicube](https://www.gummicube.com/blog/time-to-play-how-apples-new-games-app-could-shake-up-aso); [PocketGamer.biz Mobile Mavens](https://www.pocketgamer.biz/mobile-mavens-apple-games-reaction-and-a-feature-wish-list-for-the-app-store)

### Inferences
- **Make the search results asset a priority.** The app's biggest loss is at the search result, and this asset is the newest and largest creative on that card for iOS 27 users. Produce a clean 3:2 image showing a colorful board and one short text line ("No ads. Plays offline. For all ages."), localized for en, hi and fr. Test it in one PPO treatment. It reaches only iOS 27 users, so its effect grows as people update.
- **Seasonal swaps:** since assets don't need a new app version, header and search assets can change with each in-app event (Diwali, Halloween, the holidays) at low cost.
- **Game Center:** adding it (leaderboards or challenges) is worth considering for the Games app and its algorithmic recommendations. This is optional engineering work, and Expo needs a native module for it.
- **This repo already has a workflow for this:** the local `ship-ios-app` skill notes that it handles the Oct 2026 creative assets through the Asset Library API, so the tooling is in place.

### Gaps
- Apple has not published click-through or conversion data for search results assets or headers; the feature is 9 days old.
- When Apple Ads will support creative assets was unconfirmed as of the sources.

---

## 7. Apple Search Ads (now Apple Ads): is a tiny budget worth it?

### Takeaway
Average tap costs are high compared with a $2.99 unlock. SplitMetrics put the 2025 average CPT across the top 15 categories at $2.25 and Games at about $4.02, with a US median CPT of about $1.91. The top-15-market average CPT went from $1.60 (2024) to $2.90 (2025). At these prices, a US download will usually cost more than the revenue it brings, because only a fraction of downloads buy the unlock. A small, tightly limited exact-match budget makes sense mainly as a source of keyword data and to win brand searches, not as a profitable channel.

### Cited Findings
- 2025 average CPT across the top 15 categories was $2.25. The top-15-market average CPT went from $1.60 (2024) to $2.90 (2025). Games category CPT was $4.02 in 2025 (another source gives $4.21 for the US). The US median CPT for search results campaigns was $1.91. — [SplitMetrics Apple Ads cost](https://splitmetrics.com/blog/apple-search-ads-cost); [AppDeveloperMagazine on the SplitMetrics 2025 report](https://appdevelopermagazine.com/apple-ads-search-results-benchmarks-report-2025/); [AppTweak Apple Ads benchmarks 2025](https://www.apptweak.com/aso-blog/apple-ads-benchmarks?page=6)
- The SplitMetrics 2026 report covers 5M keywords, 6.3B impressions and 91 markets. Per-country figures (including India) are only in the gated full report. — [SplitMetrics 2026 by markets](https://splitmetrics.com/apple-ads-search-results-benchmarks-2026/benchmarks-by-markets)

### Inferences
- **Rough unit economics (my estimate, not sourced):** suppose the unlock converts 2–5% of downloads. After Apple's 15% Small Business Program cut, $2.99 nets about $2.54, so each download is worth about $0.05–$0.13. Assuming roughly 50% tap→download, a US tap at $1.91 means about $3.80 per download. That is not profitable.
- **Cheaper uses:** a cap of $5–10 a day in India or other lower-CPT markets, or on exact-match brand and long-tail terms (for example "color catch", "peg memory game"), can show which keywords convert, which in turn guides organic metadata. Apple Ads also accepts CPPs, so the planned seniors, kids and no-ads CPPs can be tested with paid traffic before relying on them organically.
- **Apple Ads may also help organic ranking** by adding download velocity on a target keyword. That is a widely held industry belief; Apple has not confirmed it.

### Gaps
- No verified CPT for India or for the kids/family subcategory. The SplitMetrics per-country data is gated.
- No benchmark for what share of downloads buy an IAP in casual or family games with a $2.99 unlock.

---

## 8. Google Play differences (if the app is ported)

### Takeaway
I found few 2025–2026 sources on this in the time available. The main known difference is that Google Play indexes the long description and has no hidden keyword field. Its conversion benchmarks are higher (AppTweak 2025 US average 16.15% vs 8.56% on iOS).

### Cited Findings
- Google Play's 2025 US average CVR was 16.15%, against 8.56% on the App Store. — [AppTweak](https://www.apptweak.com/en/aso-blog/average-app-conversion-rate-per-category?format=md)
- The iOS description is not indexed for search, which by implication differs from Play. — [SplitMetrics ranking factors](https://splitmetrics.com/blog/apple-app-store-ranking-factors/)
- General comparison: [AppRadar: iOS vs Android ASO differences](https://appradar.com/blog/differences-in-ios-android-aso-google-play-vs-app-store/) (I did not fetch it; the details are not verified here)

### Inferences
- From general practitioner knowledge, not verified in this session:
  - On Play, the title (30), short description (80) and full description (4,000) are all indexed. Work keywords naturally into the description and do not stuff them.
  - The Play equivalents of PPO and in-app events are Store Listing Experiments and Promotional Content. Custom store listings can target countries or pre-registration.
  - Play also weighs Android vitals and ratings heavily.
  - The "Teacher Approved" / Kids section requires the Families policy.

### Gaps
- I did not fetch current (2025–2026) Google Play ASO sources. Before any port, check against Google Play Console Help.
