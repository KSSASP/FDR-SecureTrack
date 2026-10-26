import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { StatCard } from '../components/common/StatCard.js';
import { Badge } from '../components/common/Badge.js';
import {
  FolderOpen,
  CheckCircle2,
  CalendarDays,
  AlertOctagon,
  FileCheck2,
  ShieldAlert,
  RefreshCw,
  HandCoins,
  ArrowRight,
  TrendingUp,
  Download,
  Building2,
  PlusCircle,
  Eye
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
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Loading repository analytics...</p>
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
    CRITICAL: '#ef4444'
  };

  const statusColors = ['#1d4ed8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Regulatory Dashboard & Repository Summary</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time scrutiny status of institutional security deposits & fixed deposit receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/fdrs/new')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit New FDR</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary 6 Operational Metrics Requested for Regulation Scrutiny */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total FDRs"
          value={metrics.totalInstruments}
          icon={FolderOpen}
          subtext={`Secured: ${formatCurrency(metrics.totalSecuredAmount)}`}
          variant="blue"
          onClick={() => navigate('/fdrs')}
        />
        <StatCard
          title="Active FDRs"
          value={metrics.activeInstruments}
          icon={CheckCircle2}
          subtext="Under active validity"
          variant="emerald"
          onClick={() => navigate('/fdrs?status=VERIFIED')}
        />
        <StatCard
          title="Approaching Maturity"
          value={metrics.maturingWithin30Days}
          icon={CalendarDays}
          subtext="Maturing in ≤ 30 days"
          variant="amber"
          onClick={() => navigate('/maturity')}
        />
        <StatCard
          title="Matured / Expired"
          value={metrics.alreadyMatured}
          icon={AlertOctagon}
          subtext="Overdue for replacement"
          variant="rose"
          onClick={() => navigate('/fdrs?maturityRange=matured')}
        />
        <StatCard
          title="Pending Verification"
          value={metrics.pendingVerification}
          icon={FileCheck2}
          subtext="Awaiting bank confirmation"
          variant="purple"
          onClick={() => navigate('/fdrs?status=PENDING')}
        />
        <StatCard
          title="With Discrepancies"
          value={metrics.recordsWithDiscrepancies ?? metrics.highRiskCases ?? 0}
          icon={ShieldAlert}
          subtext="Unresolved review flags"
          variant="rose"
          onClick={() => navigate('/workbench')}
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Status Distribution */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Repository Status Breakdown</h3>
            <span className="text-[11px] text-slate-400">Total: {metrics.totalInstruments} records</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.statusDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip wrapperClassName="text-xs" />
                <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Bank Distribution */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Issuing Bank Distribution</h3>
            <span className="text-[11px] text-slate-400">Top Financial Institutions</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={charts.bankDistribution || []}
                margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip wrapperClassName="text-xs" />
                <Bar dataKey="count" fill="#0284c7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 3 & 4 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Level Distribution (Pie) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Composite Risk Distribution</h3>
              <span className="text-[11px] font-mono text-slate-500">
                Total: {(charts.riskDistribution || []).reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-2">Explainable AI & discrepancy factor scoring</p>
          </div>

          <div className="h-64 w-full relative">
            {(!charts.riskDistribution || charts.riskDistribution.length === 0 || (charts.riskDistribution || []).reduce((acc: number, curr: any) => acc + (Number(curr.count) || 0), 0) === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <ShieldAlert className="w-8 h-8 text-slate-300 mb-1.5" />
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
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>

                      {/* Donut Center Count */}
                      <text x="50%" y="42%" textAnchor="middle" dominantBaseline="middle" className="text-xl font-bold fill-slate-900 font-mono">
                        {totalRisk}
                      </text>
                      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-medium fill-slate-400 uppercase tracking-wider">
                        Cases
                      </text>

                      {/* Informative Tooltip */}
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-slate-700 space-y-0.5 z-50">
                                <div className="font-bold flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: (riskColors as any)[data.level] || '#94a3b8' }}
                                  />
                                  <span>{data.level} Risk Tier</span>
                                </div>
                                <div className="text-slate-300 text-[11px]">
                                  Instruments: <span className="font-semibold text-white">{data.count}</span>
                                </div>
                                <div className="text-slate-400 text-[10px]">
                                  Share: <span className="font-semibold text-emerald-400">{data.percentage}%</span> of total
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      {/* Legend with Clear Category, Count and Percentage */}
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        wrapperStyle={{ paddingTop: 10 }}
                        formatter={(value, entry: any) => {
                          const item = entry.payload;
                          return (
                            <span className="text-[11px] text-slate-700 font-medium ml-0.5">
                              {value}: <span className="font-bold text-slate-900">{item.count}</span>{' '}
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
        </div>

        {/* Institution-wise Deposit Volume */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Top Institutions by Deposit Volume</h3>
            <span className="text-[11px] text-slate-400">Sum of active deposits</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.institutionDistribution || []} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <XAxis dataKey="institution" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val / 100000}L`} />
                <Tooltip
                  wrapperClassName="text-xs"
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Total Secured']}
                />
                <Bar dataKey="total_amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* FDR Repository Overview Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Preloaded FDR Repository & Verification Scrutiny</h3>
            <p className="text-xs text-slate-500">Official security instruments associated with regulatory approvals</p>
          </div>
          <button
            onClick={() => navigate('/fdrs')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
          >
            <span>View All Records in Repository</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
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
            <tbody className="divide-y divide-slate-100">
              {recent.map((fdr: any) => (
                <tr key={fdr.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-900 font-medium truncate max-w-[200px]">
                    <div className="font-semibold text-slate-800">{fdr.institution_name}</div>
                    <span className="text-[10px] text-slate-400 font-mono">Ref: {fdr.linked_application_ref || 'N/A'}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-900">
                    {fdr.fdr_number}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <div className="font-medium text-slate-800">{fdr.bank_name}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{fdr.branch_name}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(fdr.amount)}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono whitespace-nowrap">
                    {fdr.issue_date || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono whitespace-nowrap">
                    {fdr.maturity_date}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      fdr.verification_status === 'DEMO_VERIFIED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : fdr.verification_status === 'DEMO_MISMATCH'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {fdr.verification_status === 'DEMO_VERIFIED'
                        ? 'Verified (Demo)'
                        : fdr.verification_status === 'DEMO_MISMATCH'
                        ? 'Mismatch (Demo)'
                        : 'Pending Scrutiny'}
                    </span>
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
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
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
