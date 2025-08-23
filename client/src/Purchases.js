import React, { useEffect, useState } from 'react';
import './Purchases.css';
import { apiFetch } from './api';
import { formatDate } from './utils/format';

function Purchases({ refreshFlag }) {
  const role = localStorage.getItem('role') || 'employee';
  const isAdmin = role === 'admin';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lowStock, setLowStock] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [autoItems, setAutoItems] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [frequentItems, setFrequentItems] = useState([]);
  const [lastPrices, setLastPrices] = useState({});
  const [sortLow, setSortLow] = useState({ key: '', direction: 'asc' });
  const [sortOrders, setSortOrders] = useState({ key: '', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState(null); // {type:'error'|'info', message:''}


  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/purchase-orders');
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
      const res = await apiFetch('/inventory');
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

  const fetchDrafts = async () => {
    try {
      const res = await apiFetch('/api/purchase-orders?status=draft');
      if (!res.ok) throw new Error('Failed to fetch drafts');
      const data = await res.json();
      setDrafts(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFrequentItems = async () => {
    try {
      const res = await apiFetch('/api/purchase-orders/frequent');
      if (!res.ok) throw new Error('Failed to fetch frequent items');
      const data = await res.json();
      setFrequentItems(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchOrders();
    fetchLowStock();
    fetchDrafts();
    fetchFrequentItems();
  }, [refreshFlag, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (showModal) fetchLowStock();
  }, [showModal, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const selected = lowStock.filter((it) => selectedIds.includes(it.id.toString()));
    // Map selected low stock items into autoItems. Include unit and product_number so that
    // purchase orders carry these extra fields even though the inventory tab hides unit.
    const mapped = selected.map((it) => ({
      itemName: it.name,
      quantity: Math.max(Number(it.restock_threshold) - Number(it.quantity), 1),
      unit: it.unit || '',
      supplier: it.supplier || '',
      product_number: it.product_number || '',
    }));
    setAutoItems(mapped);
  }, [selectedIds, lowStock, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !showModal || editId == null) return;
    const interval = setInterval(() => {
      saveDraft(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [showModal, editId, autoItems, customItems, notes, isAdmin]);

  useEffect(() => {
    if (status) {
      const t = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const sortedLowStock = React.useMemo(() => {
    if (!isAdmin) return [];
    const data = [...lowStock];
    if (sortLow.key) {
      data.sort((a, b) => {
        const getVal = (row) => {
          if (sortLow.key === 'price') {
            return lastPrices[row.name] || 0;
          }
          return row[sortLow.key];
        };
        const aVal = getVal(a);
        const bVal = getVal(b);
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortLow.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortLow.direction === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    return data;
  }, [lowStock, sortLow, isAdmin]);

  const computeTotalPrice = (order) => {
    if (order.items) {
      return order.items.reduce((sum, it) => {
        const qty = Number(it.quantity) || 0;
        const price = Number(it.price) || 0;
        return sum + qty * price;
      }, 0);
    }
    const qty = Number(order.quantity) || 0;
    const price = Number(order.price) || 0;
    return qty * price;
  };

  const filteredOrders = React.useMemo(() => {
    if (!isAdmin) return [];
    if (!searchTerm.trim()) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter((o) => {
      const itemNames = o.items
        ? o.items.map((i) => i.itemName).join(', ')
        : o.itemName || '';
      const suppliers = o.items
        ? o.items.map((i) => i.supplier).join(', ')
        : o.supplier || '';
      const total = computeTotalPrice(o).toFixed(2);
      return (
        String(o.id).includes(term) ||
        itemNames.toLowerCase().includes(term) ||
        suppliers.toLowerCase().includes(term) ||
        (o.orderDate && o.orderDate.toLowerCase().includes(term)) ||
        (`$${total}`).includes(term)
      );
    });
  }, [orders, searchTerm, isAdmin]);

  const sortedOrders = React.useMemo(() => {
    if (!isAdmin) return [];
    const data = [...filteredOrders];
    const getVal = (o, key) => {
      if (key === 'itemName') {
        return o.items ? o.items.map((i) => i.itemName).join(', ') : o.itemName;
      }
      if (key === 'quantity') {
        return o.items
          ? o.items.reduce((sum, i) => sum + Number(i.quantity || 0), 0)
          : Number(o.quantity);
      }
      if (key === 'supplier') {
        return o.items ? o.items.map((i) => i.supplier).join(', ') : o.supplier;
      }
      if (key === 'totalPrice') {
        return computeTotalPrice(o);
      }
      return o[key];
    };
    if (sortOrders.key) {
      data.sort((a, b) => {
        const aVal = getVal(a, sortOrders.key);
        const bVal = getVal(b, sortOrders.key);
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrders.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortOrders.direction === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    return data;
  }, [filteredOrders, sortOrders, isAdmin]);

  const handleLowSort = (key) => {
    setSortLow((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleOrderSort = (key) => {
    setSortOrders((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

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
    // When adding a new custom item, include unit and product_number fields so they can be edited
    setCustomItems((prev) => [
      ...prev,
      { itemName: '', quantity: '', supplier: '', unit: '', product_number: '', price: '' },
    ]);
  };

  const combinedItems = () =>
    [...autoItems, ...customItems]
      .filter((it) => it.itemName && it.quantity)
      .map((it) => ({
        itemName: String(it.itemName).trim(),
        quantity: Number(it.quantity || 0),
        unit: String(it.unit || '').trim(),
        supplier: String(it.supplier || '').trim(),
        product_number: String(it.product_number || '').trim(),
        price: Number(it.price || 0),
      }));

  const saveDraft = async (auto = false) => {
    const items = combinedItems();
    try {
      if (editId) {
        await apiFetch(`/api/purchase-orders/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, notes, status: 'draft' }),
        });
      } else {
        const res = await apiFetch('/api/purchase-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, notes, status: 'draft' }),
        });
        const data = await res.json();
        setEditId(data.id);
      }
      if (!auto) fetchDrafts();
      setDraftMessage('Draft Saved');
      setTimeout(() => setDraftMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const submitOrder = async () => {
    const items = combinedItems();
    try {
      if (editId) {
        await apiFetch(`/api/purchase-orders/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, notes, status: 'final' }),
        });
      } else {
        await apiFetch('/api/purchase-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, notes, status: 'final' }),
        });
      }
      fetchOrders();
      fetchDrafts();
      setStatus({ type: 'info', message: 'Order submitted.' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Error submitting order' });
    } finally {
      setShowModal(false);
      setSelectedIds([]);
      setAutoItems([]);
      setCustomItems([]);
      setNotes('');
      setEditId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="permission-error">Only admins can access this section.</div>
    );
  }

  return (
    <div className="purchases-container">
      <div className="toolbar">
        <button onClick={fetchOrders}>Refresh</button>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={() => setShowModal(true)}>Create Purchase Order</button>
      </div>
      {status && (
        <div className={`status-banner ${status.type}`}>{status.message}</div>
      )}
      <div className="section-box">
        <h3>Frequently Bought Items</h3>
        {frequentItems.length === 0 ? (
          <p>No data</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Last Purchase Qty</th>
                <th>Last Purchase Date</th>
                <th>Price Paid</th>
                <th>Add</th>
              </tr>
            </thead>
            <tbody>
              {frequentItems.map((it, idx) => (
                <tr key={idx}>
                  <td>{it.itemName}</td>
                  <td>{it.lastQuantity}</td>
                  <td>{it.lastDate}</td>
                  <td>{`$${it.pricePerItem.toFixed(2)}`}</td>
                  <td>
                    <button
                      onClick={() => {
                        setCustomItems([
                          {
                            itemName: it.itemName,
                            quantity: it.lastQuantity,
                            supplier: '',
                            price: (it.pricePerItem * it.lastQuantity).toFixed(2),
                          },
                        ]);
                        setAutoItems([]);
                        setSelectedIds([]);
                        setEditId(null);
                        setShowModal(true);
                      }}
                    >
                      Add to Purchase Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="section-box restock-section">
        <h3>Items Needing Reorder</h3>
        {lowStock.length === 0 ? (
          <p>No items require restocking.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th onClick={() => handleLowSort('id')}>
                  ID
                  {sortLow.key === 'id' && (
                    <span className="sort-indicator">
                      {sortLow.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleLowSort('name')}>
                  Name
                  {sortLow.key === 'name' && (
                    <span className="sort-indicator">
                      {sortLow.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleLowSort('quantity')}>
                  Qty
                  {sortLow.key === 'quantity' && (
                    <span className="sort-indicator">
                      {sortLow.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleLowSort('restock_threshold')}>
                  Threshold
                  {sortLow.key === 'restock_threshold' && (
                    <span className="sort-indicator">
                      {sortLow.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleLowSort('price')}>
                  Last Purchase Price
                  {sortLow.key === 'price' && (
                    <span className="sort-indicator">
                      {sortLow.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLowStock.map((it) => (
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
      <div className="section-box">
        <h3>Draft Purchase Orders</h3>
        {drafts.length === 0 ? (
          <p>No drafts available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Draft ID</th>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Date</th>
                <th>Unit</th>
                <th>Supplier</th>
                <th>Product Number</th>
                <th>Total Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((order) =>
                (order.items || []).map((it, idx) => (
                  <tr key={`${order.id}-${idx}`}>
                    <td className="mono">{order.id.slice(0, 8)}…</td>
                    <td>{it.itemName || ''}</td>
                    <td>{Number(it.quantity || 0)}</td>
                    <td>{formatDate(order.orderDate)}</td>
                    <td>{it.unit || ''}</td>
                    <td>{it.supplier || ''}</td>
                    <td>{it.product_number || ''}</td>
                    <td>{`$${(Number(it.quantity || 0) * Number(it.price || 0)).toFixed(2)}`}</td>
                    <td>
                      <button
                        onClick={() => {
                          setCustomItems(order.items || []);
                          setAutoItems([]);
                          setNotes(order.notes || '');
                          setSelectedIds([]);
                          setEditId(order.id);
                          setShowModal(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          await apiFetch(`/api/purchase-orders/${order.id}`, { method: 'DELETE' });
                          fetchDrafts();
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      <h3>Purchase Orders</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th onClick={() => handleOrderSort('id')}>
                ID
                {sortOrders.key === 'id' && (
                  <span className="sort-indicator">
                    {sortOrders.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleOrderSort('itemName')}>
                Item Name
                {sortOrders.key === 'itemName' && (
                  <span className="sort-indicator">
                    {sortOrders.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleOrderSort('quantity')}>
                Quantity
                {sortOrders.key === 'quantity' && (
                  <span className="sort-indicator">
                    {sortOrders.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              {/* Removed the sortable Supplier column; a static Supplier column is added below */}
              <th onClick={() => handleOrderSort('orderDate')}>
                Date
                {sortOrders.key === 'orderDate' && (
                  <span className="sort-indicator">
                    {sortOrders.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              {/* Additional columns: Unit and Product Number, plus keep Supplier */}
              <th>Unit</th>
              <th>Supplier</th>
              <th>Product Number</th>
              <th onClick={() => handleOrderSort('totalPrice')}>
                Total Price
                {sortOrders.key === 'totalPrice' && (
                  <span className="sort-indicator">
                    {sortOrders.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) =>
              (order.items || []).map((it, idx) => (
                <tr key={`${order.id}-${idx}`}>
                  <td className="mono">{order.id.slice(0, 8)}…</td>
                  <td>{it.itemName || ''}</td>
                  <td>{Number(it.quantity || 0)}</td>
                  <td>{formatDate(order.orderDate)}</td>
                  <td>{it.unit || ''}</td>
                  <td>{it.supplier || ''}</td>
                  <td>{it.product_number || ''}</td>
                  <td>{`$${(Number(it.quantity || 0) * Number(it.price || 0)).toFixed(2)}`}</td>
                </tr>
              ))
            )}
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
                submitOrder();
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
                      <th>Unit</th>
                      <th>Supplier</th>
                      <th>Product Number</th>
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
                        <td>{it.unit}</td>
                        <td>
                          <input
                            value={it.supplier}
                            onChange={(e) =>
                              handleAutoItemChange(idx, 'supplier', e.target.value)
                            }
                          />
                        </td>
                        <td>{it.product_number}</td>
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
                            value={it.unit}
                            onChange={(e) =>
                              handleCustomItemChange(idx, 'unit', e.target.value)
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
                            value={it.product_number}
                            onChange={(e) =>
                              handleCustomItemChange(idx, 'product_number', e.target.value)
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
              <button type="button" onClick={() => saveDraft(false)}>Save Draft</button>
              <button type="submit">Submit Order</button>
              <button type="button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              {draftMessage && <div className="draft-msg">{draftMessage}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Purchases;
