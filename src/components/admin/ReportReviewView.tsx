import React, { useState, useEffect } from 'react';
import { UnifiedReportItem, ReportStatus, CellMeetingReport, EvangelismReport } from '../../types';
import { ReportService } from '../../services/reportService';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
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
} from 'lucide-react';

export interface ReportReviewViewProps {
  initialReportId?: string;
  onClearInitialReportId?: () => void;
}

export const ReportReviewView: React.FC<ReportReviewViewProps> = ({
  initialReportId,
  onClearInitialReportId,
}) => {
  const { currentUser } = useAuth();
  const { dispatchNotification } = useNotifications();

  // Data states
  const [reports, setReports] = useState<UnifiedReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'meeting' | 'evangelism'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Single Item Inspection & Review Modal
  const [inspectingItem, setInspectingItem] = useState<UnifiedReportItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Needs Correction' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const queue = await ReportService.getUnifiedReviewQueue({
        reportType: typeFilter,
      });
      setReports(queue);
      setSelectedIds(new Set());

      // If an initial report ID was provided by notification click, open it immediately
      if (initialReportId) {
        const found = queue.find(r => r.id === initialReportId);
        if (found) {
          setInspectingItem(found);
        }
      }
    } finally {
      setIsLoading(false);
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

  // Filtered reports
  const filteredReports = reports.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
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

  const handleBulkApprove = async () => {
    setIsBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        const item = reports.find(r => r.id === id);
        if (item) {
          await ReportService.reviewReport(
            item.id,
            item.reportType,
            'Approved',
            'Bulk approved by Administrator',
            currentUser.id,
            currentUser.full_name
          );
        }
      }
      setIsBulkModalOpen(false);
      setSelectedIds(new Set());
      await loadData();
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Submit Single Review (Approve or Needs Correction)
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

      // Dispatch in-app notification to tutor
      if (inspectingItem.tutorUid) {
        dispatchNotification(
          `Report ${reviewAction}: ${inspectingItem.cellName}`,
          reviewAction === 'Approved'
            ? `Your ${inspectingItem.reportType} report has been officially approved.`
            : `Your ${inspectingItem.reportType} report was returned for correction: "${reviewComment}"`,
          reviewAction === 'Approved' ? 'report_approved' : 'revision_requested',
          'in_app'
        );
      }

      setInspectingItem(null);
      setReviewAction(null);
      setReviewComment('');
      await loadData();
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
            Central Report Review Queue
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Evaluate, approve, or return Cell Meeting Reports and Evangelism Outreaches submitted by tutors.
          </p>
        </div>

        {selectedIds.size > 0 && (
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#23845B] text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Bulk Approve Selected ({selectedIds.size})</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E8EF] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by cell, tutor, location..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E3E8EF] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20 focus:border-[#142B4A] text-[#182230]"
          />
        </div>

        {/* Report Type Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-[#F5F7FA] p-1 rounded-xl border border-[#E3E8EF] text-xs font-semibold text-[#667085]">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              typeFilter === 'all' ? 'bg-[#142B4A] text-white shadow-2xs' : 'hover:text-[#182230]'
            }`}
          >
            All Reports
          </button>
          <button
            onClick={() => setTypeFilter('meeting')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              typeFilter === 'meeting' ? 'bg-[#142B4A] text-white shadow-2xs' : 'hover:text-[#182230]'
            }`}
          >
            Cell Meetings
          </button>
          <button
            onClick={() => setTypeFilter('evangelism')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              typeFilter === 'evangelism' ? 'bg-[#142B4A] text-white shadow-2xs' : 'hover:text-[#182230]'
            }`}
          >
            Evangelism
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          {(['all', 'Newly Submitted', 'Approved', 'Needs Correction'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-[#142B4A] text-white'
                  : 'bg-[#F5F7FA] text-[#667085] hover:text-[#182230]'
              }`}
            >
              {st === 'all' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Review Queue Table (Reference Image Styled!) */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="text-[#667085] hover:text-[#142B4A] transition-colors"
              title="Select / Deselect All"
            >
              {selectedIds.size > 0 && selectedIds.size === filteredReports.length ? (
                <CheckSquare className="w-4 h-4 text-[#142B4A]" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <h2 className="text-base font-bold text-[#182230]">
              Review Queue ({filteredReports.length})
            </h2>
          </div>
          <span className="text-xs text-[#667085]">
            Approved returns cannot be silently overwritten
          </span>
        </div>

        <div className="table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">SELECT</th>
                <th className="py-3 px-4">TUTOR & CELL</th>
                <th className="py-3 px-4">REPORT CATEGORY</th>
                <th className="py-3 px-4">ATTENDANCE / SOULS</th>
                <th className="py-3 px-4">REVIEW STATUS</th>
                <th className="py-3 px-4">DEADLINE TIMING</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    <FileCheck className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No submissions found in this filter.</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map(item => {
                  const isNeedsCorrection =
                    item.status === 'Needs Correction' || item.status === 'needs_revision';
                  const isApproved = item.status === 'Approved' || item.status === 'approved';
                  const isNewlySubmitted =
                    item.status === 'Newly Submitted' || item.status === 'submitted' || item.status === 'under_review';
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setInspectingItem(item)}
                      className={`cursor-pointer transition-colors ${
                        isNeedsCorrection
                          ? 'bg-[#FFF5F5] border-l-4 border-[#C74646]' // Exact reference image alert row!
                          : 'hover:bg-[#F5F7FA]'
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
                          className={`w-4 h-4 rounded-full border mx-auto flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#142B4A] border-[#142B4A] text-white'
                              : 'border-[#CBD5E1] hover:border-[#142B4A]'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </td>

                      {/* Name & Avatar Column */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                            {item.tutorName
                              ? item.tutorName
                                  .split(' ')
                                  .map(n => n[0])
                                  .slice(0, 2)
                                  .join('')
                              : 'TL'}
                          </div>
                          <div>
                            <div className="font-bold text-[#182230] leading-tight">
                              {item.tutorName}
                            </div>
                            <div className="text-[11px] text-[#667085] mt-0.5">
                              {item.cellName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Report Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#182230]">
                          {item.reportType === 'meeting' ? 'Cell Meeting Report' : 'Evangelism Report'}
                        </div>
                        <div className="text-[11px] text-[#667085]">
                          Date:{' '}
                          {item.reportType === 'meeting'
                            ? (item as any).meetingDate
                            : (item as any).date}
                        </div>
                      </td>

                      {/* Stats */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {item.reportType === 'meeting' ? (
                          <div>
                            <div className="font-bold text-[#182230]">
                              {(item as any).attendance} Attended
                            </div>
                            <div className="text-[11px] text-[#667085]">
                              {(item as any).members} Total &bull; {(item as any).newMembers || 0} New
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-[#23845B]">
                              +{(item as any).conversions} Conversions
                            </div>
                            <div className="text-[11px] text-[#667085]">
                              {(item as any).peopleSpokenTo} Reached &bull; {(item as any).contactsCaptured} Contacts
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Review Status with Colored Dot */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#23845B]">
                            <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                            Approved
                          </span>
                        )}
                        {isNewlySubmitted && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#D99A32]">
                            <span className="w-2 h-2 rounded-full bg-[#D99A32]" />
                            Newly Submitted
                          </span>
                        )}
                        {isNeedsCorrection && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                            <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                            Needs Correction
                          </span>
                        )}
                      </td>

                      {/* Deadline Timing */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {item.late ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                            <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                            Late Submission
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#23845B]">
                            <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                            On-Time (Sun 6pm GMT)
                          </span>
                        )}
                      </td>

                      {/* Circular Action Button */}
                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setInspectingItem(item);
                          }}
                          className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 inline-flex items-center justify-center transition-colors shadow-2xs"
                          title="Inspect & Review"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL REPORT INSPECTION & REVIEW MODAL */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-xl border border-[#E3E8EF] max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#E3E8EF]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#142B4A]">
                    {inspectingItem.reportType === 'meeting' ? 'Cell Meeting Report' : 'Evangelism Report'}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    inspectingItem.status === 'Approved'
                      ? 'bg-emerald-50 text-[#23845B]'
                      : inspectingItem.status === 'Needs Correction'
                      ? 'bg-rose-50 text-[#C74646]'
                      : 'bg-amber-50 text-[#D99A32]'
                  }`}>
                    {inspectingItem.status}
                  </span>
                </div>
                <p className="text-xs text-[#667085] mt-0.5">
                  Cell: <span className="font-bold text-[#182230]">{inspectingItem.cellName}</span> &bull; Tutor: <span className="font-bold text-[#182230]">{inspectingItem.tutorName}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setInspectingItem(null);
                  setReviewAction(null);
                  setReviewComment('');
                }}
                className="p-1 rounded-lg text-[#667085] hover:text-[#182230] hover:bg-[#F5F7FA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Details: Meeting vs Evangelism */}
            {inspectingItem.reportType === 'meeting' ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold">Attendance</div>
                    <div className="text-base font-bold text-[#182230] mt-0.5">{(inspectingItem as any).attendance}</div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold">Total Members</div>
                    <div className="text-base font-bold text-[#182230] mt-0.5">{(inspectingItem as any).members}</div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold">New Members</div>
                    <div className="text-base font-bold text-[#23845B] mt-0.5">{(inspectingItem as any).newMembers || 0}</div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold">Absentees</div>
                    <div className="text-base font-bold text-[#C74646] mt-0.5">{(inspectingItem as any).absentees || 0}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold">Offering Collected</div>
                    <div className="text-sm font-bold text-[#182230] mt-0.5">
                      {(inspectingItem as any).offering ? `GHS ${(inspectingItem as any).offering}` : 'Not recorded'}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold">Requires Follow-up</div>
                    <div className="text-sm font-bold text-[#D99A32] mt-0.5">
                      {(inspectingItem as any).followUpNeeded || 0} people
                    </div>
                  </div>
                </div>

                {(inspectingItem as any).tutorNotes && (
                  <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold uppercase mb-1">Tutor Meeting Notes</div>
                    <p className="text-xs text-[#182230] whitespace-pre-wrap">{(inspectingItem as any).tutorNotes}</p>
                  </div>
                )}

                {(inspectingItem as any).testimonies && (
                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-[#23845B] font-bold uppercase mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#23845B]" />
                      <span>Testimonies & Experiences Encountered</span>
                    </div>
                    <p className="text-xs text-[#182230] whitespace-pre-wrap italic">{(inspectingItem as any).testimonies}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold">Conversions (Souls Won)</div>
                    <div className="text-base font-bold text-[#23845B] mt-0.5">+{(inspectingItem as any).conversions}</div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold">People Reached</div>
                    <div className="text-base font-bold text-[#182230] mt-0.5">{(inspectingItem as any).peopleSpokenTo}</div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold">Contacts Captured</div>
                    <div className="text-base font-bold text-[#C6A45A] mt-0.5">{(inspectingItem as any).contactsCaptured}</div>
                  </div>
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold">Interested in Ministry</div>
                    <div className="text-base font-bold text-[#142B4A] mt-0.5">{(inspectingItem as any).interestedInMinistry || 0}</div>
                  </div>
                </div>

                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085] font-semibold">Outreach Location / Campus</div>
                  <div className="text-xs font-bold text-[#182230] mt-0.5">{(inspectingItem as any).location}</div>
                </div>

                {(inspectingItem as any).teamMembers && (inspectingItem as any).teamMembers.length > 0 && (
                  <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold mb-1">Evangelism Team Members</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(inspectingItem as any).teamMembers.map((m: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-white border border-[#E3E8EF] rounded-md text-[11px] font-semibold text-[#182230]">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(inspectingItem as any).messageUsed && (
                  <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold uppercase mb-1">Gospel Message / Scriptures Used</div>
                    <p className="text-xs text-[#182230] whitespace-pre-wrap">{(inspectingItem as any).messageUsed}</p>
                  </div>
                )}

                {(inspectingItem as any).notes && (
                  <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                    <div className="text-[10px] text-[#667085] font-semibold uppercase mb-1">Evangelism Summary & Observations</div>
                    <p className="text-xs text-[#182230] whitespace-pre-wrap">{(inspectingItem as any).notes}</p>
                  </div>
                )}

                {(inspectingItem as any).testimonies && (
                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-[#23845B] font-bold uppercase mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#23845B]" />
                      <span>Testimonies & Experiences Encountered</span>
                    </div>
                    <p className="text-xs text-[#182230] whitespace-pre-wrap italic">{(inspectingItem as any).testimonies}</p>
                  </div>
                )}
              </div>
            )}

            {/* Previous Reviewer Remarks if any */}
            {inspectingItem.reviewerComment && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-[#D99A32]/40 text-xs text-[#182230]">
                <div className="font-bold text-[#D99A32] mb-1">Review Feedback Recorded:</div>
                <p className="italic">"{inspectingItem.reviewerComment}"</p>
                {inspectingItem.reviewedByName && (
                  <div className="text-[10px] text-[#667085] mt-1">
                    Reviewed by {inspectingItem.reviewedByName} on {new Date(inspectingItem.reviewedAt || '').toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons: Approve vs Needs Correction */}
            <div className="pt-3 border-t border-[#E3E8EF] space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction('Approved')}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    reviewAction === 'Approved'
                      ? 'bg-[#23845B] text-white shadow-sm'
                      : 'bg-emerald-50 text-[#23845B] hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Report
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction('Needs Correction')}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    reviewAction === 'Needs Correction'
                      ? 'bg-[#C74646] text-white shadow-sm'
                      : 'bg-rose-50 text-[#C74646] hover:bg-rose-100'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Return for Correction
                </button>
              </div>

              {reviewAction && (
                <div className="space-y-2 pt-1 animate-fade-in">
                  <label className="block text-xs font-bold text-[#182230]">
                    Reviewer Comments & Feedback {reviewAction === 'Needs Correction' && <span className="text-[#C74646]">*</span>}
                  </label>
                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder={
                      reviewAction === 'Approved'
                        ? 'Optional commendation or administrative note...'
                        : 'Please state what needs correction or clarification...'
                    }
                    className="w-full p-2.5 text-xs rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setReviewAction(null)}
                      className="px-3.5 py-1.5 rounded-xl text-xs text-[#667085] hover:bg-[#F5F7FA]"
                    >
                      Cancel Action
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingReview}
                      onClick={handleSubmitReview}
                      className="px-4 py-2 rounded-xl bg-[#142B4A] text-white font-bold text-xs hover:bg-[#203D63] transition-colors"
                    >
                      {isSubmittingReview ? 'Recording Decision...' : 'Confirm Decision'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BULK APPROVE CONFIRMATION MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[#E3E8EF] space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#23845B] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#182230]">
                Approve {selectedIds.size} Reports?
              </h3>
              <p className="text-xs text-[#667085] mt-1">
                You are about to bulk approve {selectedIds.size} selected reports. Tutors will be notified in-app.
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#667085] hover:bg-[#F5F7FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleBulkApprove}
                className="px-5 py-2 rounded-xl bg-[#23845B] text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
              >
                {isBulkProcessing ? 'Approving...' : 'Confirm Bulk Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
