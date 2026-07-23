import { useMemo, useState, useEffect, useCallback } from 'react';
import EmptyState from '../components/ui/EmptyState';
import { daysDiff } from '../utils/dates';
import { mergePeriods } from '../utils/bastPeriods';
import { getReminderLogs, triggerReminders } from '../api/reminders';
import { useAuth } from '../context/AuthContext';

// user ids who would plausibly care about this reminder — a project's
// admin/manager/OM for contract & BAST reminders, a request's PICs for
// CM/PM reminders — used to power the "Assigned to Me" filter.
function assignedIdsFor(source) {
  if (source.pic_utama_users || source.pic_support_users) {
    return [...(source.pic_utama_users || []), ...(source.pic_support_users || [])].map(u => u.id);
  }
  return [source.project_admin_id, source.project_manager_id, source.operation_manager_id].filter(Boolean);
}

const TAB_LABELS = { projects:'Project Overview', bast:'BAST Billing', cm:'CM Meetings', pm:'PM Meetings' };

const TYPE_LABELS = {
  contract_end: 'Contract End',
  bast_submit:  'BAST Submit',
  cm_activity:  'CM Activity',
  pm_activity:  'PM Activity',
};

const TYPE_COLORS = {
  contract_end: { bg:'#fef3c7', color:'#92400e' },
  bast_submit:  { bg:'#fee2e2', color:'#991b1b' },
  cm_activity:  { bg:'#dbeafe', color:'#1e40af' },
  pm_activity:  { bg:'#dcfce7', color:'#166534' },
};

function formatRefId(type, ref) {
  if (type === 'contract_end') {
    const bucketMap = { '60d': '60-day warning', '30d': '30-day warning', '7d': '7-day warning', 'contract': '60-day warning' };
    return bucketMap[ref.replace('contract:', '')] || ref;
  }
  if (type === 'bast_submit') {
    const [label, urgency] = ref.split(':');
    const urgencyMap = { '30d':'30d warning', '7d':'7d warning', overdue:'overdue' };
    return `${label} — ${urgencyMap[urgency] || urgency}`;
  }
  if (type === 'cm_activity') return `request #${ref}`;
  if (type === 'pm_activity') return `request #${ref}`;
  return ref;
}

function buildReminders(projects, cmRequests, pmRequests) {
  const over = [], soon = [], up = [];
  const push = (item) => {
    if (item.diff < 0) over.push(item);
    else if (item.diff <= 7) soon.push(item);
    else if (item.diff <= 30) up.push(item);
  };

  projects.forEach(p => {
    if (p.status === 'Completed' || p.status === 'Not Started') return;
    const assignedIds = assignedIdsFor(p);
    const diff = daysDiff(p.deadline);
    if (diff !== null) push({ pid:p.pid, projectId:p.id, tab:'projects', company:p.company, diff, label:`Contract End: ${p.name}`, date:p.deadline, assignedIds });

    const stored = p.bast_stored_periods || [];
    mergePeriods(p, stored).filter(per => !per.steps.every(Boolean) && per.submit_deadline).forEach(per => {
      const d = daysDiff(per.submit_deadline);
      if (d !== null) push({ pid:p.pid, projectId:p.id, tab:'bast', company:p.company, diff:d, label:`BAST Submit (${per.label}): ${p.name}`, date:per.submit_deadline, assignedIds });
    });
  });

  cmRequests.filter(c => c.status === 'Open' || c.status === 'In Progress').forEach(c => {
    const diff = daysDiff(c.start_date);
    if (diff !== null) push({ pid:c.pid, projectId:c.project_id, tab:'cm', company:c.company, diff, label:`CM (${c.status}): ${c.title || c.project_name}`, date:c.start_date, assignedIds:assignedIdsFor(c) });
  });

  pmRequests.filter(r => r.status === 'Open' || r.status === 'In Progress').forEach(r => {
    const diff = daysDiff(r.start_date);
    if (diff !== null) push({ pid:r.pid, projectId:r.project_id, tab:'pm', company:r.company, diff, label:`PM (${r.status}): ${r.title || r.project_name}`, date:r.start_date, assignedIds:assignedIdsFor(r) });
  });

  return { over, soon, up };
}

function ReminderGroup({ title, items, cls, dot, onGo }) {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => a.diff - b.diff);
  return (
    <div className="reminder-section">
      <h3>{title} ({items.length})</h3>
      {sorted.map((item, i) => (
        <div key={i} className={`reminder-row ${cls}`} onClick={() => onGo(item)}>
          <div className={`reminder-dot ${dot}`} />
          <div style={{ flex:1 }}>
            <div className="reminder-text">
              {item.label} <span style={{ fontSize:10, color:'var(--text-subtle)' }}>[{item.pid}]</span>
            </div>
            <div style={{ fontSize:11, color:'var(--text-subtle)' }}>
              {item.company} &nbsp;·&nbsp; <span style={{ fontSize:10, color:'var(--accent)' }}>→ {TAB_LABELS[item.tab] || item.tab}</span>
            </div>
          </div>
          <div className="reminder-date">
            {item.diff < 0 ? `${Math.abs(item.diff)}d overdue` : item.diff === 0 ? 'Today' : `${item.diff}d left`}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReminderLogSection({ isAdmin }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [open, setOpen]       = useState(false);
  const [toast, setToast]     = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try { setLogs(await getReminderLogs()); } catch { setLogs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleRun = async () => {
    setRunning(true);
    try {
      await triggerReminders();
      setToast('Reminder checks triggered — emails will be sent shortly.');
      setTimeout(() => fetchLogs(), 2500);
    } catch {
      setToast('Failed to trigger reminders.');
    } finally {
      setRunning(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  return (
    <div className="reminder-section" style={{ marginTop:24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:open ? 12 : 0 }}>
        <h3 style={{ margin:0, flex:1, cursor:'pointer', userSelect:'none' }} onClick={() => setOpen(o => !o)}>
          📧 Email Log ({logs.length}) {open ? '▲' : '▼'}
        </h3>
        {isAdmin && (
          <button
            className="btn btn-secondary"
            style={{ fontSize:12, padding:'4px 10px' }}
            onClick={handleRun}
            disabled={running}
          >
            {running ? 'Running…' : 'Run now'}
          </button>
        )}
        <button
          className="btn btn-secondary"
          style={{ fontSize:12, padding:'4px 10px' }}
          onClick={fetchLogs}
          disabled={loading}
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {toast && (
        <div style={{ fontSize:12, color:'#16a34a', marginBottom:8, padding:'6px 10px', background:'#dcfce7', borderRadius:6 }}>
          {toast}
        </div>
      )}

      {open && (
        loading ? (
          <div style={{ fontSize:13, color:'var(--text-muted)', padding:'12px 0' }}>Loading…</div>
        ) : !logs.length ? (
          <div style={{ fontSize:13, color:'var(--text-muted)', padding:'12px 0' }}>No emails sent yet.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {logs.map(log => {
              const tc = TYPE_COLORS[log.reminder_type] || { bg:'#f3f4f6', color:'#374151' };
              return (
                <div key={log.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', fontSize:12 }}>
                  <span style={{ padding:'2px 8px', borderRadius:10, fontWeight:700, fontSize:10, whiteSpace:'nowrap', background:tc.bg, color:tc.color }}>
                    {TYPE_LABELS[log.reminder_type] || log.reminder_type}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {log.project_name} <span style={{ fontWeight:400, color:'var(--text-subtle)' }}>[{log.pid}]</span>
                    </div>
                    <div style={{ color:'var(--text-muted)', fontSize:11 }}>
                      {formatRefId(log.reminder_type, log.reference_id)}
                    </div>
                    <div style={{ color:'var(--text-subtle)', fontSize:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={(log.recipients || []).join(', ')}>
                      To: {(log.recipients || []).length ? log.recipients.join(', ') : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', whiteSpace:'nowrap', color:'var(--text-muted)' }}>
                    <div>×{log.send_count}</div>
                    <div style={{ fontSize:10 }}>
                      {log.last_sent_at ? new Date(log.last_sent_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

export default function RemindersPage({ projects, cmRequests, pmRequests, onNavigate }) {
  const { user } = useAuth();
  const [scope, setScope] = useState(user?.role === 'admin' ? 'all' : 'mine'); // 'mine' | 'all'

  const { over, soon, up } = useMemo(() => {
    const built = buildReminders(projects, cmRequests, pmRequests);
    if (scope === 'all' || !user) return built;
    const mine = arr => arr.filter(i => i.assignedIds.includes(user.id));
    return { over: mine(built.over), soon: mine(built.soon), up: mine(built.up) };
  }, [projects, cmRequests, pmRequests, scope, user]);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <select
          value={scope}
          onChange={e => setScope(e.target.value)}
          style={{ fontSize:12, padding:'4px 8px' }}
        >
          <option value="mine">Assigned to Me</option>
          <option value="all">All Data</option>
        </select>
      </div>
      {!over.length && !soon.length && !up.length ? (
        <EmptyState icon="✅" message={scope === 'mine' ? 'No reminders assigned to you in the next 30 days.' : 'No reminders in the next 30 days.'} />
      ) : (
        <>
          <ReminderGroup title="🔴 Overdue / Missed"        items={over} cls="overdue"  dot="dot-red"    onGo={onNavigate} />
          <ReminderGroup title="🟡 Due Within 7 Days"       items={soon} cls="soon"     dot="dot-yellow" onGo={onNavigate} />
          <ReminderGroup title="🔵 Upcoming (8–30 Days)"    items={up}   cls="upcoming" dot="dot-blue"   onGo={onNavigate} />
        </>
      )}
      <ReminderLogSection isAdmin={user?.role === 'admin'} />
    </div>
  );
}
