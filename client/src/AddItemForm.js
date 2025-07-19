import React, { useState } from 'react';
import './AddItemForm.css';

function AddItemForm({ onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: '',
    restock_threshold: '',
    supplier: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          quantity: Number(formData.quantity),
          unit: formData.unit,
          restock_threshold: Number(formData.restock_threshold),
          supplier: formData.supplier,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to add item');
      }
      setFormData({
        name: '',
        category: '',
        quantity: '',
        unit: '',
        restock_threshold: '',
        supplier: '',
      });
      if (onAdd) onAdd();
    } catch (err) {
      console.error(err);
      alert('Error adding item');
    }
  };

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      <h2>Add New Item</h2>
      <div>
        <label>Name:</label>
        <input name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div>
        <label>Category:</label>
        <input name="category" value={formData.category} onChange={handleChange} />
      </div>
      <div>
        <label>Quantity:</label>
        <input name="quantity" type="number" value={formData.quantity} onChange={handleChange} required />
      </div>
      <div>
        <label>Unit:</label>
        <input name="unit" value={formData.unit} onChange={handleChange} />
      </div>
      <div>
        <label>Restock Threshold:</label>
        <input name="restock_threshold" type="number" value={formData.restock_threshold} onChange={handleChange} />
      </div>
      <div>
        <label>Supplier:</label>
        <input name="supplier" value={formData.supplier} onChange={handleChange} />
      </div>
      <button type="submit">Add Item</button>
    </form>
  );
}

export default AddItemForm;
