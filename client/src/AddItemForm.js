import React, { useState, useEffect } from 'react';
import './AddItemForm.css';
import { apiFetch } from './api';

function AddItemForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: '',
    restock_threshold: '',
    supplier: '',
    // new fields for location and product number
    location: '',
    product_number: '',
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // {type:'error'|'info', message:''}

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setStatus(null);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Name is required';
    }
    const qty = Number(formData.quantity);
    if (formData.quantity === '' || isNaN(qty) || qty < 0) {
      errs.quantity = 'Quantity must be a non-negative number';
    }
    if (formData.restock_threshold !== '') {
      const r = Number(formData.restock_threshold);
      if (isNaN(r) || r < 0) {
        errs.restock_threshold = 'Restock threshold must be non-negative';
      }
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    try {
      const res = await apiFetch('/inventory', {
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
          location: formData.location,
          product_number: formData.product_number,
        }),
      });
      if (res.status === 400) {
        const data = await res.json();
        setStatus({ type: 'error', message: data.error || 'Invalid input data' });
        return;
      }
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
        location: '',
        product_number: '',
      });
      setErrors({});
      setStatus({ type: 'info', message: 'Item added successfully!' });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Error adding item' });
    }
  };

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      <h2>Add New Item</h2>
      {status && (
        <div className={`status-banner ${status.type}`}>{status.message}</div>
      )}
      <div>
        <label>Name:</label>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'error-input' : ''}
          required
        />
        {errors.name && <div className="error-message">{errors.name}</div>}
      </div>
      <div>
        <label>Category:</label>
        <input name="category" value={formData.category} onChange={handleChange} />
      </div>
      <div>
        <label>Quantity:</label>
        <input
          name="quantity"
          type="number"
          value={formData.quantity}
          onChange={handleChange}
          className={errors.quantity ? 'error-input' : ''}
          required
        />
        {errors.quantity && <div className="error-message">{errors.quantity}</div>}
      </div>
      <div>
        <label>Unit:</label>
        <input name="unit" value={formData.unit} onChange={handleChange} />
      </div>
      <div>
        <label>Restock Threshold:</label>
        <input
          name="restock_threshold"
          type="number"
          value={formData.restock_threshold}
          onChange={handleChange}
          className={errors.restock_threshold ? 'error-input' : ''}
        />
        {errors.restock_threshold && (
          <div className="error-message">{errors.restock_threshold}</div>
        )}
      </div>
      {/* New location field */}
      <div>
        <label>Location:</label>
        <input
          name="location"
          value={formData.location}
          onChange={handleChange}
        />
      </div>
      <div>
        <label>Supplier:</label>
        <input name="supplier" value={formData.supplier} onChange={handleChange} />
      </div>
      {/* New product number field */}
      <div>
        <label>Product Number:</label>
        <input
          name="product_number"
          value={formData.product_number}
          onChange={handleChange}
        />
      </div>
      <button type="submit">Add Item</button>
    </form>
  );
}

export default AddItemForm;
