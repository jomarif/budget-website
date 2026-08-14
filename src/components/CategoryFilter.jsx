// Category filter chips. Selecting one narrows the list + pie chart to that
// category; clicking it again clears the filter. Only categories that have
// entries in the current period are shown (plus "All").

import { useMemo } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { usePeriodEntries } from '../hooks/usePeriod.js';

export default function CategoryFilter() {
  const { activeBudget, categoryFilter, toggleCategoryFilter, clearCategoryFilter } = useBudget();
  const { periodEntries } = usePeriodEntries();

  const activeCategoryIds = useMemo(() => {
    const ids = new Set();
    periodEntries.forEach((e) => {
      if (e.type !== 'income') ids.add(e.categoryId);
    });
    return ids;
  }, [periodEntries]);

  const shown = activeBudget.categories.filter((c) => activeCategoryIds.has(c.id));

  if (shown.length === 0) return null;

  return (
    <div className="chips">
      <button
        className={`chip${categoryFilter.size === 0 ? ' active' : ''}`}
        onClick={clearCategoryFilter}
      >
        ✨ All
      </button>
      {shown.map((c) => (
        <button
          key={c.id}
          className={`chip${categoryFilter.has(c.id) ? ' active' : ''}`}
          style={categoryFilter.has(c.id) ? { color: c.color } : undefined}
          onClick={() => toggleCategoryFilter(c.id)}
        >
          <span className="chip-swatch" style={{ background: c.color }} />
          {c.emoji} {c.name}
        </button>
      ))}
    </div>
  );
}
