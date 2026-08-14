// Manage categories for the active budget: add, edit (name/emoji/color/monthly
// cap), and delete. Opened as a modal from the app toolbar.

import { useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import Modal from './Modal.jsx';
import { EMOJI_CHOICES, CATEGORY_COLORS } from '../lib/defaults.js';
import { formatMoney } from '../lib/money.js';

function CategoryEditor({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [emoji, setEmoji] = useState(initial?.emoji || EMOJI_CHOICES[0]);
  const [color, setColor] = useState(initial?.color || CATEGORY_COLORS[0]);
  const [budget, setBudget] = useState(
    initial?.monthlyBudget != null ? String(initial.monthlyBudget) : ''
  );
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Name required');
    const cap = budget.trim() === '' ? null : parseFloat(budget);
    if (cap != null && (!Number.isFinite(cap) || cap < 0)) return setError('Invalid budget');
    onSave({ name: name.trim(), emoji, color, monthlyBudget: cap });
  }

  return (
    <form onSubmit={submit} style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
      <div className="field">
        <label>Name</label>
        <input className="input" autoFocus value={name} placeholder="Category name"
          onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Emoji</label>
        <div className="picker-grid">
          {EMOJI_CHOICES.map((em) => (
            <button type="button" key={em} className={emoji === em ? 'active' : ''}
              onClick={() => setEmoji(em)}>{em}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Color</label>
        <div className="color-grid">
          {CATEGORY_COLORS.map((col) => (
            <button type="button" key={col} className={color === col ? 'active' : ''}
              style={{ background: col }} aria-label={col} onClick={() => setColor(col)} />
          ))}
        </div>
      </div>
      <div className="field">
        <label>Monthly budget cap <span className="muted">(optional)</span></label>
        <input className="input" type="number" min="0" step="0.01" inputMode="decimal"
          value={budget} placeholder="No cap" onChange={(e) => setBudget(e.target.value)} />
      </div>
      {error && <div className="hint" style={{ color: 'var(--over-budget)' }}>{error}</div>}
      <div className="modal-actions">
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save</button>
      </div>
    </form>
  );
}

export default function CategoryManager({ onClose }) {
  const { activeBudget, dispatch } = useBudget();
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState(null); // category id | 'new' | null

  return (
    <Modal title="🏷️ Manage categories" onClose={onClose} wide>
      <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: 8 }}>
        {activeBudget.categories.map((c) => (
          <div key={c.id}>
            <div className="cat-manage-row">
              <span className="swatch" style={{ background: `${c.color}33` }}>{c.emoji}</span>
              <span className="cname">{c.name}</span>
              {c.monthlyBudget ? (
                <span className="cbudget">{formatMoney(c.monthlyBudget)}/mo</span>
              ) : (
                <span className="cbudget muted">no cap</span>
              )}
              <button className="btn btn-icon btn-ghost" title="Edit"
                onClick={() => setEditingId(editingId === c.id ? null : c.id)}>✎</button>
              <button className="btn btn-icon btn-ghost" title="Delete"
                onClick={async () => {
                  if (await confirm({
                    title: 'Delete category?',
                    message: `“${c.name}” will be removed. Existing entries will show as Uncategorized.`,
                    confirmLabel: 'Delete',
                    danger: true,
                  })) {
                    dispatch({ type: 'DELETE_CATEGORY', id: c.id });
                  }
                }}>🗑️</button>
            </div>
            {editingId === c.id && (
              <CategoryEditor
                initial={c}
                onCancel={() => setEditingId(null)}
                onSave={(cat) => {
                  dispatch({ type: 'UPDATE_CATEGORY', category: { id: c.id, ...cat } });
                  setEditingId(null);
                }}
              />
            )}
          </div>
        ))}
      </div>

      {editingId === 'new' ? (
        <CategoryEditor
          onCancel={() => setEditingId(null)}
          onSave={(cat) => {
            dispatch({ type: 'ADD_CATEGORY', category: cat });
            setEditingId(null);
          }}
        />
      ) : (
        <button className="btn btn-primary" onClick={() => setEditingId('new')}>
          + Add category
        </button>
      )}
    </Modal>
  );
}
