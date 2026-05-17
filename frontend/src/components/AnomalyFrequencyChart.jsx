import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Calendar } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function AnomalyFrequencyChart({ anomalies = [] }) {
  const [range, setRange] = useState('week');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });

  const currentData = useMemo(() => {
    const start = new Date(selectedDate);
    const count = range === 'week' ? 7 : 30;
    const labels = [];
    const buckets = {};

    // Generate date labels and empty buckets
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      labels.push(label);
      buckets[key] = 0;
    }

    // Count anomalies per day
    for (const a of anomalies) {
      if (!a.timestamp) continue;
      const ts = new Date(a.timestamp);
      const key = ts.toISOString().split('T')[0];
      if (key in buckets) {
        buckets[key] += 1;
      }
    }

    const values = Object.values(buckets);
    return { labels, values };
  }, [anomalies, selectedDate, range]);

  const data = {
    labels: currentData.labels,
    datasets: [
      {
        label: 'Anomalies',
        data: currentData.values,
        borderColor: 'rgba(236, 72, 153, 1)',
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: context, chartArea } = chart;
          if (!chartArea) return 'rgba(236, 72, 153, 0.1)';
          const gradient = context.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(236, 72, 153, 0.25)');
          gradient.addColorStop(1, 'rgba(236, 72, 153, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgba(236, 72, 153, 1)',
        pointBorderColor: '#0d1238',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0d1238',
        titleColor: '#c8d0e7',
        bodyColor: '#7a84b3',
        borderColor: '#1a2555',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (item) => `${item.raw} anomalies detected`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(26, 37, 85, 0.6)', drawBorder: false },
        ticks: { 
          color: '#4a5490', 
          font: { size: 12, family: '"DM Sans"' },
          maxTicksLimit: range === 'month' ? 10 : 7 
        },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(26, 37, 85, 0.6)', drawBorder: false },
        ticks: { 
          color: '#4a5490', 
          font: { size: 12, family: '"DM Sans"' }, 
          stepSize: 1,
          precision: 0,
        },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div
      className="rounded-xl p-6"
      style={{ background: '#0d1238', border: '1px solid #1a2555' }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[15px] font-semibold text-white">Anomalies Over Time</h3>
        
        <div className="flex items-center gap-3">
          {/* Week/Month Toggle */}
          <div className="flex items-center p-1 rounded-lg" style={{ background: '#080d2a', border: '1px solid #1a2555' }}>
            {['week', 'month'].map((f) => (
              <button
                key={f}
                onClick={() => setRange(f)}
                className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-200"
                style={{
                  background: range === f ? '#1a2555' : 'transparent',
                  color: range === f ? '#c8d0e7' : '#4a5490',
                }}
              >
                {f === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <div 
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors group cursor-pointer" 
            style={{ background: '#080d2a', border: '1px solid #1a2555' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#243375'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1a2555'; }}
          >
            <Calendar size={14} style={{ color: '#818cf8' }} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none outline-none text-[12px] font-medium cursor-pointer"
              style={{ color: '#c8d0e7', colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>
      
      <div className="h-72">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
