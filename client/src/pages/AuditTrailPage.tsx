import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { Modal } from '../components/common/Modal.js';
import { useToast } from '../context/ToastContext.js';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  RotateCw,
  Lock
} from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const { error } = useToast();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (entityFilter) q.set('entityType', entityFilter);
      if (actionFilter) q.set('action', actionFilter);

      const res = await apiRequest<{ logs: any[] }>(`/audit?${q.toString()}&limit=100`);
      setLogs(res.logs || []);
    } catch (err: any) {
      error(err.message || 'Failed to retrieve audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter]);

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">COMPLIANCE LEDGER</div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span>Append-Only Regulatory Audit Trail</span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold">
              Immutable Log
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Tamper-evident chronological record of all administrative submissions, officer determinations, and gateway verifications.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2.5 bg-[#1A1D38] hover:bg-[#252A50] text-slate-300 rounded-xl border border-white/10 transition-colors w-fit"
          title="Refresh Log"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-[#121528] rounded-2xl p-5 border border-white/5 shadow-xl flex flex-col sm:flex-row items-center gap-4 text-xs">
        <div className="flex-1 w-full sm:w-auto">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Filter Entity Type</label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
          >
            <option value="">All Entities</option>
            <option value="FDR_INSTRUMENT">FDR Instrument</option>
            <option value="DOCUMENT">Document</option>
            <option value="RENEWAL_REQUEST">Renewal Request</option>
            <option value="RELEASE_REQUEST">Release Request</option>
            <option value="SYSTEM_CONFIG">System Config</option>
            <option value="USER">User Account</option>
          </select>
        </div>

        <div className="flex-1 w-full sm:w-auto">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Filter Action Type</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
          >
            <option value="">All Actions</option>
            <option value="FDR_SUBMISSION">FDR Submission</option>
            <option value="BANK_VERIFICATION_CHECK">Bank Verification Check</option>
            <option value="DISCREPANCY_RESOLVED">Discrepancy Resolved</option>
            <option value="DUPLICATE_SCRUTINY_DECISION">Duplicate Scrutiny Decision</option>
            <option value="RENEWAL_DECISION_RECORDED">Renewal Decision Recorded</option>
            <option value="RELEASE_AUTHORIZATION_DECISION">Release Authorization Decision</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-[#121528] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1020] border-b border-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Actor & Role</th>
                <th className="py-3.5 px-4">Entity Target</th>
                <th className="py-3.5 px-4">Decision Reason</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4 text-right">State Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">No matching audit events found.</td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-[#181C35] transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-rose-300 whitespace-nowrap">
                      {log.action?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{log.user_name}</div>
                      <span className="text-[10px] font-mono text-slate-400">{log.user_role}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <div>{log.entity_type}</div>
                      <span className="text-[10px] text-slate-500">{log.entity_id}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.decision_reason}>
                      {log.decision_reason || 'Standard operation'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {log.ip_address}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 bg-[#1A1D38] hover:bg-[#252A50] text-slate-300 font-semibold rounded-xl border border-white/10 text-[11px] inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Diff</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Log Diff Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Event State Inspection"
        subtitle={`Event #${selectedLog?.id} • Action: ${selectedLog?.action}`}
        maxWidth="2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3 bg-[#15182D] p-3.5 rounded-xl border border-white/5 text-[11px] text-slate-300">
              <div><span className="text-slate-500">Actor:</span> {selectedLog.user_name} ({selectedLog.user_role})</div>
              <div><span className="text-slate-500">Timestamp:</span> {new Date(selectedLog.created_at).toLocaleString()}</div>
              <div><span className="text-slate-500">Entity:</span> {selectedLog.entity_type} ({selectedLog.entity_id})</div>
              <div><span className="text-slate-500">IP:</span> {selectedLog.ip_address}</div>
            </div>

            <div>
              <p className="font-bold text-rose-300 uppercase tracking-wider text-[11px] font-sans mb-1.5">
                Recorded Justification
              </p>
              <div className="p-3.5 bg-[#15182D] text-slate-200 rounded-xl border border-white/5 font-sans text-xs">
                {selectedLog.decision_reason || 'No decision reason recorded'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[11px] font-sans mb-1.5">Prior State</p>
                <pre className="p-3.5 bg-[#15182D] rounded-xl border border-white/5 text-[10px] overflow-x-auto max-h-48 text-slate-300">
                  {selectedLog.before_state ? JSON.stringify(JSON.parse(selectedLog.before_state), null, 2) : 'None'}
                </pre>
              </div>

              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[11px] font-sans mb-1.5">Resulting State</p>
                <pre className="p-3.5 bg-[#15182D] rounded-xl border border-white/5 text-[10px] overflow-x-auto max-h-48 text-slate-300">
                  {selectedLog.after_state ? JSON.stringify(JSON.parse(selectedLog.after_state), null, 2) : 'None'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
