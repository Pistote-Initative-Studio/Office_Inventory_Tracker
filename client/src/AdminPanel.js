import React, { useEffect, useState } from 'react';
import { apiFetch } from './api';
import './App.css';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const role = localStorage.getItem('role');

  const load = async () => {
    const res = await apiFetch('http://localhost:5000/api/users');
    const data = await res.json();
    if (res.ok) setUsers(data.data || []);
    else setError('Failed to load users');
  };

  useEffect(() => { load(); }, []);

  if (role !== 'admin') {
    return <div>Admin only</div>;
  }

  const changeRole = async (id, role) => {
    await apiFetch(`http://localhost:5000/api/users/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    load();
  };

  const deleteUser = async (id) => {
    await apiFetch(`http://localhost:5000/api/users/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="admin-panel">
      <h3>User Management</h3>
      {error && <div className="error-msg">{error}</div>}
      <table>
        <thead>
          <tr><th>Username</th><th>Role</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td>
                <button onClick={() => changeRole(u.id, u.role === 'admin' ? 'employee' : 'admin')}>
                  {u.role === 'admin' ? 'Demote' : 'Promote'}
                </button>
                <button onClick={() => deleteUser(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPanel;
