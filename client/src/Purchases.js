import React, { useEffect, useState } from 'react';
import './Purchases.css';

function Purchases() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    itemName: '',
    quantity: '',
    supplier: '',
    notes: '',
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/purchase-orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const createOrder = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create order');
      await res.json();
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Error creating order');
    } finally {
      setShowModal(false);
      setForm({ itemName: '', quantity: '', supplier: '', notes: '' });
    }
  };

  return (
    <div className="purchases-container">
      <div className="toolbar">
        <button onClick={fetchOrders}>Refresh</button>
        <button onClick={() => setShowModal(true)}>Create Purchase Order</button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Item Name</th>
              <th>Quantity</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.itemName}</td>
                <td>{order.quantity}</td>
                <td>{order.supplier}</td>
                <td>{order.orderDate}</td>
                <td>
                  <a
                    href={`http://localhost:5000/api/purchase-orders/${order.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Purchase Order</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createOrder();
              }}
            >
              <div>
                <label>Item:</label>
                <input
                  name="itemName"
                  value={form.itemName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Quantity:</label>
                <input
                  name="quantity"
                  type="number"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Supplier:</label>
                <input
                  name="supplier"
                  value={form.supplier}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Notes:</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} />
              </div>
              <button type="submit">Submit</button>
              <button type="button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Purchases;
