import React, { useEffect, useState } from 'react';
import './Purchases.css';

function Purchases() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [orderData, setOrderData] = useState({
    itemId: '',
    quantity: '',
    supplier: '',
    notes: '',
  });
  const [statusMsg, setStatusMsg] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/inventory');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const lowStockItems = items.filter(
    (it) =>
      it.restock_threshold != null &&
      Number(it.quantity) <= Number(it.restock_threshold)
  );

  const suggestedQty = (item) => {
    const thresh = Number(item.restock_threshold);
    const qty = Number(item.quantity);
    const suggestion = thresh * 2 - qty;
    return suggestion > 0 ? suggestion : '';
  };

  const openModal = () => {
    setOrderData({
      itemId: lowStockItems[0]?.id || '',
      quantity: '',
      supplier: '',
      notes: '',
    });
    setStatusMsg('');
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrderData((prev) => ({ ...prev, [name]: value }));
  };

  const confirmOrder = () => {
    setShowModal(false);
    setStatusMsg('Purchase order created!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  return (
    <div className="purchases-container">
      <div className="controls-container">
        <button onClick={fetchItems}>Refresh</button>
        <button onClick={openModal}>Create Purchase Order</button>
      </div>
      {statusMsg && (
        <div className="status-message success-message">{statusMsg}</div>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Current Quantity</th>
              <th>Restock Threshold</th>
              <th>Suggested Order Quantity</th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{item.restock_threshold}</td>
                <td>{suggestedQty(item)}</td>
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
                confirmOrder();
              }}
            >
              <div>
                <label>Item:</label>
                <select
                  name="itemId"
                  value={orderData.itemId}
                  onChange={handleChange}
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Quantity to order:</label>
                <input
                  name="quantity"
                  type="number"
                  value={orderData.quantity}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Supplier:</label>
                <input
                  name="supplier"
                  value={orderData.supplier}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Notes:</label>
                <textarea
                  name="notes"
                  value={orderData.notes}
                  onChange={handleChange}
                />
              </div>
              <button type="submit">Confirm Order</button>
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
