import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

const EMPTY = {
  pid:'', company:'', name:'', status:'On Track',
  contract_start:'', deadline:'', billing_freq:'',
  project_admin_id:'', project_manager_id:'', operation_manager_id:'',
  handover_status:'Not Started', issues:'',
};

export default function ProjectModal({ open, project, users = [], onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(project
        ? {
            pid:               project.pid || '',
            company:           project.company || '',
            name:              project.name || '',
            status:            project.status || 'On Track',
            contract_start:    project.contract_start || '',
            deadline:          project.deadline || '',
            billing_freq:      project.billing_freq || '',
            project_admin_id:     project.project_admin_id     ? String(project.project_admin_id)     : '',
            project_manager_id:   project.project_manager_id   ? String(project.project_manager_id)   : '',
            operation_manager_id: project.operation_manager_id ? String(project.operation_manager_id) : '',
            handover_status:   project.handover_status || 'Not Started',
            issues:            project.issues || '',
          }
        : { ...EMPTY }
      );
      setError('');
    }
  }, [open, project]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.pid.trim() || !form.company.trim() || !form.name.trim()) {
      setError('PID, Company, and Project Description are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        project_admin_id: form.project_admin_id ? parseInt(form.project_admin_id, 10) : null,
        project_manager_id: form.project_manager_id ? parseInt(form.project_manager_id, 10) : null,
        operation_manager_id: form.operation_manager_id ? parseInt(form.operation_manager_id, 10) : null,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={project ? 'Edit Project' : 'Add New Project'}>
      <div className="form-grid">
        <div className="form-group">
          <label>PID *</label>
          <input value={form.pid} onChange={set('pid')} placeholder="e.g. 24-64-005" />
        </div>
        <div className="form-group">
          <label>Company *</label>
          <input value={form.company} onChange={set('company')} placeholder="Client company name" />
        </div>
        <div className="form-group full">
          <label>Project / Description *</label>
          <input value={form.name} onChange={set('name')} placeholder="Project description" />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={form.status} onChange={set('status')}>
            <option>On Track</option>
            <option>In Progress - Minor Issues</option>
            <option>In Progress - Major Issues</option>
            <option>Completed</option>
            <option>Not Started</option>
          </select>
        </div>
        <div className="form-group">
          <label>Contract Start Date</label>
          <input type="date" value={form.contract_start} onChange={set('contract_start')} />
        </div>
        <div className="form-group">
          <label>Contract End Date</label>
          <input type="date" value={form.deadline} onChange={set('deadline')} />
        </div>
        <div className="form-group full">
          <label>Billing Frequency</label>
          <select value={form.billing_freq} onChange={set('billing_freq')}>
            <option value="">— Select frequency —</option>
            <option value="once">One-time payment</option>
            <option value="1">Once a year (every 12 months)</option>
            <option value="2">Twice a year (every 6 months)</option>
            <option value="3">3 times a year (every 4 months)</option>
            <option value="4">4 times a year (every 3 months)</option>
            <option value="6">6 times a year (every 2 months)</option>
            <option value="12">Monthly (every 1 month)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Project Admin</label>
          <select value={form.project_admin_id} onChange={set('project_admin_id')}>
            <option value="">— Select user —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Project Manager</label>
          <select value={form.project_manager_id} onChange={set('project_manager_id')}>
            <option value="">— Select user —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Operation Manager</label>
          <select value={form.operation_manager_id} onChange={set('operation_manager_id')}>
            <option value="">— Select user —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Handover Status</label>
          <select value={form.handover_status} onChange={set('handover_status')}>
            <option>Not Started</option>
            <option>Transfer Knowledge</option>
            <option>Completed</option>
          </select>
        </div>
        <div className="form-group full">
          <label>Issues / Notes</label>
          <textarea value={form.issues} onChange={set('issues')} placeholder="One issue per line" />
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-cancel" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Project'}
        </button>
      </div>
    </Modal>
  );
}
