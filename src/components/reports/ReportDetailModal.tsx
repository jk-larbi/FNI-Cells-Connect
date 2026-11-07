import React, { useState } from 'react';
import { CellReport, ReportStatus } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ReportService } from '../../services/reportService';
import {
  Calendar,
  MapPin,
  User,
  Clock,
  CheckCircle2,
  AlertOctagon,
  MessageSquare,
  Flame,
  Users,
  HeartHandshake,
  FileCheck,
} from 'lucide-react';

interface ReportDetailModalProps {
  report: CellReport | null;
  isOpen: boolean;
  onClose: () => void;
  onReportUpdated?: (updated: CellReport) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  isOpen,
  onClose,
  onReportUpdated,
}) => {
  const { currentUser, canReviewReports } = useAuth();
  const { dispatchNotification } = useNotifications();

  const [reviewFeedback, setReviewFeedback] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMode, setReviewMode] = useState<ReportStatus | null>(null);

  if (!report) return null;

  const handleAction = async (newStatus: ReportStatus) => {
    if ((newStatus === 'needs_revision' || newStatus === 'under_review') && !reviewFeedback.trim()) {
      alert('Please provide feedback explaining the requested review or corrections.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const updated = await ReportService.reviewReport(
        report.id,
        newStatus,
        reviewFeedback,
        currentUser.id,
        currentUser.full_name
      );

      const statusLabels = {
        approved: 'Approved',
        needs_revision: 'Revision Requested',
        under_review: 'Marked Under Review',
        draft: 'Draft',
        submitted: 'Submitted',
      };

      dispatchNotification(
        `Report ${statusLabels[newStatus]}`,
        `${report.cell_name} report for ${report.period_name} has been ${statusLabels[newStatus].toLowerCase()} by ${currentUser.full_name}.`,
        newStatus === 'approved' ? 'report_approved' : 'revision_requested',
        'in_app'
      );

      setReviewFeedback('');
      setReviewMode(null);
      if (onReportUpdated) onReportUpdated(updated);
      onClose();
    } catch (err) {
      console.error('Review action failed:', err);
      alert('Failed to update report status.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={report.cell_name || 'Ministry Cell Report'}
      subtitle={`${report.period_name} • ${report.region_name || 'Region'}`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Top Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <Badge status={report.status} />
            <span className="text-xs text-slate-500">
              Submitted: {report.submitted_at ? new Date(report.submitted_at).toLocaleString() : 'Draft mode'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Leader: <strong>{report.submitted_by_name || 'Assigned Leader'}</strong></span>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-subtle">
            <div className="text-[11px] uppercase font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-navy-800" /> Attendance
            </div>
            <div className="text-2xl font-bold text-navy-950">{report.total_attendance}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {report.members_present} mem / {report.visitors_count} visitors
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-subtle">
            <div className="text-[11px] uppercase font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-gold-600" /> Souls Won
            </div>
            <div className="text-2xl font-bold text-gold-600">+{report.souls_won}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {report.evangelism_outreaches_held} outreach(es) held
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-subtle">
            <div className="text-[11px] uppercase font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Follow-ups
            </div>
            <div className="text-2xl font-bold text-emerald-700">{report.follow_ups_conducted}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {report.converts_established} converts established
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-subtle">
            <div className="text-[11px] uppercase font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-600" /> Meeting Date
            </div>
            <div className="text-sm font-bold text-slate-800 mt-1">{report.meeting_date}</div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">
              {report.offering_amount ? `Offering: ${report.offering_amount.toLocaleString()}` : 'Held promptly'}
            </div>
          </div>
        </div>

        {/* Section: Meeting Topic & Details */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Meeting Focus & Teaching Topic
          </div>
          <p className="text-xs text-navy-900 font-medium leading-relaxed">
            {report.meeting_topic || 'Standard fellowship curriculum'}
          </p>
        </div>

        {/* Section: Evangelism Harvest Details */}
        {report.souls_won > 0 && (
          <div className="p-4 bg-gold-50/50 rounded-xl border border-gold-200 space-y-1.5">
            <div className="text-xs font-semibold text-gold-900 uppercase tracking-wide flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-gold-600" />
              Salvation Harvest & Outreach Details
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {report.souls_won_details || 'Detailed soul list kept in cell pastoral log.'}
            </p>
            {report.evangelism_locations && (
              <p className="text-[11px] text-slate-500 mt-1">
                Outreach Location: <strong className="text-slate-700">{report.evangelism_locations}</strong>
              </p>
            )}
          </div>
        )}

        {/* Spiritual Intelligence: Testimonies & Prayer Requests */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-navy-900 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Testimonies Recorded
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              {report.testimonies || 'No specific testimonies filed for this cycle.'}
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-navy-900 mb-1 flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-gold-600" /> Prayer Requests & Pastoral Needs
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              {report.prayer_requests || 'No urgent pastoral prayer requests filed.'}
            </p>
          </div>
        </div>

        {/* Challenges & Remarks */}
        {(report.challenges_faced || report.additional_remarks) && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Challenges & Operational Remarks
            </div>
            {report.challenges_faced && (
              <p className="text-xs text-slate-700">
                <strong>Challenges:</strong> {report.challenges_faced}
              </p>
            )}
            {report.additional_remarks && (
              <div className="text-xs text-slate-600 mt-1 bg-white p-3 rounded-lg border border-slate-200/80 whitespace-pre-wrap">
                {report.additional_remarks}
              </div>
            )}
          </div>
        )}

        {/* Reviewer Section for Authorized Reviewers */}
        {canReviewReports && (
          <div className="p-4 bg-navy-50/60 rounded-xl border border-navy-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-navy-900 flex items-center gap-1.5 uppercase tracking-wide">
                <FileCheck className="w-4 h-4 text-navy-800" />
                Administrative Review Action (Role: {currentUser.role.replace('_', ' ')})
              </div>
              {report.reviewed_by_name && (
                <span className="text-[11px] text-slate-500">
                  Last reviewed by <strong>{report.reviewed_by_name}</strong> on{' '}
                  {report.last_reviewed_at ? new Date(report.last_reviewed_at).toLocaleDateString() : ''}
                </span>
              )}
            </div>

            {/* Review feedback input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Review Feedback / Pastoral Directive to Leader
              </label>
              <textarea
                rows={2}
                placeholder="Enter approval comments, recommendations, or specific items requiring revision..."
                value={reviewFeedback}
                onChange={e => setReviewFeedback(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-navy-600 focus:ring-1 focus:ring-navy-600 bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('under_review')}
                isLoading={isSubmittingReview}
              >
                Mark Under Review
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleAction('needs_revision')}
                isLoading={isSubmittingReview}
              >
                Request Revision
              </Button>
              <Button
                size="sm"
                variant="gold"
                onClick={() => handleAction('approved')}
                isLoading={isSubmittingReview}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Approve Report
              </Button>
            </div>
          </div>
        )}

        {/* Audit footer */}
        <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100">
          <span>Report UID: {report.id}</span>
          <span>FNI Governance Audit Standard</span>
        </div>
      </div>
    </Modal>
  );
};
