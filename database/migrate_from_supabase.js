#!/usr/bin/env node
/**
 * One-time migration: Supabase config table → PostgreSQL
 *
 * Reads /tmp/supabase_data.json (already fetched), then:
 *   1. Truncates all tables
 *   2. Inserts users  (preserves bcrypt hashes)
 *   3. Inserts projects with all fields
 *   4. Inserts bast_periods (auto + custom termins)
 *   5. Inserts cm_requests / pm_requests (nested per project)
 *   6. Upserts role_permissions
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { Pool } = require('pg');
const fs       = require('fs');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

function orNull(v) {
  if (v === '' || v === undefined || v === null) return null;
  return v;
}

async function run() {
  const raw  = fs.readFileSync('/tmp/supabase_data.json', 'utf8');
  const rows = JSON.parse(raw);
  const data = Object.fromEntries(rows.map(r => [r.key, r.value]));

  const projects        = data.projects        || [];
  const authUsers       = data.auth_users      || [];
  const rolePermissions = data.role_permissions || {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Clear all tables ──────────────────────────────────────────────────
    await client.query(`
      TRUNCATE bast_periods, cm_requests, pm_requests, role_permissions, users, projects
      RESTART IDENTITY CASCADE
    `);
    console.log('✓ Tables truncated');

    // ── 2. Users ─────────────────────────────────────────────────────────────
    for (const u of authUsers) {
      await client.query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, $4)`,
        [
          u.username,
          u.email || `${u.username}@company.com`,
          u.password,  // already bcrypt-hashed in Supabase
          u.role || 'admin',
        ]
      );
    }
    console.log(`✓ Users inserted: ${authUsers.length}`);

    // ── 3. Projects ───────────────────────────────────────────────────────────
    const pidToId = {};
    for (const p of projects) {
      const { rows: pRows } = await client.query(
        `INSERT INTO projects
           (pid, company, name, status,
            contract_start, deadline, billing_freq,
            project_admin, project_manager, operation_manager,
            handover_status, issues)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          p.pid,
          p.company,
          p.name,
          p.status || 'On Track',
          orNull(p.contractStart),
          orNull(p.deadline),
          orNull(p.billingFreq),
          orNull(p.projectAdmin),
          orNull(p.projectManager),
          orNull(p.operationManager),
          p.handoverStatus || 'Not Started',
          p.issues || '',
        ]
      );
      pidToId[p.pid] = pRows[0].id;
    }
    console.log(`✓ Projects inserted: ${projects.length}`);

    // ── 4. BAST periods ───────────────────────────────────────────────────────
    let bastCount = 0;
    let customCount = 0;
    for (const p of projects) {
      const projectId = pidToId[p.pid];

      // Auto-generated periods stored in bastPeriods[]
      for (let i = 0; i < (p.bastPeriods || []).length; i++) {
        const bp = p.bastPeriods[i];
        await client.query(
          `INSERT INTO bast_periods
             (project_id, label, start_date, end_date, steps, submit_deadline, is_custom, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,false,$7)`,
          [
            projectId,
            bp.label,
            orNull(bp.start),
            orNull(bp.end),
            bp.steps || Array(8).fill(false),
            orNull(bp.submitDeadline),
            i,
          ]
        );
        bastCount++;
      }

      // Custom termins
      for (let i = 0; i < (p.customTermins || []).length; i++) {
        const ct = p.customTermins[i];
        await client.query(
          `INSERT INTO bast_periods
             (project_id, label, start_date, end_date, steps, submit_deadline, is_custom, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,true,$7)`,
          [
            projectId,
            ct.label,
            orNull(ct.startDate || ct.start),
            orNull(ct.endDate   || ct.end),
            ct.steps || Array(8).fill(false),
            orNull(ct.submitDeadline),
            i,
          ]
        );
        customCount++;
      }
    }
    console.log(`✓ BAST periods inserted: ${bastCount} auto + ${customCount} custom`);

    // ── 5. CM / PM requests ───────────────────────────────────────────────────
    let cmCount = 0;
    let pmCount = 0;
    for (const p of projects) {
      const projectId = pidToId[p.pid];

      for (const cm of (p.cmRequests || [])) {
        await client.query(
          `INSERT INTO cm_requests
             (project_id, title, start_date, start_time, end_date, end_time,
              status, resolved_date, pic_utama, pic_support, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            projectId,
            cm.title,
            orNull(cm.startDate || cm.requestDate),
            orNull(cm.startTime || cm.requestTime),
            orNull(cm.endDate),
            orNull(cm.endTime),
            cm.status || 'Open',
            orNull(cm.resolvedDate),
            orNull(cm.picUtama),
            orNull(cm.picSupport),
            orNull(cm.notes),
          ]
        );
        cmCount++;
      }

      for (const pm of (p.pmRequests || [])) {
        await client.query(
          `INSERT INTO pm_requests
             (project_id, title, start_date, start_time, end_date, end_time,
              status, resolved_date, pic_utama, pic_support, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            projectId,
            pm.title,
            orNull(pm.startDate || pm.requestDate),
            orNull(pm.startTime || pm.requestTime),
            orNull(pm.endDate),
            orNull(pm.endTime),
            pm.status || 'Open',
            orNull(pm.resolvedDate),
            orNull(pm.picUtama),
            orNull(pm.picSupport),
            orNull(pm.notes),
          ]
        );
        pmCount++;
      }
    }
    console.log(`✓ CM requests inserted: ${cmCount}`);
    console.log(`✓ PM requests inserted: ${pmCount}`);

    // ── 6. Role permissions ───────────────────────────────────────────────────
    for (const [role, perms] of Object.entries(rolePermissions)) {
      await client.query(
        `INSERT INTO role_permissions (role, permissions)
         VALUES ($1, $2)
         ON CONFLICT (role) DO UPDATE SET permissions=EXCLUDED.permissions, updated_at=NOW()`,
        [role, JSON.stringify(perms)]
      );
    }
    console.log(`✓ Role permissions upserted: ${Object.keys(rolePermissions).length} roles`);

    await client.query('COMMIT');
    console.log('\n✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed — rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
