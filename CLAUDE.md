# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

A project-tracking web app for managing IT service contracts, BAST billing periods, Change Management (CM) requests, and Problem Management (PM) requests. Built for an internal team with role-based access control.

**Stack:** React 18 + Vite (frontend) · Express.js + `pg` (backend) · PostgreSQL (database) · nodemailer (email) · Fonnte WhatsApp API · node-cron (scheduler) · Docker + nginx (deployment)

**Production URL:** internal only — see ops/deployment config, not documented here

---

## Commands

### Docker (production)

```bash
# First run — build images and start all services
docker compose up --build -d

# Subsequent starts
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

Requires a `.env` file at the project root (copy from `.env.example`). The database schema is applied automatically on first boot.

### Local development

Both `frontend/` and `backend/` are independent npm packages — run all commands from their respective directories.

#### Backend

```bash
cd backend
npm run dev      # nodemon — hot reload on file changes
npm start        # plain node, no reload
```

Requires `backend/.env` (copy from `backend/.env.example`). The backend serves on `http://localhost:3001`.

#### Frontend

```bash
cd frontend
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # Production build → dist/
npm run preview  # Preview the production build
```

Vite proxies `/api/*` to `http://localhost:3001` during dev, so no CORS handling is needed in development.

### Database setup

```bash
# Apply schema (creates all tables + seed admin user + default role permissions)
psql -U postgres -d project_tracker -f database/schema.sql

# Optional seed data
psql -U postgres -d project_tracker -f database/seed.sql

# Add reminder_logs table to an existing DB (idempotent)
psql -U postgres -d project_tracker -f database/add_reminder_logs.sql

# Add phone column to users table on an existing DB (idempotent)
psql -U postgres -d project_tracker -f database/add_phone_to_users.sql
```

One-time Supabase migration (if migrating from legacy Supabase):
```bash
node database/migrate_from_supabase.js
```

---

## Architecture

### Backend (`backend/src/`)

- **`app.js`** — Express entry point. Registers all routes, starts the reminder cron, exposes `/api/health`.
- **`db/index.js`** — `pg.Pool` instance (max 20 connections); all routes import this directly (no ORM).
- **`middleware/auth.js`** — `requireAuth` (JWT from httpOnly cookie) and `requireAdmin`.
- **`middleware/rbac.js`** — `requirePermission(permKey)` middleware. Reads live permission values from the `role_permissions` table; falls back to hardcoded `DEFAULT_ROLE_PERMISSIONS`. Admin role bypasses all checks.
- **`routes/users.js`** — User CRUD (admin only). Key endpoints: `PUT /:id/phone` (WhatsApp number), `PUT /:id/email` (email address with uniqueness check), `PUT /:id/password`. `GET /list` is open to any authenticated user for dropdown population.
- **`services/email.js`** — nodemailer wrapper; exposes `sendMail`, `sendWelcomeEmail`, `sendAssignmentEmail`, `lookupEmail`. SMTP configured via env vars.
- **`services/reminder.js`** — Four reminder checks (contract end, BAST submit deadline, CM activity, PM activity) run as a single `node-cron` job at 08:00 Asia/Jakarta. Deduplication is handled by the `reminder_logs` table — each unique `(project_id, reminder_type, reference_id)` fires at most once per threshold bucket (contract end uses `contract:60d`, `contract:30d`, `contract:7d`; CM/PM activity allows up to 3 sends, once per calendar day).
- **`services/whatsapp.js`** — Fonnte WhatsApp API integration. Handles Indonesian phone number normalization (`0xxx` → `62xxx`), fuzzy username-to-phone lookup via `lookupPhone()`, and batch dispatch via `dispatchWhatsApp()`. Requires `FONNTE_TOKEN` env var.
- **`utils/bastPeriods.js`** — Generates billing period labels from `contract_start`, `deadline`, and `billing_freq`. Used server-side to validate/merge stored rows.

### Frontend (`frontend/src/`)

- **`App.jsx`** — Single-page shell. Owns all global state: `projects`, `cmRequests`, `pmRequests`, `usersList`. Tab navigation is local state (`tab`). All top-level modals live here.
- **`api/client.js`** — Axios instance with `baseURL: '/api'` and `withCredentials: true`. A 401 interceptor dispatches the `auth:expired` custom DOM event, which `AuthContext` catches to clear the session.
- **`context/AuthContext.jsx`** — Provides `user`, `loading`, `login`, `logout`, and `can(permKey)`. Calls `/api/config/permissions` on login to cache the role permissions map.
- **`context/ThemeContext.jsx`** — Light/dark theme toggle.
- **`utils/permissions.js`** — `can(user, permKey, rolePermsMap)` — same logic as the backend's `requirePermission`, mirrored on the frontend to show/hide UI elements. `DEFAULT_ROLE_PERMISSIONS` is duplicated here and must stay in sync with the backend version.
- **`utils/bastPeriods.js`** — Frontend mirror of `backend/src/utils/bastPeriods.js`. Generates and merges billing period labels client-side for display; must stay in sync with the backend version. Also exports `BAST_STEPS` (8-step Indonesian checklist labels) and `BILLING_FREQ_LABELS`.
- **`utils/dates.js`** — Date formatting and `daysDiff` helpers.
- **`utils/badges.js`** — Status badge color/label mapping.
- **`utils/export.js`** — XLSX export logic for projects, CM, and PM data.

### BAST Billing Period Logic (critical)

BAST periods are **not fully stored in the DB**. The `bast_periods` table only stores rows that have been interacted with (steps checked, deadline set, or custom termins). The `generatePeriods` function derives the expected schedule from `contract_start`, `deadline`, and `billing_freq`. The `mergePeriods` function combines generated periods with stored rows by label match. This logic is duplicated in both `backend/src/utils/bastPeriods.js` and `frontend/src/utils/bastPeriods.js` — changes must be applied to both.

### Authentication Flow

- Login sets a `token` httpOnly cookie (JWT, 7-day default expiry).
- All protected routes rely on the cookie — there is no Authorization header / Bearer token pattern.
- `requireAuth` → `requirePermission(key)` is the standard middleware chain for protected routes.
- Admin role short-circuits all permission checks (both on backend and frontend).

### RBAC

Permissions are stored as JSONB in the `role_permissions` table, editable at runtime via the Access Control page (admin only). The frontend reads `/api/config/permissions` on login and caches the map in `AuthContext`. The `can()` helper is the single point of truth for both backend enforcement and frontend visibility toggling.

### Roles

`admin` · `pm` · `om` · `system_engineer` · `dba` · `technical_writer`

---

## Docker Setup

Three services defined in `docker-compose.yml`:

| Service | Image | Port |
|---|---|---|
| `db` | postgres:16-alpine | internal only |
| `backend` | built from `backend/Dockerfile` | internal only (3001) |
| `frontend` | built from `frontend/Dockerfile` | `APP_PORT` → 80 |

- All services have `restart: unless-stopped` — they survive server reboots automatically.
- `database/schema.sql` is mounted into postgres's init directory and runs once on a fresh volume.
- The frontend container is nginx serving the Vite build + proxying `/api/` to `backend:3001`.
- `frontend/nginx.conf` sets `server_name` to the production host (kept out of this file — see the file itself, which is deployment config rather than documentation).

---

## Key Environment Variables

Root `.env` is used by `docker compose`. `backend/.env` is used for local development.

| Variable | Purpose |
|---|---|
| `DB_HOST/PORT/NAME/USER/PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | JWT signing key (required, use a long random string) |
| `JWT_EXPIRES_IN` | Token lifespan (default `7d`) |
| `COOKIE_SECRET` | Cookie signing secret (required) |
| `PORT` | Backend port (default `3001`) |
| `FRONTEND_ORIGIN` | CORS allowed origin — must match the browser-facing URL |
| `APP_BASE_URL` | Base URL embedded in reminder email links |
| `APP_PORT` | Host port for the nginx container (default `80`) |
| `SMTP_HOST/PORT/USER/PASS` | Nodemailer SMTP config |
| `SMTP_SECURE` | `true` for TLS/port 465, `false` for plain/STARTTLS |
| `MAIL_FROM` | Sender address for reminder emails |
| `REMINDER_TIMEZONE` | Cron timezone (default `Asia/Jakarta`) |
| `FONNTE_TOKEN` | Fonnte API token for WhatsApp notifications |
| `NODE_ENV` | Set to `production` to enable secure cookies |

---

## Reference Docs (`docs/`)

Extended reference documentation lives in `docs/`:

| File | Contents |
|---|---|
| `docs/API.md` | Full REST API reference — all endpoints, request/response shapes, auth rules |
| `docs/ARCHITECTURE.md` | Deep-dive on system design, data flow, and component relationships |
| `docs/DATABASE.md` | Schema reference — all tables, columns, constraints, and indexes |
| `docs/DEVELOPMENT.md` | Local dev setup, environment variables, and troubleshooting guide |
