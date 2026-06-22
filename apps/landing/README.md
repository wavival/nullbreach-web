# NullBreach — Landing (Astro)

Static-first marketing landing for NullBreach, built with **Astro**. Bilingual
(ES default / EN) with a single React island for the language toggle. Everything
else is server-rendered `.astro` — no client JS beyond the toggle.

It is a separate project from the React SPA (`../`). The SPA still owns auth,
chat, and the analyzer. The landing only links into it for sign-in.

## Develop

```bash
cd landing
npm install
npm run dev        # http://localhost:4321
```

## Build

```bash
npm run build      # astro check + astro build → dist/
npm run preview
```

## How it maps to the brand

- **Design tokens** are reused from the SPA: `tailwind.config.ts` inherits
  `../tailwind.config.ts` as a Tailwind preset (colors, spacing, radius,
  typography, motion). Base styles (dark gradient, green grid, scrollbar) are
  copied into `src/styles/global.css`.
- **Bilingual** text is emitted twice via `src/components/T.astro`
  (`<T es="…" en="…" />`); CSS keyed on `<html data-lang>` shows the active one.
  The `LangToggle` React island (`client:load`) flips `data-lang` and persists
  the choice to `localStorage`.
- **Icons** are inlined lucide SVGs (`src/components/Icon.astro`) — offline-safe,
  zero runtime.

## Linking to the SPA

The login button and CTAs point at `PUBLIC_SPA_BASE/login`. Default is
`/nullbreach` (the SPA's Vite `base`). To target a separate deployment, set an
absolute URL at build time:

```bash
PUBLIC_SPA_BASE="https://nullbreach.netlify.app/nullbreach" npm run build
```

## Assets

`public/` holds copies of the shared brand assets (`banner.png`, `logo-w.png`,
`icon.svg`, favicons) from `../assets` and `../public`.
