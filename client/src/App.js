import React, { useState } from 'react';
import './App.css';
import InventoryTable from './InventoryTable';
import Purchases from './Purchases';
import Trends from './Trends';
import Reports from './Reports';
import Auth from './Auth';
import AdminPanel from './AdminPanel';
import UserAvatar from './UserAvatar';

function App() {
  const [inventoryFlag, setInventoryFlag] = useState(0);
  const [activeTab, setActiveTab] = useState('Inventory');
  const [trendsMode, setTrendsMode] = useState('Quantity');
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  const triggerInventoryChange = () => {
    setInventoryFlag((prev) => prev + 1);
  };

  if (!localStorage.getItem('token')) {
    return <Auth onAuth={(r, u) => { setRole(r); setUsername(u); }} />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1 className="app-title">Office Supply Manager</h1>
        <UserAvatar
          username={username}
          role={role}
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('username');
            window.location.reload();
          }}
          onUserManagement={() => setActiveTab('Admin')}
        />
      </header>
      <div className="tabs">
        <button
          className={activeTab === 'Inventory' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('Inventory')}
        >
          Inventory
        </button>
        <button
          className={activeTab === 'Purchases' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('Purchases')}
        >
          Purchases
        </button>
        <button
          className={activeTab === 'Trends' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('Trends')}
        >
          Trends
        </button>
        <button
          className={activeTab === 'Reports' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('Reports')}
        >
          Reports
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'Inventory' && (
          <div className="content-box">
            <InventoryTable
              refreshFlag={inventoryFlag}
              onInventoryChange={triggerInventoryChange}
            />
          </div>
        )}
        {activeTab === 'Purchases' && (
          <div className="content-box">
            <Purchases refreshFlag={inventoryFlag} />
          </div>
        )}
        {activeTab === 'Trends' && (
          <div className="content-box">
            <Trends mode={trendsMode} onModeChange={setTrendsMode} />
          </div>
        )}
        {activeTab === 'Reports' && (
          <div className="content-box">
            <Reports />
          </div>
        )}
        {activeTab === 'Admin' && role === 'admin' && (
          <div className="content-box">
            <AdminPanel />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
