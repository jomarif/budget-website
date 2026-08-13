// Income / Expense / Net totals for the current period.

import { useMemo } from 'react';
import { usePeriodEntries } from '../hooks/usePeriod.js';
import { formatMoney, sum } from '../lib/money.js';

export default function SummaryCards() {
  const { periodEntries } = usePeriodEntries();

  const { income, expense, net } = useMemo(() => {
    const inc = sum(periodEntries.filter((e) => e.type === 'income').map((e) => e.amount));
    const exp = sum(periodEntries.filter((e) => e.type !== 'income').map((e) => e.amount));
    return { income: inc, expense: exp, net: inc - exp };
  }, [periodEntries]);

  return (
    <div className="summary-row">
      <div className="stat income">
        <div className="label">💚 Income</div>
        <div className="value">{formatMoney(income)}</div>
      </div>
      <div className="stat expense">
        <div className="label">💸 Spent</div>
        <div className="value">{formatMoney(expense)}</div>
      </div>
      <div className={`stat net ${net >= 0 ? 'positive' : 'negative'}`}>
        <div className="label">{net >= 0 ? '🌟' : '⚠️'} Net</div>
        <div className="value">{formatMoney(net)}</div>
      </div>
    </div>
  );
}
