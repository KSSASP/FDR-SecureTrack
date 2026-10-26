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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Security Deposit Release & Refund Workflow</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Two-tier regulatory clearance: Scrutiny Officer initial recommendation followed by Competent Authority authorization.
          </p>
        </div>
        {isInstAdmin && (
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors w-fit"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply for Deposit Release</span>
          </button>
        )}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading release applications...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
            <HandCoins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No Release Applications On Record</p>
            <p className="text-xs text-slate-500 mt-0.5">Institutions can apply for deposit release upon regulatory term completion.</p>
          </div>
        ) : (
          requests.map((rel: any) => (
            <div key={rel.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-blue-900 font-mono">Application #{rel.id}</span>
                  <span className="text-slate-400">•</span>
                  <span className="font-semibold text-slate-800 text-xs">{rel.institution_name}</span>
                </div>
                <Badge type="status" value={rel.status} />
              </div>

              {/* Instrument Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Deposit Instrument</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">{rel.fdr_number}</p>
                  <p className="text-slate-600">{rel.bank_name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Deposit Amount</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{formatCurrency(rel.amount)}</p>
                  <p className="text-slate-500 font-mono">Matured: {rel.maturity_date}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Release Classification</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{rel.request_type?.replace('_', ' ')}</p>
                  <p className="text-slate-500 font-mono">Ref: {rel.linked_application_ref}</p>
                </div>
              </div>

              <p className="text-xs text-slate-800">
                <strong>Justification:</strong> {rel.reason}
              </p>

              {/* Tier 1 & Tier 2 Observations */}
              {rel.officer_observations && (
                <div className="p-2.5 rounded bg-blue-50/70 border border-blue-200 text-blue-950 text-xs">
                  <span className="font-semibold block text-[11px]">Tier-1 Officer Scrutiny Observation:</span>
                  {rel.officer_observations}
                  {rel.first_authorizer_name && (
                    <span className="text-[10px] block text-blue-800 mt-1">Recommended by: {rel.first_authorizer_name}</span>
                  )}
                </div>
              )}

              {rel.decision_comments && (
                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
                  <span className="font-semibold block text-[11px]">Tier-2 Competent Authority Authorization Order:</span>
                  {rel.decision_comments}
                  {rel.second_authorizer_name && (
                    <span className="text-[10px] block text-emerald-800 mt-1">Authorized by: {rel.second_authorizer_name}</span>
                  )}
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Submitted: {rel.submission_date}</span>

                <div className="flex items-center gap-2">
                  {/* Tier 1 Scrutiny Button for Officers */}
                  {(!isInstAdmin || isSuperAdmin || isOfficer) && (rel.status === 'SUBMITTED' || rel.status === 'UNDER_REVIEW') && (
                    <button
                      onClick={() => {
                        setSelectedForReview(rel);
                        setReviewStatus('RECOMMENDED');
                        setOfficerObs('');
                      }}
                      className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded shadow-2xs"
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
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded shadow-2xs flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Competent Authority Decision</span>
                    </button>
                  )}

                  <button
                    onClick={() => navigate(`/fdrs/${rel.fdr_id}`)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-300 flex items-center gap-1"
                  >
                    <span>View FDR Record</span>
                    <ExternalLink className="w-3 h-3" />
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
            <label className="block font-semibold text-slate-700 mb-1">Scrutiny Determination</label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="RECOMMENDED">Recommend for Final Authorization (Forward to Authority)</option>
              <option value="ADDITIONAL_INFO_REQUIRED">Demand Additional Documents from Institution</option>
              <option value="REJECTED">Reject Release Application</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Scrutiny Observations & Audit Findings</label>
            <textarea
              required
              rows={3}
              placeholder="Confirm completion of course term, absence of pending complaints, and compliance affidavit..."
              value={officerObs}
              onChange={(e) => setOfficerObs(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedForReview(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingReview}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold"
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
        title="Competent Authority Final Decision"
        subtitle="Supervisory tier-2 authorization of security deposit release"
      >
        <form onSubmit={handleSuperAdminAuthorize} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
            <strong>Regulatory Notice:</strong> Authorization recorded here constitutes an official administrative release decree. It certifies compliance fulfillment. No banking money transfers are executed.
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Final Authority Decision</label>
            <select
              value={authDecision}
              onChange={(e) => setAuthDecision(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="AUTHORIZED">Authorize Full Release of Deposit Instrument</option>
              <option value="REJECTED">Reject Release Order</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Supervisory Authorization Comments</label>
            <textarea
              required
              rows={3}
              placeholder="State formal order reference and authorization basis..."
              value={authComments}
              onChange={(e) => setAuthComments(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedForAuth(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingAuth}
              className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              {savingAuth ? 'Recording Order...' : 'Record Authorized Decision'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Submit Release Request Modal (Institution Admin) */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Apply for Security Deposit Release / Refund"
        subtitle="Submit regulatory discharge application"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Compliant FDR</label>
            <select
              value={selectedFdrId}
              onChange={(e) => setSelectedFdrId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="">-- Choose Verified Deposit --</option>
              {myFdrs.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.fdr_number} • {formatCurrency(f.amount)} (Matures: {f.maturity_date})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Discharge Classification</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="FULL_RELEASE">Full Release (Regulatory Norms Fulfilled)</option>
              <option value="PARTIAL_REFUND">Partial Refund</option>
              <option value="REGULATORY_COMPLETION">Moratorium / Inspection Completion</option>
              <option value="COURT_ORDER">Judicial or Appellate Clearance</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Regulatory Justification Reason</label>
            <textarea
              required
              rows={3}
              placeholder="State completion of approved intake, return of original documents, and compliance..."
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedFdrId}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {submitting ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
