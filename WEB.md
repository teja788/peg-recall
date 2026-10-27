# Color Catch on the web

The same game in any browser, hosted on Cloudflare Pages. Plan and reasons:
`PLAN-web-online.md` (Part A).

## What the web game is

- Free: Small and Classic boards, Bunny and Fox, 2 players, and the daily board
  (Big at weekends, as in the app).
- Locked items show a padlock and open a sheet that sends people to the App
  Store. Nothing can be bought on the web, and there are **no free tries**
  (browser storage can be cleared, so a try would never run out).
- After a game a person won, once per browser, a "Liked it?" card points to
  the App Store too.
- "Share result" from the web links to the web game itself, so friends on
  Android can play from WhatsApp.
- The switch is `src/store/storefront.web.ts`: `hasStore` is false in the
  published build. `npx expo start --web` (development) keeps the old fake
  purchase, so the purchase sheet can still be tested in a browser.

## Build and check locally

```bash
npm run build:web     # expo export -p web, then scripts/web-finish.mjs
npm run smoke:web     # serves dist/ like Cloudflare does, checks it in Chromium
```

The smoke test needs the shared Playwright Chromium
(`npx playwright@1.47.0 install chromium`), or any Chrome binary in
`PW_CHROMIUM`. Screenshots land in `web-smoke/` (not committed).

## Cloudflare Pages: one-time setup (owner, ~10 minutes)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → choose `teja788/peg-recall`.
2. Build settings:

   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | `npm run build:web` |
   | Build output directory | `dist` |

3. Environment variables (Production and Preview):

   | Name | Value |
   |---|---|
   | `NODE_VERSION` | `22` |
   | `SITE_URL` | the site's address, e.g. `https://colorcatch.pages.dev` (add it after the first deploy shows the address; later, the custom domain) |

4. **Save and Deploy.** After that, every push to `main` deploys the site, and
   every other branch gets its own preview address. No App Review: fixes are
   live in a few minutes.
5. Check on a phone: open the address, play the daily board, then send the
   address to yourself on WhatsApp and look at the preview card.

Without `SITE_URL` the site still works; only the WhatsApp preview image is
left out (link previews need a full address).

**Instead of connecting Git**, you can upload from your own computer:
`npm run build:web && npx wrangler pages deploy dist --project-name <name>`.

## What `public/` holds

Everything in `public/` is copied into the export as is.

| File | Why |
|---|---|
| `index.html` | The page template: title, link-preview tags, the App Store banner for Safari, and a loading screen so the 3 MB game never shows a white page |
| `og.jpg` | The 1200×630 link-preview image (from `store-assets/creative/header.png`) |
| `manifest.json`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | "Add to Home Screen" |
| `_headers` | Cloudflare caching: the hashed game files cached for good, the page checked on every visit |

Keep **no `404.html`** at the top of the export: without one, Cloudflare
sends every unknown path (`/settings`, later `/join/482913`) to the game.
`scripts/web-finish.mjs` fails the build if one appears.

## Online play (rooms)

Online play shows up only in builds that know where the room server is
(`src/online/config.ts`). Without these settings the "Play online" card is
hidden, so nothing half-working reaches players.

| Setting (build time) | Example | What |
|---|---|---|
| `EXPO_PUBLIC_ROOMS_URL` | `wss://rooms.colorcatch.app/ws` | the room server (`server/README.md`) |
| `EXPO_PUBLIC_WEB_URL` | `https://colorcatch.pages.dev` | invite links point here (`/join/482913`); the web game uses its own address if this is unset |
| `EXPO_PUBLIC_HOST_LIMITS` | `on` | the free host limits; keep it the same as the server's `HOST_LIMITS` (decision D4) |

Set them in the Cloudflare Pages project (web) and for EAS builds (iOS) once
the server is deployed. `npm run build:web` clears Metro's cache, because
these values are baked in when the code is bundled, and `web-finish.mjs`
refuses a build that still carries a local test server's address.

**Check it end to end** (two browsers, a whole game against each other):

```bash
npm --prefix server ci && npm --prefix server run build
EXPO_PUBLIC_ROOMS_URL=ws://127.0.0.1:8787/ws npm run build:web
npm run e2e:online
```

**Try it by hand:** `npm --prefix server run dev` in one terminal, then
`EXPO_PUBLIC_ROOMS_URL=ws://localhost:8787/ws npx expo start --web` and open
two browser windows.

## Later

- **Domain:** add it under the Pages project → Custom domains, then change
  `SITE_URL`. Buy it before the iOS release with online play
  (`PLAN-web-online.md` §A3).
- **Link from the existing site:** add "Play in your browser" to
  `docs/index.html` once the address is final.
