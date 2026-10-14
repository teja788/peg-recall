# Custom product pages (CPPs)

Three seasonal pages, ready to create in App Store Connect **after 1.2.1 is live**. Each folder has a `page.json` with the promotional text, the keywords to link, the screenshot order, and the captions. The screenshots are in `<page>/<locale>/{iphone-6.9,iphone-6.5,ipad-12.9}/`. They are git-ignored like the main screenshots, so rebuild them with the commands below.

| Folder | Linked searches | Angle | Locales | When |
|---|---|---|---|---|
| `road-trip/` | car games, travel games for kids, games for plane | Plays offline, play anywhere, pass the phone | en-US, en-GB | School holidays |
| `classroom/` | memory game for classroom, OT games, turn taking | Take turns with up to 4 players, shapes for color-blind players, no accounts or data | en-US, en-GB, hi | Back to school |
| `festival/` | diwali games, holi games, children's day games | Family game night, colors | en-US, en-GB, hi | Diwali, Children's Day, Holi |

Caption rules (same as the main listing): never claim the game improves memory or brain health, and never write "for kids" or "for children" (Guideline 2.3.8). Only describe what is in the app. 3 and 4 players are part of the one-time unlock (each has one free try), so the promotional text says "2 players free, 3 or 4 with the one-time unlock" wherever it counts players.

## Keyword ownership (all 8 planned pages)

A CPP shows up in organic search for the keywords linked to it, and **each keyword can belong to only one page**. A CPP can only use keywords the app already indexes in that locale's keyword field (`GET /v1/apps/{id}/searchKeywords` lists them). Words marked **new** are not in any keyword field yet. Add them to a keyword field first (the en-GB field is the widest-reaching one, since en-GB is the secondary locale in India and most other markets). Both the en-US and en-GB fields are full (about 98 of 100 characters). To make room in en-GB, drop the words it repeats from en-US: toddler, preschool, concentration, brain, offline, board.

| Page | Owns (en-US / en-GB) | Owns (hi) | Status |
|---|---|---|---|
| Default page (no CPP) | brain, dementia, concentration, match, pair, recall | दिमागी, matching, games | Keep these off every CPP: linking a page to "brain" or "dementia" invites a health-benefit reading |
| Seniors | grandparents, senior | elderly, adults | First batch |
| Kids | toddler, preschool | (none yet) | First batch. Never caption "for kids" |
| Family / party | 2, two, player, pass, play, board, dice | 4, players, पासा, जोड़ी | First batch |
| No ads / offline | ads, offline | (none yet) | First batch |
| Color-blind | colour, **new**: colorblind | (none yet) | First batch. Shapes on screenshot 1 |
| Road trip | **new**: travel, car, plane, trip (en-GB: journey instead of trip) | (none) | `road-trip/` |
| Classroom / therapy | **new**: classroom, teacher, therapy, turn | **new**: कक्षा, शिक्षक | `classroom/` |
| Festival | **new**: diwali, holi, festival | **new**: दिवाली, होली, त्योहार | `festival/` |

"offline" belongs to the No-ads page, so Road trip uses offline in its captions and promotional text only, not as a linked keyword. The same goes for "4 players" on the Classroom and Festival pages: it belongs to Family.

## Rebuild the screenshots

Frames come from `store-assets/screenshot-frames/` (shots 01 to 07, made by `capture-screenshots.mjs`, en and `hi/`) plus one extra frame per device, `08-four` (a 4-player game, mid-game, typed names). That frame lives in `store-assets/screenshot-frames-cpp/{,hi/}{iphone-6.5,ipad-12.9}/08-four.png`. It was made with a copy of `capture-screenshots.mjs` that adds a shot 8 like shot 3 with `mode=4p` and a fourth name (Papa / दादा).

```bash
# from the repo root; needs playwright-core + python3 Pillow, like the main compose
for page in road-trip classroom festival; do
  F=$(mktemp -d)
  for lang in "" hi; do for dev in iphone-6.5 ipad-12.9; do
    mkdir -p "$F/$lang/$dev"
    node -e '
      const p = require(`./store-assets/cpp/${process.argv[1]}/page.json`);
      for (const [to, from] of Object.entries(p.shots)) console.log(to, from);' "$page" |
    while read to from; do
      src=store-assets/screenshot-frames/$lang/$dev/$from.png
      [ "$from" = 08-four ] && src=store-assets/screenshot-frames-cpp/$lang/$dev/$from.png
      cp "$src" "$F/$lang/$dev/$to.png"
    done
  done; cp -R "$F/$lang/iphone-6.5" "$F/$lang/iphone-6.9"; done
  grep -q '"hi":' store-assets/cpp/$page/page.json || rm -rf "$F/hi"
  node ~/.claude/skills/ship-ios-app/compose-screenshots.mjs --frames "$F" \
    --captions store-assets/cpp/$page/page.json --out store-assets/cpp/$page
done
```

`compose-screenshots.mjs` reads only `style` and `captions` from `page.json` and ignores the other fields. It treats every subfolder of `--out` as a locale, and `page.json` is a file, so it is left alone.

## Create in App Store Connect (dry-run outline, nothing has been sent)

Only after 1.2.1 is approved and live. Each new CPP version goes to App Review on its own, with no app update needed. Use `~/.claude/skills/ship-ios-app/asc-api.mjs` (spec 4.5.1):

1. Add the **new** keywords from the table to the keyword fields in a version update (release 1.2.2 or 1.3). A CPP can't link a word the app does not index.
2. `POST /v1/appCustomProductPages` with `name` = `referenceName`, `relationships.app`, and an inline `appCustomProductPageVersions` plus one inline `appCustomProductPageLocalizations` per locale (`locale`, `promotionalText` from page.json).
3. For each localization, create `appScreenshotSets` (`APP_IPHONE_67` for iphone-6.9, `APP_IPHONE_65`, `APP_IPAD_PRO_3GEN_129`) and upload the PNGs the same way `release.mjs screenshots` does (reserve, PUT the parts, PATCH `uploaded:true` with the MD5 checksum).
4. Link the keywords: `GET /v1/apps/{app}/searchKeywords` (filter to the page's words), then `POST /v1/appCustomProductPageLocalizations/{id}/relationships/searchKeywords` with `[{type:'appKeywords', id}]`. A keyword that another page already owns is rejected, so link the first-batch pages in the order of the table.
5. Optional: put a creative asset on the page (search-results image) through `appAssetLibraryPlacements` (see the skill's Creative assets section).
6. Submit the CPP version for review (`POST /v1/reviewSubmissions`, then a `reviewSubmissionItems` entry with `appCustomProductPageVersion`, then PATCH the submission `submitted:true`), then deactivate the seasonal pages when their season ends (`PATCH appCustomProductPages {visible:false}`). Re-enable them next year.
