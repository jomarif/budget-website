// Derived selectors for the current view: entries within the active period,
// optionally narrowed by the selected category filter.

import { useMemo } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { isInPeriod } from '../lib/dates.js';

export function usePeriodEntries() {
  const { activeBudget, timeframe, refDate, categoryFilter } = useBudget();

  const periodEntries = useMemo(
    () =>
      activeBudget.entries
        .filter((e) => isInPeriod(e.date, timeframe, refDate))
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [activeBudget.entries, timeframe, refDate]
  );

  const filteredEntries = useMemo(
    () =>
      categoryFilter.size === 0
        ? periodEntries
        : periodEntries.filter((e) => categoryFilter.has(e.categoryId)),
    [periodEntries, categoryFilter]
  );

  return { periodEntries, filteredEntries };
}
