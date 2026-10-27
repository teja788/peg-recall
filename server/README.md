# Color Catch room server

The referee for online games (`PLAN-web-online.md` Part B). Phones and
browsers connect over a WebSocket. The server runs the app's own game rules
(`src/engine`), so every screen in a room shows the same game. It also plays
computer seats, and the turns of anyone who has gone away.

Rooms live in memory and disappear after their game. There is no database,
and nothing about people is logged.

## Layout

| File | What |
|---|---|
| `src/room.ts` | One room: seats, lobby, the referee (via `src/engine/driver.ts`), stand-ins, turn clocks |
| `src/hub.ts` | The front door: version check, limits, room codes, expiry, counters |
| `src/types.ts` | Clock, connection and settings types; defaults |
| `src/cloudflare.ts` | **Cloudflare adapter (in use):** a Worker plus one Durable Object that runs the hub for every room |
| `src/node.ts` | Node adapter: HTTP `/health` and `/stats`, WebSockets at `/ws` (a droplet or any VPS) |
| `src/http.ts` | What both adapters answer alike: origin check, `/health`, `/stats` |
| `src/main.ts` | Starts it from environment settings |
| `deploy/` | Caddy and systemd files for a droplet / VPS |
| `Dockerfile` | One small image for any Docker host |

`room.ts` and `hub.ts` never touch Node or Cloudflare; the two adapters reuse
them unchanged. Decision D3 (Oct 27): **Cloudflare, Workers Free plan.**

## Run and test

```bash
cd server
npm ci
npm test            # rooms, games, stand-ins, limits, real sockets
npm run typecheck
npm run dev         # ws://localhost:8787/ws
npm run build       # dist/server.mjs, one file, needs only Node 22
```

## Settings (environment)

| Name | Default | What |
|---|---|---|
| `PORT` | `8787` | port |
| `HOST` | `0.0.0.0` | use `127.0.0.1` behind Caddy |
| `PUBLIC_ORIGINS` | (any) | the web game's address(es), comma-separated, e.g. `https://colorcatch.pages.dev`. Browsers from other sites are refused; the iOS app is always let in |
| `HOST_LIMITS` | off | `on` holds free hosts to 2 seats, Small/Classic, no Owl (decision D4) |
| `MAX_ROOMS` | `2000` | rooms open at once |
| `STATS_TOKEN` | (off) | turns on `GET /stats` with `Authorization: Bearer <token>` |
| `TRUST_PROXY` | off | `1` behind Caddy / a load balancer |

`GET /health` answers `{"ok":true,"rooms":N,"connections":N}`. Point a free
uptime check at it.

## Deploy on Cloudflare (Workers Free plan)

One-time, on your computer (about 10 minutes):

1. `cd server && npm ci`
2. `npx wrangler login`. A browser window opens; use the same Cloudflare
   account as the Pages site.
3. In `wrangler.toml`, set `PUBLIC_ORIGINS` to the web game's address, e.g.
   `"https://colorcatch.pages.dev"` (several: comma-separated). Leaving it
   empty lets any website connect; fine for a first test.
4. `npm run cf:deploy`. It prints the server's address, like
   `https://color-catch-rooms.<your-subdomain>.workers.dev`.
5. Check it: open `https://color-catch-rooms.<your-subdomain>.workers.dev/health`
   in a browser. It shows `{"ok":true,"rooms":0,"connections":0}`.
6. Optional, to read the counts at `/stats`: `npx wrangler secret put STATS_TOKEN`.
7. In the Cloudflare Pages project, add the build settings from `WEB.md`
   ("Online play"), with `EXPO_PUBLIC_ROOMS_URL` =
   `wss://color-catch-rooms.<your-subdomain>.workers.dev/ws`, then redeploy
   the site. The "Play online" card appears.

Updating: `npm run cf:deploy` again. Rooms open at that moment end ("This
room has closed"), as after any server restart, so deploy at a quiet hour.

Why it should stay free (Cloudflare's free limits as of Oct 2026; check
their current pricing page before relying on it): every room lives in
**one** Durable Object, and Cloudflare bills each object for the time it is
awake. One object can be awake at most 24 h a day, which is 10,800 GB-s at
Cloudflare's 128 MB, under the free 13,000 GB-s a day. The other free limit,
100,000 requests a day, counts 20 game messages as one request: thousands of
games a day. Nothing is stored.

What the free plan does not promise:

- **Restarts.** Cloudflare restarts Durable Objects now and then (its own
  updates, moving the object, or our deploys). Rooms open at that moment end
  ("This room has closed"); players start a new room. There is no uptime
  guarantee on the free plan.
- **Running out.** If a day's free allowance is used up, online play stops
  until it resets (00:00 UTC). Games on one device are not affected. `/stats`
  shows how busy it is.
- **One machine.** One object runs on one machine, so every room shares it.
  That is plenty for family games (a move is a few small messages), but it
  is a ceiling: if `/stats` ever shows thousands of rooms at once, move to
  Workers Paid and split the rooms across several objects.

Try it locally in Cloudflare's own runtime (no account needed):
`npm run cf:dev` (port 8787), then the app tests in "Run and test" with
`ROOMS_URL=ws://127.0.0.1:8787/ws npx tsx --test src/__tests__/client.test.ts`,
or the two-browser game from the repository root with
`E2E_ROOMS=cloudflare npm run e2e:online` (see `WEB.md`).

## Deploy on a droplet or any VPS (the other adapter)

**A droplet or any VPS (Ubuntu):**

1. Install Node 22 and Caddy.
2. Build on your computer (`npm run build`), then copy `dist/server.mjs` to
   `/opt/color-catch-rooms/server.mjs` on the server.
3. Put the settings in `/etc/color-catch-rooms.env`, for example
   `PUBLIC_ORIGINS=https://colorcatch.pages.dev`.
4. Install `deploy/color-catch-rooms.service` (systemd) and
   `deploy/Caddyfile` with your address (e.g. `rooms.colorcatch.app`), and
   point that address's DNS at the server.
5. Check: `curl https://rooms.colorcatch.app/health`.

Updating: copy the new `server.mjs`, then `sudo systemctl restart
color-catch-rooms`. Open rooms are told "server restarting" (a later step
keeps them through a restart).

**Docker hosts (Fly.io, Railway, Render paid):** build from the repository
root with `docker build -f server/Dockerfile .` Run **one** always-on instance:
rooms live in memory. Free plans that sleep, and serverless functions, will
not work.

## Limits built in

| What | Limit |
|---|---|
| Lobby nobody joins | closes after 30 min |
| Game nobody is connected to | waits (no timers), closes after 10 min |
| Finished game (for Play again) | 15 min |
| Any room | 4 h |
| Room codes | 6 digits, random, never two open rooms alike |
| Rooms created | 10 per hour per address (kept in memory only) |
| Wrong codes | 10 a minute per connection, then it is closed |
| Messages | 20 a second per connection; 4 KB per frame |
| Away player | 15 s grace, then the computer plays their turns |
| Turn time (here but idle) | Relaxed 60 s, Quick 20 s per roll or pick |
