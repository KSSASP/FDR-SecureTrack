import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Badge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  ShieldAlert,
  Settings,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  Info,
  Check,
  FileText,
  HelpCircle,
  RefreshCw,
  Scale
} from 'lucide-react';

export const RiskAssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { success, error } = useToast();

  const [fdrs, setFdrs] = useState<any[]>([]);
  const [weights, setWeights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit weights modal
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [editedWeights, setEditedWeights] = useState<Record<string, number>>({});
  const [savingWeights, setSavingWeights] = useState(false);

  // Quick Evidence Drawer Modal
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [caseAssessment, setCaseAssessment] = useState<any>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const [fdrRes, weightRes] = await Promise.all([
        apiRequest<{ data: any[] }>('/fdrs?limit=50&sortBy=risk_score&sortOrder=DESC'),
        apiRequest<{ weights: any[] }>('/risk/weights')
      ]);

      setFdrs(fdrRes.data || []);
      setWeights(weightRes.weights || []);

      const map: Record<string, number> = {};
      (weightRes.weights || []).forEach(w => {
        map[w.key] = parseInt(w.value, 10);
      });
      setEditedWeights(map);
    } catch (err: any) {
      error(err.message || 'Failed to load risk data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const handleInspectEvidence = async (fdr: any) => {
    setSelectedCase(fdr);
    setIsEvidenceModalOpen(true);
    setLoadingAssessment(true);
    try {
      const res = await apiRequest<{ assessment: any }>(`/risk/fdr/${fdr.id}`);
      setCaseAssessment(res.assessment);
    } catch (err: any) {
      error('Failed to load factor details');
    } finally {
      setLoadingAssessment(false);
    }
  };

  const handleRecalculate = async (fdrId: string) => {
    setRecalculating(true);
    try {
      const res = await apiRequest<{ result: any }>(`/risk/recalculate/${fdrId}`, { method: 'POST' });
      success(`Risk score recalculated: ${res.result.totalScore}/100`);
      setCaseAssessment(res.result);
      fetchRiskData();
    } catch (err: any) {
      error(err.message || 'Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWeights(true);
    try {
      await apiRequest('/risk/weights', {
        method: 'PUT',
        body: JSON.stringify({ weights: editedWeights })
      });
      success('Scoring weights saved and updated');
      setIsWeightModalOpen(false);
      fetchRiskData();
    } catch (err: any) {
      error(err.message || 'Failed to update factor weights');
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">SCORING ENGINE</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Explainable FDR Risk Scoring Engine</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Transparent composite score (0-100) based on deterministic weights. Avoids blackbox or arbitrary AI decisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setIsWeightModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/25 transition-all w-fit"
            >
              <Sliders className="w-4 h-4" />
              <span>Configure Factor Weights</span>
            </button>
          )}
          <button
            onClick={fetchRiskData}
            className="p-2.5 bg-[#1A1D38] hover:bg-[#252A50] text-slate-300 rounded-xl border border-white/10 transition-colors w-fit"
            title="Refresh Risk Rankings"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legal & Administrative Disclaimer */}
      <div className="bg-[#101935] border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-blue-200 shadow-lg">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-white">Administrative Review-Priority Protocol</p>
          <p className="text-slate-300 mt-0.5 leading-relaxed">
            Composite risk scores (0–100) function strictly as review-priority indicators to schedule officer scrutiny and queue investigative workflows. A high score highlights records with data discrepancies, imminent expiration, or unverified branch records; it does NOT constitute legal proof or an accusation of fraudulent conduct.
          </p>
        </div>
      </div>

      {/* Transparent Model Weights Card */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider border-b border-white/5 pb-2.5 flex items-center gap-2">
          <Scale className="w-4 h-4 text-rose-400" />
          <span>Transparent Rule Scoring Model (Deterministic Weighted Factors)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          {weights.map(w => (
            <div key={w.key} className="p-3.5 bg-[#15182D] rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 font-mono block truncate" title={w.key}>
                {w.key.replace('RISK_WEIGHT_', '')}
              </span>
              <p className="text-xl font-bold text-white mt-1 font-mono">+{w.value} pts</p>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{w.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cases by Risk Rank Table */}
      <div className="bg-[#121528] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0E1020]">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Cases Ranked by Review Priority Index</h3>
            <p className="text-xs text-slate-400">Sorted from critical severity to standard compliant baseline</p>
          </div>
          <span className="text-xs font-mono text-slate-300 bg-[#15182D] px-3 py-1 rounded-full border border-white/5">
            {fdrs.length} Active Instruments Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#15182D] border-b border-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Priority Score</th>
                <th className="py-3.5 px-4">FDR Number</th>
                <th className="py-3.5 px-4">Institution Name</th>
                <th className="py-3.5 px-4">Issuing Bank</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-4">Risk Tier</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Evaluating explainable risk scoring...
                  </td>
                </tr>
              ) : (
                fdrs.map((item: any) => (
                  <tr key={item.id} className="hover:bg-[#181C35] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-full inline-block border ${
                        item.risk_score >= 75 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                        item.risk_score >= 50 ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                        item.risk_score >= 25 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {item.risk_score} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-300">
                      {item.fdr_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium truncate max-w-[200px] text-white">
                      {item.institution_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {item.bank_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge type="status" value={item.current_status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge type="risk" value={item.risk_level} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleInspectEvidence(item)}
                          className="px-3 py-1.5 bg-[#1A1D38] hover:bg-[#252A50] text-slate-300 rounded-xl border border-white/10 font-semibold text-xs transition-colors"
                        >
                          Factor Breakdown
                        </button>
                        <button
                          onClick={() => navigate(`/fdrs/${item.id}`)}
                          className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-1 shadow-md transition-all"
                        >
                          <span>Case File</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Factor Breakdown Modal */}
      {selectedCase && (
        <Modal
          isOpen={isEvidenceModalOpen}
          onClose={() => setIsEvidenceModalOpen(false)}
          title={`Evidence-Linked Risk Trace - FDR ${selectedCase.fdr_number}`}
          subtitle={`${selectedCase.institution_name} • Current Score: ${selectedCase.risk_score}/100`}
        >
          <div className="space-y-4 text-xs">
            {loadingAssessment ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading factor contributions...
              </div>
            ) : caseAssessment ? (
              <>
                <div className="bg-[#15182D] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Review Priority Level:</span>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {caseAssessment.reviewPriorityLabel || `${caseAssessment.riskLevel} Tier`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black px-3.5 py-1 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/30">
                      {caseAssessment.totalScore} / 100
                    </span>
                    <button
                      onClick={() => handleRecalculate(selectedCase.id)}
                      disabled={recalculating}
                      className="p-2 bg-[#1A1D38] hover:bg-[#252A50] text-slate-300 rounded-xl border border-white/10 transition-colors"
                      title="Recalculate fresh score"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Factors List */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-300 mb-2">
                    Active Factor Contributions & Supporting Evidence:
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {(Array.isArray(caseAssessment.factors) ? caseAssessment.factors : []).map((f: any, idx: number) => (
                      <div key={idx} className="bg-[#15182D] p-3.5 rounded-xl border border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{f.name}</span>
                          <span className="font-mono font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                            +{f.points} pts
                          </span>
                        </div>
                        <p className="text-slate-300"><strong>Evidence:</strong> {f.evidence}</p>
                        {f.evidenceReference && (
                          <p className="text-[10px] font-mono text-slate-400">Ref: {f.evidenceReference}</p>
                        )}
                        {f.explanation && (
                          <p className="text-[11px] text-slate-400 italic bg-[#181C35] p-2 rounded-lg mt-1">
                            Rationale: {f.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Next Actions */}
                {caseAssessment.recommendedNextActions && caseAssessment.recommendedNextActions.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Recommended Officer Actions:</span>
                    </h4>
                    <ul className="space-y-1 text-amber-200 text-[11px]">
                      {caseAssessment.recommendedNextActions.map((act: string, aIdx: number) => (
                        <li key={aIdx} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-bold">→</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400">No assessment data available.</p>
            )}

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Weights Modal (Super Admin) */}
      <Modal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        title="Configure Risk Scoring Factor Weights"
        subtitle="Super Admin configuration of transparent scoring model"
      >
        <form onSubmit={handleSaveWeights} className="space-y-4 text-xs">
          <p className="text-slate-400 leading-relaxed">
            Adjust factor point weights assigned when discrepancies, duplicate collisions, or missing documentation are flagged.
          </p>

          <div className="space-y-3">
            {weights.map(w => (
              <div key={w.key} className="flex items-center justify-between gap-4">
                <label className="text-slate-300 font-medium flex-1 truncate" title={w.description}>
                  {w.description || w.key}
                </label>
                <div className="w-24">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editedWeights[w.key] ?? w.value}
                    onChange={(e) => setEditedWeights({
                      ...editedWeights,
                      [w.key]: parseInt(e.target.value, 10) || 0
                    })}
                    className="w-full px-2.5 py-1.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl font-mono font-bold text-right text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsWeightModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingWeights}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold shadow-md"
            >
              {savingWeights ? 'Saving Weights...' : 'Save Factor Weights'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
