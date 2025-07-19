import React, { useState, useEffect } from 'react';
import './AddItemForm.css';

function AddItemForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: '',
    restock_threshold: '',
    supplier: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (successMsg || apiError) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setApiError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, apiError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
    setSuccessMsg('');
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
      if (res.status === 400) {
        const data = await res.json();
        setApiError(data.error || 'Invalid input data');
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
      });
      setErrors({});
      setApiError('');
      setSuccessMsg('Item added successfully!');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      alert('Error adding item');
    }
  };

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      <h2>Add New Item</h2>
      {apiError && (
        <div className="status-message error-message">{apiError}</div>
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
      <div>
        <label>Supplier:</label>
        <input name="supplier" value={formData.supplier} onChange={handleChange} />
      </div>
      <button type="submit">Add Item</button>
      {successMsg && (
        <div className="status-message success-message">{successMsg}</div>
      )}
    </form>
  );
}

export default AddItemForm;
