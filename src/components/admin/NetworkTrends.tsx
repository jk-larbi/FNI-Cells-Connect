import React, { useState } from 'react';
import { Cell, WeeklyReport } from '../../types';
import { formatDate } from '../../lib/storage';
import { TrendingUp, Users, HeartHandshake, Flame, Download } from 'lucide-react';

interface NetworkTrendsProps {
  cells: Cell[];
  reports: WeeklyReport[];
}

export const NetworkTrends: React.FC<NetworkTrendsProps> = ({
  cells,
  reports
}) => {
  const [metric, setMetric] = useState<'attendance' | 'souls' | 'visitors'>('attendance');

  // Extract unique weeks sorted chronologically
  const validReports = reports.filter(r => r.status === 'Approved' || r.status === 'Submitted');
  const uniqueWeeks = Array.from(new Set(validReports.map(r => r.week))).sort().slice(-6);

  const weeklyData = uniqueWeeks.map(w => {
    const weekReps = validReports.filter(r => r.week === w);
    const attendance = weekReps.reduce((sum, r) => sum + r.att, 0);
    const souls = weekReps.reduce((sum, r) => sum + r.souls, 0);
    const visitors = weekReps.reduce((sum, r) => sum + r.vis, 0);
    const followups = weekReps.reduce((sum, r) => sum + r.fu, 0);
    const outreaches = weekReps.reduce((sum, r) => sum + r.evg, 0);
    const reportingCells = weekReps.length;

    return {
      week: w,
      attendance,
      souls,
      visitors,
      followups,
      outreaches,
      reportingCells
    };
  });

  // Calculate maximum for scaling the bars
  const maxAtt = Math.max(1, ...weeklyData.map(d => d.attendance));
  const maxSouls = Math.max(1, ...weeklyData.map(d => d.souls));
  const maxVis = Math.max(1, ...weeklyData.map(d => d.visitors));

  const currentMax = metric === 'attendance' ? maxAtt : metric === 'souls' ? maxSouls : maxVis;

  const handleExportCSV = () => {
    const headers = ['Week', 'Attendance', 'Souls Won', 'Visitors', 'Follow-ups', 'Evangelism Outreaches', 'Reporting Cells'];
    const rows = weeklyData.map(d => [
      d.week,
      d.attendance,
      d.souls,
      d.visitors,
      d.followups,
      d.outreaches,
      d.reportingCells
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'FNI_Network_Trends.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F2447] tracking-tight font-serif-title">
            Network Performance & Growth Trends
          </h1>
          <p className="text-sm text-[#5B6472] mt-0.5">
            Macro analysis of attendance, soul-winning, and discipleship across all registered cells
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F2447] bg-white border border-[#E3E6EB] hover:bg-slate-50 rounded transition-colors self-start sm:self-auto shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-[#B8923A]" />
          <span>Export Trends CSV</span>
        </button>
      </div>

      {/* Main Trends Visual Panel */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E6EB] pb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0F2447]">
              Weekly Performance Trajectory
            </h2>
            <p className="text-xs text-[#5B6472] mt-0.5">
              {weeklyData.length > 0 
                ? `Comparative view over the past ${weeklyData.length} reporting weeks`
                : 'Awaiting initial weekly reporting returns'}
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1 p-1 bg-[#F6F7F9] rounded border border-[#E3E6EB] self-start sm:self-auto">
            <button
              onClick={() => setMetric('attendance')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                metric === 'attendance'
                  ? 'bg-[#0F2447] text-white shadow-xs'
                  : 'text-[#5B6472] hover:text-[#0F2447]'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setMetric('souls')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                metric === 'souls'
                  ? 'bg-[#0F2447] text-white shadow-xs'
                  : 'text-[#5B6472] hover:text-[#0F2447]'
              }`}
            >
              Souls Won
            </button>
            <button
              onClick={() => setMetric('visitors')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                metric === 'visitors'
                  ? 'bg-[#0F2447] text-white shadow-xs'
                  : 'text-[#5B6472] hover:text-[#0F2447]'
              }`}
            >
              Visitors
            </button>
          </div>
        </div>

        {weeklyData.length === 0 ? (
          <div className="py-14 px-4 text-center text-xs text-[#5B6472] space-y-2">
            <TrendingUp className="w-8 h-8 text-[#AEB9CF] mx-auto mb-2" />
            <p className="font-semibold text-sm text-[#0F2447]">No weekly reporting returns recorded yet</p>
            <p className="text-xs text-[#8C95A3] max-w-md mx-auto leading-relaxed">
              As cell leaders submit their weekly returns and central leadership approves them, comparative attendance trajectories, soul-winning milestones, and outreach counts will render here automatically.
            </p>
          </div>
        ) : (
          <div className="pt-4">
            <div className="flex items-end justify-between gap-3 sm:gap-6 h-48 border-b border-[#E3E6EB] px-4 pb-0">
              {weeklyData.map((d) => {
                const val = metric === 'attendance' ? d.attendance : metric === 'souls' ? d.souls : d.visitors;
                const heightPct = Math.max(12, Math.round((val / currentMax) * 160));
                const isLatest = d.week === weeklyData[weeklyData.length - 1]?.week;

                return (
                  <div key={d.week} className="flex-1 flex flex-col items-center justify-end group">
                    <div className="text-xs font-semibold text-[#0F2447] mb-1.5 tabular-nums">
                      {val}
                    </div>
                    <div
                      style={{ height: `${heightPct}px` }}
                      className={`w-full max-w-[48px] rounded-t transition-all ${
                        metric === 'souls'
                          ? 'bg-[#B8923A] group-hover:bg-[#9E7C2E]'
                          : isLatest
                          ? 'bg-[#0F2447]'
                          : 'bg-[#18325C] group-hover:bg-[#0F2447]'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Week Labels Underneath */}
            <div className="flex items-center justify-between gap-3 sm:gap-6 px-4 pt-2">
              {weeklyData.map((d) => (
                <div key={d.week} className="flex-1 text-center text-[11px] text-[#5B6472] font-medium truncate">
                  {formatDate(d.week).slice(0, 6)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Aggregate Numerical Summary Table */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-[#E3E6EB]">
          <h2 className="text-sm font-semibold text-[#0F2447]">
            Historical Network Totals by Week
          </h2>
        </div>

        {weeklyData.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5B6472]">
            No historical records yet. The national registry will track attendance each Monday.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#5B6472] border-b border-[#E3E6EB] uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Reporting Week</th>
                  <th className="py-2.5 px-4 text-right">Reporting Cells</th>
                  <th className="py-2.5 px-4 text-right">Total Attendance</th>
                  <th className="py-2.5 px-4 text-right">First-time Visitors</th>
                  <th className="py-2.5 px-4 text-right">Souls Won</th>
                  <th className="py-2.5 px-4 text-right">Follow-ups</th>
                  <th className="py-2.5 px-4 text-right">Outreaches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EB]">
                {weeklyData.map((d) => (
                  <tr key={d.week} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#0F2447] whitespace-nowrap">
                      Week of {formatDate(d.week)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {d.reportingCells} / {cells.length}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-[#0F2447]">
                      {d.attendance}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {d.visitors}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-[#B8923A]">
                      {d.souls}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {d.followups}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {d.outreaches}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
