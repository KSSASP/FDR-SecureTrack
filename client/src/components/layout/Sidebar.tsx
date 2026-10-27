import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  CopyX,
  ShieldAlert,
  Briefcase,
  CalendarDays,
  RefreshCw,
  HandCoins,
  Bell,
  Mic,
  FileSpreadsheet,
  History,
  Settings,
  Users,
  Building2,
  ShieldCheck,
  FileText,
  X,
  CheckCircle2
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isSuperAdmin, isOfficer, isInstAdmin } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  /**
   * Deterministic active path check based strictly on URL and routing hierarchy.
   * - /dashboard matches exact '/' and '/dashboard'
   * - /fdrs/new is strictly exact (only 'Submit New FDR' is active)
   * - /fdrs matches exact '/fdrs' and nested detail pages '/fdrs/:id' (excluding '/fdrs/new')
   * - All other tabs match their base path or sub-routes
   */
  const isItemActive = (targetPath: string): boolean => {
    if (targetPath === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/';
    }
    if (targetPath === '/fdrs/new') {
      return currentPath === '/fdrs/new';
    }
    if (targetPath === '/fdrs') {
      return currentPath === '/fdrs' || (currentPath.startsWith('/fdrs/') && currentPath !== '/fdrs/new');
    }
    if (targetPath === '/workbench') {
      return currentPath === '/workbench' || currentPath.startsWith('/workbench/') || currentPath === '/verification';
    }
    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
  };

  const renderNavItem = (
    to: string,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    defaultIconColor: string
  ) => {
    const active = isItemActive(to);

    return (
      <Link
        key={to}
        to={to}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
          active
            ? 'bg-gradient-to-r from-rose-500/80 via-purple-600/90 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-600/25'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${active ? 'text-white' : defaultIconColor}`} />
        <span className="truncate flex-1">{label}</span>
        {active && (
          <span className="w-1.5 h-5 bg-white rounded-full shadow-sm ml-auto flex-shrink-0" />
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <aside className="w-64 bg-[#111326] border border-white/5 rounded-2xl flex flex-col h-full select-none shadow-2xl overflow-hidden">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white tracking-wide truncate flex items-center gap-1">
              <span>FDR</span>
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">SecureTrack</span>
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold truncate">
              Deposit Oversight
            </p>
          </div>
        </Link>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {/* GROUP 1: OVERVIEW */}
        <div>
          <div className="px-3 mb-1.5 font-bold text-slate-400 tracking-wider uppercase text-[10px]">
            MODULES
          </div>
          <nav className="space-y-1">
            {renderNavItem('/dashboard', 'Command Center', LayoutDashboard, 'text-rose-400')}
          </nav>
        </div>

        {/* GROUP 2: FDR MANAGEMENT */}
        <div>
          <div className="px-3 mb-1.5 font-bold text-slate-400 tracking-wider uppercase text-[10px]">
            FDR Management
          </div>
          <nav className="space-y-1">
            {renderNavItem('/fdrs', 'FDR Repository', FolderOpen, 'text-blue-400')}
            {renderNavItem('/documents', 'Documents & Extraction', FileText, 'text-cyan-400')}
            {renderNavItem('/fdrs/new', 'Submit New FDR', PlusCircle, 'text-emerald-400')}
          </nav>
        </div>

        {/* GROUP 3: REVIEW & COMPLIANCE */}
        {(!isInstAdmin || isSuperAdmin || isOfficer) && (
          <div>
            <div className="px-3 mb-1.5 font-bold text-slate-400 tracking-wider uppercase text-[10px]">
              Review & Compliance
            </div>
            <nav className="space-y-1">
              {renderNavItem('/workbench', 'Officer Workbench', Briefcase, 'text-amber-400')}
              {renderNavItem('/duplicates', 'Duplicate Review', CopyX, 'text-rose-400')}
              {renderNavItem('/risk-assessment', 'Risk Assessment', ShieldAlert, 'text-orange-400')}
            </nav>
          </div>
        )}

        {/* GROUP 4: LIFECYCLE */}
        <div>
          <div className="px-3 mb-1.5 font-bold text-slate-400 tracking-wider uppercase text-[10px]">
            Lifecycle & Monitoring
          </div>
          <nav className="space-y-1">
            {renderNavItem('/maturity', 'Maturity Monitoring', CalendarDays, 'text-indigo-400')}
            {renderNavItem('/renewals', 'Renewal Tracking', RefreshCw, 'text-blue-400')}
            {renderNavItem('/release-requests', 'Release Requests', HandCoins, 'text-teal-400')}
            {renderNavItem('/notifications', 'Notifications Center', Bell, 'text-amber-400')}
          </nav>
        </div>

        {/* GROUP 5: GOVERNANCE */}
        <div>
          <div className="px-3 mb-1.5 font-bold text-slate-400 tracking-wider uppercase text-[10px]">
            Governance & Insights
          </div>
          <nav className="space-y-1">
            {renderNavItem('/audit', 'Audit Trail', History, 'text-slate-400')}
            {renderNavItem('/reports', 'Reports & Export', FileSpreadsheet, 'text-emerald-400')}

            {isSuperAdmin && renderNavItem('/users', 'User Administration', Users, 'text-purple-400')}
            {isSuperAdmin && renderNavItem('/settings', 'System Configuration', Settings, 'text-slate-400')}
            {isInstAdmin && renderNavItem('/my-institution', 'Institution Profile', Building2, 'text-blue-400')}
          </nav>
        </div>

        {/* GROUP 6: ASSISTANCE */}
        <div>
          <div className="px-3 mb-1.5 font-bold text-slate-400 tracking-wider uppercase text-[10px]">
            AI Assistance
          </div>
          <nav className="space-y-1">
            {renderNavItem('/assistant', 'AI Case Assistant', Mic, 'text-pink-400')}
          </nav>
        </div>
      </div>

      {/* Evidence Trust Card (Matching Reference UI Screenshot 2 & 3) */}
      <div className="mx-3 mb-2 p-3.5 rounded-xl bg-gradient-to-b from-[#1C1838] to-[#131528] border border-white/5 relative overflow-hidden">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-semibold text-white">Evidence, not guesses</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Every finding links back to its verified source.
        </p>
        <div className="mt-2.5 h-1 rounded-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400" />
      </div>

      {/* Backend Online & Version Footer */}
      <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between text-xs bg-[#0E1020]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-medium text-slate-300">Backend online</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">v8.1.0</span>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Floating Sidebar */}
      <div className="hidden md:flex p-3 pr-0 h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex p-3">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
          <div className="relative z-10 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
