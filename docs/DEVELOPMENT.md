# Development Guide

## Prerequisites

- **Node.js** v18+
- **PostgreSQL** v14+
- **npm** (bundled with Node.js)
- An SMTP server or relay for email reminders (optional in development)

---

## Local Setup

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_tracker
DB_USER=postgres
DB_PASSWORD=yourpassword

JWT_SECRET=change_this_to_a_long_random_secret_string
JWT_EXPIRES_IN=7d
COOKIE_SECRET=change_this_too
NODE_ENV=development

PORT=3001
FRONTEND_ORIGIN=http://localhost:5173

# SMTP — leave blank to skip emails in dev
SMTP_HOST=
SMTP_PORT=25
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM=noreply@company.internal
```

### 3. Create and initialize the database

```bash
createdb -U postgres project_tracker
psql -U postgres -d project_tracker -f database/schema.sql
```

This creates all tables, seeds a default admin user (`admin` / `admin123`), and inserts default role permissions.

Optional sample data:
```bash
psql -U postgres -d project_tracker -f database/seed.sql
```

### 4. Start both servers

Open two terminals:

```bash
# Terminal 1 — backend (port 3001, hot reload)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173, HMR)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and log in with `admin` / `admin123`.

---

## Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `5432` | |
| `DB_NAME` | `project_tracker` | |
| `DB_USER` | `postgres` | |
| `DB_PASSWORD` | — | Required |
| `JWT_SECRET` | — | Required; use a long random string |
| `JWT_EXPIRES_IN` | `7d` | |
| `COOKIE_SECRET` | — | Required |
| `NODE_ENV` | `development` | Set to `production` to enable secure cookies |
| `PORT` | `3001` | |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS allowed origin |
| `SMTP_HOST` | — | Leave blank to disable email |
| `SMTP_PORT` | `25` | |
| `SMTP_SECURE` | `false` | Set `true` for TLS (port 465) |
| `SMTP_USER` | — | Leave blank for unauthenticated SMTP |
| `SMTP_PASS` | — | |
| `MAIL_FROM` | `noreply@company.internal` | Sender address |
| `REMINDER_TIMEZONE` | `Asia/Jakarta` | Cron timezone |
| `APP_BASE_URL` | `http://localhost:5173` | Base URL used in reminder email links |

---

## Project Structure

```
project-tracker-app/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express entry point
│   │   ├── db/index.js         # pg.Pool instance
│   │   ├── middleware/
│   │   │   ├── auth.js         # requireAuth, requireAdmin
│   │   │   └── rbac.js         # requirePermission(key)
│   │   ├── routes/             # One file per domain
│   │   ├── services/
│   │   │   ├── email.js        # Nodemailer wrapper
│   │   │   ├── reminder.js     # Cron reminder logic
│   │   │   └── whatsapp.js     # WhatsApp notifications
│   │   └── utils/
│   │       └── bastPeriods.js  # BAST period generation (mirrored in frontend)
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.jsx             # Global state + tab navigation
│       ├── main.jsx            # React bootstrap
│       ├── api/                # Axios wrappers per domain
│       ├── components/
│       │   ├── layout/         # Header, Tabs, Toolbar, SummaryBar
│       │   ├── modals/         # Create/edit modals per domain
│       │   └── ui/             # Modal, Badge, EmptyState, ScheduleLine
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── ThemeContext.jsx
│       ├── pages/              # One file per tab
│       └── utils/
│           ├── bastPeriods.js  # Mirrored from backend — keep in sync
│           ├── permissions.js  # can() — mirrored from backend
│           ├── dates.js
│           ├── badges.js
│           └── export.js
└── database/
    ├── schema.sql
    ├── seed.sql
    ├── add_reminder_logs.sql
    └── migrate_from_supabase.js
```

---

## Key Conventions

### Adding a new route

1. Create `backend/src/routes/yourroute.js`
2. Mount it in `backend/src/app.js`: `app.use('/api/yourroute', require('./routes/yourroute'))`
3. Apply `requireAuth` and `requirePermission(key)` per the standard chain
4. Add a corresponding `frontend/src/api/yourroute.js` Axios wrapper

### Adding a new permission key

1. Add the key to `DEFAULT_ROLE_PERMISSIONS` in `backend/src/middleware/rbac.js`
2. Add the same key with the same default value to `DEFAULT_ROLE_PERMISSIONS` in `frontend/src/utils/permissions.js`
3. Run a DB update if the key needs to be applied to existing `role_permissions` rows:
   ```sql
   UPDATE role_permissions
   SET permissions = permissions || '{"new_key": true}'::jsonb
   WHERE role = 'pm';
   ```

### Changing BAST period logic

`bastPeriods.js` is duplicated in both `backend/src/utils/` and `frontend/src/utils/`. Any change must be applied to **both files** identically.

### Database schema changes

There is no migration framework. Write idempotent SQL scripts (using `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc.) and add them to `database/`. Apply manually:

```bash
psql -U postgres -d project_tracker -f database/your_migration.sql
```

---

## Running in Production

### Build the frontend

```bash
cd frontend && npm run build
```

Outputs to `frontend/dist/`. Serve this directory with nginx or any static file server, proxying `/api/*` to the Express backend.

### Backend

```bash
cd backend && npm start
```

Set `NODE_ENV=production` so session cookies are flagged `Secure`. Use a process manager (PM2, systemd) for uptime.

### Environment

- Set strong values for `JWT_SECRET` and `COOKIE_SECRET`
- Set `FRONTEND_ORIGIN` to the production domain (no trailing slash)
- Set `APP_BASE_URL` to the production frontend URL for reminder email links
- Ensure PostgreSQL is reachable from the backend host

---

## Default Credentials

Created by `database/schema.sql`:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |
| Email | `admin@company.com` |

**Change the admin password immediately after first login in any non-development environment.**
