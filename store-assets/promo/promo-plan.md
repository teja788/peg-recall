# Free-unlock promo for 1.2.1 (offer code)

Prepared 2026-10-14. Nothing has been created in App Store Connect yet.

## What

- An IAP offer code makes "Unlock everything" (com.raviteja.pegrecall.unlock)
  **free** in all 175 territories. Customer eligibility is all three groups:
  never spent, spent in the last 30 days, and spent earlier, so people who
  left a tip can redeem it too. Anyone who already owns the unlock has nothing
  to redeem.
- One **custom code**, `COLORCATCH26`, with **500 redemptions** that expires
  **30 days** after it is created. Change it with
  `CODE=… LIMIT=… DAYS=… node store-assets/promo/apply-iap.mjs --offer-codes`.
- Redeem link (opens the App Store and installs the app if needed):
  `https://apps.apple.com/redeem?ctx=offercodes&id=6813625311&code=COLORCATCH26`
- The app needs no change. A redeemed unlock reaches the app through
  `purchaseUpdatedListener` (src/store/purchases.ts) if it is open, or through
  `checkOwned()` at the next launch. "Restore purchase" also picks it up.
- Stop it early: `PATCH /v1/inAppPurchaseOfferCodeCustomCodes/{id} {"active":false}`
  (ASC → the IAP → Offer Codes → Deactivate).

## Timing

| When | What | Who |
|---|---|---|
| D = the day 1.2.1 is **Ready for Distribution** (live) | `node store-assets/promo/apply-iap.mjs --offer-codes` (dry run), then add `--yes` | Claude, after your OK |
| D to D+3 | Wait. A redemption bug for non-consumable codes is reported on Apple's forums (thread 824524, Apr 2026): "This promotional offer is not available" for 48–72 h after the codes are created, after which they work. Don't announce before your own test passes | — |
| D+1 or later | **Test one redemption on your iPad** (checklist below) | owner |
| **D+2 (48 h after 1.2.1 is live), if the test passed** | Post on r/AppHookup, a weekday at 8–10 am US Eastern (5:30–7:30 pm IST). Send the message to friends on the same day | owner |
| D+2 to D+30 | Check the redemption count in ASC (IAP → Offer Codes) every few days. If the 500 run out early, decide whether to add a second code | owner / Claude |

1.2.1 is submitted ~Oct 16, so it is live around Oct 18. That puts the codes
on Oct 18, the test on Oct 19–21 and the post on Oct 20–21. The Diwali event
starts promoting on Oct 22, so the two support each other.

## Owner test on the iPad (before any announcement)

1. Use the **App Store** build (not TestFlight) and your real Apple Account.
   A sandbox account can't redeem production codes. The account must not own
   the unlock yet. (If you were grandfathered as a pre-1.2 user, the app shows
   everything unlocked anyway. The test then only proves that the App Store
   accepts the code. Restore purchase shows whether the transaction arrived.)
2. In Safari on the iPad, open the redeem link above. The App Store sheet
   should show "Unlock everything" for **Free**. Confirm.
3. Open Color Catch. Big/Huge, Owl and 3/4 Players are open, and the Unlock
   card shows "Unlocked. Thank you!".
4. If you see "This promotional offer is not available", wait 24 h and try
   again (the propagation delay above). Don't post until it works. If it
   still fails after 72 h, Claude reads the offer's state with the API.
5. The test uses 1 of the 500 redemptions.

## r/AppHookup post

Rules (from the sidebar; reddit.com can't be fetched from here, so read
them again on the phone before posting):

- The title format is strictly `[Platform] [Title] [Price Change] [Description]`.
- Link directly to the deal (App Store), with no blogs. No ALL CAPS, symbols
  or special characters in the title.
- Developers follow the same rules and **must disclose** that they made the
  app. Self-promotion that looks like shilling gets banned.
- No betas, no introductory pricing, no apps that are "usually free", and no
  trials shorter than a year. **Risk:** the app is free to download and the deal
  is on its in-app purchase. IAP deals do get posted ("[$2.99 IAP -> Free]"),
  but send the mods a modmail with the draft first and ask whether a
  free-IAP code for a free app is allowed.
- Posts from new accounts are held for mod approval. Post from your normal,
  older account.
- Offer codes are allowed when the code unlocks an **App Store** offer. This one
  is Apple's own offer code, not an in-app code.

**Title**

```
[iOS] [Color Catch: Memory Match Game] [$2.99 IAP -> Free] [Wooden peg memory game for 2 to 4 players on one iPhone or iPad, no ads, offline, 500 codes]
```

**Link:** `https://apps.apple.com/redeem?ctx=offercodes&id=6813625311&code=COLORCATCH26`

**First comment (from you, posted right away):**

```
Hi, I'm the developer (solo, from India). This code makes the one-time
"Unlock everything" purchase free: Big and Huge boards, Owl (the hard
computer player) and 3 or 4 players passing one device around.

How to redeem: tap the link, or App Store > your profile picture >
Redeem Gift Card or Code > COLORCATCH26. 500 redemptions, valid until
<expiry date>. If the app was open, reopen it.

What it is: colored pegs on a wooden board, a few seconds to look, then
they all turn to plain wood. Roll the die, tap where that color was, most
pegs wins. Play the computer (Bunny, Fox, Owl) or pass the iPhone/iPad
around. Shapes on the pegs for color-blind players, VoiceOver, 18
languages. No ads, no account, works offline, no data collected. The
unlock works with Family Sharing.

Feedback very welcome, especially on the 4-player mode, which is new.
```

Fill in `<expiry date>` from the `--offer-codes --yes` output.

## Message for friends (WhatsApp)

```
Hi! My little iPhone/iPad game Color Catch just got a 4-player mode 🎉
Here's the full unlock free (normally paid) – tap to redeem:
https://apps.apple.com/redeem?ctx=offercodes&id=6813625311&code=COLORCATCH26
Great for family game night: one device, pass it around. No ads.
If you like it, a rating on the App Store would mean a lot 🙏
```

(The 500-redemption limit is shared with Reddit. For close friends you can
also hand out single-use codes: `POST /v1/inAppPurchaseOfferCodeOneTimeUseCodes`
with `numberOfCodes`. Their list is downloaded as a file, so save it as
`store-assets/promo/codes-<date>.txt` and keep it out of git, see below.)

## Keep code files out of git

`.gitignore` does **not** cover `store-assets/promo/codes*.txt` yet (checked
with `git check-ignore`). Add this line:

```
store-assets/promo/codes*.txt
```

(`.easignore` already excludes all of `store-assets/` from EAS uploads.)
