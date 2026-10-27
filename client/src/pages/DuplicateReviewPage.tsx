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
    } catch {
      return { signals: [], matchedFields: [], differingFields: [] };
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">FRAUD PREVENTION</div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Cross-Institution Duplicate Collision Review</h1>
            <span className="text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
              {duplicates.length} Flagged
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Cryptographic SHA-256 document hashing, normalized identifier cross-checks, and explainable multi-signal similarity matching.
          </p>
        </div>
        <button
          onClick={fetchDuplicates}
          className="p-2.5 bg-[#1A1D38] hover:bg-[#252A50] text-slate-300 rounded-xl border border-white/10 transition-colors w-fit flex items-center gap-2 text-xs font-semibold"
          title="Refresh Duplicate Log"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Impartiality / Neutrality Notice */}
      <div className="bg-[#101935] border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-blue-200 shadow-lg">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-white">Review-Priority Notification & Neutrality Protocol</p>
          <p className="text-slate-300 mt-0.5 leading-relaxed">
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
            className={`px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
              filterCategory === tab.id
                ? 'bg-gradient-to-r from-rose-500/80 via-purple-600/90 to-indigo-600 text-white shadow-md shadow-purple-600/25 font-bold'
                : 'bg-[#15182D] border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Duplicate Findings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-[#121528] p-16 text-center rounded-2xl border border-white/5 shadow-xl">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Scanning repository for cross-institution collisions...</p>
          </div>
        ) : filteredDuplicates.length === 0 ? (
          <div className="bg-[#121528] p-16 text-center rounded-2xl border border-white/5 text-slate-400 shadow-xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-white">No Matching Findings in Active Filter</p>
            <p className="text-xs text-slate-500 mt-0.5">All scrutinized records in this category meet unique validity requirements.</p>
          </div>
        ) : (
          filteredDuplicates.map((df: any) => {
            const parsed = parseSignals(df.matching_signals);
            return (
              <div
                key={df.id}
                className={`bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl transition-all hover:border-white/15 ${
                  df.match_category === 'EXACT_DUPLICATE'
                    ? 'border-l-4 border-l-rose-500'
                    : df.match_category === 'STRONG_POTENTIAL_MATCH'
                    ? 'border-l-4 border-l-amber-500'
                    : 'border-l-4 border-l-slate-600'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider ${
                      df.match_category === 'EXACT_DUPLICATE'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : df.match_category === 'STRONG_POTENTIAL_MATCH'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                    }`}>
                      {df.match_category?.replace(/_/g, ' ')}
                    </span>
                    <span className="font-semibold text-slate-300 text-xs">
                      Multi-Signal Similarity Index: <strong className="text-rose-400 font-mono">{(df.similarity_score * 100).toFixed(0)}%</strong>
                    </span>
                  </div>
                  <Badge type="status" value={df.status} />
                </div>

                {/* Collision Explanation */}
                <div className="text-xs text-slate-200 font-medium my-3.5 leading-relaxed bg-[#15182D] p-3.5 rounded-xl border border-white/5">
                  <strong className="text-rose-300 block mb-1">Scrutiny Reason:</strong>
                  {df.reason}
                </div>

                {/* Side-by-Side Comparison Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#15182D] p-4 rounded-xl border border-white/5 text-xs my-3.5">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block border-b border-white/10 pb-1">
                      1. Subject Instrument Under Review
                    </span>
                    <p className="font-mono font-bold text-rose-300 text-sm">{df.fdr_number}</p>
                    <p className="font-semibold text-white">{df.institution_name} {df.institution_code ? `(${df.institution_code})` : ''}</p>
                    <p className="text-slate-400">{df.bank_name}</p>
                    <p className="font-bold text-white font-mono">{formatCurrency(df.amount)}</p>
                    <button
                      onClick={() => navigate(`/fdrs/${df.fdr_id}`)}
                      className="mt-2 text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                    >
                      <span>Open Subject Case</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block border-b border-white/10 pb-1">
                      2. Conflicting Match Instrument
                    </span>
                    <p className="font-mono font-bold text-purple-300 text-sm">{df.matched_fdr_number || df.matching_fdr_number}</p>
                    <p className="font-semibold text-white">{(df.matched_institution_name || df.matching_institution_name)} {(df.matched_institution_code || df.matching_institution_code) ? `(${df.matched_institution_code || df.matching_institution_code})` : ''}</p>
                    <p className="text-slate-400">{df.matched_bank_name || df.matching_bank_name}</p>
                    <p className="font-bold text-white font-mono">{formatCurrency(df.matched_amount ?? df.matching_amount)}</p>
                    <button
                      onClick={() => navigate(`/fdrs/${df.matched_fdr_id}`)}
                      className="mt-2 text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                    >
                      <span>Open Conflicting Case</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Signals and Matched vs Differing Breakdown */}
                {parsed && (
                  <div className="space-y-2 text-xs mb-3">
                    {/* Matching Signals pills */}
                    {parsed.signals && parsed.signals.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 my-2">
                        {parsed.signals.map((sig: any, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#0E1020] border border-white/10 text-slate-300 font-mono text-[10px] flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-rose-400" />
                            {typeof sig === 'string' ? sig : JSON.stringify(sig)}
                          </span>
                        ))}
                      </div>
                    )}

                    {(parsed.matchedFields?.length > 0 || parsed.differingFields?.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {parsed.matchedFields && parsed.matchedFields.length > 0 && (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-300">
                            <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">
                              ✓ Identical Attributes
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {parsed.matchedFields.map((f: any, i: number) => {
                                const label = typeof f === 'string' ? f : (f.fieldLabel || f.field || JSON.stringify(f));
                                const detail = typeof f === 'object' && f.targetValue !== undefined ? ` (${f.targetValue})` : '';
                                return (
                                  <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                                    {label}{detail}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {parsed.differingFields && parsed.differingFields.length > 0 && (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-300">
                            <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">
                              ≠ Differing Attributes
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {parsed.differingFields.map((f: any, i: number) => {
                                const label = typeof f === 'string' ? f : (f.fieldLabel || f.field || JSON.stringify(f));
                                const diffDetail = typeof f === 'object' && f.targetValue !== undefined && f.candidateValue !== undefined ? ` (${f.targetValue} vs ${f.candidateValue})` : '';
                                return (
                                  <span key={i} className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                                    {label}{diffDetail}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Logged on {new Date(df.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedFinding(df);
                        setIsResolveModalOpen(true);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolve Collision</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resolution Modal */}
      {selectedFinding && (
        <Modal
          isOpen={isResolveModalOpen}
          onClose={() => setIsResolveModalOpen(false)}
          title="Resolve Duplicate Finding"
        >
          <form onSubmit={handleResolveDuplicate} className="space-y-4">
            <div className="bg-[#15182D] p-3.5 rounded-xl border border-white/5 text-xs space-y-1 text-slate-300">
              <p><strong>Subject:</strong> {selectedFinding.fdr_number} ({selectedFinding.institution_name})</p>
              <p><strong>Collision Match:</strong> {selectedFinding.matched_fdr_number || selectedFinding.matching_fdr_number} ({selectedFinding.matched_institution_name || selectedFinding.matching_institution_name})</p>
              <p><strong>Detection Type:</strong> {selectedFinding.match_category?.replace(/_/g, ' ')}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Resolution Disposition
              </label>
              <select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500"
              >
                <option value="CONFIRMED_DUPLICATE">Confirmed Duplicate (Illegal Multi-Registration / Hold)</option>
                <option value="REVIEWED_LEGITIMATE">Reviewed & Legitimate (Authorized Split / Genuine Multi-Branch)</option>
                <option value="DISMISSED">Dismiss as False Positive (Unrelated Instruments / Verified Valid)</option>
                <option value="FALSE_POSITIVE">False Positive (Distinct Instruments with Accidental Collisions)</option>
                <option value="RESOLVED_PERMITTED">Resolved & Permitted (Documented Regulatory Exemption Granted)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Scrutiny Observations & Traceability Justification <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Document verification findings, bank contact details, officer observations, or authorization rationale..."
                className="w-full px-3.5 py-2.5 text-xs bg-[#15182D] border border-[#2B2F4E] rounded-xl text-white focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50"
              >
                {saving ? 'Recording...' : 'Commit Resolution'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
