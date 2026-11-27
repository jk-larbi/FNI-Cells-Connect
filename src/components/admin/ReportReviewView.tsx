import { exportCsvFile } from '../../utils/mobileExport';
import React, { useState, useEffect, useMemo } from 'react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { UnifiedReportItem, ReportStatus, Cell, EvangelismContact } from '../../types';
import { ReportService } from '../../services/reportService';
import { CellService } from '../../services/cellService';
import { FollowUpService } from '../../services/followUpService';
import { SoulTargetService } from '../../services/soulTargetService';
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
  const [loadError, setLoadError] = useState<string | null>(null);
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
  const [reviewOutcome, setReviewOutcome] = useState<'approved' | null>(null);
  const [lastReviewedReport, setLastReviewedReport] = useState<UnifiedReportItem | null>(null);

  // Back navigation interceptor: closes report inspection dossier before leaving view
  useBackHandler(() => {
    if (reviewOutcome) {
      setReviewOutcome(null);
      setLastReviewedReport(null);
      return true;
    }
    if (inspectingItem) {
      setInspectingItem(null);
      setReviewAction(null);
      setReviewReasons([]);
      if (onClearInitialReportId) onClearInitialReportId();
      return true;
    }
    return false;
  }, Boolean(inspectingItem || reviewOutcome));

  const handleBackNavigation = () => {
    if (reviewOutcome) {
      setReviewOutcome(null);
      setLastReviewedReport(null);
    } else if (inspectingItem) {
      setInspectingItem(null);
      setReviewAction(null);
      setReviewReasons([]);
      if (onClearInitialReportId) onClearInitialReportId();
    } else if (onBack) {
      onBack();
    }
  };
  const [reportContacts, setReportContacts] = useState<EvangelismContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Needs Correction' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewReasons, setReviewReasons] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [quickActionProcessingId, setQuickActionProcessingId] = useState<string | null>(null);

  // Load the individual follow-up contacts linked to the report being inspected.
  useEffect(() => {
    let active = true;
    const loadLinkedContacts = async () => {
      if (!inspectingItem || inspectingItem.reportType !== 'evangelism') {
        setReportContacts([]);
        setContactsLoading(false);
        return;
      }

      setContactsLoading(true);
      try {
        const allContacts = await FollowUpService.getContacts({
          cellId: inspectingItem.cellId,
          tutorUid: inspectingItem.tutorUid,
        });
        if (active) {
          // Only show records explicitly linked to this report. Do not mix
          // unrelated contacts from the same tutor or cell into this dossier.
          setReportContacts(allContacts.filter(contact => contact.evangelismReportId === inspectingItem.id));
        }
      } catch (error) {
        console.warn('Could not load contacts linked to this evangelism report:', error);
        if (active) setReportContacts([]);
      } finally {
        if (active) setContactsLoading(false);
      }
    };

    void loadLinkedContacts();
    return () => { active = false; };
  }, [inspectingItem?.id, inspectingItem?.reportType]);

  // Load Reports and Cells from live backend
  const loadData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      else setIsLoading(true);
      setLoadError(null);

      const [queue, loadedCells] = await Promise.all([
        ReportService.getUnifiedReviewQueue({ reportType: typeFilter }),
        CellService.getCells(),
      ]);

      // A report belongs in the active approval queue only while its cell
      // registration still exists and has not been archived. Keep report rows
      // in storage for historical records; this is only an approval-queue filter.
      const registeredCellIds = new Set(
        loadedCells.filter(cell => cell.is_active && !cell.is_archived).map(cell => cell.id)
      );
      const activeQueue = queue.filter(report =>
        Boolean(report.cellId) && registeredCellIds.has(report.cellId)
      );

      setReports(activeQueue);
      setCells(loadedCells);
      setLoadError(null);
      setSelectedIds(new Set());
      setInspectingItem(current =>
        current && !activeQueue.some(report => report.id === current.id) ? null : current
      );

      // If initialReportId provided (e.g. from notification deep-link), open it immediately
      if (initialReportId) {
        const found = activeQueue.find(r => r.id === initialReportId);
        if (found) {
          setInspectingItem(found);
        }
      }
    } catch (error) {
      console.error('Could not load the report review queue:', error);
      setLoadError('The report queue could not be loaded. Check your connection and try again.');
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
    void loadData();
    // Reports, cell changes and finance-triggered report updates refresh the queue across devices.
    const unsubscribe = SoulTargetService.subscribeToLiveSoulTracking(() => {
      void loadData(true);
    });
    return unsubscribe;
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
    } catch (error: any) {
      alert(error?.message || 'The report decision could not be saved. Please try again.');
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
    } catch (error: any) {
      alert(error?.message || 'The report decision could not be saved. Please try again.');
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
      setLastReviewedReport(item);
      setReviewOutcome('approved');
    } catch (error: any) {
      alert(error?.message || 'The report decision could not be saved. Please try again.');
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
    const combinedComment = [
      ...reviewReasons,
      ...(reviewComment.trim() ? [reviewComment.trim()] : []),
    ].join('\n\n');
    if (reviewAction === 'Needs Correction' && !combinedComment.trim()) {
      alert('Select at least one item requiring an update or enter a message to the cell leader.');
      return;
    }

    const reviewedItem = inspectingItem;
    setIsSubmittingReview(true);
    try {
      await ReportService.reviewReport(
        reviewedItem.id,
        reviewedItem.reportType,
        reviewAction,
        combinedComment,
        currentUser.id,
        currentUser.full_name
      );

      setInspectingItem(null);
      setReviewAction(null);
      setReviewComment('');
      setReviewReasons([]);
      if (onClearInitialReportId) onClearInitialReportId();
      await loadData();
      if (reviewAction === 'Approved') {
        setLastReviewedReport(reviewedItem);
        setReviewOutcome('approved');
      }
    } catch (error: any) {
      alert(error?.message || 'The report decision could not be saved. Please try again.');
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
  const handleExportCSV = async () => {
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

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    await exportCsvFile(`FNI_Report_Review_Queue_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
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

  if (reviewOutcome === 'approved' && lastReviewedReport) {
    const approvedAttendance = lastReviewedReport.reportType === 'meeting' ? Number((lastReviewedReport as any).attendance) || 0 : null;
    const approvedOffering = lastReviewedReport.reportType === 'meeting' ? (lastReviewedReport as any).offering : null;
    const approvedSouls = lastReviewedReport.reportType === 'evangelism'
      ? Number((lastReviewedReport as any).conversions) || 0
      : Number((lastReviewedReport as any).newMembers) || 0;
    return (
      <div className="fni-report-approved-page">
        <article className="fni-report-approved-card">
          <span className="fni-report-approved-icon"><CheckCircle2 className="w-8 h-8" /></span>
          <p className="fni-report-approved-eyebrow">REPORT REVIEW COMPLETE</p>
          <h1>Report approved</h1>
          <p className="fni-report-approved-description">
            <strong>{lastReviewedReport.cellName}</strong>'s {lastReviewedReport.reportType === 'meeting' ? 'weekly fellowship report' : 'evangelism report'} has been approved and recorded.
            {pendingCount > 0 ? ` ${pendingCount} reports remain in your queue.` : ' There are no pending reports in your queue.'}
          </p>
          <div className="fni-report-approved-summary">
            {approvedAttendance !== null && <div><span>Attendance</span><strong>{approvedAttendance.toLocaleString()}</strong></div>}
            {approvedOffering !== null && approvedOffering !== undefined && <div><span>Offering</span><strong>{(lastReviewedReport as any).currency || 'GHS'} {Number(approvedOffering).toLocaleString()}</strong></div>}
            <div><span>Souls / new members</span><strong>{approvedSouls.toLocaleString()}</strong></div>
          </div>
          <div className="fni-report-approved-actions">
            <button type="button" className="fni-report-secondary-action" onClick={() => { setReviewOutcome(null); setLastReviewedReport(null); onBack?.(); }}>Back to overview</button>
            <button type="button" className="fni-report-primary-action" onClick={() => { setReviewOutcome(null); setLastReviewedReport(null); setInspectingItem(null); setStatusFilter('Newly Submitted'); setSelectedIds(new Set()); }}>
              Review next report <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="fni-report-review-stitch">
      <header className="fni-rr-header">
        <div>
          <p className="fni-rr-eyebrow">ADMIN WORKSPACE / PERFORMANCE</p>
          <h1>Review reports</h1>
          <p>Review cell meeting and evangelism submissions, approve them or return them with clear guidance.</p>
        </div>
        <div className="fni-rr-header-actions">
          <button type="button" onClick={() => void loadData(true)} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button type="button" onClick={handleExportCSV} disabled={filteredReports.length === 0}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </header>

      <section className="fni-rr-queue-panel" aria-label="Report review queue">
        <div className="fni-rr-status-tabs" role="tablist" aria-label="Report status">
          <button type="button" role="tab" aria-selected={statusFilter === 'Newly Submitted'} className={statusFilter === 'Newly Submitted' ? 'is-active is-pending' : ''} onClick={() => setStatusFilter('Newly Submitted')}>
            Pending <span>{pendingCount}</span>
          </button>
          <button type="button" role="tab" aria-selected={statusFilter === 'Needs Correction'} className={statusFilter === 'Needs Correction' ? 'is-active is-returned' : ''} onClick={() => setStatusFilter('Needs Correction')}>
            Returned <span>{needsCorrectionCount}</span>
          </button>
          <button type="button" role="tab" aria-selected={statusFilter === 'Approved'} className={statusFilter === 'Approved' ? 'is-active is-approved' : ''} onClick={() => setStatusFilter('Approved')}>
            Approved <span>{approvedCount}</span>
          </button>
        </div>

        <div className="fni-rr-filter-row">
          <label className="fni-rr-search"><Search className="w-4 h-4" /><input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search by cell or leader" aria-label="Search by cell or leader" />{searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"><X className="w-4 h-4" /></button>}</label>
          <label><Filter className="w-4 h-4" /><select value={typeFilter} onChange={event => setTypeFilter(event.target.value as 'all' | 'meeting' | 'evangelism')} aria-label="Filter report type"><option value="all">All report types</option><option value="meeting">Cell meeting</option><option value="evangelism">Evangelism</option></select></label>
          <label><Clock className="w-4 h-4" /><select value={deadlineFilter} onChange={event => setDeadlineFilter(event.target.value as 'all' | 'on_time' | 'late')} aria-label="Filter submission time"><option value="all">All submissions</option><option value="on_time">On time</option><option value="late">Submitted late</option></select></label>
          <label><SlidersHorizontal className="w-4 h-4" /><select value={sortBy} onChange={event => setSortBy(event.target.value as 'newest' | 'oldest' | 'attendance' | 'souls' | 'cell')} aria-label="Sort reports"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="attendance">Highest attendance</option><option value="souls">Most souls</option><option value="cell">Cell name</option></select></label>
        </div>

        {selectedIds.size > 0 && (
          <div className="fni-rr-bulk-bar">
            <span>{selectedIds.size} report(s) selected</span>
            <button type="button" onClick={() => setIsBulkApproveModalOpen(true)}><CheckCircle2 className="w-4 h-4" /> Approve selected</button>
            <button type="button" onClick={() => setIsBulkReturnModalOpen(true)}><RotateCcw className="w-4 h-4" /> Return selected</button>
            <button type="button" className="fni-rr-clear-selection" onClick={() => setSelectedIds(new Set())}>Clear selection</button>
          </div>
        )}
      </section>

      {loadError && <div className="fni-rr-error" role="alert"><AlertCircle className="w-4 h-4" /><span>{loadError}</span><button type="button" onClick={() => void loadData(true)}>Try again</button></div>}

      {isLoading ? (
        <div className="fni-rr-empty-state"><RefreshCw className="w-5 h-5 animate-spin" /><strong>Loading report queue…</strong><span>Fetching the latest submissions from the ministry database.</span></div>
      ) : filteredReports.length === 0 ? (
        <div className="fni-rr-empty-state"><FileCheck className="w-6 h-6" /><strong>No reports in this view</strong><span>{searchQuery ? 'Try changing your search or filters.' : 'New submissions will appear here when cell leaders submit their reports.'}</span></div>
      ) : (
        <section className="fni-rr-report-list" aria-label="Reports">
          <div className="fni-rr-list-toolbar">
            <label className="fni-rr-select-all"><input type="checkbox" checked={selectedIds.size === filteredReports.length && filteredReports.length > 0} onChange={toggleSelectAll} /> Select all visible</label>
            <span>{filteredReports.length} report(s)</span>
          </div>
          <div className="fni-rr-report-grid">
            {filteredReports.map(item => {
              const cellMeta = getCellForReport(item);
              const isQuickProcessing = quickActionProcessingId === item.id;
              const liveTime = formatLiveSubmissionTracking(item.submittedAt, liveTicker);
              const statusText = item.status === 'Newly Submitted' || item.status === 'submitted' || item.status === 'under_review'
                ? 'Pending review'
                : item.status === 'Needs Correction' || item.status === 'needs_revision'
                  ? 'Returned'
                  : item.status === 'Approved' || item.status === 'approved' ? 'Approved' : item.status;
              const metricLabel = item.reportType === 'meeting' ? 'Attendance' : 'Souls won';
              const metricValue = item.reportType === 'meeting' ? Number((item as any).attendance) || 0 : Number((item as any).conversions) || 0;
              const secondaryMetric = item.reportType === 'meeting'
                ? `Offering: ${(item as any).currency || 'GHS'} ${Number((item as any).offering || 0).toLocaleString()}`
                : `People reached: ${Number((item as any).peopleSpokenTo || 0).toLocaleString()}`;
              return (
                <article key={item.id} className="fni-rr-report-card" onClick={() => setInspectingItem(item)}>
                  <div className="fni-rr-card-top">
                    <label className="fni-rr-select-report" onClick={event => event.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelectOne(item.id)} aria-label={`Select report from ${item.cellName}`} />
                    </label>
                    <StatusPill status={statusText} />
                    <span className={`fni-rr-type-pill ${item.reportType === 'meeting' ? 'is-meeting' : 'is-evangelism'}`}>{item.reportType === 'meeting' ? 'Cell meeting' : 'Evangelism'}</span>
                    <span className={item.late ? 'fni-rr-deadline is-late' : 'fni-rr-deadline is-on-time'}>{item.late ? 'Submitted late' : 'On time'}</span>
                  </div>
                  <div className="fni-rr-card-identity">
                    <div className="fni-rr-cell-avatar">{item.cellName.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()}</div>
                    <div><h2>{item.cellName}</h2><p>{item.tutorName} {cellMeta?.leader_phone ? `· ${cellMeta.leader_phone}` : ''}</p><small>Submitted {new Date(item.submittedAt).toLocaleString('en-GB')}</small></div>
                  </div>
                  <div className="fni-rr-card-metrics">
                    <div><span>{metricLabel}</span><strong>{metricValue.toLocaleString()}</strong></div>
                    <div><span>{item.reportType === 'meeting' ? 'New members' : 'People reached'}</span><strong>{item.reportType === 'meeting' ? Number((item as any).newMembers || 0).toLocaleString() : Number((item as any).peopleSpokenTo || 0).toLocaleString()}</strong></div>
                    <div><span>Report type</span><strong>{item.reportType === 'meeting' ? 'Fellowship' : 'Outreach'}</strong></div>
                  </div>
                  <div className="fni-rr-live-time"><Clock className="w-3.5 h-3.5" /><span>{liveTime}</span><span className="fni-rr-secondary-metric">{secondaryMetric}</span></div>
                  <div className="fni-rr-card-actions">
                    <button type="button" className="fni-rr-review-button" onClick={event => { event.stopPropagation(); setInspectingItem(item); setReviewAction(null); setReviewReasons([]); }}>Review report <ChevronRight className="w-4 h-4" /></button>
                    {statusText === 'Pending review' && (
                      <>
                        <button type="button" className="fni-rr-approve-button" disabled={isQuickProcessing} onClick={event => void handleQuickApprove(item, event)}>{isQuickProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve</button>
                        <button type="button" className="fni-rr-return-button" onClick={event => handleQuickReturn(item, event)}><RotateCcw className="w-3.5 h-3.5" /> Return</button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* FULL REPORT INSPECTION & REVIEW DOSSIER MODAL */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-stretch justify-center p-0 sm:items-center sm:p-4">
          <div className={`fni-report-dossier ${inspectingItem.reportType === "meeting" ? "fni-cell-meeting-dossier" : "fni-evangelism-dossier"} h-[100dvh] w-full max-w-none rounded-none bg-white px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl border-0 max-h-[100dvh] overflow-y-auto custom-scrollbar space-y-5 animate-fade-in sm:h-auto sm:max-w-3xl sm:rounded-3xl sm:border sm:border-[#E3E8EF] sm:p-6 sm:max-h-[92vh]` }>
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
                    <div className="text-[10px] text-[#667085] font-bold uppercase">Active Members</div>
                    <div className="text-xl font-black text-[#182230] mt-1">
                      {(inspectingItem as any).activeMembers ?? '—'}
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
                    <div className="text-[10px] text-[#142B4A] font-bold uppercase">Offering ({(inspectingItem as any).currency || 'GHS'})</div>
                    <div className="text-base font-black text-[#182230] mt-1">
                      {(inspectingItem as any).offering !== undefined && (inspectingItem as any).offering !== null
                        ? `${(inspectingItem as any).currency || 'GHS'} ${(inspectingItem as any).offering}`
                        : '—'}
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

                {(inspectingItem as any).tutorExperience && (
                  <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF]">
                    <div className="text-[11px] text-[#142B4A] font-extrabold uppercase mb-1">Tutor Experience / Reflection</div>
                    <p className="text-xs text-[#182230] whitespace-pre-wrap leading-relaxed">{(inspectingItem as any).tutorExperience}</p>
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
                    <div className="text-[10px] text-[#667085] font-bold uppercase">Target</div>
                    <div className="text-2xl font-black text-[#182230] mt-1">
                      {(inspectingItem as any).preSetTarget ?? '—'}
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
                    <div className="text-[10px] text-[#23845B] font-bold uppercase">Verified Souls Won</div>
                    <div className="text-2xl font-black text-[#23845B] mt-1">
                      {(inspectingItem as any).verifiedSoulsWon ?? (inspectingItem as any).conversions ?? 0}
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] text-center">
                    <div className="text-[10px] text-[#667085] font-bold uppercase">Interested in Ministry</div>
                    <div className="text-2xl font-black text-[#142B4A] mt-1">
                      {(inspectingItem as any).interestedInMinistry || 0}
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] text-center">
                    <div className="text-[10px] text-[#D99A32] font-bold uppercase">Potential Follow-ups</div>
                    <div className="text-2xl font-black text-[#D99A32] mt-1">
                      {(inspectingItem as any).potentialFollowUps ?? 0}
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

                {/* Individual people captured in this specific outreach report */}
                <div className="p-4 bg-[#FAF6EE] rounded-2xl border border-[#C6A45A]/25 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-[#142B4A] font-extrabold uppercase">Captured Contacts & Follow-up Details</div>
                      <p className="mt-0.5 text-[10px] text-[#667085]">People records explicitly linked to this evangelism report</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#142B4A]">{reportContacts.length} records</span>
                  </div>
                  {contactsLoading ? (
                    <p className="text-xs text-[#667085]">Loading linked contact records...</p>
                  ) : reportContacts.length === 0 ? (
                    <p className="text-xs text-[#667085]">No individual contact records are linked to this report. The contacts-captured total above is still shown as submitted.</p>
                  ) : (
                    <div className="space-y-2">
                      {reportContacts.map((contact, index) => (
                        <div key={contact.id} className="rounded-xl border border-[#E3E8EF] bg-white p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-extrabold text-[#142B4A]">{contact.contactName || contact.name || `Contact ${index + 1}`}</p>
                              <p className="text-[10px] text-[#667085]">Captured {contact.dateCaptured || '—'}</p>
                            </div>
                            <span className="rounded-full bg-[#F5F7FA] px-2 py-1 text-[10px] font-bold text-[#142B4A]">{contact.followUpStatus || 'Status not recorded'}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <p className="break-words text-[#182230]">Phone: {contact.phone || contact.contactDetails || '—'}</p>
                            <p className="break-words text-[#182230]">WhatsApp: {contact.whatsappNumber || '—'}</p>
                            <p className="break-words text-[#182230]">Email: {contact.email || '—'}</p>
                            <p className="break-words text-[#182230]">Location: {contact.location || contact.evangelismLocation || '—'}</p>
                            <p className="break-words text-[#182230]">Assigned to: {contact.assignedToName || contact.tutorName || '—'}</p>
                            <p className="break-words text-[#182230]">Next follow-up: {contact.nextFollowUpDate || '—'}</p>
                          </div>
                          {(contact.followUpNotes || contact.notes) && (
                            <p className="whitespace-pre-wrap text-xs text-[#182230]">Notes: {contact.followUpNotes || contact.notes}</p>
                          )}
                          {contact.history && contact.history.length > 0 && (
                            <div className="border-t border-[#E3E8EF] pt-2 space-y-1">
                              <p className="text-[10px] font-bold uppercase text-[#667085]">Follow-up history</p>
                              {contact.history.map((entry, historyIndex) => (
                                <p key={historyIndex} className="text-[10px] text-[#667085]">
                                  {entry.changedAt ? new Date(entry.changedAt).toLocaleString() : 'Date not recorded'} · {entry.status}{entry.note ? ` — ${entry.note}` : ''}{entry.changedBy ? ` · ${entry.changedBy}` : ''}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
              <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
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
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
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
