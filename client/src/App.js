import React, { useState } from 'react';
import './App.css';
import InventoryTable from './InventoryTable';

function App() {
  const [refreshFlag, setRefreshFlag] = useState(0);

  const triggerRefresh = () => {
    setRefreshFlag((prev) => prev + 1);
  };

  return (
    <div className="App">
      <h1>Office Supply Manager</h1>
      <InventoryTable refreshFlag={refreshFlag} />
    </div>
  );
}

export default App;
