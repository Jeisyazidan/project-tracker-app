// Generates a human-readable unique code for a CM/PM request, e.g.
// CM-25-64-075-01. The sequence is per-project and derived from the max
// sequence already used (not a row count), so it never repeats even after
// a request in the middle of the sequence gets deleted.
async function nextRequestCode(db, table, typePrefix, projectId, projectPid) {
  const { rows } = await db.query(
    `SELECT COALESCE(MAX(SUBSTRING(code FROM '-(\\d+)$')::int), 0) + 1 AS next_seq
     FROM ${table} WHERE project_id = $1`,
    [projectId]
  );
  const seq = rows[0].next_seq;
  return `${typePrefix}-${projectPid}-${String(seq).padStart(2, '0')}`;
}

module.exports = { nextRequestCode };
