import React, { useEffect, useState, useMemo, useCallback } from 'react';
import './App.css';
import './Reports.css';
import { apiFetch } from './api';
import * as XLSX from 'xlsx';
import { formatDate, money } from './utils/format';

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
  const [sortItems, setSortItems] = useState({ key: '', direction: 'asc' });
  const [selected, setSelected] = useState(new Set());
  const [selectedItemLineIds, setSelectedItemLineIds] = useState(new Set());

  const fetchOrders = useCallback(async () => {
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
  }, [startDate, endDate]);

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
  }, [fetchOrders]);

  const selectedItemName = useMemo(() => {
    return items.find((x) => x.id.toString() === selectedItem)?.name || '';
  }, [selectedItem, items]);

  useEffect(() => {
    setSelectedItemLineIds(new Set());
  }, [selectedItemName]);

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

  const itemRows = useMemo(() => {
    if (!selectedItemName) return [];
    const rows = [];
    (orders || []).forEach((o) => {
      (o.items || []).forEach((it, idx) => {
        if ((it.itemName || '') === selectedItemName) {
          rows.push({
            id: `${o.id}::${idx}`,
            orderId: o.id,
            date: o.orderDate,
            supplier: it.supplier || '',
            unit: it.unit || '',
            productNumber: it.product_number || '',
            unitPrice: Number(it.price || 0),
            quantity: Number(it.quantity || 0),
            totalPrice: Number(it.quantity || 0) * Number(it.price || 0),
            itemName: it.itemName || '',
          });
        }
      });
    });
    return rows.filter((r) => {
      const t = new Date(r.date).getTime();
      return (
        (!startDate || t >= new Date(startDate).getTime()) &&
        (!endDate || t <= new Date(endDate).getTime())
      );
    });
  }, [orders, selectedItemName, startDate, endDate]);

  const sortedItemRows = useMemo(() => {
    const data = [...itemRows];
    if (sortItems.key) {
      data.sort((a, b) => {
        const aVal = a[sortItems.key];
        const bVal = b[sortItems.key];
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
  }, [itemRows, sortItems]);

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

    const itemRowsToExport = selectedItemLineIds.size
      ? itemRows.filter((r) => selectedItemLineIds.has(r.id))
      : itemRows;

    if (itemRowsToExport.length) {
      const itemSheet = itemRowsToExport.map((r) => ({
        'Order ID': r.orderId,
        Date: formatDate(r.date),
        Item: r.itemName,
        Supplier: r.supplier,
        Unit: r.unit,
        'Product Number': r.productNumber,
        'Unit Price': Number(r.unitPrice.toFixed(2)),
        Quantity: Number(r.quantity),
        'Total Price': Number(r.totalPrice.toFixed(2)),
      }));
      const ws3 = XLSX.utils.json_to_sheet(itemSheet);
      XLSX.utils.book_append_sheet(wb, ws3, 'Selected Item Report');
    }

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
              <td>{money(r.total)}</td>
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
      {itemRows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    itemRows.length > 0 &&
                    selectedItemLineIds.size === itemRows.length
                  }
                  onChange={() => {
                    if (selectedItemLineIds.size === itemRows.length) {
                      setSelectedItemLineIds(new Set());
                    } else {
                      setSelectedItemLineIds(new Set(itemRows.map((r) => r.id)));
                    }
                  }}
                />
              </th>
              <th onClick={() => handleItemSort('date')}>
                Date
                {sortItems.key === 'date' && (
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
              <th onClick={() => handleItemSort('unitPrice')}>
                Unit Price
                {sortItems.key === 'unitPrice' && (
                  <span className="sort-indicator">
                    {sortItems.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th onClick={() => handleItemSort('totalPrice')}>
                Total Price
                {sortItems.key === 'totalPrice' && (
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
            {sortedItemRows.map((r) => (
              <tr key={r.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedItemLineIds.has(r.id)}
                    onChange={() => {
                      setSelectedItemLineIds((prev) => {
                        const next = new Set(prev);
                        next.has(r.id) ? next.delete(r.id) : next.add(r.id);
                        return next;
                      });
                    }}
                  />
                </td>
                <td>{formatDate(r.date)}</td>
                <td>{r.supplier}</td>
                <td>{money(r.unitPrice)}</td>
                <td>{money(r.totalPrice)}</td>
                <td>{r.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Reports;
