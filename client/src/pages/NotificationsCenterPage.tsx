import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Badge } from '../components/common/Badge.js';
import { useToast } from '../context/ToastContext.js';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  ExternalLink,
  ShieldAlert,
  RotateCw
} from 'lucide-react';

export const NotificationsCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ notifications: any[]; unreadCount: number }>('/notifications');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err: any) {
      error(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      success('All notifications marked as read');
    } catch (_) {}
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">ALERT DISPATCH</div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span>Operational Alerts & Escalations Center</span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold font-mono shadow-md shadow-rose-500/30 animate-pulse">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Role-targeted automated notifications for approaching maturities, verification mismatches, duplicate flags, and unresolved escalations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-[#1A1D38] hover:bg-[#252A50] text-slate-300 rounded-xl text-xs font-semibold border border-white/10 transition-colors"
            >
              Mark All as Read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-2.5 bg-[#1A1D38] hover:bg-[#252A50] text-slate-300 rounded-xl border border-white/10 transition-colors"
            title="Refresh Alerts"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications Thread */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-[#121528] p-16 text-center rounded-2xl border border-white/5 shadow-xl">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading alerts...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-[#121528] p-16 text-center rounded-2xl border border-white/5 text-slate-400 shadow-xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-white">No Notifications</p>
            <p className="text-xs text-slate-500 mt-0.5">All operational items are currently up to date.</p>
          </div>
        ) : (
          notifications.map((n: any) => (
            <div
              key={n.id}
              className={`bg-[#121528] rounded-2xl p-5 border shadow-xl transition-all hover:border-white/15 ${
                n.is_read === 0
                  ? 'border-l-4 border-l-rose-500 border-white/10 bg-[#16192E]'
                  : 'border-l-4 border-l-slate-600 border-white/5 opacity-80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl mt-0.5 ${
                    n.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    n.priority === 'URGENT' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                    'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs text-white">{n.title}</h4>
                      <Badge type="priority" value={n.priority} />
                      {n.is_escalated === 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase tracking-wider">
                          Escalated to Super Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] font-mono text-slate-500 mt-1.5 block">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center">
                  {n.is_read === 0 && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-[#1A1D38] hover:bg-[#252A50] border border-white/10 transition-colors"
                    >
                      Mark Read
                    </button>
                  )}
                  {n.fdr_id && (
                    <button
                      onClick={() => {
                        handleMarkAsRead(n.id);
                        navigate(`/fdrs/${n.fdr_id}`);
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <span>Open Case</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
