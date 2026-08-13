// Timeframe selector (day / week / month) + period navigation arrows.

import { useBudget } from '../context/BudgetContext.jsx';
import { TIMEFRAMES, periodLabel, shiftPeriod } from '../lib/dates.js';

const LABELS = { day: 'Day', week: 'Week', month: 'Month' };

export default function Toolbar() {
  const { timeframe, setTimeframe, refDate, setRefDate } = useBudget();

  function nav(direction) {
    setRefDate(shiftPeriod(timeframe, refDate, direction).toISOString());
  }

  return (
    <div className="toolbar">
      <div className="period-nav">
        <button className="btn btn-icon" onClick={() => nav(-1)} aria-label="Previous period">‹</button>
        <span className="period-label">{periodLabel(timeframe, refDate)}</span>
        <button className="btn btn-icon" onClick={() => nav(1)} aria-label="Next period">›</button>
        <button className="btn btn-sm btn-ghost" onClick={() => setRefDate(new Date().toISOString())}>
          Today
        </button>
      </div>

      <div className="segmented" role="tablist" aria-label="Timeframe">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            role="tab"
            aria-selected={timeframe === tf}
            className={timeframe === tf ? 'active' : ''}
            onClick={() => setTimeframe(tf)}
          >
            {LABELS[tf]}
          </button>
        ))}
      </div>
    </div>
  );
}
