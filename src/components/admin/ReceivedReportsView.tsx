import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Search, FileText, Users, Flame } from 'lucide-react';
import { UnifiedReportItem } from '../../types';
import { ReportService } from '../../services/reportService';

type ReceivedGroup = 'evangelism' | 'meeting';

const isApproved = (status: string) => status === 'Approved' || status === 'approved';

export const ReceivedReportsView: React.FC = () => {
  const [reports, setReports] = useState<UnifiedReportItem[]>([]);
  const [group, setGroup] = useState<ReceivedGroup>('evangelism');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const queue = await ReportService.getUnifiedReviewQueue({ reportType: 'all' });
      setReports(queue.filter(report => isApproved(report.status)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void loadReports(); }, []);

  const visibleReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports
      .filter(report => report.reportType === group)
      .filter(report => !query ||
        report.cellName.toLowerCase().includes(query) ||
        report.tutorName.toLowerCase().includes(query) ||
        (report.reportType === 'evangelism' && report.location.toLowerCase().includes(query)))
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [reports, group, search]);

  const evangelismCount = reports.filter(report => report.reportType === 'evangelism').length;
  const meetingCount = reports.filter(report => report.reportType === 'meeting').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C6A45A]">Report archive</p>
          <h1 className="text-2xl font-black tracking-tight text-[#142B4A]">Received Reports</h1>
          <p className="mt-1 text-sm text-[#667085]">A read-only archive of reports that have been reviewed and accepted.</p>
        </div>
        <button type="button" onClick={() => void loadReports(true)} disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E3E8EF] bg-white px-3 py-2 text-xs font-bold text-[#142B4A] hover:bg-[#F5F7FA] disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setGroup('evangelism')}
          className={`rounded-2xl border p-4 text-left transition-all ${group === 'evangelism' ? 'border-[#142B4A] bg-[#142B4A] text-white shadow-sm' : 'border-[#E3E8EF] bg-white text-[#142B4A] hover:bg-[#F5F7FA]'}`}>
          <div className="flex items-center justify-between">
            <Flame className={`h-5 w-5 ${group === 'evangelism' ? 'text-[#C6A45A]' : 'text-[#667085]'}`} />
            <span className="text-xl font-black tabular-nums">{evangelismCount}</span>
          </div>
          <p className="mt-3 text-sm font-bold">Evangelism</p>
          <p className={`mt-0.5 text-[11px] ${group === 'evangelism' ? 'text-white/70' : 'text-[#667085]'}`}>Accepted outreach reports</p>
        </button>
        <button type="button" onClick={() => setGroup('meeting')}
          className={`rounded-2xl border p-4 text-left transition-all ${group === 'meeting' ? 'border-[#142B4A] bg-[#142B4A] text-white shadow-sm' : 'border-[#E3E8EF] bg-white text-[#142B4A] hover:bg-[#F5F7FA]'}`}>
          <div className="flex items-center justify-between">
            <Users className={`h-5 w-5 ${group === 'meeting' ? 'text-[#C6A45A]' : 'text-[#667085]'}`} />
            <span className="text-xl font-black tabular-nums">{meetingCount}</span>
          </div>
          <p className="mt-3 text-sm font-bold">Cell Meeting</p>
          <p className={`mt-0.5 text-[11px] ${group === 'meeting' ? 'text-white/70' : 'text-[#667085]'}`}>Accepted cell meeting reports</p>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
        <input value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Search by cell or tutor name..."
          className="w-full rounded-xl border border-[#E3E8EF] bg-white py-3 pl-9 pr-3 text-sm text-[#182230] outline-none focus:border-[#142B4A]" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#142B4A]">{group === 'evangelism' ? 'Evangelism Reports' : 'Cell Meeting Reports'}</h2>
        <span className="rounded-full bg-[#ECFDF3] px-2.5 py-1 text-[10px] font-bold text-[#027A48]">{visibleReports.length} accepted</span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-10 text-center text-sm text-[#667085]">Loading accepted reports...</div>
      ) : visibleReports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-[#98A2B3]" />
          <p className="mt-3 text-sm font-bold text-[#142B4A]">No accepted reports here yet</p>
          <p className="mt-1 text-xs text-[#667085]">Reports will appear in this section after an administrator approves them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleReports.map(report => {
            const meeting = report.reportType === 'meeting';
            const detail = report as any;
            const reportDate = meeting ? detail.meetingDate : detail.date;
            return (
              <details key={report.id} className="group rounded-2xl border border-[#E3E8EF] bg-white shadow-2xs">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F7FA] text-[#142B4A]">
                    {meeting ? <Users className="h-5 w-5" /> : <Flame className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#142B4A]">{report.cellName}</p>
                    <p className="mt-0.5 truncate text-xs text-[#667085]">{report.tutorName} · {reportDate || 'Date not recorded'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#ECFDF3] px-2 py-1 text-[10px] font-bold text-[#027A48]">
                    <CheckCircle2 className="h-3 w-3" /> Accepted
                  </div>
                </summary>
                <div className="border-t border-[#E3E8EF] px-4 py-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Report date</p><p className="mt-1 text-xs font-semibold text-[#182230]">{reportDate || '—'}</p></div>
                    <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Submitted</p><p className="mt-1 text-xs font-semibold text-[#182230]">{report.submittedAt ? new Date(report.submittedAt).toLocaleString() : '—'}</p></div>
                    <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Reviewed</p><p className="mt-1 text-xs font-semibold text-[#182230]">{report.reviewedAt ? new Date(report.reviewedAt).toLocaleString() : '—'}</p></div>
                    {meeting ? (
                      <>
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Attendance</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.attendance ?? 0}</p></div>
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">New members</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.newMembers ?? 0}</p></div>
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Offering</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.currency || 'GHS'} {detail.offering ?? 0}</p></div>
                        {detail.meetingLocation && <div className="sm:col-span-3"><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Meeting location</p><p className="mt-1 text-xs text-[#182230]">{detail.meetingLocation}</p></div>}
                        {detail.scripturalTheme && <div className="sm:col-span-3"><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Scriptural theme</p><p className="mt-1 text-xs text-[#182230]">{detail.scripturalTheme}</p></div>}
                        {detail.tutorNotes && <div className="sm:col-span-3"><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Notes</p><p className="mt-1 whitespace-pre-wrap text-xs text-[#182230]">{detail.tutorNotes}</p></div>}
                      </>
                    ) : (
                      <>
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">People reached</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.peopleSpokenTo ?? 0}</p></div>
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Conversions</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.conversions ?? 0}</p></div>
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Contacts captured</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.contactsCaptured ?? 0}</p></div>
                        {detail.location && <div className="sm:col-span-3"><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Outreach location</p><p className="mt-1 text-xs text-[#182230]">{detail.location}</p></div>}
                        {detail.messageUsed && <div className="sm:col-span-3"><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Message shared</p><p className="mt-1 whitespace-pre-wrap text-xs text-[#182230]">{detail.messageUsed}</p></div>}
                        {detail.notes && <div className="sm:col-span-3"><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Notes</p><p className="mt-1 whitespace-pre-wrap text-xs text-[#182230]">{detail.notes}</p></div>}
                      </>
                    )}
                    {report.reviewerComment && <div className="sm:col-span-3 rounded-xl bg-[#F5F7FA] p-3"><p className="text-[10px] font-semibold uppercase text-[#667085]">Administrator comment</p><p className="mt-1 text-xs text-[#182230]">{report.reviewerComment}</p></div>}
                    <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Accepted by</p><p className="mt-1 text-xs font-semibold text-[#182230]">{report.reviewedByName || 'Administrator'}</p></div>
                  </div>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#027A48]"><CheckCircle2 className="h-3.5 w-3.5" /> Read-only archived report</p>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReceivedReportsView;
