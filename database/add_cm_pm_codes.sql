-- Migration: add a human-readable unique code to CM/PM requests, e.g.
-- CM-25-64-075-01 (type-projectPID-sequence, sequence resets per project
-- and never reuses a number even after a row is deleted).

ALTER TABLE cm_requests ADD COLUMN IF NOT EXISTS code VARCHAR(60);
ALTER TABLE pm_requests ADD COLUMN IF NOT EXISTS code VARCHAR(60);

-- Backfill existing rows, numbering sequentially per project in creation order
WITH numbered AS (
  SELECT c.id, p.pid, ROW_NUMBER() OVER (PARTITION BY c.project_id ORDER BY c.id) AS seq
  FROM cm_requests c JOIN projects p ON p.id = c.project_id
  WHERE c.code IS NULL
)
UPDATE cm_requests c
SET code = 'CM-' || numbered.pid || '-' || LPAD(numbered.seq::text, 2, '0')
FROM numbered
WHERE c.id = numbered.id;

WITH numbered AS (
  SELECT r.id, p.pid, ROW_NUMBER() OVER (PARTITION BY r.project_id ORDER BY r.id) AS seq
  FROM pm_requests r JOIN projects p ON p.id = r.project_id
  WHERE r.code IS NULL
)
UPDATE pm_requests r
SET code = 'PM-' || numbered.pid || '-' || LPAD(numbered.seq::text, 2, '0')
FROM numbered
WHERE r.id = numbered.id;

ALTER TABLE cm_requests ALTER COLUMN code SET NOT NULL;
ALTER TABLE pm_requests ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cm_requests_code_uidx ON cm_requests (code);
CREATE UNIQUE INDEX IF NOT EXISTS pm_requests_code_uidx ON pm_requests (code);
