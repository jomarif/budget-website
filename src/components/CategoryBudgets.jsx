// Per-category monthly budget caps with progress bars. Always computed for the
// calendar month of the current reference date (caps are inherently monthly).

import { useMemo } from 'react';
import { isWithinInterval } from 'date-fns';
import { useBudget } from '../context/BudgetContext.jsx';
import { periodRange, periodLabel } from '../lib/dates.js';
import { formatMoney } from '../lib/money.js';

export default function CategoryBudgets() {
  const { activeBudget, refDate } = useBudget();

  const rows = useMemo(() => {
    const { start, end } = periodRange('month', refDate);
    const spentByCat = new Map();
    activeBudget.entries.forEach((e) => {
      if (e.type === 'income') return;
      if (isWithinInterval(new Date(e.date), { start, end })) {
        spentByCat.set(e.categoryId, (spentByCat.get(e.categoryId) || 0) + e.amount);
      }
    });
    return activeBudget.categories
      .filter((c) => c.monthlyBudget && c.monthlyBudget > 0)
      .map((c) => {
        const spent = spentByCat.get(c.id) || 0;
        const pct = Math.min(100, (spent / c.monthlyBudget) * 100);
        return { ...c, spent, pct, over: spent > c.monthlyBudget };
      });
  }, [activeBudget.entries, activeBudget.categories, refDate]);

  return (
    <div className="card">
      <div className="card-title">
        🎀 Monthly budgets
        <span className="sub">{periodLabel('month', refDate)}</span>
      </div>

      {rows.length === 0 ? (
        <div className="center-note">
          Set a monthly cap on a category (in “Manage categories”) to track it here 💗
        </div>
      ) : (
        <div className="budget-list">
          {rows.map((c) => (
            <div className="budget-row" key={c.id}>
              <div className="top">
                <span className="name">
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', background: `${c.color}33`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{c.emoji}</span>
                  {c.name}
                </span>
                <span className={`nums${c.over ? ' over' : ''}`}>
                  {formatMoney(c.spent)} / {formatMoney(c.monthlyBudget)}
                  {c.over && ' 😅'}
                </span>
              </div>
              <div className={`progress${c.over ? ' over' : ''}`}>
                <div className="fill" style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
