# Color Catch - App Store Connect listing (v1.1.0)

Paste-ready metadata for version **1.1.0** in three localizations: **English (U.S.)** (primary),
**Spanish (Mexico)** and **English (U.K.)**. Every count below was measured by script
(characters = Unicode code points, keywords = UTF-8 bytes), not estimated. The script also
checks limits, that no keyword repeats a name/subtitle word, that no field says "for kids" /
"para niños", and that nothing mentions dropped features (speed setting, Toy 24 board) or a
"pink" peg.

Sources: `PLAN-v1.1.md` section 1a (decisions - **D2 overrides the name/subtitle/keywords in
section 6**), sections 5, 6 and 8; `store-assets/listing.md` (v1.0); and the app code
(`app/`, `src/`) for every feature claim. See section 6 for what was changed versus the plan.

| Locale | Name | Subtitle | Promo | Description | Keywords (bytes) | What's New |
|---|---|---|---|---|---|---|
| English (U.S.) - primary | 30/30 | 28/30 | 141/170 | 2781/4000 | 100/100 | 702/4000 |
| Spanish (Mexico) | 21/30 | 29/30 | 164/170 | 3213/4000 | 97/100 | 765/4000 |
| English (U.K.) | 30/30 | 28/30 | 141/170 | 2887/4000 | 99/100 | 708/4000 |

---

## 0. Shared settings (not localized, or the same in every locale)

- **Version string:** `1.1.0`. Must equal `expo.version` in `app.json`, which still reads
  **1.0.0** - bump it before the EAS build (new runtime: `runtimeVersion.policy = appVersion`).
- **Category:** Primary **Games > Board**, secondary **Games > Family**. (The live 1.0 page shows
  Games/Entertainment - fix it on the App Information page.)
- **Made for Kids (Kids Category):** No. So no "for Kids" / "for Children" / "para niños"
  anywhere in the metadata (guideline 2.3.8). The single words "Kids"/"niños" are fine.
- **Age rating:** unchanged from 1.0 - None/No to every question -> 4+. Typed player names stay
  on the device and are never shared, so they are not user-generated content.
- **App Privacy:** unchanged - **Data Not Collected**, no tracking.
- **Price:** Free, no in-app purchases. No ads.
- **Copyright:** `2026 {{YOUR NAME EXACTLY AS ON THE APPLE DEVELOPER ACCOUNT}}`
- **URLs** (same in all three locales; confirmed against `listing.md` section 13 - the
  marketing URL there is written `.../peg-recall/index.html`, which is the same page):
  - Support: `https://teja788.github.io/peg-recall/support.html`
  - Marketing: `https://teja788.github.io/peg-recall/`
  - Privacy Policy: `https://teja788.github.io/peg-recall/privacy.html`
- **Accessibility Nutrition Labels:** VoiceOver (announcements now ship in 1.1), Dark Interface,
  Larger Text, Reduced Motion.
- After saving each locale, **reload the page and re-read every field** (ASC silently dropped
  edits on the 1.0 submission).

### App Review notes (English only; replaces the 1.0 notes)

```
Color Catch is an offline memory game. There is no login, no account, no server, and the game itself never makes a network request. On launch, the app may contact Expo's update service (u.expo.dev) to check for an app update - that check carries no personal data and no gameplay data. The app collects no data (App Privacy: Data Not Collected). No demo account is required.

The App Store name changes in this version from "Peg Recall" to "Color Catch: Memory Board Game"; the app itself was already called Color Catch.

How to reach everything from a cold launch:

1. Home screen - three mode cards (Play vs Computer, 2 Players, 3 Players), a board-size row (16/25/36/40 pegs), an opponent row (Bunny / Fox / Owl), and three icons at the top: ? (How to play), speaker, gear (Settings).
2. Tapping a mode card opens a "Who's playing?" sheet. Each seat is already filled in with an animal name, so just tap Play. Names are optional and are stored only on the device.
3. "2 Players" and "3 Players" are pass-and-play on this one device. No second device or connection is needed.
4. ? icon -> How to play: four short steps and a few tips.
5. Gear icon -> Settings: sound, Shapes on pegs (a color-blind option that puts a distinct shape on each color), bonus turn, kid mode, board size, computer opponent, Stats (wins per player and record vs each computer level, with Reset), Forget player names, and "Rate Color Catch" (opens the App Store review page).

How a turn works: at the start of a game all pegs are shown face-up for a few seconds with a countdown ring, then they flip face-down. Tap the die to roll a color, then tap a peg. A match goes to your tray; a miss reveals the peg for about a second and flips it back. When the board is empty the player with the most pegs wins; a tie is played off on a small sudden-death board (or shared, in kid mode). A 25-peg game takes 3-4 minutes; choose the Small (16 peg) board for the fastest run-through.

The app may show Apple's standard rating prompt (SKStoreReviewController) at most once per version, after several finished games. The app is free, contains no advertising, no in-app purchases and no third-party analytics or ad SDKs. It is rated 4+ and is not in the Kids Category. Universal build: iPhone and iPad, portrait.
```

---

## 1. English (U.S.) - primary

Name, subtitle and keywords are owner decision D2 (PLAN-v1.1.md section 1a) verbatim. "Kids" alone in the subtitle is allowed outside the Kids Category.

### App Name (30/30)

```
Color Catch: Memory Board Game
```

### Subtitle (28/30)

```
Kids & Family: Pass and Play
```

### Promotional Text (141/170)

```
New in 1.1: bolder red and violet pegs, your own player names, and win stats for everyone. Still free: no ads, no sign-in, no data collected.
```

### Description (2781/4000)

```
The wooden peg memory game that kids, parents and grandparents play together. Look at the colored pegs, remember where they stand, then roll the die and find the color. Most pegs wins.

Colored pegs stand on a round wooden board. You get a few seconds to look, then every peg turns to plain wood. Roll the die, it lands on a color, and tap the peg you think is that color. Match it and the peg moves to your tray. Miss, and it shows its color to everyone for a moment before it hides again - so the whole table learns something. When the board is empty, the biggest tray wins.

A Classic game takes three or four minutes. New to it? Tap the ? on the Home screen for four short steps: Look, Roll, Find, Win.

PLAY ALONE OR TOGETHER
- Play the computer at three levels. Bunny is easy and forgets a lot, Fox remembers about half the board, and Owl remembers nearly everything.
- Pass one iPhone or iPad around for 2 or 3 players. No second device, no invitations, no waiting.
- Type each player's name, or skip the keyboard and play as an animal - fox, owl, bear, frog, bunny or cat. Names you have used before come back as one-tap chips, and Play Again keeps the same players.

SEE WHO IS WINNING
- Wins and games played for every player, by name, with a win rate.
- Your record against Bunny, Fox and Owl, with your current and best win streak.
- Stats stay on your device, and you can reset them any time.

A BOARD THAT GROWS WITH YOU
- Small (16 pegs) for little players, Classic (25), Big (36), and Huge (40) when you want a real test.
- Kid mode gives a longer look at the board and turns a tie into a shared win. Otherwise a tie is settled on a tiny sudden-death board.
- Bonus turn on a match is on to start, straight from the original rulebook - and you can switch it off.
- The board fills the screen on every iPhone and iPad.

EASY ON THE EYES, AND ON EVERYONE
- Six bold colors - red, yellow, green, blue, violet and purple - on a warm wooden board.
- Color blind, or find two colors hard to tell apart? Switch on Shapes on Pegs and each color carries its own shape - circle, triangle, square, star, heart, diamond - on the pegs and on the die, so the whole game can be played by shape.
- Light and dark mode, Dynamic Type, VoiceOver labels on every peg with spoken turns, rolls and matches, and Reduce Motion support.
- Big, tap-only targets. No dragging, no long presses.

QUIET BY DESIGN
- No ads, ever. Nothing to buy. No account, no sign-up, no email address.
- No data collected. Player names and stats are saved only on your device. No analytics, ad or tracking kits.
- Works fully offline - on a plane, in the car, anywhere.
- Soft clicks and a chime on a match, off with one tap.

Built for iPhone and iPad. Rated 4+.

Questions or ideas: ravibitspilani@gmail.com
```

Above the fold (first 170 characters): "The wooden peg memory game that kids, parents and grandparents play together. Look at the colored pegs, remember where they stand, then roll the die and find the color. M"

### Keywords (100/100 bytes)

```
toddler,preschool,senior,concentration,2,3,two,player,peg,dice,brain,offline,match,pair,recall,night
```

D2 set, unchanged. Name + subtitle + keywords combine into: memory game, memory board game, color memory game, family game night (family + game + night), pass and play, 2/3/two player game, toddler/preschool memory game, concentration game, peg game, dice game, brain game, offline game, match/pair game.

### What's New in This Version (702/4000)

```
New colors, your own names, and stats.

- Fresh peg colors: red replaces orange and violet replaces sky blue, so every peg is easier to tell apart at a glance.
- Type a name for each player before you start. Prefer the animals? They are still there, one tap away.
- Stats: wins for every player, plus your record and win streak against Bunny, Fox and Owl.
- New How to play page: tap the ? on the Home screen.
- The board now fills the screen on every iPhone and iPad.
- Clearer sudden-death tie-breaks, and VoiceOver now announces turns, rolls and matches.
- Peg Recall is now called Color Catch.
- Small fixes and polish.

Enjoying Color Catch? A rating on the App Store helps other families find it.
```

### URLs

Support URL (49 chars)

```
https://teja788.github.io/peg-recall/support.html
```

Marketing URL (37 chars)

```
https://teja788.github.io/peg-recall/
```

Privacy Policy URL (49 chars) - App Information page, per localization

```
https://teja788.github.io/peg-recall/privacy.html
```


---

## 2. Spanish (Mexico)

Natural Mexican Spanish (tú, computadora, carro, papás, abuelitos). The app UI is English only, so on-screen names (Bunny, Fox, Owl, Small/Classic/Big/Huge, Kid mode, Shapes on Pegs, Play Again, How to play) are kept in English where the shopper will see them, and the description says the app is in English. The U.S. store also indexes Spanish (Mexico), so these keywords add Spanish coverage in the U.S. on top of Mexico.

### App Name (29/30)

"Color Catch: Memorama" was rejected by App Store Connect on 2026-09-26 (name already in use).

```
Color Catch: Memorama y Dados
```

### Subtitle (29/30)

```
Juego de Mesa para la Familia
```

### Promotional Text (164/170)

```
Nuevo en 1.1: fichas rojas y violetas más fáciles de distinguir, nombres para cada jugador y estadísticas. Gratis, sin anuncios, sin registro y sin recopilar datos.
```

### Description (3213/4000)

```
El memorama de fichas de madera que juegan juntos niños, papás y abuelitos. Mira las fichas de colores, recuerda dónde está cada una, tira el dado y encuentra el color. Gana quien junte más fichas.

Las fichas de colores están paradas en un tablero redondo de madera. Tienes unos segundos para verlas y luego todas se voltean y quedan de madera lisa. Tira el dado: cae en un color, y tú tocas la ficha que crees que es de ese color. Si aciertas, la ficha pasa a tu bandeja. Si fallas, todos ven su color un momento antes de que se vuelva a esconder, así que toda la mesa aprende algo. Cuando el tablero se vacía, gana la bandeja más llena.

Una partida en el tablero Classic dura tres o cuatro minutos. ¿Es tu primera vez? Toca el ? en la pantalla de inicio y verás cuatro pasos cortos: mirar, tirar, encontrar y ganar.

JUEGA SOLO O EN COMPAÑÍA
- Juega contra la computadora en tres niveles: Bunny, el conejo, es fácil y olvida mucho; Fox, el zorro, recuerda la mitad del tablero; y Owl, el búho, recuerda casi todo.
- De 2 a 3 jugadores en un solo iPhone o iPad: se lo van pasando por turnos. Sin otro dispositivo, sin invitaciones, sin esperas.
- Escribe el nombre de cada jugador o juega como un animalito: zorro, búho, oso, rana, conejo o gato. Los nombres que ya usaste aparecen listos para elegir con un toque, y Play Again repite con los mismos jugadores.

¿QUIÉN VA GANANDO?
- Partidas jugadas y ganadas por cada jugador, por nombre, con su porcentaje de victorias.
- Tu marcador contra Bunny, Fox y Owl, con tu racha actual y tu mejor racha.
- Las estadísticas se guardan solo en tu dispositivo y puedes borrarlas cuando quieras.

UN TABLERO QUE CRECE CONTIGO
- Small (16 fichas) para los más pequeños, Classic (25), Big (36) y Huge (40) cuando quieras un verdadero reto.
- Kid mode da más tiempo para ver el tablero y convierte un empate en victoria compartida. Si no, el empate se decide en un tablero mini de muerte súbita.
- El turno extra al acertar viene activado, como en el reglamento original, y lo puedes apagar.
- El tablero llena la pantalla en cualquier iPhone o iPad.

FÁCIL DE VER PARA TODOS
- Seis colores intensos (rojo, amarillo, verde, azul, violeta y morado) sobre un tablero de madera cálida.
- ¿Eres daltónico o te cuesta distinguir dos colores? Activa Shapes on Pegs y cada color lleva su propia figura (círculo, triángulo, cuadrado, estrella, corazón y rombo) en las fichas y en el dado, así que puedes jugar solo con las figuras.
- Modo claro y oscuro, texto dinámico, VoiceOver en cada ficha con avisos de turnos, tiradas y aciertos, y soporte para Reducir movimiento.
- Botones grandes, solo toques: nada de arrastrar ni de mantener presionado.

TRANQUILO POR DISEÑO
- Sin anuncios, nunca. Nada que comprar. Sin cuenta, sin registro, sin correo.
- No recopila datos. Los nombres y las estadísticas se guardan solo en tu dispositivo. Sin herramientas de análisis, publicidad ni rastreo.
- Funciona sin internet: en el avión, en el carro, donde sea.
- Clics suaves y una campanita al acertar; se apagan con un toque.

La app está en inglés, pero casi no hace falta leer: colores, un dado y fichas.

Para iPhone y iPad. Clasificación 4+.

¿Dudas o ideas? ravibitspilani@gmail.com
```

Above the fold (first 170 characters): "El memorama de fichas de madera que juegan juntos niños, papás y abuelitos. Mira las fichas de colores, recuerda dónde está cada una, tira el dado y encuentra el color. G"

### Keywords (97/100 bytes)

```
memoria,niños,sin,internet,jugadores,dos,colores,fichas,preescolar,abuelos,concentración,parejas
```

No word is shared with the en-US keyword field (checked by script). "memorama", "juego", "mesa" and "familia" are already in the name/subtitle, so they are not repeated. Target phrases: memorama de colores, juego de memoria, juegos de mesa para dos jugadores, juegos sin internet, juego de dados, memorama preescolar, juego de concentración, juego de parejas, juegos para abuelos. "niños" as a single keyword is allowed (only "para niños" wording is restricted).

### What's New in This Version (765/4000)

```
Colores nuevos, sus propios nombres y marcador.

- Nuevos colores: el rojo reemplaza al naranja y el violeta al azul cielo, para distinguir cada ficha de un vistazo.
- Escribe el nombre de cada jugador antes de empezar. ¿Prefieres los animalitos? Siguen ahí, a un toque.
- Estadísticas: victorias de cada jugador, y tu marcador y tu racha contra Bunny, Fox y Owl.
- Nueva pantalla How to play: toca el ? en la pantalla de inicio.
- El tablero ahora llena la pantalla en cualquier iPhone o iPad.
- Los desempates de muerte súbita son más claros, y VoiceOver ahora anuncia turnos, tiradas y aciertos.
- Peg Recall ahora se llama Color Catch.
- Pequeños arreglos y mejoras.

¿Te gusta Color Catch? Una calificación en el App Store ayuda a otras familias a encontrarlo.
```

### URLs

Support URL (49 chars)

```
https://teja788.github.io/peg-recall/support.html
```

Marketing URL (37 chars)

```
https://teja788.github.io/peg-recall/
```

Privacy Policy URL (49 chars) - App Information page, per localization

```
https://teja788.github.io/peg-recall/privacy.html
```


---

## 3. English (U.K.)

British spelling (colour, coloured, colour-blind, winning streak). The brand name stays "Color Catch" - it is the app's name, not a word to localise. English (U.K.) is the listing for the UK and also India (where the physical peg toy sells as "memory chess"), and those storefronts do not read the en-US keyword field, so this keyword set stands on its own.

### App Name (28/30)

App Store Connect refused the en-US name in this locale on 2026-09-26 ("already being used"), so en-GB has its own.

```
Color Catch: Memory Peg Game
```

### Subtitle (28/30)

```
Kids & Family: Pass and Play
```

### Promotional Text (141/170)

```
New in 1.1: bolder red and violet pegs, your own player names, and win stats for everyone. Still free: no ads, no sign-in, no data collected.
```

### Description (2887/4000)

```
The wooden peg memory game that kids, parents and grandparents play together. Look at the coloured pegs, remember where they stand, then roll the die and find the colour. Most pegs wins.

If you know the wooden peg toy often sold as memory chess, you already know how to play. Coloured pegs stand on a round wooden board. You get a few seconds to look, then every peg turns to plain wood. Roll the die, it lands on a colour, and tap the peg you think is that colour. Match it and the peg moves to your tray. Miss, and it shows its colour to everyone for a moment before it hides again - so the whole table learns something. When the board is empty, the biggest tray wins.

A Classic game takes three or four minutes. New to it? Tap the ? on the Home screen for four short steps: Look, Roll, Find, Win.

PLAY ALONE OR TOGETHER
- Play the computer at three levels. Bunny is easy and forgets a lot, Fox remembers about half the board, and Owl remembers nearly everything.
- Pass one iPhone or iPad around for 2 or 3 players. No second device, no invitations, no waiting.
- Type each player's name, or skip the keyboard and play as an animal - fox, owl, bear, frog, bunny or cat. Names you have used before come back as one-tap chips, and Play Again keeps the same players.

SEE WHO IS WINNING
- Wins and games played for every player, by name, with a win rate.
- Your record against Bunny, Fox and Owl, with your current and best winning streak.
- Stats stay on your device, and you can reset them at any time.

A BOARD THAT GROWS WITH YOU
- Small (16 pegs) for little players, Classic (25), Big (36), and Huge (40) when you want a real test.
- Kid mode gives a longer look at the board and turns a tie into a shared win. Otherwise a tie is settled on a tiny sudden-death board.
- Bonus turn on a match is on to start, straight from the original rulebook - and you can switch it off.
- The board fills the screen on every iPhone and iPad.

EASY ON THE EYES, AND ON EVERYONE
- Six bold colours - red, yellow, green, blue, violet and purple - on a warm wooden board.
- Colour-blind, or find two colours hard to tell apart? Switch on Shapes on Pegs and each colour carries its own shape - circle, triangle, square, star, heart, diamond - on the pegs and on the die, so the whole game can be played by shape.
- Light and dark mode, Dynamic Type, VoiceOver labels on every peg with spoken turns, rolls and matches, and Reduce Motion support.
- Big, tap-only targets. No dragging, no long presses.

QUIET BY DESIGN
- No ads, ever. Nothing to buy. No account, no sign-up, no email address.
- No data collected. Player names and stats are saved only on your device. No analytics, ad or tracking kits.
- Works fully offline - on a plane, in the car, anywhere.
- Soft clicks and a chime on a match, off with one tap.

Built for iPhone and iPad. Rated 4+.

Questions or ideas: ravibitspilani@gmail.com
```

Above the fold (first 170 characters): "The wooden peg memory game that kids, parents and grandparents play together. Look at the coloured pegs, remember where they stand, then roll the die and find the colour."

### Keywords (99/100 bytes)

```
colour,toddler,preschool,senior,concentration,two,player,dice,brain,offline,match,pair,recall,board
```

The en-US set with "colour" added (the name only indexes "color") and "3" and "night" dropped to fit ("family game night" is a US phrase; the UK says "games night"). "memory chess" is mentioned once in the description for recognition by Indian parents but kept out of keywords (it returns chess apps; PLAN section 6).

### What's New in This Version (708/4000)

```
New colours, your own names, and stats.

- Fresh peg colours: red replaces orange and violet replaces sky blue, so every peg is easier to tell apart at a glance.
- Type a name for each player before you start. Prefer the animals? They are still there, one tap away.
- Stats: wins for every player, plus your record and winning streak against Bunny, Fox and Owl.
- New How to play page: tap the ? on the Home screen.
- The board now fills the screen on every iPhone and iPad.
- Clearer sudden-death tie-breaks, and VoiceOver now announces turns, rolls and matches.
- Peg Recall is now called Color Catch.
- Small fixes and polish.

Enjoying Color Catch? A rating on the App Store helps other families find it.
```

### URLs

Support URL (49 chars)

```
https://teja788.github.io/peg-recall/support.html
```

Marketing URL (37 chars)

```
https://teja788.github.io/peg-recall/
```

Privacy Policy URL (49 chars) - App Information page, per localization

```
https://teja788.github.io/peg-recall/privacy.html
```


---

## 4. Screenshot captions (7, in this order)

Order and English copy from PLAN-v1.1.md section 6. Shapes off except shot 6; captions on; never
lead with a face-down board (the first three shots show in search results). Counts in brackets
(characters). The screenshots themselves show the English UI in every locale; only the captions
change. Reuse the English (U.S.) screenshots for English (U.K.) with the U.K. captions (only
shots 2 and 6 differ).

| # | English (U.S.) | Spanish (Mexico) | English (U.K.) |
|---|---|---|---|
| 1 | Look. Remember. Find it. (24) | Mira. Recuerda. Encuéntrala. (28) | Look. Remember. Find it. (24) |
| 2 | Roll a color. Pick the peg. (27) | Tira el dado. Elige la ficha. (29) | Roll a colour. Pick the peg. (28) |
| 3 | Pass and play with the family (29) | Pásalo y juega en familia (25) | Pass and play with the family (29) |
| 4 | Bunny, Fox or Owl: pick a rival (31) | Reta a la computadora: 3 niveles (32) | Bunny, Fox or Owl: pick a rival (31) |
| 5 | From 16 pegs to 40 (18) | De 16 a 40 fichas (17) | From 16 pegs to 40 (18) |
| 6 | Shapes for color-blind players (30) | Figuras para jugadores daltónicos (33) | Shapes for colour-blind players (31) |
| 7 | Free. Offline. No ads. (22) | Gratis. Sin internet. Sin anuncios. (35) | Free. Offline. No ads. (22) |

| # | What the shot shows |
|---|---|
| 1 | Reveal: every peg face-up in full colour, countdown ring running |
| 2 | Die showing red or violet over the face-down board, "Find Red" banner |
| 3 | 3-player trays with typed names (e.g. Maya, Leo, Grandma) |
| 4 | Game vs the computer, Bunny/Fox/Owl picker or an AI tray visible |
| 5 | Home board-size row (Small 16 - Huge 40) or a Huge board mid-game |
| 6 | Shapes on Pegs switched on: shapes on pegs and on the die |
| 7 | Dark mode, game-over sheet with confetti after a human win |

---

## 5. Pre-submission checks tied to this copy

- [ ] `app.json` `expo.version` bumped to `1.1.0`.
- [ ] Every screenshot reshot with the red/violet palette; the three trays in shot 3 show typed names.
- [ ] `privacy.html` (both `docs/` and `store-assets/site/`) says player names and stats are
      stored on the device only (PLAN section 4 "Store/privacy"); today it does not mention names.
- [ ] Category set to Board / Family on App Information.
- [ ] Promotional text can go live today for en-US (no review needed); the rest rides on the 1.1.0 submission.
- [ ] Reload each locale after saving and re-check every field.

---

## 6. Verification against the code (what changed versus the plan / v1.0 copy)

- **Sixth colour is "purple", not "pink".** The app ships red, violet, blue, green, yellow and
  **purple** (`src/engine/types.ts`, spoken label "Purple" in `src/theme/tokens.ts`, fill
  #CC79A7). Plan section 3 palette "R" (with pink) was not chosen (decision D1), so the copy says
  "red, yellow, green, blue, violet and purple" / "rojo, amarillo, verde, azul, violeta y morado".
  If the owner renames the label to Pink, change those two phrases.
- **Dropped the v1.0 claim** "six colors chosen to stay apart for every common kind of color
  blindness" (PLAN section 3 asks for this; red/green and blue/violet cannot both be safe).
  The copy now points colour-blind players to Shapes on Pegs.
- **Dropped** "so nobody has to type a name" (names exist now), "stays silent when you launch it"
  (not verified in code) and "two soft clips" (Settings says "Soft clicks and a chime on a match").
- **Rewrote the plan's description opening**: "memory game for kids, families and grandparents"
  became "memory game that kids, parents and grandparents play together", because "for kids"
  in any metadata field is restricted outside the Kids Category (guideline 2.3.8).
- **Promo text** (plan: names + colours) also mentions stats, which shipped (`StatsCard.tsx`).
- **Stats claims** limited to what `StatsCard.tsx` shows: per-player wins, games and win %;
  per-opponent wins-losses, current and best streak; Reset. No head-to-head and no recall %,
  which the plan had floated.
- **Not claimed:** speed setting and Toy 24 board (dropped, D3), toddler mode (rejected),
  landscape play (`app.json` is `"orientation": "portrait"`), Game Center, more than 3 players.
- **Home tagline** reads "Roll a color. Remember where it was." (`app/index.tsx`) - the UK
  spelling the plan flagged is already fixed. The only remaining "colour" in user-facing
  strings is the Die's VoiceOver hint "Rolls the colour you must find" (`src/ui/Die.tsx:176`),
  heard only with VoiceOver; not a listing problem.
