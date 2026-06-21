-- Migration: add reminder_logs table for tracking automated email reminders

CREATE TABLE IF NOT EXISTS reminder_logs (
  id             SERIAL      PRIMARY KEY,
  project_id     INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reminder_type  VARCHAR(50) NOT NULL,   -- 'contract_end', 'bast_submit', 'cm_activity', 'pm_activity'
  reference_id   VARCHAR(200) NOT NULL,  -- 'contract' | '{label}:{urgency}' | request id as string
  send_count     INTEGER     NOT NULL DEFAULT 0,
  last_sent_at   TIMESTAMPTZ,
  CONSTRAINT reminder_logs_unique UNIQUE (project_id, reminder_type, reference_id)
);

CREATE INDEX IF NOT EXISTS reminder_logs_project_id_idx ON reminder_logs (project_id);
