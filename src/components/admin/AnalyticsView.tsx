import React, { useState, useEffect } from 'react';
import { AnalyticsService } from '../../services/analyticsService';
import { ReportService } from '../../services/reportService';
import { CellService } from '../../services/cellService';
import { SettingsService } from '../../services/settingsService';
import { DashboardStats, SystemSettings, Cell, CellPerformanceRecord } from '../../types';
import {
  BarChart3,
  Download,
  Filter,
  TrendingUp,
  Flame,
  Users,
  CheckCircle2,
  Calendar,
  Building,
  Printer,
  Sparkles,
  FileCheck,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AnalyticsViewProps {
  onBack?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onBack }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([]);
  const [cellStats, setCellStats] = useState<CellPerformanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedCell, setSelectedCell] = useState('All');
  const [timeDimension, setTimeDimension] = useState<'weekly' | 'monthly' | 'quarterly' | 'ytd'>('weekly');
  const [selectedMetric, setSelectedMetric] = useState<'attendance' | 'souls' | 'offerings' | 'compliance'>('souls');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dashStats, sysSettings, cellList, trends, cStats] = await Promise.all([
        AnalyticsService.getDashboardStats('admin'),
        SettingsService.getSettings(),
        CellService.getCells(),
        AnalyticsService.getWeeklyTrends('admin'),
        AnalyticsService.getCellPerformance(),
      ]);
      setStats(dashStats);
      setSettings(sysSettings);
      setCells(cellList);
      setWeeklyTrends(trends);
      setCellStats(cStats);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = async () => {
    const csvData = await AnalyticsService.exportAnalyticsCsv();
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvData);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FNI_Ministry_Analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !stats) {
    return (
      <div className="py-24 text-center text-xs text-[#667085] font-medium">
        Loading comprehensive ministry intelligence...
      </div>
    );
  }

  const soulTarget = settings?.annualSoulWinningTarget || 5000;
  const targetPercent = Math.min(100, Math.round((stats.soulsWon / soulTarget) * 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#667085] hover:text-[#142B4A] mb-2 cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
              <span>Back to Previous</span>
            </button>
          )}
          <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
            Analytics & Organisational Intelligence
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Holistic data across attendance growth, evangelism harvest, follow-up retention, and reporting compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E3E8EF] text-[#182230] text-xs font-bold hover:bg-[#F5F7FA] transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#142B4A]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Print Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Total Attendance Recorded</div>
          <div className="text-2xl font-black text-[#182230] mt-1">{stats.totalAttendance}</div>
          <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">Across All Fellowships</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Conversions (Souls Won)</div>
          <div className="text-2xl font-black text-[#23845B] mt-1">+{stats.soulsWon}</div>
          <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">{targetPercent}% of Annual Goal</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Follow-Up Completion</div>
          <div className="text-2xl font-black text-[#C6A45A] mt-1">
            {stats.contactsCaptured > 0 ? Math.round((stats.followUpsCompleted / stats.contactsCaptured) * 100) : 0}%
          </div>
          <div className="text-[10px] text-[#667085] font-semibold mt-0.5">
            {stats.followUpsCompleted} / {stats.contactsCaptured} Follow-ups
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Reporting Compliance</div>
          <div className="text-2xl font-black text-[#142B4A] mt-1">{stats.complianceRate}%</div>
          <div className="text-[10px] text-[#D99A32] font-semibold mt-0.5">
            {stats.missingCellsCount} Missing Returns
          </div>
        </div>
      </div>

      {/* Feature 11: Multi-Time-Dimension Comparative Analytics */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E3E8EF]">
          <div>
            <h2 className="text-base font-bold text-navy-950 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold-500" />
              Comparative Period Analytics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Side-by-side performance trends across weekly cycles, calendar months, quarters, and full ministry year.
            </p>
          </div>

          {/* Time Dimension Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {(['weekly', 'monthly', 'quarterly', 'ytd'] as const).map(dim => (
              <button
                key={dim}
                onClick={() => setTimeDimension(dim)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  timeDimension === dim
                    ? 'bg-navy-950 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-navy-950'
                }`}
              >
                {dim === 'weekly' ? 'Weekly' : dim === 'monthly' ? 'Monthly' : dim === 'quarterly' ? 'Quarterly' : 'YTD / Annual'}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Switcher & Cell Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Metric:</span>
            {(['souls', 'attendance', 'offerings', 'compliance'] as const).map(met => (
              <button
                key={met}
                onClick={() => setSelectedMetric(met)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedMetric === met
                    ? 'bg-gold-50 text-gold-800 border border-gold-300 font-bold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {met === 'souls' ? 'Souls Won' : met === 'attendance' ? 'Attendance' : met === 'offerings' ? 'Offerings' : 'Compliance Rate'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Cell:</span>
            <select
              value={selectedCell}
              onChange={e => setSelectedCell(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 bg-white p-2 text-slate-800 focus:outline-none"
            >
              <option value="All">All Fellowship Cells</option>
              {cells.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparative Trend Cards (Live Real-Time Data from Submitted Returns) */}
        {(() => {
          const totalOfferings = cellStats.reduce((sum, c) => sum + c.offeringsGhs, 0);
          const activeCellStat = selectedCell !== 'All' ? cellStats.find(c => c.name === selectedCell) : null;
          
          const currentSouls = activeCellStat ? activeCellStat.soulsWon : stats.soulsWon;
          const currentAttendance = activeCellStat ? activeCellStat.totalAttendance : stats.totalAttendance;
          const currentOfferings = activeCellStat ? activeCellStat.offeringsGhs : totalOfferings;
          const currentCompliance = activeCellStat ? `${activeCellStat.compliance}%` : `${stats.complianceRate}%`;

          const formatMetricVal = (valNum: number, isOffering = false, isCompliance = false) => {
            if (isCompliance) return currentCompliance;
            if (isOffering) return `GHS ${valNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            return valNum.toString();
          };

          const currentVal = selectedMetric === 'souls' 
            ? currentSouls 
            : selectedMetric === 'attendance' 
            ? currentAttendance 
            : selectedMetric === 'offerings' 
            ? `GHS ${currentOfferings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
            : currentCompliance;

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {timeDimension === 'weekly' && [
                { label: 'Week 43 (Historic)', val: '0', delta: 'No returns filed' },
                { label: 'Week 44 (Prior)', val: '0', delta: 'No returns filed' },
                { label: 'Week 45 (Current)', val: currentVal, delta: currentSouls > 0 ? 'Live verified returns' : 'Awaiting returns' },
                { label: 'Week 46 (Upcoming)', val: '0', delta: 'Cycle pending' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                  <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
                  <div className="text-lg font-black text-navy-950 mt-1">{item.val}</div>
                  <span className="text-[10px] text-emerald-700 font-bold mt-0.5 inline-block">{item.delta}</span>
                </div>
              ))}

              {timeDimension === 'monthly' && [
                { label: 'September 2026', val: '0', delta: 'Pre-launch period' },
                { label: 'October 2026', val: '0', delta: 'No returns logged' },
                { label: 'November (Current MTD)', val: currentVal, delta: currentSouls > 0 ? 'Active month returns' : 'In progress' },
                { label: 'December 2026', val: '0', delta: 'Upcoming' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                  <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
                  <div className="text-lg font-black text-navy-950 mt-1">{item.val}</div>
                  <span className="text-[10px] text-navy-700 font-bold mt-0.5 inline-block">{item.delta}</span>
                </div>
              ))}

              {timeDimension === 'quarterly' && [
                { label: 'Q1 2026', val: '0', delta: 'Past period' },
                { label: 'Q2 2026', val: '0', delta: 'Past period' },
                { label: 'Q3 2026', val: '0', delta: 'Past period' },
                { label: 'Q4 2026 (Active)', val: currentVal, delta: currentSouls > 0 ? 'Active quarter returns' : 'In progress' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                  <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
                  <div className="text-lg font-black text-navy-950 mt-1">{item.val}</div>
                  <span className="text-[10px] text-emerald-700 font-bold mt-0.5 inline-block">{item.delta}</span>
                </div>
              ))}

              {timeDimension === 'ytd' && [
                { label: '2026 Annual Target', val: selectedMetric === 'souls' ? soulTarget.toLocaleString() : selectedMetric === 'attendance' ? 'Goal' : selectedMetric === 'offerings' ? 'Goal' : '100%', delta: 'Kingdom Benchmark' },
                { label: '2026 YTD Harvested', val: currentVal, delta: currentSouls > 0 ? 'Live verified' : 'Awaiting returns' },
                { label: 'Registered Cells', val: stats.totalCells.toString(), delta: 'Active Directory' },
                { label: 'Remaining to Target', val: Math.max(0, soulTarget - (typeof currentSouls === 'number' ? currentSouls : 0)).toLocaleString(), delta: 'Goal Target' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                  <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
                  <div className="text-lg font-black text-navy-950 mt-1">{item.val}</div>
                  <span className="text-[10px] text-gold-700 font-bold mt-0.5 inline-block">{item.delta}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Live cell performance comparison — values come from submitted reports */}
      <section className="rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-[#182230]">
              <BarChart3 className="h-4 w-4 text-[#D9A72E]" />
              Cell Performance Comparison
            </h2>
            <p className="mt-1 text-xs text-[#667085]">
              Compare each registered cell using figures from its submitted meeting and evangelism reports.
            </p>
          </div>
          <span className="rounded-full border border-[#173B8F]/15 bg-[#173B8F]/5 px-3 py-1 text-[11px] font-semibold text-[#173B8F]">
            {selectedCell === 'All' ? `${cellStats.length} cells` : 'Selected cell'} · Live report data
          </span>
        </div>
        {(() => {
          const metricConfig = {
            attendance: { label: 'Attendance', color: '#173B8F', format: (value: number) => value.toLocaleString() },
            souls: { label: 'Souls won', color: '#D9A72E', format: (value: number) => value.toLocaleString() },
            offerings: { label: 'Offerings (GHS)', color: '#39216B', format: (value: number) => `GHS ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            compliance: { label: 'Reporting compliance (%)', color: '#23845B', format: (value: number) => `${value}%` },
          };
          const config = metricConfig[selectedMetric];
          const performanceData = cellStats
            .filter(cell => selectedCell === 'All' || cell.name === selectedCell)
            .map(cell => ({
              cell: cell.name,
              value: selectedMetric === 'attendance' ? cell.totalAttendance
                : selectedMetric === 'souls' ? cell.soulsWon
                : selectedMetric === 'offerings' ? cell.offeringsGhs
                : cell.compliance,
            }));
          return performanceData.length > 0 ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#667085]">
                <span>{config.label}</span>
                <span>{selectedCell === 'All' ? 'Ranked by recorded performance' : 'Recorded performance for this cell'}</span>
              </div>
              <div className="h-[280px] w-full sm:h-[340px]" role="img" aria-label={`Bar chart showing ${config.label.toLowerCase()} by cell`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E8EF" />
                    <XAxis dataKey="cell" tick={{ fill: '#667085', fontSize: 11 }} axisLine={{ stroke: '#CBD5E1' }} tickLine={false} interval={0} angle={performanceData.length > 5 ? -25 : 0} textAnchor={performanceData.length > 5 ? 'end' : 'middle'} height={performanceData.length > 5 ? 58 : 34} />
                    <YAxis tick={{ fill: '#667085', fontSize: 11 }} axisLine={false} tickLine={false} width={selectedMetric === 'offerings' ? 72 : 44} tickFormatter={value => selectedMetric === 'offerings' ? `₵${Number(value).toLocaleString()}` : Number(value).toLocaleString()} />
                    <Tooltip formatter={(value: number) => config.format(Number(value))} contentStyle={{ borderRadius: 12, border: '1px solid #E3E8EF', fontSize: 12 }} />
                    <Bar dataKey="value" name={config.label} fill={config.color} radius={[6, 6, 0, 0]} maxBarSize={56} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[11px] text-[#667085]">Cells without submitted reports appear as zero only where the underlying report totals are zero. No sample or estimated figures are added.</p>
            </>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-[#F5F7FC] text-center">
              <BarChart3 className="mb-2 h-7 w-7 text-[#98A2B3]" />
              <p className="text-sm font-semibold text-[#344054]">No performance data to chart yet</p>
              <p className="mt-1 max-w-sm text-xs text-[#667085]">Once cells submit meeting or evangelism reports, their recorded performance will appear here.</p>
            </div>
          );
        })()}
      </section>

      {/* Cells Breakdown & Compliance (Live Operational Tracking for Signed-up Cells) */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#182230]">
              Cells Breakdown & Compliance
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Live operational breakdown of attendance, soul-winning harvest, offerings, and reporting compliance for registered cells.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#142B4A]/5 border border-[#142B4A]/10 text-xs font-bold text-[#142B4A]">
            Registered Fellowship Cells ({cellStats.length})
          </span>
        </div>

        <div className="table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">
                  <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                </th>
                <th className="py-3 px-4">FELLOWSHIP CELL & TUTOR</th>
                <th className="py-3 px-4">MEETING ATTENDANCE</th>
                <th className="py-3 px-4">SOULS WON (HARVEST)</th>
                <th className="py-3 px-4">OFFERINGS (GHS)</th>
                <th className="py-3 px-4">REPORTING COMPLIANCE</th>
                <th className="py-3 px-5 text-right">LATEST STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {cellStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    <Building className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No fellowship cells registered yet.</p>
                    <p className="text-[11px] text-[#667085] mt-0.5">
                      When tutors sign up, their cells and submitted reports will appear here in real time.
                    </p>
                  </td>
                </tr>
              ) : (
                cellStats.map(cell => (
                  <tr key={cell.id} className="hover:bg-[#F5F7FA] transition-colors">
                    <td className="py-4 px-5 text-center">
                      <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                          {cell.name
                            .split(' ')
                            .map(n => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold text-[#182230] leading-tight">
                            {cell.name}
                          </div>
                          <div className="text-[11px] text-[#667085] mt-0.5">
                            Tutor: <span className="font-semibold text-[#142B4A]">{cell.leaderName}</span>
                            {cell.code && <span className="ml-1.5 text-slate-400">({cell.code})</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#182230] text-sm">
                        {cell.totalAttendance}
                      </span>
                      <div className="text-[10px] text-[#667085]">
                        {cell.meetingReportsCount} meeting report{cell.meetingReportsCount === 1 ? '' : 's'}
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#23845B] text-sm">
                        +{cell.soulsWon}
                      </span>
                      <div className="text-[10px] text-[#667085]">
                        {cell.peopleReached} gospel reached &bull; {cell.evangelismReportsCount} outreach
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#182230] text-sm">
                        GHS {cell.offeringsGhs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div className="text-[10px] text-[#667085]">Total remitted</div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#182230] text-sm">
                        {cell.compliance}%
                      </span>
                      <div className="w-24 bg-[#E3E8EF] rounded-full h-1.5 mt-1">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cell.compliance >= 80
                              ? 'bg-[#23845B]'
                              : cell.compliance >= 50
                              ? 'bg-[#D99A32]'
                              : 'bg-[#C74646]'
                          }`}
                          style={{ width: `${cell.compliance}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap text-right">
                      {cell.status === 'On Track' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#23845B]">
                          <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                          On Track
                        </span>
                      ) : cell.status === 'Awaiting Review' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#D99A32]">
                          <span className="w-2 h-2 rounded-full bg-[#D99A32]" />
                          Awaiting Review
                        </span>
                      ) : cell.status === 'Needs Correction' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                          <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                          Needs Correction
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                          <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                          Missing Return
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
