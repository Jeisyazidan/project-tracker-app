import { useState, useCallback } from 'react';
import EmptyState from '../components/ui/EmptyState';
import TerminModal from '../components/modals/TerminModal';
import Badge from '../components/ui/Badge';
import { mergePeriods, BAST_STEPS, BILLING_FREQ_LABELS, stepsDoneLabel } from '../utils/bastPeriods';
import { upsertPeriod, createTermin, updateTermin, deleteTermin } from '../api/bast';
import { useAuth } from '../context/AuthContext';
import { daysDiff } from '../utils/dates';

function fmtRaw(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
}

function SubmitDeadline({ projectId, periodIdx, period, onUpdate }) {
  const diff  = daysDiff(period.submit_deadline);
  const color = diff === null ? '#9ca3af' : diff < 0 ? '#dc2626' : diff <= 14 ? '#d97706' : '#16a34a';
  const label = diff === null ? '' : diff < 0 ? 'Overdue!' : diff === 0 ? 'Due today' : `${diff}d left`;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0 14px 10px 54px' }}>
      <span style={{ fontSize:10, color:'#888' }}>📋 Submit by:</span>
      <input
        type="date"
        defaultValue={period.submit_deadline || ''}
        onChange={e => onUpdate(projectId, period, e.target.value)}
        style={{ fontSize:11, padding:'3px 8px', border:`1px solid ${color}`, borderRadius:6, color, background:'var(--input-bg)' }}
      />
      {label && <span style={{ fontSize:10, fontWeight:700, color }}>{label}</span>}
    </div>
  );
}

function PeriodCard({ project, period, periodIdx, canEdit, onToggleStep, onSetAll, onUpdateDeadline, onEditTermin, onDeleteTermin }) {
  const [open, setOpen] = useState(false);
  const stepsDone = period.steps.filter(Boolean).length;
  const allDone   = stepsDone === 8;
  const perColor  = allDone ? '#16a34a' : stepsDone > 0 ? '#f59e0b' : '#9ca3af';
  const perPct    = Math.round((stepsDone / 8) * 100);
  const statusLabel = stepsDoneLabel(period.steps);
  const statusCls   = allDone ? 'badge-green' : stepsDone > 0 ? 'badge-yellow' : 'badge-gray';
  const borderColor = period.is_custom ? '#ddd6fe' : allDone ? '#bbf7d0' : stepsDone > 0 ? '#fde68a' : '#e5e7eb';
  const headerBg    = period.is_custom ? '#f5f3ff' : allDone ? '#f0fdf4' : stepsDone > 0 ? '#fffbeb' : '#fafafa';

  return (
    <div style={{ border:`1px solid ${borderColor}`, borderRadius:10, marginBottom:8, overflow:'hidden' }}>
      <div style={{ background:headerBg }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px' }}>
          <div onClick={() => setOpen(o => !o)} style={{ display:'flex', alignItems:'center', gap:10, flex:1, cursor:'pointer', minWidth:0 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background: period.is_custom ? '#7c3aed' : perColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:'white' }}>{periodIdx + 1}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>
                {period.label}
                {period.is_custom && <span style={{ padding:'2px 7px', borderRadius:10, fontSize:9, fontWeight:700, background:'#ede9fe', color:'#7c3aed', marginLeft:4 }}>TERMIN</span>}
              </div>
              <div style={{ fontSize:10, color:'#888', marginTop:1 }}>{fmtRaw(period.start)} → {fmtRaw(period.end)}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <div style={{ width:80, height:5, background:'#e5e7eb', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${perPct}%`, height:'100%', background: period.is_custom && !allDone ? '#7c3aed' : perColor, borderRadius:3 }} />
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:perColor, whiteSpace:'nowrap' }}>{stepsDone}/8</span>
              <span className={`badge ${statusCls}`}>{statusLabel}</span>
              <span style={{ fontSize:12, color:'#9ca3af' }}>{open ? '▲' : '▼'}</span>
            </div>
          </div>
          {canEdit && (
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              {period.is_custom && (
                <>
                  <button onClick={() => onEditTermin(period)} style={{ padding:'3px 8px', borderRadius:12, border:'1px solid var(--border)', background:'var(--surface)', fontSize:10, fontWeight:600, cursor:'pointer', color:'var(--text-muted)' }}>✏️</button>
                  <button onClick={() => onDeleteTermin(period)} style={{ padding:'3px 8px', borderRadius:12, border:'1px solid #fca5a5', background:'#fee2e2', fontSize:10, fontWeight:600, cursor:'pointer', color:'#dc2626' }}>🗑</button>
                </>
              )}
              <select onChange={e => { if (e.target.value) { onSetAll(e.target.value === 'billed'); e.target.value = ''; } }} defaultValue="" style={{ padding:'4px 8px', borderRadius:20, border:'1px solid var(--border)', fontSize:11, fontWeight:600, background:'var(--input-bg)', cursor:'pointer', color:'var(--text)' }}>
                <option value="">Quick set…</option>
                <option value="billed">✓ Billed</option>
                <option value="pending">✕ Pending</option>
              </select>
            </div>
          )}
        </div>
        {canEdit && <SubmitDeadline projectId={project.id} periodIdx={periodIdx} period={period} onUpdate={onUpdateDeadline} />}
      </div>
      {open && (
        <div style={{ padding:'12px 14px', background:'var(--surface)' }}>
          {BAST_STEPS.map((step, si) => {
            const checked = period.steps[si];
            const num     = String(si + 1).padStart(2, '0');
            return (
              <div key={si} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, marginBottom:4, background: checked ? '#f0fdf4' : 'var(--surface2)', border:`1px solid ${checked ? '#bbf7d0' : 'var(--border2)'}` }}>
                <div style={{ width:26, height:26, borderRadius:7, background: checked ? '#16a34a' : '#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:700, color: checked ? 'white' : '#9ca3af' }}>{num}</div>
                <span style={{ flex:1, fontSize:12, color: checked ? '#15803d' : 'var(--text)', fontWeight:500, textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.65 : 1 }}>{step}</span>
                {canEdit && (
                  <button onClick={() => onToggleStep(si)} style={{ padding:'4px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, background: checked ? '#fee2e2' : '#1e3a5f', color: checked ? '#dc2626' : 'white', whiteSpace:'nowrap' }}>
                    {checked ? '✕ Undo' : '✓ Mark Done'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onProjectEdit, onUpdate }) {
  const { can } = useAuth();
  const canEdit = can('edit_bast');

  const storedRows  = project.localPeriods || project.bast_stored_periods || [];
  const periods     = mergePeriods(project, storedRows);
  const totalPeriods= periods.length;
  const donePeriods = periods.filter(per => per.steps.every(Boolean)).length;
  const hasConfig   = project.contract_start && project.deadline && project.billing_freq;
  const freqLabel   = BILLING_FREQ_LABELS[project.billing_freq] || (hasConfig ? '' : 'Custom Termins only');
  const pct         = totalPeriods ? Math.round((donePeriods / totalPeriods) * 100) : 0;
  const progressColor = donePeriods === totalPeriods && totalPeriods > 0 ? '#16a34a' : donePeriods > 0 ? '#f59e0b' : '#9ca3af';

  const [showBilled, setShowBilled]   = useState(false);
  const [showPeriods, setShowPeriods] = useState(false);

  const [terminModal, setTerminModal] = useState({ open:false, termin:null });

  const pendingPeriods = periods.filter(per => !per.steps.every(Boolean));
  const billedPeriods  = periods.filter(per =>  per.steps.every(Boolean));

  const handleToggleStep = useCallback(async (period, si) => {
    const newSteps = [...period.steps];
    newSteps[si] = !newSteps[si];
    await onUpdate(project, period, { steps: newSteps, submit_deadline: period.submit_deadline });
  }, [project, onUpdate]);

  const handleSetAll = useCallback(async (period, billed) => {
    const newSteps = [billed,billed,billed,billed,billed,billed,billed,billed];
    await onUpdate(project, period, { steps: newSteps, submit_deadline: period.submit_deadline });
  }, [project, onUpdate]);

  const handleUpdateDeadline = useCallback(async (_projectId, period, dateVal) => {
    await onUpdate(project, period, { steps: period.steps, submit_deadline: dateVal });
  }, [project, onUpdate]);

  const handleSaveTermin = useCallback(async (data, editTermin) => {
    if (editTermin) {
      await updateTermin(project.id, editTermin.id, data);
    } else {
      await createTermin(project.id, { ...data, sort_order: (project.localPeriods || []).filter(r => r.is_custom).length });
    }
    onUpdate(project, null, null, true);
  }, [project, onUpdate]);

  const handleDeleteTermin = useCallback(async (period) => {
    if (!confirm('Delete this custom termin?')) return;
    await deleteTermin(project.id, period.id);
    onUpdate(project, null, null, true);
  }, [project, onUpdate]);

  if (!hasConfig && !periods.filter(p => p.is_custom).length) {
    return (
      <div id={`bast-project-${project.id}`} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-card)', padding:16, marginBottom:12, boxShadow:'var(--shadow-sm)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:8 }}>
          <div><span style={{ fontWeight:700, fontSize:13, color:'var(--pid-color)' }}>{project.pid}</span><span style={{ color:'var(--text-subtle)', fontSize:12, marginLeft:8 }}>{project.company}</span></div>
          <span className={`badge badge-${({Completed:'blue','On Track':'green','Not Started':'gray'})[project.status]||'amber'}`}>{project.status}</span>
        </div>
        <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>{project.name}</div>
        <div style={{ background:'var(--issue-bg)', border:'1px solid var(--issue-border)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--text-muted)' }}>
          ⚠️ Set <strong>Contract Start Date</strong> and <strong>Billing Frequency</strong> to generate billing schedule.
          <button onClick={() => onProjectEdit(project)} style={{ marginLeft:10, padding:'4px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, background:'#1e3a5f', color:'white' }}>Edit Project</button>
          {canEdit && <button onClick={() => setTerminModal({ open:true, termin:null })} style={{ marginLeft:6, padding:'4px 12px', borderRadius:20, border:'1px solid #7c3aed', cursor:'pointer', fontSize:11, fontWeight:700, background:'#f5f3ff', color:'#7c3aed' }}>+ Add Termin</button>}
        </div>
        <TerminModal open={terminModal.open} termin={terminModal.termin} nextNum={1} onSave={d => handleSaveTermin(d, terminModal.termin)} onClose={() => setTerminModal({ open:false, termin:null })} />
      </div>
    );
  }

  return (
    <div id={`bast-project-${project.id}`} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-card)', padding:18, marginBottom:14, boxShadow:'var(--shadow-sm)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:8, flexWrap:'wrap' }}>
        <div>
          <span style={{ fontWeight:700, fontSize:13, color:'var(--pid-color)' }}>{project.pid}</span>
          <span style={{ color:'var(--text-subtle)', fontSize:12, marginLeft:8 }}>{project.company}</span>
          <div style={{ fontSize:12, fontWeight:600, marginTop:3, color:'var(--text)' }}>{project.name}</div>
          <div style={{ fontSize:11, color:'var(--text-subtle)', marginTop:2 }}>📅 {project.contract_start ? `${project.contract_start} → ${project.deadline}` : '—'} &nbsp;·&nbsp; 🔄 {freqLabel}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <Badge color={({Completed:'blue','On Track':'green','Not Started':'gray'})[project.status]||'amber'}>{project.status}</Badge>
          <span style={{ fontSize:13, fontWeight:700, color:progressColor }}>{donePeriods}/{totalPeriods} billed</span>
          {canEdit && <button onClick={() => setTerminModal({ open:true, termin:null })} style={{ padding:'4px 10px', borderRadius:20, border:'1px solid #7c3aed', background:'#f5f3ff', fontSize:11, fontWeight:600, cursor:'pointer', color:'#7c3aed', whiteSpace:'nowrap' }}>+ Termin</button>}
          <button onClick={() => setShowPeriods(v => !v)} style={{ padding:'4px 10px', borderRadius:20, border:'1px solid var(--border)', background:'var(--surface)', fontSize:11, fontWeight:600, cursor:'pointer', color:'var(--text-muted)', whiteSpace:'nowrap' }}>
            {showPeriods ? '▲ Minimize' : '▼ Show Periods'}
          </button>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <div style={{ flex:1, height:7, background:'#e5e7eb', borderRadius:4, overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:progressColor, borderRadius:4, transition:'width .3s' }} />
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:progressColor }}>{pct}% billed</span>
      </div>
      {showPeriods && (
        <div>
          {pendingPeriods.map(per => {
            const idx = periods.indexOf(per);
            return (
              <PeriodCard key={per.id ?? per.label} project={project} period={per} periodIdx={idx} canEdit={canEdit}
                onToggleStep={si => handleToggleStep(per, si)}
                onSetAll={billed => handleSetAll(per, billed)}
                onUpdateDeadline={handleUpdateDeadline}
                onEditTermin={t => setTerminModal({ open:true, termin:t })}
                onDeleteTermin={handleDeleteTermin}
              />
            );
          })}
          {billedPeriods.length > 0 && (
            <div>
              <button onClick={() => setShowBilled(v => !v)} style={{ padding:'5px 14px', borderRadius:20, border:'1px dashed #16a34a', background:'#f0fdf4', fontSize:11, fontWeight:600, cursor:'pointer', color:'#16a34a', marginBottom:8 }}>
                {showBilled ? `▲ Hide ${billedPeriods.length} billed` : `▼ Show ${billedPeriods.length} billed`}
              </button>
              {showBilled && billedPeriods.map(per => {
                const idx = periods.indexOf(per);
                return (
                  <PeriodCard key={per.id ?? per.label} project={project} period={per} periodIdx={idx} canEdit={canEdit}
                    onToggleStep={si => handleToggleStep(per, si)}
                    onSetAll={billed => handleSetAll(per, billed)}
                    onUpdateDeadline={handleUpdateDeadline}
                    onEditTermin={t => setTerminModal({ open:true, termin:t })}
                    onDeleteTermin={handleDeleteTermin}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
      <TerminModal
        open={terminModal.open}
        termin={terminModal.termin}
        nextNum={periods.filter(p => p.is_custom).length + 1}
        onSave={d => handleSaveTermin(d, terminModal.termin)}
        onClose={() => setTerminModal({ open:false, termin:null })}
      />
    </div>
  );
}

export default function BastPage({ projects, onProjectEdit, onRefresh }) {
  const handleUpdate = useCallback(async (project, period, data, forceRefresh = false) => {
    if (forceRefresh || !period) {
      await onRefresh();
      return;
    }
    if (period.is_custom && period.id) {
      await upsertPeriod(project.id, {
        label:           period.label,
        start_date:      period.start,
        end_date:        period.end,
        steps:           data.steps,
        submit_deadline: data.submit_deadline || null,
      });
    } else {
      await upsertPeriod(project.id, {
        label:           period.label,
        start_date:      period.start,
        end_date:        period.end,
        steps:           data.steps,
        submit_deadline: data.submit_deadline || null,
      });
    }
    await onRefresh();
  }, [onRefresh]);

  if (!projects.length) return <EmptyState icon="📄" message="No projects found." />;

  return (
    <div>
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} onProjectEdit={onProjectEdit} onUpdate={handleUpdate} />
      ))}
    </div>
  );
}
