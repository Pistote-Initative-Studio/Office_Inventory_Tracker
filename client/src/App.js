import React, { useState } from 'react';
import './App.css';
import AddItemForm from './AddItemForm';
import InventoryTable from './InventoryTable';

function App() {
  const [refreshFlag, setRefreshFlag] = useState(0);

  const triggerRefresh = () => {
    setRefreshFlag((prev) => prev + 1);
  };

  return (
    <div className="App">
      <h1>Office Inventory Tracker</h1>
      <AddItemForm onAdd={triggerRefresh} />
      <InventoryTable refreshFlag={refreshFlag} />
    </div>
  );
}

export default App;
