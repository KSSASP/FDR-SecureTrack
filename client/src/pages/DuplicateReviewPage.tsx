import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Badge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import { useToast } from '../context/ToastContext.js';
import {
  CopyX,
  AlertOctagon,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Building,
  RotateCw,
  Info,
  Check,
  X,
  ArrowRightLeft,
  AlertTriangle
} from 'lucide-react';

export const DuplicateReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'EXACT_DUPLICATE' | 'STRONG_POTENTIAL_MATCH' | 'WEAK_SIMILARITY'>('ALL');
  const [loading, setLoading] = useState(true);

  // Resolution modal state
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState('CONFIRMED_DUPLICATE');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ duplicates: any[] }>('/duplicates');
      setDuplicates(res.duplicates || []);
    } catch (err: any) {
      error(err.message || 'Failed to load duplicate detection findings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handleResolveDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinding || !resolutionNotes.trim()) {
      error('Please record your scrutiny observations');
      return;
    }

    setSaving(true);
    try {
      await apiRequest(`/duplicates/${selectedFinding.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          status: resolutionStatus,
          resolution_notes: resolutionNotes
        })
      });
      success(`Duplicate finding marked as ${resolutionStatus.replace('_', ' ')}`);
      setIsResolveModalOpen(false);
      setSelectedFinding(null);
      setResolutionNotes('');
      fetchDuplicates();
    } catch (err: any) {
      error(err.message || 'Failed to resolve duplicate finding');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  const filteredDuplicates = duplicates.filter(df => {
    if (filterCategory === 'ALL') return true;
    return df.match_category === filterCategory;
  });

  const parseSignals = (raw: string | any) => {
    if (!raw) return { signals: [], matchedFields: [], differingFields: [] };
    if (typeof raw === 'object') return raw;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return { signals: parsed, matchedFields: [], differingFields: [] };
      }
      return parsed;
    } catch (_) {
      return { signals: [String(raw)], matchedFields: [], differingFields: [] };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cross-Institution Duplicate Detection & Collision Review</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisory review workbench identifying multi-institution instrument collisions, normalized number overlaps, and certificate binary matches.
          </p>
        </div>
        <button
          onClick={fetchDuplicates}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors w-fit flex items-center gap-1.5 text-xs font-semibold"
          title="Refresh Duplicate Log"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Impartiality / Neutrality Notice */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-blue-950">Review-Priority Notification & Neutrality Protocol</p>
          <p className="text-blue-800 mt-0.5 leading-relaxed">
            Duplicate detection findings serve strictly as review-priority indicators to assist officers in identifying potential re-submissions, split deposits, or cross-institution collisions. Potential matches must never be automatically classified as fraud without rigorous human scrutiny and formal bank confirmation.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
        {[
          { id: 'ALL', label: `All Findings (${duplicates.length})` },
          { id: 'EXACT_DUPLICATE', label: `Exact Identifier Collisions (${duplicates.filter(d => d.match_category === 'EXACT_DUPLICATE').length})` },
          { id: 'STRONG_POTENTIAL_MATCH', label: `Strong Similarities (${duplicates.filter(d => d.match_category === 'STRONG_POTENTIAL_MATCH').length})` },
          { id: 'WEAK_SIMILARITY', label: `Attribute Overlaps (${duplicates.filter(d => d.match_category === 'WEAK_SIMILARITY').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterCategory(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterCategory === tab.id
                ? 'bg-blue-700 text-white shadow-2xs font-bold'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Duplicate Findings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Scanning repository for cross-institution collisions...</p>
          </div>
        ) : filteredDuplicates.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No Matching Findings in Active Filter</p>
            <p className="text-xs text-slate-500 mt-0.5">All scrutinized records in this category meet unique validity requirements.</p>
          </div>
        ) : (
          filteredDuplicates.map((df: any) => {
            const parsed = parseSignals(df.matching_signals);
            return (
              <div
                key={df.id}
                className={`bg-white rounded-xl p-5 border shadow-xs transition-shadow hover:shadow-md ${
                  df.match_category === 'EXACT_DUPLICATE'
                    ? 'border-l-4 border-l-rose-600 border-slate-200'
                    : df.match_category === 'STRONG_POTENTIAL_MATCH'
                    ? 'border-l-4 border-l-amber-500 border-slate-200'
                    : 'border-l-4 border-l-slate-400 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded font-bold text-xs uppercase tracking-wide ${
                      df.match_category === 'EXACT_DUPLICATE'
                        ? 'bg-rose-600 text-white'
                        : df.match_category === 'STRONG_POTENTIAL_MATCH'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-600 text-white'
                    }`}>
                      {df.match_category?.replace(/_/g, ' ')}
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">
                      Multi-Signal Similarity Index: <strong className="text-rose-700">{(df.similarity_score * 100).toFixed(0)}%</strong>
                    </span>
                  </div>
                  <Badge type="status" value={df.status} />
                </div>

                {/* Collision Explanation */}
                <p className="text-xs text-slate-800 font-medium my-3 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                  <strong className="text-slate-900 block mb-0.5">Scrutiny Reason:</strong>
                  {df.reason}
                </p>

                {/* Side-by-Side Comparison Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs my-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block border-b border-blue-200 pb-1">
                      1. Subject Instrument Under Review
                    </span>
                    <p className="font-mono font-bold text-blue-900 text-sm">{df.fdr_number}</p>
                    <p className="font-semibold text-slate-800">{df.institution_name} {df.institution_code ? `(${df.institution_code})` : ''}</p>
                    <p className="text-slate-600">{df.bank_name}</p>
                    <p className="font-bold text-slate-900">{formatCurrency(df.amount)}</p>
                    <span className="text-[11px] font-mono text-slate-500 block">Maturity Date: {df.maturity_date}</span>
                  </div>

                  <div className="border-t md:border-t-0 md:border-l md:pl-4 border-slate-200 pt-3 md:pt-0 space-y-1.5">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block border-b border-rose-200 pb-1">
                      2. Correlating Registered Instrument
                    </span>
                    <p className="font-mono font-bold text-rose-900 text-sm">{df.matched_fdr_number}</p>
                    <p className="font-semibold text-slate-800">{df.matched_institution_name} {df.matched_institution_code ? `(${df.matched_institution_code})` : ''}</p>
                    <p className="text-slate-600">{df.matched_bank_name}</p>
                    <p className="font-bold text-slate-900">{formatCurrency(df.matched_amount)}</p>
                    <span className="text-[11px] font-mono text-slate-500 block">Maturity Date: {df.matched_maturity_date}</span>
                  </div>
                </div>

                {/* Matched vs Differing Attributes Breakdown */}
                {((parsed.matchedFields && parsed.matchedFields.length > 0) || (parsed.differingFields && parsed.differingFields.length > 0)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                    {/* Matched Fields */}
                    {parsed.matchedFields && parsed.matchedFields.length > 0 && (
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
                        <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Matching Parameters ({parsed.matchedFields.length})</span>
                        </span>
                        <ul className="space-y-1 text-[11px] text-emerald-900">
                          {parsed.matchedFields.map((mf: any, mIdx: number) => (
                            <li key={mIdx} className="flex items-center justify-between bg-white/70 px-2 py-1 rounded border border-emerald-100">
                              <span className="font-semibold">{mf.fieldLabel || mf.field}:</span>
                              <span className="font-mono text-emerald-800">{String(mf.targetValue)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Differing Fields */}
                    {parsed.differingFields && parsed.differingFields.length > 0 && (
                      <div className="bg-slate-100/70 border border-slate-200 rounded-lg p-3">
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
                          <span>Differing Parameters ({parsed.differingFields.length})</span>
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-700">
                          {parsed.differingFields.map((dfField: any, dIdx: number) => (
                            <li key={dIdx} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200">
                              <span className="font-semibold">{dfField.fieldLabel || dfField.field}:</span>
                              <span className="font-mono text-slate-600 truncate max-w-[140px]" title={`${dfField.targetValue} vs ${dfField.candidateValue}`}>
                                {String(dfField.targetValue)} ≠ {String(dfField.candidateValue)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Recommended Officer Action */}
                {parsed.recommendedAction && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 mb-3 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[11px] uppercase tracking-wider text-amber-950 font-bold">Recommended Scrutiny Procedure:</strong>
                      <p className="text-[11px] text-amber-900 mt-0.5">{parsed.recommendedAction}</p>
                    </div>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs flex-wrap gap-2">
                  <span className="text-[11px] text-slate-500">
                    Logged: <strong className="font-mono">{new Date(df.created_at).toLocaleDateString()}</strong>
                    {df.reviewed_by_name && (
                      <span> • Reviewed by: <strong>{df.reviewed_by_name}</strong></span>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedFinding(df);
                        setIsResolveModalOpen(true);
                      }}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded border border-slate-300 shadow-2xs"
                    >
                      Record Ruling
                    </button>
                    <button
                      onClick={() => navigate(`/fdrs/${df.fdr_id}`)}
                      className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded shadow-2xs flex items-center gap-1"
                    >
                      <span>Open Subject Case</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Scrutiny Decision Modal */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Record Duplicate Scrutiny Determination"
        subtitle="Formal administrative ruling on cross-institution duplicate finding"
      >
        <form onSubmit={handleResolveDuplicate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Scrutiny Ruling</label>
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="CONFIRMED_DUPLICATE">Confirmed Duplicate Instrument (Apply Regulatory Deficiency Hold)</option>
              <option value="REVIEWED_LEGITIMATE">Reviewed & Verified Legitimate (Independent Coincidental Serial)</option>
              <option value="DISMISSED">Dismissed / Administrative Duplicate</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mandatory Explanatory Scrutiny Observations <span className="text-rose-500">*</span></label>
            <textarea
              required
              rows={3}
              placeholder="Record specific findings from physical certificates, issuing branch verification, or reason for clearance..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsResolveModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {saving ? 'Recording Ruling...' : 'Record Ruling'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
