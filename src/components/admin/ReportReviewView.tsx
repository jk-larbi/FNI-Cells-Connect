import React, { useState, useEffect, useMemo } from 'react';
import { UnifiedReportItem, ReportStatus, Cell } from '../../types';
import { ReportService } from '../../services/reportService';
import { CellService } from '../../services/cellService';
import { useAuth } from '../../context/AuthContext';
import { formatLiveSubmissionTracking } from '../../utils/deadlineUtil';
import {
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  CheckSquare,
  Square,
  X,
  Eye,
  FileText,
  Flame,
  MessageSquare,
  Send,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  ArrowLeft,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Phone,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Check,
  RotateCcw,
  SlidersHorizontal,
  BookOpen,
} from 'lucide-react';

export interface ReportReviewViewProps {
  initialReportId?: string;
  onClearInitialReportId?: () => void;
  onBack?: () => void;
  onNavigateToTab?: (tab: string, meta?: any) => void;
}

const PRESET_FEEDBACK_COMMENTS = [
  'Please verify attendance figures and active members count.',
  'Kindly specify the offering collected and confirm the remittance code.',
  'Please enter telephone contacts and addresses for all new converts.',
  'Kindly state the specific outreach venue and team members present.',
  'Please include a brief testimony or divine encounter from this meeting.',
  'Submission received after Sunday 6:00 PM cutoff. Please ensure timely filing.',
];

export const ReportReviewView: React.FC<ReportReviewViewProps> = ({
  initialReportId,
  onClearInitialReportId,
  onBack,
  onNavigateToTab,
}) => {
  const { currentUser } = useAuth();

  // Data states
  const [reports, setReports] = useState<UnifiedReportItem[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveTicker, setLiveTicker] = useState(Date.now());

  // Live real-time ticker updating elapsed submission times every 15s
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTicker(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Filters & Search
  const [typeFilter, setTypeFilter] = useState<'all' | 'meeting' | 'evangelism'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'on_time' | 'late'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'attendance' | 'souls' | 'cell'>('newest');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkApproveModalOpen, setIsBulkApproveModalOpen] = useState(false);
  const [isBulkReturnModalOpen, setIsBulkReturnModalOpen] = useState(false);
  const [bulkReturnComment, setBulkReturnComment] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Single Item Inspection & Review Modal
  const [inspectingItem, setInspectingItem] = useState<UnifiedReportItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Needs Correction' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [quickActionProcessingId, setQuickActionProcessingId] = useState<string | null>(null);

  // Load Reports and Cells from live backend
  const loadData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      else setIsLoading(true);

      const [queue, loadedCells] = await Promise.all([
        ReportService.getUnifiedReviewQueue({ reportType: typeFilter }),
        CellService.getCells(),
      ]);

      setReports(queue);
      setCells(loadedCells);
      setSelectedIds(new Set());

      // If initialReportId provided (e.g. from notification deep-link), open it immediately
      if (initialReportId) {
        const found = queue.find(r => r.id === initialReportId);
        if (found) {
          setInspectingItem(found);
        }
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialReportId && reports.length > 0) {
      const found = reports.find(r => r.id === initialReportId);
      if (found) {
        setInspectingItem(found);
      }
    }
  }, [initialReportId, reports]);

  useEffect(() => {
    loadData();
  }, [typeFilter]);

  // Lookup cell details (phone, venue, etc.)
  const cellMap = useMemo(() => {
    const map = new Map<string, Cell>();
    cells.forEach(c => {
      map.set(c.id, c);
      map.set(c.name.toLowerCase(), c);
    });
    return map;
  }, [cells]);

  const getCellForReport = (item: UnifiedReportItem): Cell | undefined => {
    return cellMap.get(item.cellId) || cellMap.get(item.cellName.toLowerCase());
  };

  // Executive KPI summary metrics
  const pendingCount = reports.filter(
    r => r.status === 'Newly Submitted' || r.status === 'submitted' || r.status === 'under_review'
  ).length;

  const needsCorrectionCount = reports.filter(
    r => r.status === 'Needs Correction' || r.status === 'needs_revision'
  ).length;

  const approvedCount = reports.filter(
    r => r.status === 'Approved' || r.status === 'approved'
  ).length;

  const totalSoulsWon = reports.reduce((sum, r) => {
    if (r.reportType === 'evangelism') {
      return sum + ((r as any).conversions || 0);
    }
    return sum + ((r as any).newMembers || 0);
  }, 0);

  const totalAttendance = reports.reduce((sum, r) => {
    if (r.reportType === 'meeting') {
      return sum + ((r as any).attendance || 0);
    }
    return sum;
  }, 0);

  const onTimeCount = reports.filter(r => !r.late).length;
  const onTimeRate = reports.length > 0 ? Math.round((onTimeCount / reports.length) * 100) : 100;

  // Filter & Sort
  const filteredReports = useMemo(() => {
    return reports
      .filter(r => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          r.cellName.toLowerCase().includes(q) ||
          r.tutorName.toLowerCase().includes(q) ||
          (r.reportType === 'evangelism' && (r as any).location?.toLowerCase().includes(q)) ||
          (r.reportType === 'evangelism' && (r as any).messageUsed?.toLowerCase().includes(q)) ||
          ((r as any).tutorNotes?.toLowerCase().includes(q) ?? false) ||
          ((r as any).testimonies?.toLowerCase().includes(q) ?? false);

        const matchesStatus =
          statusFilter === 'all' ||
          r.status === statusFilter ||
          (statusFilter === 'Approved' && (r.status === 'Approved' || r.status === 'approved')) ||
          (statusFilter === 'Needs Correction' && (r.status === 'Needs Correction' || r.status === 'needs_revision')) ||
          (statusFilter === 'Newly Submitted' &&
            (r.status === 'Newly Submitted' || r.status === 'submitted' || r.status === 'under_review'));

        const matchesDeadline =
          deadlineFilter === 'all' ||
          (deadlineFilter === 'on_time' && !r.late) ||
          (deadlineFilter === 'late' && r.late);

        return matchesSearch && matchesStatus && matchesDeadline;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        }
        if (sortBy === 'attendance') {
          const attA = a.reportType === 'meeting' ? (a as any).attendance || 0 : 0;
          const attB = b.reportType === 'meeting' ? (b as any).attendance || 0 : 0;
          return attB - attA;
        }
        if (sortBy === 'souls') {
          const soulsA =
            a.reportType === 'evangelism' ? (a as any).conversions || 0 : (a as any).newMembers || 0;
          const soulsB =
            b.reportType === 'evangelism' ? (b as any).conversions || 0 : (b as any).newMembers || 0;
          return soulsB - soulsA;
        }
        if (sortBy === 'cell') {
          return a.cellName.localeCompare(b.cellName);
        }
        return 0;
      });
  }, [reports, searchQuery, statusFilter, deadlineFilter, sortBy]);

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReports.length && filteredReports.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map(r => r.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        const item = reports.find(r => r.id === id);
        if (item) {
          await ReportService.reviewReport(
            item.id,
            item.reportType,
            'Approved',
            'Bulk approved by Church Administration.',
            currentUser.id,
            currentUser.full_name
          );

        }
      }
      setIsBulkApproveModalOpen(false);
      setSelectedIds(new Set());
      await loadData();
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk Return for Correction
  const handleBulkReturn = async () => {
    if (selectedIds.size === 0) return;
    if (!bulkReturnComment.trim()) {
      alert('Please enter guidance notes explaining what needs correction.');
      return;
    }
    setIsBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        const item = reports.find(r => r.id === id);
        if (item) {
          await ReportService.reviewReport(
            item.id,
            item.reportType,
            'Needs Correction',
            bulkReturnComment.trim(),
            currentUser.id,
            currentUser.full_name
          );

        }
      }
      setIsBulkReturnModalOpen(false);
      setBulkReturnComment('');
      setSelectedIds(new Set());
      await loadData();
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Quick 1-Click Inline Approval (No modal required!)
  const handleQuickApprove = async (item: UnifiedReportItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickActionProcessingId(item.id);
    try {
      await ReportService.reviewReport(
        item.id,
        item.reportType,
        'Approved',
        'Directly approved by Administrator via review portal.',
        currentUser.id,
        currentUser.full_name
      );


      await loadData();
    } finally {
      setQuickActionProcessingId(null);
    }
  };

  // Quick Inline Return for Correction (opens modal pre-focused)
  const handleQuickReturn = (item: UnifiedReportItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setInspectingItem(item);
    setReviewAction('Needs Correction');
    setReviewComment('');
  };

  // Single Item Review Submission
  const handleSubmitReview = async () => {
    if (!inspectingItem || !reviewAction) return;
    if (reviewAction === 'Needs Correction' && !reviewComment.trim()) {
      alert('Please provide reviewer feedback comments explaining what needs correction.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await ReportService.reviewReport(
        inspectingItem.id,
        inspectingItem.reportType,
        reviewAction,
        reviewComment.trim(),
        currentUser.id,
        currentUser.full_name
      );

      setInspectingItem(null);
      setReviewAction(null);
      setReviewComment('');
      if (onClearInitialReportId) onClearInitialReportId();
      await loadData();
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Step Sequential Review (Previous / Next Report in queue)
  const currentInspectIndex = inspectingItem ? filteredReports.findIndex(r => r.id === inspectingItem.id) : -1;
  const hasPrev = currentInspectIndex > 0;
  const hasNext = currentInspectIndex >= 0 && currentInspectIndex < filteredReports.length - 1;

  const handlePrevReport = () => {
    if (hasPrev) {
      setInspectingItem(filteredReports[currentInspectIndex - 1]);
      setReviewAction(null);
      setReviewComment('');
    }
  };

  const handleNextReport = () => {
    if (hasNext) {
      setInspectingItem(filteredReports[currentInspectIndex + 1]);
      setReviewAction(null);
      setReviewComment('');
    }
  };

  // Export Filtered Queue to CSV
  const handleExportCSV = () => {
    if (filteredReports.length === 0) return;

    const headers = [
      'Report Type',
      'Cell Name',
      'Tutor / Leader Name',
      'Report Date',
      'Attendance / Conversions',
      'Total Members / People Reached',
      'Offering Collected (GHS)',
      'Review Status',
      'Submission Timing',
      'Submitted At (GMT)',
      'Reviewer Feedback',
      'Reviewed By',
      'Reviewed At',
    ];

    const rows = filteredReports.map(r => {
      const isMeeting = r.reportType === 'meeting';
      const m = r as any;
      return [
        isMeeting ? 'Cell Meeting' : 'Evangelism Outreach',
        `"${(r.cellName || '').replace(/"/g, '""')}"`,
        `"${(r.tutorName || '').replace(/"/g, '""')}"`,
        isMeeting ? m.meetingDate || '' : m.date || '',
        isMeeting ? m.attendance || 0 : m.conversions || 0,
        isMeeting ? m.members || 0 : m.peopleSpokenTo || 0,
        isMeeting ? m.offering || 0 : 0,
        `"${(r.status || '').replace(/"/g, '""')}"`,
        r.late ? 'Late Submission' : 'On-Time (Sun 6pm GMT)',
        r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '',
        `"${(r.reviewerComment || '').replace(/"/g, '""')}"`,
        `"${(r.reviewedByName || '').replace(/"/g, '""')}"`,
        r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : '',
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `FNI_Report_Review_Queue_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset all filters
  const resetFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setDeadlineFilter('all');
    setSearchQuery('');
    setSortBy('newest');
  };

  const hasActiveFilters =
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    deadlineFilter !== 'all' ||
    searchQuery !== '' ||
    sortBy !== 'newest';

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#667085] hover:text-[#142B4A] mb-2 cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
              <span>Back to Previous</span>
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#142B4A] text-[#C6A45A] flex items-center justify-center shadow-sm">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
                Accept / Decline Reports Directorate
              </h1>
              <p className="text-xs text-[#667085] mt-0.5">
                Central leadership portal to evaluate, accept (approve), or decline (return for correction) weekly fellowship reports.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E3E8EF] text-[#142B4A] text-xs font-bold hover:bg-[#F5F7FA] transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#C6A45A]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredReports.length === 0}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E3E8EF] text-[#142B4A] text-xs font-bold hover:bg-[#F5F7FA] disabled:opacity-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Export filtered reports to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* EXECUTIVE KPI SUMMARY CARDS (Clickable Fast-Filters) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Pending / Action Required */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Newly Submitted' ? 'all' : 'Newly Submitted')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'Newly Submitted'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-[#D99A32]/30 shadow-sm'
              : 'bg-white border-[#E3E8EF] hover:border-amber-200 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
              Action Required
            </span>
            {pendingCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#D99A32] animate-pulse" />
            )}
          </div>
          <div className="text-2xl font-black text-[#142B4A] mt-2 group-hover:scale-105 transition-transform">
            {pendingCount}
          </div>
          <div className="text-[11px] font-semibold text-[#D99A32] mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Pending Review</span>
          </div>
        </button>

        {/* Needs Correction / Declined */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Needs Correction' ? 'all' : 'Needs Correction')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'Needs Correction'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-[#C74646]/30 shadow-sm'
              : 'bg-white border-[#E3E8EF] hover:border-rose-200 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
              Declined
            </span>
            <AlertCircle className="w-3.5 h-3.5 text-[#C74646]" />
          </div>
          <div className="text-2xl font-black text-[#C74646] mt-2 group-hover:scale-105 transition-transform">
            {needsCorrectionCount}
          </div>
          <div className="text-[11px] font-semibold text-[#C74646] mt-1">
            Returned for Revision
          </div>
        </button>

        {/* Approved / Accepted */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Approved' ? 'all' : 'Approved')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'Approved'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-[#23845B]/30 shadow-sm'
              : 'bg-white border-[#E3E8EF] hover:border-emerald-200 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
              Accepted
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#23845B]" />
          </div>
          <div className="text-2xl font-black text-[#23845B] mt-2 group-hover:scale-105 transition-transform">
            {approvedCount}
          </div>
          <div className="text-[11px] font-semibold text-[#23845B] mt-1">
            Verified & Approved
          </div>
        </button>

        {/* Souls Won Harvest */}
        <div className="p-4 rounded-2xl border border-[#E3E8EF] bg-white text-left relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
              Souls Harvest
            </span>
            <Flame className="w-3.5 h-3.5 text-[#C6A45A]" />
          </div>
          <div className="text-2xl font-black text-[#142B4A] mt-2 flex items-baseline gap-1">
            <span>+{totalSoulsWon}</span>
            <span className="text-xs font-semibold text-[#667085]">souls</span>
          </div>
          <div className="text-[11px] font-semibold text-[#C6A45A] mt-1">
            Evangelism + Converts
          </div>
        </div>

        {/* On-Time Filing Rate */}
        <div className="p-4 rounded-2xl border border-[#E3E8EF] bg-white text-left relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
              On-Time Rate
            </span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#FAF6EE] text-[#C6A45A] border border-[#C6A45A]/20">
              Sun 6pm GMT
            </span>
          </div>
          <div className="text-2xl font-black text-[#142B4A] mt-2">
            {onTimeRate}%
          </div>
          <div className="text-[11px] font-semibold text-[#667085] mt-1">
            {onTimeCount} of {reports.length} On-Time
          </div>
        </div>
      </div>

      {/* FILTER, SEARCH & BATCH TOOLKIT */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E8EF] shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Cell, Tutor, Location, Scripture, Notes..."
              className="w-full pl-10 pr-9 py-2 text-xs rounded-xl border border-[#E3E8EF] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20 focus:border-[#142B4A] text-[#182230]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-[#667085] hover:text-[#182230] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Switcher Tabs */}
          <div className="flex items-center gap-1 bg-[#F5F7FA] p-1 rounded-xl border border-[#E3E8EF] text-xs font-semibold text-[#667085]">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                typeFilter === 'all' ? 'bg-[#142B4A] text-white shadow-2xs' : 'hover:text-[#182230]'
              }`}
            >
              <span>All Types</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                typeFilter === 'all' ? 'bg-[#203D63] text-white' : 'bg-[#E3E8EF] text-[#667085]'
              }`}>
                {reports.length}
              </span>
            </button>
            <button
              onClick={() => setTypeFilter('meeting')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                typeFilter === 'meeting' ? 'bg-[#142B4A] text-white shadow-2xs' : 'hover:text-[#182230]'
              }`}
            >
              <FileText className="w-3 h-3 text-[#C6A45A]" />
              <span>Cell Meetings</span>
            </button>
            <button
              onClick={() => setTypeFilter('evangelism')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                typeFilter === 'evangelism' ? 'bg-[#142B4A] text-white shadow-2xs' : 'hover:text-[#182230]'
              }`}
            >
              <Flame className="w-3 h-3 text-[#C6A45A]" />
              <span>Evangelism</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#667085] uppercase">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-[#E3E8EF] bg-[#F5F7FA] text-[#142B4A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="attendance">Highest Attendance</option>
              <option value="souls">Most Souls Won</option>
              <option value="cell">Cell Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Chips Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E3E8EF]">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-[#667085] uppercase mr-1">Status:</span>
            {[
              { id: 'all', label: 'All Statuses' },
              { id: 'Newly Submitted', label: 'Awaiting Decision' },
              { id: 'Approved', label: 'Accepted' },
              { id: 'Needs Correction', label: 'Declined' },
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-[#142B4A] text-white shadow-2xs'
                    : 'bg-[#F5F7FA] text-[#667085] hover:text-[#182230]'
                }`}
              >
                {st.label}
              </button>
            ))}

            <div className="h-4 w-px bg-[#E3E8EF] mx-1" />

            <span className="text-[11px] font-bold text-[#667085] uppercase mr-1">Timing:</span>
            <button
              onClick={() => setDeadlineFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                deadlineFilter === 'all'
                  ? 'bg-[#142B4A] text-white shadow-2xs'
                  : 'bg-[#F5F7FA] text-[#667085] hover:text-[#182230]'
              }`}
            >
              All Timings
            </button>
            <button
              onClick={() => setDeadlineFilter('on_time')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                deadlineFilter === 'on_time'
                  ? 'bg-[#23845B] text-white shadow-2xs'
                  : 'bg-[#F5F7FA] text-[#667085] hover:text-[#182230]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#23845B]" />
              <span>On-Time Only</span>
            </button>
            <button
              onClick={() => setDeadlineFilter('late')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                deadlineFilter === 'late'
                  ? 'bg-[#C74646] text-white shadow-2xs'
                  : 'bg-[#F5F7FA] text-[#667085] hover:text-[#182230]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C74646]" />
              <span>Late Returns</span>
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-[#C6A45A] hover:text-[#142B4A] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* BATCH ACTION BAR (Shown when items are selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-[#142B4A] text-white px-5 py-3 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-[#C6A45A] text-[#142B4A] font-extrabold text-xs flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-xs font-bold">
              {selectedIds.size} {selectedIds.size === 1 ? 'report' : 'reports'} selected for bulk review
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkApproveModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#23845B] hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Bulk Accept</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkReturnModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#C74646] hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Bulk Decline</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* REVIEW QUEUE DATA TABLE */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-[#667085] hover:text-[#142B4A] transition-colors cursor-pointer"
              title="Select / Deselect All on page"
            >
              {selectedIds.size > 0 && selectedIds.size === filteredReports.length ? (
                <CheckSquare className="w-4 h-4 text-[#142B4A]" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <div>
              <h2 className="text-base font-bold text-[#182230]">
                Active Submissions Queue ({filteredReports.length})
              </h2>
              <span className="text-[11px] text-[#667085]">
                {filteredReports.length === 0
                  ? 'No matching submissions found'
                  : `Showing ${filteredReports.length} of ${reports.length} total submissions in database`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#667085]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#23845B]" />
              Approved
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D99A32]" />
              Action Required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C74646]" />
              Needs Correction
            </span>
          </div>
        </div>

        {/* Desktop Table View (Hidden on mobile phones) */}
        <div className="hidden md:block table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">SELECT</th>
                <th className="py-3 px-4">TUTOR & CELL</th>
                <th className="py-3 px-4">CATEGORY & DATE</th>
                <th className="py-3 px-4">ATTENDANCE / SOULS</th>
                <th className="py-3 px-4">FINANCE / OFFERING</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">SUBMISSION TIME & LIVE TRACKING</th>
                <th className="py-3 px-5 text-right">QUICK ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#667085]">
                    <RefreshCw className="w-7 h-7 text-[#C6A45A] animate-spin mx-auto mb-2" />
                    <p className="text-xs font-semibold">Loading live report queue...</p>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#667085]">
                    <div className="w-14 h-14 rounded-2xl bg-[#F5F7FA] text-[#142B4A] flex items-center justify-center mx-auto mb-3 border border-[#E3E8EF] shadow-2xs">
                      <FileCheck className="w-7 h-7 text-[#C6A45A]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#142B4A]">
                      {reports.length === 0
                        ? 'No Reports Submitted Yet'
                        : 'No Submissions Match Filters'}
                    </h3>
                    <p className="text-xs text-[#667085] max-w-md mx-auto mt-1">
                      {reports.length === 0
                        ? 'As soon as cell tutors submit their weekly Cell Meeting or Evangelism reports, they will immediately appear here for your review.'
                        : 'Try adjusting your search criteria or resetting the active status/category filters above.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 px-4 py-1.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredReports.map(item => {
                  const isNeedsCorrection =
                    item.status === 'Needs Correction' || item.status === 'needs_revision';
                  const isApproved = item.status === 'Approved' || item.status === 'approved';
                  const isNewlySubmitted =
                    item.status === 'Newly Submitted' ||
                    item.status === 'submitted' ||
                    item.status === 'under_review';
                  const isSelected = selectedIds.has(item.id);
                  const isQuickProcessing = quickActionProcessingId === item.id;
                  const cellMeta = getCellForReport(item);
                  const cleanPhone = cellMeta?.leader_phone?.replace(/[^0-9]/g, '') || '';
                  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setInspectingItem(item)}
                      className={`cursor-pointer transition-colors group ${
                        isNeedsCorrection
                          ? 'bg-[#FFF5F5] border-l-4 border-[#C74646]'
                          : isSelected
                          ? 'bg-[#F0F5FA]'
                          : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {/* Checkbox indicator */}
                      <td
                        className="py-4 px-5 text-center"
                        onClick={e => {
                          e.stopPropagation();
                          toggleSelectOne(item.id);
                        }}
                      >
                        <div
                          className={`w-4 h-4 rounded border mx-auto flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#142B4A] border-[#142B4A] text-white'
                              : 'border-[#CBD5E1] hover:border-[#142B4A]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </td>

                      {/* Tutor & Cell info */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {item.tutorName
                              ? item.tutorName
                                  .split(' ')
                                  .map(n => n[0])
                                  .slice(0, 2)
                                  .join('')
                              : 'TL'}
                          </div>
                          <div>
                            <div className="font-bold text-[#182230] leading-tight group-hover:text-[#142B4A] transition-colors">
                              {item.tutorName}
                            </div>
                            <div className="text-[11px] font-semibold text-[#667085] mt-0.5 flex items-center gap-2">
                              <span>{item.cellName}</span>
                              {cellMeta?.leader_phone && (
                                <span className="text-[10px] text-[#142B4A]/70 bg-[#F5F7FA] px-1.5 py-0.2 rounded border border-[#E3E8EF]">
                                  {cellMeta.leader_phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Date */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-[#182230]">
                          {item.reportType === 'meeting' ? (
                            <>
                              <FileText className="w-3.5 h-3.5 text-[#142B4A]" />
                              <span>Cell Meeting</span>
                            </>
                          ) : (
                            <>
                              <Flame className="w-3.5 h-3.5 text-[#C6A45A]" />
                              <span>Evangelism</span>
                            </>
                          )}
                        </div>
                        <div className="text-[11px] text-[#667085] mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#667085]" />
                          <span>
                            {item.reportType === 'meeting'
                              ? (item as any).meetingDate
                              : (item as any).date}
                          </span>
                        </div>
                      </td>

                      {/* Attendance / Harvest Metrics */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {item.reportType === 'meeting' ? (
                          <div>
                            <div className="font-extrabold text-[#182230] flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-[#142B4A]" />
                              <span>{(item as any).attendance} Attended</span>
                            </div>
                            <div className="text-[11px] text-[#667085] mt-0.5">
                              {(item as any).members} Total &bull;{' '}
                              <span className="text-[#23845B] font-bold">
                                +{(item as any).newMembers || 0} New
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-extrabold text-[#23845B] flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-[#23845B]" />
                              <span>+{(item as any).conversions} Conversions</span>
                            </div>
                            <div className="text-[11px] text-[#667085] mt-0.5">
                              {(item as any).peopleSpokenTo} Reached &bull;{' '}
                              {(item as any).contactsCaptured} Contacts
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Finance / Offering */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {item.reportType === 'meeting' ? (
                          (item as any).offering ? (
                            <div className="font-bold text-[#182230]">
                              GHS {(item as any).offering?.toLocaleString()}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#667085]">None filed</span>
                          )
                        ) : (
                          <span className="text-[11px] text-[#667085]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-[#23845B] bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#23845B]" />
                            Approved
                          </span>
                        )}
                        {isNewlySubmitted && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-[#D99A32] bg-amber-50 px-2 py-0.5 rounded-full text-[11px] border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D99A32] animate-pulse" />
                            Newly Submitted
                          </span>
                        )}
                        {isNeedsCorrection && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-[#C74646] bg-rose-50 px-2 py-0.5 rounded-full text-[11px] border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C74646]" />
                            Needs Correction
                          </span>
                        )}
                      </td>

                      {/* Deadline Timing */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {item.late ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#C74646] text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C74646]" />
                            Late Submission
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#23845B] text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#23845B]" />
                            On-Time (Sun 6pm)
                          </span>
                        )}
                      </td>

                      {/* Quick Action Buttons */}
                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick WhatsApp Leader */}
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                              title={`WhatsApp ${item.tutorName}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Quick Accept */}
                          {!isApproved && (
                            <button
                              type="button"
                              disabled={isQuickProcessing}
                              onClick={e => handleQuickApprove(item, e)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-[#23845B] hover:bg-emerald-100 inline-flex items-center gap-1 text-[11px] font-bold transition-colors shadow-2xs cursor-pointer border border-emerald-200"
                              title="Accept Report"
                            >
                              {isQuickProcessing ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Accept</span>
                            </button>
                          )}

                          {/* Quick Decline */}
                          {!isNeedsCorrection && (
                            <button
                              type="button"
                              onClick={e => handleQuickReturn(item, e)}
                              className="px-2 py-1 rounded-lg bg-rose-50 text-[#C74646] hover:bg-rose-100 inline-flex items-center gap-1 text-[11px] font-bold transition-colors shadow-2xs cursor-pointer border border-rose-200"
                              title="Decline Report"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          )}

                          {/* Inspect Full Dossier Modal */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setInspectingItem(item);
                            }}
                            className="w-8 h-8 rounded-xl bg-[#F5F7FA] text-[#142B4A] hover:bg-[#142B4A] hover:text-[#C6A45A] flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                            title="Inspect Full Report Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile Touch Cards View (Optimized for smartphones, hidden on md+) */}
        <div className="block md:hidden divide-y divide-[#E3E8EF]">
          {isLoading ? (
            <div className="py-12 text-center text-[#667085]">
              <RefreshCw className="w-7 h-7 text-[#C6A45A] animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold">Loading live report queue...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 px-4 text-center text-[#667085]">
              <div className="w-14 h-14 rounded-2xl bg-[#F5F7FA] text-[#142B4A] flex items-center justify-center mx-auto mb-3 border border-[#E3E8EF] shadow-2xs">
                <FileCheck className="w-7 h-7 text-[#C6A45A]" />
              </div>
              <h3 className="text-sm font-bold text-[#142B4A]">
                {reports.length === 0 ? 'No Reports Submitted Yet' : 'No Submissions Match Filters'}
              </h3>
              <p className="text-xs text-[#667085] mt-1">
                {reports.length === 0
                  ? 'When cell tutors submit reports, they will appear here.'
                  : 'Try adjusting your search criteria or resetting filters.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            filteredReports.map(item => {
              const isNeedsCorrection = item.status === 'Needs Correction' || item.status === 'needs_revision';
              const isApproved = item.status === 'Approved' || item.status === 'approved';
              const isSelected = selectedIds.has(item.id);
              const cellMeta = getCellForReport(item);
              const cleanPhone = cellMeta?.leader_phone?.replace(/[^0-9]/g, '') || '';
              const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;
              const isQuickProcessing = quickActionProcessingId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setInspectingItem(item)}
                  className={`p-4 transition-colors cursor-pointer ${
                    isNeedsCorrection ? 'bg-[#FFF5F5] border-l-4 border-[#C74646]' : isSelected ? 'bg-[#F0F5FA]' : 'bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  {/* Top: Tutor info, checkbox, status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        onClick={e => {
                          e.stopPropagation();
                          toggleSelectOne(item.id);
                        }}
                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                          isSelected ? 'bg-[#142B4A] border-[#142B4A] text-white' : 'border-[#CBD5E1]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {item.tutorName ? item.tutorName.split(' ').map(n => n[0]).slice(0, 2).join('') : 'TL'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs text-[#182230] truncate">{item.tutorName}</h4>
                        <p className="text-[11px] text-[#667085] truncate">{item.cellName}</p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                      isApproved ? 'bg-emerald-50 text-[#23845B] border border-emerald-200' :
                      isNeedsCorrection ? 'bg-rose-50 text-[#C74646] border border-rose-200' :
                      'bg-amber-50 text-[#D99A32] border border-amber-200'
                    }`}>
                      {isApproved ? 'Accepted' : isNeedsCorrection ? 'Declined' : 'Pending'}
                    </span>
                  </div>

                  {/* Live Submission Timing Banner */}
                  {(() => {
                    const liveTime = formatLiveSubmissionTracking(item.submittedAt, liveTicker);
                    return (
                      <div className="mt-2.5 flex items-center justify-between text-[11px] bg-[#F5F7FA] px-2.5 py-1.5 rounded-xl border border-[#E3E8EF]">
                        <div className="flex items-center gap-1.5 text-[#142B4A] font-semibold truncate">
                          <Clock className="w-3.5 h-3.5 text-[#C6A45A] shrink-0" />
                          <span className="truncate">{liveTime.timeFormatted} GMT ({liveTime.relativeTime})</span>
                        </div>
                        <span className={item.late ? 'text-[#C74646] font-bold text-[10px] shrink-0' : 'text-[#23845B] font-bold text-[10px] shrink-0'}>
                          {item.late ? '● Late' : '● On-Time'}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Category & Date Bar */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#667085] bg-white px-2.5 py-1 rounded-xl border border-[#E3E8EF]">
                    <span className="font-bold text-[#142B4A] flex items-center gap-1">
                      {item.reportType === 'meeting' ? <FileText className="w-3 h-3 text-[#142B4A]" /> : <Flame className="w-3 h-3 text-[#C6A45A]" />}
                      {item.reportType === 'meeting' ? 'Cell Meeting' : 'Evangelism'}
                    </span>
                    <span>Meeting: {item.reportType === 'meeting' ? item.meetingDate : item.date}</span>
                  </div>

                  {/* Metrics 2x2 grid */}
                  <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs">
                    <div className="p-2 bg-[#F8FAFC] rounded-xl border border-[#E3E8EF]">
                      <span className="text-[10px] text-[#667085] font-semibold block">
                        {item.reportType === 'meeting' ? 'Attendance' : 'Conversions'}
                      </span>
                      <span className="font-extrabold text-[#182230] text-sm">
                        {item.reportType === 'meeting' ? `${item.attendance} Present` : `+${item.conversions} Souls`}
                      </span>
                    </div>
                    <div className="p-2 bg-[#F8FAFC] rounded-xl border border-[#E3E8EF]">
                      <span className="text-[10px] text-[#667085] font-semibold block">
                        {item.reportType === 'meeting' ? 'Offering' : 'Contacts'}
                      </span>
                      <span className="font-extrabold text-[#182230] text-sm">
                        {item.reportType === 'meeting' ? (item.offering ? `GHS ${item.offering}` : 'None') : `${item.contactsCaptured} Captured`}
                      </span>
                    </div>
                  </div>

                  {/* Touch Action Bar (Thumb-sized buttons) */}
                  <div className="mt-3 pt-2.5 border-t border-[#E3E8EF] flex items-center gap-1.5">
                    {!isApproved && (
                      <button
                        type="button"
                        disabled={isQuickProcessing}
                        onClick={e => handleQuickApprove(item, e)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-50 text-[#23845B] hover:bg-emerald-100 font-extrabold text-xs flex items-center justify-center gap-1 border border-emerald-200 shadow-2xs cursor-pointer min-h-[40px]"
                      >
                        {isQuickProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Accept</span>
                      </button>
                    )}

                    {!isNeedsCorrection && (
                      <button
                        type="button"
                        onClick={e => handleQuickReturn(item, e)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-rose-50 text-[#C74646] hover:bg-rose-100 font-extrabold text-xs flex items-center justify-center gap-1 border border-rose-200 shadow-2xs cursor-pointer min-h-[40px]"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setInspectingItem(item);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#142B4A] text-white hover:bg-[#203D63] font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer min-h-[40px]"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#C6A45A]" />
                      <span>Read Report</span>
                    </button>

                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center border border-emerald-200 shadow-2xs cursor-pointer min-h-[40px] min-w-[40px]"
                        title="WhatsApp Tutor"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* FULL REPORT INSPECTION & REVIEW DOSSIER MODAL */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-[#E3E8EF] max-h-[92vh] overflow-y-auto custom-scrollbar space-y-5 animate-fade-in">
            {/* Modal Navigation Bar & Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E3E8EF]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#667085]">
                  Report {currentInspectIndex + 1} of {filteredReports.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!hasPrev}
                    onClick={handlePrevReport}
                    className="p-1 rounded-lg text-[#667085] hover:text-[#142B4A] hover:bg-[#F5F7FA] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Previous Report in Queue"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={handleNextReport}
                    className="p-1 rounded-lg text-[#667085] hover:text-[#142B4A] hover:bg-[#F5F7FA] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Next Report in Queue"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#142B4A] bg-[#F5F7FA] hover:bg-[#E3E8EF] flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print dossier report"
                >
                  <Printer className="w-3.5 h-3.5 text-[#C6A45A]" />
                  <span className="hidden sm:inline">Print Dossier</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInspectingItem(null);
                    setReviewAction(null);
                    setReviewComment('');
                    if (onClearInitialReportId) onClearInitialReportId();
                  }}
                  className="p-1.5 rounded-xl text-[#667085] hover:text-[#182230] hover:bg-[#F5F7FA] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tutor & Cell Profile Bar */}
            {(() => {
              const cellMeta = getCellForReport(inspectingItem);
              const cleanPhone = cellMeta?.leader_phone?.replace(/[^0-9]/g, '') || '';
              const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;
              const callUrl = cellMeta?.leader_phone ? `tel:${cellMeta.leader_phone}` : null;

              return (
                <div className="p-4 bg-[#FAF6EE] rounded-2xl border border-[#C6A45A]/20 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#142B4A] text-[#C6A45A] font-black text-sm flex items-center justify-center shadow-sm">
                      {inspectingItem.tutorName
                        ? inspectingItem.tutorName
                            .split(' ')
                            .map(n => n[0])
                            .slice(0, 2)
                            .join('')
                        : 'TL'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-[#142B4A]">
                          {inspectingItem.tutorName}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            inspectingItem.status === 'Approved' || inspectingItem.status === 'approved'
                              ? 'bg-emerald-100 text-[#23845B]'
                              : inspectingItem.status === 'Needs Correction' ||
                                inspectingItem.status === 'needs_revision'
                              ? 'bg-rose-100 text-[#C74646]'
                              : 'bg-amber-100 text-[#D99A32]'
                          }`}
                        >
                          {inspectingItem.status}
                        </span>
                      </div>
                      <div className="text-xs text-[#667085] mt-0.5 flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-[#182230]">
                          Cell: {inspectingItem.cellName}
                        </span>
                        {cellMeta?.leader_phone && (
                          <span>Phone: {cellMeta.leader_phone}</span>
                        )}
                        {inspectingItem.late ? (
                          <span className="text-[#C74646] font-bold">● Late Submission</span>
                        ) : (
                          <span className="text-[#23845B] font-bold">● On-Time (Sun 6pm Cutoff)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Direct Contact Links */}
                  <div className="flex items-center gap-2">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp Tutor</span>
                      </a>
                    )}
                    {callUrl && (
                      <a
                        href={callUrl}
                        className="p-2 rounded-xl bg-white border border-[#E3E8EF] text-[#142B4A] hover:bg-[#F5F7FA] text-xs font-bold shadow-2xs cursor-pointer"
                        title="Call Tutor"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {onNavigateToTab && (
                      <button
                        type="button"
                        onClick={() => {
                          setInspectingItem(null);
                          onNavigateToTab('messaging');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#142B4A] text-white hover:bg-[#203D63] text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>In-App Message</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Submission Metadata */}
            <div className="flex flex-wrap items-center justify-between text-xs text-[#667085] px-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#142B4A]">Category:</span>
                <span className="font-semibold text-[#182230]">
                  {inspectingItem.reportType === 'meeting' ? 'Cell Meeting Report' : 'Evangelism Harvest Report'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#142B4A]">Submitted:</span>
                <span>{new Date(inspectingItem.submittedAt).toLocaleString()} GMT</span>
              </div>
            </div>

            {/* CONTENT DETAILS: Meeting vs Evangelism */}
            {inspectingItem.reportType === 'meeting' ? (
              <div className="space-y-4 text-xs">
                {/* 6 Key Meeting Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="p-3 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] text-center">
                    <div className="text-[10px] text-[#667085] font-bold uppercase">Attendance</div>
                    <div className="text-xl font-black text-[#182230] mt-1">
                      {(inspectingItem as any).attendance}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] text-center">
                    <div className="text-[10px] text-[#667085] font-bold uppercase">Total Members</div>
                    <div className="text-xl font-black text-[#182230] mt-1">
                      {(inspectingItem as any).members}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] text-center">
                    <div className="text-[10px] text-[#23845B] font-bold uppercase">New Members</div>
                    <div className="text-xl font-black text-[#23845B] mt-1">
                      +{(inspectingItem as any).newMembers || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] text-center">
                    <div className="text-[10px] text-[#C74646] font-bold uppercase">Absentees</div>
                    <div className="text-xl font-black text-[#C74646] mt-1">
                      {(inspectingItem as any).absentees || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] text-center">
                    <div className="text-[10px] text-[#142B4A] font-bold uppercase">Offering (GHS)</div>
                    <div className="text-base font-black text-[#182230] mt-1">
                      {(inspectingItem as any).offering ? `GHS ${(inspectingItem as any).offering}` : '—'}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] text-center">
                    <div className="text-[10px] text-[#D99A32] font-bold uppercase">Follow-up</div>
                    <div className="text-xl font-black text-[#D99A32] mt-1">
                      {(inspectingItem as any).followUpNeeded || 0}
                    </div>
                  </div>
                </div>

                {/* Meeting Date & Venue */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF] flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#C6A45A]" />
                    <div>
                      <div className="text-[10px] text-[#667085] font-semibold">Meeting Date</div>
                      <div className="text-xs font-bold text-[#182230]">
                        {(inspectingItem as any).meetingDate}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF] flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[#C6A45A]" />
                    <div>
                      <div className="text-[10px] text-[#667085] font-semibold">Meeting Location / Venue</div>
                      <div className="text-xs font-bold text-[#182230]">
                        {(inspectingItem as any).meetingLocation || 'Standard Cell Fellowship Venue'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Word Ministered, Scriptural Theme & Tutor Notes */}
                {((inspectingItem as any).scripturalTheme || (inspectingItem as any).scripturesUsed || (inspectingItem as any).tutorNotes) && (
                  <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] space-y-2">
                    <div className="text-[11px] text-[#142B4A] font-extrabold uppercase flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#C6A45A]" />
                      <span>Word Ministered & Scriptural Theme</span>
                    </div>
                    {((inspectingItem as any).scripturalTheme || (inspectingItem as any).scripturesUsed) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1 border-b border-slate-200/60">
                        {(inspectingItem as any).scripturalTheme && (
                          <div className="text-xs">
                            <span className="text-[10px] uppercase font-bold text-[#667085] block">Theme / Message Topic</span>
                            <span className="font-bold text-[#142B4A]">{(inspectingItem as any).scripturalTheme}</span>
                          </div>
                        )}
                        {(inspectingItem as any).scripturesUsed && (
                          <div className="text-xs">
                            <span className="text-[10px] uppercase font-bold text-[#667085] block">Scriptures Used</span>
                            <span className="font-bold text-[#142B4A]">{(inspectingItem as any).scripturesUsed}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {(inspectingItem as any).tutorNotes && (
                      <div>
                        {((inspectingItem as any).scripturalTheme || (inspectingItem as any).scripturesUsed) && (
                          <span className="text-[10px] uppercase font-bold text-[#667085] block mb-0.5">Lesson Outline / Notes</span>
                        )}
                        <p className="text-xs text-[#182230] whitespace-pre-wrap leading-relaxed">
                          {(inspectingItem as any).tutorNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Testimonies & Experiences */}
                {(inspectingItem as any).testimonies && (
                  <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                    <div className="text-[11px] text-[#23845B] font-extrabold uppercase mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#23845B]" />
                      <span>Testimonies & Experiences Encountered</span>
                    </div>
                    <p className="text-xs text-[#182230] whitespace-pre-wrap italic leading-relaxed">
                      "{(inspectingItem as any).testimonies}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* 4 Key Evangelism Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                    <div className="text-[10px] text-[#23845B] font-extrabold uppercase flex items-center justify-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#23845B]" />
                      <span>Conversions (Souls Won)</span>
                    </div>
                    <div className="text-2xl font-black text-[#23845B] mt-1">
                      +{(inspectingItem as any).conversions}
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] text-center">
                    <div className="text-[10px] text-[#667085] font-bold uppercase">People Reached</div>
                    <div className="text-2xl font-black text-[#182230] mt-1">
                      {(inspectingItem as any).peopleSpokenTo}
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] text-center">
                    <div className="text-[10px] text-[#667085] font-bold uppercase">Contacts Captured</div>
                    <div className="text-2xl font-black text-[#C6A45A] mt-1">
                      {(inspectingItem as any).contactsCaptured}
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] text-center">
                    <div className="text-[10px] text-[#667085] font-bold uppercase">Interested in Ministry</div>
                    <div className="text-2xl font-black text-[#142B4A] mt-1">
                      {(inspectingItem as any).interestedInMinistry || 0}
                    </div>
                  </div>
                </div>

                {/* Outreach Location & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF] flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[#C6A45A]" />
                    <div>
                      <div className="text-[10px] text-[#667085] font-semibold">Outreach Location / Campus</div>
                      <div className="text-xs font-bold text-[#182230]">
                        {(inspectingItem as any).location}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF] flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#C6A45A]" />
                    <div>
                      <div className="text-[10px] text-[#667085] font-semibold">Evangelism Date</div>
                      <div className="text-xs font-bold text-[#182230]">
                        {(inspectingItem as any).date}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                {(inspectingItem as any).teamMembers && (inspectingItem as any).teamMembers.length > 0 && (
                  <div className="p-3.5 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-bold uppercase mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#C6A45A]" />
                      <span>Evangelism Team Members ({(inspectingItem as any).teamMembers.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(inspectingItem as any).teamMembers.map((m: string, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-white border border-[#E3E8EF] rounded-lg text-xs font-semibold text-[#182230] shadow-2xs"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gospel Message & Scriptural Theme Proclaimed */}
                {((inspectingItem as any).scripturalTheme || (inspectingItem as any).scripturesUsed || (inspectingItem as any).messageUsed) && (
                  <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] space-y-2">
                    <div className="text-[11px] text-[#142B4A] font-extrabold uppercase flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#C6A45A]" />
                      <span>Message & Scriptural Theme Proclaimed</span>
                    </div>
                    {((inspectingItem as any).scripturalTheme || (inspectingItem as any).scripturesUsed) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(inspectingItem as any).scripturalTheme && (
                          <div className="text-xs">
                            <span className="text-[10px] uppercase font-bold text-[#667085] block">Scriptural Theme / Message Shared</span>
                            <span className="font-bold text-[#142B4A]">{(inspectingItem as any).scripturalTheme}</span>
                          </div>
                        )}
                        {(inspectingItem as any).scripturesUsed && (
                          <div className="text-xs">
                            <span className="text-[10px] uppercase font-bold text-[#667085] block">Scriptures Used / Bible Passages</span>
                            <span className="font-bold text-[#142B4A]">{(inspectingItem as any).scripturesUsed}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#182230] whitespace-pre-wrap leading-relaxed">
                        {(inspectingItem as any).messageUsed}
                      </p>
                    )}
                  </div>
                )}

                {/* Field Notes & Summary */}
                {(inspectingItem as any).notes && (
                  <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF]">
                    <div className="text-[11px] text-[#142B4A] font-extrabold uppercase mb-1">
                      Field Notes & Observations
                    </div>
                    <p className="text-xs text-[#182230] whitespace-pre-wrap leading-relaxed">
                      {(inspectingItem as any).notes}
                    </p>
                  </div>
                )}

                {/* Testimonies */}
                {(inspectingItem as any).testimonies && (
                  <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                    <div className="text-[11px] text-[#23845B] font-extrabold uppercase mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#23845B]" />
                      <span>Testimonies & Experiences Encountered</span>
                    </div>
                    <p className="text-xs text-[#182230] whitespace-pre-wrap italic leading-relaxed">
                      "{(inspectingItem as any).testimonies}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Previous Review Feedback (Audit Trail) */}
            {inspectingItem.reviewerComment && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-[#D99A32]/30 text-xs">
                <div className="font-extrabold text-[#D99A32] flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Previous Administrative Feedback:</span>
                </div>
                <p className="text-[#182230] italic bg-white/70 p-2.5 rounded-xl border border-amber-200">
                  "{inspectingItem.reviewerComment}"
                </p>
                {inspectingItem.reviewedByName && (
                  <div className="text-[11px] text-[#667085] mt-1.5">
                    Evaluated by {inspectingItem.reviewedByName} on{' '}
                    {new Date(inspectingItem.reviewedAt || '').toLocaleString()} GMT
                  </div>
                )}
              </div>
            )}

            {/* ACTION PANEL: Approve vs Return for Correction */}
            <div className="pt-4 border-t border-[#E3E8EF] space-y-3.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setReviewAction('Approved');
                    setReviewComment('');
                  }}
                  className={`flex-1 py-3 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    reviewAction === 'Approved'
                      ? 'bg-[#23845B] text-white shadow-md'
                      : 'bg-emerald-50 text-[#23845B] hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReviewAction('Needs Correction');
                    setReviewComment('');
                  }}
                  className={`flex-1 py-3 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    reviewAction === 'Needs Correction'
                      ? 'bg-[#C74646] text-white shadow-md'
                      : 'bg-rose-50 text-[#C74646] hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Decline Report</span>
                </button>
              </div>

              {/* Review Comment Box & Preset Feedback Chips */}
              {reviewAction && (
                <div className="space-y-3 pt-2 animate-fade-in bg-[#F8FAFC] p-4 rounded-2xl border border-[#E3E8EF]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-[#182230]">
                      Reviewer Feedback / Directive{' '}
                      {reviewAction === 'Needs Correction' && <span className="text-[#C74646]">*</span>}
                    </label>
                    <span className="text-[10px] text-[#667085]">
                      {reviewAction === 'Needs Correction'
                        ? 'Mandatory feedback required'
                        : 'Optional commendation note'}
                    </span>
                  </div>

                  {/* Quick Preset Feedback Chips */}
                  {reviewAction === 'Needs Correction' && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
                        Quick Preset Notes (Click to insert):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_FEEDBACK_COMMENTS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setReviewComment(prev => (prev ? `${prev} ${preset}` : preset));
                            }}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E3E8EF] hover:border-[#142B4A] text-[#142B4A] hover:bg-[#FAF6EE] text-left transition-colors shadow-2xs cursor-pointer"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder={
                      reviewAction === 'Approved'
                        ? 'Optional administrative commendation or note for leadership archives...'
                        : 'Specify clearly what numbers, receipts, or information the tutor must correct before approval...'
                    }
                    className="w-full p-3 text-xs rounded-xl border border-[#E3E8EF] bg-white focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none text-[#182230] leading-relaxed"
                  />

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setReviewAction(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#667085] hover:bg-[#E3E8EF] transition-colors cursor-pointer"
                    >
                      Cancel Action
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingReview}
                      onClick={handleSubmitReview}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                        reviewAction === 'Approved'
                          ? 'bg-[#23845B] hover:bg-emerald-700'
                          : 'bg-[#C74646] hover:bg-rose-700'
                      }`}
                    >
                      {isSubmittingReview ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Decision...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Confirm {reviewAction === 'Approved' ? 'Acceptance' : 'Decline (Return with Directives)'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BULK ACCEPT MODAL */}
      {isBulkApproveModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E3E8EF] space-y-4 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#23845B] flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#182230]">
                Accept {selectedIds.size} Reports?
              </h3>
              <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                You are about to accept {selectedIds.size} selected reports. Each tutor will receive an official in-app acceptance notification.
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkApproveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#667085] hover:bg-[#F5F7FA] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleBulkApprove}
                className="px-5 py-2.5 rounded-xl bg-[#23845B] hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isBulkProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Acceptance...</span>
                  </>
                ) : (
                  <span>Confirm Bulk Acceptance</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DECLINE MODAL */}
      {isBulkReturnModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E3E8EF] space-y-4 text-left animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#C74646] flex items-center justify-center shrink-0 border border-rose-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#182230]">
                  Decline {selectedIds.size} Reports
                </h3>
                <p className="text-xs text-[#667085]">
                  Tutors will receive an administrative directive to update and resubmit.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#182230]">
                Decline Directives / Corrective Remarks <span className="text-[#C74646]">*</span>
              </label>
              <textarea
                rows={3}
                value={bulkReturnComment}
                onChange={e => setBulkReturnComment(e.target.value)}
                placeholder="State clearly why these reports are declined and what the tutors must correct before resubmitting..."
                className="w-full p-3 text-xs rounded-xl border border-[#E3E8EF] bg-white focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none text-[#182230]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkReturnModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#667085] hover:bg-[#F5F7FA] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleBulkReturn}
                className="px-5 py-2.5 rounded-xl bg-[#C74646] hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isBulkProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Declining Reports...</span>
                  </>
                ) : (
                  <span>Send Decline Directives</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
