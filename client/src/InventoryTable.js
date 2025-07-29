import React, { useEffect, useState } from 'react';
import './InventoryTable.css';
import AddItemForm from './AddItemForm';

function InventoryTable({ refreshFlag, onInventoryChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editApiError, setEditApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cellHighlight, setCellHighlight] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  useEffect(() => {
    if (successMsg || editApiError) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setEditApiError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, editApiError]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/inventory');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const list = (data.data || []).map((it) => ({
        ...it,
        // normalize camelCase for easier access in the UI
        restockThreshold:
          it.restockThreshold !== undefined
            ? it.restockThreshold
            : it.restock_threshold,
      }));
      setItems(list);
    } catch (err) {
      console.error(err);
      alert('Error fetching inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [refreshFlag]);

  useEffect(() => {
    let data = items;
    if (selectedCategory) {
      data = data.filter((item) => item.category === selectedCategory);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          (item.category && item.category.toLowerCase().includes(term))
      );
    }
    setFilteredData(data);
  }, [items, searchTerm, selectedCategory]);

  const sortedData = React.useMemo(() => {
    const data = [...filteredData];
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortConfig.direction === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    return data;
  }, [filteredData, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/inventory/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (onInventoryChange) onInventoryChange();
    } catch (err) {
      console.error(err);
      alert('Error deleting item');
    }
  };

  const startEdit = (id, field, value) => {
    setEditingCell({ id, field, value });
    setEditApiError('');
    setSuccessMsg('');
  };

  const handleCellChange = (e) => {
    setEditingCell((prev) => ({ ...prev, value: e.target.value }));
  };

  const saveCell = async () => {
    if (!editingCell) return;
    const item = items.find((it) => it.id === editingCell.id);
    if (!item) return;
    const updated = { ...item, [editingCell.field]: editingCell.value };
    try {
      const res = await fetch(`http://localhost:5000/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updated.name,
          category: updated.category,
          quantity: Number(updated.quantity),
          unit: updated.unit,
          restock_threshold: Number(updated.restock_threshold),
          supplier: updated.supplier,
        }),
      });
      if (!res.ok) {
        const data = res.status === 400 ? await res.json() : null;
        setEditApiError(data?.error || 'Failed to update');
        return;
      }
      setItems((prev) =>
        prev.map((it) => (it.id === updated.id ? updated : it))
      );
      setEditingCell(null);
      setEditApiError('');
      setSuccessMsg('Item updated successfully!');
      setCellHighlight({ id: updated.id, field: editingCell.field });
      setTimeout(() => setCellHighlight(null), 1000);
      if (onInventoryChange) onInventoryChange();
    } catch (err) {
      console.error(err);
      setEditApiError('Error updating item');
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditApiError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveCell();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchItems();
    if (onInventoryChange) onInventoryChange();
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
      }
    };
    if (showAddModal) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showAddModal]);

  const statusMessage = successMsg || editApiError;
  const statusType = successMsg ? 'success-message' : 'error-message';

  return (
    <div className="inventory-table">
      <div className="status-message-container">
        {statusMessage && (
          <div className={`status-message ${statusType}`}>{statusMessage}</div>
        )}
      </div>
      <div className="toolbar">
        <button onClick={fetchItems}>Refresh</button>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {Array.from(new Set(items.map((it) => it.category))).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setShowAddModal(true)}>
          Add Item
        </button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('id')}>
                ID
                {sortConfig.key === 'id' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('name')}>
                Name
                {sortConfig.key === 'name' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('category')}>
                Category
                {sortConfig.key === 'category' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('quantity')}>
                Quantity
                {sortConfig.key === 'quantity' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('unit')}>
                Unit
                {sortConfig.key === 'unit' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('restock_threshold')}>
                Restock Threshold
                {sortConfig.key === 'restock_threshold' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('supplier')}>
                Supplier
                {sortConfig.key === 'supplier' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              {/* Rename the Actions column to make it clear that only deletion is possible now that inline editing is supported. */}
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => (
              <tr
                key={item.id}
                className={
                  item.restockThreshold != null &&
                  Number(item.quantity) <= Number(item.restockThreshold)
                    ? 'low-stock'
                    : ''
                }
              >
                <td>{item.id}</td>
                <td
                  className={`editable-cell ${
                    cellHighlight &&
                    cellHighlight.id === item.id &&
                    cellHighlight.field === 'name'
                      ? 'cell-highlight'
                      : ''
                  }`}
                  onClick={() =>
                    !editingCell && startEdit(item.id, 'name', item.name)
                  }
                >
                  {editingCell &&
                  editingCell.id === item.id &&
                  editingCell.field === 'name' ? (
                    <input
                      type="text"
                      className="inline-input"
                      autoFocus
                      value={editingCell.value}
                      onChange={handleCellChange}
                      onBlur={saveCell}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <>
                      {item.name}
                      <span className="pencil-icon" />
                    </>
                  )}
                </td>
                <td
                  className={`editable-cell ${
                    cellHighlight &&
                    cellHighlight.id === item.id &&
                    cellHighlight.field === 'category'
                      ? 'cell-highlight'
                      : ''
                  }`}
                  onClick={() =>
                    !editingCell && startEdit(item.id, 'category', item.category)
                  }
                >
                  {editingCell &&
                  editingCell.id === item.id &&
                  editingCell.field === 'category' ? (
                    <input
                      type="text"
                      className="inline-input"
                      autoFocus
                      value={editingCell.value}
                      onChange={handleCellChange}
                      onBlur={saveCell}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <>
                      {item.category}
                      <span className="pencil-icon" />
                    </>
                  )}
                </td>
                <td
                  className={`editable-cell ${
                    cellHighlight &&
                    cellHighlight.id === item.id &&
                    cellHighlight.field === 'quantity'
                      ? 'cell-highlight'
                      : ''
                  }`}
                  onClick={() =>
                    !editingCell && startEdit(item.id, 'quantity', item.quantity)
                  }
                >
                  {editingCell &&
                  editingCell.id === item.id &&
                  editingCell.field === 'quantity' ? (
                    <input
                      type="text"
                      className="inline-input"
                      autoFocus
                      value={editingCell.value}
                      onChange={handleCellChange}
                      onBlur={saveCell}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <>
                      {item.quantity}
                      <span className="pencil-icon" />
                    </>
                  )}
                </td>
                <td
                  className={`editable-cell ${
                    cellHighlight &&
                    cellHighlight.id === item.id &&
                    cellHighlight.field === 'unit'
                      ? 'cell-highlight'
                      : ''
                  }`}
                  onClick={() =>
                    !editingCell && startEdit(item.id, 'unit', item.unit)
                  }
                >
                  {editingCell &&
                  editingCell.id === item.id &&
                  editingCell.field === 'unit' ? (
                    <input
                      type="text"
                      className="inline-input"
                      autoFocus
                      value={editingCell.value}
                      onChange={handleCellChange}
                      onBlur={saveCell}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <>
                      {item.unit}
                      <span className="pencil-icon" />
                    </>
                  )}
                </td>
                <td
                  className={`editable-cell ${
                    cellHighlight &&
                    cellHighlight.id === item.id &&
                    cellHighlight.field === 'restock_threshold'
                      ? 'cell-highlight'
                      : ''
                  }`}
                  onClick={() =>
                    !editingCell &&
                    startEdit(
                      item.id,
                      'restock_threshold',
                      item.restock_threshold
                    )
                  }
                >
                  {editingCell &&
                  editingCell.id === item.id &&
                  editingCell.field === 'restock_threshold' ? (
                    <input
                      type="text"
                      className="inline-input"
                      autoFocus
                      value={editingCell.value}
                      onChange={handleCellChange}
                      onBlur={saveCell}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <>
                      {item.restock_threshold}
                      <span className="pencil-icon" />
                    </>
                  )}
                </td>
                <td
                  className={`editable-cell ${
                    cellHighlight &&
                    cellHighlight.id === item.id &&
                    cellHighlight.field === 'supplier'
                      ? 'cell-highlight'
                      : ''
                  }`}
                  onClick={() =>
                    !editingCell && startEdit(item.id, 'supplier', item.supplier)
                  }
                >
                  {editingCell &&
                  editingCell.id === item.id &&
                  editingCell.field === 'supplier' ? (
                    <input
                      type="text"
                      className="inline-input"
                      autoFocus
                      value={editingCell.value}
                      onChange={handleCellChange}
                      onBlur={saveCell}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <>
                      {item.supplier}
                      <span className="pencil-icon" />
                    </>
                  )}
                </td>
                <td>
                  <button onClick={() => handleDelete(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showAddModal && (
        <div className="modal" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-button"
              type="button"
              onClick={() => setShowAddModal(false)}
            >
              ×
            </button>
            <AddItemForm onSuccess={handleAddSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryTable;
