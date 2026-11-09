import React, { useState, useEffect } from 'react';
import { Cell, ReportingPeriod, CellReport, CellMeetingReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ReportService } from '../../services/reportService';
import { CellService } from '../../services/cellService';
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
  ArrowLeft,
  Building,
  Lock,
  BookOpen,
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
  const { currentUser, isAdmin } = useAuth();
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
  const [meetingLocation, setMeetingLocation] = useState<string>('');
  const [totalCellMembers, setTotalCellMembers] = useState<number>(10);
  const [activeMembers, setActiveMembers] = useState<number>(initialReport?.members_present || 8);
  const [attendance, setAttendance] = useState<number>(initialReport?.total_attendance || 0);
  const [newMembers, setNewMembers] = useState<number>(initialReport?.first_timers_contacted || 0);
  const [absentees, setAbsentees] = useState<number>(initialReport?.visitors_count || 0);
  const [followUpNeeded, setFollowUpNeeded] = useState<number>(initialReport?.follow_ups_conducted || 0);
  const [offering, setOffering] = useState<string>(initialReport?.offering_amount ? String(initialReport.offering_amount) : '');
  const [currency, setCurrency] = useState<'GHS' | 'GBP' | 'USD'>((initialReport as any)?.currency || 'GHS');
  const [scripturalTheme, setScripturalTheme] = useState<string>((initialReport as any)?.scripturalTheme || initialReport?.meeting_topic || '');
  const [scripturesUsed, setScripturesUsed] = useState<string>((initialReport as any)?.scripturesUsed || '');
  const [tutorNotes, setTutorNotes] = useState<string>(initialReport?.additional_remarks || '');
  const [testimonies, setTestimonies] = useState<string>((initialReport as any)?.testimonies || '');
  const [tutorExperience, setTutorExperience] = useState<string>((initialReport as any)?.tutorExperience || '');

  useEffect(() => {
    async function loadData() {
      try {
        const cList = await ReportService.getCells();
        setCells(cList);
        const myCell = await CellService.getCellForTutor(currentUser);
        if (!cellId || !isAdmin) {
          setCellId(myCell.id);
          setMeetingLocation(myCell.meeting_location || myCell.venue_address || myCell.location || 'Central Campus');
          setTotalCellMembers(myCell.total_members !== undefined ? myCell.total_members : 10);
          setActiveMembers(myCell.active_members !== undefined ? myCell.active_members : 8);
        } else if (cellId && cList.length > 0) {
          const matched = cList.find(c => c.id === cellId);
          if (matched) {
            setMeetingLocation(matched.meeting_location || matched.venue_address || matched.location || '');
            setTotalCellMembers(matched.total_members !== undefined ? matched.total_members : 10);
            setActiveMembers(matched.active_members !== undefined ? matched.active_members : 8);
          }
        }
      } finally {
        setIsLoadingMetadata(false);
      }
    }
    loadData();
  }, [currentUser, cellId, isAdmin]);

  // Attendance auto-calculation helper
  const handleAttendanceChange = (val: number) => {
    const present = Math.max(0, val);
    setAttendance(present);
    // Auto-calculate absentees against cell total membership
    if (totalCellMembers > 0) {
      const calcAbsent = Math.max(0, totalCellMembers - present);
      setAbsentees(calcAbsent);
    }
  };

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
    if (activeMembers < 0 || attendance < 0 || newMembers < 0 || absentees < 0 || followUpNeeded < 0) {
      setErrorMessage('Numerical values cannot be negative.');
      return;
    }

    // Feature 1: Validate attendance + absentees consistency
    if (totalCellMembers > 0 && attendance + absentees !== totalCellMembers) {
      setErrorMessage(
        `Attendance inconsistency: Present (${attendance}) + Absent (${absentees}) = ${attendance + absentees}. This must equal Total Registered Members (${totalCellMembers}). Please adjust or align figures.`
      );
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
        meetingLocation: meetingLocation.trim() || selectedCell?.venue_address || selectedCell?.location,
        members: Number(totalCellMembers) || 0,
        activeMembers: Number(activeMembers) || 0,
        attendance: Number(attendance) || 0,
        newMembers: Number(newMembers) || 0,
        absentees: Number(absentees) || 0,
        followUpNeeded: Number(followUpNeeded) || 0,
        offering: offering ? Number(offering) : undefined,
        currency: currency,
        scripturalTheme: scripturalTheme.trim(),
        scripturesUsed: scripturesUsed.trim(),
        tutorNotes: tutorNotes.trim(),
        testimonies: testimonies.trim(),
        tutorExperience: tutorExperience.trim(),
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
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#667085] hover:text-[#142B4A] cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
          <span>Back to Previous</span>
        </button>
      )}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 sm:min-h-[36px] flex items-end">
                  <span>Cell Fellowship (Automatically Registered)</span>
                </label>
                {!isAdmin ? (
                  <div className="w-full h-11 text-xs rounded-xl border border-slate-200 bg-slate-100 px-3 text-[#142B4A] font-bold flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2 truncate">
                      <Building className="w-4 h-4 text-[#C6A45A] shrink-0" />
                      <span className="truncate">{currentUser.cell_name || cells.find(c => c.id === cellId)?.name || 'Fellowship Cell'}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#142B4A] text-[#C6A45A] shrink-0 ml-1.5 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Your Cell
                    </span>
                  </div>
                ) : (
                  <select
                    value={cellId}
                    onChange={e => {
                      const id = e.target.value;
                      setCellId(id);
                      const matched = cells.find(c => c.id === id);
                      if (matched) {
                        setMeetingLocation(matched.meeting_location || matched.venue_address || matched.location || '');
                        setTotalCellMembers(matched.total_members !== undefined ? matched.total_members : 10);
                        setActiveMembers(matched.active_members !== undefined ? matched.active_members : 8);
                      }
                    }}
                    required
                    className="w-full h-11 text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 font-semibold"
                  >
                    {cells.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.location ? `(${c.location})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 sm:min-h-[36px] flex items-end">
                  <span>Meeting Location <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={meetingLocation}
                  onChange={e => setMeetingLocation(e.target.value)}
                  placeholder="e.g. Hall 4 Common Room, Legon Campus"
                  className="w-full h-11 text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 sm:min-h-[36px] flex items-end">
                  <span>Meeting Date <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="date"
                  required
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                  className="w-full h-11 text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 sm:min-h-[36px] flex items-end">
                  <span>Tutor / Cell Leader Name</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser.full_name}
                  className="w-full h-11 text-xs rounded-xl border border-slate-200 bg-slate-100 px-3 text-slate-600 font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Meeting Attendance (Only Present & Absent) */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gold-500" />
                2. Meeting Attendance
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Record brethren present and absent. (Active members, new members, and follow-ups are managed in your Cell Portal).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs">
                <label className="block text-xs font-bold text-emerald-950 mb-1">
                  Members Present (Attendance) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={attendance}
                  onChange={e => setAttendance(e.target.value === '' ? ('' as any) : Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full text-xl font-black text-emerald-950 bg-white border border-emerald-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-emerald-700 mt-1.5 block font-medium">
                  Count of brethren present at fellowship meeting
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Members Absent
                </label>
                <input
                  type="number"
                  min="0"
                  value={absentees}
                  onChange={e => setAbsentees(e.target.value === '' ? ('' as any) : Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full text-xl font-black text-slate-800 bg-white border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-navy-600 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1.5 block font-medium">
                  Count of cell members absent from meeting
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Chronological Fellowship Ministry, Testimonies, Offering & Tutor Assessment */}
          <div className="pt-3 border-t border-slate-200/80 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#142B4A] mb-0.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C6A45A]" />
                <span>3. Ministry Word, Member Testimonies, Finance & Assessment</span>
              </h3>
              <p className="text-xs text-[#667085]">
                Chronological record of scripture taught, shared miracles, fellowship offering, and pastoral reflections.
              </p>
            </div>

            <div className="space-y-4">
              {/* Step 1: Word Ministered & Scriptural Theme (Chronological Order) */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#182230] mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#C6A45A] shrink-0" />
                    <span>Scriptural Theme / Message Topic</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Walking in Supernatural Faith, The Ministry of Reconciliation"
                    value={scripturalTheme}
                    onChange={e => setScripturalTheme(e.target.value)}
                    className="w-full h-11 text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-[#182230] focus:bg-white focus:ring-1 focus:ring-navy-600 font-semibold shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#182230] mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#142B4A] shrink-0" />
                    <span>Scriptures Used / Bible Passages</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Romans 8:28, Hebrews 11:1-6, James 5:16"
                    value={scripturesUsed}
                    onChange={e => setScripturesUsed(e.target.value)}
                    className="w-full h-11 text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-[#182230] focus:bg-white focus:ring-1 focus:ring-navy-600 font-semibold shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Lesson Outline & Key Truths Taught (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Outline key scripture insights or spiritual message imparted to members during fellowship..."
                    value={tutorNotes}
                    onChange={e => setTutorNotes(e.target.value)}
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 p-3 text-[#182230] focus:bg-white focus:ring-2 focus:ring-[#142B4A] leading-relaxed shadow-2xs"
                  />
                </div>
              </div>

              {/* Step 2: Member Testimonies (Signs, Healings, Answered Prayers & Breakthroughs) */}
              <div>
                <label className="block text-xs font-bold text-[#182230] mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C6A45A]" />
                  <span>Member Testimonies (Signs, Healings, Answered Prayers & Breakthroughs)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Record specific testimonies shared by cell members during this meeting (e.g. divine healing, answered prayers, academic or career breakthroughs)..."
                  value={testimonies}
                  onChange={e => setTestimonies(e.target.value)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[#182230] focus:bg-white focus:ring-2 focus:ring-[#142B4A] leading-relaxed"
                />
                <span className="text-xs text-[#667085] mt-1 block">
                  Document answered prayers and miracles shared by members to celebrate God's goodness across the ministry.
                </span>
              </div>

              {/* Step 3: Offering Collected with Currency Selection */}
              <div className="max-w-xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#182230]">
                    Offering Collected
                  </label>
                  <select
                    value={currency}
                    aria-label="Currency Selection"
                    onChange={e => setCurrency(e.target.value as 'GHS' | 'GBP' | 'USD')}
                    className="text-[11px] font-bold text-[#142B4A] bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="GHS">GHS (₵)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#142B4A] font-black text-sm">
                    {currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '₵'}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={offering}
                    onChange={e => setOffering(e.target.value)}
                    className="w-full pl-8 text-sm rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[#182230] focus:bg-white focus:ring-2 focus:ring-[#142B4A] font-bold"
                  />
                </div>
                <span className="text-xs text-[#667085] mt-1 block leading-tight">
                  Auto-logged for finance in selected currency ({currency})
                </span>
              </div>

              {/* Step 4: Tutor's Personal Assessment & Experiences (Separate Field) */}
              <div>
                <label className="block text-xs font-bold text-[#182230] mb-1 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#142B4A]" />
                  <span>Tutor's Personal Assessment & Experiences (Separate Field)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Tutor's personal evaluation: spiritual atmosphere, member responsiveness, cell growth challenges, and leadership experiences during fellowship..."
                  value={tutorExperience}
                  onChange={e => setTutorExperience(e.target.value)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[#182230] focus:bg-white focus:ring-2 focus:ring-[#142B4A] leading-relaxed"
                />
                <span className="text-xs text-[#667085] mt-1 block">
                  Your confidential shepherd reflections help leadership provide targeted prayer, discipleship resources, and pastoral support.
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-4 h-4 text-gold-500 shrink-0" />
              <span>Deadline: Sunday 6:00 PM GMT (Africa/Accra)</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-center"
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
                className="flex-1 sm:flex-initial rounded-xl px-6 py-2.5"
              >
                Submit Meeting Report
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
