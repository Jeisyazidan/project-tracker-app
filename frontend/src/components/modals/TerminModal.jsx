import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

const EMPTY = { label: '', start: '', end: '' };

export default function TerminModal({ open, termin, nextNum, onSave, onClose }) {
  const [form, setForm]   = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(termin
      ? { label: termin.label || '', start: termin.start || '', end: termin.end || '' }
      : { label: `Termin ${nextNum || 1}`, start: '', end: '' }
    );
    setError('');
  }, [open, termin, nextNum]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.label.trim()) { setError('Termin name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ label: form.label.trim(), start_date: form.start, end_date: form.end });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={termin ? 'Edit Termin' : 'Add Custom Termin'}>
      <div className="form-grid">
        <div className="form-group full">
          <label>Termin Name *</label>
          <input value={form.label} onChange={set('label')} placeholder="e.g. Termin 1" />
        </div>
        <div className="form-group"><label>Start Date</label><input type="date" value={form.start} onChange={set('start')} /></div>
        <div className="form-group"><label>End Date</label><input type="date" value={form.end} onChange={set('end')} /></div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-cancel" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Termin'}</button>
      </div>
    </Modal>
  );
}
