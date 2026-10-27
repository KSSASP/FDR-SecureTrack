import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Badge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  HandCoins,
  PlusCircle,
  CheckCircle2,
  AlertOctagon,
  Clock,
  ShieldCheck,
  ExternalLink,
  FileCheck
} from 'lucide-react';

export const ReleaseRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, isOfficer, isInstAdmin } = useAuth();
  const { success, error } = useToast();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit modal (Institution)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [myFdrs, setMyFdrs] = useState<any[]>([]);
  const [selectedFdrId, setSelectedFdrId] = useState('');
  const [requestType, setRequestType] = useState('FULL_RELEASE');
  const [releaseReason, setReleaseReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review modal (Officer Tier-1)
  const [selectedForReview, setSelectedForReview] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState('RECOMMENDED');
  const [officerObs, setOfficerObs] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Authorize modal (Super Admin Tier-2)
  const [selectedForAuth, setSelectedForAuth] = useState<any>(null);
  const [authDecision, setAuthDecision] = useState('AUTHORIZED');
  const [authComments, setAuthComments] = useState('');
  const [savingAuth, setSavingAuth] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ requests: any[] }>('/release');
      setRequests(res.requests || []);
    } catch (err: any) {
      error(err.message || 'Failed to load release requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    if (isInstAdmin) {
      apiRequest<{ data: any[] }>('/fdrs?status=VERIFIED')
        .then(res => setMyFdrs(res.data || []))
        .catch(() => {});
    }
  }, [isInstAdmin]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFdrId || !releaseReason.trim()) {
      error('Please select FDR and provide regulatory justification');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/release/submit', {
        method: 'POST',
        body: JSON.stringify({
          fdr_id: selectedFdrId,
          request_type: requestType,
          reason: releaseReason
        })
      });
      success('Release application submitted for regulatory scrutiny');
      setIsSubmitModalOpen(false);
      setSelectedFdrId('');
      setReleaseReason('');
      fetchRequests();
    } catch (err: any) {
      error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfficerReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForReview || !officerObs.trim()) {
      error('Please record scrutiny observations');
      return;
    }

    setSavingReview(true);
    try {
      await apiRequest(`/release/${selectedForReview.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: reviewStatus,
          officer_observations: officerObs
        })
      });
      success(`Scrutiny review recorded: ${reviewStatus}`);
      setSelectedForReview(null);
      setOfficerObs('');
      fetchRequests();
    } catch (err: any) {
      error(err.message || 'Failed to record review');
    } finally {
      setSavingReview(false);
    }
  };

  const handleSuperAdminAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForAuth || !authComments.trim()) {
      error('Please enter supervisory authorization comments');
      return;
    }

    setSavingAuth(true);
    try {
      await apiRequest(`/release/${selectedForAuth.id}/authorize`, {
        method: 'POST',
        body: JSON.stringify({
          decision: authDecision,
          decision_comments: authComments
        })
      });
      success(`Release determination recorded: ${authDecision}`);
      setSelectedForAuth(null);
      setAuthComments('');
      fetchRequests();
    } catch (err: any) {
      error(err.message || 'Failed to record authorization');
    } finally {
      setSavingAuth(false);
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
      {/* Top Banner */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">SETTLEMENT</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security Deposit Release & Refund Workflow</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Two-tier regulatory clearance: Scrutiny Officer initial recommendation followed by Competent Authority authorization.
          </p>
        </div>
        {isInstAdmin && (
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/25 transition-all w-fit"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply for Deposit Release</span>
          </button>
        )}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-[#121528] p-16 text-center rounded-2xl border border-white/5 shadow-xl">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading release applications...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-[#121528] p-16 text-center rounded-2xl border border-white/5 text-slate-400 shadow-xl">
            <HandCoins className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-white">No Release Applications On Record</p>
            <p className="text-xs text-slate-500 mt-0.5">Institutions can apply for deposit release upon regulatory term completion.</p>
          </div>
        ) : (
          requests.map((rel: any) => (
            <div key={rel.id} className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-rose-300 font-mono">Application #{rel.id}</span>
                  <span className="text-slate-600">•</span>
                  <span className="font-semibold text-white text-xs">{rel.institution_name}</span>
                </div>
                <Badge type="status" value={rel.status} />
              </div>

              {/* Instrument Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#15182D] p-4 rounded-xl border border-white/5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deposit Instrument</span>
                  <p className="font-mono font-bold text-white mt-1">{rel.fdr_number}</p>
                  <p className="text-slate-300">{rel.bank_name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deposit Amount</span>
                  <p className="font-bold text-white text-sm mt-1 font-mono">{formatCurrency(rel.amount)}</p>
                  <p className="text-slate-400 font-mono">Matured: {rel.maturity_date}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Release Classification</span>
                  <p className="font-semibold text-rose-300 mt-1">{rel.request_type?.replace('_', ' ')}</p>
                  <p className="text-slate-400 font-mono">Ref: {rel.linked_application_ref}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300">
                <strong className="text-rose-300">Justification:</strong> {rel.reason}
              </p>

              {/* Tier 1 & Tier 2 Observations */}
              {rel.officer_observations && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
                  <span className="font-semibold block text-[11px] text-blue-300 mb-0.5">Tier-1 Officer Scrutiny Observation:</span>
                  {rel.officer_observations}
                  {rel.first_authorizer_name && (
                    <span className="text-[10px] block text-blue-400 mt-1 font-mono">Recommended by: {rel.first_authorizer_name}</span>
                  )}
                </div>
              )}

              {rel.decision_comments && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs">
                  <span className="font-semibold block text-[11px] text-emerald-300 mb-0.5">Tier-2 Competent Authority Authorization Order:</span>
                  {rel.decision_comments}
                  {rel.second_authorizer_name && (
                    <span className="text-[10px] block text-emerald-400 mt-1 font-mono">Authorized by: {rel.second_authorizer_name}</span>
                  )}
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs flex-wrap gap-2">
                <span className="text-slate-500 font-mono text-[11px]">Submitted: {rel.submission_date}</span>

                <div className="flex items-center gap-2">
                  {/* Tier 1 Scrutiny Button for Officers */}
                  {(!isInstAdmin || isSuperAdmin || isOfficer) && (rel.status === 'SUBMITTED' || rel.status === 'UNDER_REVIEW') && (
                    <button
                      onClick={() => {
                        setSelectedForReview(rel);
                        setReviewStatus('RECOMMENDED');
                        setOfficerObs('');
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md text-xs"
                    >
                      Tier-1 Officer Scrutiny
                    </button>
                  )}

                  {/* Tier 2 Authorization Button for Super Admin */}
                  {isSuperAdmin && rel.status === 'AWAITING_COMPETENT_AUTHORITY' && (
                    <button
                      onClick={() => {
                        setSelectedForAuth(rel);
                        setAuthDecision('AUTHORIZED');
                        setAuthComments('');
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 text-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Competent Authority Decision</span>
                    </button>
                  )}

                  <button
                    onClick={() => navigate(`/fdrs/${rel.fdr_id}`)}
                    className="px-3.5 py-1.5 bg-[#1A1D38] hover:bg-[#252A50] text-slate-300 font-semibold rounded-xl border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <span>View FDR Record</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tier-1 Review Modal */}
      <Modal
        isOpen={Boolean(selectedForReview)}
        onClose={() => setSelectedForReview(null)}
        title="Tier-1 Regulatory Officer Scrutiny"
        subtitle="Initial compliance review and recommendation"
      >
        <form onSubmit={handleOfficerReview} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Scrutiny Determination</label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 text-xs"
            >
              <option value="RECOMMENDED">Recommend for Final Authorization (Forward to Authority)</option>
              <option value="ADDITIONAL_INFO_REQUIRED">Demand Additional Documents from Institution</option>
              <option value="REJECTED">Reject Release Application</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Scrutiny Observations & Audit Findings</label>
            <textarea
              required
              rows={3}
              placeholder="Confirm completion of course term, absence of pending complaints, and compliance affidavit..."
              value={officerObs}
              onChange={(e) => setOfficerObs(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 text-xs placeholder:text-slate-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setSelectedForReview(null)}
              className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingReview}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold shadow-md"
            >
              {savingReview ? 'Recording...' : 'Submit Scrutiny'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Tier-2 Authority Modal */}
      <Modal
        isOpen={Boolean(selectedForAuth)}
        onClose={() => setSelectedForAuth(null)}
        title="Tier-2 Competent Authority Authorization"
        subtitle="Final release execution by Super Administrator"
      >
        <form onSubmit={handleSuperAdminAuthorize} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Final Authorization Determination</label>
            <select
              value={authDecision}
              onChange={(e) => setAuthDecision(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 text-xs"
            >
              <option value="AUTHORIZED">Authorize Release of Deposit (Issue Official Order)</option>
              <option value="REJECTED">Reject Release Order</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Formal Order Comments & Conditions</label>
            <textarea
              required
              rows={3}
              placeholder="State formal executive order reference and dispatch instructions to bank..."
              value={authComments}
              onChange={(e) => setAuthComments(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 text-xs placeholder:text-slate-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setSelectedForAuth(null)}
              className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingAuth}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md"
            >
              {savingAuth ? 'Recording...' : 'Authorize Final Release'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Submit Application Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Apply for Security Deposit Release / Refund"
        subtitle="Institutional formal release submission"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Select Eligible Deposit Instrument</label>
            <select
              value={selectedFdrId}
              onChange={(e) => setSelectedFdrId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 text-xs"
            >
              <option value="">-- Choose Verified FDR --</option>
              {myFdrs.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.fdr_number} • {formatCurrency(f.amount)} (Matures: {f.maturity_date})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Release Type</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 text-xs"
            >
              <option value="FULL_RELEASE">Full Deposit Release & Discharge</option>
              <option value="PARTIAL_RELEASE">Partial Release / Excess Capital Return</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Regulatory Justification Reason</label>
            <textarea
              required
              rows={3}
              placeholder="State completion of statutory lock-in period, council resolution reference..."
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 text-xs placeholder:text-slate-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedFdrId}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold shadow-md"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
