<h1 align="left">
  <img src="../../assets/icon.svg" width="32px" valign="middle">
  NullBreach • UI
</h1>

![Banner principal](../../assets/banner.png)

> NullBreach is a production-grade React interface for AI-powered security analysis. Chat with Claude about cybersecurity, submit code for instant OWASP vulnerability detection, and manage your session history, all behind JWT authentication. Deploys to Netlify in one click.

[![Live Demo](https://img.shields.io/badge/Live_Demo-wavival.dev/nullbreach-0F172A?style=for-the-badge&logo=vercel&logoColor=white)](https://wavival.dev/nullbreach)
[![API Docs](https://img.shields.io/badge/API_Docs-nullbreach--api.wavival.dev-0F172A?style=for-the-badge&logo=swagger&logoColor=white)](https://nullbreach-api.wavival.dev/api/docs/)
[![Backend Repo](https://img.shields.io/badge/Backend_Repo-nullbreach--api-0F172A?style=for-the-badge&logo=github&logoColor=white)](https://github.com/wavival/nullbreach-api)

## Table of contents

- [Stack](#stack)
- [Local setup](#local-setup)
  - [npm scripts](#npm-scripts)
- [Environment variables](#environment-variables)
- [Architecture](#architecture)
  - [Auth flow](#auth-flow)
  - [Bundle splitting](#bundle-splitting)
- [Testing](#testing)
- [Deploying to Netlify](#deploying-to-netlify)
  - [One-time setup](#one-time-setup)
  - [What's already in the repo](#whats-already-in-the-repo)
  - [CSP](#csp)
  - [Backend CORS](#backend-cors)
- [Troubleshooting](#troubleshooting)
- [Roadmap / known gaps](#roadmap--known-gaps)
- [License](#license)

Related docs: [DESIGN.md](./DESIGN.md) · [COMPONENTS.md](./COMPONENTS.md) · [CONTRIBUTING.md](./CONTRIBUTING.md)

## Stack

| Layer       | Choice                                                    |
| ----------- | --------------------------------------------------------- |
| Build       | Vite 8, TypeScript 5 (strict)                             |
| UI          | React 18, React Router 6, Tailwind 3, Radix Slot          |
| Forms       | react-hook-form + zod                                     |
| HTTP        | native `fetch` wrapper (JWT refresh + 20s timeout, no deps) |
| Markdown    | react-markdown + remark-gfm                               |
| Toasts      | react-hot-toast                                           |
| Tests       | Vitest + Testing Library + MSW                            |
| CI          | GitHub Actions: lint → typecheck → test → build           |
| Hosting     | Netlify, merged with the landing under `/nullbreach/` (see root README) |

## Local setup

```bash
git clone git@github.com:wavival/nullbreach-web.git
cd nullbreach-web
npm install
cp .env.example .env.local       # adjust VITE_API_URL if backend lives elsewhere
npm run dev                      # http://localhost:5173/nullbreach/
```

`vite.config.ts` pins `base: "/nullbreach/"` so dev and prod both serve the SPA under the `/nullbreach/` subpath (matches `wavival.dev/nullbreach`).

Backend must be running and CORS-permissive to the dev origin.

### npm scripts

| Script                  | What it does                                        |
| ----------------------- | --------------------------------------------------- |
| `npm run dev`           | Vite dev server with HMR                            |
| `npm run build`         | `tsc -b && vite build` → `dist/`                    |
| `npm run preview`       | Serve the production build locally                  |
| `npm run lint`          | ESLint 9 (flat config), zero warnings target        |
| `npm run typecheck`     | `tsc -b` across `app` + `node` projects             |
| `npm test`              | Vitest one-shot run                                 |
| `npm run test:watch`    | Vitest watch mode                                   |
| `npm run test:coverage` | Vitest + v8 coverage (`coverage/`)                  |

## Environment variables

All client-exposed vars must be `VITE_`-prefixed (Vite-enforced). Production builds **fail fast** when `VITE_API_URL` is unset; only dev falls back to `http://localhost:8000`.

Backend is mounted at the **root** of `VITE_API_URL` (no `/api` prefix). The fetch client appends paths like `/auth/login/`, `/auth/refresh/`, `/chat/sessions/` directly to the base.

| Variable             | Required | Example                                       | Notes                                            |
| -------------------- | -------- | --------------------------------------------- | ------------------------------------------------ |
| `VITE_API_URL`       | Yes      | `https://nullbreach-api.wavival.dev`          | Base URL; the app appends `/auth/login/` etc.    |
| `VITE_WHATSAPP_URL`  | No       | `https://wa.me/...`                           | Floating contact button. Default baked in.       |
| `VITE_AUTHOR_NAME`   | No       | `Valentina Ramírez`                           | Footer attribution.                              |
| `VITE_AUTHOR_URL`    | No       | `https://wavival.dev`                         | Footer link.                                     |

Copy `.env.example` to `.env.local` for local overrides. In production `VITE_API_URL` is supplied by the Netlify build env (pinned in the root `netlify.toml`), not a committed `.env.production`.

## Architecture

```
src/
├── App.tsx                  React.lazy routes + Suspense
├── main.tsx                 BrowserRouter (v7 future flags) + ErrorBoundary
├── components/
│   ├── ErrorBoundary.tsx    class component, dev-only stack trace
│   ├── layout/              Layout / Navbar / Sidebar / Footer / ProtectedRoute
│   └── ui/                  Button, Badge, Card, Input, Toast viewport, InlineError, Markdown, WhatsAppButton
├── context/
│   ├── auth-context.ts      bare createContext()
│   └── AuthContext.tsx      AuthProvider (login/register/logout/setUser)
├── hooks/                   useAuth, useError, useMediaQuery, useFocusTrap, usePageTitle
├── lib/                     errors, toast, date, image (canvas avatar downscale), utils
├── pages/                   Login, Home, Chat, Analyzer, NotFound
├── services/
│   ├── api.ts               fetch wrapper: JWT injection, 401 refresh-once retry, 20s timeout, AbortSignal
│   └── tokenStore.ts        sessionStorage-backed observable store
├── types/                   auth, chat, api, index
└── test/                    setup, MSW server + handlers, ambient vitest types
```

### Auth flow

1. `POST /auth/login/` returns `{ access, refresh, user }`.
2. Tokens written to `sessionStorage` via `tokenStore`. The fetch wrapper injects `Authorization: Bearer` on each request (unless `skipAuth`).
3. On `401`, the wrapper calls `POST /auth/refresh/` **once** (deduped via in-flight promise), then retries the original request.
4. Refresh failure → `tokenStore.clear()` → `AuthProvider` subscriber wipes user → `ProtectedRoute` redirects to `/login`.

JWTs in `sessionStorage` are vulnerable to XSS — the Netlify CSP in `netlify.toml` is the primary mitigation. For higher-assurance setups, switch to httpOnly cookies on the backend and remove the bearer plumbing.

### Bundle splitting

`vite.config.ts` declares `manualChunks` for `react-vendor`, `forms`, `markdown`, `icons`. Each route is `React.lazy`-loaded, so the markdown chunk (react-markdown + remark-gfm) loads only with the Chat route, not on first paint.

## Testing

Vitest + jsdom + Testing Library + MSW. Tests live next to source as `*.test.ts(x)`.

```bash
npm test                  # 33 tests across 6 files (~5s)
npm run test:coverage     # writes coverage/ HTML report
```

MSW intercepts `fetch` at the network layer — `src/test/handlers.ts` is the default fixture, individual suites override via `server.use(...)`.

## Deploying to Netlify

Deploy is **monorepo-root-driven**, not per-app. The SPA is built and merged
with the landing into a single publish dir under `/nullbreach/`. See the root
[README → Deploy](../../README.md#deploy) for the full setup; the short version:

- Build command (root `netlify.toml`): `npm run build:web` →
  `build:all` + `scripts/merge-dist.mjs`. Publish dir: `dist`. Node `20`.
- The SPA's own `index.html` is renamed to `app.html`; Netlify rewrites
  extension-less SPA routes (`/nullbreach/login`, `/chat`, …) to it.
- **Required build env:** `VITE_API_URL` (pinned in the root `netlify.toml`).
  Optional: `VITE_WHATSAPP_URL`, `VITE_AUTHOR_NAME`, `VITE_AUTHOR_URL`.
- `.github/workflows/ci.yml` gates each PR (lint → typecheck → test → build)
  before Netlify publishes.

This app still ships `public/_redirects` (belt-and-suspenders SPA fallback) and
`public/manifest.webmanifest`. The cache/security headers, CSP, `robots.txt`,
and sitemap are **generated by `scripts/merge-dist.mjs` at build time** (into
`dist/_headers` and the apex `robots.txt`) — they are no longer committed files
under `apps/frontend/public/`.

### CSP

`scripts/merge-dist.mjs` generates a strict `Content-Security-Policy` into
`dist/_headers`, with `connect-src` derived from `VITE_API_URL` (single source
of truth). Update the API origin in the root `netlify.toml` if it changes, or
extend the policy there if you add 3rd-party endpoints (Sentry, PostHog, etc.).

### Backend CORS

Django backend must allow the Netlify origin:

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://wavival.dev",
    # plus any Netlify preview / staging origins
]
CORS_ALLOW_CREDENTIALS = False  # we use bearer tokens, not cookies
```

## Troubleshooting

| Symptom                                          | Fix                                                                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Build error: `VITE_API_URL is required`          | Set the env var in the Netlify build env / root `netlify.toml` (or `.env.local` for local builds).         |
| Login redirect loop                              | Backend not returning a valid `access` token, or CORS blocking the response. Check Network tab.            |
| 404 on direct deep-link (`/chat/123`)            | SPA fallback missing — verify the root `netlify.toml` rewrite (or `public/_redirects`) is published.        |
| Fonts flash unstyled                             | `preconnect` + the font `<link>` are in `index.html`; if persistent, switch to self-hosted fonts.          |
| Toast notifications stacked off-screen           | `<ToastViewport />` mounts in `App.tsx`; ensure it's not unmounted by a route guard.                       |

## Roadmap / known gaps

- Observability hook in `ErrorBoundary` is a stub; wire Sentry or alternative.
- Markdown contrast not WCAG-audited against the dark theme.
- Inter + JetBrains Mono load from Google Fonts via a `<link>` in `index.html`; self-hosting would remove the third-party connect / FOUT risk entirely.

## License

This project is licensed under the **MIT License**, with the following clarification:

- **Clone**: You can clone this repository freely
- **Fork**: You can fork and create your own version
- **Contribute**: Pull requests and contributions are welcome
- **Learn**: Use this code to study and learn software architecture
- **Modify**: Adapt the code to your needs
- **Attribution**: Please credit the original author (Valentina Ramírez / @wavival)

This is **not** a commercial product. It's an educational resource demonstrating 
frontend architecture, security practices, and full-stack development. See the [LICENSE](../../LICENSE) file for the full text.

Copyright © 2026 Valentina Ramírez.

## Contact

![Banner principal](../../assets/footer.png)

<h3 align="left">
  <img src="../../assets/logo-w.png" width="48px" valign="middle">
  Valentina Ramírez • @wavival
</h3>

> Thanks for getting here. Let's build great things.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-wavival-407bff?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/wavival)
[![Instagram](https://img.shields.io/badge/Instagram-@wavival-407bff?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/wavival)
[![Email](https://img.shields.io/badge/Email-wavival.dev@luminaw.co-407bff?style=for-the-badge&logo=gmail&logoColor=white)](mailto:wavival.dev@luminaw.co)
