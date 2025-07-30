import React, { useState } from 'react';
import './App.css';
import InventoryTable from './InventoryTable';
import Purchases from './Purchases';
import Trends from './Trends';
import Reports from './Reports';
import Auth from './Auth';
import AdminPanel from './AdminPanel';

function App() {
  const [inventoryFlag, setInventoryFlag] = useState(0);
  const [activeTab, setActiveTab] = useState('Inventory');
  const [trendsMode, setTrendsMode] = useState('Quantity');
  const [role, setRole] = useState(localStorage.getItem('role') || '');

  const triggerInventoryChange = () => {
    setInventoryFlag((prev) => prev + 1);
  };

  if (!localStorage.getItem('token')) {
    return <Auth onAuth={(r) => setRole(r)} />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1 className="app-title">Office Supply Manager</h1>
        <button
          className="logout-btn"
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            window.location.reload();
          }}
        >
          Logout
        </button>
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
        {role === 'admin' && (
          <button
            className={activeTab === 'Admin' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('Admin')}
          >
            Admin
          </button>
        )}
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
