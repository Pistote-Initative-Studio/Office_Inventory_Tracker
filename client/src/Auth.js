import React, { useState } from 'react';
import './App.css';
import './Auth.css';
import { apiFetch } from './api';

function Auth({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('business');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isLogin ? 'http://localhost:5000/api/login' : 'http://localhost:5000/api/register';
    const payload = isLogin
      ? { username, password }
      : { username, password, accountType, businessName };
    const res = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      if (data.businessId !== undefined) {
        localStorage.setItem('businessId', data.businessId);
      }
      localStorage.setItem('username', username);
      onAuth(data.role, username);
    } else {
      setError(data.error || 'Failed');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          {!isLogin && (
            <>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                <option value="business">Business</option>
                <option value="personal">Personal</option>
              </select>
              {accountType === 'business' && (
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Business Name"
                />
              )}
            </>
          )}
          <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
        </form>
        {error && <div className="error-msg">{error}</div>}
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="link-btn"
        >
          {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
        </button>
      </div>
    </div>
  );
}

export default Auth;
