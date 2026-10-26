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
  X
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
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
          active
            ? 'bg-blue-600 text-white font-semibold shadow-xs'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Icon className={`w-4 h-4 ${active ? 'text-white' : defaultIconColor}`} />
        <span>{label}</span>
      </Link>
    );
  };

  const sidebarContent = (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30 group-hover:bg-blue-500 transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white tracking-wide truncate">FDR SecureTrack</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">Intelligent Deposit Portal</p>
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
      <div className="flex-1 overflow-y-auto p-3 space-y-5 text-xs">
        {/* GROUP 1: OVERVIEW */}
        <div>
          <div className="px-3 mb-1.5 font-semibold text-slate-400 tracking-wider uppercase text-[10px]">
            Overview
          </div>
          <nav className="space-y-0.5">
            {renderNavItem('/dashboard', 'Dashboard', LayoutDashboard, 'text-blue-400')}
          </nav>
        </div>

        {/* GROUP 2: FDR MANAGEMENT */}
        <div>
          <div className="px-3 mb-1.5 font-semibold text-slate-400 tracking-wider uppercase text-[10px]">
            FDR Management
          </div>
          <nav className="space-y-0.5">
            {renderNavItem('/fdrs', 'FDR Repository', FolderOpen, 'text-blue-400')}
            {renderNavItem('/documents', 'Documents', FileText, 'text-cyan-400')}
            {renderNavItem('/fdrs/new', 'Submit New FDR', PlusCircle, 'text-emerald-400')}
          </nav>
        </div>

        {/* GROUP 3: REVIEW & COMPLIANCE */}
        {(!isInstAdmin || isSuperAdmin || isOfficer) && (
          <div>
            <div className="px-3 mb-1.5 font-semibold text-slate-400 tracking-wider uppercase text-[10px]">
              Review & Compliance
            </div>
            <nav className="space-y-0.5">
              {renderNavItem('/workbench', 'Officer Workbench', Briefcase, 'text-amber-400')}
              {renderNavItem('/duplicates', 'Duplicate Review', CopyX, 'text-rose-400')}
              {renderNavItem('/risk-assessment', 'Risk Assessment', ShieldAlert, 'text-orange-400')}
            </nav>
          </div>
        )}

        {/* GROUP 4: LIFECYCLE */}
        <div>
          <div className="px-3 mb-1.5 font-semibold text-slate-400 tracking-wider uppercase text-[10px]">
            Lifecycle
          </div>
          <nav className="space-y-0.5">
            {renderNavItem('/maturity', 'Maturity Tracking', CalendarDays, 'text-indigo-400')}
            {renderNavItem('/renewals', 'Renewals', RefreshCw, 'text-blue-400')}
            {renderNavItem('/release-requests', 'Release Requests', HandCoins, 'text-teal-400')}
            {renderNavItem('/notifications', 'Notifications & Alerts', Bell, 'text-amber-400')}
          </nav>
        </div>

        {/* GROUP 5: GOVERNANCE */}
        <div>
          <div className="px-3 mb-1.5 font-semibold text-slate-400 tracking-wider uppercase text-[10px]">
            Governance
          </div>
          <nav className="space-y-0.5">
            {renderNavItem('/audit', 'Audit Trail', History, 'text-slate-400')}
            {renderNavItem('/reports', 'Reports', FileSpreadsheet, 'text-emerald-400')}

            {isSuperAdmin && renderNavItem('/users', 'User Administration', Users, 'text-purple-400')}
            {isSuperAdmin && renderNavItem('/settings', 'System Configuration', Settings, 'text-slate-400')}
            {isInstAdmin && renderNavItem('/my-institution', 'Institution Profile', Building2, 'text-blue-400')}
          </nav>
        </div>

        {/* GROUP 6: ASSISTANCE */}
        <div>
          <div className="px-3 mb-1.5 font-semibold text-slate-400 tracking-wider uppercase text-[10px]">
            Assistance
          </div>
          <nav className="space-y-0.5">
            {renderNavItem('/assistant', 'Case Assistant', Mic, 'text-pink-400')}
          </nav>
        </div>
      </div>

      {/* User Status Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
            <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <div className="hidden md:flex h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
          <div className="relative z-10 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
