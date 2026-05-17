import React from 'react';
import {
  Gauge,
  Boxes,
  Radar,
  ScrollText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const menuSections = [
  {
    label: null,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Gauge, hasSubmenu: true },
    ],
  },
  {
    label: null,
    items: [
      { id: 'users', label: 'Users', icon: Boxes, hasSubmenu: true },
      { id: 'anomalies', label: 'Anomalies', icon: Radar, hasSubmenu: true },
    ],
  },
];

export default function Sidebar({ activeTab, setActiveTab, collapsed }) {
  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden"
      style={{
        background: '#0a0f2e',
        width: collapsed ? '68px' : '240px',
      }}
    >
      {/* Brand */}
      <div
        className="h-16 flex items-center px-5 overflow-hidden whitespace-nowrap"
        style={{ borderBottom: '1px solid #131b4d' }}
      >
        {!collapsed && (
          <span className="text-[14px] font-bold text-white tracking-tight">logwatch-ai-agent</span>
        )}
        {collapsed && (
          <span className="text-[14px] font-bold text-white">L</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        {menuSections.map((section, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? 'mt-4' : ''}>
            {section.label && !collapsed && (
              <div
                className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: '#3d4a7a' }}
              >
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="w-full flex items-center gap-3 py-2.5 text-[13px] font-medium rounded-lg mb-0.5 transition-all duration-200"
                  style={{
                    padding: collapsed ? '10px 0' : undefined,
                    paddingLeft: collapsed ? undefined : '12px',
                    paddingRight: collapsed ? undefined : '12px',
                    justifyContent: collapsed ? 'center' : undefined,
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))'
                      : 'transparent',
                    color: isActive ? '#818cf8' : '#7a84b3',
                    borderLeft: collapsed ? 'none' : (isActive ? '3px solid #818cf8' : '3px solid transparent'),
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={17} style={{ color: isActive ? '#818cf8' : '#4a5490' }} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.hasSubmenu && (
                        isActive
                          ? <ChevronDown size={14} style={{ color: '#818cf8' }} />
                          : <ChevronRight size={14} style={{ color: '#3d4a7a' }} />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
