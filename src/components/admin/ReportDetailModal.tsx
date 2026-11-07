import React, { useState } from 'react';
import { Cell, WeeklyReport, UserSession } from '../../types';
import { formatDate } from '../../lib/storage';
import { StatusBadge } from '../common/StatusBadge';
import { 
  X, 
  Printer, 
  Share2, 
  Mail, 
  CheckCircle2, 
  RotateCcw, 
  MessageSquare,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { 
  buildWhatsAppLink, 
  formatReportWhatsAppMessage, 
  generateReportEmailDraft 
} from '../../lib/notifications';

interface ReportDetailModalProps {
  report: WeeklyReport;
  cell: Cell;
  user: UserSession;
  onClose: () => void;
  onReview?: (reportId: string, status: 'Approved' | 'Returned', note: string) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  cell,
  user,
  onClose,
  onReview
}) => {
  const isAdmin = user.role === 'admin';
  const [reviewerNote, setReviewerNote] = useState<string>(report.note || '');
  const [returnError, setReturnError] = useState<string>('');

  const handleReviewAction = (status: 'Approved' | 'Returned') => {
    if (status === 'Returned' && !reviewerNote.trim()) {
      setReturnError('Please add a note to explain to the cell leader what needs to be changed.');
      return;
    }
    setReturnError('');
    if (onReview) {
      onReview(report.id, status, reviewerNote.trim());
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const whatsAppLink = buildWhatsAppLink(
    cell.leaderPhone,
    formatReportWhatsAppMessage(cell, report)
  );

  const emailDraft = generateReportEmailDraft(cell, report);

  return (
    <div className="fixed inset-0 z-50 bg-[#0F2447]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#E3E6EB] rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E3E6EB] flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/fni_logo_5b889f17.jpg"
              alt="FNI Official Logo"
              className="w-10 h-10 rounded-md object-cover border border-[#E3E6EB] shadow-2xs shrink-0"
            />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6472]">
                Official Weekly Cell Return
              </div>
              <h2 className="text-base font-semibold text-[#0F2447] font-serif-title">
                {cell.name} — Week of {formatDate(report.week)}
              </h2>
            </div>
            <StatusBadge status={report.status} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 text-[#5B6472] hover:text-[#0F2447] hover:bg-slate-200/60 rounded transition-colors"
              title="Print official report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#5B6472] hover:text-[#0F2447] hover:bg-slate-200/60 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#F6F7F9] rounded border border-[#E3E6EB]">
            <div>
              <span className="block text-[11px] text-[#8C95A3]">Cell Name</span>
              <strong className="text-[#0F2447] font-medium">{cell.name}</strong>
            </div>
            <div>
              <span className="block text-[11px] text-[#8C95A3]">Area</span>
              <strong className="text-[#0F2447] font-medium">{cell.area}</strong>
            </div>
            <div>
              <span className="block text-[11px] text-[#8C95A3]">Cell Leader</span>
              <strong className="text-[#0F2447] font-medium">{cell.leader}</strong>
            </div>
            <div>
              <span className="block text-[11px] text-[#8C95A3]">Submitted Date</span>
              <strong className="text-[#0F2447] font-medium">{formatDate(report.date)}</strong>
            </div>
          </div>

          {/* Core Numerical Metrics Grid */}
          <div>
            <h3 className="text-xs font-semibold text-[#0F2447] uppercase tracking-wider pb-1.5 border-b border-[#E3E6EB] mb-3">
              Attendance & Soul Winning Records
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <div className="p-3 bg-white border border-[#E3E6EB] rounded text-center">
                <span className="text-[11px] text-[#5B6472] block">Attendance</span>
                <span className="text-xl font-semibold text-[#0F2447] tabular-nums font-serif-title">
                  {report.att}
                </span>
              </div>
              <div className="p-3 bg-white border border-[#E3E6EB] rounded text-center">
                <span className="text-[11px] text-[#5B6472] block">Visitors</span>
                <span className="text-xl font-semibold text-[#0F2447] tabular-nums font-serif-title">
                  {report.vis}
                </span>
              </div>
              <div className="p-3 bg-[#E4F2E8]/40 border border-[#C4E1CC] rounded text-center">
                <span className="text-[11px] text-[#1E6B3A] block font-medium">Souls Won</span>
                <span className="text-xl font-semibold text-[#1E6B3A] tabular-nums font-serif-title">
                  {report.souls}
                </span>
              </div>
              <div className="p-3 bg-white border border-[#E3E6EB] rounded text-center">
                <span className="text-[11px] text-[#5B6472] block">Follow-ups</span>
                <span className="text-xl font-semibold text-[#0F2447] tabular-nums font-serif-title">
                  {report.fu}
                </span>
              </div>
              <div className="p-3 bg-white border border-[#E3E6EB] rounded text-center">
                <span className="text-[11px] text-[#5B6472] block">Outreaches</span>
                <span className="text-xl font-semibold text-[#0F2447] tabular-nums font-serif-title">
                  {report.evg}
                </span>
              </div>
              <div className="p-3 bg-white border border-[#E3E6EB] rounded text-center">
                <span className="text-[11px] text-[#5B6472] block">Meetings</span>
                <span className="text-xl font-semibold text-[#0F2447] tabular-nums font-serif-title">
                  {report.meet}
                </span>
              </div>
            </div>
          </div>

          {/* Narrative Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-[#0F2447] uppercase tracking-wider pb-1.5 border-b border-[#E3E6EB]">
              Narrative & Spiritual Updates
            </h3>

            <div className="space-y-3">
              <div className="bg-[#FAFBFD] border border-[#E3E6EB] p-3.5 rounded">
                <span className="text-[11px] font-semibold text-[#0F2447] uppercase tracking-wide block mb-1">
                  Prayer Requests
                </span>
                <p className="text-xs text-[#14213D] leading-relaxed whitespace-pre-line">
                  {report.prayer || 'None submitted.'}
                </p>
              </div>

              <div className="bg-[#FAFBFD] border border-[#E3E6EB] p-3.5 rounded">
                <span className="text-[11px] font-semibold text-[#0F2447] uppercase tracking-wide block mb-1">
                  Testimonies & Praise Reports
                </span>
                <p className="text-xs text-[#14213D] leading-relaxed whitespace-pre-line">
                  {report.test || 'None recorded for this week.'}
                </p>
              </div>

              <div className="bg-[#FAFBFD] border border-[#E3E6EB] p-3.5 rounded">
                <span className="text-[11px] font-semibold text-[#0F2447] uppercase tracking-wide block mb-1">
                  Challenges & Remarks
                </span>
                <p className="text-xs text-[#14213D] leading-relaxed whitespace-pre-line">
                  {report.chal || 'None specified.'}
                </p>
              </div>

              {report.note && (
                <div className="bg-[#FBF0D9] border border-[#EED7A1] p-3.5 rounded">
                  <span className="text-[11px] font-semibold text-[#8A5A00] uppercase tracking-wide block mb-1">
                    Administrator Note
                  </span>
                  <p className="text-xs text-[#8A5A00] leading-relaxed">
                    {report.note}
                  </p>
                  {report.reviewedBy && (
                    <span className="text-[10px] text-[#8A5A00]/80 block mt-1">
                      Reviewed by {report.reviewedBy} on {formatDate(report.reviewedAt || report.date)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Admin Review Controls */}
          {isAdmin && (
            <div className="pt-4 border-t border-[#E3E6EB] space-y-3 bg-[#FDFDFE] p-4 rounded border">
              <div className="flex items-center justify-between">
                <label htmlFor="modal-reviewer-note" className="text-xs font-semibold text-[#0F2447]">
                  Administrator Review & Note
                </label>
                <span className="text-[11px] text-[#8C95A3]">
                  Required when returning for changes
                </span>
              </div>
              <textarea
                id="modal-reviewer-note"
                rows={2}
                value={reviewerNote}
                onChange={(e) => {
                  setReviewerNote(e.target.value);
                  if (returnError) setReturnError('');
                }}
                placeholder="Write guidance, commendations, or instructions for the cell leader..."
                className="w-full text-xs p-2.5 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white resize-y"
              />
              {returnError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {returnError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleReviewAction('Returned')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#8A5A00] bg-[#FBF0D9] border border-[#EED7A1] hover:bg-[#F7E5BD] rounded transition-colors inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Return for Changes</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReviewAction('Approved')}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#B8923A]" />
                  <span>Approve Report</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Multi-Channel Sharer */}
        <div className="px-6 py-3.5 border-t border-[#E3E6EB] bg-[#F8F9FA] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E3E6EB] text-[#14213D] hover:bg-slate-50 rounded transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Share to WhatsApp</span>
            </a>

            <a
              href={emailDraft.mailto}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E3E6EB] text-[#14213D] hover:bg-slate-50 rounded transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-[#B8923A]" />
              <span>Email Digest</span>
            </a>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-[#5B6472] hover:text-[#0F2447] bg-white border border-[#E3E6EB] rounded hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
