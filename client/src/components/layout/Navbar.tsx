import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest } from '../../api/client.js';
import {
  Search,
  Bell,
  Mic,
  LogOut,
  Building,
  Menu,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface NavbarProps {
  onOpenAssistant?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAssistant, onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    apiRequest<{ unreadCount: number }>('/notifications')
      .then(data => setUnreadCount(data.unreadCount || 0))
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/fdrs?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  // Human-friendly breadcrumb title mapper
  const getBreadcrumb = () => {
    const p = location.pathname;
    if (p === '/' || p === '/dashboard') return 'Command Center';
    if (p.startsWith('/fdrs/new')) return 'FDR Management > Submit New FDR';
    if (p.startsWith('/fdrs/')) return 'FDR Management > FDR Details';
    if (p === '/fdrs') return 'FDR Management > FDR Repository';
    if (p === '/documents') return 'FDR Management > Documents & Extraction';
    if (p === '/workbench') return 'Review & Compliance > Officer Workbench';
    if (p === '/duplicates') return 'Review & Compliance > Duplicate Review';
    if (p === '/risk-assessment') return 'Review & Compliance > Risk Assessment';
    if (p === '/maturity') return 'Lifecycle > Maturity Monitoring';
    if (p === '/renewals') return 'Lifecycle > Renewal Tracking';
    if (p === '/release-requests') return 'Lifecycle > Release Requests';
    if (p === '/notifications') return 'Lifecycle > Notifications Center';
    if (p === '/audit') return 'Governance & Insights > Audit Trail';
    if (p === '/reports') return 'Governance & Insights > Reports & Export';
    if (p === '/users') return 'Governance & Insights > User Administration';
    if (p === '/settings') return 'Governance & Insights > System Configuration';
    if (p === '/my-institution') return 'Governance & Insights > Institution Profile';
    if (p === '/assistant') return 'AI Assistance > Case Assistant';
    return 'Command Center';
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 bg-[#0B0C15]/80 backdrop-blur-md border-b border-white/5">
      {/* Mobile Menu & Breadcrumb / Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Current Location Breadcrumb */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium whitespace-nowrap">
          <span>{getBreadcrumb()}</span>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative flex-1 max-w-xs md:max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search FDR number, bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#15182D] border border-white/10 rounded-xl focus:outline-none focus:border-rose-500/70 focus:ring-1 focus:ring-rose-500/40 transition-all text-white placeholder:text-slate-500 shadow-inner"
          />
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Institution Badge if applicable */}
        {user?.institution_name && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#15182D] border border-white/10 text-xs text-slate-300">
            <Building className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium truncate max-w-[180px]">{user.institution_name}</span>
          </div>
        )}

        {/* AI Voice Assistant Shortcut */}
        <button
          onClick={onOpenAssistant || (() => navigate('/assistant'))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/15 via-rose-500/15 to-indigo-500/15 hover:from-purple-500/25 hover:to-indigo-500/25 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all shadow-sm"
          title="Open AI FDR Assistant (EN / தமிழ்)"
        >
          <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span className="hidden sm:inline">AI Assistant</span>
          <span className="text-[9px] bg-rose-500/30 text-rose-200 px-1.5 py-0.2 rounded font-bold">EN / தமிழ்</span>
        </button>

        {/* Notifications Icon with Badge */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          title="Notifications & Escalation Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/50 animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-white/10 mx-1"></div>

        {/* User Identity Chip (Matching Reference UI Screenshot 2 & 3) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-pink-500/25">
              {getInitials(user?.name)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight truncate max-w-[140px]">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                {user?.role?.replace('_', ' ')} · LIVE
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1 p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs transition-colors"
            title="Log Out Session"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline font-medium">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
