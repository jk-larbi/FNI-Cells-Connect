import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ReportService } from '../../services/reportService';
import { UnifiedReportItem, CellMeetingReport, EvangelismReport } from '../../types';
import {
  FileCheck,
  Search,
  Filter,
  Eye,
  Edit2,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  Send,
  FileText,
  Flame,
  MessageSquare,
} from 'lucide-react';

interface MyReportsViewProps {
  onEditMeetingReport?: (report: CellMeetingReport) => void;
  onEditEvangelismReport?: (report: EvangelismReport) => void;
}

export const MyReportsView: React.FC<MyReportsViewProps> = ({
  onEditMeetingReport,
  onEditEvangelismReport,
}) => {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<UnifiedReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'meeting' | 'evangelism'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingItem, setInspectingItem] = useState<UnifiedReportItem | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const queue = await ReportService.getUnifiedReviewQueue({
        reportType: typeFilter,
        cellId: currentUser.cell_id || undefined,
        tutorUid: currentUser.id,
      });
      setReports(queue);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [typeFilter, currentUser]);

  const filtered = reports.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.cellName.toLowerCase().includes(q) ||
      (r.reportType === 'evangelism' && (r as any).location?.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all' ||
      r.status === statusFilter ||
      (statusFilter === 'Approved' && r.status === 'approved') ||
      (statusFilter === 'Needs Correction' && r.status === 'needs_revision');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
            My Submitted Returns
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            History of cell meeting reports and evangelism outreaches filed for your fellowship cell.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E8EF] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search your returns..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E3E8EF] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20 focus:border-[#142B4A] text-[#182230]"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 bg-[#F5F7FA] p-1 rounded-xl border border-[#E3E8EF] text-xs font-semibold text-[#667085]">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              typeFilter === 'all' ? 'bg-[#142B4A] text-white shadow-2xs' : 'hover:text-[#182230]'
            }`}
          >
            All Returns
          </button>
          <button
            onClick={() => setTypeFilter('meeting')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              typeFilter === 'meeting' ? 'bg-[#142B4A] text-white shadow-2xs' : 'hover:text-[#182230]'
            }`}
          >
            Meetings
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
              {st === 'all' ? 'All' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table (Reference Image Styled!) */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#182230]">
            Filed Returns ({filtered.length})
          </h2>
          <span className="text-xs text-[#667085]">
            Reports marked "Needs Correction" can be revised and resubmitted
          </span>
        </div>

        <div className="table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">
                  <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                </th>
                <th className="py-3 px-4">REPORT & DATE</th>
                <th className="py-3 px-4">ATTENDANCE / SOULS</th>
                <th className="py-3 px-4">REVIEW OUTCOME</th>
                <th className="py-3 px-4">TIMING</th>
                <th className="py-3 px-4">SUBMITTED ON</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    <FileCheck className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No returns found.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const isNeedsCorrection =
                    item.status === 'Needs Correction' || item.status === 'needs_revision';
                  const isApproved = item.status === 'Approved' || item.status === 'approved';
                  const isNewlySubmitted =
                    item.status === 'Newly Submitted' || item.status === 'submitted' || item.status === 'under_review';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setInspectingItem(item)}
                      className={`cursor-pointer transition-colors ${
                        isNeedsCorrection
                          ? 'bg-[#FFF5F5] border-l-4 border-[#C74646]' // Exact reference image highlight row!
                          : 'hover:bg-[#F5F7FA]'
                      }`}
                    >
                      <td className="py-4 px-5 text-center">
                        <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                            {item.reportType === 'meeting' ? 'MR' : 'EV'}
                          </div>
                          <div>
                            <div className="font-bold text-[#182230] leading-tight">
                              {item.reportType === 'meeting' ? 'Cell Meeting Report' : 'Evangelism Report'}
                            </div>
                            <div className="text-[11px] text-[#667085] mt-0.5">
                              {item.reportType === 'meeting'
                                ? (item as any).meetingDate
                                : (item as any).date}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {item.reportType === 'meeting' ? (
                          <div>
                            <div className="font-bold text-[#182230]">
                              {(item as any).attendance} Attended
                            </div>
                            <div className="text-[11px] text-[#667085]">
                              {(item as any).members} Total Members
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-[#23845B]">
                              +{(item as any).conversions} Conversions
                            </div>
                            <div className="text-[11px] text-[#667085]">
                              {(item as any).peopleSpokenTo} Reached
                            </div>
                          </div>
                        )}
                      </td>

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
                            Awaiting Review
                          </span>
                        )}
                        {isNeedsCorrection && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                            <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                            Needs Correction
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {item.late ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                            <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                            Late Submission
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#23845B]">
                            <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                            On Track
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-[#667085]">
                        {new Date(item.submittedAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setInspectingItem(item);
                          }}
                          className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 inline-flex items-center justify-center transition-colors shadow-2xs"
                          title="View Details & Comments"
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

      {/* INSPECTION / CORRECTION MODAL */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-[#E3E8EF] max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#E3E8EF]">
              <div>
                <h3 className="text-base font-bold text-[#142B4A]">
                  {inspectingItem.reportType === 'meeting' ? 'Cell Meeting Report' : 'Evangelism Report'}
                </h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Submitted: {new Date(inspectingItem.submittedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                className="p-1 rounded-lg text-[#667085] hover:text-[#182230]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Review outcome banner */}
            {inspectingItem.reviewerComment && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-[#D99A32]/40 text-xs">
                <div className="font-bold text-[#D99A32] mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Administrator Feedback:
                </div>
                <p className="italic text-[#182230]">"{inspectingItem.reviewerComment}"</p>
                {inspectingItem.reviewedByName && (
                  <div className="text-[10px] text-[#667085] mt-1">
                    Reviewed by {inspectingItem.reviewedByName}
                  </div>
                )}
              </div>
            )}

            {/* Report Vital Metrics */}
            {inspectingItem.reportType === 'meeting' ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">Attendance Count</div>
                  <div className="text-base font-bold text-[#182230]">{(inspectingItem as any).attendance}</div>
                </div>
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">Members Count</div>
                  <div className="text-base font-bold text-[#182230]">{(inspectingItem as any).members}</div>
                </div>
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">New Members</div>
                  <div className="text-base font-bold text-[#23845B]">{(inspectingItem as any).newMembers || 0}</div>
                </div>
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">Follow-up Required</div>
                  <div className="text-base font-bold text-[#D99A32]">{(inspectingItem as any).followUpNeeded || 0}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">Conversions</div>
                  <div className="text-base font-bold text-[#23845B]">+{(inspectingItem as any).conversions}</div>
                </div>
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">People Spoken To</div>
                  <div className="text-base font-bold text-[#182230]">{(inspectingItem as any).peopleSpokenTo}</div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="px-4 py-2 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
