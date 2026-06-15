import EmptyState from '../components/ui/EmptyState';
import PmModal from '../components/modals/PmModal';
import { useState } from 'react';
import { formatDate } from '../utils/dates';
import { createPm, updatePm, deletePm } from '../api/pm';
import { useAuth } from '../context/AuthContext';

export default function PmPage({ requests, projects, onRefresh }) {
  const { can } = useAuth();
  const [modal, setModal] = useState({ open:false, pm:null });

  const handleSave = async (data) => {
    if (modal.pm) await updatePm(modal.pm.id, data);
    else          await createPm(data);
    await onRefresh();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this PM request?')) return;
    await deletePm(id);
    await onRefresh();
  };

  return (
    <div>
      {can('manage_pm') && (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
          <button className="btn btn-primary" onClick={() => setModal({ open:true, pm:null })}>+ Add PM Request</button>
        </div>
      )}
      {!requests.length
        ? <EmptyState icon="🔧" message="No PM requests yet." />
        : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>PID / Company</th><th>Project</th><th>Status</th><th>Schedule</th>
                <th>Description</th><th>PIC Utama</th><th>PIC Support</th>
                <th>Resolved Date</th><th>Notes</th>
                {can('manage_pm') && <th>Actions</th>}
              </tr></thead>
              <tbody>
                {requests.map(pm => {
                  const statusBg = pm.status==='Open'?'#fff7ed':pm.status==='In Progress'?'#fffbeb':'#dcfce7';
                  const statusCol= pm.status==='Open'?'#c2410c':pm.status==='In Progress'?'#a16207':'#16a34a';
                  return (
                    <tr key={pm.id}>
                      <td><div className="pid">{pm.pid}</div><div className="company">{pm.company}</div></td>
                      <td><div className="projname">{pm.project_name}</div></td>
                      <td><span style={{ display:'inline-block', padding:'3px 8px', borderRadius:12, fontSize:10, fontWeight:700, background:statusBg, color:statusCol }}>{pm.status}</span></td>
                      <td>
                        <span className="date-cell">
                          {formatDate(pm.start_date)}{pm.start_time ? ` 🕐 ${pm.start_time}` : ''}
                          {(pm.end_date || pm.end_time) && <><br /><span style={{ fontSize:10, color:'var(--text-subtle)' }}>→ {formatDate(pm.end_date)}{pm.end_time ? ` 🕐 ${pm.end_time}` : ''}</span></>}
                        </span>
                      </td>
                      <td style={{ maxWidth:240, fontSize:12, fontWeight:600 }}>{pm.title || '—'}</td>
                      <td style={{ fontSize:12, fontWeight:500 }}>{pm.pic_utama || <span style={{ color:'var(--text-light)' }}>—</span>}</td>
                      <td style={{ fontSize:12 }}>{pm.pic_support || <span style={{ color:'var(--text-light)' }}>—</span>}</td>
                      <td><span className="date-cell">{pm.resolved_date ? formatDate(pm.resolved_date) : '—'}</span></td>
                      <td style={{ fontSize:11, color:'var(--text-muted)', maxWidth:160 }}>{pm.notes || '—'}</td>
                      {can('manage_pm') && (
                        <td style={{ whiteSpace:'nowrap' }}>
                          <button className="btn-sm btn-edit" onClick={() => setModal({ open:true, pm })}>Edit</button>
                          <button className="btn-sm btn-delete" style={{ marginLeft:4 }} onClick={() => handleDelete(pm.id)}>Del</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      <PmModal open={modal.open} pm={modal.pm} projects={projects} onSave={handleSave} onClose={() => setModal({ open:false, pm:null })} />
    </div>
  );
}
