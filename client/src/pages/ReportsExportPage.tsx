import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { Badge } from '../components/common/Badge.js';
import { useToast } from '../context/ToastContext.js';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Building,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

export const ReportsExportPage: React.FC = () => {
  const { success, error } = useToast();

  const [status, setStatus] = useState('');
  const [bankName, setBankName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (bankName) q.set('bankName', bankName);
      if (startDate) q.set('maturityRange', '30'); // sample filter

      const res = await apiRequest<{ data: any[] }>(`/fdrs?${q.toString()}&limit=15`);
      setPreviewRows(res.data || []);
    } catch (_) {}
    finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [status, bankName]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (bankName) q.set('bankName', bankName);
      if (startDate) q.set('startDate', startDate);
      if (endDate) q.set('endDate', endDate);

      const blob = await apiRequest<Blob>(`/reports/export-csv?${q.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FDR_SecureTrack_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      success('CSV report generated and downloaded successfully');
    } catch (err: any) {
      error(err.message || 'CSV export failed');
    } finally {
      setExporting(false);
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
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Compliance Reports & CSV Export</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and download certified relational database exports with customizable date ranges and regulatory status filters.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors w-fit"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Exporting CSV...' : 'Download Official CSV'}</span>
        </button>
      </div>

      {/* Filter Parameters Form */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">Report Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status Filter</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="">All Statuses</option>
              <option value="VERIFIED">Verified & Active</option>
              <option value="DEFICIENT">Deficient / Discrepant</option>
              <option value="MATURED">Already Matured</option>
              <option value="RELEASED">Released</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Issuing Bank</label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="">All Banks</option>
              <option value="State Bank of India">State Bank of India</option>
              <option value="Punjab National Bank">Punjab National Bank</option>
              <option value="Canara Bank">Canara Bank</option>
              <option value="HDFC Bank">HDFC Bank</option>
              <option value="ICICI Bank">ICICI Bank</option>
              <option value="Bank of Baroda">Bank of Baroda</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Maturity From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Maturity Until</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Live Dataset Preview</h3>
            <p className="text-xs text-slate-500">Sample preview of database rows matching current parameters</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Showing {previewRows.length} sample rows</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">FDR Number</th>
                <th className="py-2.5 px-4">Institution</th>
                <th className="py-2.5 px-4">Bank</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Maturity Date</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingPreview ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading dataset preview...</td>
                </tr>
              ) : previewRows.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-900">{r.fdr_number}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-800 truncate max-w-[200px]">{r.institution_name}</td>
                  <td className="py-2.5 px-4 text-slate-600">{r.bank_name}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{formatCurrency(r.amount)}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">{r.maturity_date}</td>
                  <td className="py-2.5 px-4"><Badge type="status" value={r.current_status} /></td>
                  <td className="py-2.5 px-4"><Badge type="risk" value={r.risk_level} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
