-- Read-only: run after add_pic_user_ids.sql to find any PIC/manager text
-- value that didn't match an existing username (typo, former user, etc.)
-- and therefore has no id backfilled. Fix these (correct the username, or
-- manually set the _id column) before running drop_pic_text_columns.sql.

SELECT id, pid, 'project_admin' AS field, project_admin AS unmatched_value
  FROM projects WHERE project_admin IS NOT NULL AND project_admin <> '' AND project_admin_id IS NULL
UNION ALL
SELECT id, pid, 'project_manager', project_manager
  FROM projects WHERE project_manager IS NOT NULL AND project_manager <> '' AND project_manager_id IS NULL
UNION ALL
SELECT id, pid, 'operation_manager', operation_manager
  FROM projects WHERE operation_manager IS NOT NULL AND operation_manager <> '' AND operation_manager_id IS NULL
UNION ALL
SELECT id, project_id::text, 'cm.pic_utama', pic_utama
  FROM cm_requests WHERE pic_utama IS NOT NULL AND pic_utama <> '' AND pic_utama_id IS NULL
UNION ALL
SELECT id, project_id::text, 'cm.pic_support', pic_support
  FROM cm_requests WHERE pic_support IS NOT NULL AND pic_support <> '' AND pic_support_id IS NULL
UNION ALL
SELECT id, project_id::text, 'pm.pic_utama', pic_utama
  FROM pm_requests WHERE pic_utama IS NOT NULL AND pic_utama <> '' AND pic_utama_id IS NULL
UNION ALL
SELECT id, project_id::text, 'pm.pic_support', pic_support
  FROM pm_requests WHERE pic_support IS NOT NULL AND pic_support <> '' AND pic_support_id IS NULL;
