import { useState, useEffect, useCallback } from 'react';
import { getPermissions, updatePermissions } from '../api/config';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';
import { ROLE_BADGE, ROLE_LABEL } from '../utils/badges';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

const NON_ADMIN_ROLES = ['pm','om','system_engineer','dba','technical_writer'];

export default function AccessControlPage() {
  const { setRolePerms } = useAuth();
  const [perms, setPerms] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setPerms(await getPermissions()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (role, permKey, val) => {
    const next = { ...perms, [role]: { ...(perms[role] || {}), [permKey]: val } };
    setPerms(next);
    setSaving(true);
    try { await updatePermissions(next); setRolePerms(next); }
    catch { await load(); }
    finally { setSaving(false); }
  };

  const setAll = async (role, val) => {
    const rolePerms = {};
    ALL_PERMISSIONS.forEach(p => { rolePerms[p.key] = val; });
    const next = { ...perms, [role]: rolePerms };
    setPerms(next);
    setSaving(true);
    try { await updatePermissions(next); setRolePerms(next); }
    catch { await load(); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 0' }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:4 }}>🔐 Access Control</h2>
        <p style={{ fontSize:12, color:'var(--text-subtle)' }}>Configure permissions per role. Admin always has full access.</p>
        {saving && <span style={{ fontSize:11, color:'#3b82f6', marginLeft:12 }}>Saving…</span>}
      </div>
      {NON_ADMIN_ROLES.map(role => {
        const rolePerms = perms[role] || DEFAULT_ROLE_PERMISSIONS[role] || {};
        return (
          <div key={role} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20, marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--border2)' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{ROLE_LABEL[role]}</span>
                  <Badge color={ROLE_BADGE[role]}>{ROLE_LABEL[role]}</Badge>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setAll(role, true)}  style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'1px solid #16a34a', color:'#16a34a', background:'#f0fdf4', cursor:'pointer', fontWeight:600 }}>Allow All</button>
                <button onClick={() => setAll(role, false)} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'1px solid #dc2626', color:'#dc2626', background:'#fef2f2', cursor:'pointer', fontWeight:600 }}>Deny All</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {ALL_PERMISSIONS.map(p => {
                const checked = !!rolePerms[p.key];
                return (
                  <label key={p.key} className={`toggle-item${checked ? ' checked' : ''}`} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, cursor:'pointer', transition:'background .15s' }}>
                    <input type="checkbox" checked={checked} onChange={e => toggle(role, p.key, e.target.checked)} style={{ width:15, height:15, accentColor:'#16a34a', cursor:'pointer' }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{p.label}</div>
                      <div style={{ fontSize:11, color:'var(--text-subtle)' }}>{p.desc}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background: checked ? '#dcfce7' : '#f3f4f6', color: checked ? '#15803d' : '#9ca3af' }}>{checked ? 'Allowed' : 'Denied'}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
