# Color Catch (Memory Chess)

A calm memory peg game for iPhone and iPad. Roll the colour die, find the matching peg on the round wooden board, keep it. Play against the computer (Bunny / Fox / Owl) or pass-and-play with 2 or 3 players.

Built with Expo SDK 55 (React Native 0.83), expo-router, react-native-reanimated 4, moti, react-native-svg, expo-audio, expo-haptics, zustand + expo-sqlite key-value store.

## Run

```bash
npm install --legacy-peer-deps
npx expo start            # Expo Go on a simulator/device
npx expo start --web      # browser smoke test
```

## Test

```bash
npx tsx --test src/engine/__tests__/*.test.ts src/layout/__tests__/*.test.ts
npx tsc --noEmit -p .
```

## Layout

| Path | What |
|---|---|
| `src/engine/` | Pure TypeScript rules engine, seeded RNG, computer opponent ("belief memory" model) |
| `src/layout/` | Round-board peg layout (hex lattice clipped to a disc) |
| `src/ui/art/` | SVG art: perspective board, peg dolls, wooden die, avatars, shapes |
| `src/ui/` | Board, Peg, Die, trays, banner, game-over sheet |
| `src/store/` | Settings persistence and the game driver (timers, AI turns) |
| `app/` | expo-router screens: home, game, settings |
| `assets/` | Icon, splash, sounds (generated from `assets/source/`) |
| `docs/` | Privacy policy and support pages (GitHub Pages) |
| `store-assets/` | App Store listing copy, screenshot plan, submission checklist |

Plan and decisions: [PLAN.md](PLAN.md). Privacy: https://teja788.github.io/peg-recall/privacy.html
