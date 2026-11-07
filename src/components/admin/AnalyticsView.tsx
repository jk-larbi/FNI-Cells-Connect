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
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');

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
