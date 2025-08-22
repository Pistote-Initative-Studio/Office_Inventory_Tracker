import React, { useEffect, useState } from 'react';
import './App.css';
import './Reports.css';
import { apiFetch } from './api';
import * as XLSX from 'xlsx';

function Reports() {
  const [orders, setOrders] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [itemData, setItemData] = useState([]);
  const [sortOrders, setSortOrders] = useState({ key: '', direction: 'asc' });
  const [sortItems, setSortItems] = useState({ key: '', direction: 'asc' });

  const formatCurrency = (val) =>
    typeof val === 'number' ? `$${val.toFixed(2)}` : `$${Number(val || 0).toFixed(2)}`;

  const fetchOrders = async () => {
    const url = `/api/reports/purchase-orders?startDate=${startDate}&endDate=${endDate}`;
    const res = await apiFetch(url);
    const data = await res.json();
    setOrders(data.data || []);
  };

  const fetchItems = async () => {
    const res = await apiFetch('/inventory');
    const data = await res.json();
    setItems(data.data || []);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [startDate, endDate]);

  useEffect(() => {
    if (!selectedItem) {
      setItemData([]);
      return;
    }
    const itemName = items.find((x) => x.id.toString() === selectedItem)?.name;
    if (!itemName) {
      setItemData([]);
      return;
    }
    const data = orders.filter((o) =>
      (o.items || []).some((i) => i.itemName === itemName) || o.itemName === itemName
    );
    setItemData(data);
  }, [selectedItem, orders, items]);

  const sortedOrders = React.useMemo(() => {
    const data = [...orders];
    if (sortOrders.key) {
      data.sort((a, b) => {
        const aVal = a[sortOrders.key];
        const bVal = b[sortOrders.key];
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
  }, [orders, sortOrders]);

  const sortedItemData = React.useMemo(() => {
    const data = [...itemData];
    if (sortItems.key) {
      data.sort((a, b) => {
        const getVal = (row) => {
          if (sortItems.key === 'unit') {
            const q = row.items
              ? (row.items.find((i) => i.itemName === items.find((x) => x.id.toString() === selectedItem)?.name) || {}).quantity
              : row.quantity;
            const p = row.items
              ? (row.items.find((i) => i.itemName === items.find((x) => x.id.toString() === selectedItem)?.name) || {}).price
              : row.price;
            return q ? p / q : 0;
          }
          return row[sortItems.key];
        };
        const aVal = getVal(a);
        const bVal = getVal(b);
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortItems.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortItems.direction === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    return data;
  }, [itemData, sortItems]);

  const handleOrderSort = (key) => {
    setSortOrders((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleItemSort = (key) => {
    setSortItems((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const exportOrdersExcel = () => {
    const rows = orders.map((o) => ({
      Date: o.orderDate || '',
      Supplier: o.supplier || '',
      Notes: o.notes || '',
      Status: o.status || '',
      Total: (o.items || []).reduce((s, it) => s + Number(it.price || 0), 0)
    }));
    const itemsRows = [];
    orders.forEach((o) => (o.items || []).forEach((it) => itemsRows.push({
      Date: o.orderDate || '',
      Supplier: o.supplier || '',
      Item: it.itemName || '',
      Quantity: Number(it.quantity || 0),
      UnitPrice: Number(it.price || 0),
      LineTotal: Number(it.quantity || 0) * Number(it.price || 0)
    })));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(rows);
    const ws2 = XLSX.utils.json_to_sheet(itemsRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Purchase Orders');
    XLSX.utils.book_append_sheet(wb, ws2, 'Items');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchase_orders.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-container">
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
        <button onClick={exportOrdersExcel}>Export to Excel</button>
      </div>
      <table>
        <thead>
          <tr>
            <th onClick={() => handleOrderSort('orderDate')}>
              Date
              {sortOrders.key === 'orderDate' && (
                <span className="sort-indicator">
                  {sortOrders.direction === 'asc' ? '▲' : '▼'}
                </span>
              )}
            </th>
            <th onClick={() => handleOrderSort('supplier')}>
              Supplier
              {sortOrders.key === 'supplier' && (
                <span className="sort-indicator">
                  {sortOrders.direction === 'asc' ? '▲' : '▼'}
                </span>
              )}
            </th>
            <th onClick={() => handleOrderSort('items')}>
              Items
              {sortOrders.key === 'items' && (
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
            <th onClick={() => handleOrderSort('price')}>
              Total Cost
              {sortOrders.key === 'price' && (
                <span className="sort-indicator">
                  {sortOrders.direction === 'asc' ? '▲' : '▼'}
                </span>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedOrders.map((o) => (
            <tr key={o.id}>
              <td>{o.orderDate}</td>
              <td>{o.supplier}</td>
              <td>{o.items ? o.items.map((i) => i.itemName).join(', ') : o.itemName}</td>
              <td>{o.items ? o.items.map((i) => i.quantity).join(', ') : o.quantity}</td>
              <td>{formatCurrency(o.price)}</td>
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
      </div>
      {itemData.length > 0 && (
        <table>
          <thead>
            <tr>
              <th onClick={() => handleItemSort('orderDate')}>
                Date
                {sortItems.key === 'orderDate' && (
                  <span className="sort-indicator">
                    {sortItems.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleItemSort('supplier')}>
                Supplier
                {sortItems.key === 'supplier' && (
                  <span className="sort-indicator">
                    {sortItems.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleItemSort('unit')}>
                Unit Price
                {sortItems.key === 'unit' && (
                  <span className="sort-indicator">
                    {sortItems.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleItemSort('price')}>
                Total Price
                {sortItems.key === 'price' && (
                  <span className="sort-indicator">
                    {sortItems.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleItemSort('quantity')}>
                Quantity
                {sortItems.key === 'quantity' && (
                  <span className="sort-indicator">
                    {sortItems.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItemData.map((r, idx) => {
              let price = r.price;
              let qty = r.quantity;
              let supplier = r.supplier;
              if (r.items) {
                const it = r.items.find((i) => i.itemName === items.find((x) => x.id.toString() === selectedItem)?.name) || {};
                price = it.price;
                qty = it.quantity;
                supplier = it.supplier;
              }
              const unit = qty ? price / qty : 0;
              return (
                <tr key={idx}>
                  <td>{r.orderDate}</td>
                  <td>{supplier}</td>
                  <td>{formatCurrency(unit)}</td>
                  <td>{formatCurrency(price)}</td>
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
