import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  HelpCircle,
  X,
  FileCheck2,
  FileText,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Fingerprint,
  Scale,
  Sparkles
} from 'lucide-react';

const DEFAULT_SUGGESTED_ACCOUNTS = [
  { email: 'admin@fdrsecuretrack.gov.in', label: 'Super Admin', role: 'admin' },
  { email: 'officer.sharma@fdrsecuretrack.gov.in', label: 'Regulation Officer', role: 'officer' },
  { email: 'admin@apextech.edu.in', label: 'Apex Tech Admin', role: 'institution' },
  { email: 'admin@nationaleng.edu.in', label: 'NEC Admin', role: 'institution' }
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Email suggestions dropdown
  const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false);
  const [savedEmails, setSavedEmails] = useState<{ email: string; label?: string }[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Forgot password modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('fdr_saved_emails');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedEmails(parsed);
          if (!email && parsed[0]?.email) {
            setEmail(parsed[0].email);
          }
          return;
        }
      }
    } catch {
      // Fallback to default
    }
    setSavedEmails(DEFAULT_SUGGESTED_ACCOUNTS);
    if (!email && DEFAULT_SUGGESTED_ACCOUNTS[0]?.email) {
      setEmail(DEFAULT_SUGGESTED_ACCOUNTS[0].email);
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        emailInputRef.current &&
        !emailInputRef.current.contains(event.target as Node)
      ) {
        setIsEmailDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectEmail = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setIsEmailDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      error('Please provide your official email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);

      if (rememberMe) {
        try {
          const updated = [
            { email: email.trim(), label: 'Active User' },
            ...savedEmails.filter(s => s.email.toLowerCase() !== email.trim().toLowerCase())
          ].slice(0, 5);
          localStorage.setItem('fdr_saved_emails', JSON.stringify(updated));
        } catch {
          // ignore localStorage
        }
      }

      success('Authentication successful. Session initialized.');
      navigate('/dashboard');
    } catch (err: any) {
      error(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSuggestions = savedEmails.filter(item =>
    item.email.toLowerCase().includes(email.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B0C15] text-slate-200 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden font-sans">
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Grid Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Hero Side (Matching VerifyFlow AI Screenshot 1) */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              <span>Evidence first.</span>
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-rose-400 to-indigo-300 bg-clip-text text-transparent">
                Every decision
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
                traceable.
              </span>
            </h1>
            <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
              FDR SecureTrack validates institutional deposits, cross-checks Fixed Deposit Receipts and evaluates regulatory compliance rules, while authorized officers stay in control of every judgement.
            </p>
          </div>

          {/* Floating Visual Presentation Cards */}
          <div className="relative pt-6 pb-2">
            <div className="relative max-w-lg mx-auto sm:mx-0">
              {/* Document 1: FDR Certificate */}
              <div className="bg-white text-slate-800 rounded-2xl p-4 shadow-2xl border border-white/20 w-56 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-rose-50 text-rose-600">
                      <FileCheck2 className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-slate-900">FDR Certificate</span>
                  </div>
                </div>
                <div className="space-y-1.5 my-2">
                  <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-2 bg-slate-100 rounded w-1/2"></div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Consistent
                  </span>
                </div>
              </div>

              {/* Document 2: Regulatory Application */}
              <div className="sm:absolute sm:top-12 sm:left-44 mt-4 sm:mt-0 bg-white text-slate-800 rounded-2xl p-4 shadow-2xl border border-white/20 w-60 transform rotate-1 hover:rotate-0 transition-transform duration-300 z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-pink-50 text-pink-600">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-slate-900">Application Deposit</span>
                  </div>
                </div>
                <div className="space-y-1.5 my-2">
                  <div className="h-2 bg-slate-200 rounded w-4/5"></div>
                  <div className="h-2 bg-slate-100 rounded w-2/3"></div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    ≠ Date differs
                  </span>
                </div>
              </div>

              {/* Verified Shield Pill Visual */}
              <div className="sm:absolute sm:bottom-0 sm:left-32 mt-4 sm:mt-0 z-20 flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#101935] border border-emerald-500/40 text-emerald-400 text-xs font-mono shadow-xl backdrop-blur-md">
                  <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SHA-256 verified</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-pink-500/30">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 3 Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="bg-[#121528] border border-white/5 rounded-2xl p-4 shadow-lg hover:border-white/10 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white mb-3 shadow-md shadow-rose-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white">Cross-document reasoning</h3>
              <p className="text-[11px] text-slate-400 mt-1">Multi-source alignment across bank advice & certificates.</p>
            </div>

            <div className="bg-[#121528] border border-white/5 rounded-2xl p-4 shadow-lg hover:border-white/10 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white mb-3 shadow-md shadow-purple-500/20">
                <Scale className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white">Deterministic rules</h3>
              <p className="text-[11px] text-slate-400 mt-1">Transparent validation criteria, not opaque black boxes.</p>
            </div>

            <div className="bg-[#121528] border border-white/5 rounded-2xl p-4 shadow-lg hover:border-white/10 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-orange-400 flex items-center justify-center text-white mb-3 shadow-md shadow-orange-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white">Honest trust signals</h3>
              <p className="text-[11px] text-slate-400 mt-1">Direct cryptographic evidence trails for every approval.</p>
            </div>
          </div>
        </div>

        {/* Right Sign-in Card with Glowing Border Container */}
        <div className="lg:col-span-5">
          <div className="relative p-1 rounded-3xl bg-gradient-to-b from-rose-500/30 via-purple-500/20 to-teal-500/20 shadow-2xl shadow-rose-500/10">
            <div className="bg-[#121426] rounded-[22px] p-6 sm:p-8 backdrop-blur-xl border border-white/10 relative">
              {/* Golden Workspace Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold tracking-wider uppercase mb-5">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>SECURE WORKSPACE</span>
              </div>

              <h2 className="text-3xl font-extrabold text-white tracking-tight">Sign in</h2>
              <p className="text-xs text-slate-400 mt-1.5 mb-6">
                Use the official account issued by your regulatory administrator.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Email Input */}
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Work email
                  </label>
                  <div className="relative">
                    <input
                      ref={emailInputRef}
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="officer@fdrsecuretrack.gov.in"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsEmailDropdownOpen(true);
                      }}
                      onFocus={() => setIsEmailDropdownOpen(true)}
                      className="w-full px-4 py-3 text-xs bg-[#1A1D33] border border-[#2B2F4E] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all shadow-inner"
                    />
                  </div>

                  {/* Suggestions Dropdown */}
                  {isEmailDropdownOpen && filteredSuggestions.length > 0 && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-30 left-0 right-0 mt-1 bg-[#16192E] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-white/5"
                    >
                      <div className="px-3 py-1.5 bg-[#121426] text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Saved Accounts
                      </div>
                      {filteredSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectEmail(item.email)}
                          className="w-full px-3 py-2 text-left hover:bg-white/5 transition-colors flex items-center justify-between text-xs group"
                        >
                          <div className="truncate">
                            <span className="font-medium text-white block truncate group-hover:text-rose-300">
                              {item.email}
                            </span>
                            {item.label && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                {item.label}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 pr-10 py-3 text-xs bg-[#1A1D33] border border-[#2B2F4E] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center pt-1">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-[#1A1D33] text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="remember-me" className="ml-2 text-xs text-slate-400 select-none cursor-pointer">
                    Remember email on this workstation
                  </label>
                </div>

                {/* Radiant Sunset Gradient Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-6 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-lg shadow-rose-500/25 transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </form>

              {/* Registered Accounts Section (Reference Auto-fill credentials styling) */}
              <div className="mt-6 p-4 rounded-2xl bg-[#16192E] border border-white/5">
                <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1">
                  OFFICIAL ACCOUNTS
                </div>
                <p className="text-[11px] text-slate-400 mb-2.5">
                  Choose a role to quickly populate the email field:
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_SUGGESTED_ACCOUNTS.map((acc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectEmail(acc.email)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-gradient-to-r from-rose-500/20 to-purple-500/20 hover:from-rose-500/35 hover:to-purple-500/35 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      <span>{acc.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer Note */}
              <p className="mt-5 text-[11px] text-slate-500 text-center leading-relaxed">
                Accounts are provisioned by administrators. There is no self-registration.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="bg-[#121426] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-white/10 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-rose-400" />
                <span>Credential Assistance</span>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 text-xs text-slate-300 space-y-3">
              <p>
                In compliance with statutory regulatory standards, automated self-service password reset emails are restricted.
              </p>
              <div className="p-3 bg-[#16192E] border border-white/10 rounded-xl text-slate-200">
                To reset your credentials, contact the System Administrator:
                <span className="block font-mono font-bold mt-1 text-rose-400">
                  admin@fdrsecuretrack.gov.in
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsForgotModalOpen(false)}
              className="w-full py-2.5 bg-[#1A1D33] hover:bg-[#252A47] text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
