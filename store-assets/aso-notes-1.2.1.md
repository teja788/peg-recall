# ASO notes: 1.2.1 listings (Oct 14 2026)

Six new store locales: `hi`, `ru`, `vi`, `id`, `th`, `ar-SA` (zh-Hans dropped by the owner).
Data: `app-store-scraper` `suggest` (autocomplete = demand) and `search` (median rating count of the
top 10 = competition, "med"). About 90 searches in total, no 403s.

## Names, subtitles, fallbacks

Store names must be unique per locale. If `push` reports a name conflict, use the fallback.

| Locale | Name | Subtitle | Fallback name |
|---|---|---|---|
| hi | Color Catch: याददाश्त का खेल (memory game) | बच्चे, परिवार और बुज़ुर्ग (kids, family & elders) | Color Catch: रंग और याददाश्त (colors & memory) |
| ru | Color Catch: Игра на память (memory game) | Дети, семья и пожилые (kids, family & seniors) | Color Catch: Найди цвет (find the color) |
| vi | Color Catch: Trò chơi trí nhớ (memory game) | Trẻ em, gia đình và ông bà (kids, family & grandparents) | Color Catch: Game trí nhớ |
| id | Color Catch: Game Memori (memory game) | Anak, Keluarga & Lansia (kids, family & seniors) | Color Catch: Asah Ingatan (sharpen memory) |
| th | Color Catch: เกมความจำ (memory game) | เด็ก ครอบครัว และผู้สูงอายุ (kids, family & seniors) | Color Catch: เกมฝึกความจำ (memory-training game) |
| ar-SA | Color Catch: لعبة الذاكرة (the memory game) | الأطفال والعائلة وكبار السن (kids, family & seniors) | Color Catch: ذاكرة الألوان (color memory) |

No subtitle says "for kids" (App Review 2.3.8 / 5.1.4(b)). "memory"/"мемори"/"Memorama" are not used.
Indonesian "memori" is the ordinary Indonesian word, like pt-BR "Jogo da Memória".

## Findings per country (demand vs competition)

- **India (in):** people search in English. "memory games for kids" med 6, "matching game for kids" med 0
  (both weak top 10s), "memory games for adults" med 3858, "brain games for kids" med 7313.
  Hindi-script and Hinglish queries have almost no autocomplete (दिमागी खेल, याददाश्त, "dimag", "khel":
  nothing relevant), so the hi keyword field is mostly English: matching, games, adults, elderly,
  dementia, 4, players, plus दिमागी, पासा, जोड़ी.
- **Russia (ru):** "игра на память" is in autocomplete but strong (med 23k). "игры для пожилых" med 310,
  "игры для двоих троих четверых" med 22 (fits the new 4-player mode), "найди пару" is in demand
  (med 8.6k). "запомни цвет" med 8 but low demand.
- **Vietnam (vn):** "trò chơi trí nhớ" med 147 (weak), "lật thẻ trí nhớ" med 1, "trò chơi màu sắc" med 94,
  "game luyện trí nhớ" med 3k. Card-flip phrasing (lật hình/lật thẻ giống nhau) has the most demand.
- **Indonesia (id):** "game memori" med 1.8k, "game ingatan" med 2, "game asah otak anak" med 3,
  "game 2 pemain" med 37. "game asah otak" is strong (20k).
- **Thailand (th):** "เกมความจำ" med 5 and "เกมฝึกความจำ" med 2 (weak, good for the name),
  "เกมฝึกสมองเด็ก" med 10, "เกมจับคู่" strong (13k), "เกมสี่คน" med 4.6k.
- **Saudi/UAE/Egypt (sa/ae/eg):** "لعبة الذاكرة" med 93 / 35 / 11 (weak everywhere, so it's in the name),
  "العاب تقوية الذاكرة" med 4, "لعبة تطابق الصور" med 50, "العاب تركيز" strong (13.5k SA).

## US cross-indexing (the US store also indexes ru, vi, ar)

English words missing from en-US (name, subtitle and keywords) and from fr-FR/es-MX/pt-BR:
- ru: `peg,pairs,4` ("peg game" med 2: accurate and nearly empty; "matching pairs" med 915)
- vi: `card,alzheimers` ("memory card game" med 5.6k; "alzheimers games" med 5.8k)
- ar-SA: `flip,4` ("memory card flip game" in autocomplete; "4 player games")

## Also changed in 1.2.1

- whatsNew for all 20 locales: 4-player mode (part of the one-time unlock, ready for anyone who
  already unlocked), the 6 new languages, small fixes.
- Every existing description now says 2 to 4 players, and that the unlock includes 3 and 4 players.
- reviewNotes mention the 4 Players card.
- Not changed: promotionalText of the 14 existing locales still says "New in 1.2: ... 3 players".
  It isn't wrong, but it's stale. Refresh it if wanted.

## Codex review (Oct 14 2026)

26 fixes applied: register (hi step names now use the आप forms, ru step names are infinitives,
ar whatsNew is consistently plural), literal phrasing (ru, vi, id dice sentences, ar "the peg
disappears" changed to "hides its color"), ar "أدوات تحليلية", id "bahasa Thai", and id keyword
`pikun` changed to `fokus` (ageist). The 1.2.1 whatsNew wording was tightened in en-US/en-GB, fr-FR,
ja, ko, zh-Hant and nl-NL, plus the fr-FR description. Thai was judged fine as written.

Not applied, on purpose:
- Dropping `dementia` (hi) and `alzheimers` (vi): en-US and 7 other live locales already use these
  words and passed review.
- Renaming id to "Asah Ingatan": "memori" is the ordinary Indonesian dictionary word and the term
  people search ("game memori"). It is kept as the fallback if the owner prefers zero risk.
- ru "Никаких данных не собирается": this is correct Russian (genitive of negation).
- `العاب` changed to `ألعاب`: autocomplete shows that users type it without the hamza.
- ru `пожилых`: a different inflection from the subtitle's "пожилые", and it matches the
  "игры для пожилых" query.

## Aligned with the app UI (src/i18n/{hi,ru,vi,id,th,ar}.ts)

- Board names: ru Малое/Обычное/Большое/Гигант, hi विशाल, th ยักษ์, ar لوحة (feminine) صغيرة/كلاسيكية/كبيرة/ضخمة.
- Tie-break: ru тай-брейк, hi टाई-ब्रेकर, id babak penentu, vi hiệp phụ, ar الجولة الفاصلة.
- Other terms: ru Бонусный ход, «Фигуры на фишках», «Ещё раз», мишка/котик and the step names
  Смотри/Бросай/Ищи/Побеждай; hi "बच्चों का मोड"; ar step "اربح".
- Colours: the six peg colours are red, yellow, green, blue, purple and pink. Each new locale now
  uses the UI's word for pink (गुलाबी, розовый, hồng, merah muda, ชมพู, الوردي).
- promotionalText in all 20 locales is now about 1.2.1: up to 4 players and the new languages.
  None of them still says "New in 1.2 … 3 players".
- hi keeps the आप register in the listing (the UI uses तुम).
