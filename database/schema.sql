-- Project Tracker PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(50)  UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role        VARCHAR(50)  NOT NULL DEFAULT 'pm'
                CHECK (role IN ('admin','pm','om','system_engineer','dba','technical_writer')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
  id                 SERIAL PRIMARY KEY,
  pid                VARCHAR(50)  NOT NULL,
  company            VARCHAR(255) NOT NULL,
  name               TEXT         NOT NULL,
  status             VARCHAR(100) NOT NULL DEFAULT 'On Track'
                       CHECK (status IN ('On Track','In Progress - Minor Issues','In Progress - Major Issues','Completed','Not Started')),
  contract_start     DATE,
  deadline           DATE,
  billing_freq       VARCHAR(10),
  project_admin      VARCHAR(100),
  project_manager    VARCHAR(100),
  operation_manager  VARCHAR(100),
  handover_status    VARCHAR(50)  NOT NULL DEFAULT 'Not Started'
                       CHECK (handover_status IN ('Not Started','Transfer Knowledge','Completed')),
  issues             TEXT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Auto-generated billing periods AND custom termins per project.
-- For auto-generated: label matches generated label, is_custom=false.
-- For custom termins: is_custom=true.
CREATE TABLE bast_periods (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label           VARCHAR(100) NOT NULL,
  start_date      DATE,
  end_date        DATE,
  steps           BOOLEAN[]   NOT NULL DEFAULT ARRAY[false,false,false,false,false,false,false,false],
  submit_deadline DATE,
  is_custom       BOOLEAN     NOT NULL DEFAULT false,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, label)
);

CREATE TABLE cm_requests (
  id             SERIAL PRIMARY KEY,
  project_id     INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  start_date     DATE,
  start_time     TIME,
  end_date       DATE,
  end_time       TIME,
  status         VARCHAR(50) NOT NULL DEFAULT 'Open'
                   CHECK (status IN ('Open','In Progress','Resolved')),
  resolved_date  DATE,
  pic_utama      VARCHAR(100),
  pic_support    VARCHAR(100),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pm_requests (
  id             SERIAL PRIMARY KEY,
  project_id     INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  start_date     DATE,
  start_time     TIME,
  end_date       DATE,
  end_time       TIME,
  status         VARCHAR(50) NOT NULL DEFAULT 'Open'
                   CHECK (status IN ('Open','In Progress','Resolved')),
  resolved_date  DATE,
  pic_utama      VARCHAR(100),
  pic_support    VARCHAR(100),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role-level permissions stored as JSONB keyed by permission key
CREATE TABLE role_permissions (
  role        VARCHAR(50) PRIMARY KEY,
  permissions JSONB       NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default admin user (password: admin123 — hashed below as placeholder;
-- the app will re-hash on first startup if needed, or run:
--   UPDATE users SET password_hash = crypt('admin123', gen_salt('bf')) WHERE username = 'admin';
INSERT INTO users (username, email, password_hash, role)
VALUES ('admin', 'admin@company.com', crypt('admin123', gen_salt('bf')), 'admin')
ON CONFLICT DO NOTHING;

-- Default role permissions
INSERT INTO role_permissions (role, permissions) VALUES
('pm',              '{"view_projects":true,"add_project":true,"edit_project":true,"delete_project":false,"view_reminders":true,"view_bast":true,"edit_bast":false,"view_cm":true,"manage_cm":true,"view_pm":true,"manage_pm":true}'),
('om',              '{"view_projects":true,"add_project":true,"edit_project":true,"delete_project":false,"view_reminders":true,"view_bast":true,"edit_bast":false,"view_cm":true,"manage_cm":true,"view_pm":true,"manage_pm":true}'),
('system_engineer', '{"view_projects":true,"add_project":false,"edit_project":false,"delete_project":false,"view_reminders":true,"view_bast":true,"edit_bast":true,"view_cm":true,"manage_cm":true,"view_pm":true,"manage_pm":true}'),
('dba',             '{"view_projects":true,"add_project":false,"edit_project":false,"delete_project":false,"view_reminders":true,"view_bast":true,"edit_bast":true,"view_cm":true,"manage_cm":true,"view_pm":true,"manage_pm":true}'),
('technical_writer','{"view_projects":true,"add_project":false,"edit_project":false,"delete_project":false,"view_reminders":true,"view_bast":true,"edit_bast":false,"view_cm":true,"manage_cm":false,"view_pm":true,"manage_pm":false}')
ON CONFLICT DO NOTHING;

CREATE TABLE reminder_logs (
  id             SERIAL      PRIMARY KEY,
  project_id     INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reminder_type  VARCHAR(50) NOT NULL,   -- 'contract_end', 'bast_submit', 'cm_activity', 'pm_activity'
  reference_id   VARCHAR(200) NOT NULL,  -- 'contract' | '{label}:{urgency}' | request id as string
  send_count     INTEGER     NOT NULL DEFAULT 0,
  last_sent_at   TIMESTAMPTZ,
  CONSTRAINT reminder_logs_unique UNIQUE (project_id, reminder_type, reference_id)
);

-- Indexes
CREATE INDEX ON bast_periods   (project_id);
CREATE INDEX ON cm_requests    (project_id);
CREATE INDEX ON pm_requests    (project_id);
CREATE INDEX ON cm_requests    (status);
CREATE INDEX ON pm_requests    (status);
CREATE INDEX ON reminder_logs  (project_id);
