import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { useToast } from '../context/ToastContext.js';
import {
  Settings,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Lock,
  Cpu,
  Layers
} from 'lucide-react';

export const SystemConfigPage: React.FC = () => {
  const { success, error } = useToast();

  const [integrations, setIntegrations] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [environment, setEnvironment] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/config/system');
      setIntegrations(res.integrations || []);
      setConfigs(res.configs || []);
      setEnvironment(res.environment || {});
    } catch (err: any) {
      error(err.message || 'Failed to load system configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Integrations & Security Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational status of interbank verification adapters, local deterministic parsers, and protected repository storage.
          </p>
        </div>
        <button
          onClick={fetchConfig}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors w-fit"
          title="Refresh Integration State"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Integration Adapter Dashboard */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-700" />
          Active Subsystem & Gateway Integrations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map(item => (
            <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                  <span className="text-[10px] font-mono text-slate-500 block">{item.provider}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  item.status.includes('CONNECTED')
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {item.status}
                </span>
              </div>

              <p className="text-slate-600 leading-relaxed">{item.details}</p>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Classification: {item.category}</span>
                <span>Heartbeat: {new Date(item.lastHeartbeat).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Secret Protection Guarantee */}
      <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200 text-emerald-950 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          <span>Security Compliance & Secret Management Guarantee</span>
        </div>
        <p className="leading-relaxed">
          In strict compliance with regulatory information security standards, secret API keys, private certificates, and authentication tokens are managed via server-side environment variables and are never transmitted to client browsers or exposed in user interfaces.
        </p>
      </div>

      {/* System Parameter Variables */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">Configured Operational Parameters</h3>
          <p className="text-xs text-slate-500">Maturity windows, escalation deadlines, and scoring bounds</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Parameter Key</th>
                <th className="py-2.5 px-4">Configured Value</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {configs.map(c => (
                <tr key={c.key} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{c.key}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-900">{c.value}</td>
                  <td className="py-2.5 px-4 text-slate-600">{c.description}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
