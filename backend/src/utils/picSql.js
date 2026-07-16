// SQL/DB helpers for the many-to-many CM/PM "PIC Utama"/"PIC Support"
// assignment (cm_request_pics / pm_request_pics junction tables).

// LEFT JOINs two aggregated subqueries onto `${requestAlias}.id`, exposing
// pic_utama_agg/pic_support_agg with a comma-joined `names` string (for
// display, aliasing back to the field names the frontend already reads)
// and a `users` JSON array of {id, username, role} (for edit forms and the
// admin "All Users" dashboard's per-assignee grouping).
function picJoinClauses(picTable, requestAlias) {
  return `
    LEFT JOIN (
      SELECT jt.request_id,
             string_agg(u.username, ', ' ORDER BY u.username) AS names,
             json_agg(json_build_object('id', u.id, 'username', u.username, 'role', u.role) ORDER BY u.username) AS users
      FROM ${picTable} jt JOIN users u ON u.id = jt.user_id
      WHERE jt.relation = 'utama'
      GROUP BY jt.request_id
    ) pic_utama_agg ON pic_utama_agg.request_id = ${requestAlias}.id
    LEFT JOIN (
      SELECT jt.request_id,
             string_agg(u.username, ', ' ORDER BY u.username) AS names,
             json_agg(json_build_object('id', u.id, 'username', u.username, 'role', u.role) ORDER BY u.username) AS users
      FROM ${picTable} jt JOIN users u ON u.id = jt.user_id
      WHERE jt.relation = 'support'
      GROUP BY jt.request_id
    ) pic_support_agg ON pic_support_agg.request_id = ${requestAlias}.id
  `;
}

// Select-list fragment matching picJoinClauses' aliases. `pic_utama`/
// `pic_support` are plain comma-joined display strings (alias-back, same
// field names the frontend already renders); `pic_utama_users`/
// `pic_support_users` are the raw {id,username,role} arrays for edit forms.
const picSelectFields = `
  COALESCE(pic_utama_agg.names, '')           AS pic_utama,
  COALESCE(pic_support_agg.names, '')         AS pic_support,
  COALESCE(pic_utama_agg.users, '[]'::json)   AS pic_utama_users,
  COALESCE(pic_support_agg.users, '[]'::json) AS pic_support_users
`;

function toIdArray(input) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(n => parseInt(n, 10)).filter(Number.isInteger))];
}

// Replaces all PIC rows for a request with the given user id lists.
async function replaceRequestPics(db, picTable, requestId, utamaIds, supportIds) {
  await db.query(`DELETE FROM ${picTable} WHERE request_id = $1`, [requestId]);
  const rows = [
    ...utamaIds.map(id => [requestId, id, 'utama']),
    ...supportIds.map(id => [requestId, id, 'support']),
  ];
  if (!rows.length) return;
  const values = rows.map((_, i) => `($${i * 3 + 1},$${i * 3 + 2},$${i * 3 + 3})`).join(',');
  await db.query(
    `INSERT INTO ${picTable} (request_id, user_id, relation) VALUES ${values} ON CONFLICT DO NOTHING`,
    rows.flat()
  );
}

module.exports = { picJoinClauses, picSelectFields, toIdArray, replaceRequestPics };
