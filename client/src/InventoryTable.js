import React, { useEffect, useState } from 'react';
import './InventoryTable.css';

function InventoryTable({ refreshFlag }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/inventory');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.data || []);
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

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/inventory/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      alert('Error deleting item');
    }
  };

  const openEditModal = (item) => {
    setEditingItem({ ...item });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
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
      if (!res.ok) throw new Error('Failed to update');
      setEditingItem(null);
      fetchItems();
    } catch (err) {
      console.error(err);
      alert('Error updating item');
    }
  };

  return (
    <div className="inventory-table">
      <h2>Inventory</h2>
      <button onClick={fetchItems}>Refresh</button>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Restock Threshold</th>
              <th>Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
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
            <form onSubmit={handleEditSave}>
              <div>
                <label>Name:</label>
                <input name="name" value={editingItem.name} onChange={handleEditChange} required />
              </div>
              <div>
                <label>Category:</label>
                <input name="category" value={editingItem.category} onChange={handleEditChange} />
              </div>
              <div>
                <label>Quantity:</label>
                <input name="quantity" type="number" value={editingItem.quantity} onChange={handleEditChange} required />
              </div>
              <div>
                <label>Unit:</label>
                <input name="unit" value={editingItem.unit} onChange={handleEditChange} />
              </div>
              <div>
                <label>Restock Threshold:</label>
                <input name="restock_threshold" type="number" value={editingItem.restock_threshold} onChange={handleEditChange} />
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
    </div>
  );
}

export default InventoryTable;
