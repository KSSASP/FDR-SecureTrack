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
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Super Admin User Administration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based authorization directory, access privileges, and account activations.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors w-fit"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create User Account</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Official Email</th>
                <th className="py-3 px-4">Role Privileges</th>
                <th className="py-3 px-4">Bound Institution</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Loading user accounts...</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'REGULATION_OFFICER' ? 'bg-blue-100 text-blue-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {u.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.institution_name ? (
                        <span>{u.institution_name} ({u.institution_code})</span>
                      ) : (
                        <span className="text-slate-400 italic">Global Authority</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
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
            <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Vikram Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. officer@fdrsecuretrack.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Temporary Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="REGULATION_OFFICER">Regulation Officer (Scrutiny & Worklist)</option>
              <option value="SUPER_ADMIN">Super Admin (Global Authority & Risk Rules)</option>
              <option value="INSTITUTION_ADMIN">Institution Administrator (Institution Scoped)</option>
            </select>
          </div>

          {role === 'INSTITUTION_ADMIN' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bound Institution</label>
              <select
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              >
                <option value="">-- Choose Institution --</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {creating ? 'Provisioning...' : 'Provision Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
