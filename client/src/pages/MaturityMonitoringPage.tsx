import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Badge } from '../components/common/Badge.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';
import {
  CalendarDays,
  AlertTriangle,
  Clock,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Building,
  CheckCircle2,
  Bell
} from 'lucide-react';

export const MaturityMonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, isOfficer } = useAuth();
  const { success, error } = useToast();

  const [summary, setSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'30' | '60' | '90' | 'matured' | 'overdue'>('30');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchMaturityData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/maturity/summary');
      setSummary(res);
    } catch (err: any) {
      error(err.message || 'Failed to load maturity calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaturityData();
  }, []);

  const handleRunScan = async () => {
    setScanning(true);
    try {
      const res = await apiRequest<{ alertsGenerated: number; casesEscalated: number }>('/maturity/scan', { method: 'POST' });
      success(`Maturity scan completed: ${res.alertsGenerated} alerts dispatched, ${res.casesEscalated} overdue escalations triggered`);
      fetchMaturityData();
    } catch (err: any) {
      error(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  const maturing30 = summary?.maturing30Days || [];
  const maturing60 = summary?.maturing60Days || [];
  const maturing90 = summary?.maturing90Days || [];
  const alreadyMatured = summary?.alreadyMatured || [];
  const overdueRenewals = summary?.overdueRenewals || [];

  const getActiveList = () => {
    switch (activeTab) {
      case '60': return maturing60;
      case '90': return maturing90;
      case 'matured': return alreadyMatured;
      case 'overdue': return overdueRenewals;
      default: return maturing30;
    }
  };

  const activeList = getActiveList();

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">LIFECYCLE TIMELINE</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Automated Validity & Maturity Monitoring</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Configurable reminder windows (90, 60, 30, 15, 7, 1 days) with automatic deduplicated notification dispatch and supervisory escalation.
          </p>
        </div>
        {(!isSuperAdmin && !isOfficer) ? null : (
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/25 transition-all w-fit"
          >
            <Bell className="w-4 h-4" />
            <span>{scanning ? 'Running Daily Scan...' : 'Run Maturity Scan Now'}</span>
          </button>
        )}
      </div>

      {/* Horizon Tabs */}
      <div className="bg-[#121528] rounded-2xl p-3 border border-white/5 shadow-xl flex items-center gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: '30', label: `Within 30 Days (${maturing30.length})` },
          { id: '60', label: `Within 60 Days (${maturing60.length})` },
          { id: '90', label: `Within 90 Days (${maturing90.length})` },
          { id: 'matured', label: `Already Matured (${alreadyMatured.length})` },
          { id: 'overdue', label: `Overdue Renewals (${overdueRenewals.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-rose-500/80 via-purple-600/90 to-indigo-600 text-white shadow-md shadow-purple-600/25 font-bold'
                : 'bg-[#15182D] text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#121528] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1020] border-b border-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">FDR Number</th>
                <th className="py-3.5 px-4">Institution Name</th>
                <th className="py-3.5 px-4">Issuing Bank</th>
                <th className="py-3.5 px-4">Principal Amount</th>
                <th className="py-3.5 px-4">Maturity Date</th>
                <th className="py-3.5 px-4">Days Countdown</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Calculating real-time maturity countdowns...
                  </td>
                </tr>
              ) : activeList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <CalendarDays className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    No instruments in this maturity horizon window.
                  </td>
                </tr>
              ) : (
                activeList.map((item: any) => (
                  <tr key={item.id} className="hover:bg-[#181C35] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-300">
                      {item.fdr_number}
                    </td>
                    <td className="py-3.5 px-4 text-white font-medium truncate max-w-[200px]">
                      {item.institution_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {item.bank_name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white font-mono">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {item.maturity_date}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-[11px] border ${
                        item.daysToMaturity < 0
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : item.daysToMaturity <= 7
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      }`}>
                        {item.daysToMaturity < 0
                          ? `Overdue: ${Math.abs(item.daysToMaturity)}d ago`
                          : `${item.daysToMaturity} days left`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge type="status" value={item.current_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/fdrs/${item.id}`)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 ml-auto shadow-md transition-all"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
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
