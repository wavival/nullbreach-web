<h1 align="left">
  <img src="assets/icon.svg" width="32px" valign="middle">
  NullBreach • UI
</h1>

![Banner principal](assets/banner.png)

> NullBreach is a production-grade React interface for AI-powered security analysis. Chat with Claude about cybersecurity, submit code for instant OWASP vulnerability detection, and manage your session history, all behind JWT authentication. Deploys to Netlify in one click.

[![Live Demo](https://img.shields.io/badge/Live_Demo-wavival.dev/nullbreach-0F172A?style=for-the-badge&logo=vercel&logoColor=white)](https://wavival.dev/nullbreach)
[![API Docs](https://img.shields.io/badge/API_Docs-nullbreach--api.wavival.dev-0F172A?style=for-the-badge&logo=swagger&logoColor=white)](https://nullbreach-api.wavival.dev/api/docs/)
[![Repo](https://img.shields.io/badge/Repo-nullbreach-0F172A?style=for-the-badge&logo=github&logoColor=white)](https://github.com/wavival/nullbreach)

Monorepo with three apps:

| App | Path | Stack | Role |
| --- | --- | --- | --- |
| **Frontend** | [`apps/frontend`](apps/frontend/README.md) | React 18 · Vite 8 · TypeScript · Tailwind | Authenticated SPA — chat, analyzer, account. |
| **Landing** | [`apps/landing`](apps/landing/README.md) | Astro · Tailwind (zero client JS) | Public marketing page (ES/EN), static. Links into the SPA for sign-in. |
| **Backend** | [`apps/backend`](apps/backend/README.md) | Django · Django REST · JWT | API — auth, chat sessions, message history, code analysis. |

## Layout

```
nullbreach/
├── apps/
│   ├── frontend/   # React + Vite SPA
│   ├── landing/    # Astro landing
│   └── backend/    # Django REST API
├── package.json    # npm workspaces (frontend + landing)
└── .github/        # CI
```

The two JS apps are npm workspaces; the backend is a standalone Python project.

## Quickstart

JS apps (from the repo root):

```bash
npm install            # installs frontend + landing workspaces
npm run dev            # frontend SPA   → http://localhost:5173
npm run dev:landing    # landing        → http://localhost:4321
npm run build:all      # build both
```

Backend (its own toolchain):

```bash
cd apps/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in secrets — NOT committed
python manage.py migrate
python manage.py runserver
```

See each app's own `README.md` for details.

## Deploy

Two independent targets:

**Web (frontend + landing) → Netlify.** `netlify.toml` runs `npm run build:web`,
which builds both apps and merges them into `dist/` under `/nullbreach/` (see
`scripts/merge-dist.mjs`). That script also generates `dist/_headers` (cache +
CSP, with sha256 hashes of any inline scripts) and the apex `robots.txt`.

- Publish dir: `dist`. Build command is already set in `netlify.toml`.
- **Required build env:** `VITE_API_URL` — the API origin baked into the SPA
  (the bundle throws at load if it's unset). It is pinned in `netlify.toml` and
  **must match the CSP `connect-src`**, which `merge-dist.mjs` derives from the
  same value. Change the origin in one place.

**Backend → Railway** (Nixpacks; Python pinned by `.python-version`). The
`Procfile` declares `release: migrate && createcachetable` and
`web: gunicorn config.wsgi:application --workers 2`.

- **Required env:** `SECRET_KEY`, `DATABASE_URL` (PostgreSQL), `ANTHROPIC_API_KEY`,
  `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`. See `apps/backend/.env.example`.
- SSL is delegated to the Railway proxy (`SECURE_SSL_REDIRECT=False` is
  intentional — re-enabling it behind TLS termination causes redirect loops).

## Notes

- Brand/design tokens live in `apps/frontend/tailwind.config.ts`; the landing
  mirrors them in `apps/landing/tailwind.config.ts`.
- Secrets (`.env`) and virtualenvs (`.venv`) are git-ignored and were **not**
  carried over when the backend was merged in.

---

## License

This project is licensed under the **MIT License**, with the following clarification:

- **Clone**: You can clone this repository freely
- **Fork**: You can fork and create your own version
- **Contribute**: Pull requests and contributions are welcome
- **Learn**: Use this code to study and learn software architecture
- **Modify**: Adapt the code to your needs
- **Attribution**: Please credit the original author (Valentina Ramírez / @wavival)

This is **not** a commercial product. It's an educational resource demonstrating
frontend architecture, security practices, and full-stack development. See the [LICENSE](LICENSE) file for the full text.

Copyright © 2026 Valentina Ramírez.

## Contact

![Banner principal](assets/footer.png)

<h3 align="left">
  <img src="assets/logo-w.png" width="48px" valign="middle">
  Valentina Ramírez • @wavival
</h3>

> Thanks for getting here. Let's build great things.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-wavival-407bff?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/wavival)
[![Instagram](https://img.shields.io/badge/Instagram-@wavival-407bff?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/wavival)
[![Email](https://img.shields.io/badge/Email-wavival.dev@luminaw.co-407bff?style=for-the-badge&logo=gmail&logoColor=white)](mailto:wavival.dev@luminaw.co)
