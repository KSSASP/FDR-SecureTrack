import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Badge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building
} from 'lucide-react';

export const RenewalTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, isOfficer, isInstAdmin } = useAuth();
  const { success, error } = useToast();

  const [renewals, setRenewals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Officer review modal
  const [selectedRenewal, setSelectedRenewal] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState('ACCEPTED');
  const [officerComments, setOfficerComments] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Institution initiate modal
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
  const [myFdrs, setMyFdrs] = useState<any[]>([]);
  const [selectedOriginalFdrId, setSelectedOriginalFdrId] = useState('');
  const [renewalReason, setRenewalReason] = useState('');
  const [initiating, setInitiating] = useState(false);

  const fetchRenewals = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ renewals: any[] }>('/renewals');
      setRenewals(res.renewals || []);
    } catch (err: any) {
      error(err.message || 'Failed to load renewal records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewals();
    if (isInstAdmin) {
      apiRequest<{ data: any[] }>('/fdrs?status=VERIFIED')
        .then(res => setMyFdrs(res.data || []))
        .catch(() => {});
    }
  }, [isInstAdmin]);

  const handleReviewRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRenewal || !officerComments.trim()) {
      error('Please record scrutiny review comments');
      return;
    }

    setSavingReview(true);
    try {
      await apiRequest(`/renewals/${selectedRenewal.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: reviewStatus,
          officer_comments: officerComments
        })
      });
      success(`Renewal decision recorded: ${reviewStatus}`);
      setSelectedRenewal(null);
      setOfficerComments('');
      fetchRenewals();
    } catch (err: any) {
      error(err.message || 'Failed to record renewal decision');
    } finally {
      setSavingReview(false);
    }
  };

  const handleInitiateRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOriginalFdrId || !renewalReason.trim()) {
      error('Please select an FDR and provide renewal justification');
      return;
    }

    setInitiating(true);
    try {
      await apiRequest('/renewals/initiate', {
        method: 'POST',
        body: JSON.stringify({
          original_fdr_id: selectedOriginalFdrId,
          reason: renewalReason
        })
      });
      success('Renewal request initiated and queued for officer scrutiny');
      setIsInitiateModalOpen(false);
      setSelectedOriginalFdrId('');
      setRenewalReason('');
      fetchRenewals();
    } catch (err: any) {
      error(err.message || 'Failed to initiate renewal');
    } finally {
      setInitiating(false);
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
          <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">ENDORSEMENTS</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Renewal & Replacement Monitoring</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Manages replacement instrument submissions, readiness checklists, and officer endorsement determinations.
          </p>
        </div>
        {isInstAdmin && (
          <button
            onClick={() => setIsInitiateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/25 transition-all w-fit"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Initiate Renewal Request</span>
          </button>
        )}
      </div>

      {/* Renewals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-[#121528] p-16 text-center rounded-2xl border border-white/5 shadow-xl">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading renewal workflows...</p>
          </div>
        ) : renewals.length === 0 ? (
          <div className="bg-[#121528] p-16 text-center rounded-2xl border border-white/5 text-slate-400 shadow-xl">
            <RefreshCw className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-white">No Renewal Requests On Record</p>
            <p className="text-xs text-slate-500 mt-0.5">Institutions can initiate renewal requests for instruments approaching maturity.</p>
          </div>
        ) : (
          renewals.map((r: any) => (
            <div key={r.id} className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-rose-300 font-mono">Case #{r.id}</span>
                  <span className="text-slate-600">•</span>
                  <span className="font-semibold text-white text-xs">{r.institution_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Readiness:</span>
                  <Badge type="readiness" value={r.readiness_status} />
                  <Badge type="status" value={r.status} />
                </div>
              </div>

              {/* Old vs New comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#15182D] p-4 rounded-xl border border-white/5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Original Maturing FDR</span>
                  <p className="font-mono font-bold text-white mt-1">{r.original_fdr_number}</p>
                  <p className="text-slate-300 font-medium">{formatCurrency(r.original_amount)} • {r.original_bank}</p>
                  <span className="text-[10px] text-slate-500 font-mono">Matured: {r.original_maturity}</span>
                </div>

                <div className="border-t sm:border-t-0 sm:border-l sm:pl-4 border-white/10 pt-3 sm:pt-0">
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Replacement Renewed Instrument</span>
                  {r.replacement_fdr_number ? (
                    <>
                      <p className="font-mono font-bold text-purple-300 mt-1">{r.replacement_fdr_number}</p>
                      <p className="text-slate-200 font-medium">{formatCurrency(r.replacement_amount)} • {r.replacement_bank}</p>
                      <span className="text-[10px] text-slate-400 font-mono">New Maturity: {r.replacement_maturity}</span>
                    </>
                  ) : (
                    <p className="text-amber-300 font-medium mt-1">
                      Awaiting replacement FDR instrument upload by institution
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-300">
                <strong className="text-rose-300">Justification:</strong> {r.reason}
              </p>

              {r.officer_comments && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
                  <span className="font-semibold block text-[11px] text-blue-300 mb-0.5">Officer Determination Comments:</span>
                  {r.officer_comments}
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                <span className="text-slate-500 font-mono text-[11px]">Requested: {r.request_date}</span>

                <div className="flex items-center gap-2">
                  {(!isInstAdmin || isSuperAdmin || isOfficer) && r.status === 'PENDING_REVIEW' && (
                    <button
                      onClick={() => setSelectedRenewal(r)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold rounded-xl shadow-md transition-all text-xs"
                    >
                      Record Officer Determination
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/fdrs/${r.original_fdr_id}`)}
                    className="px-3.5 py-1.5 bg-[#1A1D38] hover:bg-[#252A50] text-slate-300 font-semibold rounded-xl border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <span>View Case</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal (Officers) */}
      <Modal
        isOpen={Boolean(selectedRenewal)}
        onClose={() => setSelectedRenewal(null)}
        title="Record Renewal Scrutiny Determination"
        subtitle="Formal approval or rejection of replacement instrument"
      >
        <form onSubmit={handleReviewRenewal} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Determination</label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 text-xs"
            >
              <option value="ACCEPTED">Accept Replacement Instrument (Endorse Renewal)</option>
              <option value="CORRECTION_REQUIRED">Demand Corrections / Clarifications from Institution</option>
              <option value="REJECTED">Reject Replacement Instrument</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Scrutiny Comments & Conditions</label>
            <textarea
              required
              rows={3}
              placeholder="State basis for endorsement or defects requiring correction..."
              value={officerComments}
              onChange={(e) => setOfficerComments(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 text-xs placeholder:text-slate-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setSelectedRenewal(null)}
              className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingReview}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold shadow-md"
            >
              {savingReview ? 'Saving...' : 'Submit Determination'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Initiate Renewal Modal (Institutions) */}
      <Modal
        isOpen={isInitiateModalOpen}
        onClose={() => setIsInitiateModalOpen(false)}
        title="Initiate FDR Renewal / Replacement Workflow"
        subtitle="Submit renewal application prior to maturity"
      >
        <form onSubmit={handleInitiateRenewal} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Select Maturing FDR</label>
            <select
              value={selectedOriginalFdrId}
              onChange={(e) => setSelectedOriginalFdrId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 text-xs"
            >
              <option value="">-- Choose Maturing Instrument --</option>
              {myFdrs.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.fdr_number} • {formatCurrency(f.amount)} (Matures: {f.maturity_date})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Renewal Justification Reason</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Scheduled annual renewal of security deposit with updated bank interest term..."
              value={renewalReason}
              onChange={(e) => setRenewalReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 text-xs placeholder:text-slate-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsInitiateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={initiating || !selectedOriginalFdrId}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold shadow-md"
            >
              {initiating ? 'Initiating...' : 'Submit Renewal Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
