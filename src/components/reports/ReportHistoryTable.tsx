import React, { useState, useEffect } from 'react';
import { CellReport, Region, ReportingPeriod, UnifiedReportItem, ReportStatus, Cell } from '../../types';
import { Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ReportService } from '../../services/reportService';
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  CheckSquare,
  Square,
  Send,
  Eye,
  FileSpreadsheet,
  Flame,
  AlertTriangle,
  X,
} from 'lucide-react';

interface ReportHistoryTableProps {
  reports?: CellReport[];
  regions?: Region[];
  periods?: ReportingPeriod[];
  onSelectReport?: (report: CellReport) => void;
  onRefresh?: () => void;
}

export const ReportHistoryTable: React.FC<ReportHistoryTableProps> = ({
  regions = [],
  periods = [],
  onRefresh,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { dispatchNotification } = useNotifications();

  // Active Main Tab: 'unified' (All Reports) vs 'missing' (Overdue & Missing Cells)
  const [activeTab, setActiveTab] = useState<'unified' | 'missing'>('unified');

  // Filters
  const [reportTypeFilter, setReportTypeFilter] = useState<'all' | 'meeting' | 'evangelism'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Data states
  const [unifiedReports, setUnifiedReports] = useState<UnifiedReportItem[]>([]);
  const [missingCells, setMissingCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bulk Selection State
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Individual Inspection & Review Modal
  const [inspectingItem, setInspectingItem] = useState<UnifiedReportItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Needs Correction' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const cellFilter = isAdmin ? undefined : currentUser.cell_id;
      const [queue, missing] = await Promise.all([
        ReportService.getUnifiedReviewQueue({
          reportType: reportTypeFilter,
          cellId: cellFilter,
        }),
        ReportService.getMissingCells(),
      ]);
      setUnifiedReports(queue);
      setMissingCells(missing);
      setSelectedReportIds(new Set());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reportTypeFilter, currentUser, isAdmin]);

  // Filtering
  const filteredReports = unifiedReports.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      r.cellName.toLowerCase().includes(q) ||
      r.tutorName.toLowerCase().includes(q) ||
      (r.reportType === 'evangelism' && (r as any).location?.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all' ||
      r.status === statusFilter ||
      (statusFilter === 'Approved' && r.status === 'approved') ||
      (statusFilter === 'Needs Correction' && r.status === 'needs_revision');

    return matchesSearch && matchesStatus;
  });

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const displayedReports = filteredReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Bulk selection handling
  const toggleSelectAll = () => {
    const newlySubmittedIds = displayedReports
      .filter(r => r.status === 'Newly Submitted' || r.status === 'submitted')
      .map(r => r.id);

    if (selectedReportIds.size === newlySubmittedIds.length && newlySubmittedIds.length > 0) {
      setSelectedReportIds(new Set());
    } else {
      setSelectedReportIds(new Set(newlySubmittedIds));
    }
  };

  const toggleSelectRow = (id: string) => {
    const updated = new Set(selectedReportIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedReportIds(updated);
  };

  // Perform Bulk Approval
  const handleBulkApprove = async () => {
    if (selectedReportIds.size === 0) return;
    try {
      setIsProcessingBulk(true);
      const itemsToApprove = unifiedReports
        .filter(r => selectedReportIds.has(r.id))
        .map(r => ({ id: r.id, reportType: r.reportType }));

      const count = await ReportService.bulkApproveReports(
        itemsToApprove,
        currentUser.id,
        currentUser.full_name || 'Church Administrator'
      );

      dispatchNotification(
        'Bulk Approval Completed',
        `Successfully verified and approved ${count} weekly reports across fellowship cells.`,
        'report_approved',
        'in_app'
      );

      setIsBulkConfirmOpen(false);
      setSelectedReportIds(new Set());
      await loadData();
      if (onRefresh) onRefresh();
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Single review submission
  const handleSubmitReview = async () => {
    if (!inspectingItem || !reviewAction) return;
    if (reviewAction === 'Needs Correction' && !reviewComment.trim()) {
      alert('Mandatory Requirement: Please provide specific feedback explaining the required correction.');
      return;
    }

    try {
      setIsSubmittingReview(true);
      await ReportService.reviewReport(
        inspectingItem.id,
        inspectingItem.reportType,
        reviewAction,
        reviewComment || 'Approved by church administration.',
        currentUser.id,
        currentUser.full_name || 'Church Administrator'
      );

      dispatchNotification(
        reviewAction === 'Approved' ? 'Report Approved' : 'Correction Requested',
        `${inspectingItem.cellName} ${inspectingItem.reportType === 'meeting' ? 'meeting' : 'evangelism'} report marked as ${reviewAction}.`,
        reviewAction === 'Approved' ? 'report_approved' : 'revision_requested',
        'in_app'
      );

      setInspectingItem(null);
      setReviewAction(null);
      setReviewComment('');
      await loadData();
      if (onRefresh) onRefresh();
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Dispatch reminder for missing cell
  const handleDispatchReminder = (cell: Cell) => {
    dispatchNotification(
      'Weekly Report Reminder Dispatched',
      `Reminder sent to ${cell.leader_name || 'Cell Leader'} for cell "${cell.name}". Submissions are due Sunday 6:00 PM Ghana Time.`,
      'deadline_reminder',
      'in_app'
    );
    alert(`Reminder dispatched to ${cell.leader_name || 'Cell Leader'} (${cell.name}) via in-app notification and email channel.`);
  };

  // Export CSV
  const exportCSV = () => {
    const headers = [
      'Report Type',
      'Cell Name',
      'Tutor / Leader',
      'Date',
      'Status',
      'Timing',
      'Submitted At',
      'Key Metrics',
    ];
    const rows = filteredReports.map(r => {
      const metrics =
        r.reportType === 'meeting'
          ? `Att: ${r.attendance}, Mem: ${r.members}, Abs: ${r.absentees}, F-up: ${r.followUpNeeded}`
          : `Spoken: ${r.peopleSpokenTo}, Conversions: ${r.conversions}, Captured: ${r.contactsCaptured}`;

      return [
        r.reportType === 'meeting' ? 'Cell Meeting' : 'Evangelism',
        `"${r.cellName}"`,
        `"${r.tutorName}"`,
        r.reportType === 'meeting' ? r.meetingDate : (r as any).date,
        r.status,
        r.late ? 'Late' : 'On-Time',
        `"${r.submittedAt}"`,
        `"${metrics}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FNI_Cells_Connect_Reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-5">
      {/* Table Header / Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-navy-950 tracking-tight">
              {isAdmin ? 'Unified Review Queue' : 'My Cell Submissions'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-navy-50 text-navy-900 border border-navy-100">
              Week 45 Cycle
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Central review of weekly cell meetings, evangelism harvests, and deadline compliance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && selectedReportIds.size > 0 && (
            <button
              onClick={() => setIsBulkConfirmOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-sm animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Bulk Approve ({selectedReportIds.size})</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher: Unified Reports vs Overdue/Missing Cells */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <button
          onClick={() => setActiveTab('unified')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'unified'
              ? 'bg-navy-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
          }`}
        >
          All Submissions ({unifiedReports.length})
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('missing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'missing'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue & Missing Cells ({missingCells.length})</span>
          </button>
        )}
      </div>

      {activeTab === 'unified' ? (
        <>
          {/* Multi-Column Filter Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 pb-1 text-xs">
            {/* Search */}
            <div>
              <span className="block text-[11px] font-medium text-slate-400 mb-1">Search Cell / Tutor</span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by cell, leader, location..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs font-medium rounded-xl border-0 bg-slate-50 px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-navy-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Report Type Filter */}
            <div>
              <span className="block text-[11px] font-medium text-slate-400 mb-1">Report Type</span>
              <select
                value={reportTypeFilter}
                onChange={e => {
                  setReportTypeFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full text-xs font-medium rounded-xl border-0 bg-slate-50 px-3 py-2 text-slate-700 focus:ring-1 focus:ring-navy-600 focus:bg-white"
              >
                <option value="all">All Report Types</option>
                <option value="meeting">Cell Meeting Reports</option>
                <option value="evangelism">Evangelism Reports</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <span className="block text-[11px] font-medium text-slate-400 mb-1">Review Status</span>
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs font-medium rounded-xl border-0 bg-slate-50 px-3 py-2 text-slate-700 focus:ring-1 focus:ring-navy-600 focus:bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="Newly Submitted">Newly Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Needs Correction">Needs Correction</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="table-scroll-container custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-medium text-[11px] border-b border-slate-100">
                  {isAdmin && (
                    <th className="py-3 px-3 w-8">
                      <button
                        onClick={toggleSelectAll}
                        className="text-slate-400 hover:text-navy-900"
                        title="Select newly submitted reports"
                      >
                        {selectedReportIds.size > 0 ? (
                          <CheckSquare className="w-4 h-4 text-navy-900" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Cell Name</th>
                  <th className="py-3 px-3">Tutor / Leader</th>
                  <th className="py-3 px-3">Event Date</th>
                  <th className="py-3 px-3">Timing</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Key Data</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-slate-400 text-xs font-medium">
                      Loading unified review repository...
                    </td>
                  </tr>
                ) : displayedReports.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-slate-400 text-xs">
                      No reports found matching your selected criteria.
                    </td>
                  </tr>
                ) : (
                  displayedReports.map(report => {
                    const isSelected = selectedReportIds.has(report.id);
                    const isNewlySubmitted =
                      report.status === 'Newly Submitted' || report.status === 'submitted';

                    return (
                      <tr
                        key={report.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-navy-50/40' : ''
                        }`}
                      >
                        {isAdmin && (
                          <td className="py-3.5 px-3">
                            {isNewlySubmitted ? (
                              <button
                                onClick={() => toggleSelectRow(report.id)}
                                className="text-slate-400 hover:text-navy-900"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-navy-900" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 h-4 block" />
                            )}
                          </td>
                        )}

                        {/* Report Type Badge */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {report.reportType === 'meeting' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-navy-50 text-navy-900 border border-navy-100">
                              <FileSpreadsheet className="w-3 h-3 text-navy-700" />
                              <span>Cell Meeting</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold-50 text-amber-900 border border-gold-200">
                              <Flame className="w-3 h-3 text-gold-600" />
                              <span>Evangelism</span>
                            </span>
                          )}
                        </td>

                        {/* Cell Name */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-navy-950">{report.cellName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {report.id.slice(0, 10)}
                          </div>
                        </td>

                        {/* Tutor / Leader */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <span>{report.tutorName}</span>
                            <button
                              onClick={() => handleCopy(report.tutorName, report.id)}
                              className="text-slate-400 hover:text-navy-900 p-0.5 rounded transition-colors"
                              title="Copy tutor name"
                            >
                              {copiedId === report.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Event Date */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 font-medium text-[11px]">
                          {report.reportType === 'meeting' ? report.meetingDate : (report as any).date}
                        </td>

                        {/* Timing Badge (Sunday 6 PM rule) */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {report.late ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Clock className="w-3 h-3" />
                              <span>Late Return</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>On-Time</span>
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <Badge status={report.status} />
                        </td>

                        {/* Key Metrics */}
                        <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-700">
                          {report.reportType === 'meeting' ? (
                            <span>
                              <strong>{report.attendance}</strong> att • {report.members} mem
                            </span>
                          ) : (
                            <span>
                              <strong className="text-gold-600">+{report.conversions}</strong> souls • {report.peopleSpokenTo} spoken
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => {
                              setInspectingItem(report);
                              setReviewAction(null);
                              setReviewComment(report.reviewerComment || '');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-navy-900 hover:text-white text-navy-950 font-bold text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-1.5 pt-3 border-t border-slate-100">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                  currentPage === page
                    ? 'bg-navy-900 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : (
        /* Overdue & Missing Cells Tab */
        <div className="space-y-4">
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-950">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold block">
                  Mandatory Sunday 6:00 PM Ghana Time Cutoff Passed
                </span>
                <span className="text-rose-800 text-[11px]">
                  The following registered cells have not filed returns for Week 45. Dispatched notifications trigger in-app & alert logging.
                </span>
              </div>
            </div>
          </div>

          {missingCells.length === 0 ? (
            <div className="py-12 text-center text-xs text-emerald-700 font-bold bg-emerald-50 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
              100% Reporting Compliance! All registered fellowship cells have submitted returns.
            </div>
          ) : (
            <div className="table-scroll-container custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-medium text-[11px] border-b border-slate-100">
                    <th className="py-3 px-3">Cell Name</th>
                    <th className="py-3 px-3">Tutor / Leader</th>
                    <th className="py-3 px-3">Contact Phone</th>
                    <th className="py-3 px-3">Ecclesiastical Region</th>
                    <th className="py-3 px-3">Meeting Schedule</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {missingCells.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-3 font-bold text-navy-950">{c.name}</td>
                      <td className="py-3.5 px-3 text-slate-700">{c.leader_name || 'Leader'}</td>
                      <td className="py-3.5 px-3 text-slate-600">{c.leader_phone || 'Unlisted'}</td>
                      <td className="py-3.5 px-3 text-slate-600">{c.region_name || 'Region'}</td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {c.meeting_day ? `${c.meeting_day} @ ${c.meeting_time}` : 'Not set'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => handleDispatchReminder(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs"
                        >
                          <Send className="w-3 h-3" />
                          <span>Dispatch Reminder</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bulk Approval Confirmation Modal */}
      {isBulkConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-navy-950">
                Confirm Bulk Approval
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You are about to approve <strong className="text-navy-950">{selectedReportIds.size}</strong> newly submitted weekly report{selectedReportIds.size > 1 ? 's' : ''}. This will record approval audit trails for all selected units.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setIsBulkConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkApprove}
                disabled={isProcessingBulk}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isProcessingBulk ? 'Processing...' : `Confirm & Approve (${selectedReportIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect and Review Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-navy-950">
                    {inspectingItem.cellName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inspectingItem.reportType === 'meeting'
                        ? 'bg-navy-100 text-navy-900'
                        : 'bg-gold-100 text-amber-900'
                    }`}
                  >
                    {inspectingItem.reportType === 'meeting' ? 'Cell Meeting Report' : 'Evangelism Report'}
                  </span>
                  {inspectingItem.late && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      Late
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tutor: {inspectingItem.tutorName} • Submitted: {new Date(inspectingItem.submittedAt).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setInspectingItem(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              {inspectingItem.reportType === 'meeting' ? (
                /* Meeting report metrics */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance</span>
                      <span className="text-xl font-extrabold text-navy-950">{inspectingItem.attendance}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Members</span>
                      <span className="text-xl font-extrabold text-navy-950">{inspectingItem.members}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Members</span>
                      <span className="text-xl font-extrabold text-navy-950">{inspectingItem.activeMembers}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">New Members</span>
                      <span className="text-xl font-extrabold text-navy-950">{inspectingItem.newMembers}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Absentees</span>
                      <span className="text-sm font-bold text-navy-950">{inspectingItem.absentees}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Follow-Up Needed</span>
                      <span className="text-sm font-bold text-amber-700">{inspectingItem.followUpNeeded}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Offering Collected</span>
                      <span className="text-sm font-bold text-navy-950">
                        {inspectingItem.offering ? `GH₵ ${inspectingItem.offering}` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {((inspectingItem as any).scripturalTheme || (inspectingItem as any).scripturesUsed || inspectingItem.tutorNotes) && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Word Ministered & Scriptural Theme
                      </span>
                      {((inspectingItem as any).scripturalTheme || (inspectingItem as any).scripturesUsed) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1 border-b border-slate-200/60">
                          {(inspectingItem as any).scripturalTheme && (
                            <div className="text-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">Theme / Message Topic</span>
                              <span className="font-bold text-navy-950">{(inspectingItem as any).scripturalTheme}</span>
                            </div>
                          )}
                          {(inspectingItem as any).scripturesUsed && (
                            <div className="text-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">Scriptures Used</span>
                              <span className="font-bold text-navy-950">{(inspectingItem as any).scripturesUsed}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {inspectingItem.tutorNotes && (
                        <p className="text-slate-700 leading-relaxed text-xs">{inspectingItem.tutorNotes}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Evangelism report metrics */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Conversions</span>
                      <span className="text-xl font-extrabold text-gold-600">+{inspectingItem.conversions}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">People Spoken To</span>
                      <span className="text-xl font-extrabold text-navy-950">{inspectingItem.peopleSpokenTo}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Contacts Captured</span>
                      <span className="text-xl font-extrabold text-navy-950">{inspectingItem.contactsCaptured}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Interested in Ministry</span>
                      <span className="text-xl font-extrabold text-navy-950">{inspectingItem.interestedInMinistry}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Location / Campus</span>
                    <span className="font-semibold text-navy-950">{inspectingItem.location}</span>
                  </div>

                  {((inspectingItem as any).scripturalTheme || (inspectingItem as any).scripturesUsed || inspectingItem.messageUsed) && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Message & Scriptural Theme Proclaimed</span>
                      {((inspectingItem as any).scripturalTheme || (inspectingItem as any).scripturesUsed) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {(inspectingItem as any).scripturalTheme && (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">Theme / Message Shared</span>
                              <span className="font-bold text-navy-950">{(inspectingItem as any).scripturalTheme}</span>
                            </div>
                          )}
                          {(inspectingItem as any).scripturesUsed && (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">Scriptures Used</span>
                              <span className="font-bold text-navy-950">{(inspectingItem as any).scripturesUsed}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-700 text-xs">{inspectingItem.messageUsed}</p>
                      )}
                    </div>
                  )}

                  {inspectingItem.notes && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Outreach Observations & Testimonies
                      </span>
                      <p className="text-slate-700 leading-relaxed">{inspectingItem.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Existing Review feedback if present */}
              {inspectingItem.reviewerComment && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-blue-900 block mb-1">
                    Previous Administrative Review ({inspectingItem.status})
                  </span>
                  <p className="text-blue-950">{inspectingItem.reviewerComment}</p>
                </div>
              )}

              {/* Administrative Review Form */}
              {isAdmin && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy-950">Administrative Determination</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewAction('Approved')}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          reviewAction === 'Approved'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        Approve Report
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewAction('Needs Correction')}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          reviewAction === 'Needs Correction'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        Request Correction
                      </button>
                    </div>
                  </div>

                  {reviewAction && (
                    <div className="space-y-2 animate-in fade-in">
                      <label className="block text-[11px] font-bold text-navy-950">
                        {reviewAction === 'Needs Correction' ? (
                          <span className="text-rose-600">
                            Required Correction Feedback (Mandatory explanation for tutor) *
                          </span>
                        ) : (
                          <span>Reviewer Remarks (Optional)</span>
                        )}
                      </label>
                      <textarea
                        rows={2}
                        required={reviewAction === 'Needs Correction'}
                        placeholder={
                          reviewAction === 'Needs Correction'
                            ? 'Specify which numbers or fields require correction...'
                            : 'Add praise, encouragement, or pastoral remarks...'
                        }
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              {isAdmin && reviewAction && (
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 ${
                    reviewAction === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmittingReview
                    ? 'Submitting...'
                    : reviewAction === 'Approved'
                    ? 'Confirm Approval'
                    : 'Return for Correction'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
