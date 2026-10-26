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
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Multi-Stage Verification Workbench</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Interbank gateway confirmation, field scrutiny validation, and discrepancy resolution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Gateway Adapter: SimulatedCoreBankingGateway-v2.1 Active</span>
          </span>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
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
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
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
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      {item.fdr_number}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium truncate max-w-[200px]">
                      {item.institution_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-semibold text-slate-800">{item.bank_name}</div>
                      <div className="text-[11px] text-slate-500">{item.branch_name}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge type="verification" value={item.verification_status} />
                    </td>
                    <td className="py-3 px-4">
                      <Badge type="status" value={item.current_status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleVerifyBank(item.id)}
                          disabled={verifyingId === item.id}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-2xs transition-colors flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{verifyingId === item.id ? 'Connecting...' : 'Verify Bank'}</span>
                        </button>
                        <button
                          onClick={() => navigate(`/fdrs/${item.id}`)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors flex items-center gap-1"
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
