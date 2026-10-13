# Featuring nomination: Color Catch 1.2.1

Prepared 2026-10-14. Nothing has been sent to App Store Connect yet.

## API support (spec 4.5.1)

The API supports nominations. `POST /v1/nominations` takes `name`, `type`
(`APP_LAUNCH | APP_ENHANCEMENTS | NEW_CONTENT`), `description`, `submitted`,
`publishStartDate`, plus optional `publishEndDate`, `deviceFamilies`, `locales`,
`supplementalMaterialsUris`, `hasInAppEvents`, `launchInSelectMarketsFirst`,
`notes` and `preOrderEnabled`. Its relationships are `relatedApps` (required),
`inAppEvents` and `supportedTerritories`. `GET /v1/nominations` needs
`filter[state]` (one of DRAFT, SUBMITTED, ARCHIVED). The App Manager key can
read nominations: the account has 0 drafts and 0 submitted.

`create-events.mjs --nomination` POSTs the JSON below as a **draft**
(`submitted: false`), linked to the two events. Without `--yes` it only prints
the call. Then open ASC → Featuring → Nominations, read it through and click
Submit yourself. You can also paste the same text into the form by hand.

## Before you submit

- **Lead time.** Apple asks for nominations at least 3 weeks ahead. Nov 1 is
  18 days from today, and 1.2.1 will probably be live around Oct 18–19. The
  nomination asks for a featuring window that starts Nov 1, together with the
  Diwali event. Submit it the day 1.2.1 is approved. A later date such as
  Nov 10 would give Apple more time, but the window would miss Diwali.
- **Accessibility labels.** The published Accessibility Nutrition Labels
  (iPhone and iPad) declare only Dark Interface and Reduced Motion. VoiceOver,
  Larger Text and Differentiate Without Color Alone are all "No". So the text
  says "Dynamic Type", not "Larger Text": text scaling is capped at 1.3–1.4×
  in the turn banner and player trays (`MAX_TEXT_SCALE`), and the Larger Text
  label needs 200%. If you test VoiceOver from start to finish on the iPad,
  and check that Shapes on Pegs meets Apple's Differentiate Without Color
  criteria, declare those two labels before you submit. A nomination that
  leads with accessibility reads better when the labels agree with it.
- `type` is APP_ENHANCEMENTS: 1.2.1 adds 4-player mode and 6 languages. Use
  NEW_CONTENT only for a later content drop, such as 1.3 "Daily board".

## Text (for the form or the API)

- **Name:** Color Catch 1.2.1: 4 players and 18 languages
- **Type:** App Enhancements
- **Publish date:** Nov 1 2026, with no end date
- **Devices:** iPhone, iPad
- **In-app events:** yes. Diwali Family Game Night (Nov 1–12) and Kids vs
  Grown-Ups (India, Nov 10–16)
- **Description:**

> Color Catch is a wooden peg memory game that families play together on one iPhone or iPad. Version 1.2.1 brings it to the whole table, and to more of the world.
>
> Accessibility first: every color also has its own shape (circle, triangle, square, star, heart, diamond) on the pegs and on the die, so color-blind players can play the whole game by shape. VoiceOver reads out every peg and announces turns, rolls and matches. The game supports Dynamic Type, Dark Mode and Reduce Motion, and every control is a single tap, with no dragging.
>
> Localization: the interface now speaks 18 languages, including Hindi and right-to-left Arabic, and the store listing is localized for 20 locales.
>
> Family play: 2 to 4 players pass one device around the table, or play the computer at three levels (Bunny, Fox and Owl). It works fully offline, with no ads and no account, and collects no data. Two-player games are always free. One purchase, shared through Family Sharing, unlocks 3 and 4 players, the Big and Huge boards and Owl, and each of these can be tried once for free first.
>
> In-app events: Diwali Family Game Night (Nov 1–12) and Kids vs Grown-Ups for Children's Day in India (Nov 10–16).

- **Notes:** Solo developer in India. Hindi was added in this release, and both
  events are aimed at Indian families. Feedback is welcome.

## API payload (read by `create-events.mjs --nomination`)

```json
{
  "name": "Color Catch 1.2.1: 4 players and 18 languages",
  "type": "APP_ENHANCEMENTS",
  "description": "Color Catch is a wooden peg memory game that families play together on one iPhone or iPad. Version 1.2.1 brings it to the whole table, and to more of the world.\n\nAccessibility first: every color also has its own shape (circle, triangle, square, star, heart, diamond) on the pegs and on the die, so color-blind players can play the whole game by shape. VoiceOver reads out every peg and announces turns, rolls and matches. The game supports Dynamic Type, Dark Mode and Reduce Motion, and every control is a single tap, with no dragging.\n\nLocalization: the interface now speaks 18 languages, including Hindi and right-to-left Arabic, and the store listing is localized for 20 locales.\n\nFamily play: 2 to 4 players pass one device around the table, or play the computer at three levels (Bunny, Fox and Owl). It works fully offline, with no ads and no account, and collects no data. Two-player games are always free. One purchase, shared through Family Sharing, unlocks 3 and 4 players, the Big and Huge boards and Owl, and each of these can be tried once for free first.\n\nIn-app events: Diwali Family Game Night (Nov 1-12) and Kids vs Grown-Ups for Children's Day in India (Nov 10-16).",
  "publishStartDate": "2026-11-01T00:00:00Z",
  "deviceFamilies": ["IPHONE", "IPAD"],
  "locales": ["en-US", "en-GB", "es-MX", "de-DE", "fr-FR", "pt-BR", "ja", "es-ES", "it", "ko", "zh-Hant", "tr", "nl-NL", "pl", "hi", "ru", "vi", "id", "th", "ar-SA"],
  "supplementalMaterialsUris": ["https://teja788.github.io/peg-recall/"],
  "hasInAppEvents": true,
  "launchInSelectMarketsFirst": false,
  "preOrderEnabled": false,
  "notes": "Solo developer in India. Hindi was added in this release, and both events are aimed at Indian families. Feedback is welcome."
}
```
