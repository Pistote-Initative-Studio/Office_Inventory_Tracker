import React, { useMemo, useState } from 'react';
import './Trends.css';

function Trends({ mode = 'Quantity', onModeChange, items = [] }) {
  const [selectedRange, setSelectedRange] = useState('Monthly');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(items.slice(0, 1));
  const [selectedItem, setSelectedItem] = useState(items[0] || null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  const displayedItems = useMemo(() => {
    if (isCompareMode) return selectedItems;
    return selectedItem ? [selectedItem] : [];
  }, [isCompareMode, selectedItem, selectedItems]);

  const sortedItems = useMemo(() => {
    const data = [...displayedItems];
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortConfig.direction === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    return data;
  }, [displayedItems, sortConfig]);

  const colors = ['#3a82ff', '#58c13b', '#ff5722', '#6f42c1'];

  const rangeKey = selectedRange.toLowerCase();
  const seriesKey = mode === 'Price' ? `${rangeKey}Price` : rangeKey;

  const maxValue = useMemo(() => {
    const values = displayedItems.flatMap((it) =>
      (it[seriesKey] || []).map((d) => d.value)
    );
    return values.length ? Math.max(...values) : 0;
  }, [displayedItems, seriesKey]);

  const seriesData = useMemo(() => {
    const width = 600;
    const height = 160;
    const safeMax = maxValue || 1;
    return displayedItems.map((item, idx) => {
      const series = item[seriesKey] || [];
      const divisor = Math.max(series.length - 1, 1);
      const pts = series.map((d, i) => {
        const x = (width / divisor) * i;
        const y = height - (d.value / safeMax) * (height - 20) + 10;
        return [x, y];
      });
      const path = pts
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`)
        .join(' ');
      return { id: item.id, color: colors[idx % colors.length], pts, path };
    });
  }, [displayedItems, seriesKey, maxValue]);

  const axisLabels = useMemo(() => {
    const first = displayedItems[0];
    return first ? first[rangeKey] || [] : [];
  }, [displayedItems, rangeKey]);

  const totalKey =
    selectedRange === 'Monthly'
      ? 'monthlyTotal'
      : selectedRange === 'Quarterly'
      ? 'quarterlyTotal'
      : 'yearlyTotal';

  const handleItemClick = (item) => {
    if (isCompareMode) {
      setSelectedItems((prev) => {
        const exists = prev.some((it) => it.id === item.id);
        if (exists) {
          return prev.filter((it) => it.id !== item.id);
        }
        if (prev.length >= 4) return prev;
        return [...prev, item];
      });
    } else {
      setSelectedItem(item);
      setIsDropdownOpen(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleCompareChange = (e) => {
    const checked = e.target.checked;
    setIsCompareMode(checked);
    if (checked) {
      setSelectedItems((prev) => (prev.length ? prev : selectedItem ? [selectedItem] : []));
    } else {
      setSelectedItem(selectedItems[0] || null);
    }
  };

  return (
    <div className="trends-container">
      <div className="trends-header">
        <h2 className="trends-subtitle">Purchase Trends Overview</h2>
      </div>
      <div className="trends-layout">
        <div className="trends-left">
          <div className="trends-toolbar toolbar">
            <div className="dropdown">
              <button
                className="dropdown-toggle"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
              >
                {isCompareMode
                  ? `${selectedItems.length} item(s) selected`
                  : selectedItem ? selectedItem.name : 'Select Item'}
              </button>
              {isDropdownOpen && (
                <ul className="dropdown-menu">
                  {items.map((item) => {
                    const isSelected = isCompareMode
                      ? selectedItems.some((it) => it.id === item.id)
                      : selectedItem && selectedItem.id === item.id;
                    return (
                      <li
                        key={item.id}
                        className={isSelected ? 'selected' : ''}
                        onClick={() => handleItemClick(item)}
                      >
                        {item.name}
                        {isSelected && (
                          <span className="checkmark" aria-hidden="true">✓</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <label className="compare-label">
              <input
                type="checkbox"
                checked={isCompareMode}
                onChange={handleCompareChange}
              />
              Compare Items
            </label>
          </div>
          <table className="item-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')}>
                  ID
                  {sortConfig.key === 'id' && (
                    <span className="sort-indicator">
                      {sortConfig.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('name')}>
                  Name
                  {sortConfig.key === 'name' && (
                    <span className="sort-indicator">
                      {sortConfig.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('lastPurchaseDate')}>
                  Last Purchase Date
                  {sortConfig.key === 'lastPurchaseDate' && (
                    <span className="sort-indicator">
                      {sortConfig.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('lastAmount')}>
                  Last Amount Purchased
                  {sortConfig.key === 'lastAmount' && (
                    <span className="sort-indicator">
                      {sortConfig.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort(totalKey)}>
                  Total
                  {sortConfig.key === totalKey && (
                    <span className="sort-indicator">
                      {sortConfig.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.lastPurchaseDate}</td>
                  <td>{item.lastAmount}</td>
                  <td>{item[totalKey]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="trends-right">
          <div className="chart-container">
            <div className="trends-placeholder">
            <div className="chart-top-controls">
              <div className="range-toggle-container">
              {['Quantity', 'Price'].map((m) => (
                <button
                  key={m}
                  className={mode === m ? 'active' : ''}
                  onClick={() => onModeChange && onModeChange(m)}
                >
                  {m}
                </button>
              ))}
              </div>
              <div className="time-range-buttons range-toggle-container">
              {['Monthly', 'Quarterly', 'Yearly'].map((range) => (
                <button
                  key={range}
                  className={selectedRange === range ? 'active' : ''}
                  onClick={() => setSelectedRange(range)}
                >
                  {range}
                </button>
              ))}
              </div>
            </div>
            {displayedItems.length === 0 ? (
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
                  {/* horizontal grid lines */}
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
                  {/* vertical grid lines */}
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
                  {/* axis lines */}
                  <line x1="0" y1="0" x2="0" y2="160" stroke="#666" />
                  <line x1="0" y1="160" x2="600" y2="160" stroke="#666" />
                  {seriesData.map((series) => (
                    <g key={series.id}>
                      <path
                        d={series.path}
                        fill="none"
                        stroke={series.color}
                        strokeWidth="3"
                      />
                      {series.pts.map((p, i) => (
                        <circle
                          key={i}
                          cx={p[0]}
                          cy={p[1]}
                          r="3"
                          fill={series.color}
                        />
                      ))}
                    </g>
                  ))}
                </svg>
                <div className="x-axis">
                  {axisLabels.map((d) => (
                    <span key={d.label}>{d.label}</span>
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
