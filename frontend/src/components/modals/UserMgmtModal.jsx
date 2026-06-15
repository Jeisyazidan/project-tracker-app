import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { getUsers, createUser, deleteUser } from '../../api/users';
import { ROLE_BADGE, ROLE_LABEL } from '../../utils/badges';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { username:'', email:'', password:'', password2:'', role:'pm' };

export default function UserMgmtModal({ open, onClose }) {
  const { user: me } = useAuth();
  const [users, setUsers]   = useState([]);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setUsers(await getUsers()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (open) { load(); setForm(EMPTY_FORM); setError(''); } }, [open, load]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleAdd = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setError('Username, email, and password are required.'); return;
    }
    if (form.password !== form.password2) { setError('Passwords do not match.'); return; }
    setSaving(true); setError('');
    try {
      await createUser({ username: form.username.trim(), email: form.email.trim(), password: form.password, role: form.role });
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this user?')) return;
    try { await deleteUser(id); await load(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to remove'); }
  };

  return (
    <Modal open={open} onClose={onClose} title="👥 User Management">
      <div style={{ marginBottom: 16 }}>
        {users.map(u => (
          <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', marginBottom:6 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontWeight:600 }}>{u.username}</span>
                <Badge color={ROLE_BADGE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                {me && u.id === me.id && <span style={{ fontSize:10, color:'#16a34a' }}>(you)</span>}
              </div>
              {u.email && <div style={{ fontSize:11, color:'var(--text-subtle)', marginTop:2 }}>{u.email}</div>}
            </div>
            {me && u.id !== me.id && (
              <button className="btn-sm btn-delete" onClick={() => handleDelete(u.id)}>Remove</button>
            )}
          </div>
        ))}
        {!users.length && <p style={{ color:'var(--text-light)', fontSize:13 }}>No users.</p>}
      </div>
      <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'16px 0' }} />
      <h3 style={{ fontSize:13, fontWeight:700, color:'var(--accent)', marginBottom:10 }}>Add New User</h3>
      <div className="form-grid">
        <div className="form-group"><label>Username *</label><input value={form.username} onChange={set('username')} placeholder="Username" /></div>
        <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={set('email')} placeholder="Email address" /></div>
        <div className="form-group">
          <label>Role</label>
          <select value={form.role} onChange={set('role')}>
            <option value="pm">PM</option>
            <option value="om">OM</option>
            <option value="system_engineer">System Engineer</option>
            <option value="dba">DBA</option>
            <option value="technical_writer">Technical Writer</option>
            <option value="admin">Admin (Superuser)</option>
          </select>
        </div>
        <div className="form-group"><label>Password *</label><input type="password" value={form.password} onChange={set('password')} placeholder="Password" /></div>
        <div className="form-group"><label>Confirm Password *</label><input type="password" value={form.password2} onChange={set('password2')} placeholder="Confirm password" /></div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-cancel" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Adding…' : 'Add User'}</button>
      </div>
    </Modal>
  );
}
