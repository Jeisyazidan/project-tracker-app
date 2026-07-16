-- Destructive — run manually, only after verify_pic_user_ids.sql returns
-- zero rows (or any remaining unmatched rows are consciously accepted as
-- "will show as unassigned"). Not run automatically by any script or app code.

ALTER TABLE projects
  DROP COLUMN IF EXISTS project_admin,
  DROP COLUMN IF EXISTS project_manager,
  DROP COLUMN IF EXISTS operation_manager;

ALTER TABLE cm_requests
  DROP COLUMN IF EXISTS pic_utama,
  DROP COLUMN IF EXISTS pic_support,
  DROP COLUMN IF EXISTS pic_utama_id,
  DROP COLUMN IF EXISTS pic_support_id;

ALTER TABLE pm_requests
  DROP COLUMN IF EXISTS pic_utama,
  DROP COLUMN IF EXISTS pic_support,
  DROP COLUMN IF EXISTS pic_utama_id,
  DROP COLUMN IF EXISTS pic_support_id;

-- pic_utama_id/pic_support_id were superseded by the many-to-many
-- cm_request_pics/pm_request_pics junction tables (add_cm_pm_multi_pic.sql).
