-- Global per-type reminder toggle (admin-controlled)
CREATE TABLE IF NOT EXISTS reminder_settings (
  reminder_type VARCHAR(50) PRIMARY KEY
    CHECK (reminder_type IN ('contract_end','bast_submit','cm_activity','pm_activity')),
  enabled       BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO reminder_settings (reminder_type, enabled) VALUES
  ('contract_end', true),
  ('bast_submit',  true),
  ('cm_activity',  true),
  ('pm_activity',  true)
ON CONFLICT DO NOTHING;

-- Per-project override: exclude a specific project from all reminders
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT true;
