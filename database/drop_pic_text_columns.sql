-- Destructive — run manually, only after verify_pic_user_ids.sql returns
-- zero rows (or any remaining unmatched rows are consciously accepted as
-- "will show as unassigned"). Not run automatically by any script or app code.

ALTER TABLE projects
  DROP COLUMN IF EXISTS project_admin,
  DROP COLUMN IF EXISTS project_manager,
  DROP COLUMN IF EXISTS operation_manager;

ALTER TABLE cm_requests
  DROP COLUMN IF EXISTS pic_utama,
  DROP COLUMN IF EXISTS pic_support;

ALTER TABLE pm_requests
  DROP COLUMN IF EXISTS pic_utama,
  DROP COLUMN IF EXISTS pic_support;
