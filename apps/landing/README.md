# NullBreach — Landing (Astro)

Static-first marketing landing for NullBreach, built with **Astro**. Bilingual
(ES default / EN), fully server-rendered `.astro` — **zero client JS shipped
to users** beyond Astro's ViewTransitions runtime (~4 KB gz) for cross-fade
navigation. No React.

It is one of the two JS workspaces in the monorepo (alongside the SPA in
[`../frontend`](../frontend/README.md)). The SPA owns auth, chat, and the
analyzer; the landing only links into it for sign-in.

## Develop

From the repo root (npm workspace):

```bash
npm install
npm run dev:landing    # http://localhost:4321
```

Or from this folder directly:

```bash
cd apps/landing
npm install
npm run dev            # http://localhost:4321
```

## Build

```bash
npm run build          # astro check + astro build → dist/
npm run preview
```

In production the landing is built and merged with the SPA into a single
Netlify publish dir under `/nullbreach/` — see the root
[README](../../README.md#deploy) and `scripts/merge-dist.mjs`.

## Structure

```
src/
├── pages/
│   ├── index.astro       # ES landing — served at /nullbreach/
│   └── en/index.astro    # EN landing — served at /nullbreach/en/
├── layouts/Base.astro    # <head> (meta, OG, hreflang, fonts, JSON-LD) + ViewTransitions
├── components/
│   ├── Home.astro        # the full page body (nav, hero, features, footer)
│   ├── T.astro           # bilingual text helper
│   ├── LangToggle.astro  # ES ⇄ EN switch (pure navigation, no JS)
│   └── Icon.astro        # inlined lucide SVGs
├── styles/global.css     # @tailwind layers + brand base styles
└── env.d.ts
```

## How it maps to the brand

- **Design tokens** mirror the SPA's `../frontend/tailwind.config.ts` so the
  landing keeps the exact NullBreach identity, but `tailwind.config.ts` here is
  **self-contained** (not imported from the parent) so this project builds and
  deploys on its own. Base styles (dark gradient, green grid, scrollbar) are
  copied into `src/styles/global.css`.
- **Bilingual via separate URLs** — each language is its own crawlable page
  (`/nullbreach/` = ES, `/nullbreach/en/` = EN) for proper i18n SEO. The active
  language is derived from the URL path; `src/components/T.astro`
  (`<T es="…" en="…" />`) renders **only** the active language into the HTML.
  `LangToggle.astro` is just two `<a>` links — switching is a navigation, so no
  client JS, no `localStorage`.
- **Fonts** (Inter + JetBrains Mono) load via a `<link rel="stylesheet">` in
  `Base.astro` (not a CSS `@import`, which would serialize behind the
  stylesheet and block first paint).
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

`public/` holds the brand assets the landing serves: `banner.png`, `logo-w.png`,
`icon.svg`, the favicons, and the OpenGraph images (`og.jpg`, `og.webp`,
`profile.webp`).
