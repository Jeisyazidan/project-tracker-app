# Database Reference

PostgreSQL database. Schema is fully defined in `database/schema.sql`.

## Setup

```bash
# Create database (first time)
createdb -U postgres project_tracker

# Apply schema (creates tables, seed admin user, default permissions)
psql -U postgres -d project_tracker -f database/schema.sql

# Optional: load sample data
psql -U postgres -d project_tracker -f database/seed.sql
```

For an existing database that pre-dates `reminder_logs`:

```bash
psql -U postgres -d project_tracker -f database/add_reminder_logs.sql
```

---

## Tables

### `users`

Stores application user accounts.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `username` | VARCHAR(50) | Unique |
| `email` | VARCHAR(255) | Unique |
| `password_hash` | VARCHAR(255) | bcrypt hash |
| `role` | VARCHAR(50) | `admin`, `pm`, `om`, `system_engineer`, `dba`, `technical_writer` |
| `created_at` | TIMESTAMPTZ | |

The default admin is seeded by `schema.sql` with username `admin`, email `admin@company.com`, and password `admin123`. Change the password immediately after first login.

---

### `projects`

Core project and contract records.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `pid` | VARCHAR(50) | Internal project identifier |
| `company` | VARCHAR(255) | Client company |
| `name` | TEXT | Project name |
| `status` | VARCHAR(100) | See statuses below |
| `contract_start` | DATE | |
| `deadline` | DATE | Contract end date |
| `billing_freq` | VARCHAR(10) | Billing frequency (e.g., `monthly`, `quarterly`) |
| `project_admin` | VARCHAR(100) | |
| `project_manager` | VARCHAR(100) | |
| `operation_manager` | VARCHAR(100) | |
| `handover_status` | VARCHAR(50) | `Not Started`, `Transfer Knowledge`, `Completed` |
| `issues` | TEXT | Free-form issue notes |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Project statuses:**
- `On Track`
- `In Progress - Minor Issues`
- `In Progress - Major Issues`
- `Completed`
- `Not Started`

---

### `bast_periods`

Billing period rows. Only rows with actual data are stored — the full schedule is derived at read time from `generatePeriods()` and then merged with these stored rows. See [ARCHITECTURE.md](ARCHITECTURE.md#bast-billing-period-logic) for details.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `project_id` | INTEGER FK | → `projects(id)` CASCADE DELETE |
| `label` | VARCHAR(100) | Period label, e.g., `2024-01` or `Q1 2024` |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `steps` | BOOLEAN[] | 8-element array; each element = one checklist step |
| `submit_deadline` | DATE | When BAST must be submitted |
| `is_custom` | BOOLEAN | `true` for custom termins outside the generated schedule |
| `sort_order` | INTEGER | Display order for custom termins |
| `created_at` | TIMESTAMPTZ | |

**Unique constraint:** `(project_id, label)` — one row per period label per project.

---

### `cm_requests`

Change Management requests linked to a project.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `project_id` | INTEGER FK | → `projects(id)` CASCADE DELETE |
| `title` | TEXT | |
| `start_date` | DATE | Scheduled change start |
| `start_time` | TIME | |
| `end_date` | DATE | Scheduled change end |
| `end_time` | TIME | |
| `status` | VARCHAR(50) | `Open`, `In Progress`, `Resolved` |
| `resolved_date` | DATE | |
| `pic_utama` | VARCHAR(100) | Primary PIC (person in charge) |
| `pic_support` | VARCHAR(100) | Support PIC |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `pm_requests`

Problem Management requests. Identical schema to `cm_requests`.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `project_id` | INTEGER FK | → `projects(id)` CASCADE DELETE |
| `title` | TEXT | |
| `start_date` | DATE | |
| `start_time` | TIME | |
| `end_date` | DATE | |
| `end_time` | TIME | |
| `status` | VARCHAR(50) | `Open`, `In Progress`, `Resolved` |
| `resolved_date` | DATE | |
| `pic_utama` | VARCHAR(100) | |
| `pic_support` | VARCHAR(100) | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `role_permissions`

Runtime-editable RBAC permissions, one row per role.

| Column | Type | Notes |
|---|---|---|
| `role` | VARCHAR(50) PK | Role name |
| `permissions` | JSONB | Map of permission key → boolean |
| `updated_at` | TIMESTAMPTZ | |

**Default permissions by role:**

| Permission key | `pm` | `om` | `system_engineer` | `dba` | `technical_writer` |
|---|:---:|:---:|:---:|:---:|:---:|
| `view_projects` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `add_project` | ✓ | ✓ | | | |
| `edit_project` | ✓ | ✓ | | | |
| `delete_project` | | | | | |
| `view_reminders` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `view_bast` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `edit_bast` | | | ✓ | ✓ | |
| `view_cm` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `manage_cm` | ✓ | ✓ | ✓ | ✓ | |
| `view_pm` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `manage_pm` | ✓ | ✓ | ✓ | ✓ | |

`admin` role always has full access and is not stored in this table.

---

### `reminder_logs`

Deduplication log for the automated reminder service.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `project_id` | INTEGER FK | → `projects(id)` CASCADE DELETE |
| `reminder_type` | VARCHAR(50) | `contract_end`, `bast_submit`, `cm_activity`, `pm_activity` |
| `reference_id` | VARCHAR(200) | Identifies what was reminded — see below |
| `send_count` | INTEGER | Number of times this reminder was sent |
| `last_sent_at` | TIMESTAMPTZ | |

**`reference_id` formats:**

| `reminder_type` | `reference_id` format | Example |
|---|---|---|
| `contract_end` | `contract:{threshold}` | `contract:60d`, `contract:30d`, `contract:7d` |
| `bast_submit` | `{period_label}:{urgency}` | `2024-01:overdue` |
| `cm_activity` | CM request ID as string | `42` |
| `pm_activity` | PM request ID as string | `17` |

**Unique constraint:** `(project_id, reminder_type, reference_id)` — prevents duplicate log entries.

---

## Indexes

```sql
CREATE INDEX ON bast_periods  (project_id);
CREATE INDEX ON cm_requests   (project_id);
CREATE INDEX ON pm_requests   (project_id);
CREATE INDEX ON cm_requests   (status);
CREATE INDEX ON pm_requests   (status);
CREATE INDEX ON reminder_logs (project_id);
```

---

## Migration

### Supabase → PostgreSQL

If migrating from the legacy Supabase deployment:

```bash
node database/migrate_from_supabase.js
```

Configure source Supabase credentials and target PostgreSQL credentials in the script or via environment variables before running.
