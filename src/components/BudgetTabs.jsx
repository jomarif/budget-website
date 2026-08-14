// Per-person budget tabs. Add / rename / delete profiles.

import { useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import Modal from './Modal.jsx';

const PROFILE_EMOJI = ['🌸', '🦄', '🐰', '🐣', '🌷', '⭐', '🍓', '🧁', '🐨', '🌈', '💜', '🐷'];

function BudgetModal({ initial, onSave, onDelete, onClose, canDelete }) {
  const [name, setName] = useState(initial?.name || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '🌸');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), emoji });
  }

  return (
    <Modal title={initial ? 'Edit profile' : 'New profile'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Name</label>
          <input
            className="input"
            value={name}
            autoFocus
            placeholder="e.g. Jomari, Roomie, Vacation…"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Icon</label>
          <div className="picker-grid">
            {PROFILE_EMOJI.map((em) => (
              <button
                type="button"
                key={em}
                className={emoji === em ? 'active' : ''}
                onClick={() => setEmoji(em)}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          {initial && canDelete && (
            <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}

export default function BudgetTabs() {
  const { state, dispatch } = useBudget();
  const confirm = useConfirm();
  const [modal, setModal] = useState(null); // { mode: 'new' } | { mode: 'edit', budget }

  return (
    <>
      <div className="tabs">
        {state.budgets.map((b) => (
          <button
            key={b.id}
            className={`tab${b.id === state.activeBudgetId ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_BUDGET', id: b.id })}
          >
            <span>{b.emoji}</span>
            <span>{b.name}</span>
            <span
              className="tab-edit"
              role="button"
              tabIndex={0}
              title="Edit profile"
              onClick={(e) => {
                e.stopPropagation();
                setModal({ mode: 'edit', budget: b });
              }}
            >
              ✎
            </span>
          </button>
        ))}
        <button className="tab-add" title="Add profile" onClick={() => setModal({ mode: 'new' })}>
          +
        </button>
      </div>

      {modal?.mode === 'new' && (
        <BudgetModal
          onClose={() => setModal(null)}
          onSave={({ name, emoji }) => {
            dispatch({ type: 'ADD_BUDGET', name, emoji });
            setModal(null);
          }}
        />
      )}

      {modal?.mode === 'edit' && (
        <BudgetModal
          initial={modal.budget}
          canDelete={state.budgets.length > 1}
          onClose={() => setModal(null)}
          onSave={({ name, emoji }) => {
            dispatch({ type: 'RENAME_BUDGET', id: modal.budget.id, name, emoji });
            setModal(null);
          }}
          onDelete={async () => {
            if (await confirm({
              title: 'Delete profile?',
              message: `“${modal.budget.name}” and all its entries, categories, goals and recurring rules will be permanently deleted.`,
              confirmLabel: 'Delete',
              danger: true,
            })) {
              dispatch({ type: 'DELETE_BUDGET', id: modal.budget.id });
              setModal(null);
            }
          }}
        />
      )}
    </>
  );
}
