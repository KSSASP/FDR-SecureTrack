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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Operational Alerts & Escalations Center</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold font-mono">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-targeted automated notifications for approaching maturities, verification mismatches, duplicate flags, and unresolved escalations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
            >
              Mark All as Read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors"
            title="Refresh Alerts"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications Thread */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading alerts...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No Notifications</p>
            <p className="text-xs text-slate-500 mt-0.5">All operational items are currently up to date.</p>
          </div>
        ) : (
          notifications.map((n: any) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl p-4 border transition-colors shadow-xs ${
                n.is_read === 0
                  ? 'border-l-4 border-l-blue-600 border-slate-300 bg-blue-50/20'
                  : 'border-l-4 border-l-slate-300 border-slate-200 opacity-80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg mt-0.5 ${
                    n.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                    n.priority === 'URGENT' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs text-slate-900">{n.title}</h4>
                      <Badge type="priority" value={n.priority} />
                      {n.is_escalated === 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-600 text-white font-bold uppercase tracking-wider">
                          Escalated to Super Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center">
                  {n.is_read === 0 && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
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
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 font-semibold text-xs flex items-center gap-1"
                    >
                      <span>Open Case</span>
                      <ExternalLink className="w-3 h-3" />
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
