import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  PlusCircle,
  Building,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  FileCheck2
} from 'lucide-react';

export const NewFdrSubmissionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isInstAdmin } = useAuth();
  const { success, error } = useToast();

  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [fdrNumber, setFdrNumber] = useState('');
  const [institutionId, setInstitutionId] = useState(user?.institution_id || '');
  const [bankName, setBankName] = useState('State Bank of India');
  const [branchName, setBranchName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [amount, setAmount] = useState('');
  const [depositType, setDepositType] = useState('SECURITY_DEPOSIT');
  const [appRef, setAppRef] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [interestRate, setInterestRate] = useState('7.25');

  useEffect(() => {
    apiRequest<{ institutions: any[] }>('/institutions')
      .then(res => {
        setInstitutions(res.institutions || []);
        if (!institutionId && res.institutions.length > 0) {
          setInstitutionId(res.institutions[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const popularBanks = [
    'State Bank of India',
    'Punjab National Bank',
    'Canara Bank',
    'HDFC Bank',
    'ICICI Bank',
    'Bank of Baroda',
    'Union Bank of India',
    'Axis Bank'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fdrNumber || !bankName || !amount || !issueDate || !maturityDate || !appRef) {
      error('Please fill in all mandatory fields');
      return;
    }

    if (new Date(maturityDate) <= new Date(issueDate)) {
      error('Validation Failed: Maturity date must be strictly later than issue date');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      error('Deposit amount must be a positive number');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest<{ fdrId: string; message: string }>('/fdrs', {
        method: 'POST',
        body: JSON.stringify({
          fdr_number: fdrNumber,
          institution_id: institutionId,
          bank_name: bankName,
          branch_name: branchName,
          ifsc_code: ifscCode,
          amount: numAmount,
          currency: 'INR',
          deposit_type: depositType,
          linked_application_ref: appRef,
          issue_date: issueDate,
          maturity_date: maturityDate,
          interest_rate: interestRate ? parseFloat(interestRate) : null
        })
      });

      success('FDR instrument registered successfully and queued for scrutiny.');
      navigate(`/fdrs/${res.fdrId}`);
    } catch (err: any) {
      error(err.message || 'Failed to submit FDR record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/fdrs')}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Register New Security Deposit Instrument</h1>
            <p className="text-xs text-slate-500 mt-0.5">Submit fixed deposit receipt details for regulatory verification and lifecycle tracking.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* SECTION 1: INSTITUTION & APPLICATION REF */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-4">
              1. Institutional Identity & Reference
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Institution Name <span className="text-rose-600">*</span>
                </label>
                {isInstAdmin ? (
                  <input
                    type="text"
                    disabled
                    value={user?.institution_name || ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 cursor-not-allowed font-medium"
                  />
                ) : (
                  <select
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Linked Application / Approval Reference <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AICTE-APP-2026-DEL-0199"
                  value={appRef}
                  onChange={(e) => setAppRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: BANK & FINANCIAL DETAILS */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-4">
              2. Bank Instrument Specifications
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  FDR Number / Receipt Serial <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FDR-SBI-2026-99011"
                  value={fdrNumber}
                  onChange={(e) => setFdrNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Issuing Bank <span className="text-rose-600">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  {popularBanks.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Parliament Street, New Delhi"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deposit Principal Amount (INR) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="1"
                  placeholder="e.g. 5000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deposit Type</label>
                <select
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="SECURITY_DEPOSIT">Security Deposit</option>
                  <option value="PERFORMANCE_GUARANTEE">Performance Bank Guarantee</option>
                  <option value="ENDOWMENT_FUND">Endowment Fund Reserve</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 7.25"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: VALIDITY DATES */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 mb-4">
              3. Validity Period & Chronology
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Issue Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Maturity Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/fdrs')}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Validating & Submitting...' : 'Register Instrument'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
