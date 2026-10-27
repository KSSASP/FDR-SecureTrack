import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { Modal } from '../components/common/Modal.js';
import { useToast } from '../context/ToastContext.js';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Building,
  RotateCw
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const { success, error } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create User Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('REGULATION_OFFICER');
  const [institutionId, setInstitutionId] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [uRes, iRes] = await Promise.all([
        apiRequest<{ users: any[] }>('/users'),
        apiRequest<{ institutions: any[] }>('/institutions')
      ]);
      setUsers(uRes.users || []);
      setInstitutions(iRes.institutions || []);
    } catch (err: any) {
      error(err.message || 'Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      error('Please fill in all mandatory fields');
      return;
    }

    setCreating(true);
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          institution_id: role === 'INSTITUTION_ADMIN' ? institutionId : null,
          phone
        })
      });
      success(`User account created for ${name}`);
      setIsCreateModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiRequest(`/users/${user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      success(`User status changed to ${nextStatus}`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
    } catch (err: any) {
      error(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Super Admin User Administration</h1>
          <p className="text-xs text-slate-400 mt-1">
            Role-based authorization directory, access privileges, and account activations.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-900/20 transition-opacity w-fit"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create User Account</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-[#121528] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#15182D] text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-white/5">
              <tr>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Official Email</th>
                <th className="py-3 px-4">Role Privileges</th>
                <th className="py-3 px-4">Bound Institution</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading user accounts...
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'SUPER_ADMIN' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                        u.role === 'REGULATION_OFFICER' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' :
                        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {u.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {u.institution_name ? (
                        <span>{u.institution_name} <span className="text-slate-500">({u.institution_code})</span></span>
                      ) : (
                        <span className="text-slate-500 italic">Global Authority</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision New User Account"
        subtitle="Enforces bcrypt password hashing and role permissions"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Vikram Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0B0C15] border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. officer@fdrsecuretrack.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0B0C15] border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Temporary Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0B0C15] border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Assigned Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0B0C15] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="REGULATION_OFFICER" className="bg-[#121528] text-white">Regulation Officer (Scrutiny & Worklist)</option>
              <option value="SUPER_ADMIN" className="bg-[#121528] text-white">Super Admin (Global Authority & Risk Rules)</option>
              <option value="INSTITUTION_ADMIN" className="bg-[#121528] text-white">Institution Administrator (Institution Scoped)</option>
            </select>
          </div>

          {role === 'INSTITUTION_ADMIN' && (
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Bound Institution</label>
              <select
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0B0C15] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="" className="bg-[#121528] text-slate-400">-- Choose Institution --</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id} className="bg-[#121528] text-white">{inst.name} ({inst.code})</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-white/10 bg-[#1A1E36] hover:bg-[#202542] text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-90 text-white font-bold shadow-lg shadow-rose-900/20 transition-opacity disabled:opacity-50"
            >
              {creating ? 'Provisioning...' : 'Provision Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
