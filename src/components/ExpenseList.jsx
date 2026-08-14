// The list of entries for the current period (respecting the category filter).
// Each row shows name, category, amount and date, with edit/delete actions.

import { useEffect, useMemo, useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { usePeriodEntries } from '../hooks/usePeriod.js';
import { formatMoney, sum } from '../lib/money.js';
import { formatEntryDate } from '../lib/dates.js';
import ExpenseFormModal from './ExpenseFormModal.jsx';

const PAGE_SIZE = 5;

export default function ExpenseList() {
  const { getCategory, dispatch, categoryFilter, timeframe, refDate } = useBudget();
  const confirm = useConfirm();
  const { filteredEntries } = usePeriodEntries();
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(0);

  // When a category is selected, total just its (expense) entries for the period.
  const filteredTotal = useMemo(
    () => sum(filteredEntries.filter((e) => e.type !== 'income').map((e) => e.amount)),
    [filteredEntries]
  );

  // Entries are already sorted newest-first, so page 0 is the 5 most recent.
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1); // clamp after deletes/filter changes
  const visibleEntries = filteredEntries.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  // Jump back to the most-recent page when the filter or period changes.
  useEffect(() => {
    setPage(0);
  }, [categoryFilter, timeframe, refDate]);

  // Keep React state in sync if a deletion shrank the list past the current page.
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  return (
    <div className="card">
      <div className="card-title">
        📋 Spendings
        <span className="sub">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          {categoryFilter.size > 0 && <> · <strong>{formatMoney(filteredTotal)}</strong></>}
        </span>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="list-empty">
          {categoryFilter.size > 0
            ? 'No entries in the selected categories for this period 🌷'
            : 'Nothing here yet — tap “Add” to log your first entry! 🎀'}
        </div>
      ) : (
        <div className="list">
          {visibleEntries.map((e) => {
            const cat = getCategory(e.categoryId);
            const isIncome = e.type === 'income';
            return (
              <div className="entry" key={e.id}>
                <div className="cat-dot" style={{ background: isIncome ? '#e3f7ee' : `${cat.color}33` }}>
                  {isIncome ? '💚' : cat.emoji}
                </div>
                <div className="entry-main">
                  <div className="entry-name">
                    {e.name}
                    {e.recurringId && <span className="recurring-badge" title="Recurring">🔁</span>}
                  </div>
                  <div className="entry-meta">
                    <span>{isIncome ? 'Income' : cat.name}</span>
                    <span>·</span>
                    <span>{formatEntryDate(e.date)}</span>
                  </div>
                </div>
                <div className={`entry-amount ${isIncome ? 'income' : 'expense'}`}>
                  {isIncome ? '+' : '−'}{formatMoney(e.amount)}
                </div>
                <div className="entry-actions">
                  <button className="btn btn-icon btn-ghost" title="Edit" onClick={() => setEditing(e)}>✎</button>
                  <button
                    className="btn btn-icon btn-ghost"
                    title="Delete"
                    onClick={async () => {
                      if (await confirm({
                        title: 'Delete entry?',
                        message: `“${e.name}” will be removed. This can't be undone.`,
                        confirmLabel: 'Delete',
                        danger: true,
                      })) {
                        dispatch({ type: 'DELETE_ENTRY', id: e.id });
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <div className="pager">
          <button
            className="btn btn-sm btn-ghost"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            ‹ Newer
          </button>
          <span className="pager-info">Page {safePage + 1} of {pageCount}</span>
          <button
            className="btn btn-sm btn-ghost"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Older ›
          </button>
        </div>
      )}

      {editing && <ExpenseFormModal entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
