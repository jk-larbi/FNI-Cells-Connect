import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Search, FileText, Users, Flame } from 'lucide-react';
import { UnifiedReportItem } from '../../types';
import { ReportService } from '../../services/reportService';
import { CellService } from '../../services/cellService';

type ReceivedGroup = 'evangelism' | 'meeting';

const isApproved = (status: string) => status === 'Approved' || status === 'approved';

export const ReceivedReportsView: React.FC = () => {
  const [reports, setReports] = useState<UnifiedReportItem[]>([]);
  const [group, setGroup] = useState<ReceivedGroup>('evangelism');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadReports = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setLoadError('');
      const [queue, activeCells] = await Promise.all([
        ReportService.getUnifiedReviewQueue({ reportType: 'all' }),
        CellService.getActiveCells(),
      ]);
      const activeIds = new Set(activeCells.map(cell => cell.id));
      setReports(queue.filter(report => activeIds.has(report.cellId) && isApproved(report.status)));
    } catch (error) {
      console.error('Could not load the received reports archive:', error);
      setLoadError('The archive could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void loadReports(); }, []);

  useEffect(() => {
    const handleCloudChange = (event: Event) => {
      const table = (event as CustomEvent).detail?.table;
      if (table === '*' || ['cell_meeting_reports', 'evangelism_reports', 'cells'].includes(table)) {
        void loadReports(true);
      }
    };
    window.addEventListener('fni:cloud-data-changed', handleCloudChange);
    return () => window.removeEventListener('fni:cloud-data-changed', handleCloudChange);
  }, []);

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
    <div className="fni-received-reports space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C6A45A]">Report archive</p>
          <h1 className="text-2xl font-black tracking-tight text-[#142B4A]">Received Reports</h1>
          <p className="mt-1 text-sm text-[#667085]">A read-only archive of reports that have been reviewed and accepted.</p>
        </div>
        <button type="button" onClick={() => void loadReports(true)} disabled={refreshing}
          className="min-h-10 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#E3E8EF] bg-white px-4 sm:px-3 py-2 text-xs font-bold text-[#142B4A] hover:bg-[#F5F7FA] disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh archive'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setGroup('evangelism')}
          className={`rounded-2xl border p-4 text-left transition-all ${group === 'evangelism' ? 'border-[#142B4A] bg-[#142B4A] text-white shadow-sm' : 'border-[#E3E8EF] bg-white text-[#142B4A] hover:bg-[#F5F7FA]'}`}>
          <div className="flex items-center justify-between">
            <Flame className={`h-5 w-5 ${group === 'evangelism' ? 'text-[#C6A45A]' : 'text-[#667085]'}`} />
            <span className="text-xl font-black tabular-nums">{loading ? "—" : evangelismCount}</span>
          </div>
          <p className="mt-3 text-sm font-bold">Evangelism</p>
          <p className={`mt-0.5 text-[11px] ${group === 'evangelism' ? 'text-white/70' : 'text-[#667085]'}`}>Accepted outreach reports</p>
        </button>
        <button type="button" onClick={() => setGroup('meeting')}
          className={`rounded-2xl border p-4 text-left transition-all ${group === 'meeting' ? 'border-[#142B4A] bg-[#142B4A] text-white shadow-sm' : 'border-[#E3E8EF] bg-white text-[#142B4A] hover:bg-[#F5F7FA]'}`}>
          <div className="flex items-center justify-between">
            <Users className={`h-5 w-5 ${group === 'meeting' ? 'text-[#C6A45A]' : 'text-[#667085]'}`} />
            <span className="text-xl font-black tabular-nums">{loading ? "—" : meetingCount}</span>
          </div>
          <p className="mt-3 text-sm font-bold">Cell Meeting</p>
          <p className={`mt-0.5 text-[11px] ${group === 'meeting' ? 'text-white/70' : 'text-[#667085]'}`}>Accepted cell meeting reports</p>
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
        <input value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Search by cell, tutor, or outreach location..."
          aria-label="Search accepted reports by cell, tutor, or outreach location"
          className="w-full rounded-xl border border-[#E3E8EF] bg-white py-3 pl-9 pr-11 text-sm text-[#182230] outline-none focus:border-[#142B4A]" />
        {search.trim() && (
          <button type="button" onClick={() => setSearch('')}
            aria-label="Clear archive search" title="Clear search"
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#667085] hover:bg-[#F2F4F7] focus:outline-none focus:ring-2 focus:ring-[#142B4A]">
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#142B4A]">{group === 'evangelism' ? 'Evangelism Reports' : 'Cell Meeting Reports'}</h2>
        <span className="rounded-full bg-[#ECFDF3] px-2.5 py-1 text-[10px] font-bold text-[#027A48]">{loading ? "Loading…" : `${visibleReports.length} accepted`}</span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-10 text-center text-sm text-[#667085]">Loading accepted reports...</div>
      ) : loadError ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
          <p className="text-sm font-bold text-rose-900">Unable to load the archive</p>
          <p className="mt-1 text-xs text-rose-800">{loadError}</p>
          <button type="button" onClick={() => void loadReports()} className="mt-4 min-h-10 rounded-xl bg-[#142B4A] px-4 py-2 text-xs font-bold text-white hover:bg-[#203D63]">
            Try again
          </button>
        </div>
      ) : visibleReports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-5 py-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-[#98A2B3]" />
          <p className="mt-3 text-sm font-bold text-[#142B4A]">{reports.filter(report => report.reportType === group).length === 0 ? 'No accepted reports here yet' : 'No reports match your search'}</p>
          <p className="mt-1 text-xs text-[#667085]">{reports.filter(report => report.reportType === group).length === 0 ? 'Approved reports will appear here automatically.' : 'Try another cell, tutor or location name, or clear your search.'}</p>
          {search.trim() && (
            <button type="button" onClick={() => setSearch('')} className="mt-4 min-h-10 rounded-xl bg-[#142B4A] px-4 py-2 text-xs font-bold text-white hover:bg-[#203D63]">
              Clear search
            </button>
          )}
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
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Attendance</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.attendance ?? '—'}</p></div>
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">New members</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.newMembers ?? '—'}</p></div>
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Offering</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.offering == null ? '—' : `${detail.currency || 'GHS'} ${detail.offering}`}</p></div>
                        {detail.meetingLocation && <div className="sm:col-span-3"><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Meeting location</p><p className="mt-1 text-xs text-[#182230]">{detail.meetingLocation}</p></div>}
                        {detail.scripturalTheme && <div className="sm:col-span-3"><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Scriptural theme</p><p className="mt-1 text-xs text-[#182230]">{detail.scripturalTheme}</p></div>}
                        {detail.tutorNotes && <div className="sm:col-span-3"><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Notes</p><p className="mt-1 whitespace-pre-wrap text-xs text-[#182230]">{detail.tutorNotes}</p></div>}
                      </>
                    ) : (
                      <>
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">People reached</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.peopleSpokenTo ?? '—'}</p></div>
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Conversions</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.conversions ?? '—'}</p></div>
                        <div><p className="text-[10px] font-semibold uppercase text-[#98A2B3]">Contacts captured</p><p className="mt-1 text-xs font-semibold text-[#182230]">{detail.contactsCaptured ?? '—'}</p></div>
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
