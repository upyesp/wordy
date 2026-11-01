# wordy

A word game — a finger-slide word puzzle on a honeycomb of tiles.

**Right now** it is a tactile prototype: slide your finger across the honeycomb and feel the tiles dip under it. No game rules yet — the experiment is butter-smooth, fast, responsive graphics.

Play: **https://upyesp.github.io/wordy/** (deployed from `main` by GitHub Actions).

## Development

```sh
pnpm install
pnpm dev        # local dev server
pnpm build      # typecheck + production build to dist/
```

PixiJS 8 + Vite + TypeScript. Mouse input works on desktop; the portrait stage letterboxes.

## Design decisions

- Vocabulary: [GLOSSARY.md](./GLOSSARY.md) — slide, dip, trace, selected, trace strip.
- ADRs: [docs/adr/](./docs/adr/) — the dip is faked with scale + directional shading (0001), and the board is a pointy-top 6-wide offset-row rectangle (0002).
