# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

A project-tracking web app for managing IT service contracts, BAST billing periods, Change Management (CM) requests, and Problem Management (PM) requests. Built for an internal team with role-based access control.

**Stack:** React 18 + Vite (frontend) · Express.js + `pg` (backend) · PostgreSQL (database) · nodemailer (email) · node-cron (scheduler)

---

## Commands

Both `frontend/` and `backend/` are independent npm packages — run all commands from their respective directories.

### Backend

```bash
cd backend
npm run dev      # nodemon — hot reload on file changes
npm start        # plain node, no reload
```

Requires a `.env` file (copy from `.env.example`). The backend serves on `http://localhost:3001`.

### Frontend

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
```

One-time Supabase migration (if migrating from legacy Supabase):
```bash
node database/migrate_from_supabase.js
```

---

## Architecture

### Backend (`backend/src/`)

- **`app.js`** — Express entry point. Registers all routes, starts the reminder cron, exposes `/api/health`.
- **`db/index.js`** — `pg.Pool` instance; all routes import this directly (no ORM).
- **`middleware/auth.js`** — `requireAuth` (JWT from httpOnly cookie) and `requireAdmin`.
- **`middleware/rbac.js`** — `requirePermission(permKey)` middleware. Reads live permission values from the `role_permissions` table; falls back to hardcoded `DEFAULT_ROLE_PERMISSIONS`. Admin role bypasses all checks.
- **`services/email.js`** — nodemailer wrapper; SMTP configured via env vars.
- **`services/reminder.js`** — Four reminder checks (contract end, BAST submit deadline, CM activity, PM activity) run as a single `node-cron` job at 08:00 Asia/Jakarta. Deduplication is handled by the `reminder_logs` table — each unique `(project_id, reminder_type, reference_id)` fires at most once per threshold bucket (contract end uses `contract:60d`, `contract:30d`, `contract:7d`; CM/PM activity allows up to 3 sends, once per calendar day).
- **`utils/bastPeriods.js`** — Generates billing period labels from `contract_start`, `deadline`, and `billing_freq`. Used server-side to validate/merge stored rows.

### Frontend (`frontend/src/`)

- **`App.jsx`** — Single-page shell. Owns all global state: `projects`, `cmRequests`, `pmRequests`, `usersList`. Tab navigation is local state (`tab`). All top-level modals live here.
- **`api/client.js`** — Axios instance with `baseURL: '/api'` and `withCredentials: true`. A 401 interceptor dispatches the `auth:expired` custom DOM event, which `AuthContext` catches to clear the session.
- **`context/AuthContext.jsx`** — Provides `user`, `loading`, `login`, `logout`, and `can(permKey)`. Calls `/api/config/permissions` on login to cache the role permissions map.
- **`utils/permissions.js`** — `can(user, permKey, rolePermsMap)` — same logic as the backend's `requirePermission`, mirrored on the frontend to show/hide UI elements. `DEFAULT_ROLE_PERMISSIONS` is duplicated here and must stay in sync with the backend version.
- **`utils/bastPeriods.js`** — Frontend mirror of `backend/src/utils/bastPeriods.js`. Generates and merges billing period labels client-side for display; must stay in sync with the backend version.

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

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `DB_HOST/PORT/NAME/USER/PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | JWT signing key |
| `PORT` | Backend port (default `3001`) |
| `FRONTEND_ORIGIN` | CORS allowed origin (default `http://localhost:5173`) |
| `SMTP_HOST/PORT/USER/PASS` | Nodemailer SMTP config |
| `MAIL_FROM` | Sender address for reminder emails |
| `REMINDER_TIMEZONE` | Cron timezone (default `Asia/Jakarta`) |
| `APP_BASE_URL` | Link in reminder emails (default `http://localhost:5173`) |
