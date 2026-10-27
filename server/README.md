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
| `src/node.ts` | Node adapter: HTTP `/health` and `/stats`, WebSockets at `/ws` |
| `src/main.ts` | Starts it from environment settings |
| `deploy/` | Caddy and systemd files for a droplet / VPS |
| `Dockerfile` | One small image for any Docker host |

`room.ts` and `hub.ts` never touch Node: a Cloudflare Durable Object adapter
could sit beside `node.ts` and reuse them unchanged (decision D3 is open).

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

## Deploy

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
