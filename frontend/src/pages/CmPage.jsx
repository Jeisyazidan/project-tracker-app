import EmptyState from '../components/ui/EmptyState';
import CmModal from '../components/modals/CmModal';
import { useState } from 'react';
import { formatDate } from '../utils/dates';
import { createCm, updateCm, deleteCm } from '../api/cm';
import { useAuth } from '../context/AuthContext';

export default function CmPage({ requests, projects, onRefresh }) {
  const { can } = useAuth();
  const [modal, setModal] = useState({ open:false, cm:null });

  const handleSave = async (data) => {
    if (modal.cm) await updateCm(modal.cm.id, data);
    else           await createCm(data);
    await onRefresh();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this CM request?')) return;
    await deleteCm(id);
    await onRefresh();
  };

  return (
    <div>
      {can('manage_cm') && (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
          <button className="btn btn-primary" onClick={() => setModal({ open:true, cm:null })}>+ Add CM Request</button>
        </div>
      )}
      {!requests.length
        ? <EmptyState icon="🤝" message="No CM requests yet." />
        : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>PID / Company</th><th>Project</th><th>Status</th><th>Schedule</th>
                <th>Description</th><th>PIC Utama</th><th>PIC Support</th>
                <th>Resolved Date</th><th>Notes</th>
                {can('manage_cm') && <th>Actions</th>}
              </tr></thead>
              <tbody>
                {requests.map(cm => {
                  const statusBg = cm.status==='Open'?'#fee2e2':cm.status==='In Progress'?'#fff7ed':'#dcfce7';
                  const statusCol= cm.status==='Open'?'#dc2626':cm.status==='In Progress'?'#c2410c':'#16a34a';
                  return (
                    <tr key={cm.id}>
                      <td><div className="pid">{cm.pid}</div><div className="company">{cm.company}</div></td>
                      <td><div className="projname">{cm.project_name}</div></td>
                      <td><span style={{ display:'inline-block', padding:'3px 8px', borderRadius:12, fontSize:10, fontWeight:700, background:statusBg, color:statusCol }}>{cm.status}</span></td>
                      <td>
                        <span className="date-cell">
                          {formatDate(cm.start_date)}{cm.start_time ? ` 🕐 ${cm.start_time}` : ''}
                          {(cm.end_date || cm.end_time) && <><br /><span style={{ fontSize:10, color:'var(--text-subtle)' }}>→ {formatDate(cm.end_date)}{cm.end_time ? ` 🕐 ${cm.end_time}` : ''}</span></>}
                        </span>
                      </td>
                      <td style={{ maxWidth:240, fontSize:12, fontWeight:600 }}>{cm.title || '—'}</td>
                      <td style={{ fontSize:12, fontWeight:500 }}>{cm.pic_utama || <span style={{ color:'var(--text-light)' }}>—</span>}</td>
                      <td style={{ fontSize:12 }}>{cm.pic_support || <span style={{ color:'var(--text-light)' }}>—</span>}</td>
                      <td><span className="date-cell">{cm.resolved_date ? formatDate(cm.resolved_date) : '—'}</span></td>
                      <td style={{ fontSize:11, color:'var(--text-muted)', maxWidth:160 }}>{cm.notes || '—'}</td>
                      {can('manage_cm') && (
                        <td style={{ whiteSpace:'nowrap' }}>
                          <button className="btn-sm btn-edit" onClick={() => setModal({ open:true, cm })}>Edit</button>
                          <button className="btn-sm btn-delete" style={{ marginLeft:4 }} onClick={() => handleDelete(cm.id)}>Del</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      <CmModal open={modal.open} cm={modal.cm} projects={projects} onSave={handleSave} onClose={() => setModal({ open:false, cm:null })} />
    </div>
  );
}
