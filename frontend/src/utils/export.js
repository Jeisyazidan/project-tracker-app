import * as XLSX from 'xlsx';
import { mergePeriods } from './bastPeriods';

export function runExport(projects, cmRequests, pmRequests, scope = 'all', filterFn = null) {
  const data = scope === 'all' ? projects : (filterFn ? projects.filter(filterFn) : projects);
  const dateStr = new Date().toISOString().slice(0, 10);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Projects
  const projRows = [['PID','Company','Project Name','Status','Project Admin','Project Manager','Operation Manager','Contract Start','Contract End','Handover Status','Issues']];
  data.forEach(p => {
    projRows.push([
      p.pid, p.company, p.name, p.status,
      p.project_admin || '', p.project_manager || '', p.operation_manager || '',
      p.contract_start || '', p.deadline || '',
      p.handover_status || '', p.issues || '',
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projRows), 'Projects');

  // Sheet 2: BAST Billing
  const bastRows = [['PID','Company','Project Name','Period','Period Start','Period End','Steps Done','Total Steps','Status','Submit Deadline']];
  data.forEach(p => {
    const stored = p.bast_stored_periods || [];
    const periods = mergePeriods(p, stored);
    periods.forEach(per => {
      const stepsDone = per.steps.filter(Boolean).length;
      const status = stepsDone === 8 ? 'Billed' : stepsDone > 0 ? 'In Progress' : 'Pending';
      bastRows.push([
        p.pid, p.company, p.name,
        per.label, per.start || '', per.end || '',
        stepsDone, 8, status, per.submit_deadline || '',
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bastRows), 'BAST Billing');

  // Sheet 3: CM Meetings
  const projectIds = new Set(data.map(p => p.id));
  const cmRows = [['PID','Company','Project Name','Title','From Date','From Time','To Date','To Time','PIC Utama','PIC Support','Status','Resolved Date','Notes']];
  cmRequests.filter(c => projectIds.has(c.project_id)).forEach(c => {
    cmRows.push([c.pid, c.company, c.project_name, c.title || '', c.start_date || '', c.start_time || '', c.end_date || '', c.end_time || '', c.pic_utama || '', c.pic_support || '', c.status || '', c.resolved_date || '', c.notes || '']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cmRows), 'CM Meetings');

  // Sheet 4: PM Meetings
  const pmRows = [['PID','Company','Project Name','Title','From Date','From Time','To Date','To Time','PIC Utama','PIC Support','Status','Resolved Date','Notes']];
  pmRequests.filter(r => projectIds.has(r.project_id)).forEach(r => {
    pmRows.push([r.pid, r.company, r.project_name, r.title || '', r.start_date || '', r.start_time || '', r.end_date || '', r.end_time || '', r.pic_utama || '', r.pic_support || '', r.status || '', r.resolved_date || '', r.notes || '']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pmRows), 'PM Meetings');

  // Sheet 5: Summary
  const statusCounts = {};
  data.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
  const totalBastPeriods = data.reduce((acc, p) => {
    const stored = p.bast_stored_periods || [];
    return acc + mergePeriods(p, stored).length;
  }, 0);
  const billedPeriods = data.reduce((acc, p) => {
    const stored = p.bast_stored_periods || [];
    return acc + mergePeriods(p, stored).filter(per => per.steps.every(Boolean)).length;
  }, 0);
  const totalCM = cmRequests.filter(c => projectIds.has(c.project_id)).length;
  const totalPM = pmRequests.filter(r => projectIds.has(r.project_id)).length;
  const summRows = [
    ['Summary Report', `Exported: ${dateStr}`, scope === 'all' ? 'Scope: All Projects' : 'Scope: Filtered Projects'],
    [],
    ['Total Projects', data.length],
    [],
    ['--- Status Breakdown ---'],
    ...Object.entries(statusCounts).map(([s, c]) => [s, c]),
    [],
    ['--- BAST Billing ---'],
    ['Total Billing Periods', totalBastPeriods],
    ['Billed Periods', billedPeriods],
    ['Pending Periods', totalBastPeriods - billedPeriods],
    ['Billed %', totalBastPeriods ? Math.round((billedPeriods / totalBastPeriods) * 100) + '%' : '0%'],
    [],
    ['--- Meetings ---'],
    ['Total CM Meetings', totalCM],
    ['Total PM Meetings', totalPM],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summRows), 'Summary');

  XLSX.writeFile(wb, `project-tracker-export-${dateStr}.xlsx`);
}
