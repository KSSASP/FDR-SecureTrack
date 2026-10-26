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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Automated Validity & Maturity Monitoring</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurable reminder windows (90, 60, 30, 15, 7, 1 days) with automatic deduplicated notification dispatch and supervisory escalation.
          </p>
        </div>
        {(!isSuperAdmin && !isOfficer) ? null : (
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors w-fit"
          >
            <Bell className="w-4 h-4" />
            <span>{scanning ? 'Running Daily Scan...' : 'Run Maturity Scan Now'}</span>
          </button>
        )}
      </div>

      {/* Horizon Tabs */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: '30', label: `Within 30 Days (${maturing30.length})`, color: 'text-amber-700' },
          { id: '60', label: `Within 60 Days (${maturing60.length})`, color: 'text-blue-700' },
          { id: '90', label: `Within 90 Days (${maturing90.length})`, color: 'text-indigo-700' },
          { id: 'matured', label: `Already Matured (${alreadyMatured.length})`, color: 'text-rose-700' },
          { id: 'overdue', label: `Overdue Renewals (${overdueRenewals.length})`, color: 'text-purple-700' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">FDR Number</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Issuing Bank</th>
                <th className="py-3 px-4">Principal Amount</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4">Days Countdown</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Calculating real-time maturity countdowns...
                  </td>
                </tr>
              ) : activeList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No instruments in this maturity horizon window.
                  </td>
                </tr>
              ) : (
                activeList.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      {item.fdr_number}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium truncate max-w-[200px]">
                      {item.institution_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.bank_name}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {item.maturity_date}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        item.daysToMaturity < 0
                          ? 'bg-rose-100 text-rose-800'
                          : item.daysToMaturity <= 7
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-50 text-blue-800'
                      }`}>
                        {item.daysToMaturity < 0
                          ? `Overdue: ${Math.abs(item.daysToMaturity)}d ago`
                          : `${item.daysToMaturity} days left`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge type="status" value={item.current_status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/fdrs/${item.id}`)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 font-semibold text-xs flex items-center gap-1 ml-auto"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
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
