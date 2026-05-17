import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AnomalySeverityDoughnut({ distribution }) {
  const high = distribution?.high ?? 0;
  const medium = distribution?.medium ?? 0;
  const low = distribution?.low ?? 0;
  const total = distribution?.total ?? (high + medium + low);

  const data = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        data: [high, medium, low],
        backgroundColor: [
          'rgba(239, 68, 68, 0.9)',
          'rgba(245, 158, 11, 0.9)',
          'rgba(59, 130, 246, 0.9)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
        ],
        borderWidth: 0,
        hoverOffset: 6,
        spacing: 3,
        borderRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
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
        callbacks: {
          label: (ctx) => {
            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0.0';
            return ` ${ctx.label}: ${ctx.raw.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  const legendItems = [
    {
      label: 'High',
      color: '#ef4444',
      count: high,
      pct: total > 0 ? ((high / total) * 100).toFixed(0) : '0',
    },
    {
      label: 'Medium',
      color: '#f59e0b',
      count: medium,
      pct: total > 0 ? ((medium / total) * 100).toFixed(0) : '0',
    },
    {
      label: 'Low',
      color: '#3b82f6',
      count: low,
      pct: total > 0 ? ((low / total) * 100).toFixed(0) : '0',
    },
  ];

  return (
    <div
      className="rounded-xl p-6 h-full"
      style={{ background: '#0d1238', border: '1px solid #1a2555' }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[15px] font-semibold text-white">Anomaly Severity</h3>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
          style={{ background: '#131b4d', border: '1px solid #1a2555', color: '#7a84b3' }}
        >
          Live
        </span>
      </div>

      <div className="flex flex-col items-center gap-6">
        {/* Chart wrapper with HTML center overlay */}
        <div style={{ position: 'relative', width: '192px', height: '192px' }}>
          <Doughnut data={data} options={options} />
          {/* Center text — rendered as HTML, not a Chart.js plugin */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
              {total.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#4a5490', marginTop: '4px' }}>
              Anomalies
            </div>
          </div>
        </div>

        <div className="w-full space-y-3">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="text-[13px] font-medium" style={{ color: '#7a84b3' }}>
                  {item.label}
                </span>
              </div>
              <span className="text-[13px] font-semibold" style={{ color: '#c8d0e7' }}>
                {item.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
