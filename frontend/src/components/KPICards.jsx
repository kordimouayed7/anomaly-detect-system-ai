import React from 'react';
import {
  ShieldAlert,
  Cpu,
  Flame,
  HeartPulse,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export default function KPICards({ activeProjects = 0, anomaliesCount = 0, severityDistribution = {} }) {
  const high = severityDistribution.high || 0;
  const medium = severityDistribution.medium || 0;
  const low = severityDistribution.low || 0;

  // System health: if 0 anomalies = 100% healthy, more high-severity = lower health
  const healthScore = anomaliesCount === 0
    ? 100
    : Math.max(0, 100 - (high * 10) - (medium * 3) - (low * 1));
  const healthFormat = healthScore.toFixed(1) + '%';

  const kpis = [
    {
      title: 'Total Anomalies',
      value: Number(anomaliesCount).toLocaleString(),
      change: anomaliesCount > 0 ? 'Investigate' : 'All Clear',
      trend: anomaliesCount > 0 ? 'down' : 'up',
      icon: ShieldAlert,
    },
    {
      title: 'Active Projects',
      value: Number(activeProjects).toLocaleString(),
      change: 'Monitored',
      trend: 'up',
      icon: Cpu,
    },
    {
      title: 'High Severity',
      value: String(high),
      change: high > 0 ? 'Critical' : 'Secure',
      trend: high > 0 ? 'down' : 'up',
      icon: Flame,
    },
    {
      title: 'System Health',
      value: healthFormat,
      change: 'Live AI Scan',
      trend: healthScore > 80 ? 'up' : 'down',
      icon: HeartPulse,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.title}
            className="rounded-xl p-5 transition-all duration-300"
            style={{
              background: '#0d1238',
              border: '1px solid #1a2555',
            }}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <p
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: '#ffffff' }}
                >
                  {kpi.value}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold mt-1"
                  style={{
                    color: kpi.trend === 'up'
                      ? '#22c55e'
                      : '#ef4444',
                  }}
                >
                  {kpi.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpi.change}
                </span>
              </div>
              <Icon size={20} style={{ color: '#3d4a7a' }} />
            </div>

            <p
              className="text-[12px] font-medium mt-3"
              style={{ color: '#4a5490' }}
            >
              {kpi.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}
