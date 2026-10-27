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
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  const totalSecured = fdrs.reduce((acc, f) => acc + (f.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Institution Card */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 flex items-center justify-center font-bold text-xl border border-indigo-500/30 shadow-inner">
            <Building2 className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{institution?.name}</h1>
              <Badge type="status" value={institution?.status} />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Code: <span className="text-indigo-400">{institution?.code}</span> • Reg: <span className="text-slate-300">{institution?.registration_number}</span>
            </p>
          </div>
        </div>

        <div className="text-right bg-[#15182D] p-4 rounded-xl border border-white/5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Active Deposits</span>
          <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400">{formatCurrency(totalSecured)}</span>
        </div>
      </div>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div className="bg-[#121528] rounded-2xl p-5 border border-white/5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Administrative Contacts</h3>
          <div className="space-y-3 text-slate-300">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white/5 text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <span>{institution?.contact_email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white/5 text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <span>{institution?.contact_phone}</span>
            </div>
            <div className="flex items-start gap-2.5 pt-2 border-t border-white/5">
              <div className="p-1.5 rounded-lg bg-white/5 text-slate-400 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-slate-400 leading-relaxed">{institution?.address}, {institution?.city}, {institution?.state}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#121528] rounded-2xl p-5 border border-white/5 shadow-xl md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Registered Security Deposit Instruments ({fdrs.length})
            </h3>
            <button
              onClick={() => navigate('/fdrs/new')}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white font-semibold text-xs shadow-lg shadow-rose-900/20 hover:opacity-90 transition-opacity"
            >
              + Submit New FDR
            </button>
          </div>

          <div className="divide-y divide-white/5 max-h-96 overflow-y-auto pr-1">
            {fdrs.map((f: any) => (
              <div key={f.id} className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors">
                <div>
                  <p className="font-mono font-bold text-indigo-400 text-xs">{f.fdr_number}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{f.bank_name} • Matures: <span className="text-slate-300">{f.maturity_date}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white font-mono">{formatCurrency(f.amount)}</span>
                  <Badge type="status" value={f.current_status} />
                  <button
                    onClick={() => navigate(`/fdrs/${f.id}`)}
                    className="p-1.5 rounded-lg bg-[#1A1E36] hover:bg-[#202542] text-slate-400 hover:text-white border border-white/5 transition-colors"
                    title="View FDR details"
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
