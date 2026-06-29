# API Reference

All endpoints are under `/api`. Authentication uses an httpOnly cookie (`token`) set on login — pass `withCredentials: true` in all client requests.

**Common responses:**
- `401` — not authenticated (no valid cookie)
- `403` — authenticated but missing permission
- `500` — server error

---

## Auth — `/api/auth`

### `POST /api/auth/login`

Authenticates a user and sets the session cookie.

**Body:**
```json
{ "username": "string", "password": "string" }
```

**Response `200`:**
```json
{ "id": 1, "username": "admin", "email": "admin@company.com", "role": "admin" }
```

Sets a `token` httpOnly cookie (7-day expiry).

---

### `POST /api/auth/logout`

Clears the session cookie.

**Response `200`:**
```json
{ "ok": true }
```

---

### `GET /api/auth/me`

Returns the currently authenticated user. Requires auth.

**Response `200`:**
```json
{ "id": 1, "username": "admin", "email": "admin@company.com", "role": "admin" }
```

---

## Projects — `/api/projects`

All routes require auth. Permission requirements are noted per endpoint.

### `GET /api/projects`

Returns all projects with aggregated CM/PM counts and stored BAST periods.

**Permission:** `view_projects`

**Response `200`:** Array of project objects:
```json
[
  {
    "id": 1,
    "pid": "PROJ-001",
    "company": "PT Example",
    "name": "IT Infrastructure Support",
    "status": "On Track",
    "contract_start": "2024-01-01",
    "deadline": "2024-12-31",
    "billing_freq": "monthly",
    "project_admin": "alice",
    "project_manager": "bob",
    "operation_manager": "carol",
    "handover_status": "Not Started",
    "issues": null,
    "cm_total": 3,
    "cm_active": 1,
    "pm_total": 2,
    "pm_active": 0,
    "bast_stored_periods": [...]
  }
]
```

---

### `POST /api/projects`

Creates a new project.

**Permission:** `add_project`

**Body:**
```json
{
  "pid": "PROJ-002",
  "company": "PT Example",
  "name": "New Project",
  "status": "On Track",
  "contract_start": "2024-01-01",
  "deadline": "2024-12-31",
  "billing_freq": "monthly",
  "project_admin": "alice",
  "project_manager": "bob",
  "operation_manager": "carol",
  "handover_status": "Not Started",
  "issues": null
}
```

Required: `pid`, `company`, `name`.

**Response `201`:** Created project object.

---

### `PUT /api/projects/:id`

Updates an existing project.

**Permission:** `edit_project`

**Body:** Same fields as POST. All fields are overwritten.

**Response `200`:** Updated project object. `404` if not found.

---

### `DELETE /api/projects/:id`

Deletes a project and all related records (BAST periods, CM/PM requests cascade).

**Permission:** `delete_project`

**Response `200`:** `{ "ok": true }`. `404` if not found.

---

## BAST Periods — `/api/bast`

All routes require auth.

### `GET /api/bast/:projectId`

Returns all stored BAST period rows for a project (does not include auto-generated periods without data).

**Permission:** `view_bast`

**Response `200`:** Array of period rows.

---

### `PUT /api/bast/:projectId/period`

Upserts a period's steps and/or submit deadline by label (insert on first save, update on conflict).

**Permission:** `edit_bast`

**Body:**
```json
{
  "label": "2024-01",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "steps": [true, true, false, false, false, false, false, false],
  "submit_deadline": "2024-02-07"
}
```

Required: `label`.

**Response `200`:** Upserted period row.

---

### `POST /api/bast/:projectId/termins`

Adds a custom termin (billing period outside the auto-generated schedule).

**Permission:** `edit_bast`

**Body:**
```json
{
  "label": "Termin Khusus 1",
  "start_date": "2024-06-01",
  "end_date": "2024-06-30",
  "sort_order": 0
}
```

Required: `label`. Returns `409` if label already exists for the project.

**Response `201`:** Created termin row.

---

### `PUT /api/bast/:projectId/termins/:terminId`

Updates a custom termin's label or dates.

**Permission:** `edit_bast`

**Body:** `{ "label": "...", "start_date": "...", "end_date": "..." }`

**Response `200`:** Updated row. `404` if not found.

---

### `DELETE /api/bast/:projectId/termins/:terminId`

Deletes a custom termin.

**Permission:** `edit_bast`

**Response `200`:** `{ "ok": true }`. `404` if not found.

---

## Change Management — `/api/cm`

All routes require auth.

### `GET /api/cm`

Returns all CM requests with project info, ordered by status priority then date descending.

**Permission:** `view_cm`

**Response `200`:** Array of CM requests including `pid`, `company`, `project_name` joined from the project.

---

### `POST /api/cm`

Creates a CM request. Sends assignment email to PICs if provided.

**Permission:** `manage_cm`

**Body:**
```json
{
  "project_id": 1,
  "title": "OS Patch Deployment",
  "start_date": "2024-03-15",
  "start_time": "22:00",
  "end_date": "2024-03-16",
  "end_time": "02:00",
  "status": "Open",
  "resolved_date": null,
  "pic_utama": "alice",
  "pic_support": "bob",
  "notes": "Patch KB5034441"
}
```

Required: `project_id`, `title`, `start_date`.

**Response `201`:** Created CM request object.

---

### `PUT /api/cm/:id`

Updates a CM request. Sends assignment email only to newly-assigned PICs (those not previously assigned).

**Permission:** `manage_cm`

**Body:** Same fields as POST minus `project_id`.

**Response `200`:** Updated CM request object. `404` if not found.

---

### `DELETE /api/cm/:id`

Deletes a CM request.

**Permission:** `manage_cm`

**Response `200`:** `{ "ok": true }`. `404` if not found.

---

## Problem Management — `/api/pm`

Identical structure to `/api/cm`. All routes require auth.

| Endpoint | Permission |
|---|---|
| `GET /api/pm` | `view_pm` |
| `POST /api/pm` | `manage_pm` |
| `PUT /api/pm/:id` | `manage_pm` |
| `DELETE /api/pm/:id` | `manage_pm` |

---

## Users — `/api/users`

### `GET /api/users/list`

Minimal user list for dropdowns. Available to all authenticated users.

**Response `200`:**
```json
[{ "id": 1, "username": "alice", "role": "pm" }, ...]
```

---

### `GET /api/users`

Full user list with email and phone. **Admin only.**

**Response `200`:** Array of users with `id`, `username`, `email`, `phone`, `role`, `created_at`.

---

### `POST /api/users`

Creates a new user. Sends a welcome notification. **Admin only.**

**Body:**
```json
{
  "username": "alice",
  "email": "alice@company.com",
  "password": "secret123",
  "role": "pm",
  "phone": "+6281234567890"
}
```

Required: `username`, `email`, `password`. Returns `409` on duplicate username/email.

**Response `201`:** Created user object (no password hash).

---

### `DELETE /api/users/:id`

Deletes a user. Cannot delete your own account. **Admin only.**

**Response `200`:** `{ "ok": true }`. `404` if not found.

---

### `PUT /api/users/:id/phone`

Updates a user's WhatsApp phone number. **Admin only.**

**Body:** `{ "phone": "+6281234567890" }`

**Response `200`:** `{ "ok": true }`.

---

### `PUT /api/users/:id/password`

Changes a user's password (minimum 6 characters). **Admin only.**

**Body:** `{ "password": "newpassword" }`

**Response `200`:** `{ "ok": true }`.

---

## Config — `/api/config`

### `GET /api/config/permissions`

Returns the current permissions map for all roles. Required by the frontend on login to populate the RBAC cache. Available to all authenticated users.

**Response `200`:**
```json
{
  "pm": { "view_projects": true, "add_project": true, ... },
  "om": { ... },
  "system_engineer": { ... },
  "dba": { ... },
  "technical_writer": { ... }
}
```

---

### `PUT /api/config/permissions`

Replaces permissions for one or more roles. **Admin only.**

**Body:**
```json
{
  "pm": { "view_projects": true, "add_project": false, ... },
  "technical_writer": { "view_projects": true, "manage_cm": false, ... }
}
```

Only the roles included in the body are updated. Uses a transaction to update all roles atomically.

**Response `200`:** `{ "ok": true }`.

---

## Reminders — `/api/reminders`

### `GET /api/reminders/logs`

Returns up to 200 most recent reminder log entries (joined with project info). Available to all authenticated users.

**Response `200`:**
```json
[
  {
    "id": 1,
    "project_id": 3,
    "reminder_type": "contract_end",
    "reference_id": "contract:30d",
    "send_count": 1,
    "last_sent_at": "2024-11-01T00:00:00.000Z",
    "pid": "PROJ-001",
    "project_name": "IT Infrastructure Support",
    "company": "PT Example"
  }
]
```

---

### `POST /api/reminders/run`

Manually triggers all reminder checks. **Admin only.** Runs asynchronously — returns immediately.

**Response `200`:** `{ "ok": true, "message": "Reminder checks triggered" }`.

---

## Health Check

### `GET /api/health`

Always returns `200`. No authentication required.

**Response `200`:** `{ "status": "ok" }`
