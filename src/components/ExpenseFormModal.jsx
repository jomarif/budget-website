// Add or edit a single entry (expense or income) via a popup modal form.

import { useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import Modal from './Modal.jsx';
import { toDateInputValue, fromDateInputValue } from '../lib/dates.js';

export default function ExpenseFormModal({ entry, onClose }) {
  const { activeBudget, dispatch } = useBudget();
  const isEdit = Boolean(entry);

  const [name, setName] = useState(entry?.name || '');
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [type, setType] = useState(entry?.type || 'expense');
  const [categoryId, setCategoryId] = useState(
    entry?.categoryId || activeBudget.categories[0]?.id || ''
  );
  const [dateValue, setDateValue] = useState(
    toDateInputValue(entry?.date || new Date().toISOString())
  );
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim()) return setError('Give it a name 💕');
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter an amount greater than 0');

    const payload = {
      name: name.trim(),
      amount: Math.round(amt * 100) / 100,
      type,
      categoryId: type === 'income' ? (categoryId || null) : categoryId,
      date: fromDateInputValue(dateValue),
    };

    if (isEdit) {
      dispatch({ type: 'UPDATE_ENTRY', entry: { id: entry.id, ...payload } });
    } else {
      dispatch({ type: 'ADD_ENTRY', entry: payload });
    }
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Edit entry' : 'New entry ✨'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Type</label>
          <div className="type-toggle">
            <button
              type="button"
              className={`${type === 'expense' ? 'active expense' : ''}`}
              onClick={() => setType('expense')}
            >
              💸 Expense
            </button>
            <button
              type="button"
              className={`${type === 'income' ? 'active income' : ''}`}
              onClick={() => setType('income')}
            >
              💚 Income
            </button>
          </div>
        </div>

        <div className="field">
          <label>Name</label>
          <input
            className="input"
            autoFocus
            value={name}
            placeholder={type === 'income' ? 'e.g. Paycheck' : 'e.g. Boba with friends'}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Amount</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              placeholder="0.00"
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Date</label>
            <input
              className="input"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Category</label>
          <select
            className="select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {type === 'income' && <option value="">— None —</option>}
            {activeBudget.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="hint" style={{ color: 'var(--over-budget)' }}>{error}</div>}

        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
