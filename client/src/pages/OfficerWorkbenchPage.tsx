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
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">SCRUTINY QUEUE</div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Regulation Officer Priority Workbench</h1>
            <span className="text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
              {worklist.length} Active Cases
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
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
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-gradient-to-r from-rose-500/80 via-purple-600/90 to-indigo-600 text-white font-semibold shadow-md shadow-purple-600/25'
                  : 'bg-[#15182D] text-slate-400 hover:text-white border border-white/5'
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
          <div className="bg-[#121528] p-16 text-center rounded-2xl border border-white/5 shadow-xl">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Evaluating deterministic priority worklist...</p>
          </div>
        ) : worklist.length === 0 ? (
          <div className="bg-[#121528] p-16 text-center rounded-2xl border border-white/5 text-slate-400 shadow-xl">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-white">No Cases Found</p>
            <p className="text-xs text-slate-500 mt-0.5">No worklist items match the active filter criteria.</p>
          </div>
        ) : (
          worklist.map((item, idx) => (
            <div
              key={item.fdrId}
              className={`bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl transition-all hover:border-white/15 ${
                item.priorityLabel === 'CRITICAL'
                  ? 'border-l-4 border-l-rose-500'
                  : item.priorityLabel === 'URGENT'
                  ? 'border-l-4 border-l-orange-500'
                  : item.priorityLabel === 'NORMAL'
                  ? 'border-l-4 border-l-indigo-500'
                  : 'border-l-4 border-l-slate-600'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-slate-500 text-xs font-mono">#{idx + 1}</span>
                  <Badge type="priority" value={item.priorityLabel} />
                  <span className="font-mono font-bold text-sm text-rose-300">{item.fdrNumber}</span>
                  <span className="text-slate-600">•</span>
                  <span className="font-semibold text-white text-xs">{item.institutionName}</span>
                  {item.institutionCode && (
                    <span className="text-[10px] font-mono text-slate-400 bg-[#15182D] px-2 py-0.5 rounded-full border border-white/5">
                      {item.institutionCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs flex-wrap">
                  {/* Due Date Indicator */}
                  {item.dueDate && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Target:</span>
                      <span className="font-mono font-semibold text-slate-200">{item.dueDate}</span>
                    </div>
                  )}

                  {/* Case Age */}
                  {item.pendingCaseAgeDays !== undefined && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Age:</span>
                      <span className="font-mono font-semibold text-slate-200">{item.pendingCaseAgeDays}d</span>
                    </div>
                  )}

                  {/* Maturity Countdown */}
                  <span
                    className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-[11px] border ${
                      item.daysToMaturity < 0
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : item.daysToMaturity <= 7
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {item.daysToMaturity < 0
                      ? `Overdue by ${Math.abs(item.daysToMaturity)} days`
                      : `${item.daysToMaturity} days to maturity`}
                  </span>
                </div>
              </div>

              {/* Main Body */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Deposit Instrument Details</p>
                  <p className="font-bold text-white text-sm mt-0.5 font-mono">{formatCurrency(item.amount)}</p>
                  <p className="text-slate-300">{item.bankName} • {item.branchName}</p>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    Matures: {item.maturityDate}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400 font-medium">Scrutiny State & Priority Index</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge type="status" value={item.currentStatus} />
                    <Badge type="risk" value={item.riskLevel} />
                    <span className="text-[11px] font-mono text-slate-400">Score: {item.riskScore}/100</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Assigned Officer: <strong className="text-slate-200">{item.assignedOfficerName || 'Unassigned'}</strong>
                  </p>
                  {item.openDuplicatesCount ? (
                    <p className="text-[11px] text-rose-400 font-semibold mt-0.5 flex items-center gap-1">
                      <CopyX className="w-3 h-3" />
                      <span>{item.openDuplicatesCount} duplicate finding(s) pending</span>
                    </p>
                  ) : null}
                </div>

                {/* Ranking Reasons Box */}
                <div className="bg-[#15182D] p-3.5 rounded-xl border border-white/5">
                  <p className="font-semibold text-rose-300 text-[11px] uppercase tracking-wider mb-1.5">
                    Priority Ranking Reasons:
                  </p>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {item.rankingReasons.map((reason, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Next Actions Row */}
              {item.recommendedActions && item.recommendedActions.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3 text-xs">
                  <p className="font-semibold text-amber-300 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Recommended Next Actions:</span>
                  </p>
                  <ul className="space-y-0.5 text-[11px] text-amber-200">
                    {item.recommendedActions.map((act, aIdx) => (
                      <li key={aIdx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">→</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs flex-wrap gap-2">
                <span className="text-[11px] text-slate-500 font-mono">
                  Gate: <strong className="text-slate-300">{item.workflowType}</strong>
                </span>

                <div className="flex items-center gap-2">
                  {!item.assignedOfficerId && (
                    <button
                      onClick={() => handleAssignToMe(item.fdrId)}
                      className="px-3 py-1.5 bg-[#1A1D38] hover:bg-[#252A50] text-slate-300 font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign to Me</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setIsActionModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Decision</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setIsEscalateModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-semibold rounded-xl border border-rose-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Escalate</span>
                  </button>

                  <button
                    onClick={() => navigate(`/fdrs/${item.fdrId}`)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>Full Scrutiny</span>
                    <ExternalLink className="w-3.5 h-3.5" />
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
            <div className="bg-[#15182D] p-3.5 rounded-xl border border-white/5 text-xs space-y-1 text-slate-300">
              <p><strong>Institution:</strong> {selectedItem.institutionName}</p>
              <p><strong>Amount:</strong> {formatCurrency(selectedItem.amount)}</p>
              <p><strong>Current Status:</strong> {selectedItem.currentStatus}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Action Determination
              </label>
              <select
                value={actionType}
                onChange={e => setActionType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-xs border border-[#2B2F4E] rounded-xl focus:outline-none focus:border-rose-500 bg-[#15182D] text-white"
              >
                <option value="APPROVE_VERIFIED">Approve & Mark Verified (All Checks Satisfied)</option>
                <option value="REQUEST_CORRECTION">Request Correction (Document / Field Deficiencies)</option>
                <option value="MARK_DEFICIENT">Mark Case Deficient (Regulatory Hold)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Official Scrutiny Observation / Justification <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={actionComments}
                onChange={e => setActionComments(e.target.value)}
                placeholder="State specific findings, verification checks performed, or reasons for correction..."
                className="w-full px-3.5 py-2.5 text-xs border border-[#2B2F4E] rounded-xl focus:outline-none focus:border-rose-500 bg-[#15182D] text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="px-5 py-2 text-xs bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
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
            <div className="bg-rose-500/15 border border-rose-500/30 rounded-xl p-3.5 text-xs text-rose-200">
              <p className="font-semibold flex items-center gap-1.5 mb-1 text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Regulatory Escalation Protocol</span>
              </p>
              <p className="leading-relaxed">
                Escalating will notify Super Admin leadership and attach a permanent decision evidence trace. Use for irreconcilable duplicate collisions, counterfeit certificates, or persistent non-compliance.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Escalation Justification & Recommendation <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={escalateReason}
                onChange={e => setEscalateReason(e.target.value)}
                placeholder="Explain why this case requires Super Admin intervention or regulatory panel scrutiny..."
                className="w-full px-3.5 py-2.5 text-xs border border-[#2B2F4E] rounded-xl focus:outline-none focus:border-rose-500 bg-[#15182D] text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEscalateModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingEscalate}
                className="px-5 py-2 text-xs bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
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
