// Manage recurring rules (rent, subscriptions, allowance…). New/deleted rules
// are materialized into entries on next app load via catchUpRecurring(); adding
// one here also generates any occurrences due up to today immediately.

import { useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { toDateInputValue, fromDateInputValue } from '../lib/dates.js';
import { formatMoney } from '../lib/money.js';
import Modal from './Modal.jsx';

function RuleForm({ categories, onAdd, onCancel }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [frequency, setFrequency] = useState('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [startDate, setStartDate] = useState(toDateInputValue(new Date().toISOString()));
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim()) return setError('Give it a name');
    if (!Number.isFinite(amt) || amt <= 0) return setError('Amount must be greater than 0');
    const rule = {
      name: name.trim(),
      amount: Math.round(amt * 100) / 100,
      type,
      categoryId: type === 'income' ? (categoryId || null) : categoryId,
      frequency,
      startDate: fromDateInputValue(startDate),
      lastGeneratedDate: null,
    };
    if (frequency === 'monthly') rule.dayOfMonth = Math.min(28, Math.max(1, parseInt(dayOfMonth, 10) || 1));
    onAdd(rule);
  }

  return (
    <form onSubmit={submit} style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
      <div className="field">
        <label>Name</label>
        <input className="input" autoFocus value={name} placeholder="e.g. Rent, Spotify"
          onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Amount</label>
          <input className="input" type="number" min="0" step="0.01" value={amount}
            placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="field">
          <label>Type</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">💸 Expense</option>
            <option value="income">💚 Income</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label>Category</label>
        <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {type === 'income' && <option value="">— None —</option>}
          {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Repeats</label>
          <select className="select" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        {frequency === 'monthly' && (
          <div className="field">
            <label>Day of month</label>
            <input className="input" type="number" min="1" max="28" value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)} />
          </div>
        )}
      </div>
      <div className="field">
        <label>Starting from</label>
        <input className="input" type="date" value={startDate}
          onChange={(e) => setStartDate(e.target.value)} />
      </div>
      {error && <div className="hint" style={{ color: 'var(--over-budget)' }}>{error}</div>}
      <div className="modal-actions">
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Add rule</button>
      </div>
    </form>
  );
}

function ruleSummary(rule, categories) {
  const cat = categories.find((c) => c.id === rule.categoryId);
  const when = rule.frequency === 'monthly'
    ? `on day ${rule.dayOfMonth} each month`
    : 'every week';
  return `${formatMoney(rule.amount)} · ${cat ? `${cat.emoji} ${cat.name}` : 'No category'} · ${when}`;
}

export default function RecurringManager({ onClose }) {
  const { activeBudget, dispatch } = useBudget();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);

  function addRule(rule) {
    // The reducer adds the rule and materializes any already-due occurrences.
    dispatch({ type: 'ADD_RECURRING', rule });
    setAdding(false);
  }

  return (
    <Modal title="🔁 Recurring entries" onClose={onClose} wide>
      <p className="muted" style={{ marginTop: 0 }}>
        Recurring entries are added automatically each time you open the app.
      </p>

      <div style={{ maxHeight: '48vh', overflowY: 'auto', marginBottom: 8 }}>
        {activeBudget.recurring.length === 0 ? (
          <div className="center-note">No recurring entries yet 🌼</div>
        ) : (
          activeBudget.recurring.map((r) => (
            <div className="cat-manage-row" key={r.id}>
              <span className="swatch" style={{ background: 'var(--pink-100)' }}>
                {r.type === 'income' ? '💚' : '🔁'}
              </span>
              <span className="cname">
                {r.name}
                <div className="cbudget muted" style={{ fontWeight: 600 }}>
                  {ruleSummary(r, activeBudget.categories)}
                </div>
              </span>
              <button className="btn btn-icon btn-ghost" title="Delete"
                onClick={async () => {
                  if (await confirm({
                    title: 'Stop recurring rule?',
                    message: `“${r.name}” won't generate new entries. Already-added entries stay.`,
                    confirmLabel: 'Stop',
                    danger: true,
                  })) {
                    dispatch({ type: 'DELETE_RECURRING', id: r.id });
                  }
                }}>🗑️</button>
            </div>
          ))
        )}
      </div>

      {adding ? (
        <RuleForm categories={activeBudget.categories} onAdd={addRule} onCancel={() => setAdding(false)} />
      ) : (
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add recurring</button>
      )}
    </Modal>
  );
}
