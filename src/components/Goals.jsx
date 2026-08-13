// Savings goals / targets (e.g. a hoodie). Each goal has a target amount and a
// fill-up progress bar you top up with contributions.

import { useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { formatMoney, sum } from '../lib/money.js';
import { GOAL_EMOJI_CHOICES } from '../lib/defaults.js';
import Modal from './Modal.jsx';

// A goal's saved amount is the sum of the expense entries linked to it.
function savedForGoal(goalId, entries) {
  return sum(entries.filter((e) => e.goalId === goalId).map((e) => e.amount));
}

function GoalModal({ initial, onClose, onSave, onDelete }) {
  const [name, setName] = useState(initial?.name || '');
  const [target, setTarget] = useState(initial ? String(initial.targetAmount) : '');
  const [emoji, setEmoji] = useState(initial?.emoji || '🎯');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const amt = parseFloat(target);
    if (!name.trim()) return setError('Name your goal 💖');
    if (!Number.isFinite(amt) || amt <= 0) return setError('Target must be greater than 0');
    onSave({ name: name.trim(), targetAmount: Math.round(amt * 100) / 100, emoji });
  }

  return (
    <Modal title={initial ? 'Edit goal' : 'New goal 🎯'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>What are you saving for?</label>
          <input className="input" autoFocus value={name} placeholder="e.g. Pink hoodie"
            onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Target amount</label>
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal"
            value={target} placeholder="0.00" onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div className="field">
          <label>Icon</label>
          <div className="picker-grid">
            {GOAL_EMOJI_CHOICES.map((em) => (
              <button type="button" key={em} className={emoji === em ? 'active' : ''}
                onClick={() => setEmoji(em)}>{em}</button>
            ))}
          </div>
        </div>
        {error && <div className="hint" style={{ color: 'var(--over-budget)' }}>{error}</div>}
        <div className="modal-actions">
          {initial && (
            <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}

function ContributeModal({ goal, saved, onClose, onAdd }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const remaining = Math.max(0, goal.targetAmount - saved);

  function submit(e) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter an amount greater than 0');
    onAdd(Math.round(amt * 100) / 100);
  }

  return (
    <Modal title={`${goal.emoji} Add to “${goal.name}”`} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted" style={{ marginTop: 0 }}>
          {formatMoney(saved)} saved · {formatMoney(remaining)} to go
        </p>
        <div className="field">
          <label>How much are you adding?</label>
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal" autoFocus
            value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="section-actions">
          {[5, 10, 20, 50].map((q) => (
            <button type="button" key={q} className="btn btn-sm"
              onClick={() => setAmount(String(q))}>+${q}</button>
          ))}
          {remaining > 0 && (
            <button type="button" className="btn btn-sm"
              onClick={() => setAmount(String(remaining))}>Fill it 🎉</button>
          )}
        </div>
        {error && <div className="hint" style={{ color: 'var(--over-budget)' }}>{error}</div>}
        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Add</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Goals() {
  const { activeBudget, dispatch } = useBudget();
  const [modal, setModal] = useState(null); // {mode:'new'} | {mode:'edit',goal} | {mode:'contribute',goal}

  const goals = activeBudget.goals;

  return (
    <div className="card">
      <div className="card-title">
        🎯 Goals
        <span className="sub">
          <button className="btn btn-sm btn-primary" onClick={() => setModal({ mode: 'new' })}>
            + New goal
          </button>
        </span>
      </div>

      {goals.length === 0 ? (
        <div className="center-note">No goals yet — save up for something cute! 🧸</div>
      ) : (
        <div className="grid">
          {goals.map((g) => {
            const saved = savedForGoal(g.id, activeBudget.entries);
            const pct = g.targetAmount ? Math.min(100, (saved / g.targetAmount) * 100) : 0;
            const done = saved >= g.targetAmount;
            return (
              <div className="goal-card" key={g.id}>
                <div className="goal-head">
                  <span className="goal-emoji">{g.emoji}</span>
                  <span className="goal-name">{g.name}</span>
                  <button className="btn btn-icon btn-ghost" title="Edit"
                    onClick={() => setModal({ mode: 'edit', goal: g })}>✎</button>
                </div>
                <div className="progress">
                  <div className="fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="goal-amounts">
                  {done ? (
                    <span className="goal-done">🎉 Reached! {formatMoney(saved)}</span>
                  ) : (
                    <>
                      <span className="saved">{formatMoney(saved)}</span>
                      {' '}of {formatMoney(g.targetAmount)} · {Math.round(pct)}%
                    </>
                  )}
                </div>
                {!done && (
                  <button className="btn btn-sm btn-primary" style={{ alignSelf: 'flex-start' }}
                    onClick={() => setModal({ mode: 'contribute', goal: g })}>
                    💰 Add money
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal?.mode === 'new' && (
        <GoalModal
          onClose={() => setModal(null)}
          onSave={(goal) => { dispatch({ type: 'ADD_GOAL', goal }); setModal(null); }}
        />
      )}
      {modal?.mode === 'edit' && (
        <GoalModal
          initial={modal.goal}
          onClose={() => setModal(null)}
          onSave={(goal) => { dispatch({ type: 'UPDATE_GOAL', goal: { id: modal.goal.id, ...goal } }); setModal(null); }}
          onDelete={() => {
            if (window.confirm(`Delete goal “${modal.goal.name}”?`)) {
              dispatch({ type: 'DELETE_GOAL', id: modal.goal.id });
              setModal(null);
            }
          }}
        />
      )}
      {modal?.mode === 'contribute' && (
        <ContributeModal
          goal={modal.goal}
          saved={savedForGoal(modal.goal.id, activeBudget.entries)}
          onClose={() => setModal(null)}
          onAdd={(amount) => {
            dispatch({ type: 'ADD_CONTRIBUTION', goalId: modal.goal.id, amount });
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
