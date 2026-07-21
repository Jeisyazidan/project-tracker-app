import { useState, useEffect, useCallback, useMemo } from 'react';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import MonthCalendar from '../components/dashboard/MonthCalendar';
import { getMyDashboard, getAllDashboard } from '../api/dashboard';
import { formatDate } from '../utils/dates';
import { ROLE_LABEL } from '../utils/badges';
import { useAuth } from '../context/AuthContext';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TYPE_META = {
  cm:       { type:'cm',       icon:'🤝', typeLabel:'CM',       color:{ bg:'#dbeafe', color:'#1e40af' } },
  pm:       { type:'pm',       icon:'🔧', typeLabel:'PM',       color:{ bg:'#dcfce7', color:'#166534' } },
  bast:     { type:'bast',     icon:'📄', typeLabel:'BAST',     color:{ bg:'#fee2e2', color:'#991b1b' } },
  contract: { type:'contract', icon:'📅', typeLabel:'Contract', color:{ bg:'#fef3c7', color:'#92400e' } },
};

function pushItem(itemsByDate, iso, meta, label, detail) {
  if (!iso) return;
  (itemsByDate[iso] ||= []).push({ ...meta, label, detail });
}

// Personal ("My Dashboard") calendar — data.cm/pm items carry a
// roles:('utama'|'support')[] array (the logged-in user can now be both
// PIC Utama and PIC Support on the same activity).
function rolesLabel(roles) {
  return (roles || []).map(r => r === 'utama' ? 'Utama' : 'Support').join(' & ') || 'PIC';
}

function buildCalendarItems(data) {
  const itemsByDate = {};
  if (!data) return itemsByDate;

  (data.cm || []).forEach(c => pushItem(itemsByDate, c.start_date, TYPE_META.cm,
    c.title || c.project_name,
    `${c.pid} — ${c.project_name}${c.start_time ? ' · ' + c.start_time : ''} · ${c.status} · PIC ${rolesLabel(c.roles)}`));

  (data.pm || []).forEach(r => pushItem(itemsByDate, r.start_date, TYPE_META.pm,
    r.title || r.project_name,
    `${r.pid} — ${r.project_name}${r.start_time ? ' · ' + r.start_time : ''} · ${r.status} · PIC ${rolesLabel(r.roles)}`));

  (data.bastDeadlines || []).forEach(b => pushItem(itemsByDate, b.submitDeadline, TYPE_META.bast,
    `${b.label} — ${b.projectName}`,
    `${b.pid} — ${b.projectName} · ${b.stepsDone}/${b.totalSteps} steps done`));

  (data.contractDeadlines || []).forEach(p => pushItem(itemsByDate, p.deadline, TYPE_META.contract,
    `Contract End — ${p.project_name}`,
    `${p.pid} — ${p.project_name}`));

  return itemsByDate;
}

function assigneeSummary(assignees) {
  if (!assignees || !assignees.length) return 'Unassigned';
  return assignees.map(a => `${a.relation}: ${a.username}`).join(', ');
}

// Only admins can reach the "All Users" view, so every item here carries an
// `assignees` array — narrow it to whichever users match the typed name and
// drop items nobody matching is on, so the calendar shows just that
// person's activity (and which customer/project it's for).
function filterDataByAssignee(data, query) {
  const q = query.trim().toLowerCase();
  if (!data || !q) return data;
  const matches = a => (a.username || '').toLowerCase().includes(q);
  const filterItems = items => (items || [])
    .map(item => ({ ...item, assignees: (item.assignees || []).filter(matches) }))
    .filter(item => item.assignees.length > 0);
  return {
    ...data,
    cm: filterItems(data.cm),
    pm: filterItems(data.pm),
    bastDeadlines: filterItems(data.bastDeadlines),
    contractDeadlines: filterItems(data.contractDeadlines),
  };
}

// Admin "All Users" calendar — every item may have several assignees, so
// the summary is appended to the detail line instead of a single PIC label.
// The customer/company name is included here (but not in the personal
// "My Dashboard" view) since seeing who's assigned where across customers
// is the point of this view.
function buildAllCalendarItems(data) {
  const itemsByDate = {};
  if (!data) return itemsByDate;

  (data.cm || []).forEach(c => pushItem(itemsByDate, c.start_date, TYPE_META.cm,
    c.title || c.project_name,
    `${c.pid} — ${c.company} — ${c.project_name}${c.start_time ? ' · ' + c.start_time : ''} · ${c.status} · ${assigneeSummary(c.assignees)}`));

  (data.pm || []).forEach(r => pushItem(itemsByDate, r.start_date, TYPE_META.pm,
    r.title || r.project_name,
    `${r.pid} — ${r.company} — ${r.project_name}${r.start_time ? ' · ' + r.start_time : ''} · ${r.status} · ${assigneeSummary(r.assignees)}`));

  (data.bastDeadlines || []).forEach(b => pushItem(itemsByDate, b.submitDeadline, TYPE_META.bast,
    `${b.label} — ${b.projectName}`,
    `${b.pid} — ${b.company} — ${b.projectName} · ${b.stepsDone}/${b.totalSteps} steps · ${assigneeSummary(b.assignees)}`));

  (data.contractDeadlines || []).forEach(p => pushItem(itemsByDate, p.deadline, TYPE_META.contract,
    `Contract End — ${p.project_name}`,
    `${p.pid} — ${p.company} — ${p.project_name} · ${assigneeSummary(p.assignees)}`));

  return itemsByDate;
}

// Admin "All Users" calendar, sorted by name or role — splits each item
// into one pill per assignee (an item can belong to more than one person)
// and orders the pills within each day by that assignee's name/role,
// instead of switching away from the calendar grid.
function buildAllCalendarItemsSorted(data, sortBy) {
  const itemsByDate = {};
  if (!data) return itemsByDate;

  const rows = [];
  const addRows = (items, meta, labelFn, detailFn, dateFn) => {
    items.forEach(item => {
      (item.assignees || []).forEach(a => {
        rows.push({
          date: dateFn(item),
          meta,
          label: `${labelFn(item)} — ${a.username}`,
          detail: `${detailFn(item)} · ${a.relation}`,
          assignee: a,
        });
      });
    });
  };

  addRows(data.cm || [], TYPE_META.cm,
    c => c.title || c.project_name,
    c => `${c.pid} — ${c.company} — ${c.project_name}${c.start_time ? ' · ' + c.start_time : ''} · ${c.status}`,
    c => c.start_date);
  addRows(data.pm || [], TYPE_META.pm,
    r => r.title || r.project_name,
    r => `${r.pid} — ${r.company} — ${r.project_name}${r.start_time ? ' · ' + r.start_time : ''} · ${r.status}`,
    r => r.start_date);
  addRows(data.bastDeadlines || [], TYPE_META.bast,
    b => `${b.label} — ${b.projectName}`,
    b => `${b.pid} — ${b.company} — ${b.projectName} · ${b.stepsDone}/${b.totalSteps} steps`,
    b => b.submitDeadline);
  addRows(data.contractDeadlines || [], TYPE_META.contract,
    p => `Contract End — ${p.project_name}`,
    p => `${p.pid} — ${p.company} — ${p.project_name}`,
    p => p.deadline);

  const sortKey = row => sortBy === 'role'
    ? `${ROLE_LABEL[row.assignee.role] || row.assignee.role || ''} ${row.assignee.username || ''}`
    : (row.assignee.username || '');
  rows.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  rows.forEach(row => pushItem(itemsByDate, row.date, row.meta, row.label, row.detail));
  return itemsByDate;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });
  const [viewMode, setViewMode]   = useState('me'); // 'me' | 'all' (admin only)
  const [sortBy, setSortBy]       = useState('date'); // 'date' | 'name' | 'role' (viewMode 'all' only)
  const [nameFilter, setNameFilter] = useState(''); // (viewMode 'all' only)
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [dayModal, setDayModal] = useState({ open:false, iso:'', items:[] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fetcher = (isAdmin && viewMode === 'all') ? getAllDashboard : getMyDashboard;
      setData(await fetcher(cursor.month, cursor.year));
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [cursor, viewMode, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showingAll = isAdmin && viewMode === 'all';

  // Sort-by-name/role and the name filter only apply to the "All Users"
  // view — snap back to the defaults when leaving it.
  useEffect(() => { if (!showingAll) { setSortBy('date'); setNameFilter(''); } }, [showingAll]);

  const filteredData = useMemo(() => (
    showingAll ? filterDataByAssignee(data, nameFilter) : data
  ), [data, showingAll, nameFilter]);

  const itemsByDate = useMemo(() => {
    if (!showingAll) return buildCalendarItems(filteredData);
    return sortBy === 'date' ? buildAllCalendarItems(filteredData) : buildAllCalendarItemsSorted(filteredData, sortBy);
  }, [filteredData, showingAll, sortBy]);

  const totalItems = useMemo(() => (
    filteredData ? filteredData.cm.length + filteredData.pm.length + filteredData.bastDeadlines.length + filteredData.contractDeadlines.length : 0
  ), [filteredData]);

  const goPrev  = () => setCursor(c => c.month === 1  ? { month:12, year:c.year - 1 } : { month:c.month - 1, year:c.year });
  const goNext  = () => setCursor(c => c.month === 12 ? { month:1,  year:c.year + 1 } : { month:c.month + 1, year:c.year });
  const goToday = () => { const d = new Date(); setCursor({ month:d.getMonth() + 1, year:d.getFullYear() }); };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <button className="btn btn-secondary" style={{ fontSize:12, padding:'4px 10px' }} onClick={goPrev}>◀</button>
        <div style={{ fontSize:15, fontWeight:700, minWidth:160, textAlign:'center' }}>
          {MONTH_NAMES[cursor.month - 1]} {cursor.year}
        </div>
        <button className="btn btn-secondary" style={{ fontSize:12, padding:'4px 10px' }} onClick={goNext}>▶</button>
        <button className="btn btn-secondary" style={{ fontSize:12, padding:'4px 10px' }} onClick={goToday}>Today</button>

        {isAdmin && (
          <select
            value={viewMode}
            onChange={e => setViewMode(e.target.value)}
            style={{ fontSize:12, padding:'4px 8px' }}
          >
            <option value="me">My Schedule</option>
            <option value="all">All Users</option>
          </select>
        )}
        {showingAll && (
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ fontSize:12, padding:'4px 8px' }}
          >
            <option value="date">Sort: Date</option>
            <option value="name">Sort: Name</option>
            <option value="role">Sort: Role</option>
          </select>
        )}
        {showingAll && (
          <input
            type="text"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            placeholder="Filter by name…"
            style={{ fontSize:12, padding:'4px 8px', width:150, border:'1px solid var(--input-border)', borderRadius:6, background:'var(--input-bg)', color:'var(--text)', fontFamily:'inherit' }}
          />
        )}

        <div style={{ flex:1 }} />
        {!loading && data && (
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>{totalItems} item{totalItems === 1 ? '' : 's'} this month</div>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize:13, color:'var(--text-muted)', padding:'24px 0', textAlign:'center' }}>Loading…</div>
      ) : !data ? (
        <EmptyState icon="⚠️" message="Couldn't load the dashboard." />
      ) : (
        <>
          <MonthCalendar
            year={cursor.year} month={cursor.month} itemsByDate={itemsByDate}
            onDayClick={(iso, items) => setDayModal({ open:true, iso, items })}
          />
          {totalItems === 0 && (
            <EmptyState icon="✅" message={
              !showingAll ? 'Nothing assigned to you this month.'
                : nameFilter.trim() ? `No matches for "${nameFilter.trim()}" this month.`
                : 'Nothing assigned to anyone this month.'
            } />
          )}
        </>
      )}

      <Modal open={dayModal.open} onClose={() => setDayModal({ open:false, iso:'', items:[] })} title={dayModal.iso ? formatDate(dayModal.iso) : ''}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {dayModal.items.map((it, i) => (
            <div key={i} style={{ background:'var(--surface2)', borderRadius:8, padding:'10px 12px', border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700, background:it.color.bg, color:it.color.color }}>
                  {it.icon} {it.typeLabel}
                </span>
              </div>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{it.label}</div>
              {it.detail && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{it.detail}</div>}
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={() => setDayModal({ open:false, iso:'', items:[] })}>Close</button>
        </div>
      </Modal>
    </div>
  );
}
