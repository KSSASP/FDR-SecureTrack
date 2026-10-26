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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Renewal & Replacement Monitoring</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manages replacement instrument submissions, readiness checklists, and officer endorsement determinations.
          </p>
        </div>
        {isInstAdmin && (
          <button
            onClick={() => setIsInitiateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors w-fit"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Initiate Renewal Request</span>
          </button>
        )}
      </div>

      {/* Renewals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading renewal workflows...</p>
          </div>
        ) : renewals.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
            <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No Renewal Requests On Record</p>
            <p className="text-xs text-slate-500 mt-0.5">Institutions can initiate renewal requests for instruments approaching maturity.</p>
          </div>
        ) : (
          renewals.map((r: any) => (
            <div key={r.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-blue-900 font-mono">Case #{r.id}</span>
                  <span className="text-slate-400">•</span>
                  <span className="font-semibold text-slate-800 text-xs">{r.institution_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Readiness:</span>
                  <Badge type="readiness" value={r.readiness_status} />
                  <Badge type="status" value={r.status} />
                </div>
              </div>

              {/* Old vs New comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Original Maturing FDR</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">{r.original_fdr_number}</p>
                  <p className="text-slate-700 font-medium">{formatCurrency(r.original_amount)} • {r.original_bank}</p>
                  <span className="text-[10px] text-slate-500 font-mono">Matured: {r.original_maturity}</span>
                </div>

                <div className="border-t sm:border-t-0 sm:border-l sm:pl-3 border-slate-200 pt-2 sm:pt-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Replacement Renewed Instrument</span>
                  {r.replacement_fdr_number ? (
                    <>
                      <p className="font-mono font-bold text-blue-900 mt-0.5">{r.replacement_fdr_number}</p>
                      <p className="text-slate-700 font-medium">{formatCurrency(r.replacement_amount)} • {r.replacement_bank}</p>
                      <span className="text-[10px] text-slate-500 font-mono">New Maturity: {r.replacement_maturity}</span>
                    </>
                  ) : (
                    <p className="text-amber-800 font-medium mt-1">
                      Awaiting replacement FDR instrument upload by institution
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-700">
                <strong>Justification:</strong> {r.reason}
              </p>

              {r.officer_comments && (
                <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-950 text-xs">
                  <span className="font-semibold block text-[11px]">Officer Determination Comments:</span>
                  {r.officer_comments}
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Requested: {r.request_date}</span>

                <div className="flex items-center gap-2">
                  {(!isInstAdmin || isSuperAdmin || isOfficer) && r.status === 'PENDING_REVIEW' && (
                    <button
                      onClick={() => {
                        setSelectedRenewal(r);
                      }}
                      className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded shadow-2xs"
                    >
                      Record Officer Determination
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/fdrs/${r.original_fdr_id}`)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-300 flex items-center gap-1"
                  >
                    <span>View Case</span>
                    <ExternalLink className="w-3 h-3" />
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
            <label className="block font-semibold text-slate-700 mb-1">Determination</label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="ACCEPTED">Accept Replacement Instrument (Endorse Renewal)</option>
              <option value="CORRECTION_REQUIRED">Demand Corrections / Clarifications from Institution</option>
              <option value="REJECTED">Reject Replacement Instrument</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Scrutiny Comments & Conditions</label>
            <textarea
              required
              rows={3}
              placeholder="State basis for endorsement or defects requiring correction..."
              value={officerComments}
              onChange={(e) => setOfficerComments(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedRenewal(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingReview}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold"
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
            <label className="block font-semibold text-slate-700 mb-1">Select Maturing FDR</label>
            <select
              value={selectedOriginalFdrId}
              onChange={(e) => setSelectedOriginalFdrId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
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
            <label className="block font-semibold text-slate-700 mb-1">Renewal Justification Reason</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Scheduled annual renewal of security deposit with updated bank interest term..."
              value={renewalReason}
              onChange={(e) => setRenewalReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsInitiateModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={initiating || !selectedOriginalFdrId}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {initiating ? 'Initiating...' : 'Submit Renewal Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
