import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import KPICards from './KPICards';
import AnomalyFrequencyChart from './AnomalyFrequencyChart';
import AnomalySeverityDoughnut from './AnomalySeverityDoughnut';
import AnomaliesTable from './AnomaliesTable';
import UsersPage from './UsersPage';
import AnomaliesPage from './AnomaliesPage';
import ProfilePage from './ProfilePage';
import { Settings } from 'lucide-react';
import api from '../services/api';

export default function DashboardView({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [anomalies, setAnomalies] = useState([]);
  const [totalAnomalies, setTotalAnomalies] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [anomaliesResponse, projectsResponse] = await Promise.all([
          api.get('/api/logs', { params: { page: 1, page_size: 200, anomaly_only: true } }),
          api.get('/api/projects'),
        ]);

        setAnomalies(Array.isArray(anomaliesResponse.data?.items) ? anomaliesResponse.data.items : []);
        setTotalAnomalies(anomaliesResponse.data?.total || 0);
        setProjectsCount(Array.isArray(projectsResponse.data) ? projectsResponse.data.length : 0);
      } catch {
        setAnomalies([]);
        setTotalAnomalies(0);
        setProjectsCount(0);
      }
    };

    fetchDashboardData();
  }, []);

  // Compute severity distribution from anomalies
  const severityDistribution = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const a of anomalies) {
      const level = String(a?.level || '').toUpperCase();
      if (['ERROR', 'CRITICAL', 'FATAL'].includes(level)) high += 1;
      else if (level === 'WARNING') medium += 1;
      else low += 1;
    }

    const counted = high + medium + low;
    return { high, medium, low, total: Math.max(counted, totalAnomalies) };
  }, [anomalies, totalAnomalies]);

  return (
    <div className="flex min-h-screen" style={{ background: '#060b28' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} collapsed={collapsed} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onLogout={onLogout} onToggleSidebar={() => setCollapsed(!collapsed)} onProfileClick={() => setActiveTab('profile')} />

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-5">
            {activeTab === 'users' ? (
              <UsersPage />
            ) : activeTab === 'anomalies' ? (
              <AnomaliesPage />
            ) : activeTab === 'profile' ? (
              <ProfilePage onSaveSuccess={() => setActiveTab('dashboard')} />
            ) : (
              <>
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white tracking-tight">
                      Dashboard
                    </h1>
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-md"
                      style={{ background: '#131b4d', color: '#4a5490', border: '1px solid #1a2555' }}
                    >
                      ☰ Index
                    </span>
                  </div>
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: '#131b4d',
                      color: '#7a84b3',
                      border: '1px solid #1a2555',
                    }}
                  >
                    <Settings size={14} />
                    Settings
                  </button>
                </div>

                {/* KPI Cards */}
                <KPICards
                  activeProjects={projectsCount}
                  anomaliesCount={totalAnomalies}
                  severityDistribution={severityDistribution}
                />

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2">
                    <AnomalyFrequencyChart anomalies={anomalies} />
                  </div>
                  <div>
                    <AnomalySeverityDoughnut distribution={severityDistribution} />
                  </div>
                </div>

                {/* Anomalies Table */}
                <AnomaliesTable anomalies={anomalies.slice(0, 10)} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
