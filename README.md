# Project Tracker App

An internal web application for managing IT service contracts, BAST billing periods, Change Management (CM) requests, and Problem Management (PM) requests. Designed for an internal team with role-based access control.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Express.js + `pg` (PostgreSQL driver) |
| Database | PostgreSQL |
| Auth | JWT (httpOnly cookie) |
| Email | Nodemailer (SMTP) |
| Scheduler | node-cron |

## Features

- **Project & Contract Management** — Track IT service contracts with start/end dates, billing frequency, and handover status
- **BAST Billing Periods** — Auto-generated billing period schedule with step checklists, custom termins, and submit deadlines
- **Change Management (CM)** — Log and track CM requests with status and PIC assignment
- **Problem Management (PM)** — Log and track PM requests similarly to CM
- **Automated Reminders** — Email alerts for contract end dates (60d/30d/7d) and overdue CM/PM activity
- **Role-Based Access Control** — Six roles with runtime-editable permissions via the Access Control page
- **Export** — Export data to XLSX

## Quick Start

### Docker (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Compose plugin.

```bash
cp .env.example .env
# Edit .env — set DB_PASSWORD, JWT_SECRET, COOKIE_SECRET at minimum

docker compose up --build
```

Open [http://localhost](http://localhost). The database schema is applied automatically on first boot.

### Local (without Docker)

#### Prerequisites

- Node.js v18+
- PostgreSQL v14+

```bash
# Install
cd backend && npm install
cd ../frontend && npm install

# Configure
cp backend/.env.example backend/.env
# Edit backend/.env with DB credentials, JWT secret, SMTP settings

# Initialize database
psql -U postgres -d project_tracker -f database/schema.sql

# Run (two terminals)
cd backend && npm run dev      # port 3001
cd frontend && npm run dev     # port 5173
```

Open [http://localhost:5173](http://localhost:5173).

---

Default admin credentials (created by `schema.sql`): **username** `admin` / **password** `admin123`. Change the password after first login.

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, and key patterns |
| [Database](docs/DATABASE.md) | Schema reference and table descriptions |
| [API Reference](docs/API.md) | Backend REST API endpoints |
| [Development Guide](docs/DEVELOPMENT.md) | Setup, conventions, and contribution notes |

## Roles

| Role | Description |
|---|---|
| `admin` | Full access; bypasses all permission checks |
| `pm` | Project Manager — manages projects and assignments |
| `om` | Operations Manager |
| `system_engineer` | Handles CM/PM requests |
| `dba` | Database Administrator |
| `technical_writer` | Documentation-focused access |

Permissions for each role are stored in the database and editable at runtime via the Access Control page (admin only).
