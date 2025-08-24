import React, { useState, useEffect } from 'react';
import './App.css';
import InventoryTable from './InventoryTable';
import Purchases from './Purchases';
import Trends from './Trends';
import Reports from './Reports';
import AdBanner from './components/AdBanner';

function App() {
  const [inventoryFlag, setInventoryFlag] = useState(0);
  const [activeTab, setActiveTab] = useState('Inventory');
  const [trendsMode, setTrendsMode] = useState('Quantity');

  useEffect(() => {
    document.title = 'Inventory Manager';
  }, []);

  const triggerInventoryChange = () => {
    setInventoryFlag((prev) => prev + 1);
  };

  return (
    <div className="App app-root">
      <header className="app-header">
        <h1 className="app-title">Inventory Manager</h1>
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
      </div>
      <AdBanner />
    </div>
  );
}

export default App;
