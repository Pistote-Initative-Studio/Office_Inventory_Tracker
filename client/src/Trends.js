import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './Trends.css';
import { apiFetch } from './api';
import { money } from './utils/format';

function Trends({ mode = 'Quantity', onModeChange }) {
  const [orders, setOrders] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [compare, setCompare] = useState(false);
  const [metric, setMetric] = useState(mode === 'Price' ? 'price' : 'quantity');
  const [range, setRange] = useState('monthly');

  const toggleItem = (name) =>
    setSelectedItems((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  const selectAll = () => setSelectedItems(availableItems);
  const clearAll = () => setSelectedItems([]);

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

  useEffect(() => {
    if (!compare && selectedItems.length > 1) {
      setSelectedItems([selectedItems[0]]);
    }
  }, [compare, selectedItems]);

  const keyByRange = useCallback(
    (d) => {
      const dt = new Date(d);
      const y = dt.getFullYear();
      const m = (dt.getMonth() + 1).toString().padStart(2, '0');
      const q = Math.floor(dt.getMonth() / 3) + 1;
      if (range === 'monthly') return `${y}-${m}`;
      if (range === 'quarterly') return `${y}-Q${q}`;
      return `${y}`;
    },
    [range]
  );

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
  }, [orders, selectedItems, range, metric, keyByRange]);

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

  const yMax = useMemo(() => {
    const max = maxValue || 0;
    if (max === 0) return 1;
    const exp = Math.floor(Math.log10(max));
    const frac = max / Math.pow(10, exp);
    let niceFrac;
    if (frac <= 1) niceFrac = 1;
    else if (frac <= 2) niceFrac = 2;
    else if (frac <= 5) niceFrac = 5;
    else niceFrac = 10;
    return niceFrac * Math.pow(10, exp);
  }, [maxValue]);

  const yTicks = useMemo(() => {
    const step = yMax / 4;
    return Array.from({ length: 5 }, (_, i) => step * i);
  }, [yMax]);

  const colors = useMemo(
    () => ['#3a82ff', '#58c13b', '#ff5722', '#6f42c1'],
    []
  );

  const seriesData = useMemo(() => {
    const width = 600;
    const height = 160;
    const safeMax = yMax || 1;
    const divisor = Math.max(periods.length - 1, 1);
    return selectedItems.map((name, idx) => {
      const pts = periods.map((_, i) => {
        const val = series[i]?.[name] || 0;
        const x = (width / divisor) * i;
        const y = height - (val / safeMax) * height;
        return { x, y, val };
      });
      const path = pts
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
        .join(' ');
      return { id: name, color: colors[idx % colors.length], pts, path };
    });
  }, [series, selectedItems, periods, yMax, colors]);

  return (
    <div className="trends-container">
      <div className="trends-header">
        <h2 className="trends-subtitle">Purchase Trends Overview</h2>
      </div>
      <div className="trends-layout">
        <div className="trends-left">
          <div className="trends-selector">
            <label className="selector-label">Select item</label>

            {!compare ? (
              <select
                className="trend-select"
                value={selectedItems[0] || ''}
                onChange={(e) =>
                  setSelectedItems(e.target.value ? [e.target.value] : [])
                }
                disabled={!availableItems.length}
              >
                <option value="">— Select an item —</option>
                {availableItems.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : (
              <div className="checkbox-list">
                <div className="checkbox-list-actions">
                  <button
                    type="button"
                    onClick={selectAll}
                    disabled={!availableItems.length}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={!selectedItems.length}
                  >
                    Clear
                  </button>
                </div>
                <div className="checkbox-scroll">
                  {availableItems.map((n) => (
                    <label key={n} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(n)}
                        onChange={() => toggleItem(n)}
                      />
                      <span>{n}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="compare-toggle">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
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
                  <svg viewBox="-50 0 650 200" width="100%" height="200">
                    {yTicks.map((t, idx) => {
                      const y = 160 - (t / yMax) * 160;
                      return (
                        <g key={idx}>
                          {idx > 0 && (
                            <line
                              x1="0"
                              y1={y}
                              x2="600"
                              y2={y}
                              stroke="#ccc"
                              strokeDasharray="5 5"
                            />
                          )}
                          <text
                            x="-8"
                            y={y}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className="y-axis-tick"
                          >
                            {metric === 'price' ? money(t) : Math.round(t)}
                          </text>
                        </g>
                      );
                    })}
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
                    <text
                      x="-40"
                      y={80}
                      textAnchor="middle"
                      transform="rotate(-90 -40 80)"
                      className="y-axis-label"
                    >
                      {metric === 'price' ? 'Price ($)' : 'Quantity'}
                    </text>
                    {seriesData.map((s) => (
                      <g key={s.id}>
                        <path
                          d={s.path}
                          fill="none"
                          stroke={s.color}
                          strokeWidth="3"
                        />
                        {s.pts.map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r="3" fill={s.color}>
                            <title>
                              {metric === 'price' ? money(p.val) : Math.round(p.val)}
                            </title>
                          </circle>
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
