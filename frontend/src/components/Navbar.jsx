import React, { useState, useEffect } from 'react';
import { BellRing, Scan, Layers, MessageCircle, Package, LogOut, Check } from 'lucide-react';
import api from '../services/api';

export default function Navbar({ onLogout, onToggleSidebar, onProfileClick }) {
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profRes, notifRes] = await Promise.all([
          api.get('/api/profile'),
          api.get('/api/notifications')
        ]);
        setProfile(profRes.data);
        setNotifications(notifRes.data.items || []);
        setUnreadCount(notifRes.data.unread_count || 0);
      } catch (err) {
        console.error("Failed to load navbar data", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setUnreadCount(Math.max(0, unreadCount - 1));
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  return (
    <header
      className="h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30"
      style={{
        background: 'rgba(8, 12, 40, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #131b4d',
      }}
    >
      {/* Left — Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          className="p-2 rounded-lg transition-colors"
          style={{ color: '#4a5490' }}
          onClick={onToggleSidebar}
        >
          <Layers size={18} />
        </button>
        <div
          className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg"
          style={{ background: '#0d1238', border: '1px solid #1a2555' }}
        >
          <Scan size={16} style={{ color: '#3d4a7a' }} />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm flex-1"
            style={{ color: '#7a84b3' }}
          />
        </div>
      </div>

      {/* Right — Icons */}
      <div className="flex items-center gap-1">
        {/* Messages / Notifications Dropdown */}
        <div className="relative">
          <button
            className="relative p-2.5 rounded-lg transition-colors"
            style={{ color: showNotifs ? '#818cf8' : '#4a5490' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#818cf8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = showNotifs ? '#818cf8' : '#4a5490')}
            onClick={() => setShowNotifs(!showNotifs)}
          >
            <MessageCircle size={18} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full"
                style={{
                  background: '#06b6d4',
                  boxShadow: '0 0 6px #06b6d4',
                }}
              />
            )}
          </button>

          {showNotifs && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
              style={{ background: '#0d1238', border: '1px solid #1a2555' }}
            >
              <div className="p-4 border-b border-[#1a2555] flex justify-between items-center">
                <h3 className="text-white text-sm font-semibold">Alerts & Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[#06b6d4] hover:text-white transition-colors">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#4a5490]">No notifications yet.</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className="p-4 border-b border-[#1a2555] hover:bg-[#131b4d] transition-colors cursor-pointer group flex gap-3"
                      style={{ opacity: n.is_read ? 0.6 : 1 }}
                      onClick={() => !n.is_read && markRead(n.id)}
                    >
                      <div className="mt-1">
                        {!n.is_read ? (
                          <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_6px_#06b6d4]"></div>
                        ) : (
                          <Check size={12} className="text-[#4a5490]" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white mb-1">{n.title}</div>
                        <div className="text-[11px] text-[#7a84b3] line-clamp-2">{n.message}</div>
                        <div className="text-[10px] text-[#4a5490] mt-2">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Other Icons */}
        {[BellRing, Package].map((Icon, i) => (
          <button
            key={i}
            className="relative p-2.5 rounded-lg transition-colors"
            style={{ color: '#4a5490' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#818cf8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#4a5490')}
          >
            <Icon size={18} />
          </button>
        ))}

        <div className="w-px h-6 mx-2" style={{ background: '#1a2555' }} />

        {/* Avatar — navigates to Profile */}
        <button
          onClick={onProfileClick}
          className="flex items-center gap-2 pl-2"
          title="View Profile"
        >
          <div
            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            }}
          >
            {profile?.avatar ? (
              <img src={`${api.defaults.baseURL || 'http://localhost:8000'}${profile.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">
                {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'AD'}
              </span>
            )}
          </div>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="p-2.5 rounded-lg transition-colors"
          style={{ color: '#4a5490' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#4a5490')}
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
