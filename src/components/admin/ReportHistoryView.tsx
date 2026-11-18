import React, { useState, useEffect, useMemo } from 'react';
import { useBackHandler } from '../../hooks/useBackHandler';
import {
  FileText,
  Flame,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Eye,
  X,
  Users,
  ChevronDown,
  Archive,
  BookOpen,
  HeartHandshake,
} from 'lucide-react';
import {
  UnifiedReportItem,
  CellMeetingReport,
  EvangelismReport,
  Cell,
  ReportingPeriod,
} from '../../types';
import { ReportService } from '../../services/reportService';
import { CellService } from '../../services/cellService';

interface ReportHistoryViewProps {
  onBack?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const ReportHistoryView: React.FC<ReportHistoryViewProps> = ({ onBack, onNavigateToTab }) => {
  const [reports, setReports] = useState<UnifiedReportItem[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCellId, setSelectedCellId] = useState('all');
  const [selectedTutorId, setSelectedTutorId] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'meeting' | 'evangelism'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPeriodId, setSelectedPeriodId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Report Detail Modal
  const [inspectingReport, setInspectingReport] = useState<UnifiedReportItem | null>(null);

  // Back navigation interceptor: closes report details before navigating away
  useBackHandler(() => {
    if (inspectingReport) {
      setInspectingReport(null);
      return true;
    }
    return false;
  }, Boolean(inspectingReport));

  const handleBackNavigation = () => {
    if (inspectingReport) {
      setInspectingReport(null);
    } else if (onBack) {
      onBack();
    }
  };

  useEffect(() => {
    loadHistoricalData();
  }, []);

  const loadHistoricalData = async () => {
    setIsLoading(true);
    try {
      const [allReports, cellList, periodList] = await Promise.all([
        ReportService.getUnifiedReviewQueue(),
        CellService.getCells(),
        ReportService.getPeriods(),
      ]);
      setReports(allReports);
      setCells(cellList);
      setPeriods(periodList);
    } catch (err) {
      console.warn('Notice loading historical reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper status checkers
  const isAccepted = (status: string) => status === 'Approved' || status === 'approved';
  const isDeclined = (status: string) => status === 'Needs Correction' || status === 'needs_revision';
  const isPending = (status: string) => status === 'Newly Submitted' || status === 'submitted' || status === 'under_review';

  // Unique Tutors for filter
  const uniqueTutors = useMemo(() => {
    const map = new Map<string, string>();
    reports.forEach(r => {
      if (r.tutorUid && r.tutorName) {
        map.set(r.tutorUid, r.tutorName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [reports]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Cell filter
      if (selectedCellId !== 'all' && r.cellId !== selectedCellId) return false;
      // Tutor filter
      if (selectedTutorId !== 'all' && r.tutorUid !== selectedTutorId) return false;
      // Report type filter
      if (selectedType !== 'all' && r.reportType !== selectedType) return false;
      // Status filter
      if (selectedStatus !== 'all') {
        const isLate = r.late;
        if (selectedStatus === 'Approved' && !isAccepted(r.status)) return false;
        if (selectedStatus === 'Needs Correction' && !isDeclined(r.status)) return false;
        if (selectedStatus === 'Submitted' && !isPending(r.status)) return false;
        if (selectedStatus === 'Late' && !isLate) return false;
        if (selectedStatus === 'On Time' && isLate) return false;
      }
      // Date range filter
      if (startDate && r.submittedAt < startDate) return false;
      if (endDate && r.submittedAt > endDate) return false;

      // Free text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.cellName.toLowerCase().includes(q) ||
          r.tutorName.toLowerCase().includes(q) ||
          (r.scripturalTheme && r.scripturalTheme.toLowerCase().includes(q)) ||
          (r.testimonies && r.testimonies.toLowerCase().includes(q)) ||
          (r.reviewerComment && r.reviewerComment.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [
    reports,
    selectedCellId,
    selectedTutorId,
    selectedType,
    selectedStatus,
    startDate,
    endDate,
    searchQuery,
  ]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = reports.length;
    const accepted = reports.filter(r => isAccepted(r.status)).length;
    const declined = reports.filter(r => isDeclined(r.status)).length;
    const late = reports.filter(r => r.late).length;
    const onTime = total - late;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    return { total, accepted, declined, late, onTime, acceptanceRate };
  }, [reports]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      alert('No reports found to export.');
      return;
    }
    const headers = [
      'Report Type',
      'Cell Name',
      'Cell Leader / Tutor',
      'Submission Date',
      'Timely / Late',
      'Decision Status',
      'Attendance / Souls Won',
      'Offering',
      'Reviewed By',
      'Review Feedback / Reason',
    ];

    const rows = filteredReports.map(r => [
      r.reportType === 'meeting' ? 'Cell Meeting' : 'Evangelism Outreach',
      `"${r.cellName.replace(/"/g, '""')}"`,
      `"${r.tutorName.replace(/"/g, '""')}"`,
      r.submittedAt,
      r.late ? 'Late Submission' : 'On Time',
      r.status,
      r.reportType === 'meeting' ? ((r as CellMeetingReport).attendance ?? 0) : `${(r as EvangelismReport).conversions ?? 0} souls`,
      r.reportType === 'meeting' ? ((r as CellMeetingReport).offering ?? 0) : 0,
      `"${(r.reviewedByName || '').replace(/"/g, '""')}"`,
      `"${(r.reviewerComment || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FNI_Report_History_Archive_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#142B4A] text-white flex items-center justify-center shadow-xs">
              <Archive className="w-5 h-5 text-[#C6A45A]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#142B4A] dark:text-white">
                Historical Reports Archive
              </h2>
              <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
                Permanent historical record of cell meetings & evangelism returns across all registered cells.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#111c2d] hover:bg-[#F5F7FA] text-[#142B4A] dark:text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-[#C6A45A]" />
          <span>Export Archive (CSV)</span>
        </button>
      </div>

      {/* 2. Key Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
          <div className="text-[11px] font-bold text-[#667085] dark:text-slate-400 uppercase tracking-wider">
            Total Archives
          </div>
          <div className="text-2xl font-black text-[#142B4A] dark:text-white mt-1">
            {stats.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Historical returns</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accepted</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {stats.accepted}
          </div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">
            {stats.acceptanceRate}% approval rate
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/40 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Declined</span>
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">
            {stats.declined}
          </div>
          <div className="text-[10px] text-rose-600/80 mt-0.5">Returned for revision</div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>On-Time</span>
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
            {stats.onTime}
          </div>
          <div className="text-[10px] text-blue-600/80 mt-0.5">Before 6:00 PM GMT</div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Late Submissions</span>
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
            {stats.late}
          </div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">After deadline cutoff</div>
        </div>
      </div>

      {/* 3. Filter Controls */}
      <div className="bg-white dark:bg-[#111c2d] p-4 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search cell, tutor, scripture..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            />
          </div>

          {/* Cell Filter */}
          <div>
            <select
              value={selectedCellId}
              onChange={e => setSelectedCellId(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            >
              <option value="all">All Registered Cells ({cells.length})</option>
              {cells.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tutor Filter */}
          <div>
            <select
              value={selectedTutorId}
              onChange={e => setSelectedTutorId(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            >
              <option value="all">All Tutors / Cell Leaders</option>
              {uniqueTutors.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Report Type */}
          <div>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as any)}
              className="w-full py-2 px-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            >
              <option value="all">All Report Types</option>
              <option value="meeting">Cell Meeting Reports Only</option>
              <option value="evangelism">Evangelism Reports Only</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            >
              <option value="all">All Statuses (Accepted, Declined, Pending)</option>
              <option value="Approved">Accepted Only</option>
              <option value="Needs Correction">Declined / Needs Revision</option>
              <option value="Submitted">Awaiting Review</option>
              <option value="On Time">On-Time Submissions Only</option>
              <option value="Late">Late Submissions Only</option>
            </select>
          </div>

          {/* Date range from */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#667085] shrink-0 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            />
          </div>

          {/* Date range to */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#667085] shrink-0 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            />
          </div>
        </div>
      </div>

      {/* 4. Table / Records List */}
      <div className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#667085]">
            <Clock className="w-6 h-6 animate-spin mx-auto text-[#C6A45A] mb-2" />
            <span>Loading historical archives...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#667085]">
            <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-[#142B4A] dark:text-white">No historical records found</p>
            <p className="mt-1">
              {reports.length === 0
                ? 'No reports have been submitted yet.'
                : 'No historical reports match your active filter settings. Reset filters to view all entries.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List (Dedicated for phones) */}
            <div className="block md:hidden divide-y divide-[#E3E8EF] dark:divide-[#26384d]">
              {filteredReports.map(rep => {
                const repAccepted = isAccepted(rep.status);
                const repDeclined = isDeclined(rep.status);
                const repPending = isPending(rep.status);

                return (
                  <div
                    key={rep.id}
                    onClick={() => setInspectingReport(rep)}
                    className="p-4 space-y-2.5 hover:bg-[#F5F7FA] dark:hover:bg-[#172437]/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {rep.reportType === 'meeting' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-bold text-[10px] shrink-0">
                            <FileText className="w-3 h-3 text-blue-500" />
                            <span>Meeting</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px] shrink-0">
                            <Flame className="w-3 h-3 text-amber-500" />
                            <span>Evangelism</span>
                          </span>
                        )}
                        <span className="font-bold text-sm text-[#182230] dark:text-white truncate">
                          {rep.cellName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-[#667085] dark:text-slate-400 shrink-0">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          {new Date(rep.submittedAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#667085] dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#C6A45A] shrink-0" />
                        <span className="truncate">{rep.tutorName}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {rep.late ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-[10px]">
                            <Clock className="w-3 h-3" />
                            <span>Late</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>On Time</span>
                          </span>
                        )}

                        {repAccepted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Accepted</span>
                          </span>
                        )}
                        {repDeclined && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-[10px]">
                            <AlertCircle className="w-3 h-3" />
                            <span>Declined</span>
                          </span>
                        )}
                        {repPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px]">
                            <Clock className="w-3 h-3" />
                            <span>Review</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {rep.reviewerComment && (
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 italic bg-[#F8FAFC] dark:bg-[#152238] p-2 rounded-lg border border-slate-100 dark:border-slate-800 line-clamp-2">
                        "{rep.reviewerComment}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block table-scroll-container custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-[#172437] text-[#667085] uppercase tracking-wider text-[10px] font-bold border-b border-[#E3E8EF] dark:border-[#26384d]">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Cell Fellowship</th>
                    <th className="py-3 px-4">Tutor / Leader</th>
                    <th className="py-3 px-4">Submission Date</th>
                    <th className="py-3 px-4">Deadline Status</th>
                    <th className="py-3 px-4">Review Decision</th>
                    <th className="py-3 px-4">Admin Feedback</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8EF] dark:divide-[#26384d]">
                  {filteredReports.map(rep => {
                    const repAccepted = isAccepted(rep.status);
                    const repDeclined = isDeclined(rep.status);
                    const repPending = isPending(rep.status);

                    return (
                      <tr
                        key={rep.id}
                        className="hover:bg-[#F5F7FA] dark:hover:bg-[#172437]/60 transition-colors cursor-pointer group"
                        onClick={() => setInspectingReport(rep)}
                      >
                        {/* Type Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {rep.reportType === 'meeting' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-bold text-[10px]">
                              <FileText className="w-3 h-3 text-blue-500" />
                              <span>Meeting</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px]">
                              <Flame className="w-3 h-3 text-amber-500" />
                              <span>Evangelism</span>
                            </span>
                          )}
                        </td>

                        {/* Cell Name */}
                        <td className="py-3.5 px-4 font-bold text-[#182230] dark:text-white whitespace-nowrap">
                          {rep.cellName}
                        </td>

                        {/* Tutor Name */}
                        <td className="py-3.5 px-4 text-[#667085] dark:text-slate-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#C6A45A]" />
                            <span>{rep.tutorName}</span>
                          </div>
                        </td>

                        {/* Submission Date */}
                        <td className="py-3.5 px-4 text-[#667085] dark:text-slate-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(rep.submittedAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Timely / Late Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {rep.late ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-[10px]">
                              <Clock className="w-3 h-3" />
                              <span>Submitted Late</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>On Time</span>
                            </span>
                          )}
                        </td>

                        {/* Decision Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {repAccepted && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Accepted</span>
                            </span>
                          )}
                          {repDeclined && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-[10px]">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Declined</span>
                            </span>
                          )}
                          {repPending && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px]">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Awaiting Review</span>
                            </span>
                          )}
                        </td>

                        {/* Admin Feedback */}
                        <td className="py-3.5 px-4 text-[#667085] dark:text-slate-400 max-w-xs truncate text-[11px]">
                          {rep.reviewerComment ? (
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              "{rep.reviewerComment}"
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No feedback attached</span>
                          )}
                        </td>

                        {/* View Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setInspectingReport(rep);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#142B4A]/5 hover:bg-[#142B4A]/10 text-[#142B4A] dark:bg-white/10 dark:text-white text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 5. Complete Report Details Inspection Modal */}
      {inspectingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111c2d] w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E3E8EF] dark:border-[#26384d] overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-[#142B4A] px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-[#C6A45A] flex items-center justify-center">
                  {inspectingReport.reportType === 'meeting' ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <Flame className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6A45A]">
                      {inspectingReport.reportType === 'meeting' ? 'Cell Meeting Return' : 'Evangelism Return'}
                    </span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-xs text-slate-300 font-medium">
                      Historical Record
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base tracking-tight text-white">
                    {inspectingReport.cellName}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setInspectingReport(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              {/* Review Decision Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                  isAccepted(inspectingReport.status)
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-800'
                    : isDeclined(inspectingReport.status)
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950 dark:bg-rose-950/20 dark:border-rose-800'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950 dark:bg-amber-950/20 dark:border-amber-800'
                }`}
              >
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    {isAccepted(inspectingReport.status) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isDeclined(inspectingReport.status) ? (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600" />
                    )}
                    <span>
                      {isAccepted(inspectingReport.status)
                        ? 'Report Accepted by Administration'
                        : isDeclined(inspectingReport.status)
                        ? 'Report Declined (Returned for Correction)'
                        : 'Awaiting Administrative Review'}
                    </span>
                  </div>
                  {inspectingReport.reviewerComment ? (
                    <p className="mt-1.5 text-xs font-medium leading-relaxed">
                      "{inspectingReport.reviewerComment}"
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] opacity-75">No feedback note attached.</p>
                  )}
                  {inspectingReport.reviewedByName && (
                    <div className="mt-2 text-[10px] opacity-75 font-semibold">
                      Reviewed by {inspectingReport.reviewedByName}{' '}
                      {inspectingReport.reviewedAt
                        ? `on ${new Date(inspectingReport.reviewedAt).toLocaleDateString()}`
                        : ''}
                    </div>
                  )}
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${
                    inspectingReport.late
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                  }`}
                >
                  {inspectingReport.late ? 'Late Return' : 'On-Time'}
                </span>
              </div>

              {/* Core Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#172437] border border-[#E3E8EF] dark:border-[#26384d]">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#667085]">Cell Leader / Tutor</div>
                  <div className="font-bold text-[#182230] dark:text-white mt-0.5">{inspectingReport.tutorName}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#667085]">Submission Date</div>
                  <div className="font-bold text-[#182230] dark:text-white mt-0.5">
                    {new Date(inspectingReport.submittedAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#667085]">Metrics</div>
                  <div className="font-bold text-[#182230] dark:text-white mt-0.5">
                    {inspectingReport.reportType === 'meeting'
                      ? `${(inspectingReport as CellMeetingReport).attendance ?? 0} attendees`
                      : `${(inspectingReport as EvangelismReport).conversions ?? 0} souls won`}
                  </div>
                </div>

                {inspectingReport.reportType === 'meeting' && (inspectingReport as CellMeetingReport).offering !== undefined && (
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#667085]">Offering Remitted</div>
                    <div className="font-bold text-[#182230] dark:text-white mt-0.5">
                      GHS {Number((inspectingReport as CellMeetingReport).offering || 0).toFixed(2)}
                    </div>
                  </div>
                )}

                {inspectingReport.reportType === 'meeting' && (inspectingReport as CellMeetingReport).meetingLocation && (
                  <div className="sm:col-span-2">
                    <div className="text-[10px] uppercase font-bold text-[#667085]">Meeting Location / Venue</div>
                    <div className="font-bold text-[#182230] dark:text-white mt-0.5 truncate">
                      {(inspectingReport as CellMeetingReport).meetingLocation}
                    </div>
                  </div>
                )}

                {inspectingReport.reportType === 'evangelism' && (inspectingReport as EvangelismReport).location && (
                  <div className="sm:col-span-2">
                    <div className="text-[10px] uppercase font-bold text-[#667085]">Outreach Location</div>
                    <div className="font-bold text-[#182230] dark:text-white mt-0.5 truncate">
                      {(inspectingReport as EvangelismReport).location}
                    </div>
                  </div>
                )}
              </div>

              {/* Scriptural Theme / Word Preached */}
              {(inspectingReport.scripturalTheme || (inspectingReport as any).messageUsed) && (
                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <div className="font-bold text-blue-950 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Scriptural Message / Theme</span>
                  </div>
                  <p className="text-blue-900 dark:text-blue-200 leading-relaxed">
                    {inspectingReport.scripturalTheme || (inspectingReport as any).messageUsed}
                  </p>
                </div>
              )}

              {/* Testimonies & Breakthroughs */}
              {inspectingReport.testimonies && (
                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <div className="font-bold text-emerald-950 dark:text-emerald-300 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Member Testimonies & Breakthroughs</span>
                  </div>
                  <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed whitespace-pre-wrap">
                    {inspectingReport.testimonies}
                  </p>
                </div>
              )}

              {/* Tutor Personal Reflection / Shepherd Experience */}
              {inspectingReport.reportType === 'meeting' && (inspectingReport as CellMeetingReport).tutorExperience && (
                <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                  <div className="font-bold text-amber-950 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tutor's Personal Assessment & Shepherd Experience</span>
                  </div>
                  <p className="text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-wrap">
                    {(inspectingReport as CellMeetingReport).tutorExperience}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#F8FAFC] dark:bg-[#172437] border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between">
              <span className="text-[11px] text-[#667085]">
                Report ID: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">{inspectingReport.id}</code>
              </span>
              <button
                onClick={() => setInspectingReport(null)}
                className="px-4 py-2 rounded-xl bg-[#142B4A] text-white font-bold text-xs hover:bg-[#203D63] transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
