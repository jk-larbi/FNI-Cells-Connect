import React from 'react';
import { Cell, WeeklyReport } from '../../types';
import { StatsGrid } from '../common/StatsGrid';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate, getMonday } from '../../lib/storage';
import { 
  ChevronRight, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { buildWhatsAppLink, formatOverdueWhatsAppReminder } from '../../lib/notifications';

interface AdminDashboardProps {
  cells: Cell[];
  reports: WeeklyReport[];
  onViewReport: (reportId: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  cells,
  reports,
  onViewReport,
  onNavigateToTab
}) => {
  const currentWeek = getMonday();

  // Active cells
  const activeCells = cells.filter(c => c.active);

  // Reports for current week (excluding drafts)
  const currentWeekReports = reports.filter(r => r.week === currentWeek && r.status !== 'Draft');

  // Cells that have reported this week
  const reportedCellIds = new Set(currentWeekReports.map(r => r.cell));
  const missingCells = activeCells.filter(c => !reportedCellIds.has(c.id));

  // Awaiting review (status === 'Submitted')
  const pendingReviewReports = reports.filter(r => r.status === 'Submitted');

  // Total souls won this week
  const soulsWonThisWeek = currentWeekReports.reduce((acc, r) => acc + r.souls, 0);

  const stats = [
    {
      value: activeCells.length,
      label: 'Active cells',
      sublabel: 'Registered fellowships'
    },
    {
      value: `${currentWeekReports.length} / ${activeCells.length}`,
      label: 'Reported this week',
      sublabel: `Week of ${formatDate(currentWeek)}`
    },
    {
      value: pendingReviewReports.length,
      label: 'Awaiting review',
      sublabel: 'Action required'
    },
    {
      value: soulsWonThisWeek,
      label: 'Souls won this week',
      sublabel: 'Across all active cells'
    }
  ];

  const getCellName = (cellId: string) => {
    const c = cells.find(x => x.id === cellId);
    return c ? c.name : 'Unknown Cell';
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-[28px] font-semibold text-[#0F2447] tracking-tight font-serif-title">
          Administrator Overview
        </h1>
        <p className="text-sm text-[#5B6472] mt-0.5">
          Forerunners Network International · Reporting Week of {formatDate(currentWeek)}
        </p>
      </div>

      {/* 4-Column Stat Strip */}
      <StatsGrid stats={stats} />

      {/* Panel 1: Awaiting Review Queue */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-[#E3E6EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#0F2447]">
              Reports Awaiting Review
            </h2>
            {pendingReviewReports.length > 0 && (
              <span className="bg-[#B8923A] text-[#0F2447] text-[11px] font-bold px-2 py-0.5 rounded-full">
                {pendingReviewReports.length}
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigateToTab('rep')}
            className="text-xs text-[#1B3F7A] hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>View all reports</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {pendingReviewReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5B6472] flex flex-col items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2" />
            <p className="font-medium text-[#0F2447]">All submitted reports have been reviewed.</p>
            <span className="text-[11px] text-[#8C95A3] mt-0.5">New submissions will appear here automatically.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#5B6472] border-b border-[#E3E6EB] uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Reporting Week</th>
                  <th className="py-2.5 px-4">Cell Name</th>
                  <th className="py-2.5 px-4 text-right">Attendance</th>
                  <th className="py-2.5 px-4 text-right">Visitors</th>
                  <th className="py-2.5 px-4 text-right">Souls Won</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EB]">
                {pendingReviewReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#0F2447] whitespace-nowrap">
                      Week of {formatDate(rep.week)}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#14213D] whitespace-nowrap">
                      {getCellName(rep.cell)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {rep.att}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {rep.vis}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-[#0F2447]">
                      {rep.souls}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={rep.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onViewReport(rep.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded transition-colors inline-flex items-center gap-1 shadow-2xs"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3 h-3 text-[#B8923A]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel 2: Not Yet Reported This Week */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-[#E3E6EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#0F2447]">
              Not Yet Reported This Week
            </h2>
            {missingCells.length > 0 && (
              <span className="bg-[#FBE5E3] text-[#A32B21] border border-[#F2C4BF] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                {missingCells.length} overdue
              </span>
            )}
          </div>
          <span className="text-xs text-[#5B6472]">
            Target: All active cells report by Monday midnight
          </span>
        </div>

        {missingCells.length === 0 ? (
          <div className="p-8 text-center text-xs text-emerald-800 bg-[#E4F2E8]/40">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
            <p className="font-medium">100% reporting compliance!</p>
            <span className="text-[11px] text-emerald-700">Every active cell has filed a report for the current week.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#5B6472] border-b border-[#E3E6EB] uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Cell Name</th>
                  <th className="py-2.5 px-4">Cell Leader</th>
                  <th className="py-2.5 px-4">Area</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Quick Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EB]">
                {missingCells.map((c) => {
                  const reminderLink = buildWhatsAppLink(
                    c.leaderPhone,
                    formatOverdueWhatsAppReminder(c, currentWeek)
                  );
                  return (
                    <tr key={c.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#0F2447] whitespace-nowrap">
                        {c.name}
                      </td>
                      <td className="py-3 px-4 text-[#14213D] whitespace-nowrap">
                        {c.leader}
                      </td>
                      <td className="py-3 px-4 text-[#5B6472] whitespace-nowrap">
                        {c.area}
                      </td>
                      <td className="py-3 px-4 text-[#5B6472] font-mono text-[11px] whitespace-nowrap">
                        {c.leaderPhone}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status="Overdue" />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <a
                          href={reminderLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#1E6B3A] bg-[#E4F2E8] border border-[#C4E1CC] hover:bg-[#D5EBD9] rounded transition-colors"
                          title="Send pre-filled WhatsApp reminder"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Reminder</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
