import { useState, useEffect, useCallback } from 'react';
import { getReminderSettings, updateReminderSettings } from '../api/reminders';
import { updateProjectReminders } from '../api/projects';

const REMINDER_TYPES = [
  { key:'contract_end', label:'Contract End Warnings', desc:'60/30/7-day contract expiration reminders' },
  { key:'bast_submit',  label:'BAST Submit Warnings',  desc:'BAST submission deadline reminders (30d / 7d / overdue)' },
  { key:'cm_activity',  label:'CM Activity Reminders', desc:'Upcoming CM request reminders (1-3 days before start)' },
  { key:'pm_activity',  label:'PM Activity Reminders', desc:'Upcoming PM request reminders (1-3 days before start)' },
];

export default function ReminderSettingsPage({ projects = [], onRefresh }) {
  const [settings, setSettings] = useState({});
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    try { setSettings(await getReminderSettings()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleType = async (key, val) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    setSaving(true);
    try { await updateReminderSettings(next); }
    catch { await load(); }
    finally { setSaving(false); }
  };

  const toggleProject = async (project, val) => {
    try { await updateProjectReminders(project.id, val); await onRefresh(); }
    catch { /* ignore */ }
  };

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 0' }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:4 }}>⚙️ Reminder Settings</h2>
        <p style={{ fontSize:12, color:'var(--text-subtle)' }}>Turn reminder emails on or off, globally or per project.</p>
        {saving && <span style={{ fontSize:11, color:'#3b82f6', marginLeft:12 }}>Saving…</span>}
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20, marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:14 }}>Global Reminder Types</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {REMINDER_TYPES.map(t => {
            const checked = settings[t.key] !== false;
            return (
              <label key={t.key} className={`toggle-item${checked ? ' checked' : ''}`} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, cursor:'pointer', transition:'background .15s' }}>
                <input type="checkbox" checked={checked} onChange={e => toggleType(t.key, e.target.checked)} style={{ width:15, height:15, accentColor:'#16a34a', cursor:'pointer' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{t.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-subtle)' }}>{t.desc}</div>
                </div>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background: checked ? '#dcfce7' : '#f3f4f6', color: checked ? '#15803d' : '#9ca3af' }}>{checked ? 'Enabled' : 'Disabled'}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:14 }}>Per-Project Override</div>
        <p style={{ fontSize:11, color:'var(--text-subtle)', marginBottom:12 }}>Turn off all reminders for a specific project, regardless of the global settings above.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {projects.map(p => {
            const checked = p.reminders_enabled !== false;
            return (
              <label key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer' }}>
                <input type="checkbox" checked={checked} onChange={e => toggleProject(p, e.target.checked)} style={{ width:15, height:15, accentColor:'#16a34a', cursor:'pointer' }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{p.pid}</span>
                  <span style={{ fontSize:11, color:'var(--text-subtle)', marginLeft:8 }}>{p.company}</span>
                  <div style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                </div>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background: checked ? '#dcfce7' : '#fee2e2', color: checked ? '#15803d' : '#dc2626', whiteSpace:'nowrap' }}>{checked ? 'Reminders On' : 'Reminders Off'}</span>
              </label>
            );
          })}
          {!projects.length && <p style={{ color:'var(--text-light)', fontSize:13 }}>No projects.</p>}
        </div>
      </div>
    </div>
  );
}
