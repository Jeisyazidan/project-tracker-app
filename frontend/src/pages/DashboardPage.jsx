import { useState, useEffect, useCallback, useMemo } from 'react';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import MonthCalendar from '../components/dashboard/MonthCalendar';
import { getMyDashboard } from '../api/dashboard';
import { formatDate } from '../utils/dates';

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

function buildCalendarItems(data) {
  const itemsByDate = {};
  if (!data) return itemsByDate;

  (data.cm || []).forEach(c => pushItem(itemsByDate, c.start_date, TYPE_META.cm,
    c.title || c.project_name,
    `${c.pid} — ${c.project_name}${c.start_time ? ' · ' + c.start_time : ''} · ${c.status} · PIC ${c.role === 'utama' ? 'Utama' : 'Support'}`));

  (data.pm || []).forEach(r => pushItem(itemsByDate, r.start_date, TYPE_META.pm,
    r.title || r.project_name,
    `${r.pid} — ${r.project_name}${r.start_time ? ' · ' + r.start_time : ''} · ${r.status} · PIC ${r.role === 'utama' ? 'Utama' : 'Support'}`));

  (data.bastDeadlines || []).forEach(b => pushItem(itemsByDate, b.submitDeadline, TYPE_META.bast,
    `${b.label} — ${b.projectName}`,
    `${b.pid} — ${b.projectName} · ${b.stepsDone}/${b.totalSteps} steps done`));

  (data.contractDeadlines || []).forEach(p => pushItem(itemsByDate, p.deadline, TYPE_META.contract,
    `Contract End — ${p.project_name}`,
    `${p.pid} — ${p.project_name}`));

  return itemsByDate;
}

export default function DashboardPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [dayModal, setDayModal] = useState({ open:false, iso:'', items:[] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await getMyDashboard(cursor.month, cursor.year)); }
    catch { setData(null); }
    finally { setLoading(false); }
  }, [cursor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const itemsByDate = useMemo(() => buildCalendarItems(data), [data]);
  const totalItems = useMemo(() => (
    data ? data.cm.length + data.pm.length + data.bastDeadlines.length + data.contractDeadlines.length : 0
  ), [data]);

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
        <div style={{ flex:1 }} />
        {!loading && data && (
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>{totalItems} item{totalItems === 1 ? '' : 's'} this month</div>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize:13, color:'var(--text-muted)', padding:'24px 0', textAlign:'center' }}>Loading…</div>
      ) : !data ? (
        <EmptyState icon="⚠️" message="Couldn't load your dashboard." />
      ) : (
        <>
          <MonthCalendar
            year={cursor.year} month={cursor.month} itemsByDate={itemsByDate}
            onDayClick={(iso, items) => setDayModal({ open:true, iso, items })}
          />
          {totalItems === 0 && <EmptyState icon="✅" message="Nothing assigned to you this month." />}
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
