import React, { useCallback, useEffect, useState } from 'react';
import { User, Mail, Shield, Save, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function ProfilePage({ onSaveSuccess }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/profile');
      setProfile(response.data);
      setName(response.data.name || '');
      setAlertEmail(response.data.alert_email || '');
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load profile.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      const response = await api.put('/api/profile', {
        name,
        alert_email: alertEmail,
      });
      setProfile(response.data);
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => {
        setFeedback({ type: '', message: '' });
        if (onSaveSuccess) onSaveSuccess();
      }, 1000);
    } catch {
      setFeedback({ type: 'error', message: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="px-6 py-12 text-center rounded-xl"
        style={{ background: '#0d1238', border: '1px solid #1a2555' }}
      >
        <p className="text-[14px] font-medium text-white">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <User size={20} style={{ color: '#818cf8' }} /> Profile
        </h1>
        <p className="text-[13px] mt-1" style={{ color: '#4a5490' }}>
          Manage your account details and alert preferences
        </p>
      </div>

      {/* Avatar Card */}
      <div
        className="rounded-xl p-6 flex items-center gap-5"
        style={{ background: '#0d1238', border: '1px solid #1a2555' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden cursor-pointer group"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          }}
          onClick={() => document.getElementById('avatar-upload').click()}
        >
          {profile?.avatar ? (
            <img src={`${api.defaults.baseURL || 'http://localhost:8000'}${profile.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-xl font-bold">
              {(name || profile?.email || 'U').substring(0, 2).toUpperCase()}
            </span>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs font-semibold">Upload</span>
          </div>
          <input
            type="file"
            id="avatar-upload"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const formData = new FormData();
              formData.append('file', file);
              try {
                const res = await api.post('/api/profile/avatar', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                });
                setProfile({ ...profile, avatar: res.data.avatar });
                setFeedback({ type: 'success', message: 'Avatar updated!' });
                setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
              } catch {
                setFeedback({ type: 'error', message: 'Failed to upload avatar' });
              }
            }}
          />
        </div>
        <div>
          <p className="text-[16px] font-semibold text-white">{name || 'Unnamed Admin'}</p>
          <p className="text-[13px] mt-0.5" style={{ color: '#4a5490' }}>
            {profile?.email}
          </p>
          <p className="text-[11px] mt-1" style={{ color: '#3d4a7a' }}>
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div
        className="rounded-xl p-6 space-y-5"
        style={{ background: '#0d1238', border: '1px solid #1a2555' }}
      >
        <h2 className="text-[14px] font-bold text-white flex items-center gap-2">
          <Shield size={15} style={{ color: '#818cf8' }} /> Account Settings
        </h2>

        {/* Name Field */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#4a5490' }}>
            Admin Display Name
          </label>
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg"
            style={{ background: '#080d2a', border: '1px solid #1a2555' }}
          >
            <User size={15} style={{ color: '#4a5490' }} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-transparent border-none outline-none text-sm flex-1"
              style={{ color: '#c8d0e7' }}
            />
          </div>
        </div>



        {/* Alert Email */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#4a5490' }}>
            Alert Email
          </label>
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg"
            style={{ background: '#080d2a', border: '1px solid #1a2555' }}
          >
            <Mail size={15} style={{ color: '#ef4444' }} />
            <input
              type="email"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              placeholder="Where system anomaly alerts are sent"
              className="bg-transparent border-none outline-none text-sm flex-1"
              style={{ color: '#c8d0e7' }}
            />
          </div>
          <p className="text-[11px]" style={{ color: '#3d4a7a' }}>
            Anomaly detection alerts will be sent to this address. Leave empty to use the default.
          </p>
        </div>

        {/* Feedback */}
        {feedback.message && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-medium"
            style={{
              background: feedback.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: feedback.type === 'success' ? '#22c55e' : '#ef4444',
            }}
          >
            {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {feedback.message}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            color: '#ffffff',
            border: 'none',
          }}
          onMouseEnter={(e) => {
            if (!isSaving) e.currentTarget.style.opacity = '0.85';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <Save size={15} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
