// Backup (download JSON) and restore (upload JSON) — the manual "sync" and
// safety net for localStorage. Import replaces all data after confirmation.

import { useRef } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { exportToJSON, parseImportedJSON } from '../lib/storage.js';

export default function ExportImport() {
  const { state, dispatch } = useBudget();
  const fileRef = useRef(null);

  function handleExport() {
    const json = exportToJSON(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `budget-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseImportedJSON(String(reader.result));
        if (window.confirm('This will replace ALL current data with the file’s contents. Continue?')) {
          dispatch({ type: 'REPLACE_STATE', state: imported });
        }
      } catch (err) {
        window.alert(`Could not import: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // allow re-importing the same file
  }

  return (
    <div className="section-actions">
      <button className="btn btn-sm" onClick={handleExport}>⬇️ Export</button>
      <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>⬆️ Import</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
    </div>
  );
}
