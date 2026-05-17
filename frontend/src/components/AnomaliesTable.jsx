import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

const criticalityConfig = {
  High: { dot: '#ef4444' },
  Medium: { dot: '#f59e0b' },
  Low: { dot: '#3b82f6' },
};

function getCriticality(level) {
  const lvl = String(level).toUpperCase();
  if (['CRITICAL', 'ERROR', 'FATAL'].includes(lvl)) return 'High';
  if (lvl === 'WARNING') return 'Medium';
  return 'Low';
}

export default function AnomaliesTable({ anomalies = [] }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#0d1238', border: '1px solid #1a2555' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid #1a2555' }}
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
          <h3 className="text-[15px] font-semibold text-white">Recent Anomalies</h3>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
            style={{ background: '#131b4d', color: '#7a84b3', border: '1px solid #1a2555' }}
          >
            {anomalies.filter((a) => getCriticality(a.level) === 'High').length} critical
          </span>
        </div>
        <a
          href="#"
          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
          style={{ color: '#818cf8' }}
        >
          View all <ArrowRight size={14} />
        </a>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #1a2555' }}>
              {['Criticality', 'Timestamp', 'Project ID', 'Description'].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: '#3d4a7a' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {anomalies.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-xs" style={{ color: '#4a5490' }}>
                  No active anomalies detected by AI.
                </td>
              </tr>
            )}
            {anomalies.map((row) => {
              const crit = getCriticality(row.level);
              const cfg = criticalityConfig[crit];
              return (
                <tr
                  key={row.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid rgba(26,37,85,0.5)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(13,18,56,0.8)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md"
                      style={{
                        background: '#131b4d',
                        color: '#7a84b3',
                        border: '1px solid #1a2555',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: cfg.dot }}
                      />
                      {crit}
                    </span>
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-[13px] font-mono"
                    style={{ color: '#4a5490' }}
                  >
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="text-[12px] font-semibold font-mono px-2 py-0.5 rounded"
                      style={{ background: '#131b4d', color: '#7a84b3' }}
                    >
                      {row.project_id ? `PROJ-${row.project_id}` : 'ORPHAN'}
                    </span>
                  </td>
                  <td
                    className="px-6 py-4 text-[13px] max-w-md"
                    style={{ color: '#5a6498' }}
                  >
                    <span className="line-clamp-2">{row.message}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
