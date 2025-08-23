import React, { useEffect, useState, useMemo } from 'react';
import './App.css';
import './Reports.css';
import { apiFetch } from './api';
import * as XLSX from 'xlsx';
import { formatDate } from './utils/format';

const orderSummary = (o) => {
  const items = o.items || [];
  const total = items.reduce(
    (s, it) => s + Number(it.quantity || 0) * Number(it.price || 0),
    0
  );
  const itemsList = items.map((it) => it.itemName || '').join(', ');
  const qtyList = items.map((it) => Number(it.quantity || 0)).join(', ');
  const unitPriceList = items
    .map((it) => Number(it.price || 0).toFixed(2))
    .join(', ');
  const suppliers = Array.from(
    new Set(items.map((it) => it.supplier || '').filter(Boolean))
  ).join(', ');
  return {
    id: o.id,
    date: o.orderDate,
    suppliers,
    itemsList,
    qtyList,
    unitPriceList,
    total: Number(total.toFixed(2)),
    items,
  };
};

function Reports() {
  const [orders, setOrders] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [itemData, setItemData] = useState([]);
  const [sortItems, setSortItems] = useState({ key: '', direction: 'asc' });
  const [selected, setSelected] = useState(new Set());

  const formatCurrency = (val) =>
    typeof val === 'number' ? `$${val.toFixed(2)}` : `$${Number(val || 0).toFixed(2)}`;

  const fetchOrders = async () => {
    const url = `/api/reports/purchase-orders?startDate=${startDate}&endDate=${endDate}`;
    const res = await apiFetch(url);
    const data = await res.json();
    const list = (data.data || []).map((o) => ({
      ...o,
      total: (o.items || []).reduce(
        (s, it) => s + Number(it.quantity || 0) * Number(it.price || 0),
        0
      ),
    }));
    setOrders(list);
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

  const rows = useMemo(() => (orders || []).map(orderSummary), [orders]);
  const filtered = useMemo(() => {
    const within = (o) => {
      const t = new Date(o.date).getTime();
      return (
        (!startDate || t >= new Date(startDate).getTime()) &&
        (!endDate || t <= new Date(endDate).getTime())
      );
    };
    return rows.filter(within);
  }, [rows, startDate, endDate]);
  const selectedRows = selected.size
    ? filtered.filter((r) => selected.has(r.id))
    : filtered;

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

  const handleItemSort = (key) => {
    setSortItems((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const exportSelectedToExcel = () => {
    const summaryRows = selectedRows.map((r) => ({
      'Order ID': r.id,
      Date: formatDate(r.date),
      'Supplier(s)': r.suppliers,
      Items: r.itemsList,
      Quantities: r.qtyList,
      'Unit Prices': r.unitPriceList,
      'Total Cost': Number(r.total.toFixed(2)),
    }));

    const detailRows = [];
    selectedRows.forEach((r) => {
      (r.items || []).forEach((it) => {
        detailRows.push({
          'Order ID': r.id,
          Date: formatDate(r.date),
          Item: it.itemName || '',
          Quantity: Number(it.quantity || 0),
          Unit: it.unit || '',
          Supplier: it.supplier || '',
          'Product Number': it.product_number || '',
          'Unit Price': Number(it.price || 0),
          'Line Total': Number(
            (Number(it.quantity || 0) * Number(it.price || 0)).toFixed(2)
          ),
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryRows);
    const ws2 = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
    XLSX.utils.book_append_sheet(wb, ws2, 'Items Detail');
    XLSX.writeFile(wb, 'purchase_orders.xlsx');
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
        <button onClick={exportSelectedToExcel}>Export to Excel</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selected.size && selected.size === filtered.length}
                onChange={() => {
                  if (selected.size === filtered.length) setSelected(new Set());
                  else setSelected(new Set(filtered.map((r) => r.id)));
                }}
              />
            </th>
            <th>Date</th>
            <th>Supplier(s)</th>
            <th>Items</th>
            <th>Quantity</th>
            <th>Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => {
                    const next = new Set(selected);
                    next.has(r.id) ? next.delete(r.id) : next.add(r.id);
                    setSelected(next);
                  }}
                />
              </td>
              <td>{formatDate(r.date)}</td>
              <td>{r.suppliers}</td>
              <td>{r.itemsList}</td>
              <td>{r.qtyList}</td>
              <td>{formatCurrency(r.total)}</td>
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
