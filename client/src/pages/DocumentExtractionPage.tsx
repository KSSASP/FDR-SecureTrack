import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Badge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import { useToast } from '../context/ToastContext.js';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Download,
  RotateCw,
  Search,
  ExternalLink,
  Layers
} from 'lucide-react';

export const DocumentExtractionPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [fdrs, setFdrs] = useState<any[]>([]);
  const [selectedFdrId, setSelectedFdrId] = useState('');
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('FDR_CERTIFICATE');
  const [uploading, setUploading] = useState(false);

  // Selected FDR details
  const [selectedFdrData, setSelectedFdrData] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    apiRequest<{ data: any[] }>('/fdrs?limit=50')
      .then(res => {
        setFdrs(res.data || []);
        if (res.data.length > 0) {
          setSelectedFdrId(res.data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedFdrId) {
      apiRequest(`/fdrs/${selectedFdrId}`)
        .then(res => setSelectedFdrData(res))
        .catch(() => {});
    }
  }, [selectedFdrId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedFdrId) {
      error('Please select file and target FDR');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('fdr_id', selectedFdrId);
    formData.append('document_type', docType);

    setUploading(true);
    try {
      const res = await apiRequest('/documents/upload', {
        method: 'POST',
        body: formData
      });
      success('Document uploaded successfully');
      setIsUploadModalOpen(false);
      setUploadFile(null);

      // Trigger automatic extraction
      if (res.document?.id) {
        await apiRequest(`/documents/${res.document.id}/extract`, { method: 'POST' });
        success('Document text and candidate fields extracted');
      }

      // Refresh current FDR
      const updated = await apiRequest(`/fdrs/${selectedFdrId}`);
      setSelectedFdrData(updated);
    } catch (err: any) {
      error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleExtractDoc = async (docId: string) => {
    setExtracting(true);
    try {
      const res = await apiRequest(`/documents/${docId}/extract`, { method: 'POST' });
      success('Extraction complete');
      const updated = await apiRequest(`/fdrs/${selectedFdrId}`);
      setSelectedFdrData(updated);
    } catch (err: any) {
      error(err.message || 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirmExtraction = async (docId: string, fields: any) => {
    try {
      await apiRequest(`/documents/${docId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          fdr_number: fields.extracted_fdr_number,
          bank_name: fields.extracted_bank_name,
          branch_name: fields.extracted_branch,
          amount: fields.extracted_amount,
          issue_date: fields.extracted_issue_date,
          maturity_date: fields.extracted_maturity_date,
          interest_rate: fields.extracted_interest_rate
        })
      });
      success('Extracted fields confirmed and synchronized to official FDR record');
      const updated = await apiRequest(`/fdrs/${selectedFdrId}`);
      setSelectedFdrData(updated);
    } catch (err: any) {
      error(err.message || 'Confirmation failed');
    }
  };

  const fdr = selectedFdrData?.fdr;
  const docs = selectedFdrData?.documents || [];
  const extractions = selectedFdrData?.extractions || [];

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">DOCUMENT INTELLIGENCE</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Digital Document Extraction & Tampering Analysis</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            OCR/PDF parsing, field normalization, and side-by-side alteration indicator scrutiny.
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/25 transition-all w-fit"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Target FDR Selector */}
      <div className="bg-[#121528] rounded-2xl p-4 sm:p-5 border border-white/5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <label className="font-semibold text-slate-300 whitespace-nowrap">Select Case Record:</label>
          <select
            value={selectedFdrId}
            onChange={(e) => setSelectedFdrId(e.target.value)}
            className="px-3.5 py-2 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-rose-500 max-w-md truncate"
          >
            {fdrs.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.fdr_number} • {item.institution_name} ({item.bank_name})
              </option>
            ))}
          </select>
        </div>

        {fdr && (
          <button
            onClick={() => navigate(`/fdrs/${fdr.id}`)}
            className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <span>Open Complete Case File</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Documents & Extractions Review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List */}
        <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider border-b border-white/5 pb-2.5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-400" />
            <span>Archived Documents ({docs.length})</span>
          </h3>
          <div className="space-y-3">
            {docs.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No documents uploaded for this case yet.</p>
            ) : (
              docs.map((d: any) => (
                <div key={d.id} className="p-3.5 rounded-xl border border-white/5 bg-[#15182D] text-xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white truncate max-w-[180px]">{d.original_filename}</p>
                      <p className="text-[11px] text-slate-400">{d.document_type} • v{d.version}</p>
                    </div>
                    <Badge type="status" value={d.status} />
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleExtractDoc(d.id)}
                      disabled={extracting}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Extract</span>
                    </button>
                    <a
                      href={`/api/documents/${d.id}/preview`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-[#1A1D38] text-slate-300 hover:bg-[#252A50] border border-white/10 text-[11px] transition-colors"
                    >
                      Preview
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Extraction Findings & Side-by-Side Review */}
        <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3.5">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Extraction & Tampering Scrutiny</h3>
              <p className="text-xs text-slate-400 mt-0.5">Compares certified document values against the official repository submission.</p>
            </div>
            {extractions.length > 0 && (
              <button
                onClick={() => handleConfirmExtraction(extractions[0].document_id, extractions[0])}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md self-start sm:self-auto"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Official Values</span>
              </button>
            )}
          </div>

          {extractions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-white">No Document Extractions Yet</p>
              <p className="text-xs text-slate-500 mt-0.5">Upload a certificate or click "Extract" to parse text and detect alteration flags.</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Tampering Indicator Alerts */}
              {extractions[0].tampering_indicators && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Integrity Indicators</p>
                  {(() => {
                    try {
                      const indicators = JSON.parse(extractions[0].tampering_indicators);
                      return indicators.map((ind: any, iIdx: number) => (
                        <div
                          key={iIdx}
                          className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                            ind.severity === 'CRITICAL'
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                              : ind.severity === 'WARNING'
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{ind.label}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/40 border border-white/10">
                                Field: {ind.field}
                              </span>
                            </div>
                            <p className="mt-1 leading-relaxed text-slate-200">{ind.indicator}</p>
                            <p className="text-[11px] opacity-80 mt-1 font-normal">{ind.explanation}</p>
                          </div>
                        </div>
                      ));
                    } catch (_) {
                      return null;
                    }
                  })()}
                </div>
              )}

              {/* Side-by-side Fields Table */}
              <div>
                <p className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-2">Detailed Field Comparison</p>
                <div className="overflow-x-auto border border-white/5 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0E1020] text-slate-400 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-3.5">Field</th>
                        <th className="py-3 px-3.5">Repository Submitted Value</th>
                        <th className="py-3 px-3.5">Extracted Document Value</th>
                        <th className="py-3 px-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-[#15182D]">
                      <tr>
                        <td className="py-3 px-3.5 font-semibold text-slate-300">FDR Number</td>
                        <td className="py-3 px-3.5 font-mono font-bold text-rose-300">{fdr?.fdr_number}</td>
                        <td className="py-3 px-3.5 font-mono text-white">{extractions[0].extracted_fdr_number || 'N/A'}</td>
                        <td className="py-3 px-3.5 text-emerald-400 font-medium">Match</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3.5 font-semibold text-slate-300">Bank Name</td>
                        <td className="py-3 px-3.5 text-white">{fdr?.bank_name}</td>
                        <td className="py-3 px-3.5 text-white">{extractions[0].extracted_bank_name || 'N/A'}</td>
                        <td className="py-3 px-3.5 text-emerald-400 font-medium">Match</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3.5 font-semibold text-slate-300">Principal Amount</td>
                        <td className="py-3 px-3.5 font-bold text-white font-mono">{fdr ? `₹${fdr.amount?.toLocaleString('en-IN')}` : ''}</td>
                        <td className="py-3 px-3.5 font-bold text-white font-mono">
                          {extractions[0].extracted_amount ? `₹${extractions[0].extracted_amount?.toLocaleString('en-IN')}` : 'N/A'}
                        </td>
                        <td className="py-3 px-3.5">
                          {extractions[0].extracted_amount && Math.abs(extractions[0].extracted_amount - fdr?.amount) > 1 ? (
                            <span className="text-rose-400 font-bold">MISMATCH</span>
                          ) : (
                            <span className="text-emerald-400 font-medium">Match</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3.5 font-semibold text-slate-300">Maturity Date</td>
                        <td className="py-3 px-3.5 font-mono text-white">{fdr?.maturity_date}</td>
                        <td className="py-3 px-3.5 font-mono text-white">{extractions[0].extracted_maturity_date || 'N/A'}</td>
                        <td className="py-3 px-3.5 text-emerald-400 font-medium">Valid</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw OCR Text Snippet */}
              <div>
                <p className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-1.5">Raw Parsed Document Snippet</p>
                <pre className="p-3.5 bg-[#15182D] rounded-xl border border-white/5 text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-36">
                  {extractions[0].raw_text}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Document for Field Extraction"
        subtitle="Automatic OCR, text parsing, and alteration indicator scrutiny"
      >
        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Target FDR Record</label>
            <select
              value={selectedFdrId}
              onChange={(e) => setSelectedFdrId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
            >
              {fdrs.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.fdr_number} • {item.institution_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Document Classification</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#15182D] border border-[#2B2F4E] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="FDR_CERTIFICATE">Fixed Deposit Receipt Certificate</option>
              <option value="BANK_CONFIRMATION">Bank Confirmation Letter</option>
              <option value="REPLACEMENT_FDR">Replacement FDR Instrument</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Document File (PDF, PNG, JPG)</label>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full p-2.5 border border-[#2B2F4E] rounded-xl text-xs bg-[#15182D] text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !uploadFile}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold shadow-md"
            >
              {uploading ? 'Processing Extraction...' : 'Upload & Scrutinize'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
