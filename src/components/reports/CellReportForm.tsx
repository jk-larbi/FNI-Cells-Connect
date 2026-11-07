import React, { useState, useEffect } from 'react';
import { Cell, ReportingPeriod, CellReport, CellMeetingReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ReportService } from '../../services/reportService';
import { EvangelismReportForm } from './EvangelismReportForm';
import {
  Users,
  Calendar,
  DollarSign,
  FileText,
  Send,
  AlertCircle,
  CheckCircle2,
  Flame,
  Clock,
} from 'lucide-react';
import { Button } from '../common/Button';

interface CellReportFormProps {
  initialReport?: CellReport | null;
  onSuccess: (report: any) => void;
  onCancel?: () => void;
}

export const CellReportForm: React.FC<CellReportFormProps> = ({
  initialReport,
  onSuccess,
  onCancel,
}) => {
  const { currentUser } = useAuth();
  const { dispatchNotification } = useNotifications();

  // Report Type Tab: 'meeting' (Cell Meeting Report) or 'evangelism' (Evangelism Report)
  const [reportType, setReportType] = useState<'meeting' | 'evangelism'>('meeting');

  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cell Meeting Form State (matching Part 6A)
  const [cellId, setCellId] = useState(initialReport?.cell_id || currentUser.cell_id || '');
  const [meetingDate, setMeetingDate] = useState(initialReport?.meeting_date || new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState<number>(initialReport?.members_present || 0);
  const [activeMembers, setActiveMembers] = useState<number>(initialReport?.members_present || 0);
  const [attendance, setAttendance] = useState<number>(initialReport?.total_attendance || 0);
  const [newMembers, setNewMembers] = useState<number>(initialReport?.first_timers_contacted || 0);
  const [absentees, setAbsentees] = useState<number>(initialReport?.visitors_count || 0);
  const [followUpNeeded, setFollowUpNeeded] = useState<number>(initialReport?.follow_ups_conducted || 0);
  const [offering, setOffering] = useState<string>(initialReport?.offering_amount ? String(initialReport.offering_amount) : '');
  const [tutorNotes, setTutorNotes] = useState<string>(initialReport?.additional_remarks || initialReport?.meeting_topic || '');
  const [testimonies, setTestimonies] = useState<string>((initialReport as any)?.testimonies || '');

  useEffect(() => {
    async function loadData() {
      try {
        const cList = await ReportService.getCells();
        setCells(cList);
        if (!cellId && cList.length > 0) {
          const matched = cList.find(c => c.id === currentUser.cell_id) || cList[0];
          setCellId(matched.id);
        }
      } finally {
        setIsLoadingMetadata(false);
      }
    }
    loadData();
  }, [currentUser, cellId]);

  // If user toggled to Evangelism Report, render the dedicated EvangelismReportForm
  if (reportType === 'evangelism') {
    return (
      <div className="space-y-4">
        {/* Module Switcher Header */}
        <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center text-xs font-bold text-slate-600 shadow-inner max-w-md">
          <button
            type="button"
            onClick={() => setReportType('meeting')}
            className="flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 hover:text-navy-950"
          >
            <Users className="w-4 h-4" />
            Cell Meeting Report
          </button>
          <button
            type="button"
            onClick={() => setReportType('evangelism')}
            className="flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 bg-navy-900 text-white shadow-card"
          >
            <Flame className="w-4 h-4 text-gold-400" />
            Evangelism Report
          </button>
        </div>

        <EvangelismReportForm
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </div>
    );
  }

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!cellId) {
      setErrorMessage('Please select your registered cell fellowship.');
      return;
    }
    if (!meetingDate) {
      setErrorMessage('Please specify the cell meeting date.');
      return;
    }
    if (members < 0 || activeMembers < 0 || attendance < 0 || newMembers < 0 || absentees < 0 || followUpNeeded < 0) {
      setErrorMessage('Numerical values cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCell = cells.find(c => c.id === cellId);
      const cellName = selectedCell?.name || currentUser.cell_name || 'Fellowship Cell';

      const savedReport = await ReportService.submitCellMeetingReport({
        id: initialReport?.id,
        cellId,
        cellName,
        tutorUid: currentUser.id,
        tutorName: currentUser.full_name,
        meetingDate,
        members: Number(members) || 0,
        activeMembers: Number(activeMembers) || 0,
        attendance: Number(attendance) || 0,
        newMembers: Number(newMembers) || 0,
        absentees: Number(absentees) || 0,
        followUpNeeded: Number(followUpNeeded) || 0,
        offering: offering ? Number(offering) : undefined,
        tutorNotes: tutorNotes.trim(),
        testimonies: testimonies.trim(),
      });

      dispatchNotification(
        'Cell Meeting Report Submitted',
        `Meeting return for ${cellName} on ${meetingDate} filed successfully. Status: Newly Submitted.`,
        'report_submitted',
        'in_app'
      );

      onSuccess(savedReport);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMetadata) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Loading cell reporting schema...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Module Switcher Header */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center text-xs font-bold text-slate-600 shadow-inner max-w-md">
        <button
          type="button"
          onClick={() => setReportType('meeting')}
          className="flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 bg-navy-900 text-white shadow-card"
        >
          <Users className="w-4 h-4 text-gold-400" />
          Cell Meeting Report
        </button>
        <button
          type="button"
          onClick={() => setReportType('evangelism')}
          className="flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 hover:text-navy-950"
        >
          <Flame className="w-4 h-4 text-gold-500" />
          Evangelism Report
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
        {/* Header Banner */}
        <div className="bg-navy-950 text-white p-6 sm:p-7 border-b border-navy-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-gold-500/20 text-gold-400 border border-gold-500/30 uppercase tracking-wide">
                FNI CELLS CONNECT • Cell Meeting Module
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
                Cell Meeting Report
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Official weekly fellowship record • Due Sunday at 6:00 PM Ghana Time (Africa/Accra)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-navy-900 border border-navy-800 px-3 py-1.5 rounded-lg text-slate-300">
                Tutor: <strong className="text-white">{currentUser.full_name}</strong>
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleMeetingSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Identification & Date */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gold-500" />
              1. Cell Identification & Meeting Schedule
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cell Name (Auto-populated)
                </label>
                <select
                  value={cellId}
                  onChange={e => setCellId(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 font-semibold"
                >
                  {cells.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.location ? `(${c.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meeting Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tutor / Cell Leader Name
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser.full_name}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-slate-600 font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Membership & Attendance Metrics */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950 mb-3 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gold-500" />
              2. Membership & Attendance Counts
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Number of Members
                </label>
                <input
                  type="number"
                  min="0"
                  value={members}
                  onChange={e => setMembers(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-base font-bold text-navy-950 bg-white border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Active Members
                </label>
                <input
                  type="number"
                  min="0"
                  value={activeMembers}
                  onChange={e => setActiveMembers(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-base font-bold text-navy-950 bg-white border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div className="p-3 bg-navy-50/80 rounded-2xl border border-navy-200">
                <label className="block text-[11px] font-bold text-navy-900 mb-1">
                  Attendance Count <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={attendance}
                  onChange={e => setAttendance(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-base font-extrabold text-navy-950 bg-white border border-navy-300 rounded-xl p-2 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  New Members
                </label>
                <input
                  type="number"
                  min="0"
                  value={newMembers}
                  onChange={e => setNewMembers(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-base font-bold text-navy-950 bg-white border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Absentees Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={absentees}
                  onChange={e => setAbsentees(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-base font-bold text-navy-950 bg-white border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200">
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  Requiring Follow-up
                </label>
                <input
                  type="number"
                  min="0"
                  value={followUpNeeded}
                  onChange={e => setFollowUpNeeded(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-base font-bold text-amber-900 bg-white border border-amber-300 rounded-xl p-2 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Offering & Notes */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950 mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gold-500" />
              3. Finance & Meeting Notes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Offering Collected (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-semibold text-xs">
                    ₵ / ₦
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={offering}
                    onChange={e => setOffering(e.target.value)}
                    className="w-full pl-10 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tutor's Notes Used for Cell Meeting (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline key scripture passages, lesson taught, prayer items or pastoral remarks..."
                  value={tutorNotes}
                  onChange={e => setTutorNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A45A]" />
                  <span>Testimonies & Experiences Encountered (Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Record any testimonies, answered prayers, signs, or miraculous experiences encountered during the cell meeting..."
                  value={testimonies}
                  onChange={e => setTestimonies(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-4 h-4 text-gold-500" />
              <span>Deadline: Sunday 6:00 PM Ghana Time (Africa/Accra)</span>
            </div>

            <div className="flex items-center gap-3">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                leftIcon={<Send className="w-4 h-4" />}
                className="rounded-xl px-6"
              >
                Submit Cell Meeting Report
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
