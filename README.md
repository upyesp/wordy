# wordy

A word game — a finger-slide word puzzle on a honeycomb of tiles.

Slide a path of three or more tiles to spell a word; longer words score more. Tiles dip under your finger, and every board is dealt fresh — with a shared daily board, a streak, three hints, and a review of the words you found.

Play: **https://upyesp.github.io/wordy/** (deployed from `main` by GitHub Actions).

## Development

```sh
pnpm install
pnpm dev        # local dev server
pnpm build      # typecheck + production build to dist/
```

PixiJS 8 + Vite + TypeScript. Installable PWA (manifest + service worker, offline-capable); mouse input works on desktop; the portrait stage letterboxes.

## Game

- Slide across tiles to form a trace; on release, words of **3+ letters** found in the dictionary score `10·(length−2)²` points; repeats score nothing. **BEST** persists in `localStorage`.
- **Every game deals a fresh board**: a couple of common words land on straight rows (forward or backward), most are laid along winding self-avoiding paths that interlock crossword-style, the rest fills with frequency-weighted letters, and the result is quality-gated (a capped DFS must find enough dictionary words, or generation retries).
- **Today's board is the daily board**: its letters come from a seed fixed by your local calendar day, so it is the same arrangement for everyone that day. **New game** deals random boards; **Daily board** brings today's back. A **streak** counts consecutive days on which you scored at least one word.
- The ☰ menu (top-right) holds **Sound**, **Theme** (light/dark, persisted), **Hint** (three per board: flashes an unfound word and its route), **New game**, and **Daily board**. Tap the **WORDS** stat to review every word found on the current board, newest first.
- The top 56pt of the stage are kept clear for the iOS status bar/notch.
- Dictionary: 148,736 English words (3–8 letters) from [dwyl/english-words](https://github.com/dwyl/english-words) for validation; 4,622 common words (google-10000, no swears) for board placement. Sound is a tiny Web Audio synth — no assets.

## Design decisions

- Vocabulary: [GLOSSARY.md](./GLOSSARY.md) — slide, dip, trace, selected, trace strip.
- ADRs: [docs/adr/](./docs/adr/) — the dip is faked with scale + directional shading (0001), the board is a pointy-top offset-row rectangle (0002, resized to 5×7 in 0003), the daily board is seeded by the local day with a streak (0004), and hints reveal a word path three times a board (0005).
