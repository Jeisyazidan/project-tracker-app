import { useState, useMemo } from 'react';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { STATUS_BADGE, HANDOVER_BADGE, ROLE_BADGE, ROLE_LABEL } from '../utils/badges';
import { formatDate, dateClass, workdaysUntil } from '../utils/dates';
import { mergePeriods, currentBastPeriod } from '../utils/bastPeriods';
import { useAuth } from '../context/AuthContext';

function UserCell({ username, userMap }) {
  if (!username) return <span style={{ color:'var(--text-light)' }}>—</span>;
  const user = userMap[username];
  if (!user) return <span style={{ fontSize:12, color:'var(--text-muted)', fontStyle:'italic' }}>{username}</span>;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      <span style={{ fontSize:12, fontWeight:500 }}>{username}</span>
      <Badge color={ROLE_BADGE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
    </div>
  );
}

function BastProgress({ project }) {
  const stored  = project.bast_stored_periods || [];
  const periods = mergePeriods(project, stored);
  const cur     = currentBastPeriod(periods);
  if (!cur) return <span style={{ fontSize:11, color:'var(--text-light)' }}>—</span>;
  const done = cur.steps.filter(Boolean).length;
  const pct  = Math.round((done / 8) * 100);
  const color = done === 8 ? '#16a34a' : done >= 5 ? '#7c3aed' : done > 0 ? '#f59e0b' : '#d1d5db';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:80 }}>
      <div style={{ flex:1, height:5, background:'#e5e7eb', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width .3s' }} />
      </div>
      <span style={{ fontSize:10, fontWeight:700, color, whiteSpace:'nowrap' }}>{done}/8</span>
    </div>
  );
}

function CurrentPeriodBadge({ project }) {
  const stored  = project.bast_stored_periods || [];
  const periods = mergePeriods(project, stored);
  const cur     = currentBastPeriod(periods);
  if (!cur) return <span style={{ color:'var(--text-light)', fontSize:11 }}>—</span>;
  const done = cur.steps.filter(Boolean).length;
  const cls  = done === 8 ? 'badge-green' : done > 0 ? 'badge-yellow' : 'badge-gray';
  return <span className={`badge ${cls}`}>{cur.label}</span>;
}

function ProjectMobileCard({ project: p, userMap, onEdit, onDelete, onShowCm, onShowPm, onShowIssues, can }) {
  const wd          = workdaysUntil(p.deadline);
  const issueLines  = (p.issues || '').trim().split('\n').filter(Boolean);
  const cmActive    = Number(p.cm_active) || 0;
  const cmTotal     = Number(p.cm_total)  || 0;
  const pmActive    = Number(p.pm_active) || 0;
  const pmTotal     = Number(p.pm_total)  || 0;

  return (
    <div className="mobile-project-card" id={`project-row-${p.id}`}>
      {/* Header row */}
      <div className="mpc-header">
        <div>
          <span className="pid">{p.pid}</span>
          <span className="company" style={{ marginLeft:8 }}>{p.company}</span>
        </div>
        <Badge color={STATUS_BADGE[p.status] || 'gray'}>{p.status}</Badge>
      </div>

      {/* Project name */}
      <div className="mpc-name">{p.name}</div>

      {/* People */}
      <div className="mpc-grid">
        {p.project_manager && (
          <div className="mpc-field">
            <span className="mpc-label">PM</span>
            <span className="mpc-value"><UserCell username={p.project_manager} userMap={userMap} /></span>
          </div>
        )}
        {p.operation_manager && (
          <div className="mpc-field">
            <span className="mpc-label">OM</span>
            <span className="mpc-value"><UserCell username={p.operation_manager} userMap={userMap} /></span>
          </div>
        )}
        {p.project_admin && (
          <div className="mpc-field">
            <span className="mpc-label">Admin</span>
            <span className="mpc-value"><UserCell username={p.project_admin} userMap={userMap} /></span>
          </div>
        )}
        <div className="mpc-field">
          <span className="mpc-label">Handover</span>
          <Badge color={HANDOVER_BADGE[p.handover_status] || 'gray'}>{p.handover_status || 'Not Started'}</Badge>
        </div>
      </div>

      {/* Dates + workdays */}
      <div className="mpc-grid">
        <div className="mpc-field">
          <span className="mpc-label">Contract</span>
          <span className="mpc-value">{formatDate(p.contract_start)} → <span className={dateClass(p.deadline)}>{formatDate(p.deadline)}</span></span>
        </div>
        <div className="mpc-field">
          <span className="mpc-label">Workdays left</span>
          {p.status === 'Completed'
            ? <Badge color="blue">Completed</Badge>
            : wd === null
              ? <span style={{ color:'#dc2626', fontWeight:700, fontSize:12 }}>Expired</span>
              : <span style={{ fontSize:12, fontWeight:700, color: wd <= 30 ? '#dc2626' : wd <= 90 ? '#d97706' : '#16a34a' }}>{wd} days</span>
          }
        </div>
      </div>

      {/* BAST + current period */}
      <div className="mpc-bast-row">
        <CurrentPeriodBadge project={p} />
        <BastProgress project={p} />
      </div>

      {/* Footer: CM / PM / Issues / Actions */}
      <div className="mpc-footer">
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span
            onClick={() => onShowCm(p)}
            title={cmTotal === 0 ? 'No CM' : `${cmTotal} CM${cmActive > 0 ? ` (${cmActive} active)` : ''}`}
            className={`circle-badge ${cmActive > 0 ? 'danger' : cmTotal > 0 ? 'success' : 'neutral'}`}
          >
            {cmActive > 0 ? cmActive : cmTotal > 0 ? '✓' : '—'}
          </span>
          <span style={{ fontSize:10, color:'var(--text-subtle)' }}>CM</span>

          <span
            onClick={() => onShowPm(p)}
            title={pmTotal === 0 ? 'No PM' : `${pmTotal} PM${pmActive > 0 ? ` (${pmActive} active)` : ''}`}
            className={`circle-badge ${pmActive > 0 ? 'warn' : pmTotal > 0 ? 'success' : 'neutral'}`}
          >
            {pmActive > 0 ? pmActive : pmTotal > 0 ? '✓' : '—'}
          </span>
          <span style={{ fontSize:10, color:'var(--text-subtle)' }}>PM</span>

          {issueLines.length > 0
            ? <span className="issue-count has" onClick={() => onShowIssues(p)}>{issueLines.length}</span>
            : <span className="issue-count none">0</span>
          }
          <span style={{ fontSize:10, color:'var(--text-subtle)' }}>Issues</span>
        </div>

        <div style={{ display:'flex', gap:6 }}>
          {can('edit_project') && (
            <button className="btn-sm btn-edit" onClick={() => onEdit(p)}>Edit</button>
          )}
          {can('delete_project') && (
            <button className="btn-sm btn-delete" onClick={() => onDelete(p.id)}>Del</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage({
  projects, users = [], onEdit, onDelete, onShowCm, onShowPm, onShowIssues, onShowStat,
}) {
  const { can } = useAuth();
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.username, u])), [users]);

  if (!projects.length) return <EmptyState icon="📭" message="No projects found." />;

  return (
    <>
      {/* ── Desktop table ── */}
      <div className="table-wrap desktop-only">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>PID / Company</th>
              <th>Project Description</th>
              <th>Overall Status</th>
              <th>Project Admin</th>
              <th>Project Manager</th>
              <th>Operation Manager</th>
              <th>Contract Start</th>
              <th>Contract End</th>
              <th>Workdays Left</th>
              <th>Handover</th>
              <th>Current BAST Period</th>
              <th>BAST Progress</th>
              <th>CM</th>
              <th>PM</th>
              <th>Issues</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => {
              const wd = workdaysUntil(p.deadline);
              const issueLines = (p.issues || '').trim().split('\n').filter(Boolean);
              const cmActive = Number(p.cm_active) || 0;
              const cmTotal  = Number(p.cm_total)  || 0;
              const pmActive = Number(p.pm_active) || 0;
              const pmTotal  = Number(p.pm_total)  || 0;

              return (
                <tr key={p.id} id={`project-row-${p.id}`}>
                  <td style={{ fontSize:11, color:'var(--text-subtle)', textAlign:'center' }}>{i + 1}</td>
                  <td>
                    <div className="pid">{p.pid}</div>
                    <div className="company">{p.company}</div>
                  </td>
                  <td><div className="projname">{p.name}</div></td>
                  <td><Badge color={STATUS_BADGE[p.status] || 'gray'}>{p.status}</Badge></td>
                  <td><UserCell username={p.project_admin} userMap={userMap} /></td>
                  <td><UserCell username={p.project_manager} userMap={userMap} /></td>
                  <td><UserCell username={p.operation_manager} userMap={userMap} /></td>
                  <td><span className="date-cell">{formatDate(p.contract_start)}</span></td>
                  <td><span className={`date-cell ${dateClass(p.deadline)}`}>{formatDate(p.deadline)}</span></td>
                  <td>
                    {p.status === 'Completed'
                      ? <Badge color="blue">Completed</Badge>
                      : wd === null
                        ? <span style={{ color:'#dc2626', fontWeight:700, fontSize:12 }}>Expired</span>
                        : <span style={{ fontSize:12, fontWeight:700, color: wd <= 30 ? '#dc2626' : wd <= 90 ? '#d97706' : '#16a34a' }}>{wd} days</span>
                    }
                  </td>
                  <td><Badge color={HANDOVER_BADGE[p.handover_status] || 'gray'}>{p.handover_status || 'Not Started'}</Badge></td>
                  <td><CurrentPeriodBadge project={p} /></td>
                  <td><BastProgress project={p} /></td>
                  <td>
                    <span
                      onClick={() => onShowCm(p)}
                      title={cmTotal === 0 ? 'No CM requests' : `${cmTotal} CM request(s)${cmActive > 0 ? ` — ${cmActive} active` : ''}`}
                      className={`circle-badge ${cmActive > 0 ? 'danger' : cmTotal > 0 ? 'success' : 'neutral'}`}
                    >
                      {cmActive > 0 ? cmActive : cmTotal > 0 ? '✓' : '—'}
                    </span>
                  </td>
                  <td>
                    <span
                      onClick={() => onShowPm(p)}
                      title={pmTotal === 0 ? 'No PM requests' : `${pmTotal} PM request(s)${pmActive > 0 ? ` — ${pmActive} active` : ''}`}
                      className={`circle-badge ${pmActive > 0 ? 'warn' : pmTotal > 0 ? 'success' : 'neutral'}`}
                    >
                      {pmActive > 0 ? pmActive : pmTotal > 0 ? '✓' : '—'}
                    </span>
                  </td>
                  <td>
                    {issueLines.length > 0
                      ? <span className="issue-count has" onClick={() => onShowIssues(p)} title="View issues">{issueLines.length}</span>
                      : <span className="issue-count none">0</span>
                    }
                  </td>
                  <td style={{ whiteSpace:'nowrap' }}>
                    {can('edit_project') && (
                      <button className="btn-sm btn-edit" onClick={() => onEdit(p)}>Edit</button>
                    )}
                    {can('delete_project') && (
                      <button className="btn-sm btn-delete" style={{ marginLeft:4 }} onClick={() => onDelete(p.id)}>Del</button>
                    )}
                    {!can('edit_project') && !can('delete_project') && (
                      <span style={{ color:'var(--text-light)', fontSize:11 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="mobile-only">
        {projects.map((p) => (
          <ProjectMobileCard
            key={p.id}
            project={p}
            userMap={userMap}
            onEdit={onEdit}
            onDelete={onDelete}
            onShowCm={onShowCm}
            onShowPm={onShowPm}
            onShowIssues={onShowIssues}
            can={can}
          />
        ))}
      </div>
    </>
  );
}
