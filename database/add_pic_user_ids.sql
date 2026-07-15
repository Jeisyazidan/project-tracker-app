-- Idempotent: adds user_id FK columns for PIC/manager assignment fields.
-- Additive + backfill only. Does NOT drop the old VARCHAR columns —
-- run verify_pic_user_ids.sql afterward, fix any unmatched rows, and only
-- then run drop_pic_text_columns.sql.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_admin_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_manager_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operation_manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE cm_requests
  ADD COLUMN IF NOT EXISTS pic_utama_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pic_support_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE pm_requests
  ADD COLUMN IF NOT EXISTS pic_utama_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pic_support_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Backfill by exact username match (same semantics as the existing
-- lookupEmail() exact-match lookup).
UPDATE projects p SET project_admin_id = u.id
  FROM users u WHERE u.username = p.project_admin AND p.project_admin_id IS NULL;
UPDATE projects p SET project_manager_id = u.id
  FROM users u WHERE u.username = p.project_manager AND p.project_manager_id IS NULL;
UPDATE projects p SET operation_manager_id = u.id
  FROM users u WHERE u.username = p.operation_manager AND p.operation_manager_id IS NULL;

UPDATE cm_requests c SET pic_utama_id = u.id
  FROM users u WHERE u.username = c.pic_utama AND c.pic_utama_id IS NULL;
UPDATE cm_requests c SET pic_support_id = u.id
  FROM users u WHERE u.username = c.pic_support AND c.pic_support_id IS NULL;

UPDATE pm_requests r SET pic_utama_id = u.id
  FROM users u WHERE u.username = r.pic_utama AND r.pic_utama_id IS NULL;
UPDATE pm_requests r SET pic_support_id = u.id
  FROM users u WHERE u.username = r.pic_support AND r.pic_support_id IS NULL;

CREATE INDEX IF NOT EXISTS projects_project_admin_id_idx     ON projects (project_admin_id);
CREATE INDEX IF NOT EXISTS projects_project_manager_id_idx   ON projects (project_manager_id);
CREATE INDEX IF NOT EXISTS projects_operation_manager_id_idx ON projects (operation_manager_id);
CREATE INDEX IF NOT EXISTS cm_requests_pic_utama_id_idx      ON cm_requests (pic_utama_id);
CREATE INDEX IF NOT EXISTS cm_requests_pic_support_id_idx    ON cm_requests (pic_support_id);
CREATE INDEX IF NOT EXISTS pm_requests_pic_utama_id_idx      ON pm_requests (pic_utama_id);
CREATE INDEX IF NOT EXISTS pm_requests_pic_support_id_idx    ON pm_requests (pic_support_id);
