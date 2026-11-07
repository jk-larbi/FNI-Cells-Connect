import React from 'react';
import { CellReport } from '../../types';
import { Badge } from '../common/Badge';
import { ArrowUpRight, MessageSquare, MoreVertical, Copy, Check } from 'lucide-react';

interface RecentReportsTableProps {
  reports: CellReport[];
  onSelectReport: (report: CellReport) => void;
  onViewAll?: () => void;
}

export const RecentReportsTable: React.FC<RecentReportsTableProps> = ({
  reports,
  onSelectReport,
  onViewAll,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-navy-950 uppercase tracking-wider">
            Recent Submissions
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time feed of cell returns awaiting or completed review
          </p>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-navy-900 hover:text-navy-700 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="table-scroll-container custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 font-medium text-[11px] border-b border-slate-100">
              <th className="py-2.5 px-2">Cell Name</th>
              <th className="py-2.5 px-2">Leader</th>
              <th className="py-2.5 px-2">Status</th>
              <th className="py-2.5 px-2">Turnout</th>
              <th className="py-2.5 px-2">Submitted</th>
              <th className="py-2.5 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  No returns submitted yet for this cycle. Click "+ Submit Report" to file your first return.
                </td>
              </tr>
            ) : (
              reports.slice(0, 5).map(report => (
              <tr
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
              >
                <td className="py-3 px-2 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-navy-50 text-navy-900 font-bold flex items-center justify-center text-[11px] border border-navy-100/60">
                      {report.cell_name?.slice(0, 2).toUpperCase() || 'FC'}
                    </div>
                    <div>
                      <div className="font-bold text-navy-950 group-hover:text-navy-700 transition-colors">
                        {report.cell_name}
                      </div>
                      <div className="text-[10px] text-slate-400">{report.region_name}</div>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-2 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-slate-700 font-medium">
                    <span>{report.submitted_by_name || 'Leader'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(report.submitted_by_name || '', report.id);
                      }}
                      className="text-slate-400 hover:text-navy-900 p-0.5 rounded"
                      title="Copy leader name"
                    >
                      {copiedId === report.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </td>

                <td className="py-3 px-2 whitespace-nowrap">
                  <Badge status={report.status} />
                </td>

                <td className="py-3 px-2 whitespace-nowrap">
                  <span className="font-bold text-navy-950">{report.total_attendance}</span>
                  <span className="text-[10px] text-gold-600 font-semibold ml-1.5">+{report.souls_won} souls</span>
                </td>

                <td className="py-3 px-2 whitespace-nowrap text-slate-400 text-[11px]">
                  {report.submitted_at
                    ? new Date(report.submitted_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })
                    : 'Draft'}
                </td>

                <td className="py-3 px-2 whitespace-nowrap text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectReport(report);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-navy-950 hover:bg-slate-100 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
