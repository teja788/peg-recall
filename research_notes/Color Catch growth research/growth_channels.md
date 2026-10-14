# Off-store growth and distribution channels for Color Catch (tiny, zero-budget, solo-dev family memory game)

Context: Color Catch: Memory Match Game (iOS, Expo, so Android/web possible). Roughly 42 downloads/month; top countries India, US, France. Already planned: v1.3 WhatsApp share + daily board, free web version, Google Play. Never claim memory or brain-health benefits.
Research date: 2026-10-14. About 20 searches/fetches. Many sources are secondary (agency blogs, guides). That is flagged where it matters.

## Ranking: which channels give the most installs per hour of owner time

### Takeaway
No source measures "installs per hour" for a game this small, so the ranking below is an inference from the evidence in the sections that follow. Product-built loops (WhatsApp share, a web version, Google Play listing) come first: you build them once and they keep working. Recurring manual promotion (short video, Reddit, pitching press) comes after.

### Cited Findings
- Platform built-in spread worked for Wordle: players typed emoji grids by hand, then the developer automated a spoiler-free share. People shared results "in WhatsApp chats, Facebook posts and texts to their mom" — [TechCrunch](https://techcrunch.com/?p=2256733); [AOL/NYT coverage](https://www.aol.com/news/wordle-brought-tens-millions-users-150000203.html)
- In 2025–2026, organic TikTok reach for games collapsed. Reels and Shorts outperformed TikTok for 85–90% of the creators Owlcat tested — [CloutBoost](https://www.cloutboost.com/blog/tiktoks-changing-landscape-for-game-marketing-in-2026-what-developers-need-to-know)
- Google Play Teacher Approved review is automatic for eligible Families apps, with no pitching needed — [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/10075896?hl=en)

### Inferences (ranked by expected installs per owner-hour, highest first)
1. **WhatsApp share card + daily board (v1.3, already planned).** Build once, compounds. India is WhatsApp's largest market. Best ratio if the share text carries a link and a reason to tap (today's board, beat my score).
2. **Google Play launch + Families/Teacher Approved opt-in.** One-off work (Expo build + listing). It opens the roughly 95%-Android India market and an automatic expert review queue. Note that Hindi is not a Teacher Approved language, but English is.
3. **Free web version on own domain, with app-store badges + SEO landing page + OG preview for WhatsApp links.** One-off. It also makes the WhatsApp links playable at once, with no install needed. Poki and CrazyGames are a poor fit (see the web section).
4. **Cross-promo from the owner's own apps (water reminder, Vivekananda archive).** About 1 hour and free. The volume is capped by those apps' own small user bases.
5. **Short video (YouTube Shorts + Instagram Reels, faceless, "Where was the red peg?" format).** Repeatable with batch-recorded clips. Outcomes are spread out: most posts get little, and a rare one breaks out. Medium expected value per hour, high variance.
6. **Reddit, in the narrow permitted slots** (r/iosgaming Saturday megathread, r/AndroidGaming [DEV] posts after Play launch, r/WebGames for the web build, r/ColorBlind if mods allow). Low cost per post. Expect tens of installs, not hundreds.
7. **Seniors, OT and teacher niches (activity-director forums, homeschool FB groups, Pinterest pins to the web version).** Slow, but word of mouth inside facilities and families could last. Medium-low per hour.
8. **Press/reviewers (Common Sense Media, AppAdvice, Pocket Gamer, TouchArcade).** Low hit rate for a small memory game. Do one batch pitch only, after something newsworthy (Play launch, web launch, color-blind shapes angle).
9. **Product Hunt / Show HN.** Wrong audience (tech/devs), with a low chance of reaching families. Skip, or treat as a one-off for backlinks to the web version.
10. **Paid micro-influencers / install-exchange networks.** Out of budget. Free gifting to nano family creators is the only version worth trying.

### Gaps
- No public data on install conversion from WhatsApp share links or OG previews for small casual games.
- No benchmark found for "installs per Short/Reel" for a mobile casual game this small. The Zukowski data is about Steam wishlists.

## Short video (TikTok, YouTube Shorts, Instagram Reels): do interactive puzzle videos work, and how?

### Takeaway
Use Shorts and Reels, not TikTok. TikTok is banned in India, and its organic game reach collapsed in 2025. Viral short videos do turn into real conversions for indie games (Steam evidence). An interactive "remember where the red one was" format suits Color Catch, but no case study of a mobile memory game exists.

### Cited Findings
- Owlcat Games: one creator got 425.8K views on a sponsored TikTok in June 2025 and 6K for similar content in November 2025. For 85–90% of creators tested, "all other platforms performed significantly better than TikTok. Reels and Shorts consistently delivered higher organic reach." Owlcat: "Instagram Reels is currently more promising, at least for visually driven and casual titles. YouTube Shorts is interesting too." — [CloutBoost](https://www.cloutboost.com/blog/tiktoks-changing-landscape-for-game-marketing-in-2026-what-developers-need-to-know)
- A Webbing Journey (150K TikTok followers) saw sharp view declines in late 2025 — [CloutBoost](https://www.cloutboost.com/blog/tiktoks-changing-landscape-for-game-marketing-in-2026-what-developers-need-to-know)
- Chris Zukowski (How To Market A Game): a viral TikTok usually drives about 1,000–2,000 wishlists. Example cases: 571K views produced about 2,900 wishlists, and 715K views produced about 13,000 — [howtomarketagame.com](https://howtomarketagame.com/2022/02/14/how-to-go-viral-on-tiktok/) (2022 data, pre-decline)
- Recommended cadence from one 2025 indie GTM playbook: 3 shorts/week of 5–10s, cross-posted to TikTok/Reels/Shorts — [Medium / Bootcamp](https://medium.com/design-bootcamp/entering-indie-games-in-2025-a-senior-engineers-go-to-market-playbook-cdc507f3bf0f) (opinion, single author)
- User-generated clips in the first 2–3 weeks are a leading indicator of virality — [same Medium playbook](https://medium.com/design-bootcamp/entering-indie-games-in-2025-a-senior-engineers-go-to-market-playbook-cdc507f3bf0f)
- India context: Instagram tops user attention in North India — [Storyboard18 on Lumikai](https://www.storyboard18.com/how-it-works/instagram-tops-user-attention-north-india-favours-tinder-gaming-up-by-30-lumikai-64314.htm). Indian players' main motivations are relaxation (75%) and social connection (51%), and 44% of players are women — [Outlook Respawn on Lumikai 2025](https://respawn.outlookindia.com/gaming/gaming-news/lumikai-india-gaming-market-1-5-billion-rmg-ban-2025)

### Inferences
- **Format playbook (faceless, about 30 min/week once templated):** a 7–12s vertical clip. The board shows for 3s → the pegs hide → the die rolls "RED" → on-screen text "Where was red? Comment 1–9" → pause → reveal. This is a quiz-bait loop that drives comments, and comments are the engagement signal. The board's colorful wooden look fits Reels' visual-casual tilt.
- Batch-record 10–20 clips from the simulator or web build in one sitting. Post 3/week to Shorts + Reels with the same file. Use Hindi/English on-screen text variants for India. Avoid "train your brain" or "improve memory" captions, because of the no-health-claims rule. Use "Can you remember?" or "Grandma vs grandkid" instead.
- Grandparent-vs-grandkid pass-and-play clips (real family, faces optional, hands only) are the most on-brand format. They also map to the Lumikai "social connection" motive.
- Put a link-in-bio to the web version, so a viewer can play instantly. Store links in Shorts descriptions are not clickable in most surfaces.

### Gaps
- No found case study of a mobile memory, peg or kids game growing via organic Shorts/Reels in 2024–2026.
- No reliable India-specific Shorts/Reels game-conversion data. The YouTube Shorts India daily-view figure was not found.
- The TikTok ban in India comes from the brief, not from a source fetched in this research.

## WhatsApp: share mechanics that spread in India

### Takeaway
The proven pattern is a spoiler-free, glanceable result grid (Wordle) plus a game people play together with family (Ludo King's family-group spread). Color Catch's v1.3 share should combine both: an emoji result that names today's board, plus a one-tap link that opens a playable web board.

### Cited Findings
- India is WhatsApp's largest market, at about 535.8M users — [go4whatsup 2026 stats guide](https://www.go4whatsup.com/guides/whatsapp-marketing-statistics/) (secondary aggregator, unverified)
- Wordle: the sharing feature was added after users made emoji grids by hand. The grid format was spoiler-free and easy to share, and it spread via WhatsApp, Facebook and texts — [TechCrunch](https://techcrunch.com/?p=2256733); [aakashg analysis](https://www.aakashg.com/2022/01/20/wordle/)
- Wordle brought "tens of millions" of new users to the NYT — [AOL](https://www.aol.com/news/wordle-brought-tens-millions-users-150000203.html)
- Ludo King: grew 400% in 2020, driven by word of mouth. Its 5- and 6-player modes were added to "bond with family, friends and their extended family group." 320M people played during lockdown, and DAU went from about 25M to 43M — [afaqs](https://afaqs.com/news/mktg/ludo-king-grew-400-in-2020-vikash-jaiswal-gametion-technologies); [MongoDB case study](https://mongodb.com/company/blog/innovation/mongo-db-atlas-powers-half-a-billion-players-of-india-s-favorite-mobile-pastime-ludo-king)
- About 70% of Ludo King users are aged 18–34 — [afaqs](https://afaqs.com/news/mktg/ludo-king-grew-400-in-2020-vikash-jaiswal-gametion-technologies)

### Inferences
- **v1.3 share text template:** "Color Catch Daily #42 🟥🟩🟦 found 9/9 in 14 taps ⭐ — can you beat me? <link>". The emoji uses the game's colors, and it stays spoiler-free because it does not reveal peg positions.
- The link should go to the owner's web domain with OG tags (title, 1200×630 image of today's board). WhatsApp renders link previews from OG tags. The page should let the recipient play today's board in the browser, then show App Store/Play badges. This cuts the "install before fun" step that kills conversion.
- Ludo King's lesson for Color Catch is the family-group context, more than invite codes. Frame shares as challenges to the family group ("Nani scored 8/9!").
- WhatsApp Channels: low priority. A channel with zero followers has no discovery value. Only worth it later as a "daily board" broadcast if the share loop works.
- Measure with UTM parameters on the web link (e.g. `?src=wa`) and App Store campaign tokens (`ct=wa_share`) in App Store Connect analytics.

### Gaps
- No found data on Ludo King's specific invite/room-code share mechanics or conversion rates.
- No found data on WhatsApp Channels discovery or MAU for India.
- The Wordle evidence is from 2022, outside the 2024–2026 window, but still the canonical case.

## Communities: Reddit, Product Hunt, Hacker News, Facebook groups, Pinterest

### Takeaway
Reddit allows developer promotion only in narrow slots, and breaking the rules gets the post removed. Product Hunt and Show HN reach tech audiences, not families. Facebook groups for homeschoolers and activity directors, and Pinterest for teachers, are better-matched audiences, but no hard data was found on them.

### Cited Findings
- Subreddit rules as indexed 2026-10-13 — [ThreadFox rules index](https://threadfox.vip/rules/for/games):
  - r/iosgaming (268K): "No Dev Self-Promotion Outside Saturday Megathreads"
  - r/AndroidGaming (430K): self-promo posts must start with [DEV] and follow the self-promo guidelines
  - r/indiegames (340K): promotion must include image/gif/video of gameplay
  - r/WebGames (145K): link directly to the browser game; the title must start with the game name
  - r/playmygame (145K): include a direct link
  - r/IndieDev (454K): state ownership plainly and post useful content
  - r/MobileGaming, r/FreeGameFindings: promotion permitted with moderation requirements
- r/indiegames: no URL shorteners; gameplay media required — [Thread Otter](https://www.threadotter.com/subreddit-rules/indiegames)
- The informal Reddit "10% rule" (9 non-promotional contributions per promo post). Ignoring buried self-promo rules is the most common indie mistake — [CloutBoost Reddit guide](https://www.cloutboost.com/blog/how-to-market-a-video-game-on-reddit-the-complete-2025-guide-for-game-developers); [gtstu](https://gtstu.com/promote-indie-game-reddit-without-ban/)
- Product Hunt sees 500+ launches/day in 2026, and its algorithm favors established brands. Show HN suits developer tools and technical products — [Pinggy](https://pinggy.io/blog/best_producthunt_alternatives/) (secondary)

### Inferences
- **Reddit playbook (about 1–2 h total per launch moment):**
  - Saturday r/iosgaming megathread comment with a 10s GIF.
  - r/AndroidGaming "[DEV]" post at Play launch.
  - r/WebGames link post at web launch. This is the best fit, because it is no-install and the rules explicitly allow it.
  - r/indiegames post with a gameplay GIF.
- r/ColorBlind, r/Parenting, r/teachers and r/occupationaltherapy were not in the index. Read their sidebars first. Frame posts as asking for feedback ("I added shapes for color-blind players, does this work for you?") rather than as ads.
- r/AppHookup only matters if there is a paid unlock to discount. The $2.99 unlock exists, so a temporary price drop on the unlock could qualify. Check rules first (not verified here).
- Product Hunt / Show HN: skip for growth. A Show HN of the open web version ("built with Expo, one codebase iOS/web") might get dev interest and backlinks, but not families.

### Gaps
- Rules for r/AppHookup, r/ColorBlind, r/Parenting, r/teachers and r/occupationaltherapy were not verified.
- No data on install counts from Reddit posts for small mobile games.
- No sources found on Facebook homeschool or activity-director groups' promo rules, or on Pinterest-to-app conversion for teachers.

## Teachers, occupational/speech therapists, senior centers and memory cafés

### Takeaway
The only structured, free, no-pitch path is Google Play's Teacher Approved queue. It is automatic for eligible Families apps, with an English/French badge path. Senior-care adoption runs through activity-director forums and word of mouth, where simple tap games are already recommended. Common Sense Media is editorial-only, with no developer submission route found.

### Cited Findings
- Teacher Approved: eligible apps that comply with the Families policy are "automatically submitted." Experts rate quality and age-appropriateness, and approved apps get a badge and may appear on the Kids tab — [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/10075896?hl=en)
- Supported languages: English, French, German, Indonesian, Japanese, Korean, Portuguese, Russian, Spanish, Turkish and Arabic. Hindi is not supported — [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/10075896?hl=en)
- Excluded: apps "designed to be used with an adult," apps "designed primarily for classroom use," and apps with "social features that allow children to interact with other users." Status is visible in Play Console → Policy and programs → Teacher approved — [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/10075896?hl=en)
- Common Sense Media ratings are "created by expert reviewers and aren't influenced by the product's creators." No developer submission process was found — [Common Sense Media press release](https://www.commonsensemedia.org/press-releases/kids-media-app-helps-parents-find-the-best-apps-games-movies-and-more)
- Activity directors share iPad app picks on Golden Carers forums. They name simple tap-and-respond apps (BabyBubbles, Pocket Pond, JigZone) as useful for residents — [Golden Carers forum](https://www.goldencarers.com/comments/17395/); [Provider Magazine](https://www.providermagazine.com/Issues/2012/Pages/1112/Apps-Offer-Therapeutic-Entertainment-.aspx) (older)
- Linked Senior is a commercial resident-engagement platform bundling games for senior care — [App Store](https://apps.apple.com/app/id1083819582)

### Inferences
- **Teacher Approved risk:** pass-and-play could be read as "designed to be used with an adult." Vs-computer solo play is the main mode, so position the listing that way. Local pass-and-play is not "social features that allow children to interact with other users" (that rule is about online interaction), but this is unverified.
- **Seniors playbook (about 2 h):**
  - Post once in the Golden Carers forum and similar activity-director communities. Frame it as a big-peg, high-contrast, shapes-for-color-blind, no-ads, offline group game for an iPad on a table. Avoid any memory or cognitive claims.
  - Offer a printable "group play" activity sheet on the web domain.
- **OT/SLP/teachers:** a Pinterest pin of the web version ("free color matching game for kids, no ads") linking to the domain is low-effort and evergreen. It is untested.
- Common Sense Media: emailing their editorial team is possible but low-yield.

### Gaps
- Teachers with Apps, Educational App Store and Apple Distinguished Educator outreach were not researched (out of tool budget).
- No evidence on memory cafés or OT/SLP app discovery channels.
- No data on Teacher Approved approval rates or timelines.

## Press and reviewers

### Takeaway
No 2024–2026 evidence was found that kids' app review sites or mobile gaming press cover tiny memory games. Treat press as a single, low-effort batch pitch around a news hook. Of the possible angles, accessibility (shapes for color-blind players) is the most distinctive.

### Cited Findings
- Common Sense Media reviews are editorially independent of creators — [Common Sense Media](https://www.commonsensemedia.org/press-releases/kids-media-app-helps-parents-find-the-best-apps-games-movies-and-more)

### Inferences
- **Batch pitch, about 1.5 h:** one short email with a 30s video, a press kit (on the own domain) and a TestFlight/promo access offer. Send it to AppAdvice, Pocket Gamer (they take submissions), TouchArcade, Common Sense Media editorial and 1–2 color-blind accessibility blogs. Time it at Play or web launch.
- Avoid brain-health framing. Pitch it as "a no-ads, offline family game with color-blind shapes, playable by 2–4 people on one iPad."

### Gaps
- Pocket Gamer, TouchArcade, AppAdvice and 9to5Mac submission policies and current coverage of indie casual games were not verified. TouchArcade's editorial status in 2024–2026 was not checked.
- Children's Technology Review and Kidscreen developer submission paths were not found.
- Apple's promo code changes for 2026 were not verified. Apple has been moving to offer codes, so check App Store Connect before promising "promo codes" to reviewers.

## Web version: does a free browser version drive app installs? Portals?

### Takeaway
Major portals (Poki, CrazyGames) are curated and ad-revenue driven. Poki requires its own ad SDK and bans external requests, which conflicts with Color Catch's "no ads" identity and the goal of linking out to stores. An own-domain web build is the better fit, as the landing page for WhatsApp/Shorts/Pinterest traffic plus SEO. itch.io and r/WebGames are low-cost extra exposure.

### Cited Findings
- Poki: developers get 100% of ad revenue on traffic they bring and 50/50 on traffic Poki brings. It has 100M monthly active players and 625M players in 2025 — [Cinevva guide](https://app.cinevva.com/guides/publish-game-poki); [PocketGamer.biz](https://www.pocketgamer.biz/inside-pokis-vision-for-the-future-of-browser-gaming/)
- Poki requirements: under 8MB initial download, 16:9 canvas, Poki SDK, "no external requests," "only Poki's ad system permitted." Human-reviewed staged funnel, where 25% of 500 testers must play 3+ min (Player Fit Test), followed by a Web Fit Test and soft launch. Typical new-game earnings of $500–3,000/month — [Cinevva guide](https://app.cinevva.com/guides/publish-game-poki) (third-party guide, not official Poki docs; the earnings figure is unverified)
- CrazyGames sessions were short (a few minutes) versus over an hour on itch.io for the same game — [80.lv on SuperWEIRD devs](https://80.lv/articles/how-this-indie-dev-kept-their-game-on-the-front-page-of-itch-for-an-entire-month)
- r/WebGames allows a direct browser-game link post, with the title starting with the game name — [ThreadFox](https://threadfox.vip/rules/for/games)

### Inferences
- **Own domain is primary.** Build one page per intent, e.g. "free memory game online for seniors," "color matching game for kids no ads," "color blind friendly memory game." Each page has the web game embedded, App Store/Play badges and OG previews. This doubles as the WhatsApp share target and the press kit home.
- **Poki:** probably not worth it. It needs ads, likely blocks store links (unverified), and requires an 8MB/16:9 build (Expo web output may need trimming). CrazyGames is similar, and its rules were not verified.
- **itch.io:** free and quick (about 30 min). It allows external links. Small family audience, but it is a backlink and a home for feedback.
- Measure web-to-install with App Store campaign links (`ct=web`).

### Gaps
- No postmortem found showing that a web version of a mobile game measurably drove app installs.
- CrazyGames' developer revenue share and external-link policy were not fetched. Poki's exclusivity and store-link policy were not confirmed from official docs.

## Google Play and Amazon Appstore / Fire tablets

### Takeaway
Google Play is essential for India and gives a free shot at Teacher Approved. Amazon closed its Appstore on general Android in August 2025 and stopped accepting new apps. It still runs on Fire tablets, but it is effectively closed to a new Color Catch submission.

### Cited Findings
- The Amazon Appstore on Android phones/tablets closed on August 20, 2025. Amazon is "no longer accepting new apps," and the store continues only on Fire TV and Fire tablets. Amazon Coins were discontinued too — [Exchange4Media](https://www.exchange4media.com/digital-news/amazon-pulls-the-plug-on-android-appstore-effective-august-20-146500.html); [Android Central](https://www.androidcentral.com/apps-software/amazon-will-suspend-support-for-its-appstore-on-android); [mobilegamer.biz](https://mobilegamer.biz/amazon-is-closing-its-android-app-store/)
- Teacher Approved: approved apps may appear on the Play Kids tab; see the teachers section above — [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/10075896?hl=en)
- India: 555M gamers (down 9%), 66% from non-metro cities, and a $1.5B market growing 17% — [Outlook Respawn on Lumikai 2025](https://respawn.outlookindia.com/gaming/gaming-news/lumikai-india-gaming-market-1-5-billion-rmg-ban-2025)

### Inferences
- Ship Play with Hindi + English listings, and enroll in the Families program to trigger the Teacher Approved queue.
- Non-metro India players likely have low-end Android devices, so keep the APK/AAB small. That fits the offline, no-account design.
- Skip Amazon. The sources say it accepts no new apps; whether this also covers Fire-only submissions is unconfirmed.

### Gaps
- Whether Amazon still accepts brand-new apps for Fire tablets only after August 2025 is ambiguous across sources. Amazon Kids+ inclusion for indies was not researched.
- An authoritative 2025–2026 source for India's roughly 95% Android share was not fetched (the figure comes from the brief).

## Cross-promotion with the owner's other apps and install-exchange networks

### Takeaway
Promoting the game inside the owner's own apps is free and takes about an hour, but reach is capped by those apps' small user bases. No current, reputable free cross-promo exchange for indie games was found.

### Cited Findings
- None found specific to indie cross-promo networks in 2024–2026.

### Inferences
- Add a single "More from the developer" row in the water-reminder and Vivekananda apps (App Store link with `ct=xpromo`). The Vivekananda audience in India skews toward families and older users, which overlaps with Color Catch's seniors/family audience.
- Do not use ad-based exchanges: they conflict with the no-ads brand and the kids audience under Families/Kids-category rules.

### Gaps
- No data on current install-exchange networks (e.g. historical Tapdaq/Chartboost cross-promo) or their Kids-policy compatibility.

## Influencers: micro-influencers for parenting, grandparenting and Indian families

### Takeaway
Paid placements are out of budget except at the nano tier (about ₹2,000–8,000 per Reel in India). Free gifting (a free unlock) to nano family creators who already post game-night content is the only zero-budget variant. No results data was found for kids or family app campaigns.

### Cited Findings
- India nano creators (1K–10K) charge ₹2,000–8,000 per post/Reel with 6–12% engagement. Micro creators (10K–100K) charge ₹8,000–80,000 per deliverable with 3–7% engagement. Nano rates "barely moved" over two years — [upGrowth 2026](https://upgrowth.in/influencer-marketing-pricing-india-2026/)
- Conflicting much lower per-post figures (₹14–150 by niche) appear on a directory site. These look like per-unit metrics, not per-post fees, so treat them as unreliable — [elev8or](https://www.elev8or.io/find/instagram-tech-influencers-in-india)
- The TikTok sponsored-post reach collapse also affects paid placements — [CloutBoost](https://www.cloutboost.com/blog/tiktoks-changing-landscape-for-game-marketing-in-2026-what-developers-need-to-know)

### Inferences
- **Zero-budget version (about 2 h):**
  - Find 10–20 Indian and US Instagram nano creators posting "family game night," "grandparents" or "kids activities" Reels.
  - DM them an offer of the full unlock (via the App Store offer code mechanism) with no obligation.
  - Expect a low reply rate.
- Never script health or memory claims for creators. This also matters for advertising disclosure rules.

### Gaps
- No case study of install results from family or parenting micro-influencers for a casual game.
- US and France rate cards were not researched.
