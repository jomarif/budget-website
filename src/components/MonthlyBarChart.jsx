// Master summary: income vs. expense for the last 3 months (grouped bars),
// so the current month reads against the ones before it. Two series → legend.

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { isWithinInterval } from 'date-fns';
import { useBudget } from '../context/BudgetContext.jsx';
import { useThemeColors } from '../hooks/useThemeColors.js';
import { recentMonths } from '../lib/dates.js';
import { formatMoney, formatMoneyCompact } from '../lib/money.js';

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip-box">
      <div style={{ marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatMoney(p.value)}
        </div>
      ))}
    </div>
  );
}

export default function MonthlyBarChart() {
  const { activeBudget, refDate } = useBudget();
  const c = useThemeColors();

  const data = useMemo(() => {
    const months = recentMonths(refDate, 3);
    return months.map((m) => {
      let income = 0;
      let expense = 0;
      activeBudget.entries.forEach((e) => {
        if (isWithinInterval(new Date(e.date), { start: m.start, end: m.end })) {
          if (e.type === 'income') income += e.amount;
          else expense += e.amount;
        }
      });
      return { month: m.label, Income: income, Spent: expense };
    });
  }, [activeBudget.entries, refDate]);

  const hasData = data.some((d) => d.Income > 0 || d.Spent > 0);

  return (
    <div className="card">
      <div className="card-title">📊 Last 3 months<span className="sub">income vs spending</span></div>
      {!hasData ? (
        <div className="center-note">Log a few entries to see your trend 🌈</div>
      ) : (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid vertical={false} stroke={c.border} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false}
                tick={{ fill: c['text-soft'], fontWeight: 700, fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} width={54}
                tick={{ fill: c['text-soft'], fontSize: 11 }}
                tickFormatter={(v) => formatMoneyCompact(v)} />
              <Tooltip content={<TooltipContent />} cursor={{ fill: c['pink-100'], opacity: 0.5 }} />
              <Legend iconType="circle" wrapperStyle={{ fontWeight: 700, fontSize: 13 }} />
              <Bar dataKey="Income" fill={c.income} radius={[6, 6, 0, 0]} maxBarSize={46} />
              <Bar dataKey="Spent" fill={c.expense} radius={[6, 6, 0, 0]} maxBarSize={46} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
