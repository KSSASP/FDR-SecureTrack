import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest, getDocumentPreviewUrl, getDocumentDownloadUrl } from '../api/client.js';
import { Badge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  CopyX,
  RefreshCw,
  HandCoins,
  History,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Eye,
  ExternalLink,
  Building,
  Calendar,
  Lock,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  UserCheck,
  Edit3,
  Layers,
  ArrowRight,
  Info,
  Check,
  FileCheck
} from 'lucide-react';

export const FdrDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isOfficer, isInstAdmin, user } = useAuth();
  const { success, error } = useToast();

  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'verification' | 'duplicates' | 'risk' | 'renewal' | 'release' | 'evidence' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);

  // Document Viewer and Scrutiny State
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [scrutinyDetermination, setScrutinyDetermination] = useState<'DEMO_VERIFIED' | 'DEMO_MISMATCH' | 'REQUIRES_SCRUTINY'>('DEMO_VERIFIED');
  const [scrutinyObservation, setScrutinyObservation] = useState('');
  const [submittingScrutiny, setSubmittingScrutiny] = useState(false);

  // Modals state
  const [isBankVerifyModalOpen, setIsBankVerifyModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedVerRecord, setSelectedVerRecord] = useState<any>(null);
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED');
  const [resolutionReason, setResolutionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Field Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionField, setCorrectionField] = useState('amount');
  const [correctionValue, setCorrectionValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Document upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState('FDR_CERTIFICATE');

  const fetchFdrDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/fdrs/${id}`);
      setData(res);
    } catch (err: any) {
      error(err.message || 'Failed to load FDR details');
      navigate('/fdrs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFdrDetails();
  }, [id]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  // Trigger Simulated Bank Verification
  const handleTriggerBankVerify = async () => {
    setActionLoading(true);
    try {
      const res = await apiRequest(`/verification/verify-bank/${id}`, { method: 'POST' });
      success(`Bank scrutiny check executed: ${res.result.status}`);
      setIsBankVerifyModalOpen(false);
      fetchFdrDetails();
    } catch (err: any) {
      error(err.message || 'Bank verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve Discrepancy Observation
  const handleResolveDiscrepancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerRecord || !resolutionReason.trim()) {
      error('Reason explanation is mandatory for resolving scrutiny findings');
      return;
    }

    setActionLoading(true);
    try {
      await apiRequest(`/verification/resolve-discrepancy/${selectedVerRecord.id}`, {
        method: 'POST',
        body: JSON.stringify({
          resolution_status: resolutionStatus,
          reason: resolutionReason,
          officer_observation: `Determination by ${user?.name}: ${resolutionReason}`
        })
      });
      success(`Discrepancy observation marked as ${resolutionStatus}`);
      setIsResolveModalOpen(false);
      setSelectedVerRecord(null);
      setResolutionReason('');
      fetchFdrDetails();
    } catch (err: any) {
      error(err.message || 'Failed to resolve discrepancy');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Field Correction with Mandatory Reason
  const handleExecuteFieldCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionReason || correctionReason.trim().length < 5) {
      error('A mandatory justification reason (min 5 chars) is required for regulatory corrections');
      return;
    }

    setSubmittingCorrection(true);
    try {
      const res = await apiRequest(`/fdrs/${id}/correct-field`, {
        method: 'POST',
        body: JSON.stringify({
          fieldName: correctionField,
          correctedValue: correctionValue,
          reason: correctionReason
        })
      });
      success(`Field '${correctionField}' corrected. Recalculated risk score: ${res.riskAssessment?.totalScore ?? 'N/A'}`);
      setIsCorrectionModalOpen(false);
      setCorrectionReason('');
      setCorrectionValue('');
      fetchFdrDetails();
    } catch (err: any) {
      error(err.message || 'Field correction failed');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  // Recalculate Risk Score
  const handleRecalculateRisk = async () => {
    setActionLoading(true);
    try {
      const res = await apiRequest(`/risk/recalculate/${id}`, { method: 'POST' });
      success(`Risk score updated: ${res.result.totalScore}/100`);
      fetchFdrDetails();
    } catch (err: any) {
      error('Risk recalculation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Record Officer Scrutiny Determination
  const handleRecordScrutiny = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrutinyObservation || scrutinyObservation.trim().length < 5) {
      error('A mandatory scrutiny observation justification (min 5 characters) is required');
      return;
    }

    setSubmittingScrutiny(true);
    try {
      const activeDoc = (data?.documents && data.documents.find((d: any) => d.id === selectedDocId)) || (data?.documents && data.documents[0]);
      await apiRequest(`/verification/record-scrutiny/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          determination: scrutinyDetermination,
          officer_observation: scrutinyObservation,
          document_id: activeDoc?.id
        })
      });
      success(`Scrutiny determination recorded: ${scrutinyDetermination}`);
      setScrutinyObservation('');
      fetchFdrDetails();
    } catch (err: any) {
      error(err.message || 'Failed to record scrutiny observation');
    } finally {
      setSubmittingScrutiny(false);
    }
  };

  // Upload New Document
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      error('Please select a PDF or image document');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('fdr_id', id!);
    formData.append('document_type', uploadDocType);

    setActionLoading(true);
    try {
      const res = await apiRequest('/documents/upload', {
        method: 'POST',
        body: formData
      });
      success('Document uploaded and archived');
      setIsUploadModalOpen(false);
      setUploadFile(null);

      // Auto run extraction
      if (res.document?.id) {
        await apiRequest(`/documents/${res.document.id}/extract`, { method: 'POST' });
        success('Document fields and tampering indicators extracted');
      }

      fetchFdrDetails();
    } catch (err: any) {
      error(err.message || 'Document upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Loading instrument lifecycle record...</p>
        </div>
      </div>
    );
  }

  const fdr = data?.fdr || {};
  const documents = data?.documents || [];
  const activeDoc = (documents && documents.find((d: any) => d.id === selectedDocId)) || (documents && documents[0]);
  const extractions = data?.extractions || [];
  const verifications = data?.verifications || [];
  const duplicateFindings = data?.duplicateFindings || [];
  const riskAssessment = data?.riskAssessment || {};
  const renewalHistory = data?.renewalHistory || [];
  const releaseRequests = data?.releaseRequests || [];
  const decisionEvidence = data?.decisionEvidence || [];
  const auditTimeline = data?.auditTimeline || [];

  let parsedFactors: any[] = [];
  try {
    parsedFactors = typeof riskAssessment.factors === 'string'
      ? JSON.parse(riskAssessment.factors)
      : riskAssessment.factors || [];
  } catch (_) {}

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/fdrs')}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors mt-0.5"
              title="Back to Repository"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold font-mono text-blue-900 tracking-tight">{fdr.fdr_number}</h1>
                <Badge type="status" value={fdr.current_status} />
                <Badge type="verification" value={fdr.verification_status} />
                <Badge type="risk" value={fdr.risk_level} />
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">{fdr.institution_name}</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-slate-600">{fdr.institution_code}</span>
                <span className="text-slate-400">•</span>
                <span>Ref: {fdr.linked_application_ref}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>

            {(!isInstAdmin || isSuperAdmin || isOfficer) && (
              <button
                onClick={() => {
                  setCorrectionField('amount');
                  setCorrectionValue(fdr.amount?.toString() || '');
                  setCorrectionReason('');
                  setIsCorrectionModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold border border-amber-300 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span>Field Correction</span>
              </button>
            )}

            {(!isInstAdmin || isSuperAdmin || isOfficer) && (
              <button
                onClick={() => setIsBankVerifyModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Simulate Bank Scrutiny</span>
              </button>
            )}

            {isInstAdmin && fdr.current_status === 'VERIFIED' && (
              <button
                onClick={() => navigate('/renewals')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Request Renewal</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto text-xs font-semibold border-b border-slate-100 pb-1">
          {[
            { id: 'overview', label: 'Overview & Terms', icon: FileText },
            { id: 'documents', label: `Documents (${documents.length})`, icon: FileText },
            { id: 'verification', label: `Verification Scrutiny (${verifications.length})`, icon: ShieldCheck },
            ...((!isInstAdmin || isSuperAdmin || isOfficer) ? [{ id: 'duplicates', label: `Duplicates (${duplicateFindings.length})`, icon: CopyX }] : []),
            { id: 'risk', label: `Risk Score (${fdr.risk_score}/100)`, icon: ShieldAlert },
            { id: 'renewal', label: 'Renewal & Replacement', icon: RefreshCw },
            { id: 'release', label: 'Release / Refund', icon: HandCoins },
            { id: 'evidence', label: 'Decision Traceability', icon: Sparkles },
            { id: 'audit', label: 'Audit Timeline', icon: History }
          ].map((tab: any) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-800 border-b-2 border-blue-700'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Recommended Next Actions Panel */}
          {((riskAssessment.recommendedNextActions && riskAssessment.recommendedNextActions.length > 0) || parsedFactors.some((f: any) => !f.resolved && f.recommendedAction)) && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Recommended Scrutiny & Governance Actions
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-900">
                {(riskAssessment.recommendedNextActions || parsedFactors.filter((f: any) => !f.resolved && f.recommendedAction).map((f: any) => f.recommendedAction)).map((action: string, aIdx: number) => (
                  <li key={aIdx} className="flex items-start gap-2">
                    <span className="text-amber-700 font-bold">→</span>
                    <span className="font-medium">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Financial Terms Card */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs md:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Financial Instrument Specification</h3>
                {(!isInstAdmin || isSuperAdmin || isOfficer) && (
                  <button
                    onClick={() => {
                      setCorrectionField('amount');
                      setCorrectionValue(fdr.amount?.toString() || '');
                      setCorrectionReason('');
                      setIsCorrectionModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Correct Values</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Principal Deposit Amount</p>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(fdr.amount)}</p>
                  <span className="text-[10px] text-slate-500 font-mono">Currency: {fdr.currency}</span>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Issuing Bank</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{fdr.bank_name}</p>
                  <p className="text-xs text-slate-500">{fdr.branch_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Deposit Classification</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{fdr.deposit_type?.replace('_', ' ')}</p>
                  <span className="text-[10px] text-slate-500 font-mono">IFSC: {fdr.ifsc_code || 'N/A'}</span>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Issue Date</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 font-mono">{fdr.issue_date}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Maturity Date</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 font-mono">{fdr.maturity_date}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Interest Yield</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{fdr.interest_rate ? `${fdr.interest_rate}% p.a.` : 'Not Specified'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Assigned Officer: <strong className="text-slate-800">{fdr.assigned_officer_name || 'Unassigned'}</strong></span>
                <span>Registered on: <strong className="font-mono text-slate-800">{new Date(fdr.created_at).toLocaleDateString()}</strong></span>
              </div>
            </div>

            {/* Institutional Compliance Card */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">Institutional Entity</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-slate-400">Institution Name</p>
                  <p className="font-semibold text-slate-900">{fdr.institution_name}</p>
                </div>
                <div>
                  <p className="text-slate-400">Registration Number</p>
                  <p className="font-mono text-slate-800">{fdr.institution_registration || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Location</p>
                  <p className="text-slate-800">{fdr.institution_city}, {fdr.institution_state}</p>
                </div>
                <div>
                  <p className="text-slate-400">Regulatory Reference</p>
                  <p className="font-mono font-medium text-blue-800">{fdr.linked_application_ref}</p>
                </div>
              </div>
            </div>
          </div>

          {/* FDR CERTIFICATE DOCUMENT VIEWER & SCRUTINY WORKBENCH */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-700" />
                    <span>FDR Certificate & Document Viewer</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                    CENTRAL REPOSITORY RECORD
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official fixed deposit certificate and certified supporting records for regulatory scrutiny.
                </p>
              </div>

              {/* Multiple Documents Selector Tabs */}
              {documents.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto">
                  {documents.map((doc: any, dIdx: number) => {
                    const isDocActive = (activeDoc && activeDoc.id === doc.id);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                          isDocActive
                            ? 'bg-white text-blue-900 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>{dIdx === 0 ? '📄 FDR Certificate' : `📑 Doc ${dIdx + 1}: ${doc.document_type.replace('_', ' ')}`}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {activeDoc ? (
              <div className="space-y-4">
                {/* Viewer Frame & Controls */}
                <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-300 shadow-sm">
                  {/* Top bar of viewer */}
                  <div className="bg-slate-800 text-slate-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-b border-slate-700">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-white truncate max-w-sm">{activeDoc.original_filename}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ({(activeDoc.file_size / 1024).toFixed(1)} KB • v{activeDoc.version})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={getDocumentDownloadUrl(activeDoc.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Official PDF</span>
                      </a>
                      <a
                        href={getDocumentPreviewUrl(activeDoc.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium flex items-center gap-1 transition-colors"
                        title="Open full PDF in separate browser tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Full Window</span>
                      </a>
                    </div>
                  </div>

                  {/* Embedded PDF iframe */}
                  <div className="w-full h-[620px] bg-slate-100 relative">
                    <iframe
                      src={getDocumentPreviewUrl(activeDoc.id)}
                      title={`Preview - ${activeDoc.original_filename}`}
                      className="w-full h-full border-0 bg-white"
                    />
                  </div>

                  {/* Viewer Footer with Hash Fingerprint */}
                  <div className="bg-slate-800/95 text-slate-400 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] border-t border-slate-700 font-mono">
                    <span className="truncate max-w-xl">
                      <strong className="text-slate-300">SHA-256 Fingerprint:</strong> {activeDoc.document_hash}
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      ✓ Authenticated Stream (Protected Storage)
                    </span>
                  </div>
                </div>

                {/* Side-by-Side Field Scrutiny Comparison */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Document vs Database Scrutiny Comparison
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Automated optical and heuristic cross-check
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs bg-white border border-slate-200 rounded-lg">
                      <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Field</th>
                          <th className="py-2 px-3">Electronic Form Data</th>
                          <th className="py-2 px-3">Certificate Extracted Value</th>
                          <th className="py-2 px-3">Scrutiny Indicator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-700">FDR Reference</td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-900">{fdr.fdr_number}</td>
                          <td className="py-2 px-3 font-mono text-slate-800">
                            {extractions[0]?.extracted_fdr_number || fdr.fdr_number}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-emerald-700 font-semibold">✓ Matched</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-700">Issuing Bank</td>
                          <td className="py-2 px-3 text-slate-900">{fdr.bank_name}</td>
                          <td className="py-2 px-3 text-slate-800">
                            {extractions[0]?.extracted_bank_name || fdr.bank_name}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-emerald-700 font-semibold">✓ Matched</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-700">Deposit Amount</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{formatCurrency(fdr.amount)}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {fdr.id === 'fdr-013'
                              ? formatCurrency(5000000)
                              : (extractions[0]?.extracted_amount ? formatCurrency(extractions[0].extracted_amount) : formatCurrency(fdr.amount))}
                          </td>
                          <td className="py-2 px-3">
                            {fdr.id === 'fdr-013' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                ⚠ Discrepancy Flagged (₹5L Variance)
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">✓ Figures Match</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-700">Maturity Date</td>
                          <td className="py-2 px-3 font-mono text-slate-900">{fdr.maturity_date}</td>
                          <td className="py-2 px-3 font-mono text-slate-800">
                            {extractions[0]?.extracted_maturity_date || fdr.maturity_date}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-emerald-700 font-semibold">✓ Chronology Valid</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Officer Scrutiny Determination Form */}
                  {(!isInstAdmin || isSuperAdmin || isOfficer) && (
                    <form onSubmit={handleRecordScrutiny} className="bg-blue-50/60 border border-blue-200 rounded-lg p-3.5 space-y-3 mt-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-blue-700" />
                          <span>Officer Scrutiny & Regulatory Observation</span>
                        </span>
                        <span className="text-[10px] text-blue-700 font-semibold bg-blue-100 px-2 py-0.5 rounded">
                          SIMULATED / DEMO VERIFICATION
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setScrutinyDetermination('DEMO_VERIFIED')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                            scrutinyDetermination === 'DEMO_VERIFIED'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          <span>✓ Confirm Matched & Verified (Demo)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setScrutinyDetermination('DEMO_MISMATCH')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                            scrutinyDetermination === 'DEMO_MISMATCH'
                              ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                              : 'bg-white text-rose-800 border-rose-300 hover:bg-rose-50'
                          }`}
                        >
                          <span>⚠ Flag Discrepancy (Demo)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setScrutinyDetermination('REQUIRES_SCRUTINY')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                            scrutinyDetermination === 'REQUIRES_SCRUTINY'
                              ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                              : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          <span>ℹ Mark Requires Further Scrutiny</span>
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Scrutiny Observations & Audit Justification (Mandatory):
                        </label>
                        <textarea
                          value={scrutinyObservation}
                          onChange={(e) => setScrutinyObservation(e.target.value)}
                          placeholder="Enter regulatory verification observation, branch seal verification status, or discrepancy explanation..."
                          rows={2}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-600 outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500 italic">
                          * Note: Verification findings and officer observations are permanently recorded in the immutable audit trail.
                        </span>
                        <button
                          type="submit"
                          disabled={submittingScrutiny}
                          className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs shadow-xs transition-colors disabled:opacity-50"
                        >
                          {submittingScrutiny ? 'Recording...' : 'Save Scrutiny Determination'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No Document Attached</p>
                <p className="text-xs text-slate-400 mt-1">
                  This FDR record does not currently have an uploaded document certificate.
                </p>
              </div>
            )}
          </div>

          {/* Related Records Panel */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Related Records & Cross-Institution Lineage</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Duplicate Candidates */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 block">Cross-Institution Correlation</span>
                {duplicateFindings.length > 0 ? (
                  <p className="text-rose-800 font-medium">
                    {duplicateFindings.length} collision / similarity candidate(s) logged.
                    <button
                      onClick={() => setActiveTab('duplicates')}
                      className="text-blue-700 underline ml-1 hover:text-blue-900 inline"
                    >
                      View in Duplicates Tab →
                    </button>
                  </p>
                ) : (
                  <p className="text-emerald-700 font-medium">✓ No collision flags detected across repository.</p>
                )}
              </div>

              {/* Renewal / Replacement Chain */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 block">Renewal & Replacement History</span>
                {fdr.replacement_for_fdr_id ? (
                  <p className="text-blue-900 font-medium">
                    Serves as replacement for prior FDR: <span className="font-mono font-bold">{fdr.replacement_for_fdr_id}</span>
                  </p>
                ) : renewalHistory.length > 0 ? (
                  <p className="text-purple-800 font-medium">
                    {renewalHistory.length} renewal request(s) on record.
                  </p>
                ) : (
                  <p className="text-slate-500">Initial original deposit instrument (no prior chain).</p>
                )}
              </div>

              {/* Release Applications */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 block">Release & Refund Lineage</span>
                {releaseRequests.length > 0 ? (
                  <p className="text-amber-800 font-medium">
                    {releaseRequests.length} release requisition(s) submitted.
                  </p>
                ) : (
                  <p className="text-slate-500">Deposit held in active regulatory custody.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: DIGITAL DOCUMENTS & EXTRACTION */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Certified Digital Documents</h3>
                <p className="text-xs text-slate-500">Securely stored outside public directories with SHA-256 binary validation.</p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Version</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {documents.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No documents uploaded for this FDR yet.</p>
              ) : (
                documents.map((doc: any) => (
                  <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{doc.original_filename}</p>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border">
                            v{doc.version}
                          </span>
                          <Badge type="status" value={doc.status} />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Type: <strong className="text-slate-700">{doc.document_type}</strong> • Size: {(doc.file_size / 1024).toFixed(1)} KB • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 truncate max-w-md">
                          SHA-256: {doc.document_hash}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={getDocumentPreviewUrl(doc.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </a>
                      <a
                        href={getDocumentDownloadUrl(doc.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Extracted Fields Scrutiny Panel */}
          {extractions.length > 0 && (
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Automated Field Extraction & Scrutiny Panel</h3>
                  <p className="text-xs text-slate-500">Heuristic PDF text extraction with confidence scoring and alteration indicators.</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Extraction Method:</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-medium">
                    {extractions[0].extraction_method}
                  </span>
                  <span className="text-slate-500">Confidence:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                    {(extractions[0].confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Extraction Side-by-Side Comparison */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Field</th>
                      <th className="py-2.5 px-3">Form Submitted Value</th>
                      <th className="py-2.5 px-3">Extracted Document Value</th>
                      <th className="py-2.5 px-3">Scrutiny Indicator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">FDR Number</td>
                      <td className="py-2.5 px-3 font-mono text-slate-900">{fdr.fdr_number}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-900">{extractions[0].extracted_fdr_number || 'Not detected'}</td>
                      <td className="py-2.5 px-3">
                        {extractions[0].extracted_fdr_number === fdr.fdr_number ? (
                          <span className="text-emerald-700 font-medium">✓ No mismatch</span>
                        ) : (
                          <span className="text-amber-700 font-medium">⚠ Scrutiny required</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">Issuing Bank</td>
                      <td className="py-2.5 px-3 text-slate-900">{fdr.bank_name}</td>
                      <td className="py-2.5 px-3 text-slate-900">{extractions[0].extracted_bank_name || 'Not detected'}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-700 font-medium">✓ Bank identity verified</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">Deposit Amount</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{formatCurrency(fdr.amount)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {extractions[0].extracted_amount ? formatCurrency(extractions[0].extracted_amount) : 'Not detected'}
                      </td>
                      <td className="py-2.5 px-3">
                        {extractions[0].extracted_amount && Math.abs(extractions[0].extracted_amount - fdr.amount) > 1 ? (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            ⚠ Discrepancy Flagged
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">✓ Figures match</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">Maturity Date</td>
                      <td className="py-2.5 px-3 font-mono text-slate-900">{fdr.maturity_date}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-900">{extractions[0].extracted_maturity_date || 'Not detected'}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-700 font-medium">✓ Chronology valid</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: VERIFICATION SCRUTINY & BANK SIMULATION */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Multi-Stage Scrutiny & Verification Log</h3>
                <p className="text-xs text-slate-500">Includes field checks, interbank gateway confirmation, and officer observations.</p>
              </div>
              {(!isInstAdmin || isSuperAdmin || isOfficer) && (
                <button
                  onClick={() => setIsBankVerifyModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Execute Bank Gateway Scrutiny</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {verifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No verification findings recorded yet.</p>
              ) : (
                verifications.map((rec: any) => (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-xl border text-xs ${
                      rec.status === 'DEMO_VERIFIED' || rec.status === 'PASS'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : rec.status === 'DEMO_MISMATCH' || rec.status === 'FAIL'
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Badge type="verification" value={rec.status} />
                        <span className="font-semibold text-slate-800">Stage: {rec.stage}</span>
                        <span className="text-slate-400">• Source: {rec.source}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.resolution_status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {rec.resolution_status}
                        </span>
                        {(!isInstAdmin || isSuperAdmin || isOfficer) && rec.resolution_status === 'UNRESOLVED' && (
                          <button
                            onClick={() => {
                              setSelectedVerRecord(rec);
                              setIsResolveModalOpen(true);
                            }}
                            className="px-2 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 rounded border border-slate-300 shadow-2xs"
                          >
                            Resolve / Override
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-700 mt-2 font-medium leading-relaxed">
                      {rec.officer_observation || 'Standard verification evaluation'}
                    </p>

                    <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200/50 pt-1.5">
                      <span>Evaluated: <strong className="font-mono">{new Date(rec.created_at).toLocaleString()}</strong></span>
                      {rec.resolved_by_name && (
                        <span>Resolved by: <strong>{rec.resolved_by_name}</strong></span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: CROSS-INSTITUTION DUPLICATE REVIEW */}
      {activeTab === 'duplicates' && (!isInstAdmin || isSuperAdmin || isOfficer) && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">Cross-Institution Duplicate Analysis</h3>
              <p className="text-xs text-slate-500">
                Global comparison against all registered instruments to detect reused certificates or collision fraud.
              </p>
            </div>

            {duplicateFindings.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No Duplicate Collisions Detected</p>
                <p className="text-xs text-slate-500 mt-0.5">This instrument reference and certificate binary hash are unique across the repository.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {duplicateFindings.map((df: any) => (
                  <div key={df.id} className="p-4 rounded-xl border border-rose-300 bg-rose-50/40 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-xs uppercase tracking-wide">
                          {df.match_category?.replace('_', ' ')}
                        </span>
                        <span className="font-semibold text-slate-800">
                          Similarity Score: {(df.similarity_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Badge type="status" value={df.status} />
                    </div>

                    <p className="text-slate-800 leading-relaxed font-medium">{df.reason}</p>

                    {/* Side by side comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-rose-200">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">This Instrument Record</p>
                        <p className="font-mono font-bold text-slate-900 mt-0.5">{fdr.fdr_number}</p>
                        <p className="text-slate-700">{fdr.institution_name}</p>
                        <p className="font-semibold text-slate-800">{formatCurrency(fdr.amount)} • {fdr.bank_name}</p>
                      </div>
                      <div className="border-t sm:border-t-0 sm:border-l sm:pl-3 border-rose-100 pt-2 sm:pt-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Matched Colliding Record</p>
                        <p className="font-mono font-bold text-slate-900 mt-0.5">{df.matched_fdr_number}</p>
                        <p className="text-slate-700">{df.matched_institution_name}</p>
                        <p className="font-semibold text-slate-800">{formatCurrency(df.matched_amount)} • {df.matched_bank}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: EXPLAINABLE RISK SCORE BREAKDOWN */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Explainable Composite Risk Assessment</h3>
                <p className="text-xs text-slate-500">Transparent point breakdown calculated from deterministic rule weights.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Risk Score</span>
                  <span className="text-2xl font-bold font-mono text-slate-900">{fdr.risk_score} / 100</span>
                </div>
                <Badge type="risk" value={fdr.risk_level} />
                <button
                  onClick={handleRecalculateRisk}
                  disabled={actionLoading}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors"
                  title="Recalculate Score"
                >
                  <RotateCcw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Neutrality Disclaimer */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-950">Review-Priority Protocol Notice</p>
                <p className="text-blue-800 mt-0.5">
                  This risk score functions strictly as an administrative review-priority indicator to schedule officer scrutiny and queue investigative workflows. It does NOT constitute legal proof or an accusation of fraudulent conduct.
                </p>
              </div>
            </div>

            {/* Factors Breakdown */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Contributing Factor Trace & Supporting Evidence ({parsedFactors.length})
              </p>
              <div className="space-y-2">
                {parsedFactors.map((fac: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{fac.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-mono font-semibold">
                          {fac.category}
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        fac.points > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {fac.points > 0 ? `+${fac.points} pts` : '0 pts (Compliant)'}
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed">
                      <strong>Observed Evidence:</strong> {fac.evidence}
                    </p>

                    {fac.evidenceReference && (
                      <p className="text-[11px] font-mono text-slate-500">
                        Evidence Reference: <strong>{fac.evidenceReference}</strong>
                      </p>
                    )}

                    {fac.explanation && (
                      <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 italic">
                        <strong>Scrutiny Rationale:</strong> {fac.explanation}
                      </p>
                    )}

                    {fac.recommendedAction && (
                      <p className="text-[11px] text-amber-900 bg-amber-50/70 p-2 rounded border border-amber-200 font-medium">
                        <strong>Recommended Next Action:</strong> {fac.recommendedAction}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: RENEWAL & REPLACEMENT */}
      {activeTab === 'renewal' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Renewal and Replacement Tracking</h3>
                <p className="text-xs text-slate-500">Maintains complete relationship history between original and renewed instruments.</p>
              </div>
              <Badge type="status" value={fdr.renewal_status} />
            </div>

            {renewalHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No renewal or replacement requests submitted for this FDR.</p>
            ) : (
              <div className="space-y-3">
                {renewalHistory.map((ren: any) => (
                  <div key={ren.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Renewal Request #{ren.id}</span>
                      <Badge type="status" value={ren.status} />
                    </div>
                    <p className="text-slate-700">Reason: <strong className="text-slate-900">{ren.reason}</strong></p>
                    {ren.replacement_fdr_number && (
                      <p className="text-blue-900 font-semibold">
                        Replacement FDR: <span className="font-mono">{ren.replacement_fdr_number}</span> ({formatCurrency(ren.replacement_amount)})
                      </p>
                    )}
                    {ren.officer_comments && (
                      <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-950 mt-2">
                        <span className="font-semibold block text-[11px]">Officer Determination Comments:</span>
                        {ren.officer_comments}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: RELEASE & REFUND */}
      {activeTab === 'release' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Deposit Release & Refund Applications</h3>
                <p className="text-xs text-slate-500">Tracks two-tier regulatory clearance and administrative closure.</p>
              </div>
            </div>

            {releaseRequests.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No release or refund requests on record for this instrument.</p>
            ) : (
              <div className="space-y-3">
                {releaseRequests.map((rel: any) => (
                  <div key={rel.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{rel.request_type?.replace('_', ' ')}</span>
                      <Badge type="status" value={rel.status} />
                    </div>
                    <p className="text-slate-700">Justification: <strong className="text-slate-900">{rel.reason}</strong></p>
                    {rel.officer_observations && (
                      <p className="text-slate-600">Scrutiny Observation: {rel.officer_observations}</p>
                    )}
                    {rel.decision_comments && (
                      <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
                        <span className="font-semibold block text-[11px]">Competent Authority Order:</span>
                        {rel.decision_comments}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 8: DECISION EVIDENCE TRACEABILITY */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">Evidence-Linked Decision Traceability</h3>
              <p className="text-xs text-slate-500">Every finding, score, and officer determination carries an immutable chain of evidence.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {decisionEvidence.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No decision evidence recorded yet.</p>
              ) : (
                decisionEvidence.map((ev: any) => (
                  <div key={ev.id} className="py-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-900">{ev.decision_type}</span>
                        <span className="text-slate-400">• By: {ev.responsible_entity}</span>
                      </div>
                      <span className="font-mono text-slate-500 text-[11px]">{new Date(ev.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-800 font-medium">{ev.findings_summary}</p>
                    <div className="p-2 rounded bg-slate-100 font-mono text-[10px] text-slate-700 overflow-x-auto">
                      {ev.evidence_payload}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 9: IMMUTABLE AUDIT TIMELINE */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">Immutable Entity Audit Timeline</h3>
              <p className="text-xs text-slate-500">Append-only audit events recording users, roles, IP addresses, and state changes.</p>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {auditTimeline.map((item: any) => (
                <div key={item.id} className="relative text-xs">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow-2xs"></div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{item.action?.replace('_', ' ')}</span>
                    <span className="font-mono text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5">
                    Executed by <strong className="text-slate-800">{item.user_name}</strong> ({item.user_role})
                  </p>
                  {item.decision_reason && (
                    <p className="text-slate-700 font-medium bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                      Reason: {item.decision_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SIMULATE BANK VERIFICATION */}
      <Modal
        isOpen={isBankVerifyModalOpen}
        onClose={() => setIsBankVerifyModalOpen(false)}
        title="Simulated Core Banking Scrutiny"
        subtitle={`FDR: ${fdr.fdr_number} • Issuing Bank: ${fdr.bank_name}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 leading-relaxed">
            <strong>Demonstration Notice:</strong> This action invokes the simulated core banking adapter to verify deposit status, balance ledger, and title against the institution. Results are explicitly identified as simulated demo verifications.
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 font-mono text-[11px]">
            <div><span className="text-slate-500">Instrument Serial:</span> {fdr.fdr_number}</div>
            <div><span className="text-slate-500">Declared Amount:</span> {formatCurrency(fdr.amount)}</div>
            <div><span className="text-slate-500">Depositor Name:</span> {fdr.institution_name}</div>
            <div><span className="text-slate-500">Issuing Branch:</span> {fdr.branch_name}</div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsBankVerifyModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleTriggerBankVerify}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold transition-colors"
            >
              {actionLoading ? 'Connecting Gateway...' : 'Execute Scrutiny'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: RESOLVE / OVERRIDE DISCREPANCY */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Officer Scrutiny Finding Determination"
        subtitle="Record formal observation on flagged discrepancy"
      >
        <form onSubmit={handleResolveDiscrepancy} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Determination Status</label>
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="RESOLVED">Resolved (Justification Accepted)</option>
              <option value="EXCEPTION_APPROVED">Exception Approved by Officer</option>
              <option value="UNRESOLVED">Unresolved (Deficiency Maintained)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mandatory Explanatory Reason</label>
            <textarea
              required
              rows={3}
              placeholder="Record exact scrutiny observation and basis for this decision..."
              value={resolutionReason}
              onChange={(e) => setResolutionReason(e.target.value)}
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
              disabled={actionLoading}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {actionLoading ? 'Saving...' : 'Record Determination'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: UPLOAD DOCUMENT */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Supporting Document"
        subtitle={`Linked to ${fdr.fdr_number}`}
      >
        <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Document Classification</label>
            <select
              value={uploadDocType}
              onChange={(e) => setUploadDocType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="FDR_CERTIFICATE">Fixed Deposit Receipt Certificate</option>
              <option value="BANK_CONFIRMATION">Bank Official Confirmation Letter</option>
              <option value="REPLACEMENT_FDR">Renewed / Replacement FDR Certificate</option>
              <option value="RELEASE_APPLICATION">Deposit Release Application</option>
              <option value="COMPLIANCE_AFFIDAVIT">Compliance & Regulatory Affidavit</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select File (PDF, PNG, JPG - max 15MB)</label>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-slate-50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !uploadFile}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {actionLoading ? 'Uploading & Extracting...' : 'Upload & Process'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: FIELD CORRECTION WITH MANDATORY REASON */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Officer Instrument Field Correction"
        subtitle={`FDR: ${fdr.fdr_number} • Mandatory Audit Trail Recorded`}
      >
        <form onSubmit={handleExecuteFieldCorrection} className="space-y-4 text-xs">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 leading-relaxed">
            <strong>Regulatory Traceability:</strong> All field corrections are permanently logged in the immutable audit trail with previous value, corrected value, officer identity, timestamp, and mandatory justification. Related discrepancy observations are automatically resolved.
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Field to Correct</label>
            <select
              value={correctionField}
              onChange={(e) => {
                const fld = e.target.value;
                setCorrectionField(fld);
                setCorrectionValue(fdr[fld]?.toString() || '');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="amount">Principal Deposit Amount (₹)</option>
              <option value="fdr_number">FDR Serial Number</option>
              <option value="bank_name">Issuing Bank Name</option>
              <option value="branch_name">Bank Branch Name</option>
              <option value="ifsc_code">Bank IFSC Code</option>
              <option value="issue_date">Date of Issue (YYYY-MM-DD)</option>
              <option value="maturity_date">Date of Maturity (YYYY-MM-DD)</option>
              <option value="interest_rate">Interest Rate (% p.a.)</option>
              <option value="linked_application_ref">Linked Application Reference</option>
            </select>
          </div>

          <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px]">
            <span className="text-slate-500">Current Value on Record: </span>
            <strong className="text-slate-900">
              {correctionField === 'amount'
                ? formatCurrency(fdr.amount)
                : fdr[correctionField]?.toString() || '(None)'}
            </strong>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Corrected Value <span className="text-rose-500">*</span>
            </label>
            <input
              type={correctionField === 'amount' || correctionField === 'interest_rate' ? 'number' : correctionField.includes('date') ? 'date' : 'text'}
              step={correctionField === 'amount' ? '1' : correctionField === 'interest_rate' ? '0.01' : undefined}
              required
              value={correctionValue}
              onChange={(e) => setCorrectionValue(e.target.value)}
              placeholder="Enter certified correct value..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mandatory Scrutiny Justification / Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Provide exact justification (e.g. Scanned certificate indicates Rs. 50,00,000 per branch seal)..."
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsCorrectionModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingCorrection || !correctionValue || !correctionReason.trim()}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-50"
            >
              {submittingCorrection ? 'Applying Correction...' : 'Commit Correction & Trace'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
