import React from 'react';
import { exportAll, importAll } from './localdb/store';
import './Modal.css';

function SettingsModal({ onClose }) {
  const handleBackup = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const payload = JSON.parse(text);
    const ok = window.confirm('Restore will replace current data. Continue?');
    if (!ok) return;
    await importAll(payload, { replace: true });
    alert('Restore complete. Reloading.');
    window.location.reload();
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" type="button" onClick={onClose}>
          ×
        </button>
        <h2>Settings</h2>
        <button onClick={handleBackup}>Backup (Download JSON)</button>
        <label className="file-upload">
          Restore (Upload JSON)
          <input type="file" accept="application/json" onChange={handleRestore} />
        </label>
        <p>Data is stored locally in your browser. Use Backup before clearing browser data.</p>
      </div>
    </div>
  );
}

export default SettingsModal;
