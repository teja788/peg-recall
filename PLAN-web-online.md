# Color Catch: web version and online rooms

Date: 2026-10-27. Status: **plan, nothing built yet.** Google Play is **paused** (owner, Oct 27).

Owner, Oct 27: the website and the web game go on **Cloudflare Pages** (D2 ✅). The domain will be bought later (D1). The server host (D3) and the money model (D4) are still open, so the plan keeps both open and says in §3 when each one is needed.

Related: `GROWTH-IDEAS.md` §4 (first sketch of web + online), `PLAN-v1.3.md` (daily board, share).

---

## 0. The plan on one page

**What we build**

1. **Web version.** The same game in any browser, at a short link like `play.colorcatch.app`. Free: Small and Classic boards, Bunny and Fox, 2 players, and the daily board. Everything else says "In the app".
2. **Online rooms.** A family in different cities plays one game, each person on their own phone, tablet or laptop. The host creates a room, sends the link on WhatsApp, and the others tap it and join. iPhone app, iPad app and browser can all be in the same room. Invite-only, no chat, no strangers, no accounts.

**Why**

- 96 downloads and 0 purchases. Most players leave on day 1 (retention under 4%), and the free game covers what a family needs.
- Most players in India (the top country) use Android and can't play today.
- A room brings 1 to 3 new people per game, and it gives families a reason to come back each week.

**How it earns money: the host pays, guests play free.** Joining is always free, in the app or in a browser. Hosting a room for 3 or 4 people, or on the Big and Huge boards, needs the existing $2.99 unlock.

**Order:** web version → room server → online play in the web version as a family beta (no App Review needed) → the iOS release with online play.

**Effort:** about 15 working days, plus one TestFlight round and App Review.
**Running cost:** about $1–7 a month, plus a domain at about $10–15 a year.

---

## 1. Where we start (checked on Oct 27)

| Fact | What it means |
|---|---|
| `npx expo export -p web` works today: one 3 MB JavaScript file (**680 KB gzipped**). Home and the daily board load and play in Chromium with no errors. | The web version is mostly hosting and a few fixes, not new code. |
| Opening `/game?mode=ai` directly on a plain static server gives **404**. | The export is a single-page app. The host must send every unknown path to `index.html`, or room links break. |
| `src/store/purchases.web.ts` **unlocks everything for free** once the math question is answered (a test stub). | It must not go public as it is (§A2). |
| Free tries are saved in `localStorage`, which a browser can clear at any time. | On the web, unlimited free tries. So the web gets no tries. |
| `teja788.github.io/peg-recall` is a subfolder of a GitHub user site. Apple's link file has to sit at the root of a domain. | iPhone links that open straight into the app (universal links) need **our own domain** (D1). |
| The engine (`src/engine`) is pure TypeScript. A game is fully set by `config.seed` plus the list of actions. A wrong action returns the same state and never throws. No clock and no `Math.random` inside. | **The server can run exactly the same rules code.** That is the core of the online design (§B3). |
| `src/store/game.ts` mixes three things: the computer's turns, animation timing, and the zustand store. | It has to be split before online play (§B4). |
| Not in the Kids Category, rated 4+, "Data Not Collected", no push entitlement. | Online play must keep these (§B9). |

**SDK 55 config, checked in `@expo/config-types` 55** (docs.expo.dev was blocked from this session; read the SDK 55 docs again before coding, as AGENTS.md says):
- `web.output: 'single' | 'static' | 'server'`. The default is `single`.
- `experiments.baseUrl`, for hosting under a subpath. We don't need it if the web version sits at the root of its own hostname.
- `ios.associatedDomains`, for universal links.
- In `single` mode the CLI uses **`public/index.html`** as the page template if it exists, and copies `public/` into the export. So `public/.well-known/apple-app-site-association` is deployed with the site.
- `app/+native-intent.ts`, if an incoming link ever has to be rewritten before the router sees it.

---

## 2. Design principles

1. **One game everywhere.** One codebase (React Native for web), one rules engine. The server imports the same `src/engine`.
2. **The server is the referee.** Phones send taps ("I roll", "I pick peg 12"). The server checks each tap with the real rules, numbers it, and sends it to everyone. Every device applies the same actions in the same order, so all screens show the same game.
3. **Hide the network.** The die starts tumbling the moment you tap it, and the server's answer (well under 300 ms) arrives during the 600 ms tumble. A peg tap shows a press at once and flips when the answer comes back.
4. **Never leave a family waiting.** A phone that locks or drops out doesn't stop the game: the computer plays that turn and the points stay with the player.
5. **No sign-up.** A name and an animal, as in pass-and-play today. No email, no account, no password.
6. **Safe by design.** Invite-only, no chat, no public lobby, no profiles. The only text other people see is a player's name.
7. **Store nothing.** Rooms live in the server's memory and disappear after the game. No database. Logs have no names and no IP addresses.
8. **Host anywhere.** The server is one Node program (or one Docker image) with a few settings. It runs on a droplet, a VPS, Fly.io or Railway, anything that stays on.
9. **Easy for grandparents.** Number codes, big type, one tap from WhatsApp, and a name remembered for next time.

---

## Part A. Web version

### A1. What web players get

| | Web (free) | iPhone/iPad app, free | App + unlock |
|---|---|---|---|
| Boards | Small, Classic | Small, Classic (+1 free try each of Big, Huge) | all |
| Computer | Bunny, Fox | Bunny, Fox (+1 try of Owl) | + Owl |
| Pass and play | 2 players | 2 (+1 try each of 3 and 4) | 2–4 |
| Daily board (Big at weekends) | ✓ | ✓ | ✓ |
| Join an online room (any board, any size) | ✓ | ✓ | ✓ |
| Host an online room | free host limits (§B2) | free host limits | full |
| Buy, tips, restore, reminders, review prompt, alternate icon, haptics | — | ✓ | ✓ |

On the web, locked items show **"In the app"** instead of "Try free", and tapping one opens a **"Get the full game"** sheet: the perks, then "Get it on the App Store" on iPhone/iPad, "Android version coming later" on Android, and a QR code on a computer so the player can scan it with their phone.

### A2. Code changes

| # | File | Change |
|---|---|---|
| 1 | `src/store/purchases.web.ts` | No fake purchase in production. `buy()` returns `'failed'` and `loadPrices()` returns `{}`. The fake flow stays only under `__DEV__` for local tests. |
| 2 | `src/ui/UnlockSheet.tsx` | On web, render a `GetAppSheet`: the same perk list, App Store button, Android line, and an optional QR code (`react-native-qrcode-svg`, or a pre-rendered SVG of the App Store URL, which needs no dependency). |
| 3 | `src/store/settingsModel.ts` | `canTry` / `isOpen` get a `triesAllowed` flag. Callers pass `Platform.OS !== 'web'`, so the model stays pure and testable. |
| 4 | `app/index.tsx`, `src/ui/controls.tsx` | Web badge "In the app" in place of "Try free" (new i18n key). |
| 5 | `app/settings.tsx` | Hide Restore, Tips, Reminder and Icon rows on web. Add a "Get the app" row. |
| 6 | `public/index.html` (new) | The page template: `<title>`, description, Open Graph tags (the 1200×630 header image) for WhatsApp previews, `theme-color`, Smart App Banner `<meta name="apple-itunes-app" content="app-id=6813625311">`, a link to `manifest.json`, and a **CSS loading screen** (teal backdrop + "Color Catch") so the 680 KB load never shows a white page in WhatsApp's browser. |
| 7 | `public/manifest.json` + icons | "Add to Home Screen" gives Android families an app icon. Small cost, worth it while there's no Play release. |
| 8 | `public/.well-known/apple-app-site-association` | For universal links (§B7). |
| 9 | Sounds | Browsers block audio until the first tap. Check that the first roll sound plays after a tap on iOS Safari and Android Chrome. |
| 10 | Language | Check that `expo-localization` picks up `navigator.language` in all 28 UI languages, Arabic RTL included. |

### A3. Addresses (example domain `colorcatch.app`; the owner picks the real one, D1)

| Address | What | Hosted on |
|---|---|---|
| `colorcatch.app/` | Landing page (today's `docs/index.html` + a big **Play in your browser** button). Google indexes this. | static host |
| `colorcatch.app/privacy`, `/support` | Same pages as now. **Keep `teja788.github.io/peg-recall/privacy.html` working**: App Store Connect links to it. | static host |
| `play.colorcatch.app/` | The web game (single-page app, no `baseUrl`). | static host, every path → `index.html` |
| `play.colorcatch.app/join/482913` | Room invite link: opens the iOS app if installed, the browser if not. | same |
| `rooms.colorcatch.app` | Room server (WebSocket at `/ws`, `/health`). | droplet / any server |

The site and the room server are independent: either can move to another host without touching the other.

**Until the domain is bought:** everything runs on Cloudflare's free address, for example `colorcatch.pages.dev`, with invites like `colorcatch.pages.dev/join/482913`. That is enough for W1, R2 and the web beta. Adding the domain later in Cloudflare is a settings change, not a code change. The one exception: the iOS app has the invite domain built in (`associatedDomains`), so **buy the domain before R4**. Otherwise the first iOS release with online play would point at the `pages.dev` address forever, or need a second update.

### A4. Where the web version can live

| Option | Cost | Good | Watch out |
|---|---|---|---|
| **Cloudflare Pages** (recommended) | $0 | Fast in India, sends every path to `index.html` by default, `_headers` file for cache rules and the Apple link file | One more account |
| Same server as the rooms (Caddy serves the files) | $0 extra | Everything in one place | If the server is down, the web game is down too |
| GitHub Pages with the custom domain | $0 | Already used for `docs/` | Single-page fallback only through a copied `404.html` (served with a 404 status, which can break WhatsApp previews). Needs `.nojekyll` for `.well-known`. |
| Netlify / Vercel | $0 tier | Like Cloudflare | Slower in India |

Cache rules: `/_expo/static/*` immutable for 1 year (the file names carry a hash), `index.html` never cached, and `/.well-known/apple-app-site-association` served as `application/json`.

### A5. Deploying

- GitHub Action `web.yml`: on push to `main`, run `npm ci`, then `npm test` and `tsc`, then `npx expo export -p web`, add the landing pages, then deploy (Cloudflare `wrangler pages deploy`, or `rsync` to the server).
- **A web release needs no App Review**, so fixes go out the same day. The web game can be ahead of the App Store version; the protocol version check (§B5) keeps mixed versions working.
- Show the version in Settings → About on the web too, to match bug reports.

### A6. Web checks

- `scripts/web-smoke.mjs` (Playwright, already a dev dependency): open `/`, play the daily board to game over, open `/join/123456` directly (fallback works), take screenshots at 390, 768 and 1280 px wide, and fail on any page error.
- By hand: WhatsApp's built-in browser on Android and iPhone, Safari on iPad, desktop Chrome. Throttle to "Fast 3G": the game screen should appear within about 6 s.

### A7. Effort: ~2.5 days

---

## Part B. Online rooms

### B1. What it's like to play

**The host (Maya, on her iPhone)**
1. Home → **Play online with family** (a new card under Today's board).
2. Room setup: board, rules, her name and animal (the same look as "Who's playing?").
3. **Create room.** The lobby shows a big code **482 913**, four seats (Maya ✓ and three empty), and **Invite on WhatsApp**. The share text: *"Join my Color Catch game! 👉 https://play.colorcatch.app/join/482913 (code 482 913)"*.
4. **Add computer** fills a seat with Bunny or Fox (Owl with the unlock).
5. **Start** works once 2 seats are filled.

**A guest (Dadi, on Android, in WhatsApp)**
1. Taps the link. The browser opens "Maya invited you to play".
2. Types her name (remembered next time) and picks an animal, then taps **Join**. Her seat lights up in everyone's lobby.

That's two taps and a name. A guest with the iOS app installed goes straight into the app.

**Playing**
- The reveal starts on every screen at the same moment, so everyone gets the same look time.
- On your turn: "Your turn!", with a sound and a haptic on your device only. Others see "Maya is rolling…" and watch her die tumble live. Her pick shows a small tap ripple, then the peg flips.
- Each tray shows a small dot: online, or 💤 away.

**Someone's phone locks**
- Dadi's tray shows 💤. On her turn the game waits 15 s, then the banner says **"Fox plays for Dadi"**. The points still go to Dadi.
- When she opens the app again, it reconnects in about 1–2 s, jumps to the current board without replaying the animations, and she plays her next turn.

**End of the game**
- Everyone sees the game-over sheet. **Play again**: the host deals a new board and everyone stays. **Share result**. **Leave room**.
- Later (R5): six fixed emoji reactions (👏 😮 😂 🎉 🙈 ❤️) float up from the sender's tray. Never free text.

**Design details**

| Topic | Choice | Why |
|---|---|---|
| Room code | **6 digits**, shown "482 913" | Digits are read aloud in every language and typed on a number pad. Letters are hard for Hindi, Arabic and Thai readers. |
| Seats | at most 4, computer seats included | Same as the table game |
| Joining a game in progress | no (v1). "This game has started. Ask Maya to invite you to the next one." | Keeps rules simple |
| Host leaves | hosting passes to the next seat and the game continues | Nobody is stranded |
| Turn timer | **Relaxed** (default): no visible clock; after 30 s a nudge ("Your turn, Dadi!") with a sound; after 60 s the computer plays. **Quick** (host option): 20 s. | Families play slowly; kids don't |
| Pause | no pause online. The ⏸ button becomes a room menu: sound, how to play, leave room. | One person can't freeze four |
| Rules | the host's Kid mode and bonus-turn settings apply to the room | As in pass-and-play |
| Names | same `cleanName` rules. A taken animal is swapped for the next free one. | Seats stay distinct |
| Accessibility | VoiceOver reads other players' moves through the existing `tableCopy`; Reduce Motion respected | Same quality as offline |
| Stats | online games count in this device's stats, by name, like pass-and-play | |
| Review prompt | after an online game the local player won | The happiest moment |

### B2. Money: the host pays

| | Free | With the unlock |
|---|---|---|
| Join any room (any board, any number of players), app or web | ✓ | ✓ |
| Host: seats | 2 (you + 1) | up to 4 |
| Host: boards | Small, Classic | + Big, Huge |
| Host: computer seat | Bunny or Fox (takes a seat) | + Owl |
| First room with 3 or 4 seats | one free try (uses the existing `3p` / `4p` tries) | — |

**When the offer appears**
1. **In the lobby**, when a free host taps the third seat: *"Host up to 4 players online"* → the unlock sheet. This is the best moment: Grandma is waiting and wants to play.
2. After a free online game: *"Play again with the whole family?"*.
3. For web guests on the game-over sheet: *"Host your own family games with Color Catch for iPhone and iPad."*

**Other changes**
- One new perk line on the unlock sheet: "Host online games for up to 4 players".
- New IAP descriptions in App Store Connect, in all store locales (`store-assets/promo/apply-iap.mjs --names`).
- Price unchanged ($2.99; ₹99 in India if that change has gone live).

**Checking that a host really bought the unlock**
- **v1:** the server trusts the app's `unlocked` flag. Cheating needs a modified app, and a fake host only skips $2.99.
- **v2, only if abused:** the app sends the StoreKit 2 signed transaction when creating a room, and the server checks Apple's signature itself (no call to Apple, no account).

**Expectation, stated plainly:** online play multiplies existing players; it doesn't create them. At about 4 new downloads a day, start small, then tell existing players (What's New, plus an In-App Event "Family game night online" around Christmas and New Year).

### B3. How it works

```
  iPhone app ─┐                               rooms.colorcatch.app
  iPad app  ──┼──  WebSocket (wss), JSON  ──►  Node, rooms in memory
  Browser   ──┘   small messages               • runs src/engine reduce()
                                               • timers: reveal end, result end
                                               • plays Bunny/Fox/Owl seats
                                                 and away players' turns
  play.colorcatch.app = static files only (no link to the room server)
```

**One move, step by step**
1. Leo taps the die. His phone starts the tumble and sends `{type:'intent', action:{type:'ROLL'}}`.
2. The server checks: is it Leo's seat's turn? Does `reduce(state, ROLL)` change the state? (If the result is the same object, the move is invalid and dropped.)
3. The server applies it, adds a sequence number, and sends `{seq: 41, action: ROLL, by: 'p2', hash}` to everyone, Leo included.
4. Every device runs the same `reduce()` on the same state, so the die lands on the same colour everywhere (the seed and the RNG state are in the game state).
5. Each device compares its `stateHash(state)` with `hash`. If they differ (a bug, or a missed message), it asks for a snapshot.

**Actions the server creates itself**

| Action | When |
|---|---|
| `REVEAL_DONE` | `revealDurationMs(state)` after the reveal starts (also the sudden-death mini board) |
| `RESULT_DONE` | 850 ms after a match, 1,400 ms after a miss (the `timing` numbers the app uses today) |
| `ROLL` / `PICK` for a computer seat | 400 ms roll delay, then `aiThinkMs()` before the pick, exactly as `src/store/game.ts` does now |
| `ROLL` / `PICK` for an away player | after the turn timer (§B1), with Fox's brain |

**On each device**
- Actions are applied strictly in `seq` order. If 2 or more are waiting (for example, back from the background), the device skips the animations and jumps ahead.
- **Snapshots:** on join, on rejoin, or on a hash mismatch, the server sends the whole `GameState` (about 3–6 KB of JSON) plus the current `seq`.
- **Clock:** devices estimate the server's clock from five ping/pongs (keeping the fastest), so the reveal countdown ends at the same moment everywhere.

**Why not let the host's phone be the server?** iOS stops background network connections within seconds, so one locked phone would freeze the room for everyone. A small always-on server avoids that.

**Why no database?** A room lives at most a few hours. Memory is enough, there's nothing to back up, and nothing personal is kept.

**Known limit:** every device holds the seed, so a hacked app could see where the pegs are. Among family, that doesn't matter. If public games with strangers ever happen, the server would send only what each player is allowed to see. Not needed now.

### B4. Shared code first (before any network code)

1. **Rule timings into the engine.** Move `dieTumble`, `matchTotal`, `missTotal` and `aiRollDelay` from `src/theme/tokens.ts` (which imports UI colours) to `src/engine/timing.ts`. `tokens.ts` re-exports them, so the UI doesn't change.
2. **A pure "table driver"** in `src/engine/driver.ts`, taken out of `src/store/game.ts`:
   - `nextAutoStep(state, ais, rng)` → `{action, afterMs}` or null: what happens next on its own (reveal end, result end, computer roll or pick).
   - `freshBrains(state, rng)` and `observeMove(ais, state, move)`: the computer's memory, as pure functions.
   - The local store and the server both use it, so **offline play becomes the test bed for the online rules.** `src/store/__tests__/game.test.ts` must pass unchanged.
3. **`src/online/protocol.ts`:** message types, `PROTOCOL = 1`, `RULES_VERSION`, and small hand-written checks for every incoming message (no new dependency).
4. **`src/online/hash.ts`:** `stateHash(state)`, an FNV-1a hash of phase, turn, active player, die colour, scores and each peg's state.

### B5. Messages (protocol 1)

All JSON, at most 2 KB each, at most 20 per second per connection.

**Phone/browser → server**

| Message | Fields | Notes |
|---|---|---|
| `hello` | `protocol, rules, app ('ios'/'web'), appVersion, lang` | first message; too old → `error: update` |
| `create` | `board, rules, maxSeats, timer, name, avatar, unlocked` | server checks the free host limits (§B2) |
| `join` | `code, name, avatar` | returns a seat and a **seat token** |
| `resume` | `code, token` | back after a drop; same seat |
| `addBot` / `removeSeat` | `difficulty` / `seat` | host only; removing a person gives the seat to the computer |
| `start` / `rematch` | — | host only |
| `intent` | `action: ROLL / PICK{pegIndex}` | the only game moves a device can send |
| `react` | `emoji` (one of 6) | R5 |
| `leave`, `ping` | `t` | |

**Server → phone/browser**

| Message | Fields |
|---|---|
| `welcome` | `serverTime` |
| `room` | `code, seats[{id, name, avatar, kind, online}], hostSeat, status, settings` |
| `joined` | `seat, token` |
| `started` | `config` (with seed), `seq: 0, revealEndsAt` |
| `action` | `seq, action, by, hash` |
| `snapshot` | `state, seq, ais?` |
| `presence` | `seat, online` |
| `reaction` | `seat, emoji` |
| `error` | `code`: `update`, `full`, `notFound`, `started`, `needsUnlock`, `rate`, `bad` |
| `ended` | `reason`: `expired`, `hostClosed`, `serverRestart` |
| `pong` | `t, serverTime` |

**Versions:** the server accepts the current protocol and the one before it. An older app sees "Update Color Catch to play online" with an App Store button; the web reloads itself. Each room is tagged with the `RULES_VERSION` of the host, and a device with different rules can't join ("Ask Maya to update the app") so the rules can never disagree.

### B6. The server

**Code:** `server/` in this repo, so it imports `src/engine` and `src/online` directly. Node 22, TypeScript, one dependency (`ws`). Built with esbuild into a single `server/dist/server.mjs`. Add `server/` to `.easignore`.

| File | Job |
|---|---|
| `index.ts` | HTTP: `/health`, `/stats` (aggregate, behind a token), WebSocket at `/ws` |
| `rooms.ts` | code allocator, room map, expiry sweep every minute |
| `room.ts` | lobby → playing → over, seats, the driver from §B4, timers on an injectable clock (the same trick as `GameScheduler` today, so tests run without waiting) |
| `limits.ts` | rate limits, in memory only |
| `log.ts` | counts and errors; **never names, codes, tokens or IP addresses** |

**Limits** (all configurable)

| What | Limit |
|---|---|
| Lobby with nobody joining | closes after 30 min |
| Game with nobody connected | closes after 10 min |
| Finished game (for Play again) | kept 15 min |
| Any room | at most 4 h |
| Rooms on the server | 2,000 |
| Room creation | 10 per hour per IP (counted in memory, never written down) |
| Wrong codes | 10 a minute per connection, then the connection closes |
| Seat token | 128 random bits, kept on the device for rejoining |

**Settings (environment):** `PORT`, `PUBLIC_ORIGINS` (the web domain and app scheme), `MAX_ROOMS`, `STATS_TOKEN`, `TRUST_PROXY`.

**Restarting for an update:** on shutdown the server tells everyone `ended: serverRestart` and the apps show "Reconnecting…". In R5 the server also writes all rooms to a temporary file on shutdown and reads them back on start (they are plain JSON), so a deploy no longer ends games.

**Keeping the host open:** the room logic (`room.ts`, `rooms.ts`, the driver, the protocol) never touches Node or Cloudflare directly. A thin adapter connects it to the host: `server/node/` (Node + `ws`, for a droplet or VPS) or `server/cloudflare/` (a Worker + one Durable Object per room). Only the adapter changes if D3 changes.

**Where it can run**

| Host | Cost | Notes |
|---|---|---|
| **Cloudflare Workers + Durable Objects** | check current pricing (the free plan has included Durable Objects with daily limits since 2025; Workers Paid is $5 a month) | Same account as Pages. One Durable Object per room fits this design: it holds the room in memory and keeps its WebSockets open. Nothing to patch or restart, and it's fast in India. Timers use the object's alarms. Fits the "no server to look after" wish. |
| **Owner's droplet** / any VPS | $0 extra / $4–6 a month | `server/deploy/` will have both a systemd unit and a Docker setup, plus a Caddy config (automatic HTTPS; WebSockets work as is). Check the droplet's free RAM and load first. |
| Fly.io, Railway, Render (paid, always-on) | ~$5 a month | The Dockerfile works as is. Run **one instance**, because rooms are in memory. Several instances would need routing by room code, which isn't needed below about 10,000 players at once. |
| ✗ Serverless (Vercel/Netlify functions, Lambda) | — | No long-lived WebSockets |
| ✗ Free plans that sleep | — | Rooms vanish when the server sleeps |

**Capacity:** a move every 2 seconds or so per room, under 200 bytes each. One small server (1 vCPU, 1 GB) handles thousands of connections. R3 tests 1,000 rooms of 4 bots on the real box.

**Monitoring:** a free uptime check (UptimeRobot or Better Stack) on `/health` that emails the owner.

### B7. App and web work

**New code**
- `src/online/client.ts`: the WebSocket wrapper (built into React Native and browsers, so no new dependency). Reconnects after 0.5, 1, 2, 4 and 8 s, then every 15 s. Heartbeat every 20 s. When the app comes back to the foreground it reconnects at once and sends `resume`.
- `src/store/room.ts` (zustand): connection state, room, my seat, who's online, last `seq`, waiting actions.
- `src/store/game.ts` gets a **remote mode**: `dispatch` sends an intent instead of running the rules. Actions from the server go through the existing path (animations, sounds, stats), and there are no local timers for automatic steps.

**Screens (expo-router)**

| Route | What |
|---|---|
| `app/online.tsx` | Create a room, or Join with a code (number pad) |
| `app/join/[code].tsx` | Where invite links land (app and web): "Maya invited you", name, animal, Join |
| `app/room/[code].tsx` | Lobby: code, seats, invite, add computer, start |
| `app/game.tsx?room=482913` | Same game screen with the remote driver. The pause button opens the room menu, and leaving asks "Leave the game?". |
| `app/index.tsx` | New "Play online with family" card. A "Back to your game with Maya?" banner if a room you were in is still running. |

**Links into the app**
- The scheme already exists (`pegrecall`), so `pegrecall://join/482913` works for buttons.
- WhatsApp only makes `https` links tappable, so invites use **universal links**:
  - `app.json`: `"ios": { "associatedDomains": ["applinks:play.colorcatch.app"] }`
  - `public/.well-known/apple-app-site-association`:
    `{"applinks":{"details":[{"appIDs":["<TEAM_ID>.com.raviteja.pegrecall"],"components":[{"/":"/join/*"}]}]}}`
  - Turn on Associated Domains for the App ID (EAS can sync capabilities). `plugins/withoutPushEntitlement.js` deletes only `aps-environment`, so it leaves this entitlement alone (checked Oct 27).
  - Without the app installed, the same link opens the web game. One link for everyone.

**Other work**
- **Text:** about 45 new strings (lobby, errors, away, timer, web "Get the app") in all 28 UI languages, checked twice as before.
- **Privacy policy** (`docs/privacy.html`): what the room server receives (name, animal, moves, and the IP address that every connection has), that it is kept in memory only during the game, never logged, and never shared.

### B8. Edge cases

| Case | What happens |
|---|---|
| Double tap on the die | The server takes the first; the second is invalid and dropped |
| A tap that arrives after the turn passed (lag) | Dropped; the button was already disabled on screen |
| Wi-Fi switches to 4G | Reconnect + `resume` with the seat token; snapshot if any actions were missed |
| App killed mid-game | Token kept on the device. Home shows "Back to your game with Maya?" while the room is alive. |
| The same person in two tabs | Same token, so the newer connection replaces the older one |
| Host drops in the lobby | After 30 s hosting passes to the next seat. Empty rooms close (§B6). |
| Server restarts mid-game | "Reconnecting…", then the game continues (R5 restore) or "This game ended. Start a new room." |
| A tie leads to sudden death | The server runs the mini board's reveal and turns; already in the engine |
| Phone clocks differ | The countdown follows the server's clock, and the reveal end comes from the server |
| Backgrounded during the reveal | That player loses some look time. No pause online. |
| Old app version | Update screen with an App Store button |
| Room full / wrong code / already started | "This game is full (4 of 4)" / "No game with this code. Check the number with Maya." / §B1 |
| Child taps Leave by mistake | Confirmation first. Rejoin within 10 min through the Home banner. |
| Right-to-left names | `isolate()` as today |

### B9. Safety, privacy and App Review

- **Safety:** no chat, no strangers, no public lobby, no profiles, no photos. Only players' own names and six fixed emoji. Names go through `cleanName` plus a short blocklist per language. **The host can remove a player** (the seat goes to the computer). The room menu has a "Report a problem" link to the support email. Together this covers App Review guideline 1.2 for the only user-written text (names).
- **App Privacy label:** Apple counts data as "collected" when it is kept longer than needed to answer the request in real time. Rooms keep names in memory only for the game, and nothing is logged. **Recommendation: keep "Data Not Collected"** and describe the server in the privacy policy (D6). If the owner prefers to be cautious: "Other User Content – Not Linked to You – App Functionality".
- **Age rating:** answer Apple's age-rating questions again, including the newer ones about user-generated content and messaging. With no chat, 4+ is expected, but check the result before submitting.
- **App Review needs a second player.** Review notes: *"Tap Play online → Create room. To join as a second player, open https://play.colorcatch.app/join/<code shown in the lobby> in any browser, or tap Add computer to play alone."* The web version makes this easy. The server must be up during review.
- **"Plays offline" stays true:** every offline mode is unchanged. The listing adds "Online rooms need an internet connection."

### B10. Phases

| Phase | Work | Days | What ships |
|---|---|---|---|
| **W1** | Part A: web fixes, `public/` files, domain, hosting, GitHub Action, smoke test | 2.5 | **web game live** |
| **R0** | §B4: rule timings into the engine, pure driver, local game uses it, all tests green | 1.5 | nothing visible (safer offline code) |
| **R1** | Server: rooms, protocol, rules referee, computer seats, timers, unit tests | 3 | server on the droplet (test address) |
| **R2** | App/web: online screen, join, lobby, remote game, invite share | 3.5 | **web beta: online rooms for the family** (Android + laptops), no App Review |
| **R3** | Hardening: reconnect, away + turn timer, snapshots, version check, chaos and load tests | 2 | web beta update |
| **R4** | iOS: universal links, host limits and offers, 28 languages, privacy policy, screenshots, review notes | 2.5 | TestFlight → App Store |
| R5 (later) | Emoji reactions, rooms survive a server update, IAP checking if abused | 1–2 | after launch |

**Total: about 15 working days**, plus a TestFlight round and App Review.

**Beta on the web first:** online rooms go live in the web game (R2) before any iOS release. The owner's family tests on real phones and networks, and fixes go out the same day. When it's solid, R4 ships to the App Store.

**Versioning:** online play is a big feature and should be its own App Store version. The Expo SDK 55 → 58 upgrade (PLAN-v1.3 §6) should never be in the same release (D10).

### B11. Testing

| Kind | What |
|---|---|
| Unit | Message checks; driver steps; room life on a fake clock (create, join, start, every turn path, bonus turn, sudden death, away → computer, rejoin, expiry); `stateHash` matches across devices |
| Simulation | Headless bot devices play 1,000 random full games through a real local server. Every device's final hash must equal the server's. |
| Chaos | Drop 10% of connections at random mid-game and delay messages 0–800 ms. Every game must still finish. |
| Load | 1,000 rooms × 4 bots on the real server: CPU under 50%, memory under 300 MB |
| End to end (CI) | Playwright, two browser windows play one online game against a local server |
| Devices (owner) | iPhone + iPad app, Android Chrome and WhatsApp's browser, desktop Chrome and Safari. Slow 4G. One phone locked during its own turn. |

### B12. Measuring (counts only, no people)

The server counts per day and shows them at `/stats` (behind a token): rooms created (app / web), rooms started, average seats, games finished, Play agains, joins from app / web, and free hosts who tapped the third seat. No IDs, no IP addresses, nothing per person (D7).

**Four weeks after the iOS release, success means:**
- at least 30 rooms a week
- at least 1.5 guests per room
- at least 40% of rooms play 2 or more games
- first unlock purchases after the "Host up to 4" offer (App Store Connect, in-app purchase units)

---

## 3. Decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| D1 ⏳ later (Oct 27) | Buy a domain (~$10–15 a year) | Use `*.pages.dev` until then (§A3). **Needed before R4**, because the iOS app has the invite domain built in. Buy it through Cloudflare Registrar to keep everything in one account. |
| D2 ✅ Cloudflare Pages (Oct 27) | Where the website and the web game live | Done. |
| D3 ⏳ open (Oct 27) | Where the room server runs | **Needed before R2's web beta.** R0 and R1 are built and tested locally either way (§B6 adapters). Lean: **Cloudflare Workers + Durable Objects**, the same account as Pages with nothing to maintain. The droplet is the fallback. Not ordinary serverless functions, not free plans that sleep. |
| D4 ⏳ open (Oct 27) | Money model online | **Needed before R4.** Until then the host limits are one switch (server setting + app constant), so the beta can run with no limits and either answer is a one-line change. Lean: host pays, guests free (§B2). |
| D5 | What's free on the web | Small + Classic, Bunny + Fox, 2 players, the daily board. **No free tries on the web.** |
| D6 | App Privacy label | **Keep "Data Not Collected"**: rooms in memory only, no logs. Update the privacy policy. |
| D7 | Counts on the server (no IDs) | **Yes.** It's the only way to see whether rooms work. |
| D8 | Default turn timer | **Relaxed**: nudge at 30 s, computer plays at 60 s. "Quick" (20 s) as a host option. |
| D9 | Emoji reactions | **Yes, after launch** (R5). Never text chat. |
| D10 | Order against the Expo SDK 58 upgrade | **Separate releases.** The web and the web beta don't depend on it. Pick the iOS order by Apple's iOS 27 SDK deadline. |

---

## 4. Not in this plan (on purpose)

- Google Play (paused, Oct 27).
- Public matchmaking, strangers, text chat, friend lists, accounts, leaderboards.
- Paying on the web (Stripe).
- Watching a game, joining mid-game, more than 4 seats.
- "Your turn" push notifications (needs the push entitlement and device tokens). WhatsApp invites and in-app sounds are enough.
- Hiding peg colours from hacked apps (only needed if games with strangers ever happen).

## 5. Running costs

| Item | Cost |
|---|---|
| Domain | ~$10–15 a year |
| Web hosting (Cloudflare Pages) | $0 |
| Room server | $0 extra on the existing droplet, or $4–6 a month on a new small VPS |
| Uptime check | $0 |
| **Total** | **about $1–7 a month** |
