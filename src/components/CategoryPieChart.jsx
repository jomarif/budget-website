// Donut chart: expense breakdown by category within the current period.
// Category colors carry identity (they're user-chosen). Respects the active
// category filter by highlighting the selected slice.

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useBudget } from '../context/BudgetContext.jsx';
import { useThemeColors } from '../hooks/useThemeColors.js';
import { usePeriodEntries } from '../hooks/usePeriod.js';
import { formatMoney, sum } from '../lib/money.js';

function TooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="tooltip-box">
      {d.emoji} {d.name}: {formatMoney(d.value)} ({d.pct}%)
    </div>
  );
}

export default function CategoryPieChart() {
  const { getCategory, categoryFilter, setCategoryFilter } = useBudget();
  const { periodEntries } = usePeriodEntries();
  const c = useThemeColors();

  const { data, total } = useMemo(() => {
    const byCat = new Map();
    periodEntries
      .filter((e) => e.type !== 'income')
      .forEach((e) => {
        byCat.set(e.categoryId, (byCat.get(e.categoryId) || 0) + e.amount);
      });
    const tot = sum([...byCat.values()]);
    const rows = [...byCat.entries()]
      .map(([categoryId, value]) => {
        const cat = getCategory(categoryId);
        return {
          categoryId,
          name: cat.name,
          emoji: cat.emoji,
          color: cat.color,
          value,
          pct: tot ? Math.round((value / tot) * 100) : 0,
        };
      })
      .sort((a, b) => b.value - a.value);
    return { data: rows, total: tot };
  }, [periodEntries, getCategory]);

  return (
    <div className="card">
      <div className="card-title">🍰 Where it went<span className="sub">this period</span></div>

      {data.length === 0 ? (
        <div className="center-note">No spending yet 🌸</div>
      ) : (
        <>
          <div className="chart-wrap" style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke={c.surface}
                  strokeWidth={2}
                  onClick={(slice) =>
                    setCategoryFilter(
                      categoryFilter === slice.categoryId ? null : slice.categoryId
                    )
                  }
                >
                  {data.map((d) => (
                    <Cell
                      key={d.categoryId}
                      fill={d.color}
                      opacity={!categoryFilter || categoryFilter === d.categoryId ? 1 : 0.28}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<TooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div className="muted" style={{ fontSize: '.78rem', fontWeight: 700 }}>Total</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{formatMoney(total)}</div>
            </div>
          </div>

          <div className="chips" style={{ marginTop: 12, marginBottom: 0 }}>
            {data.map((d) => (
              <button
                key={d.categoryId}
                className={`chip${categoryFilter === d.categoryId ? ' active' : ''}`}
                style={categoryFilter === d.categoryId ? { color: d.color } : undefined}
                onClick={() =>
                  setCategoryFilter(categoryFilter === d.categoryId ? null : d.categoryId)
                }
              >
                <span className="chip-swatch" style={{ background: d.color }} />
                {d.emoji} {d.name} · {d.pct}%
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
