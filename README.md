# NullBreach

AI-powered cybersecurity assistant. Chat about vulnerabilities, OWASP, threat
modeling, and run static source-code analysis.

Monorepo with three apps:

| App | Path | Stack | Role |
| --- | --- | --- | --- |
| **Frontend** | [`apps/frontend`](apps/frontend) | React 18 · Vite · TypeScript · Tailwind | Authenticated SPA — chat, analyzer, account. |
| **Landing** | [`apps/landing`](apps/landing) | Astro · React island · Tailwind | Public marketing page (ES/EN). Links into the SPA for sign-in. |
| **Backend** | [`apps/backend`](apps/backend) | Django · Django REST · JWT | API — auth, chat sessions, message history, code analysis. |

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

## Notes

- Brand/design tokens live in `apps/frontend/tailwind.config.ts`; the landing
  mirrors them in `apps/landing/tailwind.config.ts`.
- Secrets (`.env`) and virtualenvs (`.venv`) are git-ignored and were **not**
  carried over when the backend was merged in.

---

Built by [wavival.dev](https://wavival.dev) · © Valentina Ramírez
