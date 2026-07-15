import { getMonthGrid } from '../../utils/dates';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MonthCalendar({ year, month, itemsByDate, onDayClick }) {
  const cells = getMonthGrid(year, month);
  const todayIso = localTodayISO();

  return (
    <div className="month-calendar">
      <div className="calendar-grid calendar-weekdays">
        {WEEKDAYS.map(w => <div key={w} className="calendar-weekday">{w}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map(cell => {
          const items = itemsByDate[cell.iso] || [];
          const visible = items.slice(0, 3);
          const overflow = items.length - visible.length;
          return (
            <div
              key={cell.iso}
              className={`calendar-cell${cell.inMonth ? '' : ' out-of-month'}${cell.iso === todayIso ? ' today' : ''}`}
              onClick={() => items.length && onDayClick(cell.iso, items)}
            >
              <div className="calendar-cell-date">{cell.day}</div>
              <div className="calendar-cell-items">
                {visible.map((it, i) => (
                  <div key={i} className="calendar-pill" style={{ background: it.color.bg, color: it.color.color }}>
                    {it.icon} {it.label}
                  </div>
                ))}
                {overflow > 0 && <div className="calendar-pill calendar-pill-more">+{overflow} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
