export default function SummaryBar({ projects, onStatClick }) {
  const total      = projects.length;
  const onTrack    = projects.filter(p => p.status === 'On Track').length;
  const minor      = projects.filter(p => p.status === 'In Progress - Minor Issues').length;
  const major      = projects.filter(p => p.status === 'In Progress - Major Issues').length;
  const completed  = projects.filter(p => p.status === 'Completed').length;
  const notStarted = projects.filter(p => p.status === 'Not Started').length;

  return (
    <div className="summary-bar">
      <div className="stat-card"       onClick={() => onStatClick('all')}>       <div className="val">{total}</div>      <div className="lbl">Total PIDs</div></div>
      <div className="stat-card green" onClick={() => onStatClick('On Track')}>  <div className="val">{onTrack}</div>   <div className="lbl">On Track</div></div>
      <div className="stat-card amber" onClick={() => onStatClick('In Progress - Minor Issues')}><div className="val">{minor}</div><div className="lbl">Minor Issues</div></div>
      <div className="stat-card red"   onClick={() => onStatClick('In Progress - Major Issues')}><div className="val">{major}</div><div className="lbl">Major Issues</div></div>
      <div className="stat-card blue"  onClick={() => onStatClick('Completed')}> <div className="val">{completed}</div><div className="lbl">Completed</div></div>
      <div className="stat-card gray"  onClick={() => onStatClick('Not Started')}><div className="val">{notStarted}</div><div className="lbl">Not Started</div></div>
    </div>
  );
}
