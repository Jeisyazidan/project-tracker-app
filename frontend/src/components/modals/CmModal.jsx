import { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import MultiUserSelect from '../ui/MultiUserSelect';
import SearchSelect from '../ui/SearchSelect';
import { todayISO, nowTime } from '../../utils/dates';

const EMPTY = {
  project_id:'', title:'', start_date:'', start_time:'',
  end_date:'', end_time:'', status:'Open',
  resolved_date:'', pic_utama_ids:[], pic_support_ids:[], notes:'',
};

export default function CmModal({ open, cm, projects, users = [], onSave, onClose }) {
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
        pic_utama_ids:   (cm.pic_utama_users   || []).map(u => u.id),
        pic_support_ids: (cm.pic_support_users || []).map(u => u.id),
        notes:         cm.notes || '',
      });
    } else {
      setForm({ ...EMPTY, start_date: todayISO(), start_time: nowTime(), project_id: projects[0]?.id ? String(projects[0].id) : '' });
    }
    setError('');
  }, [open, cm, projects]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const projectOptions = useMemo(() => projects.map(p => ({
    value: String(p.id), label: `${p.pid} — ${p.company}`,
  })), [projects]);

  const handleSave = async () => {
    if (!form.project_id || !form.title.trim() || !form.start_date) {
      setError('Project, Description, and From Date are required.');
      return;
    }
    if (cm && !confirm('Save changes to this CM request?')) return;
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        project_id: parseInt(form.project_id, 10),
      });
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
          <SearchSelect
            options={projectOptions}
            value={form.project_id}
            onChange={val => setForm(f => ({ ...f, project_id: val }))}
            disabled={!!cm}
            placeholder="— Select project —"
          />
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
        <div className="form-group">
          <label>PIC Utama</label>
          <MultiUserSelect users={users} selectedIds={form.pic_utama_ids}
            onChange={ids => setForm(f => ({ ...f, pic_utama_ids: ids }))} />
        </div>
        <div className="form-group">
          <label>PIC Support</label>
          <MultiUserSelect users={users} selectedIds={form.pic_support_ids}
            onChange={ids => setForm(f => ({ ...f, pic_support_ids: ids }))} />
        </div>
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
