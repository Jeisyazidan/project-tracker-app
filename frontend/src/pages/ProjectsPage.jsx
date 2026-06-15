import { useState } from 'react';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { STATUS_BADGE, HANDOVER_BADGE } from '../utils/badges';
import { formatDate, dateClass, workdaysUntil } from '../utils/dates';
import { mergePeriods, currentBastPeriod } from '../utils/bastPeriods';
import { useAuth } from '../context/AuthContext';

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

export default function ProjectsPage({
  projects, onEdit, onDelete, onShowCm, onShowPm, onShowIssues, onShowStat,
}) {
  const { can } = useAuth();

  if (!projects.length) return <EmptyState icon="📭" message="No projects found." />;

  return (
    <div className="table-wrap">
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
                <td><span style={{ fontSize:12, color:'var(--text)', fontWeight:500 }}>{p.project_admin || <span style={{ color:'var(--text-light)' }}>—</span>}</span></td>
                <td><span style={{ fontSize:12, color:'var(--text)', fontWeight:500 }}>{p.project_manager || <span style={{ color:'var(--text-light)' }}>—</span>}</span></td>
                <td><span style={{ fontSize:12, color:'var(--text)', fontWeight:500 }}>{p.operation_manager || <span style={{ color:'var(--text-light)' }}>—</span>}</span></td>
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
                    style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:11, fontWeight:700, background: cmActive > 0 ? '#fee2e2' : cmTotal > 0 ? '#dcfce7' : '#f3f4f6', color: cmActive > 0 ? '#dc2626' : cmTotal > 0 ? '#16a34a' : '#9ca3af' }}
                  >
                    {cmActive > 0 ? cmActive : cmTotal > 0 ? '✓' : '—'}
                  </span>
                </td>
                <td>
                  <span
                    onClick={() => onShowPm(p)}
                    title={pmTotal === 0 ? 'No PM requests' : `${pmTotal} PM request(s)${pmActive > 0 ? ` — ${pmActive} active` : ''}`}
                    style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:11, fontWeight:700, background: pmActive > 0 ? '#fff7ed' : pmTotal > 0 ? '#dcfce7' : '#f3f4f6', color: pmActive > 0 ? '#c2410c' : pmTotal > 0 ? '#16a34a' : '#9ca3af' }}
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
  );
}
