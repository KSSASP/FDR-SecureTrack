import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest } from '../../api/client.js';
import {
  Search,
  Bell,
  Mic,
  LogOut,
  Building,
  UserCheck,
  ExternalLink,
  Menu
} from 'lucide-react';

interface NavbarProps {
  onOpenAssistant?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAssistant, onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Mobile Menu Button & Search Input */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search FDR number, issuing bank, or application ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
          />
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Institution Badge if applicable */}
        {user?.institution_name && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs text-slate-700">
            <Building className="w-3.5 h-3.5 text-blue-700" />
            <span className="font-medium truncate max-w-[200px]">{user.institution_name}</span>
          </div>
        )}

        {/* Tamil & English Voice Assistant Shortcut */}
        <button
          onClick={onOpenAssistant || (() => navigate('/assistant'))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium transition-colors shadow-xs"
          title="Open Tamil & English FDR Voice Assistant"
        >
          <Mic className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span className="hidden sm:inline">Voice Assistant</span>
          <span className="text-[10px] bg-blue-200 text-blue-800 px-1 rounded font-bold">EN / தமிழ்</span>
        </button>

        {/* Notifications Icon with Badge */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Notifications & Escalation Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-500 font-mono">{user?.role?.replace('_', ' ')}</p>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1 p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition-colors"
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
