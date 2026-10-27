import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Badge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  ExternalLink,
  Building,
  Eye
} from 'lucide-react';

export const VerificationWorkbenchPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [fdrs, setFdrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Resolve modal
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [targetFdr, setTargetFdr] = useState<any>(null);
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED');
  const [resolutionReason, setResolutionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVerificationCases = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ data: any[] }>('/fdrs?limit=50');
      // Show pending or deficient cases first
      const sorted = (res.data || []).sort((a, b) => {
        if (a.verification_status === 'PENDING') return -1;
        if (b.verification_status === 'PENDING') return 1;
        if (a.verification_status === 'DEMO_MISMATCH') return -1;
        return 0;
      });
      setFdrs(sorted);
    } catch (err: any) {
      error(err.message || 'Failed to load verification workbench');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerificationCases();
  }, []);

  const handleVerifyBank = async (fdrId: string) => {
    setVerifyingId(fdrId);
    try {
      const res = await apiRequest(`/verification/verify-bank/${fdrId}`, { method: 'POST' });
      success(`Bank verification executed: ${res.result.status}`);
      fetchVerificationCases();
    } catch (err: any) {
      error(err.message || 'Bank verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Multi-Stage Verification Workbench</h1>
          <p className="text-xs text-slate-400 mt-1">
            Interbank gateway confirmation, field scrutiny validation, and discrepancy resolution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Gateway Adapter: SimulatedCoreBankingGateway-v2.1 Active</span>
          </span>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-[#121528] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#15182D] border-b border-white/5 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">FDR Number</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Bank & Branch</th>
                <th className="py-3 px-4">Principal Amount</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Scrutiny Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading verification records...
                  </td>
                </tr>
              ) : fdrs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No cases pending verification.
                  </td>
                </tr>
              ) : (
                fdrs.map((item: any) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      {item.fdr_number}
                    </td>
                    <td className="py-3 px-4 text-white font-medium truncate max-w-[200px]">
                      {item.institution_name}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="font-semibold text-white">{item.bank_name}</div>
                      <div className="text-[11px] text-slate-400">{item.branch_name}</div>
                    </td>
                    <td className="py-3 px-4 font-bold font-mono text-white">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge type="verification" value={item.verification_status} />
                    </td>
                    <td className="py-3 px-4">
                      <Badge type="status" value={item.current_status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleVerifyBank(item.id)}
                          disabled={verifyingId === item.id}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 rounded-xl shadow-lg shadow-rose-900/20 hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{verifyingId === item.id ? 'Connecting...' : 'Verify Bank'}</span>
                        </button>
                        <button
                          onClick={() => navigate(`/fdrs/${item.id}`)}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/30 transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View FDR</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
