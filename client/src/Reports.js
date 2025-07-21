import React, { useEffect, useState } from 'react';
import './App.css';

function Reports() {
  const [orders, setOrders] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [itemData, setItemData] = useState([]);

  const fetchOrders = async () => {
    let url = `http://localhost:5000/api/reports/purchase-orders?startDate=${startDate}&endDate=${endDate}`;
    const res = await fetch(url);
    const data = await res.json();
    setOrders(data.data || []);
  };

  const fetchItems = async () => {
    const res = await fetch('http://localhost:5000/inventory');
    const data = await res.json();
    setItems(data.data || []);
  };

  const fetchItemData = async (id) => {
    if (!id) return;
    const res = await fetch(`http://localhost:5000/api/reports/item/${id}`);
    const data = await res.json();
    setItemData(data.data || []);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [startDate, endDate]);

  useEffect(() => {
    fetchItemData(selectedItem);
  }, [selectedItem]);

  const exportOrders = (type) => {
    const url = `http://localhost:5000/api/reports/purchase-orders/${type}?startDate=${startDate}&endDate=${endDate}`;
    window.open(url, '_blank');
  };

  const exportItem = (type) => {
    if (!selectedItem) return;
    const url = `http://localhost:5000/api/reports/item/${selectedItem}/${type}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <h3>Purchase Orders Report</h3>
      <div className="toolbar">
        <label>
          Start Date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End Date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <button onClick={() => exportOrders('excel')}>Export to Excel</button>
        <button onClick={() => exportOrders('pdf')}>Export to PDF</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Supplier</th>
            <th>Items</th>
            <th>Quantity</th>
            <th>Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.orderDate}</td>
              <td>{o.supplier}</td>
              <td>{o.items ? o.items.map((i) => i.itemName).join(', ') : o.itemName}</td>
              <td>{o.items ? o.items.map((i) => i.quantity).join(', ') : o.quantity}</td>
              <td>{o.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Individual Item Report</h3>
      <div className="toolbar">
        <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}>
          <option value="">Select Item</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>{it.name}</option>
          ))}
        </select>
        <button onClick={() => exportItem('excel')}>Export to Excel</button>
        <button onClick={() => exportItem('pdf')}>Export to PDF</button>
      </div>
      {itemData.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th>Price</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {itemData.map((r, idx) => {
              let price = r.price;
              let qty = r.quantity;
              let supplier = r.supplier;
              if (r.items) {
                const it = r.items.find((i) => i.itemName === items.find((x) => x.id.toString() === selectedItem)?.name) || {};
                price = it.price;
                qty = it.quantity;
                supplier = it.supplier;
              }
              return (
                <tr key={idx}>
                  <td>{r.orderDate}</td>
                  <td>{supplier}</td>
                  <td>{price}</td>
                  <td>{qty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Reports;
