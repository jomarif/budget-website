// App-wide confirmation dialog. Replaces native window.confirm() with a styled
// modal. Usage:
//   const confirm = useConfirm();
//   if (await confirm({ title: 'Delete?', message: '…', danger: true })) { … }
// Resolves true on confirm, false on cancel/close.

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from '../components/Modal.jsx';

const ConfirmContext = createContext(null);

const DEFAULTS = {
  title: 'Are you sure?',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
};

export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null); // null = closed
  const resolverRef = useRef(null);

  const confirm = useCallback((opts = {}) => {
    setOptions({ ...DEFAULTS, ...opts });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <Modal title={options.title} onClose={() => settle(false)}>
          {options.message && <p className="confirm-message">{options.message}</p>}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => settle(false)} autoFocus>
              {options.cancelLabel}
            </button>
            <button
              className={`btn ${options.danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => settle(true)}
            >
              {options.confirmLabel}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
