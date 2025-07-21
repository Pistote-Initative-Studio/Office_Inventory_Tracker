import React, { useMemo, useState } from 'react';
import './Trends.css';

const monthlyData = [
  { label: 'Jan', value: 30 },
  { label: 'Feb', value: 45 },
  { label: 'Mar', value: 28 },
  { label: 'Apr', value: 60 },
  { label: 'May', value: 80 },
  { label: 'Jun', value: 75 },
  { label: 'Jul', value: 90 },
  { label: 'Aug', value: 65 },
  { label: 'Sep', value: 70 },
  { label: 'Oct', value: 95 },
  { label: 'Nov', value: 85 },
  { label: 'Dec', value: 100 },
];

const quarterlyData = [
  { label: 'Q1', value: 120 },
  { label: 'Q2', value: 200 },
  { label: 'Q3', value: 180 },
  { label: 'Q4', value: 220 },
];

const yearlyData = [
  { label: '2021', value: 650 },
  { label: '2022', value: 720 },
  { label: '2023', value: 810 },
  { label: '2024', value: 950 },
];

function scaleData(base, factor) {
  return base.map((d) => ({ label: d.label, value: Math.round(d.value * factor) }));
}

const sampleItems = [
  {
    id: 1,
    name: 'Pens',
    lastPurchaseDate: '2024-05-18',
    lastAmount: 100,
    monthlyTotal: 300,
    quarterlyTotal: 800,
    yearlyTotal: 2500,
    monthly: scaleData(monthlyData, 1),
    quarterly: scaleData(quarterlyData, 1),
    yearly: scaleData(yearlyData, 1),
    monthlyPrice: scaleData(monthlyData, 0.5),
    quarterlyPrice: scaleData(quarterlyData, 0.5),
    yearlyPrice: scaleData(yearlyData, 0.5),
  },
  {
    id: 2,
    name: 'Notebooks',
    lastPurchaseDate: '2024-05-10',
    lastAmount: 50,
    monthlyTotal: 260,
    quarterlyTotal: 700,
    yearlyTotal: 2100,
    monthly: scaleData(monthlyData, 0.8),
    quarterly: scaleData(quarterlyData, 0.8),
    yearly: scaleData(yearlyData, 0.8),
    monthlyPrice: scaleData(monthlyData, 0.4),
    quarterlyPrice: scaleData(quarterlyData, 0.4),
    yearlyPrice: scaleData(yearlyData, 0.4),
  },
  {
    id: 3,
    name: 'Markers',
    lastPurchaseDate: '2024-05-22',
    lastAmount: 30,
    monthlyTotal: 340,
    quarterlyTotal: 900,
    yearlyTotal: 2800,
    monthly: scaleData(monthlyData, 1.2),
    quarterly: scaleData(quarterlyData, 1.2),
    yearly: scaleData(yearlyData, 1.2),
    monthlyPrice: scaleData(monthlyData, 0.6),
    quarterlyPrice: scaleData(quarterlyData, 0.6),
    yearlyPrice: scaleData(yearlyData, 0.6),
  },
  {
    id: 4,
    name: 'Staplers',
    lastPurchaseDate: '2024-05-05',
    lastAmount: 20,
    monthlyTotal: 200,
    quarterlyTotal: 540,
    yearlyTotal: 1500,
    monthly: scaleData(monthlyData, 0.6),
    quarterly: scaleData(quarterlyData, 0.6),
    yearly: scaleData(yearlyData, 0.6),
    monthlyPrice: scaleData(monthlyData, 0.3),
    quarterlyPrice: scaleData(quarterlyData, 0.3),
    yearlyPrice: scaleData(yearlyData, 0.3),
  },
  {
    id: 5,
    name: 'Paper Clips',
    lastPurchaseDate: '2024-05-15',
    lastAmount: 200,
    monthlyTotal: 450,
    quarterlyTotal: 1100,
    yearlyTotal: 3300,
    monthly: scaleData(monthlyData, 1.5),
    quarterly: scaleData(quarterlyData, 1.5),
    yearly: scaleData(yearlyData, 1.5),
    monthlyPrice: scaleData(monthlyData, 0.75),
    quarterlyPrice: scaleData(quarterlyData, 0.75),
    yearlyPrice: scaleData(yearlyData, 0.75),
  },
];

function Trends({ mode = 'Quantity', onModeChange }) {
  const [selectedRange, setSelectedRange] = useState('Monthly');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([sampleItems[0]]);
  const [selectedItem, setSelectedItem] = useState(sampleItems[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const displayedItems = useMemo(() => {
    return isCompareMode ? selectedItems : [selectedItem];
  }, [isCompareMode, selectedItem, selectedItems]);

  const colors = ['#3a82ff', '#58c13b', '#ff5722', '#6f42c1'];

  const rangeKey = selectedRange.toLowerCase();
  const seriesKey = mode === 'Price' ? `${rangeKey}Price` : rangeKey;

  const maxValue = useMemo(() => {
    return Math.max(
      ...displayedItems.flatMap((it) => it[seriesKey].map((d) => d.value))
    );
  }, [displayedItems, seriesKey]);

  const seriesData = useMemo(() => {
    const width = 600;
    const height = 160;
    return displayedItems.map((item, idx) => {
      const pts = item[seriesKey].map((d, i) => {
        const x = (width / (item[seriesKey].length - 1)) * i;
        const y = height - (d.value / maxValue) * (height - 20) + 10;
        return [x, y];
      });
      const path = pts
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`)
        .join(' ');
      return { id: item.id, color: colors[idx % colors.length], pts, path };
    });
  }, [displayedItems, seriesKey, maxValue]);

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

  const handleCompareChange = (e) => {
    const checked = e.target.checked;
    console.log('isCompareMode', checked);
    setIsCompareMode(checked);
    if (checked) {
      setSelectedItems((prev) => (prev.length ? prev : [selectedItem]));
    } else {
      setSelectedItem(selectedItems[0] || selectedItem);
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
                  : selectedItem.name}
              </button>
              {isDropdownOpen && (
                <ul className="dropdown-menu">
                  {sampleItems.map((item) => {
                    const isSelected = isCompareMode
                      ? selectedItems.some((it) => it.id === item.id)
                      : selectedItem.id === item.id;
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
                <th>ID</th>
                <th>Name</th>
                <th>Last Purchase Date</th>
                <th>Last Amount Purchased</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.map((item) => (
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
              {(displayedItems[0] || sampleItems[0])[rangeKey].map((d) => (
                <span key={d.label}>{d.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

export default Trends;
