import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Badge } from '../components/common/Badge.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  FolderOpen,
  CheckCircle2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const InstitutionProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { error } = useToast();

  const [institution, setInstitution] = useState<any>(null);
  const [fdrs, setFdrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.institution_id) {
      apiRequest(`/institutions/${user.institution_id}`)
        .then(res => {
          setInstitution(res.institution);
          setFdrs(res.fdrs || []);
        })
        .catch(err => error(err.message || 'Failed to load institution profile'))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  const totalSecured = fdrs.reduce((acc, f) => acc + (f.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Institution Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xl border border-blue-200">
            <Building2 className="w-8 h-8 text-blue-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{institution?.name}</h1>
              <Badge type="status" value={institution?.status} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Code: {institution?.code} • Reg: {institution?.registration_number}
            </p>
          </div>
        </div>

        <div className="text-right bg-slate-50 p-3 rounded-lg border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Active Deposits</span>
          <span className="text-xl font-bold font-mono text-blue-900">{formatCurrency(totalSecured)}</span>
        </div>
      </div>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">Administrative Contacts</h3>
          <div className="space-y-2 text-slate-700">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{institution?.contact_email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{institution?.contact_phone}</span>
            </div>
            <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
              <span>{institution?.address}, {institution?.city}, {institution?.state}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs md:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Registered Security Deposit Instruments ({fdrs.length})
            </h3>
            <button
              onClick={() => navigate('/fdrs/new')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              + Submit New FDR
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {fdrs.map((f: any) => (
              <div key={f.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono font-bold text-blue-900 text-xs">{f.fdr_number}</p>
                  <p className="text-[11px] text-slate-500">{f.bank_name} • Matures: {f.maturity_date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{formatCurrency(f.amount)}</span>
                  <Badge type="status" value={f.current_status} />
                  <button
                    onClick={() => navigate(`/fdrs/${f.id}`)}
                    className="p-1 rounded text-slate-400 hover:text-blue-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
