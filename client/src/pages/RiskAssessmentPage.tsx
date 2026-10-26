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
  RefreshCw
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
      success('Configurable factor scoring weights updated successfully');
      setIsWeightModalOpen(false);
      fetchRiskData();
    } catch (err: any) {
      error(err.message || 'Failed to update weights');
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Explainable FDR Risk Scoring Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent composite score (0-100) based on deterministic weights. Avoids blackbox or arbitrary AI decisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setIsWeightModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors w-fit"
            >
              <Sliders className="w-4 h-4" />
              <span>Configure Factor Weights</span>
            </button>
          )}
          <button
            onClick={fetchRiskData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors w-fit"
            title="Refresh Risk Rankings"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legal & Administrative Disclaimer */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-950">Administrative Review-Priority Protocol</p>
          <p className="text-amber-800 mt-0.5 leading-relaxed">
            Composite risk scores (0–100) function strictly as review-priority indicators to schedule officer scrutiny and queue investigative workflows. A high score highlights records with data discrepancies, imminent expiration, or unverified branch records; it does NOT constitute legal proof or an accusation of fraudulent conduct.
          </p>
        </div>
      </div>

      {/* Transparent Model Weights Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-600" />
          Transparent Rule Scoring Model (Deterministic Weighted Factors)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {weights.map(w => (
            <div key={w.key} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-mono block truncate" title={w.key}>
                {w.key.replace('RISK_WEIGHT_', '')}
              </span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">+{w.value} pts</p>
              <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{w.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cases by Risk Rank Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Cases Ranked by Review Priority Index</h3>
            <p className="text-xs text-slate-500">Sorted from critical severity to standard compliant baseline</p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200">
            {fdrs.length} Active Instruments Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Priority Score</th>
                <th className="py-3 px-4">FDR Number</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Issuing Bank</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Risk Tier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Evaluating explainable risk scoring...
                  </td>
                </tr>
              ) : (
                fdrs.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded inline-block ${
                        item.risk_score >= 75 ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                        item.risk_score >= 50 ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                        item.risk_score >= 25 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {item.risk_score} / 100
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      {item.fdr_number}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium truncate max-w-[200px]">
                      {item.institution_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.bank_name}
                    </td>
                    <td className="py-3 px-4">
                      <Badge type="status" value={item.current_status} />
                    </td>
                    <td className="py-3 px-4">
                      <Badge type="risk" value={item.risk_level} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleInspectEvidence(item)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-300 font-semibold text-xs transition-colors"
                        >
                          Factor Breakdown
                        </button>
                        <button
                          onClick={() => navigate(`/fdrs/${item.id}`)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 font-semibold text-xs flex items-center gap-1"
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
              <div className="py-8 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading factor contributions...
              </div>
            ) : caseAssessment ? (
              <>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Review Priority Level:</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {caseAssessment.reviewPriorityLabel || `${caseAssessment.riskLevel} Tier`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black px-3 py-1 bg-blue-100 text-blue-900 rounded border border-blue-300">
                      {caseAssessment.totalScore} / 100
                    </span>
                    <button
                      onClick={() => handleRecalculate(selectedCase.id)}
                      disabled={recalculating}
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-300 transition-colors"
                      title="Recalculate fresh score"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Factors List */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Active Factor Contributions & Supporting Evidence:
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {(Array.isArray(caseAssessment.factors) ? caseAssessment.factors : []).map((f: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{f.name}</span>
                          <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            +{f.points} pts
                          </span>
                        </div>
                        <p className="text-slate-600"><strong>Evidence:</strong> {f.evidence}</p>
                        {f.evidenceReference && (
                          <p className="text-[10px] font-mono text-slate-500">Ref: {f.evidenceReference}</p>
                        )}
                        {f.explanation && (
                          <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded mt-1">
                            Rationale: {f.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Next Actions */}
                {caseAssessment.recommendedNextActions && caseAssessment.recommendedNextActions.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Recommended Officer Actions:</span>
                    </h4>
                    <ul className="space-y-1 text-amber-900 text-[11px]">
                      {caseAssessment.recommendedNextActions.map((act: string, aIdx: number) => (
                        <li key={aIdx} className="flex items-start gap-1.5">
                          <span className="text-amber-700 font-bold">→</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-500">No assessment data available.</p>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs"
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
          <p className="text-slate-500">
            Adjust factor point weights assigned when discrepancies, duplicate collisions, or missing documentation are flagged.
          </p>

          <div className="space-y-3">
            {weights.map(w => (
              <div key={w.key} className="flex items-center justify-between gap-4">
                <label className="text-slate-700 font-medium flex-1 truncate" title={w.description}>
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
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-right text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsWeightModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingWeights}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {savingWeights ? 'Saving Weights...' : 'Save Factor Weights'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
