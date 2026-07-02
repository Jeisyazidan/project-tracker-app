import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { getUsers, createUser, deleteUser, updatePhone, updateEmail } from '../../api/users';
import { ROLE_BADGE, ROLE_LABEL } from '../../utils/badges';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { username:'', email:'', phone:'', password:'', password2:'', role:'pm' };

export default function UserMgmtModal({ open, onClose }) {
  const { user: me } = useAuth();
  const [users, setUsers]       = useState([]);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [editPhone, setEditPhone] = useState(null); // { id, phone }
  const [editEmail, setEditEmail] = useState(null); // { id, email }

  const load = useCallback(async () => {
    try { setUsers(await getUsers()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (open) { load(); setForm(EMPTY_FORM); setError(''); setEditPhone(null); setEditEmail(null); } }, [open, load]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleAdd = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setError('Username, email, and password are required.'); return;
    }
    if (form.password !== form.password2) { setError('Passwords do not match.'); return; }
    setSaving(true); setError('');
    try {
      await createUser({ username: form.username.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password, role: form.role });
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

  const handleSavePhone = async () => {
    try {
      await updatePhone(editPhone.id, editPhone.phone);
      setEditPhone(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update phone');
    }
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
              {editPhone?.id === u.id ? (
                <div style={{ display:'flex', gap:6, marginTop:4 }}>
                  <input
                    style={{ fontSize:12, padding:'2px 6px', borderRadius:4, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', width:140 }}
                    value={editPhone.phone}
                    onChange={e => setEditPhone(p => ({ ...p, phone: e.target.value }))}
                    placeholder="e.g. 08123456789"
                  />
                  <button className="btn-sm" style={{ fontSize:11 }} onClick={handleSavePhone}>Save</button>
                  <button className="btn-sm btn-cancel" style={{ fontSize:11 }} onClick={() => setEditPhone(null)}>Cancel</button>
                </div>
              ) : (
                <div style={{ fontSize:11, color: u.phone ? '#16a34a' : 'var(--text-subtle)', marginTop:2, display:'flex', alignItems:'center', gap:6 }}>
                  {u.phone ? `WA: ${u.phone}` : 'No WhatsApp number'}
                  <button className="btn-sm" style={{ fontSize:10, padding:'1px 6px' }} onClick={() => setEditPhone({ id: u.id, phone: u.phone || '' })}>Edit</button>
                </div>
              )}
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
        <div className="form-group"><label>WhatsApp Number</label><input value={form.phone} onChange={set('phone')} placeholder="e.g. 08123456789" /></div>
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
