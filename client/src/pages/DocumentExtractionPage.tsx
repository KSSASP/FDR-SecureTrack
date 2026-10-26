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
  ExternalLink
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Digital Document Extraction & Tampering Analysis</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            OCR/PDF parsing, field normalization, and side-by-side alteration indicator scrutiny.
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors w-fit"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Target FDR Selector */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <label className="font-semibold text-slate-700 whitespace-nowrap">Select Case Record:</label>
          <select
            value={selectedFdrId}
            onChange={(e) => setSelectedFdrId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 max-w-md truncate"
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
            className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1"
          >
            <span>Open Complete Case File</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Documents & Extractions Review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
            Archived Documents ({docs.length})
          </h3>
          <div className="space-y-2">
            {docs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No documents uploaded for this case yet.</p>
            ) : (
              docs.map((d: any) => (
                <div key={d.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 truncate max-w-[180px]">{d.original_filename}</p>
                      <p className="text-[11px] text-slate-500">{d.document_type} • v{d.version}</p>
                    </div>
                    <Badge type="status" value={d.status} />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200">
                    <button
                      onClick={() => handleExtractDoc(d.id)}
                      disabled={extracting}
                      className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold text-[11px] flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Extract</span>
                    </button>
                    <a
                      href={`/api/documents/${d.id}/preview`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 text-[11px]"
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
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Extraction & Tampering Scrutiny</h3>
              <p className="text-xs text-slate-500">Compares certified document values against the official repository submission.</p>
            </div>
            {extractions.length > 0 && (
              <button
                onClick={() => handleConfirmExtraction(extractions[0].document_id, extractions[0])}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Official Values</span>
              </button>
            )}
          </div>

          {extractions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No Document Extractions Yet</p>
              <p className="text-xs text-slate-500 mt-0.5">Upload a certificate or click "Extract" to parse text and detect alteration flags.</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Tampering Indicator Alerts */}
              {extractions[0].tampering_indicators && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Integrity Indicators</p>
                  {(() => {
                    try {
                      const indicators = JSON.parse(extractions[0].tampering_indicators);
                      return indicators.map((ind: any, iIdx: number) => (
                        <div
                          key={iIdx}
                          className={`p-3 rounded-lg border flex items-start gap-3 ${
                            ind.severity === 'CRITICAL'
                              ? 'bg-rose-50 border-rose-300 text-rose-950'
                              : ind.severity === 'WARNING'
                              ? 'bg-amber-50 border-amber-300 text-amber-950'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{ind.label}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/70 border">
                                Field: {ind.field}
                              </span>
                            </div>
                            <p className="mt-0.5 leading-relaxed">{ind.indicator}</p>
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
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">Detailed Field Comparison</p>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Field</th>
                        <th className="py-2.5 px-3">Repository Submitted Value</th>
                        <th className="py-2.5 px-3">Extracted Document Value</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">FDR Number</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{fdr?.fdr_number}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-900">{extractions[0].extracted_fdr_number || 'N/A'}</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-medium">Match</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">Bank Name</td>
                        <td className="py-2.5 px-3 text-slate-900">{fdr?.bank_name}</td>
                        <td className="py-2.5 px-3 text-slate-900">{extractions[0].extracted_bank_name || 'N/A'}</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-medium">Match</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">Principal Amount</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{fdr ? `₹${fdr.amount?.toLocaleString('en-IN')}` : ''}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {extractions[0].extracted_amount ? `₹${extractions[0].extracted_amount?.toLocaleString('en-IN')}` : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3">
                          {extractions[0].extracted_amount && Math.abs(extractions[0].extracted_amount - fdr?.amount) > 1 ? (
                            <span className="text-rose-700 font-bold">MISMATCH</span>
                          ) : (
                            <span className="text-emerald-700 font-medium">Match</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">Maturity Date</td>
                        <td className="py-2.5 px-3 font-mono text-slate-900">{fdr?.maturity_date}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-900">{extractions[0].extracted_maturity_date || 'N/A'}</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-medium">Valid</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw OCR Text Snippet */}
              <div>
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Raw Parsed Document Snippet</p>
                <pre className="p-3 bg-slate-100 rounded-lg text-[10px] font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap max-h-36">
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
            <label className="block font-semibold text-slate-700 mb-1">Target FDR Record</label>
            <select
              value={selectedFdrId}
              onChange={(e) => setSelectedFdrId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              {fdrs.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.fdr_number} • {item.institution_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Document Classification</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="FDR_CERTIFICATE">Fixed Deposit Receipt Certificate</option>
              <option value="BANK_CONFIRMATION">Bank Confirmation Letter</option>
              <option value="REPLACEMENT_FDR">Replacement FDR Instrument</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Document File (PDF, PNG, JPG)</label>
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
              disabled={uploading || !uploadFile}
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {uploading ? 'Processing Extraction...' : 'Upload & Scrutinize'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
