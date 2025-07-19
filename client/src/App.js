import React, { useState } from 'react';
import './App.css';
import InventoryTable from './InventoryTable';
import Purchases from './Purchases';
import Trends from './Trends';

function App() {
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [activeTab, setActiveTab] = useState('Inventory');

  const triggerRefresh = () => {
    setRefreshFlag((prev) => prev + 1);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1 className="app-title">Office Supply Manager</h1>
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
      </div>
      <div className="tab-content">
        {activeTab === 'Inventory' && <InventoryTable refreshFlag={refreshFlag} />}
        {activeTab === 'Purchases' && <Purchases />}
        {activeTab === 'Trends' && <Trends />}
      </div>
    </div>
  );
}

export default App;
