import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { FDRInstrument } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Search,
  Filter,
  PlusCircle,
  Eye,
  FileText,
  RotateCcw,
  ArrowUpDown,
  Building,
  Calendar,
  FolderOpen
} from 'lucide-react';

export const FdrRepositoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isInstAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [fdrs, setFdrs] = useState<FDRInstrument[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters state initialized from URL search params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [riskLevel, setRiskLevel] = useState(searchParams.get('riskLevel') || '');
  const [bankName, setBankName] = useState(searchParams.get('bankName') || '');
  const [maturityRange, setMaturityRange] = useState(searchParams.get('maturityRange') || '');
  const [sortBy, setSortBy] = useState('maturity_date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const fetchFdrs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder
      });

      if (search) queryParams.set('search', search);
      if (status) queryParams.set('status', status);
      if (riskLevel) queryParams.set('riskLevel', riskLevel);
      if (bankName) queryParams.set('bankName', bankName);
      if (maturityRange) queryParams.set('maturityRange', maturityRange);

      const res = await apiRequest<{ data: FDRInstrument[]; pagination: any }>(`/fdrs?${queryParams.toString()}`);
      setFdrs(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load FDRs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFdrs();
  }, [pagination.page, sortBy, sortOrder]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchFdrs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setRiskLevel('');
    setBankName('');
    setMaturityRange('');
    setPagination(prev => ({ ...prev, page: 1 }));
    setSearchParams({});
    setTimeout(fetchFdrs, 50);
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">REPOSITORY</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Centralized FDR Instrument Repository</h1>
          <p className="text-xs text-slate-400 mt-1">
            Institution-wise financial security deposits, verification states, and validity schedules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/fdrs/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/25 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit New FDR</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#121528] rounded-2xl p-5 border border-white/5 shadow-xl space-y-4">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* Keyword Search */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="FDR number, bank, app ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#15182D] border border-[#2B2F4E] rounded-xl focus:outline-none focus:border-rose-500 text-white placeholder:text-slate-500 text-xs"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Current Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="VERIFIED">Verified & Compliant</option>
              <option value="DEFICIENT">Deficient / Discrepant</option>
              <option value="MATURED">Already Matured</option>
              <option value="REPLACED">Replaced / Renewed</option>
              <option value="RELEASE_REQUESTED">Release Requested</option>
              <option value="RELEASED">Released</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Risk Score Level</label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="w-full px-3 py-2 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="">All Risk Tiers</option>
              <option value="LOW">Low (0-29)</option>
              <option value="MEDIUM">Medium (30-59)</option>
              <option value="HIGH">High (60-79)</option>
              <option value="CRITICAL">Critical (80-100)</option>
            </select>
          </div>

          {/* Maturity Range Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Maturity Horizon</label>
            <select
              value={maturityRange}
              onChange={(e) => setMaturityRange(e.target.value)}
              className="w-full px-3 py-2 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="">Any Validity</option>
              <option value="30">Within 30 Days</option>
              <option value="60">Within 60 Days</option>
              <option value="90">Within 90 Days</option>
              <option value="matured">Already Matured</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 bg-[#1A1E38] hover:bg-[#252A50] text-slate-300 rounded-xl border border-white/10 transition-colors"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#121528] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1020] border-b border-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => toggleSort('fdr_number')}>
                  <div className="flex items-center gap-1.5">
                    <span>FDR Number</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Institution Name</th>
                <th className="py-3.5 px-4">Issuing Bank & Branch</th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center gap-1.5">
                    <span>Deposit Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => toggleSort('maturity_date')}>
                  <div className="flex items-center gap-1.5">
                    <span>Maturity Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => toggleSort('risk_score')}>
                  <div className="flex items-center gap-1.5">
                    <span>Risk Level</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading repository records...
                  </td>
                </tr>
              ) : fdrs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <FolderOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    No matching FDR records found matching filter criteria.
                  </td>
                </tr>
              ) : (
                fdrs.map((fdr: any) => (
                  <tr key={fdr.id} className="hover:bg-[#181C35] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-300">
                      <div>{fdr.fdr_number}</div>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">Ref: {fdr.linked_application_ref}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      <div className="truncate max-w-[200px] text-white">{fdr.institution_name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{fdr.institution_code}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="font-medium text-white">{fdr.bank_name}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{fdr.branch_name}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap font-mono">
                      {formatCurrency(fdr.amount)}
                      {fdr.interest_rate && (
                        <span className="block text-[10px] text-slate-400 font-normal">{fdr.interest_rate}% p.a.</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {fdr.maturity_date}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge type="status" value={fdr.current_status} />
                      {fdr.duplicate_alerts_count > 0 && (
                        <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold" title="Open Duplicate Collision Alert">
                          DUP
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge type="risk" value={fdr.risk_level} />
                        <span className="text-[10px] font-mono text-slate-400">({fdr.risk_score})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/fdrs/${fdr.id}`)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View FDR</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-3.5 border-t border-white/5 bg-[#0E1020] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-white">{fdrs.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to{' '}
            <span className="font-semibold text-white">{Math.min(pagination.total, pagination.page * pagination.limit)}</span> of{' '}
            <span className="font-semibold text-white">{pagination.total}</span> records
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-[#15182D] text-slate-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-2 font-mono font-medium text-slate-300">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-[#15182D] text-slate-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
