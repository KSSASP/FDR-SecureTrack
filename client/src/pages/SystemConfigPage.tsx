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
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">System Integrations & Security Configuration</h1>
          <p className="text-xs text-slate-400 mt-1">
            Operational status of interbank verification adapters, local deterministic parsers, and protected repository storage.
          </p>
        </div>
        <button
          onClick={fetchConfig}
          className="p-2.5 bg-[#1A1E36] hover:bg-[#202542] text-slate-300 rounded-xl border border-white/10 transition-colors w-fit"
          title="Refresh Integration State"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Integration Adapter Dashboard */}
      <div className="bg-[#121528] rounded-2xl p-6 border border-white/5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-400" />
          Active Subsystem & Gateway Integrations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map(item => (
            <div key={item.id} className="p-4 rounded-xl border border-white/5 bg-[#15182D]/70 text-xs space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-white text-sm">{item.name}</h4>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{item.provider}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  item.status.includes('CONNECTED')
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}>
                  {item.status}
                </span>
              </div>

              <p className="text-slate-300 leading-relaxed text-xs">{item.details}</p>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Classification: <span className="text-slate-300">{item.category}</span></span>
                <span>Heartbeat: <span className="text-indigo-400">{new Date(item.lastHeartbeat).toLocaleTimeString()}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Secret Protection Guarantee */}
      <div className="bg-emerald-500/10 rounded-2xl p-5 border border-emerald-500/20 text-emerald-300 text-xs space-y-2 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Security Compliance & Secret Management Guarantee</span>
        </div>
        <p className="leading-relaxed text-emerald-400/90">
          In strict compliance with regulatory information security standards, secret API keys, private certificates, and authentication tokens are managed via server-side environment variables and are never transmitted to client browsers or exposed in user interfaces.
        </p>
      </div>

      {/* System Parameter Variables */}
      <div className="bg-[#121528] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-[#15182D]/80">
          <h3 className="text-sm font-bold text-white">Configured Operational Parameters</h3>
          <p className="text-xs text-slate-400 mt-0.5">Maturity windows, escalation deadlines, and scoring bounds</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#15182D] text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-white/5">
              <tr>
                <th className="py-3 px-4">Parameter Key</th>
                <th className="py-3 px-4">Configured Value</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {configs.map(c => (
                <tr key={c.key} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white">{c.key}</td>
                  <td className="py-3 px-4 font-mono font-bold text-indigo-400">{c.value}</td>
                  <td className="py-3 px-4 text-slate-300">{c.description}</td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
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
