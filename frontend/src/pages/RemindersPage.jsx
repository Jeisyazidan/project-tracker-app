import { useMemo } from 'react';
import EmptyState from '../components/ui/EmptyState';
import { daysDiff } from '../utils/dates';
import { mergePeriods } from '../utils/bastPeriods';

const TAB_LABELS = { projects:'Project Overview', bast:'BAST Billing', cm:'CM Meetings', pm:'PM Meetings' };

function buildReminders(projects, cmRequests, pmRequests) {
  const over = [], soon = [], up = [];
  const push = (item) => {
    if (item.diff < 0) over.push(item);
    else if (item.diff <= 7) soon.push(item);
    else if (item.diff <= 30) up.push(item);
  };

  projects.forEach(p => {
    if (p.status === 'Completed' || p.status === 'Not Started') return;
    const diff = daysDiff(p.deadline);
    if (diff !== null) push({ pid:p.pid, projectId:p.id, tab:'projects', company:p.company, diff, label:`Contract End: ${p.name}`, date:p.deadline });

    const stored = p.bast_stored_periods || [];
    mergePeriods(p, stored).filter(per => !per.steps.every(Boolean) && per.submit_deadline).forEach(per => {
      const d = daysDiff(per.submit_deadline);
      if (d !== null) push({ pid:p.pid, projectId:p.id, tab:'bast', company:p.company, diff:d, label:`BAST Submit (${per.label}): ${p.name}`, date:per.submit_deadline });
    });
  });

  cmRequests.filter(c => c.status === 'Open' || c.status === 'In Progress').forEach(c => {
    const diff = daysDiff(c.start_date);
    if (diff !== null) push({ pid:c.pid, projectId:c.project_id, tab:'cm', company:c.company, diff, label:`CM (${c.status}): ${c.title || c.project_name}`, date:c.start_date });
  });

  pmRequests.filter(r => r.status === 'Open' || r.status === 'In Progress').forEach(r => {
    const diff = daysDiff(r.start_date);
    if (diff !== null) push({ pid:r.pid, projectId:r.project_id, tab:'pm', company:r.company, diff, label:`PM (${r.status}): ${r.title || r.project_name}`, date:r.start_date });
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

export default function RemindersPage({ projects, cmRequests, pmRequests, onNavigate }) {
  const { over, soon, up } = useMemo(
    () => buildReminders(projects, cmRequests, pmRequests),
    [projects, cmRequests, pmRequests]
  );

  if (!over.length && !soon.length && !up.length) {
    return <EmptyState icon="✅" message="No reminders in the next 30 days." />;
  }

  return (
    <div>
      <ReminderGroup title="🔴 Overdue / Missed"        items={over} cls="overdue"  dot="dot-red"    onGo={onNavigate} />
      <ReminderGroup title="🟡 Due Within 7 Days"       items={soon} cls="soon"     dot="dot-yellow" onGo={onNavigate} />
      <ReminderGroup title="🔵 Upcoming (8–30 Days)"    items={up}   cls="upcoming" dot="dot-blue"   onGo={onNavigate} />
    </div>
  );
}
