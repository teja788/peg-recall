# IAP plan: "Unlock everything" (1.2.1)

IAP 6817725344 · `com.raviteja.pegrecall.unlock` · NON_CONSUMABLE · state APPROVED
(version 1 APPROVED). Read from the API on 2026-10-14 with GETs only. Nothing
has been changed.

Script: `store-assets/promo/apply-iap.mjs`. Each flag is separate, nothing is
written without `--yes`, and every write is read back and checked. Dry-run
output: `dry-run.txt`.

| Flag | Writes (dry run) | When |
|---|---|---|
| `--names` | 21: 1 new IAP version + 3 PATCH + 17 POST localizations (+1 review item once a submission is open) | with the **1.2.1** submission |
| `--india-price` | 1: POST price schedule | any time; takes effect at once |
| `--family-sharing` | 0: **already on** | — |
| `--offer-codes` | 2: POST offer code (175 free prices) + POST custom code | the day 1.2.1 is live (see promo-plan.md) |

## 1. Display names and descriptions (`--names`)

Today only 3 locales are localized. The other 17 store locales show English on
the purchase sheet, and the text says "3 players" (1.2.1 adds 4). es-MX also
says "Owl" instead of "Búho".

How the API edits an approved IAP (spec 4.5.1): `POST /v1/inAppPurchaseVersions`
creates an editable version 2. Its localizations are changed with
`PATCH /v2/inAppPurchaseLocalizations/{id}` and added with
`POST /v2/inAppPurchaseLocalizations` (relationship `version`). The version
then goes to review as a `reviewSubmissionItem` (`inAppPurchaseVersion`).
**Attach it to the 1.2.1 submission:** the new names promise 4 players, which
only exists from 1.2.1 on. If the 1.2.1 submission is already in review when
this runs, submit the IAP version on its own right after 1.2.1 is approved.

Limits: name ≤30, description ≤55 characters. Terms match the app's UI
(`src/i18n/<lang>.ts`: board.big/huge, animal.owl, unlock.perk3p). Every
description says one purchase covers the family (Family Sharing is on).
Codex reviewed every non-English string twice. Its fixes are applied, and its
abbreviations ("jug.", "gioc.") were replaced, since they would show on
Apple's purchase sheet.

| Locale | Current name / description | Proposed name (chars) | Proposed description (chars) |
|---|---|---|---|
| en-US | Unlock Everything / Big and Huge boards, Owl and 3 players | Unlock 4 Players & Big Boards (29) | Big & Huge boards, Owl, 3–4 players, for the family (51) |
| en-GB | Unlock Everything / Big and Huge boards, Owl and 3 players | Unlock 4 Players & Big Boards (29) | Big & Huge boards, Owl, 3–4 players, for all the family (55) |
| es-MX | Desbloquear todo / Tableros grandes, Owl y 3 jugadores | 4 jugadores + Grande/Enorme (27) | Búho, 3–4 jugadores; una compra para toda la familia (52) |
| es-ES | none (shows en-US) | 4 jugadores + Grande/Enorme (27) | Búho, 3–4 jugadores; una compra para toda la familia (52) |
| de-DE | none (shows en-US) | 4 Spieler & große Bretter (25) | Groß/Riesig, Eule, 3–4 Spieler; ein Kauf pro Familie (52) |
| fr-FR | none (shows en-US) | Accès 4 joueurs, Grand/Géant (28) | Grand/Géant, Hibou, 3–4 joueurs, un achat par famille (53) |
| pt-BR | none (shows en-US) | 4 jogadores + Grande/Gigante (28) | Coruja, 3–4 jogadores; uma compra para toda a família (53) |
| ja | none (shows en-US) | 4人プレイと大きなボードを解放 (15) | 大・特大ボード、フクロウ、3人・4人プレイ。家族で共有OK (29) |
| it | none (shows en-US) | 4 giocatori + Grande/Enorme (27) | Gufo, 3–4 giocatori; un acquisto per tutta la famiglia (54) |
| ko | none (shows en-US) | 4인 플레이·큰 판 잠금 해제 (16) | 대형·특대형 판, 부엉이, 3·4인 플레이. 가족 공유 가능 (33) |
| zh-Hant | none (shows en-US) | 解鎖四人對戰與大棋盤 (10) | 大棋盤、超大棋盤、貓頭鷹、三人和四人對戰，全家共享 (25) |
| tr | none (shows en-US) | 4 Oyuncu ve Büyük Tahtaları Aç (30) | Büyük/Dev, Baykuş, 3–4 oyuncu; tek alım tüm aileye (50) |
| nl-NL | none (shows en-US) | Toegang 4 spelers, Groot/Reuze (30) | Groot/Reuze, Uil, 3–4 spelers; één aankoop per gezin (52) |
| pl | none (shows en-US) | Dostęp: 4 graczy, Duża/Ogromna (30) | Duża/Ogromna, Sowa, 3–4 graczy; jeden zakup na rodzinę (54) |
| hi | none (shows en-US) | 4 खिलाड़ी और बड़े बोर्ड अनलॉक (29) | बड़ा/विशाल, उल्लू, 3–4 खिलाड़ी; परिवार के लिए एक खरीद (53) |
| ru | none (shows en-US) | Доступ: 4 игрока, большие поля (30) | Большое/Гигант, Сова, 3–4 игрока; одна покупка на семью (55) |
| vi | none (shows en-US) | Mở khóa 4 người, Lớn/Khổng lồ (29) | Lớn/Khổng lồ, Cú, 3–4 người; mua một lần cho cả nhà (51) |
| id | none (shows en-US) | 4 Pemain, Papan Besar/Raksasa (29) | Burung Hantu, 3–4 pemain; sekali beli untuk sekeluarga (54) |
| th | none (shows en-US) | ปลดล็อก 4 คน + ใหญ่/ยักษ์ (25) | ใหญ่/ยักษ์ นกฮูก 3–4 คน ซื้อครั้งเดียวทั้งครอบครัว (50) |
| ar-SA | none (shows en-US) | افتح 4 لاعبين واللوحات الكبيرة (30) | كبيرة/ضخمة، البومة، 3–4 لاعبين؛ شراء واحد للعائلة (49) |

## 2. India price ₹199 → ₹99 (`--india-price`)

Current schedule: base territory **USA .99** (manual), plus 25 more manual
prices. All other territories follow USA automatically.

| Territory | Now | After |
|---|---|---|
| **IND** | **₹199** (point …`p:10058`, proceeds ₹143.35) | **₹99** (point `eyJzIjoiNjgxNzcyNTM0NCIsInQiOiJJTkQiLCJwIjoiMTAwMjgifQ`, p:10028, proceeds ₹71.31 at the standard rate) |
| USA (base) | $2.99 | $2.99 (unchanged) |
| ARG, BOL, ECU, GHA, KEN, LKA, MAR, NPL, UKR | $1.99 | unchanged |
| BRA R$12.90 · COL 9,900 · EGY 99.99 · IDN Rp39,000 · KAZ 999 · MEX MX$39 · MYS RM9.90 · NGA ₦3,200 · PAK Rs500 · PER S/9.90 · PHL ₱129 · THA ฿79 · TUR ₺99.99 · VNM 59,000₫ · ZAF R39.99 | | unchanged |

The script re-POSTs `/v1/inAppPurchasePriceSchedules` with the USA base and
all 26 current manual prices (same price-point ids, `startDate: null`), with
only IND swapped. It refuses to run unless USA is still the base at $2.99. It
then re-reads the manual prices and compares all 26. Territories not in the
list stay automatic, as they are now. Tips (consumables) are not touched.

Why ₹99: about half of new downloads come from India (PLAN-v1.3.md), and ₹99
is the usual impulse price there. Proceeds per sale halve, so the change pays
off if conversion in India at least doubles. Check `downloads.mjs` (in-app
units, IND) 4 weeks after the change.

## 3. Family Sharing (`--family-sharing`)

**Already on:** the API returns `familySharable: true`. Nothing to do, and the
flag plans 0 writes. (Turning it on can't be undone, but that is already
done.) This is what makes "one purchase for the whole family" true in the
descriptions above.

## 4. Offer code: free unlock (`--offer-codes`)

The API supports offer codes for one-time IAPs (spec 4.5.1):
`POST /v1/inAppPurchaseOfferCodes` (name, `customerEligibilities`, a price per
territory as `included` `inAppPurchaseOfferPrices`), then
`POST /v1/inAppPurchaseOfferCodeCustomCodes` (`customCode`, `numberOfCodes`,
`expirationDate`) or `POST /v1/inAppPurchaseOfferCodeOneTimeUseCodes`
(`numberOfCodes`, `expirationDate`, environment PRODUCTION|SANDBOX). They are
listed with `GET /v2/inAppPurchases/{id}/offerCodes` (0 today) and paused
with `PATCH … {active:false}`. Apple's limits: 10 active offers and 1,000,000
codes per app per quarter. One-time codes expire within 6 months.

Plan:

- Offer "Free unlock, 1.2.1 launch", eligibility NON_SPENDER + ACTIVE_SPENDER +
  CHURNED_SPENDER, price **0** in all 175 territories. The dry run found the
  free price point for every territory via the equalizations of the USA $0.00
  point.
- Custom code **COLORCATCH26**, **500** redemptions, expiring **30 days** after
  creation (`CODE`, `LIMIT`, `DAYS` env vars).
- Create it on the day 1.2.1 is live, so redeemers get the 4-player version.
  Test on the iPad before announcing it (promo-plan.md).
