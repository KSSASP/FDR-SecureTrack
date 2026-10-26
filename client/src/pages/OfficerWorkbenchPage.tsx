import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { WorklistItem } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  Briefcase,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  CopyX,
  ExternalLink,
  Filter,
  UserCheck,
  ArrowUpRight,
  Send,
  Flag,
  FileCheck
} from 'lucide-react';

export const OfficerWorkbenchPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Quick Action Modal State
  const [selectedItem, setSelectedItem] = useState<WorklistItem | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE_VERIFIED' | 'REQUEST_CORRECTION' | 'MARK_DEFICIENT'>('APPROVE_VERIFIED');
  const [actionComments, setActionComments] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Escalate Modal State
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [submittingEscalate, setSubmittingEscalate] = useState(false);

  const fetchWorklist = async (filterKey?: string) => {
    setLoading(true);
    try {
      const q = filterKey && filterKey !== 'all' ? `?filter=${filterKey}` : '';
      const res = await apiRequest<{ worklist: WorklistItem[] }>(`/worklist/officer${q}`);
      setWorklist(res.worklist || []);
    } catch (err: any) {
      error(err.message || 'Failed to load officer worklist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorklist(filter);
  }, [filter]);

  const handleAssignToMe = async (fdrId: string) => {
    try {
      await apiRequest(`/worklist/${fdrId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ officerId: user?.id })
      });
      success('Case successfully assigned to your workbench');
      fetchWorklist(filter);
    } catch (err: any) {
      error(err.message || 'Failed to assign case');
    }
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !actionComments.trim()) {
      error('Mandatory scrutiny comments required');
      return;
    }

    setSubmittingAction(true);
    try {
      await apiRequest(`/worklist/${selectedItem.fdrId}/action`, {
        method: 'POST',
        body: JSON.stringify({
          actionType,
          comments: actionComments
        })
      });
      success(`Case status updated: ${actionType.replace('_', ' ')}`);
      setIsActionModalOpen(false);
      setActionComments('');
      setSelectedItem(null);
      fetchWorklist(filter);
    } catch (err: any) {
      error(err.message || 'Failed to execute scrutiny decision');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExecuteEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !escalateReason.trim()) {
      error('Mandatory escalation justification required');
      return;
    }

    setSubmittingEscalate(true);
    try {
      await apiRequest(`/worklist/${selectedItem.fdrId}/escalate`, {
        method: 'POST',
        body: JSON.stringify({
          escalationReason: escalateReason,
          urgency: 'CRITICAL'
        })
      });
      success('Case formally escalated to Competent Regulatory Authority');
      setIsEscalateModalOpen(false);
      setEscalateReason('');
      setSelectedItem(null);
      fetchWorklist(filter);
    } catch (err: any) {
      error(err.message || 'Failed to escalate case');
    } finally {
      setSubmittingEscalate(false);
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
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Regulation Officer Priority Workbench</h1>
            <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {worklist.length} Active Cases
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic prioritization ranking based on maturity countdown, discrepancy findings, cross-institution duplicate alerts, and pending case age.
          </p>
        </div>

        {/* Priority Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'assigned_to_me', label: 'Assigned to Me' },
            { id: 'high_risk', label: 'Priority Scrutiny' },
            { id: 'maturing_soon', label: 'Maturing (30d)' },
            { id: 'overdue', label: 'Overdue Cases' },
            { id: 'duplicate_suspected', label: 'Duplicate Alerts' },
            { id: 'pending_release', label: 'Release Applications' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === f.id
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prioritized Cases List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Evaluating deterministic priority worklist...</p>
          </div>
        ) : worklist.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No Cases Found</p>
            <p className="text-xs text-slate-500 mt-0.5">No worklist items match the active filter criteria.</p>
          </div>
        ) : (
          worklist.map((item, idx) => (
            <div
              key={item.fdrId}
              className={`bg-white rounded-xl p-5 border shadow-xs transition-shadow hover:shadow-md ${
                item.priorityLabel === 'CRITICAL'
                  ? 'border-l-4 border-l-rose-600 border-slate-200'
                  : item.priorityLabel === 'URGENT'
                  ? 'border-l-4 border-l-orange-500 border-slate-200'
                  : item.priorityLabel === 'NORMAL'
                  ? 'border-l-4 border-l-blue-600 border-slate-200'
                  : 'border-l-4 border-l-slate-400 border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-slate-400 text-xs font-mono">#{idx + 1}</span>
                  <Badge type="priority" value={item.priorityLabel} />
                  <span className="font-mono font-bold text-sm text-blue-900">{item.fdrNumber}</span>
                  <span className="text-slate-400">•</span>
                  <span className="font-semibold text-slate-800 text-xs">{item.institutionName}</span>
                  {item.institutionCode && (
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {item.institutionCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs flex-wrap">
                  {/* Due Date Indicator */}
                  {item.dueDate && (
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Target Due:</span>
                      <span className="font-mono font-semibold text-slate-700">{item.dueDate}</span>
                    </div>
                  )}

                  {/* Case Age */}
                  {item.pendingCaseAgeDays !== undefined && (
                    <div className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Age:</span>
                      <span className="font-mono font-semibold text-slate-700">{item.pendingCaseAgeDays}d</span>
                    </div>
                  )}

                  {/* Maturity Countdown */}
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      item.daysToMaturity < 0
                        ? 'bg-rose-100 text-rose-800'
                        : item.daysToMaturity <= 7
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    {item.daysToMaturity < 0
                      ? `Overdue by ${Math.abs(item.daysToMaturity)} days`
                      : `${item.daysToMaturity} days to maturity`}
                  </span>
                </div>
              </div>

              {/* Main Body */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-3 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Deposit Instrument Details</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{formatCurrency(item.amount)}</p>
                  <p className="text-slate-600">{item.bankName} • {item.branchName}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Matures: {item.maturityDate}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400 font-medium">Scrutiny State & Priority Index</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge type="status" value={item.currentStatus} />
                    <Badge type="risk" value={item.riskLevel} />
                    <span className="text-[11px] font-mono text-slate-500">Score: {item.riskScore}/100</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Assigned Officer: <strong className="text-slate-700">{item.assignedOfficerName || 'Unassigned'}</strong>
                  </p>
                  {item.openDuplicatesCount ? (
                    <p className="text-[11px] text-rose-700 font-semibold mt-0.5 flex items-center gap-1">
                      <CopyX className="w-3 h-3" />
                      <span>{item.openDuplicatesCount} duplicate finding(s) pending</span>
                    </p>
                  ) : null}
                </div>

                {/* Ranking Reasons Box */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                    Priority Ranking Reasons:
                  </p>
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    {item.rankingReasons.map((reason, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-1.5">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Next Actions Row */}
              {item.recommendedActions && item.recommendedActions.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 mb-3 text-xs">
                  <p className="font-semibold text-amber-900 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    <span>Recommended Next Actions:</span>
                  </p>
                  <ul className="space-y-0.5 text-[11px] text-amber-800">
                    {item.recommendedActions.map((act, aIdx) => (
                      <li key={aIdx} className="flex items-start gap-1">
                        <span className="text-amber-700 font-bold">→</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs flex-wrap gap-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  Gate: <strong className="text-slate-600">{item.workflowType}</strong>
                </span>

                <div className="flex items-center gap-2">
                  {!item.assignedOfficerId && (
                    <button
                      onClick={() => handleAssignToMe(item.fdrId)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-300 transition-colors flex items-center gap-1"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Assign to Me</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setIsActionModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded border border-emerald-300 transition-colors flex items-center gap-1"
                  >
                    <FileCheck className="w-3 h-3" />
                    <span>Decision</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setIsEscalateModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold rounded border border-rose-300 transition-colors flex items-center gap-1"
                  >
                    <Flag className="w-3 h-3" />
                    <span>Escalate</span>
                  </button>

                  <button
                    onClick={() => navigate(`/fdrs/${item.fdrId}`)}
                    className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded shadow-2xs transition-colors flex items-center gap-1"
                  >
                    <span>Full Scrutiny</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Decision Action Modal */}
      {selectedItem && (
        <Modal
          isOpen={isActionModalOpen}
          onClose={() => setIsActionModalOpen(false)}
          title={`Record Scrutiny Determination - FDR ${selectedItem.fdrNumber}`}
        >
          <form onSubmit={handleExecuteAction} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <p><strong>Institution:</strong> {selectedItem.institutionName}</p>
              <p><strong>Amount:</strong> {formatCurrency(selectedItem.amount)}</p>
              <p><strong>Current Status:</strong> {selectedItem.currentStatus}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Action Determination
              </label>
              <select
                value={actionType}
                onChange={e => setActionType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="APPROVE_VERIFIED">Approve & Mark Verified (All Checks Satisfied)</option>
                <option value="REQUEST_CORRECTION">Request Correction (Document / Field Deficiencies)</option>
                <option value="MARK_DEFICIENT">Mark Case Deficient (Regulatory Hold)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Scrutiny Observation / Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={actionComments}
                onChange={e => setActionComments(e.target.value)}
                placeholder="State specific findings, verification checks performed, or reasons for correction..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-2xs disabled:opacity-50"
              >
                {submittingAction ? 'Recording...' : 'Commit Determination'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Escalate Modal */}
      {selectedItem && (
        <Modal
          isOpen={isEscalateModalOpen}
          onClose={() => setIsEscalateModalOpen(false)}
          title={`Escalate Case to Competent Authority - FDR ${selectedItem.fdrNumber}`}
        >
          <form onSubmit={handleExecuteEscalate} className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-900">
              <p className="font-semibold flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Regulatory Escalation Protocol</span>
              </p>
              <p>
                Escalating will notify Super Admin leadership and attach a permanent decision evidence trace. Use for irreconcilable duplicate collisions, counterfeit certificates, or persistent non-compliance.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Escalation Justification & Recommendation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={escalateReason}
                onChange={e => setEscalateReason(e.target.value)}
                placeholder="Explain why this case requires Super Admin intervention or regulatory panel scrutiny..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEscalateModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingEscalate}
                className="px-4 py-1.5 text-xs bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg shadow-2xs disabled:opacity-50"
              >
                {submittingEscalate ? 'Escalating...' : 'Submit Escalation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
