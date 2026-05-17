import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function LogDistributionDoughnut({ distribution }) {
  const infoCount = distribution?.info ?? 0;
  const warningCount = distribution?.warning ?? 0;
  const errorCount = distribution?.error ?? 0;
  const total = distribution?.total ?? 0;

  const data = {
    labels: ['INFO', 'WARNING', 'ERROR'],
    datasets: [
      {
        data: [infoCount, warningCount, errorCount],
        backgroundColor: [
          'rgba(59, 130, 246, 0.9)',
          'rgba(245, 158, 11, 0.9)',
          'rgba(239, 68, 68, 0.9)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
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

  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw(chart) {
      const { width, height, ctx } = chart;
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const x = width / 2;
      const y = height / 2;

      const dataset = chart?.data?.datasets?.[0]?.data || [];
      const liveInfo = Number(dataset[0] || 0);
      const liveWarning = Number(dataset[1] || 0);
      const liveError = Number(dataset[2] || 0);
      const liveTotal = liveInfo + liveWarning + liveError;
      const mainPct = liveTotal > 0 ? ((liveInfo / liveTotal) * 100).toFixed(0) : '0';

      ctx.font = '700 24px "DM Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${mainPct}%`, x, y - 8);

      ctx.font = '500 11px "DM Sans", sans-serif';
      ctx.fillStyle = '#4a5490';
      ctx.fillText('Total Logs', x, y + 14);
      ctx.save();
    },
  };

  const legendItems = [
    {
      label: 'INFO',
      color: '#3b82f6',
      pct: total > 0 ? ((infoCount / total) * 100).toFixed(0) : '0',
    },
    {
      label: 'WARNING',
      color: '#f59e0b',
      pct: total > 0 ? ((warningCount / total) * 100).toFixed(0) : '0',
    },
    {
      label: 'ERROR',
      color: '#ef4444',
      pct: total > 0 ? ((errorCount / total) * 100).toFixed(0) : '0',
    },
  ];

  return (
    <div
      className="rounded-xl p-6 h-full"
      style={{ background: '#0d1238', border: '1px solid #1a2555' }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[15px] font-semibold text-white">Log Distribution</h3>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
          style={{ background: '#131b4d', border: '1px solid #1a2555', color: '#7a84b3' }}
        >
          Live
        </span>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="h-48 w-48">
          <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
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
