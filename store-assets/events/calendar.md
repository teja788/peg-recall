# In-App Event calendar, Nov 2026 to Sept 2027

Apple's rules: name ≤30 characters, short description ≤50, long description
≤120. An event can be promoted up to 14 days before it starts and can last
up to 31 days. At most 10 events can be published at a time, and 15 approved.
Media: event card 1920×1080 and details page 1080×1920, with no text. Event
review takes about a day, but submit at least 2 weeks ahead: if it is
rejected, there is still time to fix it and keep the promotion window.

Each event needs something real to do in the app during it. Apple rejects
"general app promotion". For the festival events, that means a family game
night with the same game. Events from 1.3 on can have real in-app content,
such as a festival board on the daily board. Never put prices in the copy.
Copy for a locked item (Big/Huge, Owl, 3–4 players) needs
`purchaseRequirement` or "try it once free" wording.

| Event dates | Badge | Territories | Idea (name ≤30) | Submit by |
|---|---|---|---|---|
| Nov 1–12 2026 (Diwali Nov 8) | SPECIAL_EVENT | IND + diaspora (22) | **Diwali Family Game Night**: ready in `diwali-2026/` | **Oct 18 2026** (right after 1.2.1 is approved; it publishes Oct 22) |
| Nov 10–16 2026 (Bal Diwas Nov 14) | CHALLENGE | IND | **Kids vs Grown-Ups**: ready in `childrens-day-2026/` | **Oct 27 2026** |
| ~1.3 release + 1 day, 3 weeks (target early Dec 2026) | MAJOR_UPDATE | all | **A New Board Every Day**: the 1.3 daily board ("same board for everyone today, share your score"). Submit together with the 1.3 binary, with a start date after the expected approval. A MAJOR_UPDATE event must not start before the update is live | with 1.3 (≥2 weeks before start) |
| Dec 19 2026 – Jan 3 2027 | SPECIAL_EVENT | all | **Holiday Game Night**: winter break, family at the table, pass one iPad around | Dec 5 2026 |
| Dec 31 2026 – Jan 3 2027 | CHALLENGE (optional, if the holiday event is skipped) | all | **New Year Rematch**: "first game of the year: who wins?" | Dec 17 2026 |
| Jan 23–26 2027 (Republic Day Tue Jan 26) | SPECIAL_EVENT | IND | **Republic Day Game Day**: long-weekend family play. Keep it neutral, with no flag imagery on the board and no political wording | Jan 9 2027 |
| Feb 4–10 2027 (Lunar New Year Feb 6) *optional* | SPECIAL_EVENT | TWN, HKG, SGP, MYS | **Lunar New Year Game Night** (zh-Hant copy) | Jan 21 2027 |
| Mar 18–24 2027 (Holika Dahan Sun Mar 21, **Holi Mon Mar 22**, verified on drikpanchang.com) | SPECIAL_EVENT | IND + diaspora | **Holi Colour Catch**: the colour festival meets the colour game. Media: pegs with gulal colour clouds in the 6 peg colours | Mar 4 2027 |
| Mar 1–7 2027 (UK Mothering Sunday Mar 7) *optional* | CHALLENGE | GBR, IRL | **Can You Beat Mum?** | Feb 15 2027 |
| May 3–9 2027 (Mother's Day Sun May 9: US, IND, CAN, AUS…) | CHALLENGE | USA, IND, CAN, AUS, NZL… | **Can You Beat Mom?** | Apr 19 2027 |
| May 1–31 2027 (Indian school summer break) | SPECIAL_EVENT | IND | **Summer Holiday Game Club**: a game a day with the cousins | Apr 16 2027 |
| Jun 14–20 2027 (Father's Day Sun Jun 20: US, UK, IND, CAN) | CHALLENGE | USA, GBR, IND, CAN | **Can You Beat Dad?** | May 31 2027 |
| Jul 1–31 2027 (US/EU summer) | SPECIAL_EVENT | all except IND | **Summer Road Trip Games**: offline, one device, no Wi-Fi needed in the car or at the cottage | Jun 16 2027 |
| Sep 1–5 2027 (Teachers' Day Sun Sep 5) | CHALLENGE | IND | **Students vs Teachers**: classroom or family, pass the iPad | Aug 18 2027 |
| Sep 4–14 2027 (Ganesh Chaturthi Sat Sep 4, Anant Chaturdashi Tue Sep 14) | SPECIAL_EVENT | IND | **Ganesh Chaturthi Game Nights**: ten evenings, a game a night | Aug 21 2027 |
| Sep 6–12 2027 (Grandparents Day Sun Sep 12: US, also CAN) | CHALLENGE | USA, CAN | **Grandkids vs Grandparents**: fits the "kids, parents and grandparents" listing | Aug 23 2027 |

Dates checked: Holi 2027 is Mon Mar 22 (Holika Dahan Sun Mar 21), and Ganesh
Chaturthi 2027 is Sat Sep 4 (Visarjan Tue Sep 14), both from drikpanchang.com.
Mother's Day is the 2nd Sunday of May, May 9 2027. Father's Day is the 3rd
Sunday of June, Jun 20 2027. US Grandparents Day is the first Sunday after
Labor Day (Mon Sep 6), so Sep 12 2027. Mothering Sunday 2027 is Mar 7, since
Easter is Mar 28. Diwali 2027 (Oct 29) falls just after this calendar. Start
preparing it in early Oct 2027.

Overlaps: Teachers' Day, Ganesh Chaturthi and Grandparents Day all fall in
the first half of Sept 2027. Three published events at once is within
Apple's limit of 10, but if only one can get attention, Ganesh Chaturthi in
IND and Grandparents Day in USA/CAN don't compete with each other.

Reuse: `render-events.mjs` draws the board from `creative/header.png` and adds
SVG decoration. A new event needs a new decoration function and a folder with
`event.json`. `create-events.mjs <slug>` creates it, uploads it and submits it.
