-- Idempotent: lets CM/PM "PIC Utama" and "PIC Support" hold more than one
-- user each. Adds junction tables and backfills them from the existing
-- single-user pic_utama_id/pic_support_id columns. Does NOT drop those
-- columns — they're already slated for removal alongside the legacy text
-- columns in drop_pic_text_columns.sql once verified safe to run.

CREATE TABLE IF NOT EXISTS cm_request_pics (
  id         SERIAL PRIMARY KEY,
  request_id INTEGER     NOT NULL REFERENCES cm_requests(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation   VARCHAR(10) NOT NULL CHECK (relation IN ('utama','support')),
  UNIQUE (request_id, user_id, relation)
);

CREATE TABLE IF NOT EXISTS pm_request_pics (
  id         SERIAL PRIMARY KEY,
  request_id INTEGER     NOT NULL REFERENCES pm_requests(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation   VARCHAR(10) NOT NULL CHECK (relation IN ('utama','support')),
  UNIQUE (request_id, user_id, relation)
);

CREATE INDEX IF NOT EXISTS cm_request_pics_request_id_idx ON cm_request_pics (request_id);
CREATE INDEX IF NOT EXISTS cm_request_pics_user_id_idx    ON cm_request_pics (user_id);
CREATE INDEX IF NOT EXISTS pm_request_pics_request_id_idx ON pm_request_pics (request_id);
CREATE INDEX IF NOT EXISTS pm_request_pics_user_id_idx    ON pm_request_pics (user_id);

-- Backfill one row per existing single-assignment.
INSERT INTO cm_request_pics (request_id, user_id, relation)
  SELECT id, pic_utama_id, 'utama' FROM cm_requests WHERE pic_utama_id IS NOT NULL
  ON CONFLICT DO NOTHING;
INSERT INTO cm_request_pics (request_id, user_id, relation)
  SELECT id, pic_support_id, 'support' FROM cm_requests WHERE pic_support_id IS NOT NULL
  ON CONFLICT DO NOTHING;

INSERT INTO pm_request_pics (request_id, user_id, relation)
  SELECT id, pic_utama_id, 'utama' FROM pm_requests WHERE pic_utama_id IS NOT NULL
  ON CONFLICT DO NOTHING;
INSERT INTO pm_request_pics (request_id, user_id, relation)
  SELECT id, pic_support_id, 'support' FROM pm_requests WHERE pic_support_id IS NOT NULL
  ON CONFLICT DO NOTHING;
