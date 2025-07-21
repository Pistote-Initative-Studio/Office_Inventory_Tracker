import React, { useEffect, useState } from 'react';
import './Purchases.css';

function Purchases({ refreshFlag }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lowStock, setLowStock] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [autoItems, setAutoItems] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [lastPrices, setLastPrices] = useState({});

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/purchase-orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      const list = data.data || [];
      setOrders(list);
      const priceMap = {};
      list.forEach((o) => {
        if (o.items) {
          o.items.forEach((it) => {
            if (!priceMap[it.itemName]) priceMap[it.itemName] = it.price;
          });
        } else if (o.itemName) {
          if (!priceMap[o.itemName]) priceMap[o.itemName] = o.price;
        }
      });
      setLastPrices(priceMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      const res = await fetch('http://localhost:5000/inventory');
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const data = await res.json();
      const items = (data.data || []).filter(
        (it) =>
          it.restock_threshold != null &&
          Number(it.quantity) <= Number(it.restock_threshold)
      );
      setLowStock(items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchLowStock();
  }, [refreshFlag]);

  useEffect(() => {
    if (showModal) fetchLowStock();
  }, [showModal]);

  useEffect(() => {
    const selected = lowStock.filter((it) => selectedIds.includes(it.id.toString()));
    const mapped = selected.map((it) => ({
      itemName: it.name,
      quantity: Math.max(Number(it.restock_threshold) - Number(it.quantity), 1),
      supplier: it.supplier || '',
    }));
    setAutoItems(mapped);
  }, [selectedIds, lowStock]);

  const handleNotesChange = (e) => setNotes(e.target.value);

  const handleAutoItemChange = (index, field, value) => {
    setAutoItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };

  const handleCustomItemChange = (index, field, value) => {
    setCustomItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };

  const addCustomItem = () => {
    setCustomItems((prev) => [...prev, { itemName: '', quantity: '', supplier: '' }]);
  };

  const createOrder = async () => {
    const items = [...autoItems, ...customItems].filter(
      (it) => it.itemName && it.quantity
    );
    try {
      const res = await fetch('http://localhost:5000/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, notes }),
      });
      if (!res.ok) throw new Error('Failed to create order');
      await res.json();
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Error creating order');
    } finally {
      setShowModal(false);
      setSelectedIds([]);
      setAutoItems([]);
      setCustomItems([]);
      setNotes('');
    }
  };

  return (
    <div className="purchases-container">
      <div className="toolbar">
        <button onClick={fetchOrders}>Refresh</button>
        <button onClick={() => setShowModal(true)}>Create Purchase Order</button>
      </div>
      <div className="restock-section">
        <h3>Items Needing Reorder</h3>
        {lowStock.length === 0 ? (
          <p>No items require restocking.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Qty</th>
                <th>Threshold</th>
                <th>Last Purchase Price</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((it) => (
                <tr key={it.id}>
                  <td>{it.id}</td>
                  <td>{it.name}</td>
                  <td>{it.quantity}</td>
                  <td>{it.restock_threshold}</td>
                  <td>{lastPrices[it.name] || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
                <td>
                  {order.items
                    ? order.items.map((i) => i.itemName).join(', ')
                    : order.itemName}
                </td>
                <td>
                  {order.items
                    ? order.items.map((i) => i.quantity).join(', ')
                    : order.quantity}
                </td>
                <td>
                  {order.items
                    ? order.items.map((i) => i.supplier).join(', ')
                    : order.supplier}
                </td>
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
                <label>Select Items Needing Reorder:</label>
                <select
                  multiple
                  value={selectedIds}
                  onChange={(e) =>
                    setSelectedIds(Array.from(e.target.selectedOptions).map((o) => o.value))
                  }
                >
                  {lowStock.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>
              {autoItems.length > 0 || customItems.length > 0 ? (
                <table className="order-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Supplier</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoItems.map((it, idx) => (
                      <tr key={`auto-${idx}`}>
                        <td>{it.itemName}</td>
                        <td>
                          <input
                            type="number"
                            value={it.quantity}
                            onChange={(e) =>
                              handleAutoItemChange(idx, 'quantity', e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            value={it.supplier}
                            onChange={(e) =>
                              handleAutoItemChange(idx, 'supplier', e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={it.price || ''}
                            onChange={(e) =>
                              handleAutoItemChange(idx, 'price', e.target.value)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                    {customItems.map((it, idx) => (
                      <tr key={`custom-${idx}`}>
                        <td>
                          <input
                            value={it.itemName}
                            onChange={(e) =>
                              handleCustomItemChange(idx, 'itemName', e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={it.quantity}
                            onChange={(e) =>
                              handleCustomItemChange(idx, 'quantity', e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            value={it.supplier}
                            onChange={(e) =>
                              handleCustomItemChange(idx, 'supplier', e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={it.price || ''}
                            onChange={(e) =>
                              handleCustomItemChange(idx, 'price', e.target.value)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              <button type="button" onClick={addCustomItem}>
                Add Custom Item
              </button>
              <div>
                <label>Notes:</label>
                <textarea value={notes} onChange={handleNotesChange} />
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
