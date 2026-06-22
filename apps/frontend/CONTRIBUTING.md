# Contributing

Thanks for taking the time to look. This repo is small and currently maintained by [Valentina Ramírez](https://wavival.dev); contributions are welcome via PRs against `main`.

## Table of contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Branching](#branching)
- [Commits](#commits)
- [Required checks (run locally before pushing)](#required-checks-run-locally-before-pushing)
- [Tests](#tests)
- [Code style](#code-style)
- [Security](#security)
- [PR checklist](#pr-checklist)
- [Reporting bugs](#reporting-bugs)

## Prerequisites

- Node 20 (pinned in `netlify.toml` and `.github/workflows/ci.yml`).
- npm (lockfile is `package-lock.json`; do **not** introduce a different package manager).
- A running NullBreach backend (Django REST). The frontend talks to it via `VITE_API_URL`.

## Setup

```bash
git clone git@github.com:wavival/nullbreach-web.git
cd nullbreach-web
npm install
cp .env.example .env.local   # adjust VITE_API_URL if backend lives elsewhere
npm run dev                  # http://localhost:5173/nullbreach/
```

## Branching

- `main` is protected and auto-deploys to Netlify on green CI.
- Branch off `main` per change. Naming: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`, `refactor/<slug>`.
- Keep PRs small and focused. Split unrelated work.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(chat): scroll new messages into view
fix(auth): retry refresh once, not twice
chore(deps): bump axios to 1.7.7
docs(readme): correct prod API URL
```

Subject ≤ 50 chars, imperative mood. Body (when present) explains the **why**, not the what.

## Required checks (run locally before pushing)

The CI matrix runs lint → typecheck → test → build. Mirror it locally:

```bash
npm run lint        # ESLint 9 (flat config), zero-warning target
npm run typecheck   # tsc -b across app + node projects
npm test            # Vitest, jsdom, MSW — 33 tests across 6 files
npm run build       # vite build + emits dist/
```

A red gate blocks merge.

## Tests

- Co-locate as `<Name>.test.ts(x)` next to the source.
- Use Testing Library queries that mirror user intent (`getByRole`, `getByLabelText`) over `getByTestId`.
- Network calls are intercepted by MSW. Default handlers live in `src/test/handlers.ts`; override per suite via `server.use(...)`.
- Don't mock `axios` directly — let MSW intercept at the network layer.

## Code style

- TypeScript `strict` is on, plus `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`. Pay attention to those.
- ESLint config in `eslint.config.js` (flat config, `typescript-eslint` + `react-hooks` + `react-refresh`). No `// eslint-disable-next-line` without a justification comment.
- Use the `@/...` path alias (configured in `tsconfig.app.json` + `vite.config.ts`) — no `../../../` chains.
- Tailwind first; only drop to raw CSS in `index.css` when a token can't be expressed with utilities.

## Security

- Never commit `.env` / `.env.local` (`.gitignore` covers them).
- The Netlify CSP in `netlify.toml` whitelists `connect-src https://nullbreach-api.wavival.dev`. New API origins → update the CSP in the same PR.
- JWTs live in `sessionStorage` (intentional for the current model). Don't migrate to `localStorage`.

## PR checklist

- [ ] `npm run lint && npm run typecheck && npm test && npm run build` all green
- [ ] Touched components have or update tests
- [ ] No new env vars without `.env.example` + README table update
- [ ] If a route, API path, or token flow changed, update README and (if relevant) DESIGN.md / COMPONENTS.md
- [ ] CSP unchanged, or the change is justified in the PR description

## Reporting bugs

Open an issue at <https://github.com/wavival/nullbreach-web/issues>. Include: browser + version, steps to reproduce, expected vs actual, network tab screenshot for API failures.
