import React, { useEffect, useState } from 'react';
import './Modal.css';
import { apiFetch } from './api';

function AccountModal({ onClose }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [business, setBusiness] = useState('');
  const [password, setPassword] = useState('');
  const [lowAlert, setLowAlert] = useState(true);
  const [poUpdate, setPoUpdate] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const res = await apiFetch('http://localhost:5000/api/me');
      if (res.ok) {
        const data = await res.json();
        setFullName(data.data.full_name || '');
        setEmail(data.data.username);
        setRole(data.data.role);
        setBusiness(data.data.businessName || '');
      }
      const res2 = await apiFetch('http://localhost:5000/api/settings');
      if (res2.ok) {
        const d = await res2.json();
        if (d.data) {
          setLowAlert(Boolean(d.data.low_stock_alerts));
          setPoUpdate(Boolean(d.data.po_updates));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    await apiFetch('http://localhost:5000/api/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, password: password || undefined }),
    });
    await apiFetch('http://localhost:5000/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        low_stock_alerts: lowAlert ? 1 : 0,
        po_updates: poUpdate ? 1 : 0,
      }),
    });
    setPassword('');
    setMessage('Saved!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          x
        </button>
        <h3>Account</h3>
        <div>
          <label>Full Name </label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label>Email </label>
          <input value={email} readOnly />
        </div>
        <div>
          <label>Role </label>
          <input value={role} readOnly />
        </div>
        {business && (
          <div>
            <label>Business </label>
            <input value={business} readOnly />
          </div>
        )}
        <div>
          <label>New Password </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={lowAlert}
              onChange={(e) => setLowAlert(e.target.checked)}
            />
            Low stock alerts
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={poUpdate}
              onChange={(e) => setPoUpdate(e.target.checked)}
            />
            Purchase order updates
          </label>
        </div>
        <button onClick={save}>Save</button>
        {message && <div className="status-message">{message}</div>}
      </div>
    </div>
  );
}

export default AccountModal;
