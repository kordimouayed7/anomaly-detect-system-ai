import React, { useEffect, useState } from 'react';
import {
  Plus,
  Copy,
  Check,
  X,
  Search,
} from 'lucide-react';
import api from '../services/api';

function maskKey(key) {
  if (!key) return '';
  const prefix = key.slice(0, 8);
  const suffix = key.slice(-3);
  return `${prefix}${'••••••••'}${suffix}`;
}

function formatCreatedDate(isoString) {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return isoString;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

/* ---------- Create Project Modal ---------- */
function CreateModal({ isOpen, onClose, onSave, isSubmitting }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      user_email: userEmail.trim() || null,
    });
    setName('');
    setDescription('');
    setUserEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md mx-4"
        style={{
          background: 'rgba(10, 10, 15, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          padding: '36px 32px 28px',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-[22px] font-bold"
            style={{ color: '#ffffff', fontStyle: 'italic' }}
          >
            New User (Project)
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="User/Project name"
              className="w-full text-sm outline-none transition-all box-border"
              style={{
                padding: '14px 20px',
                color: '#ffffff',
                background: 'rgba(20, 20, 28, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '30px',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
          </div>

          <div className="relative">
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="User Email"
              className="w-full text-sm outline-none transition-all box-border"
              style={{
                padding: '14px 20px',
                color: '#ffffff',
                background: 'rgba(20, 20, 28, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '30px',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
          </div>

          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full text-sm outline-none transition-all box-border resize-none"
              style={{
                padding: '14px 20px',
                color: '#ffffff',
                background: 'rgba(20, 20, 28, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '18px',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-sm font-semibold transition-all disabled:opacity-70"
            style={{
              padding: '14px',
              color: '#000000',
              background: '#ffffff',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {isSubmitting ? 'Saving...' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------- Update Project Modal ---------- */
function UpdateModal({ isOpen, onClose, onSave, isSubmitting, initialData }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setUserEmail(initialData.user_email || '');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave(initialData.id, {
      name: name.trim(),
      description: description.trim() || null,
      user_email: userEmail.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md mx-4"
        style={{
          background: 'rgba(10, 10, 15, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          padding: '36px 32px 28px',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-[22px] font-bold"
            style={{ color: '#ffffff', fontStyle: 'italic' }}
          >
            Edit User (Project)
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="User/Project name"
              className="w-full text-sm outline-none transition-all box-border"
              style={{
                padding: '14px 20px',
                color: '#ffffff',
                background: 'rgba(20, 20, 28, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '30px',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
          </div>

          <div className="relative">
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="User Email"
              className="w-full text-sm outline-none transition-all box-border"
              style={{
                padding: '14px 20px',
                color: '#ffffff',
                background: 'rgba(20, 20, 28, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '30px',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
          </div>

          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full text-sm outline-none transition-all box-border resize-none"
              style={{
                padding: '14px 20px',
                color: '#ffffff',
                background: 'rgba(20, 20, 28, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '18px',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-sm font-semibold transition-all disabled:opacity-70"
            style={{
              padding: '14px',
              color: '#000000',
              background: '#ffffff',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------- Projects Page ---------- */
export default function UsersPage() {
  const [projects, setProjects] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    setError('');
    try {
      const response = await api.get('/api/projects');
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load projects.');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCopy = (id, key) => {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async ({ name, description, user_email }) => {
    setIsCreating(true);
    setError('');
    try {
      await api.post('/api/projects', { name, description, user_email });
      await fetchProjects();
      setModalOpen(false);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create project.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id, data) => {
    setIsUpdating(true);
    setError('');
    try {
      await api.put(`/api/projects/${id}`, data);
      await fetchProjects();
      setUpdateModalOpen(false);
      setEditingProject(null);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update project.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.post(`/api/projects/${id}/revoke-key`);
      await fetchProjects();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to revoke key.');
    }
  };

  const handleRotate = async (id) => {
    try {
      await api.post(`/api/projects/${id}/rotate-key`);
      await fetchProjects();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to rotate key.');
    }
  };

  const handleUnrevoke = async (id) => {
    try {
      await api.post(`/api/projects/${id}/unrevoke-key`);
      await fetchProjects();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to unrevoke key.');
    }
  };

  const filtered = projects.filter((p) => {
    const term = search.toLowerCase();
    const nameMatch = String(p.name || '').toLowerCase().includes(term);
    const descriptionMatch = String(p.description || '').toLowerCase().includes(term);
    return nameMatch || descriptionMatch;
  });

  return (
    <>
      <CreateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
        isSubmitting={isCreating}
      />
      
      <UpdateModal
        isOpen={updateModalOpen}
        onClose={() => { setUpdateModalOpen(false); setEditingProject(null); }}
        onSave={handleUpdate}
        isSubmitting={isUpdating}
        initialData={editingProject}
      />

      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Users</h1>
            <p className="text-[13px] mt-1" style={{ color: '#4a5490' }}>
              {projects.length} total
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
            style={{
              background: '#ffffff',
              color: '#000000',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <Plus size={16} />
            Create New User
          </button>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg w-full sm:max-w-sm"
          style={{ background: '#0d1238', border: '1px solid #1a2555' }}
        >
          <Search size={15} style={{ color: '#3d4a7a' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="bg-transparent border-none outline-none text-sm flex-1"
            style={{ color: '#7a84b3' }}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: '#0d1238', border: '1px solid #1a2555' }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1a2555' }}>
                  {['ID', 'User', 'User Email', 'Project Description', 'Status', 'API Key', 'Created', 'Actions'].map((h) => (
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
                {!isLoading && filtered.map((project, idx) => (
                  <tr
                    key={project.id}
                    className="transition-colors"
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(26,37,85,0.5)' : 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(13,18,56,0.8)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-mono" style={{ color: '#7a84b3' }}>
                      {project.id}
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-[14px] font-semibold text-white">{project.name}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-[13px]" style={{ color: '#7a84b3' }}>
                        {project.user_email || '-'}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-[13px]" style={{ color: '#7a84b3', maxWidth: '360px' }}>
                        {project.description || '-'}
                      </p>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2 py-1 rounded text-[11px] font-semibold bg-opacity-20 inline-block border"
                        style={{
                          background: project.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          borderColor: project.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: project.is_active ? '#22c55e' : '#ef4444',
                        }}
                      >
                        {project.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code
                          className="text-[12px] font-mono px-2 py-1 rounded"
                          style={{ background: '#080d2a', color: '#5a6498' }}
                        >
                          {maskKey(project.api_key)}
                        </code>
                        <button
                          onClick={() => handleCopy(project.id, project.api_key)}
                          className="p-1.5 rounded-md transition-colors"
                          style={{ color: copiedId === project.id ? '#22c55e' : '#3d4a7a' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#131b4d'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          title="Copy API key"
                        >
                          {copiedId === project.id ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>

                    <td
                      className="px-6 py-4 whitespace-nowrap text-[13px] font-mono"
                      style={{ color: '#4a5490' }}
                    >
                      {formatCreatedDate(project.created_at)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {project.is_active ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingProject(project);
                                setUpdateModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded text-[12px] font-semibold transition-all disabled:opacity-40"
                              style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', cursor: 'pointer', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleRotate(project.id)}
                              className="px-3 py-1.5 rounded text-[12px] font-semibold transition-all disabled:opacity-40"
                              style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', cursor: 'pointer', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              Rotate Key
                            </button>
                            <button
                              onClick={() => handleRevoke(project.id)}
                              className="px-3 py-1.5 rounded text-[12px] font-semibold transition-all disabled:opacity-40"
                              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              Revoke
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUnrevoke(project.id)}
                            className="px-3 py-1.5 rounded text-[12px] font-semibold transition-all disabled:opacity-40"
                            style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', cursor: 'pointer', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(34, 197, 94, 0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            Unrevoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[13px]" style={{ color: '#3d4a7a' }}>
                      Loading users...
                    </td>
                  </tr>
                )}

                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[13px]" style={{ color: '#3d4a7a' }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
