import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { todayISO, nowTime } from '../../utils/dates';

const EMPTY = {
  project_id:'', title:'', start_date:'', start_time:'',
  end_date:'', end_time:'', status:'Open',
  resolved_date:'', pic_utama:'', pic_support:'', notes:'',
};

export default function CmModal({ open, cm, projects, onSave, onClose }) {
  const [form, setForm]   = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (cm) {
      setForm({
        project_id:    String(cm.project_id),
        title:         cm.title || '',
        start_date:    cm.start_date || '',
        start_time:    cm.start_time || '',
        end_date:      cm.end_date || '',
        end_time:      cm.end_time || '',
        status:        cm.status || 'Open',
        resolved_date: cm.resolved_date || '',
        pic_utama:     cm.pic_utama || '',
        pic_support:   cm.pic_support || '',
        notes:         cm.notes || '',
      });
    } else {
      setForm({ ...EMPTY, start_date: todayISO(), start_time: nowTime(), project_id: projects[0]?.id ? String(projects[0].id) : '' });
    }
    setError('');
  }, [open, cm, projects]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.project_id || !form.title.trim() || !form.start_date) {
      setError('Project, Description, and From Date are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, project_id: parseInt(form.project_id, 10) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={cm ? 'Edit CM Request' : 'Add CM Request'}>
      <div className="form-grid">
        <div className="form-group full">
          <label>Project *</label>
          <select value={form.project_id} onChange={set('project_id')} disabled={!!cm} style={{ fontSize: 12 }}>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.pid} — {p.company.substring(0, 35)}</option>
            ))}
          </select>
        </div>
        <div className="form-group"><label>From Date *</label><input type="date" value={form.start_date} onChange={set('start_date')} /></div>
        <div className="form-group"><label>From Time</label><input type="time" value={form.start_time} onChange={set('start_time')} /></div>
        <div className="form-group"><label>To Date</label><input type="date" value={form.end_date} onChange={set('end_date')} /></div>
        <div className="form-group"><label>To Time</label><input type="time" value={form.end_time} onChange={set('end_time')} /></div>
        <div className="form-group">
          <label>Status</label>
          <select value={form.status} onChange={set('status')}><option>Open</option><option>In Progress</option><option>Resolved</option></select>
        </div>
        <div className="form-group full"><label>Issue Description *</label><input value={form.title} onChange={set('title')} placeholder="Brief description of the corrective maintenance request" /></div>
        <div className="form-group"><label>Resolved Date</label><input type="date" value={form.resolved_date} onChange={set('resolved_date')} /></div>
        <div className="form-group"><label>PIC Utama</label><input value={form.pic_utama} onChange={set('pic_utama')} placeholder="e.g. Budi Santoso" /></div>
        <div className="form-group"><label>PIC Support</label><input value={form.pic_support} onChange={set('pic_support')} placeholder="e.g. Rina Wijaya" /></div>
        <div className="form-group full"><label>Notes</label><textarea value={form.notes} onChange={set('notes')} placeholder="Root cause, action taken..." /></div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-cancel" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save CM Request'}</button>
      </div>
    </Modal>
  );
}
