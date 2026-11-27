import React from 'react';
import { CellReport } from '../../types';
import { Badge } from '../common/Badge';
import { ArrowUpRight, MessageSquare, Copy, Check, Users, CalendarDays } from 'lucide-react';

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

  const handleCopy = async (text: string, id: string) => {
    if (!text || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(current => current === id ? null : current), 1500);
    } catch {
      setCopiedId(null);
    }
  };

  const recentReports = reports.slice(0, 5);
  const submittedDate = (value?: string | null) => value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : 'Draft';

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-navy-950 uppercase tracking-wider">
            Recent Submissions
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Cell returns awaiting or completed review
          </p>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="shrink-0 min-h-10 text-xs font-semibold text-navy-900 hover:text-navy-700 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {recentReports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-xs text-slate-400">
          No returns submitted yet for this cycle. Click "+ Submit Report" to file your first return.
        </div>
      ) : (
        <>
          {/* Compact cards are easier to scan and operate on phones. */}
          <div className="grid gap-3 md:hidden">
            {recentReports.map(report => (
              <article key={report.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <button
                  type="button"
                  onClick={() => onSelectReport(report)}
                  className="flex w-full min-w-0 items-center gap-3 text-left"
                  aria-label={`Open report from ${report.cell_name}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-navy-100/60 bg-navy-50 text-xs font-bold text-navy-900">
                    {report.cell_name?.slice(0, 2).toUpperCase() || 'FC'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-navy-950">{report.cell_name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">{report.region_name || 'FNI Cell'}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-xs font-medium text-slate-700">{report.submitted_by_name || 'Leader'}</span>
                    <button
                      type="button"
                      onClick={() => void handleCopy(report.submitted_by_name || '', report.id)}
                      disabled={!report.submitted_by_name}
                      aria-label="Copy leader name"
                      title="Copy leader name"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-900 disabled:opacity-40"
                    >
                      {copiedId === report.id
                        ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                        : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <Badge status={report.status} />
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-navy-950">{report.total_attendance}</span>
                    <span className="text-[10px] text-slate-500">attended</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gold-600">+{report.souls_won}</span>
                    <span className="ml-1 text-[10px] text-slate-500">souls</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-[10px] text-slate-500">
                    <CalendarDays className="h-3 w-3" />
                    Submitted {submittedDate(report.submitted_at)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectReport(report)}
                  className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-800"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Review report
                </button>
              </article>
            ))}
          </div>

          {/* Keep the information-dense table for larger screens. */}
          <div className="hidden overflow-x-auto md:block table-scroll-container custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400">
                  <th className="px-2 py-2.5">Cell Name</th>
                  <th className="px-2 py-2.5">Leader</th>
                  <th className="px-2 py-2.5">Status</th>
                  <th className="px-2 py-2.5">Turnout</th>
                  <th className="px-2 py-2.5">Submitted</th>
                  <th className="px-2 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentReports.map(report => (
                  <tr
                    key={report.id}
                    onClick={() => onSelectReport(report)}
                    className="group cursor-pointer transition-colors hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-navy-100/60 bg-navy-50 text-[11px] font-bold text-navy-900">
                          {report.cell_name?.slice(0, 2).toUpperCase() || 'FC'}
                        </div>
                        <div>
                          <div className="font-bold text-navy-950 transition-colors group-hover:text-navy-700">{report.cell_name}</div>
                          <div className="text-[10px] text-slate-400">{report.region_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3">
                      <div className="flex items-center gap-1 font-medium text-slate-700">
                        <span>{report.submitted_by_name || 'Leader'}</span>
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            void handleCopy(report.submitted_by_name || '', report.id);
                          }}
                          disabled={!report.submitted_by_name}
                          className="rounded p-1 text-slate-400 hover:text-navy-900 disabled:opacity-40"
                          title="Copy leader name"
                          aria-label="Copy leader name"
                        >
                          {copiedId === report.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3"><Badge status={report.status} /></td>
                    <td className="whitespace-nowrap px-2 py-3">
                      <span className="font-bold text-navy-950">{report.total_attendance}</span>
                      <span className="ml-1.5 text-[10px] font-semibold text-gold-600">+{report.souls_won} souls</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-[11px] text-slate-400">{submittedDate(report.submitted_at)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right">
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          onSelectReport(report);
                        }}
                        aria-label="Review report"
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-950"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
