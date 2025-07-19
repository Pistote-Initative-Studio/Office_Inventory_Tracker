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

function Trends() {
  const [selectedRange, setSelectedRange] = useState('Monthly');

  const data = useMemo(() => {
    if (selectedRange === 'Quarterly') return quarterlyData;
    if (selectedRange === 'Yearly') return yearlyData;
    return monthlyData;
  }, [selectedRange]);

  const points = useMemo(() => {
    const width = 600;
    const height = 160; // leave some padding for labels
    const max = Math.max(...data.map((d) => d.value));
    return data.map((d, i) => {
      const x = (width / (data.length - 1)) * i;
      const y = height - (d.value / max) * (height - 20) + 10; // vertical padding
      return [x, y];
    });
  }, [data]);

  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`)
    .join(' ');

  return (
    <div className="trends-container">
      <div className="trends-header">
        <h2>Purchase Trends Overview</h2>
        <div className="range-toggle">
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
      <div className="trends-placeholder">
        <svg viewBox="0 0 600 200" width="100%" height="200">
          <path d={pathData} fill="none" stroke="#007bff" strokeWidth="2" />
          {points.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#007bff" />
          ))}
        </svg>
        <div className="x-axis">
          {data.map((d) => (
            <span key={d.label}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Trends;
