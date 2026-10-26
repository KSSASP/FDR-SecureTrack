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
  Building2,
  Check
} from 'lucide-react';

const DEFAULT_SUGGESTED_EMAILS = [
  { email: 'admin@fdrsecuretrack.gov.in', label: 'Super Administration' },
  { email: 'officer.sharma@fdrsecuretrack.gov.in', label: 'Regulation Oversight' },
  { email: 'admin@apextech.edu.in', label: 'Apex Institute of Technology' },
  { email: 'admin@nationaleng.edu.in', label: 'National Engineering College' }
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
          // Set first saved email if input is empty
          if (!email && parsed[0]?.email) {
            setEmail(parsed[0].email);
          }
          return;
        }
      }
    } catch {
      // Fallback to default suggested email identifiers
    }
    setSavedEmails(DEFAULT_SUGGESTED_EMAILS);
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

      // Save email to remembered list if requested
      if (rememberMe) {
        try {
          const updated = [
            { email: email.trim(), label: 'Saved Workstation User' },
            ...savedEmails.filter(s => s.email.toLowerCase() !== email.trim().toLowerCase())
          ].slice(0, 5);
          localStorage.setItem('fdr_saved_emails', JSON.stringify(updated));
        } catch {
          // ignore localStorage errors
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

  // Filter suggestions by typed input
  const filteredSuggestions = savedEmails.filter(item =>
    item.email.toLowerCase().includes(email.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Subtle enterprise background geometry */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-900/40 border border-blue-500/30 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">FDR SecureTrack</h1>
          <p className="text-xs text-blue-300 mt-1 uppercase tracking-wider font-semibold">
            Intelligent Security Deposit and FDR Lifecycle Management
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Institutional Regulatory Portal
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Official Portal Login</span>
            <span className="text-[10px] text-slate-500 font-medium">TLS 1.3 Encrypted</span>
          </div>

          <div className="p-6 sm:p-8">
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {/* Email Address with clean suggestions dropdown */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@organization.gov.in"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setIsEmailDropdownOpen(true);
                    }}
                    onFocus={() => setIsEmailDropdownOpen(true)}
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-colors"
                  />
                </div>

                {/* Suggestions Dropdown */}
                {isEmailDropdownOpen && filteredSuggestions.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100"
                  >
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Saved Accounts
                    </div>
                    {filteredSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectEmail(item.email)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-center justify-between text-xs group"
                      >
                        <div className="truncate">
                          <span className="font-medium text-slate-800 block truncate group-hover:text-blue-900">
                            {item.email}
                          </span>
                          {item.label && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              {item.label}
                            </span>
                          )}
                        </div>
                        {email.toLowerCase() === item.email.toLowerCase() && (
                          <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Password with Visibility Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter official credentials"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
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
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember-me" className="ml-2 text-xs text-slate-600 select-none cursor-pointer">
                  Remember my email on this workstation
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-md text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Institutional Security Deposit & Compliance System
            </p>
          </div>
        </div>

        {/* Security & Regulatory Notice Footer */}
        <div className="mt-6 text-center space-y-1 text-[11px] text-slate-400">
          <p>Protected Regulatory Management System • Encrypted Audit Trail Active</p>
          <p className="text-[10px] text-slate-500">
            Authorized personnel only. All access transactions are recorded in the immutable audit log.
          </p>
        </div>
      </div>

      {/* Forgot Password Assistance Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>Credential Assistance</span>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 text-xs text-slate-600 space-y-2.5">
              <p>
                In compliance with statutory regulatory standards, automated password reset emails are restricted.
              </p>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-medium">
                To reset your credentials, please contact the System Administrator:
                <span className="block font-mono font-bold mt-1 text-blue-700">
                  admin@fdrsecuretrack.gov.in
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Please provide your full name, official institution code, and authorized contact number in your request.
              </p>
            </div>

            <button
              onClick={() => setIsForgotModalOpen(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
