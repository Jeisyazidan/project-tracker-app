# Architecture

## Overview

The app is a classic three-tier web application:

```
Browser (React SPA)
    |
    | HTTP (cookie-based auth, /api/* proxied in dev)
    v
Express.js REST API (port 3001)
    |
    | pg.Pool (direct SQL)
    v
PostgreSQL Database
```

During development, Vite proxies `/api/*` to `http://localhost:3001`, so no CORS handling is needed in the browser. In production, the Express server should serve or sit behind a reverse proxy alongside the built frontend.

---

## Backend (`backend/src/`)

### Entry Point — `app.js`

- Registers middleware: CORS, JSON parser, cookie-parser
- Mounts route modules under `/api/`
- Attaches a global error handler
- Starts the reminder cron job on server boot
- Exposes `/api/health` for uptime checks

### Database — `db/index.js`

A single `pg.Pool` instance shared by all route modules. There is no ORM — all queries are raw SQL. The pool is configured from environment variables (`DB_HOST`, `DB_PORT`, etc.).

### Middleware

| File | Purpose |
|---|---|
| `middleware/auth.js` | `requireAuth` — validates JWT from the `token` httpOnly cookie. `requireAdmin` — rejects non-admin callers. |
| `middleware/rbac.js` | `requirePermission(permKey)` — reads live permission values from `role_permissions` table; falls back to `DEFAULT_ROLE_PERMISSIONS`. Admin role bypasses all checks. |

The standard chain for a protected route is:

```js
router.post('/route', requireAuth, requirePermission('some_permission'), handler)
```

### Routes

| Module | Base path | Responsibility |
|---|---|---|
| `auth.js` | `/api/auth` | Login, logout, password reset |
| `projects.js` | `/api/projects` | Project CRUD, contract tracking |
| `bast.js` | `/api/bast` | BAST billing period read/write |
| `cm.js` | `/api/cm` | Change Management request CRUD |
| `pm.js` | `/api/pm` | Problem Management request CRUD |
| `users.js` | `/api/users` | User management (admin) |
| `config.js` | `/api/config` | Permissions map, system config |
| `reminders.js` | `/api/reminders` | Reminder log queries, manual trigger |

### Services

#### `services/email.js`

Nodemailer wrapper. SMTP is configured via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`. Exposes a `sendMail(options)` function consumed by the reminder service.

#### `services/reminder.js`

A `node-cron` job that fires daily at **08:00 Asia/Jakarta** (configurable via `REMINDER_TIMEZONE`). It runs four independent checks in sequence:

1. **Contract end** — queries projects whose `deadline` falls within 60, 30, or 7 days. Each threshold fires at most once per project (`reminder_logs` deduplication with type keys `contract:60d`, `contract:30d`, `contract:7d`).
2. **BAST submit deadline** — checks periods with a `submit_deadline` that has passed and whose steps are not all completed.
3. **CM activity** — alerts assigned CM PIC if there has been no status update within the configured window; fires at most once per calendar day (max 3 total sends).
4. **PM activity** — same logic as CM, applied to PM requests.

#### `services/whatsapp.js`

WhatsApp notification wrapper. Used in addition to email for some alert types.

### Shared Utility — `utils/bastPeriods.js`

Contains two functions that are **critical and duplicated** on the frontend:

- `generatePeriods(contractStart, deadline, billingFreq)` — builds the expected billing period schedule as an array of labeled periods.
- `mergePeriods(generated, stored)` — combines generated periods with DB rows by label match, so stored data (steps, deadlines, termins) overlays the generated schedule.

> **Important:** Any change to this file must be mirrored in `frontend/src/utils/bastPeriods.js`.

---

## Frontend (`frontend/src/`)

### Bootstrap — `main.jsx`

Wraps `<App>` in `<ThemeProvider>` and `<AuthProvider>` before mounting to the DOM.

### Shell — `App.jsx`

Owns all top-level state:
- `projects`, `cmRequests`, `pmRequests`, `usersList` — fetched once on mount, passed down as props
- `tab` — which page is active (local `useState`)
- All top-level modal open/close state

Tab navigation and modal rendering are colocated here to avoid prop-drilling through a router.

### Contexts

| Context | Provides |
|---|---|
| `AuthContext` | `user`, `loading`, `login()`, `logout()`, `can(permKey)` |
| `ThemeContext` | `theme`, `toggleTheme()` |

`AuthContext` calls `/api/config/permissions` immediately after login and caches the role permission map. `can(permKey)` consults this cache so permission checks are synchronous in components.

### API Layer (`api/`)

Each domain has a dedicated module (e.g., `api/projects.js`) that exports typed functions wrapping Axios calls. `api/client.js` holds the shared Axios instance:

- `baseURL: '/api'`
- `withCredentials: true` (sends the httpOnly cookie)
- A response interceptor that fires the custom `auth:expired` DOM event on 401, which `AuthContext` handles to clear session state.

### Pages

| Page | Tab | Key responsibility |
|---|---|---|
| `LoginPage` | — | Email/password form; calls `AuthContext.login()` |
| `ProjectsPage` | Projects | List, filter, sort projects; open project/BAST modals |
| `BastPage` | BAST | Period grid; step checkboxes; custom termins |
| `CmPage` | CM | CM request table; create/edit/resolve |
| `PmPage` | PM | PM request table; similar to CM |
| `RemindersPage` | Reminders | View reminder logs; trigger manual reminders |
| `AccessControlPage` | Access Control | Admin-only RBAC editor |

### Components

**Layout** (`components/layout/`): `Header`, `Tabs`, `Toolbar`, `SummaryBar`

**Modals** (`components/modals/`): `ProjectModal`, `BastModal`, `CmModal`, `PmModal`, `UserMgmtModal`, `TerminModal`, `ExportModal`, `StatPopup`

**UI Primitives** (`components/ui/`): `Modal` (generic wrapper), `Badge`, `EmptyState`, `ScheduleLine`

### Utilities

| File | Purpose |
|---|---|
| `utils/bastPeriods.js` | Mirror of backend `bastPeriods.js` — must stay in sync |
| `utils/permissions.js` | `can(user, permKey, rolePermsMap)` — mirrors backend RBAC logic for UI toggling; `DEFAULT_ROLE_PERMISSIONS` must stay in sync with backend |
| `utils/dates.js` | Date formatting and parsing helpers |
| `utils/badges.js` | Status badge color/label mapping |
| `utils/export.js` | XLSX export logic |

---

## Authentication Flow

1. User submits credentials to `POST /api/auth/login`
2. Backend validates, signs a JWT, and sets it as a `token` httpOnly cookie (7-day default expiry)
3. All subsequent requests include the cookie automatically (`withCredentials: true`)
4. `requireAuth` middleware on each protected route reads and verifies the cookie
5. On 401 response, the Axios interceptor dispatches `auth:expired` → `AuthContext` clears local session state and redirects to login

There is no Bearer token / Authorization header pattern — cookies only.

---

## RBAC

Permissions are stored as JSONB in the `role_permissions` table, one row per role:

```json
{
  "create_project": true,
  "edit_project": false,
  "delete_project": false,
  ...
}
```

- The Access Control page (admin only) lets admins toggle permissions per role at runtime
- On login, the frontend fetches `/api/config/permissions` and caches the full map in `AuthContext`
- `can(permKey)` in `AuthContext` checks this cache for UI show/hide decisions
- `requirePermission(permKey)` on the backend re-reads from the DB (not cache) on every request
- Admin role bypasses all permission checks on both frontend and backend

---

## BAST Billing Period Logic

BAST periods are **partially virtual** — only rows with actual data (checked steps, custom deadlines, custom termins) are stored in the `bast_periods` table. The full schedule is always re-derived at read time:

```
generatePeriods(contract_start, deadline, billing_freq)
  → array of expected period labels

mergePeriods(generated, storedRows)
  → array with stored data overlaid by label match
```

This means periods cannot go "out of sync" with contract dates — changing a contract's dates automatically changes the generated schedule on the next read.

Custom termins are stored as extra rows that fall outside the generated schedule. `mergePeriods` appends them after the generated list.
