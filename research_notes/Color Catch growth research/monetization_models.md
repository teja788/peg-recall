# Monetization models for ad-free kids', family and senior casual games (Color Catch context)

Researched 2026-10-14. App context: Color Catch: Memory Match Game, free base plus a $2.99 one-time unlock, one free try of each locked item, tip jar ($0.99/$2.99/$4.99), about $1.99 regional price in 25 countries, no ads, about 42 downloads a month, 0 purchases, top markets India/US/France. Never claim memory benefits.

Labels: **[V]** = verified from a cited primary or near-primary source. **[E]** = estimate or inference by the researcher. **[U]** = unverified or secondary claim.

## Benchmarks: download→paid conversion and revenue per download (RPD)

### Takeaway
Gaming is the lowest-converting subscription category: the median install→paid rate is about 1.0%, and in India/SEA it is about 0.7% across all categories. At 42 downloads a month, the benchmark predicts roughly 0.3–0.4 purchases a month, so 0 purchases over a few months fits a median freemium game. The data does not show a pricing failure. Volume, not the price point, is the binding constraint.

### Cited Findings
- [V] RevenueCat State of Subscription Apps 2026 (data mostly from 2025), download-to-paid within 35 days (D35): overall median 2.0% (top quartile 4.5%+). **Gaming median 1.0% (top quartile 2.3%+)**. Education about 2.5%. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps/)
- [V] RevenueCat 2026, D35 by region: North America median 2.8% (top quartile 6.0%), Western Europe about 2.0%, **India/SEA median 0.7% (top quartile 1.9%)**, LATAM/MEA about 1.3–1.5%. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps/)
- [V] RevenueCat 2026, access model: **hard paywall median download→paid 10.7% vs freemium 2.1%**. D14 revenue per install (RPI) is $2.32 for hard-paywall apps vs $0.27 for freemium. D60 is $3.09 vs $0.38. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps/)
- [V] RevenueCat 2026, RPI (their closest metric to RPD): **Gaming D14 $0.08, D60 $0.14**, overall D60 $0.34. By region, D60 RPI is **North America $0.55, Western Europe $0.33, India/SEA $0.11**. D14 RPI for high-priced apps is $0.61 vs $0.08 for low-priced apps. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps/)
- [V] RevenueCat 2026, trial→paid: Gaming median 25.0%. India/SEA 15.2% vs North America 34.2% and Western Europe 29.7%. Trials of 17–32 days convert at 42.5% vs 25.5% for trials of 4 days or less. 73% of gaming apps use trials of 4 days or less, and 82% of gaming subscriptions sold are weekly. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps/)
- [V] RevenueCat 2026, first-year realized LTV per payer: Gaming $11.22 vs Health & Fitness $35.64. By region: North America $32, Western Europe $25, India/SEA $14. Median yearly price: $39.99 in North America, $18.32 in India/SEA. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps/)
- [V] RevenueCat 2026: "Gaming… impulse-driven categories… see lower conversion rates" than Business, Health & Fitness and Productivity. — [RevenueCat SOSA 2025 page](https://revenuecat.com/state-of-subscription-apps-2025)
- [V] Adapty 2025 (11,000+ apps, $1.9B revenue): **one-time purchases grew 6%**, and weekly plans are now nearly half of all subscriptions. "Mid-priced plans underperform. Low and high tiers retain better." "Higher prices don't hurt conversion as much as you'd expect." Annual plans have the highest refund rate (4.2%) and weekly the lowest (2.6%). The US earns about 49% of global in-app subscription revenue and Europe 24.8%. — [Adapty 2025 summary](https://adapty.io/blog/state-of-in-app-subscriptions-2025-in-10-minutes/)
- [U] Adapty: install→paid "without a trial reaches 18–38%, especially in Lifestyle and Productivity". This is almost certainly a share of paywall viewers or a hard-paywall context, not of all installs, so do not compare it with RevenueCat's D35. — [Adapty 2025 summary](https://adapty.io/blog/state-of-in-app-subscriptions-2025-in-10-minutes/)
- [V] Superwall: special offers to paywall abandoners "convert 25%+". In one case study, offering an extra trial to unsubscribed users raised trial starts by 240% and proceeds per user by 97%. These are vendor case studies, not neutral benchmarks. — [Superwall best practices](https://api.superwall.me/blog/superwall-best-practices-winning-paywall-strategies-and-experiments-to)

### Inferences
- [E] Expected revenue for Color Catch today: 42 downloads × gaming D60 RPI of $0.14 ≈ **$6/month gross**. Weighted for the India-heavy mix (India/SEA $0.11), it is more like **$3–6/month**. Expected purchases at a 0.7–1.0% conversion rate are **0.3–0.4 a month**, so roughly one purchase every 3 months is normal. A price change cannot move this much. Only download volume, or a different access model, can.
- [E] These benchmarks come from subscription apps on RevenueCat. No public dataset gives download→paid rates for one-time unlocks in kids' or casual games specifically. Treat 0.5–2% as the plausible band for a freemium unlock in a casual game: 0.5% for India-heavy traffic, up to about 2% for US/EU parents who reach the paywall.
- [E] The 5× gap between hard paywalls and freemium mostly reflects selection: apps that can hard-paywall have high intent. A memory-match game competes with many free games, so a hard paywall would likely cut downloads and ratings more than it raises conversion. Keep a soft paywall.
- [E] The French and US share of downloads matters far more than India for revenue. One US/FR buyer is worth about 3–5 India downloads at benchmark rates.

### Gaps
- No public benchmark segments the Kids or Family category for one-time unlocks. RevenueCat's full 263-page PDF may break out "Kids". The public page does not.
- No 2024–26 public data on paid-upfront download→purchase rates. Page-view→install conversion for paid apps is in App Store Connect analytics but is not published in aggregate.
- RevenueCat's figures for France alone are not public. Western Europe is the closest proxy.

## Kids'/family subscription libraries: prices, trials, conversion; is a multi-game subscription viable for a solo dev?

### Takeaway
Kids' subscription libraries charge about $6–13 a month and $30–90+ a year, and sell a "lifetime" tier around $60–90. They succeed with dozens of games, recognizable IP or big content teams, and the strongest free competitors (Khan Kids, PBS Kids) charge nothing. A solo dev with fewer than about 5–8 genuinely distinct games has little to justify a recurring fee. A lifetime cross-game unlock, or Apple App Bundles, is the realistic intermediate step.

### Cited Findings
- [V] Sago Mini World: $6.99/month. The **Piknik Unlimited bundle** costs $11.99/month and covers Sago Mini World, Sago Mini School, Sago Mini First Words, Toca Boca Jr, Hair Salon 4, MathTango, PAW Patrol Academy, Crayon Club, Superfonik and Gabby's Dollhouse. That is a multi-studio catalog under Spin Master. — [Sago Mini help: cost](https://help.sagomini.com/article/382-how-much-does-the-subscription-cost-how-does-it-work); [Sago Mini help: plans](https://help.sagomini.com/article/361-what-type-of-subscription-plans-are-offered-for-sago-mini-world)
- [U] Pok Pok (ages 2–8, Montessori-inspired, Family Sharing supported): price listings vary between sources and over time. Reported tiers are $6.99/month or $45.99/year, alternatively $9.99/month or $59.99/year, plus **lifetime $89.99**. A third-party deal site sold lifetime at **$59.99** in May 2026. One older review cites about $4/month or $30/year. — [Pok Pok App Store](https://apps.apple.com/us/app/pok-pok-montessori-preschool/id1550204730); [Boing Boing deal, May 2026](https://boingboing.net/2026/05/11/careful-parents-this-calmer-kids-app-is-59-99-for-life-right-now.html)
- [V] Lingokids Plus: about $13.49/month or $161.88/year in USD (varies by platform and country), with a 7-day free trial. — [Lingokids help](https://help.lingokids.com/hc/en-us/articles/9522217000209-How-much-does-Plus-subscription-cost)
- [U] Toca Boca Days: about $5.99/month at introductory pricing (aggregator site). — [Subger](https://subger.com/en/nz/service/toca-boca-world)
- [V] Khan Academy Kids is free, with no ads and no subscription. PBS Kids Games is free, with no ads and no IAP. These are the free reference points parents compare against. — [Khan Academy Kids App Store](https://apps.apple.com/US/app/id1378467217); [Subger PBS Kids](https://subger.com/en/ie/service/pbs-kids-games)
- [V] Apple Arcade: $6.99/month or $49.99/year in the US, one-month free trial (three months with a new Apple device), shared with up to the family group. Sago Mini Trips+ is in Arcade. — [Goal.com Arcade explainer](https://www.goal.com/en-us/news/what-is-apple-arcade-price-best-games-free-trial-how-it-works/blte1790995a151f1c1); [MacTech, Apr 2024](https://www.mactech.com/2024/04/05/sago-mini-trips-puyo-puyo-puzzle-pop-super-monster-ate-my-condo-now-available-on-apple-arcade/amp/)
- [V] RevenueCat 2026: "The subscription divide is accelerating": the top 25% of apps grew 80% YoY while the bottom 25% shrank 33%. **69% of subscription revenue comes from apps launched before 2020.** — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps/)
- [V] Superwall frames lifetime pricing as a trade-off: it "can capture subscription-averse buyers or quietly cap your LTV". — [Superwall: lifetime or no lifetime](https://superwall.com/solutions/lifetime-or-no-lifetime)

### Inferences
- [E] None of these companies publishes conversion rates. The Kids-category conversion rate is unknown publicly. Use RevenueCat's Education (about 2.5%) and Gaming (1.0%) medians as bounds.
- [E] Viability threshold for a solo-dev family subscription: competitors ask $6–13/month for 10+ apps or continuously refreshed content. At $2.99/month or $19.99/year (below Arcade's $6.99), a solo catalog needs regular new content (for example a new game or mode every 1–2 months) so subscribers keep seeing new value. Before a subscription makes sense, the owner should have about 4–6 shipped games with a combined 1,000+ downloads a month. At 1% conversion, 1,000 downloads a month gives about 10 new subscribers a month. That is a guess-level threshold, not a sourced one.
- [E] A better path for a solo dev is cross-app ownership: a "Family Pass" lifetime unlock (non-consumable, or the App Store's App Bundle for paid apps), with a subscription only once the catalog justifies it. Pok Pok's lifetime tier ($60–90) shows kids'-app parents accept a one-off "lifetime" price.
- [E] Free, ad-free, well-funded rivals (Khan Kids, PBS Kids) and Arcade's $6.99 family plan cap what parents will pay a small developer monthly.

### Gaps
- No public trial→paid or install→paid figures for Pok Pok, Sago Mini, Toca Boca or Lingokids.
- Current verified Pok Pok and Toca Days prices: App Store pages render IAP lists dynamically, and the aggregator figures disagree.
- No found postmortem of a solo dev running a multi-game kids' subscription.

## Apple Arcade: entry, deal terms, realism for a small family game

### Takeaway
Arcade is curated and invite/pitch-based. It funds family-friendly titles with long-term retention, often with recognizable IP, but bonus-pool payouts have fallen and payments have run months late. A 42-downloads-a-month game that has already shipped on the App Store does not qualify as "new". At best it would be a pitch for a new, bigger "+" title. That is not a realistic near-term revenue plan for Color Catch.

### Cited Findings
- [V] Apple has a developer page where studios can pitch games, and some studios were signed on a concept and wireframes. **The hard criterion: the game must not have been previously released.** — [9to5Mac, 2019](https://9to5mac.com/2019/05/13/apple-arcade-developer-pitch/); [iDropNews](https://www.idropnews.com/news/apple-now-inviting-developers-to-apply-for-apple-arcade/101059)
- [V] Later Arcade added "+" versions of existing App Store games, for example Sago Mini Trips+, but these are mostly established studios or IP. — [MacRumors, Apr 2024](https://macrumors.com/2024/04/04/apple-arcade-april-4-games)
- [V] Deal structure: an upfront development payment plus a "Bonus Pool" paid on "qualifying sessions" (launches, play time, return frequency). Early deals "covered our whole development budget". Bonus-pool payments started declining around October 2020. — [mobilegamer.biz, 2023](https://mobilegamer.biz/inside-apple-arcade-axed-games-declining-payouts-disillusioned-studios-and-an-uncertain-future/); [mobilegamer.biz, Jul 2024](https://mobilegamer.biz/inside-apple-arcade-again-late-payments-stonewalled-studios-terrible-tech-support-and-vision-pro-woes/)
- [V] July 2024: developers reported **2–6 months of late bonus-pool payments**, and one indie studio nearly went out of business. Apple increasingly prioritizes "family friendly IP attached to a genre with long-term retention" (for example Hello Kitty Island Adventure). — [mobilegamer.biz, Jul 2024](https://mobilegamer.biz/inside-apple-arcade-again-late-payments-stonewalled-studios-terrible-tech-support-and-vision-pro-woes/)
- [U] Advances of "$1–3 million" are cited in secondary coverage, but these are high-end figures for studio titles, not solo deals. — search snippet via [pocketgamer.biz](https://www.pocketgamer.biz/apple-investing-500-million-in-apple-arcade-games)

### Inferences
- [E] Arcade is realistic only for a new, much larger family title, ideally with a hook such as multiplayer pass-and-play for grandparents and kids. It would need a pitch deck and a vertical slice. Expect long silence or a rejection. Treat it as a lottery ticket, not a plan.
- [E] Arcade forbids IAP and ads, which matches the owner's ethos. An existing App Store release likely disqualifies Color Catch itself except as a "+" invitation, which Apple extends to established hits.

### Gaps
- No public 2025–26 interview with a solo or very small developer describing an Arcade deal amount.
- Current official Arcade pitch requirements could not be fetched. The developer page is not indexed in search.

## One-time unlock best practices (price, framing, timing, offer codes, win-back, bundles, Family Sharing)

### Takeaway
Keep the soft paywall and the one free try (a good "try before buy" pattern). Make the paywall contextual: show it at the moment the free try ends and after a win. Frame the unlock as a family-wide, lifetime purchase with no subscription and no ads. Test $2.99 vs $3.99/$4.99 in US/EU, because price barely moves conversion at this volume. Use the 2025 offer-code support for non-consumables for parent communities and press.

### Cited Findings
- [V] Since 2025, **offer codes support all In-App Purchase types, including non-consumables**. Apple is retiring IAP promo codes: from **March 26, 2026** they can no longer be created in App Store Connect, and offer codes replace them. — [9to5Mac, Jun 2025](https://9to5mac.com/2025/06/16/apple-let-iphone-games-offer-promo-codes-for-in-app-purchases/); [BGR](https://www.bgr.com/2011787/apple-retire-in-app-purchase-promo-codes/); [MacTrast, Oct 2025](https://www.mactrast.com/2025/10/apple-announces-new-features-for-app-store-developers/amp/)
- [V] A developer forum thread (2026) reports offer-code redemption failing with "This promotional offer is not available" for a non-consumable. Test a code end to end before distributing. — [Apple Developer Forums](https://developer.apple.com/forums/thread/824524)
- [V] Adapty 2025: mid-priced plans underperform, while low and high tiers do better. Higher prices hurt conversion less than expected. — [Adapty 2025 summary](https://adapty.io/blog/state-of-in-app-subscriptions-2025-in-10-minutes/)
- [V] RevenueCat 2026: high-priced apps earn 7.6× the D14 RPI of low-priced apps ($0.61 vs $0.08), and first-year realized LTV per payer is 5–6× higher. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps/)
- [V] Superwall vendor data: special offers for abandoners convert 25%+, and tailored paywalls outperform generic ones by 15%+. — [Superwall best practices](https://api.superwall.me/blog/superwall-best-practices-winning-paywall-strategies-and-experiments-to); [Superwall: high-converting moments](https://superwall.dev/blog/show-a-paywall-during-these-three-high-converting-app-experiences)
- [V] Superwall supports A/B tests of lifetime vs subscription paywalls and counts a paid one-time IAP as a "conversion". — [Superwall pricing FAQ](https://superwall.com/docs/support/faq/2801653905-how-does-superwalls-pricing-work.md)
- [U] Family Sharing: from Apple's App Store Connect documentation (not re-fetched; the URL returned 404 during this session), non-consumables and auto-renewable subscriptions can be shared with up to 5 other family members. **Once turned on, Family Sharing cannot be turned off for that product.** Confirm in App Store Connect before toggling.

### Inferences
- [E] Price: at about 0.4 purchases a month, a statistically valid A/B price test is impossible (it would need hundreds of paywall views per arm). Pick by reasoning instead. **$3.99 or $4.99 "one-time, whole family, forever"** in US/FR/UK/DE is defensible: it sits well below Pok Pok's lifetime price and Arcade's $6.99/month, and RevenueCat and Adapty both find higher prices cost less conversion than expected. Keep about Rs 99–199 for India (see India section). If changing price, change it once and compare 90-day proceeds per download before and after. Do not A/B test.
- [E] Turn on Family Sharing for the unlock. It is the honest selling point for a pass-and-play family game ("buy once, the whole family gets it"). It may slightly reduce unit sales in multi-device households, but it supports the 2–4-player positioning. It is irreversible, so decide deliberately.
- [E] Timing: the strongest moments are (1) when the free try of a locked item ends ("Liked it? Unlock for the whole family"), (2) right after a win or a close 3–4-player game, and (3) an "all modes" screen reached from the home screen. The repo already has "Liked it? / Ready for more?" cards on game over (commit c8685ea), which matches these. Avoid interrupting gameplay. Kids' apps also need a parental gate before purchase, a requirement of App Store Guideline 1.3 for the Kids Category.
- [E] Win-back for non-consumables: Apple's win-back offers apply to subscriptions only. For a one-time unlock, the substitutes are (a) a one-time introductory price shown after a second declined paywall, using a second non-consumable SKU or a temporary price change, and (b) offer codes shared via a website, email list or parent groups.
- [E] Bundles: App Store "App Bundles" apply to paid apps only (up to 10 apps), not to IAP in free apps. A cross-game "Family Pass" for free-with-IAP games needs a shared account, a receipt check, or separate non-consumables in each app. Revisit when there is a second game.
- [E] Tip jar placement: keep it, but put it on the post-unlock thank-you screen and in Settings ("Support a solo developer"), not competing with the unlock on the paywall.

### Gaps
- No public A/B results for $1.99 vs $2.99 vs $4.99 one-time unlocks in kids' or casual games (2024–26).
- No quantitative data on the effect of the Family Sharing toggle on sales.
- No public data on an "after the free try" paywall versus other placements for one-time unlocks.

## Tip jars: do they earn anything?

### Takeaway
Tip jars earn small, irregular amounts. The documented cases show them working only where the app already has a loyal audience, or where the tip also does something (for example removes ads). With about 42 downloads a month, expect close to $0. Keep the tip jar as a low-cost goodwill feature, not a revenue line.

### Cited Findings
- [V] David Smith (Pedometer++): the tip jar "didn't do as well" until he added ads, after which a tip also removed them and more people paid. Reported via Ole Begemann (2016, older but the canonical case). — [oleb.net](https://oleb.net/blog/2016/03/fake-ads-as-a-business-model/)
- [V] Peter Porfy (No Ads 2048): when given several tip amounts, players chose the higher-value tips more often. No revenue totals are given. — summarized in search results; see [Wayline postmortem roundup](https://www.wayline.io/blog/indie-dev-monetization-postmortem)
- [V] RevenueCat documents a tip-jar implementation pattern but publishes no conversion benchmark for it. — [RevenueCat blog](https://www.revenuecat.com/blog/engineering/building-a-tip-jar-feature-with-revenuecat)

### Inferences
- [E] Tip-jar conversion is likely an order of magnitude below an unlock's, so far under 0.1% of downloads for a small game. Its value is in giving fans a way to pay after they already own the unlock.
- [E] Showing three tip amounts (as Color Catch does) is consistent with the Porfy anecdote.

### Gaps
- No 2024–26 dataset on tip-jar revenue share in games.

## Paid upfront games in 2025–2026: viable for family games?

### Takeaway
Paid upfront is a tiny slice of mobile gaming revenue. Even the median premium game earns very little, and discovery collapses when there is no free download. A $1.99–$4.99 paid family memory game with no marketing would likely get far fewer downloads than the free version, and its revenue would probably be similar or lower. Not recommended now.

### Cited Findings
- [V, older] 2022 data (published January 2023): 1,211 premium mobile games released, 53M total downloads, $296M revenue (about 0.3% of mobile gaming revenue, down 23% YoY). **All-premium-game median: $30k net revenue and 6,000 downloads. Top-100 median: $700k and 167k downloads.** Minecraft was about $100M of the total. The article does not attribute its data source. — [Jules Baculard, Game Musings, Jan 2023](https://julesbaculard.substack.com/p/are-premium-games-on-mobile-dead)
- [U] A claim that "premium mobile game releases jumped 77% in 2025, reaching just under 750 titles" appears in secondary blog content. No primary source was found, and the figure conflicts with the 1,211 releases in 2022. Treat as unverified. — [choostgames blog](https://choostgames.com/blog/best-premium-mobile-games-no-microtransactions-2026/)
- [U] "Median indie iOS app earns less than $500/month" is attributed to a RevenueCat 2025 survey by a secondary source. — [Wayline](https://www.wayline.io/blog/mobile-game-pricing-models-monetization-practices)
- [V] Premium successes such as Balatro ($10), Dead Cells and Vampire Survivors are established PC/console IP, not mobile-first family titles. — same Wayline source; [PocketGamer.biz Mavens: are paid apps dead?](https://www.pocketgamer.biz/indie-mavens-are-paid-apps-dead/)

### Inferences
- [E] Freemium with a fair unlock (the current model) is the right default for a 42-downloads-a-month app. Paid upfront fits only if the developer has an audience or press coverage. The free try is the substitute for a demo.

### Gaps
- No verified 2025–26 dataset on premium mobile games (Sensor Tower and AppMagic reports are paywalled).

## India-specific pricing

### Takeaway
iOS is about 8% of Indian smartphones, but those users are relatively affluent (Apple holds 58% of the premium segment). Even so, India/SEA converts at about a third of North American rates, with about a fifth of the revenue per install. Apple allows India prices as low as Rs 10, so Rs 99 for the unlock and Rs 49/99/199 for tips are sensible. India's value is mostly as download volume and ranking signal, not revenue.

### Cited Findings
- [V] Apple's unit market share in India is about 8% (vs 58% in the US). Apple holds 58% of the premium segment and shipped more than 14M units in India in 2025. — search summary of [AppsFlyer India 2025](https://www.appsflyer.com/resources/reports/india-app-marketing/) and Apple Pay India coverage ([Khaleej Times](https://www.khaleejtimes.com/business/tech/apple-pay-launches-india)). The 8% figure comes from the search snippet. Confirm with Counterpoint or IDC if the report needs it to be precise.
- [V] More than 80% of India's digital payments run through UPI. Apple Pay launched in India via Axis Bank (cards in Wallet). — [Khaleej Times](https://www.khaleejtimes.com/business/tech/apple-pay-launches-india); [iGeeksBlog](https://www.igeeksblog.com/why-apple-pay-is-not-available-in-india/)
- [V] India iOS UA budgets rose 17% in 2025 while overall UA spend fell 15%, driven by Android cuts. — [AppsFlyer India 2025](https://www.appsflyer.com/resources/reports/india-app-marketing/)
- [V] Apple enabled India prices as low as **Rs 10 and Rs 30** (alternate tiers). Previously the lowest tier was $0.99 = Rs 60. — [FoneArena](https://www.fonearena.com/blog/148316/apple-now-allows-developers-to-price-their-ios-apps-as-low-as-rs-10-on-the-app-store.html/amp)
- [V, old] India game pricing experts (2015) called Rs 10–30 a "sweet spot" and noted "Rs. 60 in India is not the equivalent of $1 in USA". Payment friction (low card use) was a bigger barrier than price. Localized pricing elsewhere raised transactions by 1100% and revenue by 400% (a Facebook case). — [PocketGamer.biz Indian Mavens, Jul 2015](https://pocketgamer.biz/asia/mobile-mavens/61622/indian-mavens-whats-indias-ideal-price-point/)
- [V] RevenueCat 2026: India/SEA D35 conversion 0.7% median, trial→paid 15.2%, D60 RPI $0.11, median yearly price $18.32 (about half of North America's). — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps/)

### Inferences
- [E] Rs 99 vs Rs 199: Rs 99 (about $1.15) is a common impulse threshold for Indian iOS users. Rs 199 (about $2.30) is close to the current about-$1.99 regional price. With an India purchase expected roughly once a year at current volume, the choice barely matters to revenue. **Rs 99 is the better choice** because it maximizes the chance of any purchase and of goodwill reviews. This is a judgment, not a measured result.
- [E] Apple ID payments in India accept UPI as a payment method (widely reported since about 2021). That removes the card barrier noted in 2015. Not verified in this session; see Gaps.

### Gaps
- No direct citation was fetched confirming UPI as an Apple ID payment method in India (it is widely known but unverified here).
- No 2024–26 data comparing Rs 99 vs Rs 199 conversion.
- The precise 2025 iOS share in India (Counterpoint or IDC) was not fetched.

## Other revenue: physical tie-ins, printables, schools, senior centers/therapists, sponsorship

### Takeaway
B2B through Apple School Manager or Business Manager volume purchasing does **not** work with IAP-based apps. It would require a separate paid "Classroom/Care Edition" app or a Custom App, eligible for Apple's 50% education volume discount at 20+ licenses. The physical board-game companion model exists (Plague Inc, Little Alchemists), but there the app supports the physical product, not the reverse. No solo-dev example of selling a wooden peg board alongside an app was found.

### Cited Findings
- [V] Apple: "In-app purchases and subscriptions are not compatible with volume purchasing, Managed Apps or Managed Apple IDs." Developers may offer a separate full-featured version, sometimes as a Custom App, for education or enterprise deployment. — [Apple School Manager guide](https://support.apple.com/guide/deployment-education/edub2bcccc1f/web); [Apple School Manager user guide](https://support.apple.com/en-ca/guide/apple-school-manager/axme19b23f7f/web)
- [V] Apple's volume purchasing gives approved educational institutions **50% off when buying 20+ copies** of the same app, unless the developer opts out (introduced in 2010, still part of the program). — [AppleInsider](https://appleinsider.com/articles/10/08/10/apple_offers_volume_educational_discounts_for_app_store_purchases); [TechCrunch](https://techcrunch.com/2010/08/09/apple-now-allowing-developers-to-sell-their-apps-with-an-educational-discount-choose-when-updates-go-live/)
- [V] Companion apps for physical games exist, are usually free, and support the board-game sale: Plague Inc: The Board Game (Ndemic), Little Alchemists (CGE), Outsmarted (QPlay). — [PI Board Game Companion](https://apps.apple.com/ug/app/pi-board-game-companion-app/id1124500826); [Little Alchemists Companion](https://apps.apple.com/us/app/-/id6475880741); [QPlay](https://marlvel.ai/publishers/qplay-ltd)

### Inferences
- [E] Schools and senior centers: build a paid "Color Catch Classroom" or "Color Catch for Groups" app (everything unlocked, no IAP, no tips) at $4.99–9.99. Schools and care organizations can then buy it through volume purchasing, at 50% off for 20+ copies in education. Marketing must avoid any cognitive or memory health claims. Describe it as "a calm turn-taking color game for groups". Do this only after an inbound request, because it doubles maintenance (YAGNI).
- [E] Physical product: a wooden peg/color board sold on Etsy or Amazon would be a separate manufacturing and fulfilment business with inventory risk. Low-cost tests come first: a free printable "play it on paper" PDF on the website to collect emails, then a print-on-demand or dropship listing. No evidence was found that this earns more than the app for a solo developer.
- [E] Sponsorship: no examples were found for a game this small. Sponsors want reach, which 42 downloads a month does not provide.

### Gaps
- No examples of solo developers selling a wooden or physical version of a digital memory game, or licensing a casual game to senior-care or therapy providers. Searches returned only board-game companion apps.
- No data on revenue from printable packs for casual kids' games.

---

### Summary recommendations (all [E], derived from the above)
1. **Keep the model**: free base, one-time family unlock, one free try per locked item, no ads. It matches benchmarks and the brand. Zero purchases at 42 downloads a month is the statistically expected result. Put effort into downloads (ASO, localization, product page), not monetization changes.
2. **Price**: US/EU/UK/FR at $3.99, or $4.99 framed as "One price. Whole family. Forever. No ads, no subscription." India at Rs 99, and other low-income regions at about a $0.99–1.49 equivalent. Change price once, then judge over 90 days. Do not A/B test at this volume.
3. **Family Sharing ON** for the unlock (irreversible; it fits the 2–4-player family positioning).
4. **Paywall**: shown when the free try ends and after a win, with a parental gate, and comparing free vs full features in a short list. Optionally add one discounted offer after a second decline, using a second non-consumable at a lower price or an offer code.
5. **Offer codes** (now supported for non-consumables) for parent bloggers, teachers and press. Test redemption first.
6. **Tip jar**: keep it, but move it after purchase and into Settings. Expect about $0.
7. **Future model**: (a) ship game #2, then (b) add a cross-game "Family Pass" lifetime unlock, then (c) consider a subscription ($2.99/month or $19.99/year, 1-month trial, Family Sharing) only once there are about 5+ games and about 1,000+ downloads a month across the catalog. Treat Apple Arcade as a pitch for a new, bigger title, not for Color Catch.
8. **B2B** only on inbound demand: a separate paid "Groups/Classroom" app (volume purchasing does not support IAP).
