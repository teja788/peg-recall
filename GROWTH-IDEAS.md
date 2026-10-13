# Color Catch: growth ideas (backlog)

Date: 2026-10-07. Status: **ideas, not decisions**. The one picked for the next build is the WhatsApp share (see `PLAN-v1.3.md`).

## Where we are

- Downloads, Sept 6 – Oct 6 2026: **27 new** (IN 12, FR 6, US 2, DK 2, EC/JP/MX 1). About 1 a day. 1 rating. Re-check with `node ~/.claude/skills/ship-ios-app/downloads.mjs 30 "Color Catch"`.
- 1.2.0 is in review: 14 store languages, new name "Color Catch: Memory Match Game", header + search-results images, the $2.99 unlock (the $1.99 level in 25 lower-income countries), and tips.
- At 1–2% of players paying, today's traffic means 0–1 unlocks a month. **Downloads are the bottleneck, not price or monetization.**

## Money options we looked at (and why not now)

| Option | Verdict |
|---|---|
| **Ads** | ≈ $0.005–0.01 per daily player per day after kids-safe (COPPA) limits; about $1–5/month at today's traffic. Breaks the "no ads" promise and "Data Not Collected". **No.** |
| **Publishers** (Voodoo, Homa, SayGames, Kwalee, CrazyLabs) | They sign games on ad-test metrics and earn from ads. Poor fit. |
| **Apple Arcade** | Great fit for a family game, but selective and favoring big brands lately. Pitch once we have retention numbers. |
| **Kids subscription apps** (licensing) | Possible, small money. One email each, later. |
| **"We market for a % of profit" agencies** | Mostly not real for tiny apps. Never pay upfront. |

## 1. Direct: more installs from the stores

| # | Idea | Effort | Notes |
|---|---|---|---|
| 1 | **Google Play release** | Owner ~1 h ($25 signup + ID check); ~1 day build | India (top country) is mostly Android. "memory chess" is unclaimed on Play. `app.json` already has an Android section. |
| 2 | **In-App Events**: Children's Day (Nov 14, IN), Diwali (Nov 8), Holi (Mar 2027) | ~1 h each | Events show in App Store search and can be featured. Free. |
| 3 | **Featuring nomination** for 1.2 ("now in 14 languages") | ~15 min | ASC → Featuring → Nominations, ≥3 weeks ahead. |
| 4 | **Ratings**: the in-app prompt exists (`src/store/reviewPrompt.ts`) | ~15 min check | Confirm it fires after a win on a real device. |
| 5 | **Hindi UI + listing**, then Telugu/Tamil | ~1 day for Hindi | No Indian language yet. Cheapest way into the top market. |

## 2. Indirect: people meet the game before an ad

| # | Idea | Effort | Notes |
|---|---|---|---|
| 1 | **WhatsApp-shareable results** + daily board | ~2 days | **Picked for 1.3.** Every share in a family group is a friend's recommendation. |
| 2 | **Free web version** (Small board) at a short link | ~½ day + a domain (~$10/yr) | The app already runs on web. Ranks for "memory game for seniors online" and opens straight from WhatsApp. "Get the full game" button. Also gives Android friends something to play. |
| 3 | **"Can you remember?" short videos** (Shorts/Reels/TikTok) | ~2 h to automate; owner posts 1/day | Board shows, pegs hide, "Where was the red one? Comment the number." Generated from the web build in 14 languages. |
| 4 | **Printable paper board** for teachers and therapists | ~2 h | A free PDF with a QR code to the app. Pinterest, teacher and OT groups, senior-home activity staff. |
| 5 | **Color-blind angle** | ~1 h to write the story | Shapes on pegs make it playable for color-blind kids, which is rare. Pitch to color-blind communities and accessibility writers. |

## 3. Creative: built on what's unusual about Color Catch

| # | Idea | Effort | Why |
|---|---|---|---|
| 1 | **Free unlock codes for teachers / OTs / senior-home staff** (Apple offer codes) | ~1 h, after 1.2 is approved | 100 codes, and each person shows it to dozens of kids or residents and recommends it to parents. |
| 2 | **Children's Day "Family memory challenge"** + printable "Memory Champion" certificate with a QR code | ~½ day | Fridge photos become ads. Deadline Nov 14. |
| 3 | **Holi edition** (free color theme + event + video + blog pitch) | ~1–2 days | Festival of colors + a color game + India as top market. March 2027. |
| 4 | **Play with grandparents over FaceTime (SharePlay)** | Several days | Apple features its own technologies; families spread across cities and countries. |
| 5 | **App Clip**: play a small board from a QR code, no install | Several days (Expo support is limited) | Posters at schools, libraries, senior centers. |

Wilder, later:
- **QR on wooden peg-board toys** (Montessori toy makers): "play the memory version", in exchange for promoting their toy.
- **iMessage game**: take your turn in a family chat, so every turn shows the app to someone new.

## 4. Online play (after 1.3; server choice not decided)

Order: **1.3 WhatsApp share → web version → online rooms.**

### 4a. Web version (~½ day)

- The Expo web build already runs. Host it on GitHub Pages (free) or the droplet. A short domain is optional (~$10/yr).
- Free on the web: the Small board + the daily board, with a "Get the full game" button to the App Store. No web payments (they would need Stripe).
- Payoff: Android and laptop friends play straight from a WhatsApp link.

### 4b. Online multiplayer rooms (~1.5 weeks)

Family in different cities, each on their own device: "Join my game: ABC123" as a WhatsApp link, invite-only, no chat, no public matchmaking.

Why it's feasible: the engine is a deterministic reducer (`createGame(config)` + `reduce(state, action)` with a serialisable RNG), so the server only relays the seed and each move, never whole boards.

App work (~4–5 days): create/join room, synced reveal timer, turn time limit, rejoin after a drop, the computer takes over a player who leaves, two-device testing (iPad + browser).

Server options (**not decided**):

| Option | Cost | Limits | Privacy | Notes |
|---|---|---|---|---|
| **DigitalOcean droplet** (owner's, if used) | Already paid | None that matter: the smallest droplet handles thousands of connections for turn-based moves | Relay in memory, store and log nothing → the "Data Not Collected" label can likely stay | ~1 day: Node WebSocket server, Caddy HTTPS on a subdomain, systemd, firewall, room-creation limit. The owner maintains it (a few minutes a month); if it's down, online play is down. Check its RAM and load first. |
| **Supabase free plan** | $0 | 200 concurrent connections (~70 three-player games at once); 2M messages/month (~8,000 games at ~250 messages per game) | A third party to declare in App Privacy + the privacy policy | **Pauses after 1 week without requests**, which breaks online play in quiet weeks unless a daily ping job keeps it alive. |
| **Apple Game Center (turn-based)** | $0 | iPhone/iPad only | Apple handles it | Leaves out Android friends (most of India), and invites are clunky. |

Leaning: the droplet, if the owner decides to use it.

## 5. Forums and communities

Read each community's self-promotion rules first; they change. Post once per community, reply to every comment, lead with a 10-second clip, and ask for feedback rather than downloads.

| Post now (developer posts allowed) | Later (strict rules, but the real audience) |
|---|---|
| r/apple "App Saturday" (Saturdays, pinned format) | Parenting / Montessori / homeschool Facebook groups (weekly promo day only) |
| r/iosgaming (say you made it) | Senior-activity and dementia-caregiver groups (ask the moderators first, share as "worked for our family") |
| r/IndieDev, r/indiegames (making-of story) | Common Sense Media (submit for a review) |
| r/developersIndia showcase thread, r/IndianGaming | Teacher and occupational-therapist groups |
| Product Hunt (one launch day) | |

## Skip for now

- **Apple Search Ads / paid installs:** about $2 per install against roughly $0.05 earned per install.
- **Ads:** see the table above.

## After 1.2.1 is live (tasks the owner approved on Oct 14 2026)

Each item needs the owner's OK before it is written to App Store Connect.

1. **Featuring nomination**: "Now in 18 languages, 4 players". Submit at least 3 weeks ahead.
2. **Product Page Optimization test**: the "Colorful first 3" screenshots plus the "Bright" icon (`store-assets/ppo-experiment.mjs`, dry-run by default).
3. **Unlock purchase description**: change it to "3 and 4 players".
4. **Custom product pages**, each linked to search keywords. Never claim the game improves memory.

| Page | Linked searches | Caption angle | When |
|---|---|---|---|
| Seniors | memory games for seniors | Big pegs, calm pace | First batch |
| Kids | memory game for kids | Bunny, colors | First batch |
| Family / party | 4 player games, family games | Up to 4 players on one iPad | First batch |
| No ads / offline | games without ads, offline games for kids | No ads, no Wi-Fi, no account | First batch |
| Color-blind | color blind games | Shapes on every peg | First batch |
| Road trip / travel | car games, travel games for kids | Play anywhere | Holidays |
| Classroom / therapy | memory game for classroom, OT games | Turn-taking for up to 4 | Later |
| Festivals | diwali / holi games | Pair with an India In-App Event | Seasonal |

In 1.3, the WhatsApp share link should open the Family page.

## From the Oct 2026 growth research (`reports/Color Catch growth research.md`)

**In progress (owner picked Oct 14):**
- In-app events for Diwali and Children's Day, plus the featuring nomination. Deadline Oct 24.
- en-GB keywords that differ from en-US.
- Unlock pricing: searchable purchase name, India ₹99, Family Sharing.
- 48-hour free-unlock offer code promo.
- Screenshots for the 6 new languages.
- Shorts and Reels clips.
- An in-app event calendar for the year.
- Seasonal custom pages: Road trip, Classroom, Festivals.

**Noted for later (not started):**
1. Ship 1.2.1, then get 5–10 honest US ratings from friends and reply to every review.
2. Accessibility Nutrition Labels in App Store Connect, after testing each one on the iPad.
3. Product Page Optimization test: the "Colorful first 3" screenshots plus the Bright icon.
4. First batch of custom product pages: Seniors, Kids, Family, No ads, Color-blind.
5. Free unlock codes for teachers, OTs, senior-activity staff and small family creators. Test one redemption first.
6. Google Play right after 1.3. The Families program brings Teacher Approved review; Hindi isn't a supported language for it.
7. Reddit posts (allowed slots only), the Golden Carers forum, and one press pitch built on the color-blind shapes, all at the Play or web launch.
8. Game #2, then a cross-app "Family Pass" lifetime unlock. Consider a subscription only at about 5 games.
9. Code ideas from the research: a guided first game against Bunny, a "Take your time" look option, a home-screen widget, and the tip jar moved after purchase.

**Don't do:** Apple Search Ads, Amazon Appstore (closed), Poki/CrazyGames (they force ads), Apple Arcade, TikTok as the main channel, Product Hunt, a subscription now, paid influencers.
