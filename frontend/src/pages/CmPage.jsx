import EmptyState from '../components/ui/EmptyState';
import CmModal from '../components/modals/CmModal';
import { useMemo, useState } from 'react';
import { formatDate } from '../utils/dates';
import { createCm, updateCm, deleteCm } from '../api/cm';
import { useAuth } from '../context/AuthContext';
import { isRequestAssignedToUser } from '../utils/assignment';
import ScheduleLine from '../components/ui/ScheduleLine';

function statusStyle(status) {
  if (status === 'Open')        return { bg:'#fee2e2', color:'#dc2626' };
  if (status === 'In Progress') return { bg:'#fff7ed', color:'#c2410c' };
  return                               { bg:'#dcfce7', color:'#16a34a' };
}

function RequestCard({ r, canManage, onEdit, onDelete }) {
  const { bg, color } = statusStyle(r.status);

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderLeft:`4px solid ${color}`, borderRadius:'var(--radius-card)', padding:16,
      display:'flex', flexDirection:'column', gap:12,
      boxShadow:'var(--shadow-sm)',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
        <div>
          <span className="pid">{r.pid}</span>
          <span className="company" style={{ marginLeft:8 }}>{r.company}</span>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginTop:3 }}>{r.project_name}</div>
        </div>
        <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:12, fontSize:10, fontWeight:700, background:bg, color, whiteSpace:'nowrap', flexShrink:0 }}>
          {r.status}
        </span>
      </div>

      {/* Title */}
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{r.title || '—'}</div>
        {r.code && <div style={{ fontSize:10, color:'var(--text-subtle)', fontFamily:'monospace', marginTop:2 }}>{r.code}</div>}
      </div>

      {/* Schedule + PIC grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px' }}>
        <div>
          <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:3 }}>Schedule</div>
          <ScheduleLine date={r.start_date} time={r.start_time} />
          {(r.end_date || r.end_time) && <ScheduleLine date={r.end_date} time={r.end_time} label="→" />}
        </div>
        {r.resolved_date && (
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:3 }}>Resolved</div>
            <span style={{ fontSize:12 }}>{formatDate(r.resolved_date)}</span>
          </div>
        )}
        {r.pic_utama && (
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:3 }}>PIC Utama</div>
            <span style={{ fontSize:12, fontWeight:500 }}>{r.pic_utama}</span>
          </div>
        )}
        {r.pic_support && (
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:3 }}>PIC Support</div>
            <span style={{ fontSize:12 }}>{r.pic_support}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {r.notes && (
        <div style={{ fontSize:11, color:'var(--text-muted)', background:'var(--surface2)', borderRadius:8, padding:'8px 10px' }}>
          {r.notes}
        </div>
      )}

      {/* Actions */}
      {canManage && (
        <div style={{ display:'flex', gap:6, paddingTop:4, borderTop:'1px solid var(--border2)' }}>
          <button className="btn-sm btn-edit" onClick={() => onEdit(r)}>Edit</button>
          <button className="btn-sm btn-delete" onClick={() => onDelete(r.id)}>Delete</button>
        </div>
      )}
    </div>
  );
}

export default function CmPage({ requests, projects, users = [], onRefresh }) {
  const { user, can } = useAuth();
  const [modal, setModal] = useState({ open:false, cm:null });
  const [scope, setScope] = useState(user?.role === 'admin' ? 'all' : 'mine'); // 'mine' | 'all'

  const visibleRequests = useMemo(() => (
    scope === 'all' ? requests : requests.filter(r => isRequestAssignedToUser(r, user?.id))
  ), [requests, scope, user]);

  const handleSave = async (data) => {
    if (modal.cm) await updateCm(modal.cm.id, data);
    else          await createCm(data);
    await onRefresh();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this CM request?')) return;
    await deleteCm(id);
    await onRefresh();
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, gap:10 }}>
        <select
          value={scope}
          onChange={e => setScope(e.target.value)}
          style={{ fontSize:12, padding:'4px 8px' }}
        >
          <option value="mine">Assigned to Me</option>
          <option value="all">All Data</option>
        </select>
        {can('manage_cm') && (
          <button className="btn btn-primary" onClick={() => setModal({ open:true, cm:null })}>+ Add CM Request</button>
        )}
      </div>
      {!visibleRequests.length
        ? <EmptyState icon="🤝" message={scope === 'mine' ? 'No CM requests assigned to you.' : 'No CM requests yet.'} />
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {visibleRequests.map(cm => (
              <RequestCard
                key={cm.id}
                r={cm}
                canManage={can('manage_cm')}
                onEdit={r => setModal({ open:true, cm:r })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )
      }
      <CmModal open={modal.open} cm={modal.cm} projects={projects} users={users} onSave={handleSave} onClose={() => setModal({ open:false, cm:null })} />
    </div>
  );
}
