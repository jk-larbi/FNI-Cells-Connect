import React from 'react';
import { Cell, WeeklyReport } from '../../types';
import { StatsGrid } from '../common/StatsGrid';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate, getMonday } from '../../lib/storage';
import { 
  PlusCircle, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Share2, 
  ChevronRight, 
  Calendar,
  MessageSquare,
  FileText
} from 'lucide-react';
import { buildWhatsAppLink, formatReportWhatsAppMessage } from '../../lib/notifications';

interface LeaderDashboardProps {
  cell: Cell;
  reports: WeeklyReport[];
  onStartReport: (week?: string) => void;
  onViewReport: (reportId: string) => void;
}

export const LeaderDashboard: React.FC<LeaderDashboardProps> = ({
  cell,
  reports,
  onStartReport,
  onViewReport,
}) => {
  const currentWeek = getMonday();
  const sortedReports = [...reports].sort((a, b) => b.week.localeCompare(a.week));
  const currentReport = sortedReports.find(r => r.week === currentWeek);

  const submittedOrApproved = sortedReports.filter(r => r.status === 'Approved' || r.status === 'Submitted');
  const avgAttendance = submittedOrApproved.length > 0
    ? Math.round(submittedOrApproved.reduce((acc, r) => acc + r.att, 0) / submittedOrApproved.length)
    : 0;
  const totalSouls = submittedOrApproved.reduce((acc, r) => acc + r.souls, 0);

  const stats = [
    {
      value: currentReport ? currentReport.status : 'Not submitted',
      label: 'This week’s report',
      sublabel: `Week of ${formatDate(currentWeek)}`
    },
    {
      value: submittedOrApproved.length,
      label: 'Reports submitted',
      sublabel: 'Active ministry cycle'
    },
    {
      value: avgAttendance,
      label: 'Average attendance',
      sublabel: 'Regular cell members'
    },
    {
      value: totalSouls,
      label: 'Souls won in total',
      sublabel: 'Recorded decisions'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Title & Context */}
      <div>
        <h1 className="text-2xl sm:text-[28px] font-semibold text-[#0F2447] tracking-tight font-serif-title">
          {cell.name}
        </h1>
        <p className="text-sm text-[#5B6472] mt-0.5">
          {cell.area} · Leader: {cell.leader} · Week of {formatDate(currentWeek)}
        </p>
      </div>

      {/* 4-Item Statistics Row */}
      <StatsGrid stats={stats} />

      {/* Dynamic Status Action Banner */}
      {!currentReport && (
        <div className="bg-white border border-[#E3E6EB] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F2447]">
              <Clock className="w-4 h-4 text-[#B8923A]" />
              <span>This week’s report is due</span>
            </div>
            <p className="text-xs text-[#5B6472] max-w-xl">
              Please submit attendance, visitors, souls won, and testimonies for the week of {formatDate(currentWeek)}.
            </p>
          </div>
          <button
            onClick={() => onStartReport(currentWeek)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-[#B8923A]" />
            <span>Start Weekly Report</span>
          </button>
        </div>
      )}

      {currentReport && currentReport.status === 'Returned' && (
        <div className="bg-[#FBF0D9] border border-[#EED7A1] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#8A5A00]">
              <AlertCircle className="w-4 h-4 text-[#8A5A00]" />
              <span>Your report was returned for revisions</span>
            </div>
            <p className="text-xs text-[#8A5A00] max-w-xl">
              Reviewer note: &ldquo;{currentReport.note || 'Please review and resubmit with corrected figures.'}&rdquo;
            </p>
          </div>
          <button
            onClick={() => onStartReport(currentWeek)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#8A5A00] hover:bg-[#734A00] rounded transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Edit & Resubmit</span>
          </button>
        </div>
      )}

      {currentReport && currentReport.status === 'Submitted' && (
        <div className="bg-[#E6ECF7] border border-[#CFD8EB] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1B3F7A]">
              <Clock className="w-4 h-4 text-[#1B3F7A]" />
              <span>Weekly report submitted · Awaiting administrator review</span>
            </div>
            <p className="text-xs text-[#1B3F7A] max-w-xl">
              Submitted on {formatDate(currentReport.date)}. The administrator will review your report.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={buildWhatsAppLink(cell.leaderPhone, formatReportWhatsAppMessage(cell, currentReport))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B3F7A] bg-white border border-[#CFD8EB] hover:bg-slate-50 rounded transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-[#1B3F7A]" />
              <span>Share via WhatsApp</span>
            </a>
            <button
              onClick={() => onViewReport(currentReport.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1B3F7A] hover:bg-[#153261] rounded transition-colors"
            >
              <span>View Report</span>
            </button>
          </div>
        </div>
      )}

      {currentReport && currentReport.status === 'Approved' && (
        <div className="bg-[#E4F2E8] border border-[#C4E1CC] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1E6B3A]">
              <CheckCircle2 className="w-4 h-4 text-[#1E6B3A]" />
              <span>Report approved by Administrator</span>
            </div>
            <p className="text-xs text-[#1E6B3A] max-w-xl">
              {currentReport.note ? `Note from administrator: "${currentReport.note}"` : 'Your report has been verified and approved by the administrator.'}
            </p>
          </div>
          <button
            onClick={() => onViewReport(currentReport.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#1E6B3A] bg-white border border-[#C4E1CC] hover:bg-[#D8ECD8] rounded transition-colors shrink-0"
          >
            <span>View Details</span>
          </button>
        </div>
      )}

      {/* Recent Reports Table */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-[#E3E6EB] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0F2447]">
            Recent Weekly Reports
          </h2>
          <span className="text-xs text-[#5B6472]">
            Showing latest {Math.min(5, sortedReports.length)} submissions
          </span>
        </div>

        {sortedReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5B6472]">
            No reports filed yet. Start your first report above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#5B6472] border-b border-[#E3E6EB] uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Reporting Week</th>
                  <th className="py-2.5 px-4 text-right">Attendance</th>
                  <th className="py-2.5 px-4 text-right">Visitors</th>
                  <th className="py-2.5 px-4 text-right">Souls Won</th>
                  <th className="py-2.5 px-4 text-right">Follow-ups</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EB]">
                {sortedReports.slice(0, 5).map((rep) => (
                  <tr key={rep.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#0F2447] whitespace-nowrap">
                      Week of {formatDate(rep.week)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {rep.att}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {rep.vis}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D] font-medium">
                      {rep.souls}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {rep.fu}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={rep.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onViewReport(rep.id)}
                        className="text-[#1B3F7A] hover:text-[#0F2447] font-medium hover:underline inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
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
