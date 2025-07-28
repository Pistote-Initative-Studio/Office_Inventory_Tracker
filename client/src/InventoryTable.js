import React, { useEffect, useState } from 'react';
import './InventoryTable.css';
import AddItemForm from './AddItemForm';

function InventoryTable({ refreshFlag, onInventoryChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [editApiError, setEditApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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

  const openEditModal = (item) => {
    setEditingItem({ ...item });
    setEditErrors({});
    setEditApiError('');
    setSuccessMsg('');
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingItem((prev) => ({ ...prev, [name]: value }));
    setEditErrors((prev) => ({ ...prev, [name]: '' }));
    setEditApiError('');
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!editingItem.name || editingItem.name.trim() === '') {
      errs.name = 'Name is required';
    }
    const qty = Number(editingItem.quantity);
    if (editingItem.quantity === '' || isNaN(qty) || qty < 0) {
      errs.quantity = 'Quantity must be a non-negative number';
    }
    if (editingItem.restock_threshold !== '' && editingItem.restock_threshold !== null) {
      const r = Number(editingItem.restock_threshold);
      if (isNaN(r) || r < 0) {
        errs.restock_threshold = 'Restock threshold must be non-negative';
      }
    }
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingItem.name,
          category: editingItem.category,
          quantity: Number(editingItem.quantity),
          unit: editingItem.unit,
          restock_threshold: Number(editingItem.restock_threshold),
          supplier: editingItem.supplier,
        }),
      });
      if (res.status === 400) {
        const data = await res.json();
        setEditApiError(data.error || 'Invalid input data');
        return;
      }
      if (!res.ok) throw new Error('Failed to update');
      setEditingItem(null);
      setEditErrors({});
      setEditApiError('');
      setSuccessMsg('Item updated successfully!');
      fetchItems();
      if (onInventoryChange) onInventoryChange();
    } catch (err) {
      console.error(err);
      alert('Error updating item');
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
              <th>Actions</th>
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
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td>{item.restock_threshold}</td>
                <td>{item.supplier}</td>
                <td>
                  <button onClick={() => openEditModal(item)}>Edit</button>{' '}
                  <button onClick={() => handleDelete(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editingItem && (
        <div className="modal">
          <div className="modal-content">
            <h3>Edit Item</h3>
            {editApiError && (
              <div className="status-message error-message">{editApiError}</div>
            )}
            <form onSubmit={handleEditSave}>
              <div>
                <label>Name:</label>
                <input
                  name="name"
                  value={editingItem.name}
                  onChange={handleEditChange}
                  className={editErrors.name ? 'error-input' : ''}
                  required
                />
                {editErrors.name && <div className="error-message">{editErrors.name}</div>}
              </div>
              <div>
                <label>Category:</label>
                <input name="category" value={editingItem.category} onChange={handleEditChange} />
              </div>
              <div>
                <label>Quantity:</label>
                <input
                  name="quantity"
                  type="number"
                  value={editingItem.quantity}
                  onChange={handleEditChange}
                  className={editErrors.quantity ? 'error-input' : ''}
                  required
                />
                {editErrors.quantity && <div className="error-message">{editErrors.quantity}</div>}
              </div>
              <div>
                <label>Unit:</label>
                <input name="unit" value={editingItem.unit} onChange={handleEditChange} />
              </div>
              <div>
                <label>Restock Threshold:</label>
                <input
                  name="restock_threshold"
                  type="number"
                  value={editingItem.restock_threshold}
                  onChange={handleEditChange}
                  className={editErrors.restock_threshold ? 'error-input' : ''}
                />
                {editErrors.restock_threshold && (
                  <div className="error-message">{editErrors.restock_threshold}</div>
                )}
              </div>
              <div>
                <label>Supplier:</label>
                <input name="supplier" value={editingItem.supplier} onChange={handleEditChange} />
              </div>
              <button type="submit">Save</button>
              <button type="button" onClick={() => setEditingItem(null)}>Cancel</button>
            </form>
          </div>
        </div>
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
