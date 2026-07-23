import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { getUsers, createUser, deleteUser, updatePhone, updateEmail, changePassword } from '../../api/users';
import { ROLE_BADGE, ROLE_LABEL } from '../../utils/badges';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { username:'', email:'', phone:'', password:'', password2:'', role:'pm' };

const inlineInputStyle = {
  fontSize:12, padding:'4px 8px', borderRadius:4, border:'1px solid var(--border)',
  background:'var(--surface)', color:'var(--text)', width:150,
};

export default function UserMgmtModal({ open, onClose }) {
  const { user: me } = useAuth();
  const [users, setUsers]         = useState([]);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch]       = useState('');
  const [sortKey, setSortKey]     = useState('username');
  const [sortDir, setSortDir]     = useState('asc');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editField, setEditField] = useState(null); // { id, type: 'phone'|'email'|'password', value, value2 }

  const load = useCallback(async () => {
    try { setUsers(await getUsers()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open) {
      load(); setForm(EMPTY_FORM); setError(''); setShowAddForm(false);
      setSearch(''); setEditField(null); setOpenMenuId(null);
    }
  }, [open, load]);

  useEffect(() => {
    if (!openMenuId) return;
    const onClickOutside = e => { if (!e.target.closest('.row-menu')) setOpenMenuId(null); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [openMenuId]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };
  const sortArrow = key => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q ? users : users.filter(u =>
      u.username.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (ROLE_LABEL[u.role] || '').toLowerCase().includes(q)
    );
    const sortValue = u => (sortKey === 'role' ? (ROLE_LABEL[u.role] || u.role) : (u[sortKey] || '')).toString().toLowerCase();
    return [...list].sort((a, b) => {
      const av = sortValue(a), bv = sortValue(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, search, sortKey, sortDir]);

  const handleAdd = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setError('Username, email, and password are required.'); return;
    }
    if (form.password !== form.password2) { setError('Passwords do not match.'); return; }
    setSaving(true); setError('');
    try {
      await createUser({ username: form.username.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password, role: form.role });
      setForm(EMPTY_FORM);
      setShowAddForm(false);
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

  const handleSaveEdit = async () => {
    if (!editField) return;
    const { id, type, value, value2 } = editField;
    try {
      if (type === 'phone') {
        if (!confirm('Update this user\'s WhatsApp number?')) return;
        await updatePhone(id, value);
      } else if (type === 'email') {
        if (!value.trim()) return alert('Email is required');
        if (!confirm('Update this user\'s email address? Notification emails will be sent to both the old and new address.')) return;
        await updateEmail(id, value.trim());
      } else if (type === 'password') {
        if (value.length < 6) return alert('Password must be at least 6 characters');
        if (value !== value2) return alert('Passwords do not match');
        if (!confirm('Reset this user\'s password?')) return;
        await changePassword(id, value);
      }
      setEditField(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const onEditKeyDown = e => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') setEditField(null);
  };

  const openEdit = (u, type) => {
    setOpenMenuId(null);
    if (type === 'phone') setEditField({ id: u.id, type, value: u.phone || '' });
    else if (type === 'email') setEditField({ id: u.id, type, value: u.email || '' });
    else setEditField({ id: u.id, type, value: '', value2: '' });
  };

  return (
    <Modal open={open} onClose={onClose} title="👥 User Management" wide>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
        <input
          style={{ flex:1, padding:'7px 10px', border:'1px solid var(--input-border)', borderRadius:6, fontSize:13, fontFamily:'inherit', background:'var(--input-bg)', color:'var(--text)' }}
          placeholder="Search by username, email, or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={{ fontSize:11, color:'var(--text-subtle)', whiteSpace:'nowrap' }}>{filtered.length} of {users.length}</span>
      </div>

      <div className="table-wrap user-table" style={{ marginBottom:16, maxHeight:360, overflowY:'auto' }}>
        <table>
          <thead>
            <tr>
              <th className="sortable-th" onClick={() => toggleSort('username')}>Username{sortArrow('username')}</th>
              <th className="sortable-th" onClick={() => toggleSort('email')}>Email{sortArrow('email')}</th>
              <th className="sortable-th" onClick={() => toggleSort('role')}>Role{sortArrow('role')}</th>
              <th>WhatsApp</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <Fragment key={u.id}>
                <tr>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontWeight:600 }}>{u.username}</span>
                      {me && u.id === me.id && <span style={{ fontSize:10, color:'#16a34a' }}>(you)</span>}
                    </div>
                  </td>
                  <td>
                    {editField?.id === u.id && editField.type === 'email' ? (
                      <div style={{ display:'flex', gap:6 }}>
                        <input
                          autoFocus type="email" style={inlineInputStyle}
                          value={editField.value}
                          onChange={e => setEditField(f => ({ ...f, value: e.target.value }))}
                          onKeyDown={onEditKeyDown}
                        />
                        <button className="btn-sm" onClick={handleSaveEdit}>Save</button>
                        <button className="btn-sm btn-cancel" onClick={() => setEditField(null)}>Cancel</button>
                      </div>
                    ) : (u.email || <span style={{ color:'var(--text-light)' }}>—</span>)}
                  </td>
                  <td><Badge color={ROLE_BADGE[u.role]}>{ROLE_LABEL[u.role]}</Badge></td>
                  <td>
                    {editField?.id === u.id && editField.type === 'phone' ? (
                      <div style={{ display:'flex', gap:6 }}>
                        <input
                          autoFocus style={inlineInputStyle}
                          value={editField.value}
                          onChange={e => setEditField(f => ({ ...f, value: e.target.value }))}
                          onKeyDown={onEditKeyDown}
                          placeholder="e.g. 08123456789"
                        />
                        <button className="btn-sm" onClick={handleSaveEdit}>Save</button>
                        <button className="btn-sm btn-cancel" onClick={() => setEditField(null)}>Cancel</button>
                      </div>
                    ) : u.phone ? (
                      <span style={{ color:'#16a34a', fontSize:12 }}>{u.phone}</span>
                    ) : (
                      <span style={{ color:'var(--text-light)', fontSize:12 }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign:'right' }}>
                    <div className="row-menu">
                      <button type="button" className="row-menu-trigger" onClick={() => setOpenMenuId(m => (m === u.id ? null : u.id))}>⋯</button>
                      {openMenuId === u.id && (
                        <div className="row-menu-panel">
                          <button className="row-menu-item" onClick={() => openEdit(u, 'phone')}>Edit Phone</button>
                          <button className="row-menu-item" onClick={() => openEdit(u, 'email')}>Edit Email</button>
                          <button className="row-menu-item" onClick={() => openEdit(u, 'password')}>Reset Password</button>
                          {me && u.id !== me.id && (
                            <button className="row-menu-item danger" onClick={() => { setOpenMenuId(null); handleDelete(u.id); }}>Remove</button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                {editField?.id === u.id && editField.type === 'password' && (
                  <tr>
                    <td colSpan={5} style={{ background:'var(--surface2)' }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center', padding:'4px 0' }}>
                        <input
                          autoFocus type="password" placeholder="New password" style={inlineInputStyle}
                          value={editField.value}
                          onChange={e => setEditField(f => ({ ...f, value: e.target.value }))}
                          onKeyDown={onEditKeyDown}
                        />
                        <input
                          type="password" placeholder="Confirm password" style={inlineInputStyle}
                          value={editField.value2}
                          onChange={e => setEditField(f => ({ ...f, value2: e.target.value }))}
                          onKeyDown={onEditKeyDown}
                        />
                        <button className="btn-sm" onClick={handleSaveEdit}>Save</button>
                        <button className="btn-sm btn-cancel" onClick={() => setEditField(null)}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!filtered.length && (
              <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-light)', fontSize:13, padding:'16px 0' }}>
                {users.length ? 'No users match your search.' : 'No users.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: showAddForm ? 10 : 0 }}>
        <h3 style={{ fontSize:13, fontWeight:700, color:'var(--accent)', margin:0 }}>Add New User</h3>
        <button type="button" className="btn-sm" onClick={() => setShowAddForm(s => !s)}>{showAddForm ? 'Cancel' : '+ Add User'}</button>
      </div>
      {showAddForm && (
        <>
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
        </>
      )}
      <div className="modal-actions">
        <button className="btn btn-cancel" onClick={onClose}>Close</button>
        {showAddForm && (
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Adding…' : 'Add User'}</button>
        )}
      </div>
    </Modal>
  );
}
