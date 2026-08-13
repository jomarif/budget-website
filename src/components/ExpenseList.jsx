// The list of entries for the current period (respecting the category filter).
// Each row shows name, category, amount and date, with edit/delete actions.

import { useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { usePeriodEntries } from '../hooks/usePeriod.js';
import { formatMoney } from '../lib/money.js';
import { formatEntryDate } from '../lib/dates.js';
import ExpenseFormModal from './ExpenseFormModal.jsx';

export default function ExpenseList() {
  const { getCategory, dispatch, categoryFilter } = useBudget();
  const { filteredEntries } = usePeriodEntries();
  const [editing, setEditing] = useState(null);

  return (
    <div className="card">
      <div className="card-title">
        📋 Spendings
        <span className="sub">{filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}</span>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="list-empty">
          {categoryFilter
            ? 'No entries in this category for this period 🌷'
            : 'Nothing here yet — tap “Add” to log your first entry! 🎀'}
        </div>
      ) : (
        <div className="list">
          {filteredEntries.map((e) => {
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
                    onClick={() => {
                      if (window.confirm(`Delete “${e.name}”?`)) {
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

      {editing && <ExpenseFormModal entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
