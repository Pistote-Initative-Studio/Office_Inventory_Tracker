import React, { useEffect, useState } from 'react';
import './Modal.css';
import { apiFetch } from './api';

function SettingsModal({ onClose }) {
  const [theme, setTheme] = useState('light');
  const [defaultTab, setDefaultTab] = useState('Inventory');
  const [emailNotify, setEmailNotify] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const res = await apiFetch('http://localhost:5000/api/settings');
      if (res.ok) {
        const d = await res.json();
        if (d.data) {
          setTheme(d.data.theme || 'light');
          setDefaultTab(d.data.default_tab || 'Inventory');
          setEmailNotify(Boolean(d.data.email_notifications));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    await apiFetch('http://localhost:5000/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme,
        default_tab: defaultTab,
        email_notifications: emailNotify ? 1 : 0,
      }),
    });
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('defaultTab', defaultTab);
    localStorage.setItem('theme', theme);
    setMessage('Saved!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          x
        </button>
        <h3>Settings</h3>
        <div>
          <label>
            <input
              type="checkbox"
              checked={theme === 'dark'}
              onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
            />
            Dark Theme
          </label>
        </div>
        <div>
          <label>
            Default Tab{' '}
            <select value={defaultTab} onChange={(e) => setDefaultTab(e.target.value)}>
              <option value="Inventory">Inventory</option>
              <option value="Purchases">Purchase</option>
              <option value="Trends">Trends</option>
              <option value="Reports">Reports</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={emailNotify}
              onChange={(e) => setEmailNotify(e.target.checked)}
            />
            Email notifications
          </label>
        </div>
        <button onClick={save}>Save</button>
        {message && <div className="status-message">{message}</div>}
      </div>
    </div>
  );
}

export default SettingsModal;
