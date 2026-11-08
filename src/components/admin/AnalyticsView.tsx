import React, { useState, useEffect } from 'react';
import { AnalyticsService } from '../../services/analyticsService';
import { ReportService } from '../../services/reportService';
import { CellService } from '../../services/cellService';
import { SettingsService } from '../../services/settingsService';
import { DashboardStats, SystemSettings, Cell, Region } from '../../types';
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
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([]);
  const [regionalStats, setRegionalStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedCell, setSelectedCell] = useState('All');
  const [timeDimension, setTimeDimension] = useState<'weekly' | 'monthly' | 'quarterly' | 'ytd'>('weekly');
  const [selectedMetric, setSelectedMetric] = useState<'attendance' | 'souls' | 'offerings' | 'compliance'>('souls');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dashStats, sysSettings, cellList, regList, trends, regStats] = await Promise.all([
        AnalyticsService.getDashboardStats('admin'),
        SettingsService.getSettings(),
        CellService.getCells(),
        ReportService.getRegions(),
        AnalyticsService.getWeeklyTrends('admin'),
        AnalyticsService.getRegionalPerformance(),
      ]);
      setStats(dashStats);
      setSettings(sysSettings);
      setCells(cellList);
      setRegions(regList);
      setWeeklyTrends(trends);
      setRegionalStats(regStats);
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

        {/* Comparative Trend Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {timeDimension === 'weekly' && [
            { label: 'Week 1 (Oct)', val: selectedMetric === 'souls' ? 4 : selectedMetric === 'attendance' ? 48 : selectedMetric === 'offerings' ? 'GHS 420.00' : '92%', delta: '+12%' },
            { label: 'Week 2 (Oct)', val: selectedMetric === 'souls' ? 7 : selectedMetric === 'attendance' ? 56 : selectedMetric === 'offerings' ? 'GHS 510.00' : '95%', delta: '+16%' },
            { label: 'Week 3 (Oct)', val: selectedMetric === 'souls' ? 6 : selectedMetric === 'attendance' ? 59 : selectedMetric === 'offerings' ? 'GHS 490.00' : '91%', delta: '-4%' },
            { label: 'Week 4 (Current)', val: selectedMetric === 'souls' ? stats.soulsWon : selectedMetric === 'attendance' ? stats.totalAttendance : selectedMetric === 'offerings' ? 'GHS 620.00' : `${stats.complianceRate}%`, delta: '+18%' },
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
              <div className="text-lg font-black text-navy-950 mt-1">{item.val}</div>
              <span className="text-[10px] text-emerald-700 font-bold mt-0.5 inline-block">{item.delta} vs prev cycle</span>
            </div>
          ))}

          {timeDimension === 'monthly' && [
            { label: 'August 2026', val: selectedMetric === 'souls' ? 24 : selectedMetric === 'attendance' ? 190 : selectedMetric === 'offerings' ? 'GHS 1,850.00' : '88%', delta: 'Base' },
            { label: 'September 2026', val: selectedMetric === 'souls' ? 31 : selectedMetric === 'attendance' ? 218 : selectedMetric === 'offerings' ? 'GHS 2,100.00' : '92%', delta: '+29%' },
            { label: 'October 2026', val: selectedMetric === 'souls' ? 38 : selectedMetric === 'attendance' ? 245 : selectedMetric === 'offerings' ? 'GHS 2,450.00' : '94%', delta: '+22%' },
            { label: 'November (MTD)', val: selectedMetric === 'souls' ? stats.soulsWon : selectedMetric === 'attendance' ? stats.totalAttendance : selectedMetric === 'offerings' ? 'GHS 1,220.00' : `${stats.complianceRate}%`, delta: 'In Progress' },
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
              <div className="text-lg font-black text-navy-950 mt-1">{item.val}</div>
              <span className="text-[10px] text-navy-700 font-bold mt-0.5 inline-block">{item.delta}</span>
            </div>
          ))}

          {timeDimension === 'quarterly' && [
            { label: 'Q1 2026', val: selectedMetric === 'souls' ? 82 : selectedMetric === 'attendance' ? 620 : selectedMetric === 'offerings' ? 'GHS 6,400.00' : '90%', delta: '+14%' },
            { label: 'Q2 2026', val: selectedMetric === 'souls' ? 98 : selectedMetric === 'attendance' ? 710 : selectedMetric === 'offerings' ? 'GHS 7,150.00' : '93%', delta: '+19%' },
            { label: 'Q3 2026', val: selectedMetric === 'souls' ? 112 : selectedMetric === 'attendance' ? 790 : selectedMetric === 'offerings' ? 'GHS 8,200.00' : '95%', delta: '+14%' },
            { label: 'Q4 2026 (Projected)', val: selectedMetric === 'souls' ? 130 : selectedMetric === 'attendance' ? 850 : selectedMetric === 'offerings' ? 'GHS 9,000.00' : '96%', delta: '+16%' },
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
              <div className="text-lg font-black text-navy-950 mt-1">{item.val}</div>
              <span className="text-[10px] text-emerald-700 font-bold mt-0.5 inline-block">{item.delta}</span>
            </div>
          ))}

          {timeDimension === 'ytd' && [
            { label: '2025 Full Year (Prior)', val: selectedMetric === 'souls' ? 295 : selectedMetric === 'attendance' ? 2100 : selectedMetric === 'offerings' ? 'GHS 21,500.00' : '87%', delta: 'Historical' },
            { label: '2026 Target Goal', val: selectedMetric === 'souls' ? soulTarget : selectedMetric === 'attendance' ? 3500 : selectedMetric === 'offerings' ? 'GHS 35,000.00' : '100%', delta: 'Benchmark' },
            { label: '2026 YTD Actual', val: selectedMetric === 'souls' ? stats.soulsWon : selectedMetric === 'attendance' ? stats.totalAttendance : selectedMetric === 'offerings' ? 'GHS 23,200.00' : `${stats.complianceRate}%`, delta: '+38% vs 2025' },
            { label: 'Year-End Forecast', val: selectedMetric === 'souls' ? Math.round(stats.soulsWon * 1.4) : selectedMetric === 'attendance' ? 3100 : selectedMetric === 'offerings' ? 'GHS 31,000.00' : '94%', delta: 'On Track' },
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
              <div className="text-lg font-black text-navy-950 mt-1">{item.val}</div>
              <span className="text-[10px] text-gold-700 font-bold mt-0.5 inline-block">{item.delta}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Regional & Cell Performance Comparison (Reference Image Table Styled) */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#182230]">
              Regional Breakdown & Compliance
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Live aggregation of attendance, soul-winning harvest, and submission compliance by hub.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#142B4A]">
            Ghana / Africa / Europe Hubs
          </span>
        </div>

        <div className="table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">
                  <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                </th>
                <th className="py-3 px-4">REGION HUB</th>
                <th className="py-3 px-4">ACTIVE CELLS</th>
                <th className="py-3 px-4">ATTENDANCE</th>
                <th className="py-3 px-4">SOULS WON</th>
                <th className="py-3 px-4">COMPLIANCE</th>
                <th className="py-3 px-5 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {regionalStats.map(reg => (
                <tr key={reg.id} className="hover:bg-[#F5F7FA] transition-colors">
                  <td className="py-4 px-5 text-center">
                    <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                        {reg.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-[#182230] leading-tight">
                          {reg.name}
                        </div>
                        <div className="text-[11px] text-[#667085] mt-0.5">
                          Code: {reg.code}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="font-bold text-[#182230] text-sm">
                      {reg.cells}
                    </span>
                    <div className="text-[10px] text-[#667085]">Fellowship Cells</div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="font-bold text-[#182230] text-sm">
                      {reg.attendance}
                    </span>
                    <div className="text-[10px] text-[#667085]">Turnout</div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="font-bold text-[#23845B] text-sm">
                      +{reg.souls}
                    </span>
                    <div className="text-[10px] text-[#23845B]">Souls Won</div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="font-bold text-[#182230] text-sm">
                      {reg.compliance}%
                    </span>
                    <div className="w-24 bg-[#E3E8EF] rounded-full h-1.5 mt-1">
                      <div
                        className="bg-[#23845B] h-full rounded-full"
                        style={{ width: `${reg.compliance}%` }}
                      />
                    </div>
                  </td>

                  <td className="py-4 px-5 whitespace-nowrap text-right">
                    {reg.compliance >= 70 ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#23845B]">
                        <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                        On Track
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#D99A32]">
                        <span className="w-2 h-2 rounded-full bg-[#D99A32]" />
                        Attention Needed
                      </span>
                    )}
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
