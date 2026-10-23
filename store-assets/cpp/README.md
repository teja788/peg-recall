# Custom product pages (CPPs)

Eight pages, ready to create in App Store Connect **after 1.2.1 is live**: three seasonal pages and the five evergreen pages of the first batch. Each folder has a `page.json` with the promotional text, the keywords to link (plus `needsKeywordField`: assigned words that no keyword field holds yet), the screenshot order, and the captions. The screenshots are in `<page>/<locale>/{iphone-6.9,iphone-6.5,ipad-12.9}/`. They are git-ignored like the main screenshots, so rebuild them with the commands below.

| Folder | Linked searches | Angle | Locales | When |
|---|---|---|---|---|
| `family/` | 2 player games, board games, dice games, pass and play | Up to 4 players on one screen (4-player frame first) | en-US, en-GB, hi | Evergreen |
| `color-blind/` | colorblind games, colour blind games | Shapes on every peg (shapes frame first) | en-US, en-GB, hi | Evergreen |
| `offline/` | offline games, games without wifi | No Wi-Fi needed, no account, no data collected | en-US, en-GB, hi | Evergreen |
| `seniors/` | games for grandparents, senior games, games for elderly | Big pegs, Bunny goes easy, longer look and shared wins (Settings). The page wins by its keywords, never names the audience | en-US, en-GB, hi | Evergreen |
| `gentle/` | toddler games, preschool games | Short, gentle games: Bunny, shapes, confetti. Never names the audience | en-US, en-GB, hi | Evergreen |
| `road-trip/` | car games, travel games, games for plane | Plays offline, play anywhere, pass the phone | en-US, en-GB | School holidays |
| `classroom/` | memory game for classroom, OT games, turn taking | Take turns with up to 4 players, shapes for color-blind players, no accounts or data | en-US, en-GB, hi | Back to school |
| `festival/` | diwali games, holi games, children's day games | Family game night, colors | en-US, en-GB, hi | Diwali, Children's Day, Holi |

Caption and promo rules (same as the main listing; App Review rejected 1.2.1 twice in Oct 2026 for words in metadata, and CPP screenshots and promo text are metadata):

- No price words: free, no ads, ad-free, gratis, मुफ़्त, विज्ञापन-मुक्त. The offline page says "No Wi-Fi needed. No account.", never "no ads".
- No audience words in captions or promo text: kids, children, toddler, seniors, elderly, grandparents (and translations). Pages for an audience win by their linked keywords and by what the screenshots show. The in-app "Kid mode" row and any "Try free" badge must never be in frame.
- No audience words inside the screenshots either: App Review reads in-app text as metadata. Player names in CPP frames are neutral first names (en: Maya, Leo, Sam, Zoe; hi: अनन्या, आरव, मीरा, कबीर), never Nana, Papa, दादी, दादा or the like.
- Never link the keyword "ads" on any page (it reads as "no ads", 2.3.7), and don't add it to any keyword field.
- Never claim the game improves memory, brain, focus or health.
- Every frame set shows paid features (iPad shot 1 is a Big board; 3 players, Huge, Owl and 4 players appear in later shots), so every promo text says: "3 and 4 players, Big and Huge boards and Owl come with the one-time unlock." (hi: "3 और 4 खिलाड़ी, बड़ा और विशाल बोर्ड और उल्लू एक बार के अनलॉक से मिलते हैं।"). Never "2 players free".
- Promo text ≤170 characters.

## Keyword ownership (all 8 pages)

A CPP shows up in organic search for the keywords linked to it, and **each keyword can belong to only one page**. A CPP can only use keywords the app already indexes in that locale's keyword field (`GET /v1/apps/{id}/searchKeywords` lists them). Words marked **new** are not in any keyword field yet. The 1.2.1 resubmit (Oct 2026) removed toddler, preschool, senior, two, colour, brain and the ads words from the fields. The 1.2.1 fields were: en-US `2,player,board,concentration,offline,grandparents,pegs,dice,pairs,flip,local,multiplayer,colors`; en-GB `pairs,flip,elderly,adults,dice,pegs,local,multiplayer,players,4,offline,pass,board,grandparents`. For 1.3, `listing.json` adds `colorblind` to both (Oct 23 2026), and drops `pairs` from en-US (en-GB keeps it) and `local` from en-GB (en-US keeps it), 100 bytes each: en-US `2,player,board,concentration,offline,grandparents,pegs,dice,flip,local,multiplayer,colors,colorblind`; en-GB `pairs,flip,elderly,adults,dice,pegs,multiplayer,players,4,offline,pass,board,grandparents,colorblind`. hi (unchanged) `matching,games,adults,elderly,4,players,पासा,जोड़ी,रंग,offline`.

| Page | Owns (en-US / en-GB) | Owns (hi) | Status |
|---|---|---|---|
| Default page (no CPP) | brain, dementia, concentration, match, pair, recall | दिमागी, matching, games | Keep these off every CPP: linking a page to "brain" or "dementia" invites a health-benefit reading |
| Seniors | grandparents, senior | elderly, adults | `seniors/`. Links grandparents (en-US, en-GB), elderly + adults (hi). senior not in any field |
| Kids | toddler, preschool | (none yet) | `gentle/`. Nothing linkable: both words were dropped in the 1.2.1 resubmit. Owner decides whether to add them back |
| Family / party | 2, two, player, pass, play, board, dice | 4, players, पासा, जोड़ी | `family/`. Links 2, player, board, dice (en-US); dice, pass, board (en-GB); all four (hi) |
| Offline | offline | (none yet) | `offline/`. Links offline (en-US, en-GB). Never "ads" |
| Color-blind | colorblind (from 1.3), colour | (none yet) | `color-blind/`. Links colorblind (en-US, en-GB) once 1.3 is live with it; colour is in no field |
| Road trip | **new**: travel, car, plane, trip (en-GB: journey instead of trip) | (none) | `road-trip/` |
| Classroom / therapy | **new**: classroom, teacher, therapy, turn | **new**: कक्षा, शिक्षक | `classroom/` |
| Festival | **new**: diwali, holi, festival | **new**: दिवाली, होली, त्योहार | `festival/` |

Unassigned words the fields hold: en-GB `elderly, adults` (fit Seniors), en-GB `4, players` (fit Family), hi `offline` (fits Offline). Assign them here before linking.

"offline" belongs to the Offline page, so Road trip uses offline in its captions and promotional text only, not as a linked keyword. The same goes for "4 players" on the Classroom and Festival pages: it belongs to Family.

## Rebuild the screenshots

Frames come from `store-assets/screenshot-frames/` (shots 01 to 07, made by `capture-screenshots.mjs`, en and `hi/`) plus one extra frame per device, `08-four` (a 4-player game, mid-game, typed names). The frames that show typed player names are recaptured for the CPPs with neutral names (Oct 23 2026) and live in `store-assets/screenshot-frames-cpp/{,hi/}{iphone-6.5,ipad-12.9}/`: `03-family`, `04-rivals` (iPhone Home), `05-sizes` (iPad Home) and the extra `08-four` (a 4-player game, mid-game). The compose step takes a frame from `screenshot-frames-cpp/` when it is there, else from `screenshot-frames/` (shots 01, 02, 06, 07 only show the first player, Maya / अनन्या). The recapture used a copy of `capture-screenshots.mjs` with the CPP names, shots 3, 4, 5 and a shot 8 (shot 3 with `mode=4p`), writing to `screenshot-frames-cpp/`; the main script and `screenshot-frames/` (the live listing's frames, which still show Nana / दादी) are untouched. Shots 04 and 05 differ by device (iPhone: Home, then Settings; iPad: an Owl game, then Home), so their captions fit both.

On a 4 GB Mac, compose one page per run (each run starts Chromium).

```bash
# from the repo root; needs playwright-core + python3 Pillow, like the main compose
for page in family color-blind offline seniors gentle road-trip classroom festival; do
  F=$(mktemp -d)
  for lang in "" hi; do for dev in iphone-6.5 ipad-12.9; do
    mkdir -p "$F/$lang/$dev"
    node -e '
      const p = require(`./store-assets/cpp/${process.argv[1]}/page.json`);
      for (const [to, from] of Object.entries(p.shots)) console.log(to, from);' "$page" |
    while read to from; do
      src=store-assets/screenshot-frames-cpp/$lang/$dev/$from.png
      [ -f "$src" ] || src=store-assets/screenshot-frames/$lang/$dev/$from.png
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
