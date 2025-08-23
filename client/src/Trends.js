import React, { useEffect, useMemo, useState } from 'react';
import './Trends.css';
import { apiFetch } from './api';

function Trends({ mode = 'Quantity', onModeChange }) {
  const [orders, setOrders] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [compare, setCompare] = useState(false);
  const [metric, setMetric] = useState(mode === 'Price' ? 'price' : 'quantity');
  const [range, setRange] = useState('monthly');

  useEffect(() => {
    setMetric(mode === 'Price' ? 'price' : 'quantity');
  }, [mode]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/purchase-orders');
        const { success, data } = await res.json();
        if (!success) {
          setOrders([]);
          setAvailableItems([]);
          setSelectedItems([]);
          return;
        }
        setOrders(data || []);
        const names = Array.from(
          new Set(
            (data || [])
              .flatMap((o) => (o.items || []).map((i) => i.itemName).filter(Boolean))
          )
        );
        setAvailableItems(names);
        setSelectedItems(names.length ? [names[0]] : []);
      } catch {
        setOrders([]);
        setAvailableItems([]);
        setSelectedItems([]);
      }
    })();
  }, []);

  const keyByRange = (d) => {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = (dt.getMonth() + 1).toString().padStart(2, '0');
    const q = Math.floor(dt.getMonth() / 3) + 1;
    if (range === 'monthly') return `${y}-${m}`;
    if (range === 'quarterly') return `${y}-Q${q}`;
    return `${y}`;
  };

  const series = useMemo(() => {
    if (!selectedItems.length) return [];
    const map = new Map();
    for (const o of orders) {
      const k = keyByRange(o.orderDate || o.last_modified || Date.now());
      for (const it of o.items || []) {
        if (!selectedItems.includes(it.itemName)) continue;
        const v =
          metric === 'price' ? Number(it.price || 0) : Number(it.quantity || 0);
        if (!map.has(k)) map.set(k, {});
        const obj = map.get(k);
        obj[it.itemName] = (obj[it.itemName] || 0) + v;
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, obj]) => ({ period: k, ...obj }));
  }, [orders, selectedItems, range, metric]);

  const periods = series.map((s) => s.period);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const row of series) {
      for (const name of selectedItems) {
        const val = row[name] || 0;
        if (val > max) max = val;
      }
    }
    return max;
  }, [series, selectedItems]);

  const colors = ['#3a82ff', '#58c13b', '#ff5722', '#6f42c1'];

  const seriesData = useMemo(() => {
    const width = 600;
    const height = 160;
    const safeMax = maxValue || 1;
    const divisor = Math.max(periods.length - 1, 1);
    return selectedItems.map((name, idx) => {
      const pts = periods.map((_, i) => {
        const val = series[i]?.[name] || 0;
        const x = (width / divisor) * i;
        const y = height - (val / safeMax) * (height - 20) + 10;
        return [x, y];
      });
      const path = pts
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`)
        .join(' ');
      return { id: name, color: colors[idx % colors.length], pts, path };
    });
  }, [series, selectedItems, periods, maxValue]);

  return (
    <div className="trends-container">
      <div className="trends-header">
        <h2 className="trends-subtitle">Purchase Trends Overview</h2>
      </div>
      <div className="trends-layout">
        <div className="trends-left">
          <div className="trends-selector">
            <label htmlFor="trend-item">Select item</label>
            <select
              id="trend-item"
              className="trend-select"
              disabled={!availableItems.length}
              multiple={compare}
              value={compare ? selectedItems : selectedItems[0] || ''}
              onChange={(e) => {
                if (compare) {
                  const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setSelectedItems(vals);
                } else {
                  setSelectedItems(e.target.value ? [e.target.value] : []);
                }
              }}
            >
              {!compare && <option value="">— Select an item —</option>}
              {availableItems.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <label className="compare-toggle">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => {
                  const on = e.target.checked;
                  setCompare(on);
                  if (!on && selectedItems.length > 1) {
                    setSelectedItems([selectedItems[0]]);
                  }
                }}
              />
              Compare items
            </label>
          </div>
        </div>
        <div className="trends-right">
          <div className="chart-container">
            <div className="trends-placeholder">
              <div className="chart-top-controls">
                <div className="range-toggle-container">
                  {['Quantity', 'Price'].map((m) => (
                    <button
                      key={m}
                      className={metric === m.toLowerCase() ? 'active' : ''}
                      onClick={() => {
                        setMetric(m.toLowerCase());
                        onModeChange && onModeChange(m);
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="time-range-buttons range-toggle-container">
                  {['monthly', 'quarterly', 'yearly'].map((r) => (
                    <button
                      key={r}
                      className={range === r ? 'active' : ''}
                      onClick={() => setRange(r)}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {series.length === 0 ? (
                <div className="trends-empty">
                  <h3>No trend data yet</h3>
                  <p>
                    Add items and record purchases to see weekly, monthly, and yearly
                    trends.
                  </p>
                </div>
              ) : (
                <>
                  <svg viewBox="0 0 600 200" width="100%" height="200">
                    {[1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1="0"
                        y1={i * 40}
                        x2="600"
                        y2={i * 40}
                        stroke="#ccc"
                        strokeDasharray="5 5"
                      />
                    ))}
                    {[1, 2, 3, 4, 5].map((i) => (
                      <line
                        key={`v${i}`}
                        x1={i * 100}
                        y1="0"
                        x2={i * 100}
                        y2="160"
                        stroke="#ccc"
                        strokeDasharray="5 5"
                      />
                    ))}
                    <line x1="0" y1="0" x2="0" y2="160" stroke="#666" />
                    <line x1="0" y1="160" x2="600" y2="160" stroke="#666" />
                    {seriesData.map((s) => (
                      <g key={s.id}>
                        <path
                          d={s.path}
                          fill="none"
                          stroke={s.color}
                          strokeWidth="3"
                        />
                        {s.pts.map((p, i) => (
                          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={s.color} />
                        ))}
                      </g>
                    ))}
                  </svg>
                  <div className="x-axis">
                    {periods.map((p) => (
                      <span key={p}>{p}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Trends;
