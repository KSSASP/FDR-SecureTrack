import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { StatCard } from '../components/common/StatCard.js';
import { Badge } from '../components/common/Badge.js';
import {
  FolderOpen,
  CheckCircle2,
  CalendarDays,
  AlertOctagon,
  FileCheck2,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Download,
  Building2,
  PlusCircle,
  Eye,
  Info,
  Clock,
  Check,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Scale
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/reports/dashboard')
      .then(res => setData(res))
      .catch(err => console.error('Dashboard load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium">Loading Command Center telemetry...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const charts = data?.charts || {};
  const recent = data?.recentSubmissions || [];

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  const riskColors = {
    LOW: '#10b981',
    MEDIUM: '#f59e0b',
    HIGH: '#f97316',
    CRITICAL: '#f43f5e'
  };

  const totalInstruments = metrics.totalInstruments || 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Top Hero Banner (Matching VerifyFlow AI Screenshot 2) */}
      <div className="bg-gradient-to-r from-[#171936] via-[#221B47] to-[#451B54] border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-teal-400 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              <span>COMMAND CENTER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'Officer'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Signed in as <span className="text-white font-semibold">{user?.role?.replace('_', ' ')}</span>. This overview shows only live data from the FDR SecureTrack server.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/fdrs/new')}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 shadow-lg shadow-rose-500/25 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit New FDR</span>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-200 bg-[#1A1D38] hover:bg-[#252A50] border border-white/10 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Tricolor Progress Indicator Strip (Amber - White - Emerald) */}
        <div className="relative z-10 mt-6 h-1 w-full rounded-full bg-gradient-to-r from-amber-500 via-white to-emerald-500 opacity-90 shadow-sm" />
      </div>

      {/* Admin Operations Section (Matching Screenshot 2 Quick Queues) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Admin operations</h2>
            <p className="text-xs text-slate-400">Live deposit access and case handoffs. Open a queue to act on its records.</p>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors"
          >
            <span>Governance & Insights</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Deposit Accounts"
            value={metrics.totalInstruments}
            icon={FolderOpen}
            subtext={`Secured: ${formatCurrency(metrics.totalSecuredAmount)}`}
            variant="blue"
            onClick={() => navigate('/fdrs')}
          />
          <StatCard
            title="Verified Under Validity"
            value={metrics.activeInstruments}
            icon={CheckCircle2}
            subtext="Compliance satisfied"
            variant="emerald"
            onClick={() => navigate('/fdrs?status=VERIFIED')}
          />
          <StatCard
            title="Maturity Escalations"
            value={metrics.maturingWithin30Days}
            icon={CalendarDays}
            subtext="Maturing in ≤ 30 days"
            variant="amber"
            onClick={() => navigate('/maturity')}
          />
          <StatCard
            title="Discrepancies & Flags"
            value={metrics.recordsWithDiscrepancies ?? metrics.highRiskCases ?? 0}
            icon={ShieldAlert}
            subtext="Manager decisions needed"
            variant="rose"
            onClick={() => navigate('/workbench')}
          />
        </div>
      </div>

      {/* Live System Signal Banner */}
      <div className="bg-[#101935] border border-blue-500/20 text-blue-200 rounded-xl px-4 py-3 text-xs flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>
            Includes <strong className="text-white font-semibold">{metrics.totalInstruments}</strong> institutional security deposits. All validation and duplicate cross-checks are cryptographically grounded.
          </span>
        </div>
        <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
          TLS 1.3 / SHA-256
        </span>
      </div>

      {/* Operations & Governance Distribution Section (Matching Screenshot 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Repository Status Breakdown (Screenshot 3 Applications card layout) */}
        <div className="lg:col-span-6 bg-[#121528] border border-white/5 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Repository Status</h3>
                <p className="text-[11px] text-slate-400">Current lifecycle states</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Now</span>
            </div>
          </div>

          {/* Status Breakdown Progress Bars */}
          <div className="space-y-3 pt-1">
            {(() => {
              const statusRows = [
                {
                  label: 'Pending Verification',
                  count: metrics.pendingVerification || 0,
                  color: 'bg-blue-500',
                  badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                },
                {
                  label: 'Needs Review / Deficient',
                  count: metrics.recordsWithDiscrepancies ?? metrics.highRiskCases ?? 0,
                  color: 'bg-amber-400',
                  badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                },
                {
                  label: 'Verified & Active',
                  count: metrics.activeInstruments || 0,
                  color: 'bg-emerald-500',
                  badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                },
                {
                  label: 'Matured / Expired',
                  count: metrics.alreadyMatured || 0,
                  color: 'bg-rose-500',
                  badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }
              ];

              return statusRows.map((row, idx) => {
                const pct = totalInstruments > 0 ? Math.round((row.count / totalInstruments) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${row.badge}`}>
                        {row.label}
                      </span>
                      <span className="font-mono text-slate-300 text-[11px]">
                        <strong className="text-white font-bold">{row.count}</strong> ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#181C35] rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${row.color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-2 border-t border-white/5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Status Volume Distribution
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.statusDistribution || []} margin={{ top: 5, right: 10, left: -25, bottom: 15 }}>
                  <XAxis dataKey="status" tick={{ fill: '#94A3B8', fontSize: 9 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#16192E', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Composite Risk Distribution Donut Chart (Scenario 32 Compliant) */}
        <div className="lg:col-span-6 bg-[#121528] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Composite Risk Distribution</h3>
                  <p className="text-[11px] text-slate-400">Explainable AI & discrepancy factor scoring</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Now</span>
              </div>
            </div>
          </div>

          {/* Donut Chart Area */}
          <div className="h-64 w-full relative">
            {(!charts.riskDistribution || charts.riskDistribution.length === 0 || (charts.riskDistribution || []).reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0) === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <ShieldAlert className="w-8 h-8 text-slate-500 mb-1.5" />
                <span>No risk distribution data available</span>
              </div>
            ) : (
              (() => {
                const totalRisk = (charts.riskDistribution || []).reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0);
                const enrichedData = (charts.riskDistribution || []).map((entry: any) => {
                  const count = Number(entry.count) || 0;
                  const pct = totalRisk > 0 ? (count / totalRisk) * 100 : 0;
                  return {
                    ...entry,
                    count,
                    percentage: Number(pct.toFixed(1))
                  };
                });

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                      <Pie
                        data={enrichedData}
                        dataKey="count"
                        nameKey="level"
                        cx="50%"
                        cy="45%"
                        innerRadius={46}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {enrichedData.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={(riskColors as any)[entry.level] || '#94a3b8'}
                            stroke="#121528"
                            strokeWidth={3}
                          />
                        ))}
                      </Pie>

                      {/* Donut Center Count */}
                      <text x="50%" y="42%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-white font-mono">
                        {totalRisk}
                      </text>
                      <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-medium fill-slate-400 uppercase tracking-wider">
                        Cases
                      </text>

                      {/* Rich Tooltip */}
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-[#16192E] text-white text-xs px-3.5 py-2.5 rounded-xl shadow-2xl border border-white/10 space-y-1 z-50">
                                <div className="font-bold flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: (riskColors as any)[d.level] || '#94a3b8' }}
                                  />
                                  <span>{d.level} Risk Tier</span>
                                </div>
                                <div className="text-slate-300 text-[11px]">
                                  Instruments: <span className="font-semibold text-white">{d.count}</span>
                                </div>
                                <div className="text-slate-400 text-[10px]">
                                  Share: <span className="font-semibold text-emerald-400">{d.percentage}%</span> of repository
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      {/* Legend with Category, Count, and Percentage */}
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        wrapperStyle={{ paddingTop: 10 }}
                        formatter={(value, entry: any) => {
                          const item = entry.payload;
                          return (
                            <span className="text-[11px] text-slate-300 font-medium ml-0.5">
                              {value}: <span className="font-bold text-white">{item.count}</span>{' '}
                              <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                            </span>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()
            )}
          </div>

          {/* Rule pass progress indicator (Screenshot 3 style) */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Low Risk Rule Compliance</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {(() => {
                  const lowCount = (charts.riskDistribution || []).find((r: any) => r.level === 'LOW')?.count || 0;
                  const total = (charts.riskDistribution || []).reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0);
                  return total > 0 ? `${Math.round((lowCount / total) * 100)}%` : '0%';
                })()}
              </span>
            </div>
            <div className="w-full bg-[#181C35] rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: (() => {
                    const lowCount = (charts.riskDistribution || []).find((r: any) => r.level === 'LOW')?.count || 0;
                    const total = (charts.riskDistribution || []).reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0);
                    return total > 0 ? `${Math.round((lowCount / total) * 100)}%` : '0%';
                  })()
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Issuing Banks & Top Institutions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issuing Banks */}
        <div className="bg-[#121528] border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Issuing Bank Distribution</h3>
              <p className="text-[11px] text-slate-400">Institutional exposure across financial partners</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Live Scrutiny</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={charts.bankDistribution || []}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#CBD5E1', fontSize: 10 }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#16192E', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Institution Deposit Volume */}
        <div className="bg-[#121528] border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Deposit Volume by Institution</h3>
              <p className="text-[11px] text-slate-400">Sum of actively secured deposit receipts</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Lakhs (₹)</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.institutionDistribution || []} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <XAxis dataKey="institution" tick={{ fill: '#94A3B8', fontSize: 9 }} interval={0} angle={-20} textAnchor="end" />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} tickFormatter={(val) => `₹${val / 100000}L`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#16192E', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', fontSize: '11px' }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Total Secured']}
                />
                <Bar dataKey="total_amount" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Preloaded FDR Repository Table (Dark Glass Container) */}
      <div className="bg-[#121528] border border-white/5 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1020]">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Preloaded FDR Repository & Verification Scrutiny</h3>
            <p className="text-xs text-slate-400">Official security instruments associated with regulatory approvals</p>
          </div>
          <button
            onClick={() => navigate('/fdrs')}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <span>View All Records in Repository</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#15182D] border-b border-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">FDR Reference Number</th>
                <th className="py-3 px-4">Bank Name</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4">Risk / Review Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recent.map((fdr: any) => (
                <tr key={fdr.id} className="hover:bg-[#181C35] transition-colors">
                  <td className="py-3 px-4 font-medium truncate max-w-[200px]">
                    <div className="font-semibold text-white truncate">{fdr.institution_name}</div>
                    <span className="text-[10px] text-slate-400 font-mono">Ref: {fdr.linked_application_ref || 'N/A'}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-rose-300">
                    {fdr.fdr_number}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div className="font-medium text-white">{fdr.bank_name}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{fdr.branch_name}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-white whitespace-nowrap font-mono">
                    {formatCurrency(fdr.amount)}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                    {fdr.issue_date || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                    {fdr.maturity_date}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Badge type="verification" value={fdr.verification_status} />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Badge type="risk" value={fdr.risk_level} />
                      <span className="text-[10px] font-mono text-slate-400">({fdr.risk_score}/100)</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/fdrs/${fdr.id}`)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View FDR</span>
                    </button>
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
