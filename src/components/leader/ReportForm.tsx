import React, { useState, useEffect } from 'react';
import { Cell, WeeklyReport, ReportStatus } from '../../types';
import { formatDate, getMonday } from '../../lib/storage';
import { 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  Mail, 
  Save, 
  Send, 
  ArrowLeft,
  Calendar,
  Lock,
  Copy,
  Check
} from 'lucide-react';
import { 
  buildWhatsAppLink, 
  formatReportWhatsAppMessage, 
  generateReportEmailDraft 
} from '../../lib/notifications';

interface ReportFormProps {
  cell: Cell;
  existingReport?: WeeklyReport;
  targetWeek?: string;
  onSave: (reportData: Omit<WeeklyReport, 'id' | 'date'> & { id?: string }) => void;
  onCancel: () => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({
  cell,
  existingReport,
  targetWeek,
  onSave,
  onCancel
}) => {
  const defaultMonday = targetWeek || existingReport?.week || getMonday();

  const [week, setWeek] = useState<string>(defaultMonday);
  const [att, setAtt] = useState<string>(existingReport ? String(existingReport.att) : '');
  const [vis, setVis] = useState<string>(existingReport ? String(existingReport.vis) : '');
  const [souls, setSouls] = useState<string>(existingReport ? String(existingReport.souls) : '');
  const [fu, setFu] = useState<string>(existingReport ? String(existingReport.fu) : '');
  const [evg, setEvg] = useState<string>(existingReport ? String(existingReport.evg) : '1');
  const [meet, setMeet] = useState<string>(existingReport ? String(existingReport.meet) : '1');
  const [prayer, setPrayer] = useState<string>(existingReport?.prayer || '');
  const [test, setTest] = useState<string>(existingReport?.test || '');
  const [chal, setChal] = useState<string>(existingReport?.chal || '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedSuccess, setSubmittedSuccess] = useState<WeeklyReport | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Sync if existingReport changes
  useEffect(() => {
    if (existingReport) {
      setWeek(existingReport.week);
      setAtt(String(existingReport.att));
      setVis(String(existingReport.vis));
      setSouls(String(existingReport.souls));
      setFu(String(existingReport.fu));
      setEvg(String(existingReport.evg));
      setMeet(String(existingReport.meet));
      setPrayer(existingReport.prayer || '');
      setTest(existingReport.test || '');
      setChal(existingReport.chal || '');
    }
  }, [existingReport]);

  const isLocked = existingReport && (existingReport.status === 'Approved' || existingReport.status === 'Submitted');

  const validate = (isSubmitting: boolean) => {
    const errs: Record<string, string> = {};

    if (!week) {
      errs.week = 'Please select a reporting week.';
    } else {
      const d = new Date(`${week}T00:00:00`);
      if (d.getDay() !== 1) {
        errs.week = 'Reporting weeks must begin on a Monday.';
      }
      const maxMonday = getMonday();
      if (week > maxMonday) {
        errs.week = 'Cannot report on a future week.';
      }
    }

    if (isSubmitting) {
      const checkPositive = (val: string, key: string, name: string) => {
        if (val === '' || val === null || val === undefined) {
          errs[key] = `${name} is required. Enter 0 if none.`;
          return -1;
        }
        const num = Number(val);
        if (isNaN(num) || !Number.isInteger(num) || num < 0) {
          errs[key] = `${name} must be a whole number, 0 or greater.`;
          return -1;
        }
        return num;
      };

      const parsedAtt = checkPositive(att, 'att', 'Attendance');
      const parsedVis = checkPositive(vis, 'vis', 'Visitors');
      checkPositive(souls, 'souls', 'Souls won');
      checkPositive(fu, 'fu', 'Follow-ups');
      checkPositive(evg, 'evg', 'Evangelism activities');
      checkPositive(meet, 'meet', 'Cell meetings');

      if (parsedAtt >= 0 && parsedVis >= 0 && parsedVis > parsedAtt) {
        errs.vis = 'Visitors cannot exceed total attendance.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (targetStatus: 'Draft' | 'Submitted') => {
    const isSubmitting = targetStatus === 'Submitted';
    if (!validate(isSubmitting)) {
      return;
    }

    const reportPayload: Omit<WeeklyReport, 'id' | 'date'> & { id?: string } = {
      id: existingReport?.id,
      cell: cell.id,
      week,
      att: att === '' ? 0 : Number(att),
      vis: vis === '' ? 0 : Number(vis),
      souls: souls === '' ? 0 : Number(souls),
      fu: fu === '' ? 0 : Number(fu),
      evg: evg === '' ? 0 : Number(evg),
      meet: meet === '' ? 1 : Number(meet),
      prayer: prayer.trim(),
      test: test.trim(),
      chal: chal.trim(),
      status: targetStatus,
      note: existingReport?.note || ''
    };

    onSave(reportPayload);

    if (isSubmitting) {
      setSubmittedSuccess({
        ...reportPayload,
        id: existingReport?.id || `rep_${Date.now()}`,
        date: new Date().toISOString().slice(0, 10)
      });
    }
  };

  const handleCopyEmail = (rep: WeeklyReport) => {
    const draft = generateReportEmailDraft(cell, rep);
    navigator.clipboard.writeText(draft.body);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 3000);
  };

  if (submittedSuccess) {
    const whatsAppLink = buildWhatsAppLink(
      cell.leaderPhone,
      formatReportWhatsAppMessage(cell, submittedSuccess)
    );
    const emailDraft = generateReportEmailDraft(cell, submittedSuccess);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-[#E4F2E8] border border-[#C4E1CC] rounded-lg p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-[#1E6B3A] shadow-xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#1E6B3A] font-serif-title">
              Weekly Report Successfully Submitted
            </h2>
            <p className="text-sm text-[#1E6B3A]/90 mt-1">
              Your report for <strong>{cell.name}</strong> for the week of <strong>{formatDate(submittedSuccess.week)}</strong> has been submitted to the Administrator for review.
            </p>
          </div>

          <div className="pt-4 border-t border-[#C4E1CC] flex flex-wrap justify-center gap-3">
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E6B3A] text-white text-xs font-semibold rounded hover:bg-[#16552E] transition-colors shadow-xs"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Summary to WhatsApp</span>
            </a>

            <button
              onClick={() => handleCopyEmail(submittedSuccess)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#1E6B3A] border border-[#C4E1CC] text-xs font-semibold rounded hover:bg-slate-50 transition-colors shadow-xs"
            >
              {copiedEmail ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedEmail ? 'Copied Email Digest!' : 'Copy Email Digest'}</span>
            </button>

            <a
              href={emailDraft.mailto}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#1E6B3A] border border-[#C4E1CC] text-xs font-semibold rounded hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Mail className="w-4 h-4" />
              <span>Open in Email App</span>
            </a>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onCancel}
            className="text-xs text-[#0F2447] hover:underline font-medium inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Breadcrumb & Heading */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="text-xs text-[#5B6472] hover:text-[#0F2447] font-medium flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to dashboard</span>
        </button>
        <span className="text-xs text-[#8C95A3]">
          All figures verified by Cell Leader
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-[#0F2447] tracking-tight font-serif-title">
          Weekly Cell Report
        </h1>
        <p className="text-sm text-[#5B6472] mt-0.5">
          {cell.name} · {cell.area} · Forerunners Network International
        </p>
      </div>

      {isLocked && (
        <div className="bg-[#E6ECF7] border border-[#CFD8EB] rounded-lg p-4 flex items-center gap-3 text-xs text-[#1B3F7A]">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            A report for this week is already <strong>{existingReport?.status.toLowerCase()}</strong>. If corrections are needed, contact the administrator.
          </span>
        </div>
      )}

      {existingReport?.status === 'Returned' && (
        <div className="bg-[#FBF0D9] border border-[#EED7A1] rounded-lg p-4 flex items-start gap-3 text-xs text-[#8A5A00]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Returned for Changes:</strong>
            <p className="mt-0.5">{existingReport.note || 'Please review highlighted entries and resubmit.'}</p>
          </div>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg p-6 sm:p-7 space-y-7 shadow-xs">
        {/* Section 1: Cell Identity & Reporting Period */}
        <div>
          <h2 className="text-xs font-semibold text-[#0F2447] uppercase tracking-wider mb-3 pb-1 border-b border-[#E3E6EB]">
            1. Cell Information & Reporting Period
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#14213D] mb-1">
                Cell Name & Area
              </label>
              <input
                type="text"
                readOnly
                value={`${cell.name} (${cell.area})`}
                className="w-full text-xs px-3 py-2 bg-[#F8F9FA] text-[#5B6472] border border-[#E3E6EB] rounded cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="week-input" className="block text-xs font-medium text-[#14213D] mb-1">
                Reporting Week (Monday) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="week-input"
                  type="date"
                  value={week}
                  disabled={Boolean(isLocked)}
                  onChange={(e) => setWeek(e.target.value)}
                  className={`w-full text-xs px-3 py-2 bg-white text-[#14213D] border rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] ${
                    errors.week ? 'border-red-500' : 'border-[#E3E6EB]'
                  }`}
                />
              </div>
              {errors.week ? (
                <p className="text-[11px] text-red-600 mt-1">{errors.week}</p>
              ) : (
                <p className="text-[11px] text-[#8C95A3] mt-1">
                  Selected week starts: {formatDate(week)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Attendance & Core Numerical Metrics */}
        <div>
          <h2 className="text-xs font-semibold text-[#0F2447] uppercase tracking-wider mb-3 pb-1 border-b border-[#E3E6EB]">
            2. Attendance & Harvest Metrics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="att-input" className="block text-xs font-medium text-[#14213D] mb-1">
                Total Attendance <span className="text-red-500">*</span>
              </label>
              <input
                id="att-input"
                type="number"
                min="0"
                step="1"
                disabled={Boolean(isLocked)}
                value={att}
                onChange={(e) => setAtt(e.target.value)}
                placeholder="0"
                className={`w-full text-xs px-3 py-2 bg-white text-[#14213D] border rounded tabular-nums focus:outline-none focus:ring-1 focus:ring-[#B8923A] ${
                  errors.att ? 'border-red-500' : 'border-[#E3E6EB]'
                }`}
              />
              {errors.att && <p className="text-[11px] text-red-600 mt-1">{errors.att}</p>}
            </div>

            <div>
              <label htmlFor="vis-input" className="block text-xs font-medium text-[#14213D] mb-1">
                First-time Visitors <span className="text-red-500">*</span>
              </label>
              <input
                id="vis-input"
                type="number"
                min="0"
                step="1"
                disabled={Boolean(isLocked)}
                value={vis}
                onChange={(e) => setVis(e.target.value)}
                placeholder="0"
                className={`w-full text-xs px-3 py-2 bg-white text-[#14213D] border rounded tabular-nums focus:outline-none focus:ring-1 focus:ring-[#B8923A] ${
                  errors.vis ? 'border-red-500' : 'border-[#E3E6EB]'
                }`}
              />
              {errors.vis && <p className="text-[11px] text-red-600 mt-1">{errors.vis}</p>}
            </div>

            <div>
              <label htmlFor="souls-input" className="block text-xs font-medium text-[#14213D] mb-1">
                Souls Won <span className="text-red-500">*</span>
              </label>
              <input
                id="souls-input"
                type="number"
                min="0"
                step="1"
                disabled={Boolean(isLocked)}
                value={souls}
                onChange={(e) => setSouls(e.target.value)}
                placeholder="0"
                className={`w-full text-xs px-3 py-2 bg-white text-[#14213D] border rounded tabular-nums focus:outline-none focus:ring-1 focus:ring-[#B8923A] ${
                  errors.souls ? 'border-red-500' : 'border-[#E3E6EB]'
                }`}
              />
              {errors.souls && <p className="text-[11px] text-red-600 mt-1">{errors.souls}</p>}
            </div>

            <div>
              <label htmlFor="fu-input" className="block text-xs font-medium text-[#14213D] mb-1">
                Follow-ups Done <span className="text-red-500">*</span>
              </label>
              <input
                id="fu-input"
                type="number"
                min="0"
                step="1"
                disabled={Boolean(isLocked)}
                value={fu}
                onChange={(e) => setFu(e.target.value)}
                placeholder="0"
                className={`w-full text-xs px-3 py-2 bg-white text-[#14213D] border rounded tabular-nums focus:outline-none focus:ring-1 focus:ring-[#B8923A] ${
                  errors.fu ? 'border-red-500' : 'border-[#E3E6EB]'
                }`}
              />
              {errors.fu && <p className="text-[11px] text-red-600 mt-1">{errors.fu}</p>}
            </div>
          </div>
        </div>

        {/* Section 3: Activities & Gatherings */}
        <div>
          <h2 className="text-xs font-semibold text-[#0F2447] uppercase tracking-wider mb-3 pb-1 border-b border-[#E3E6EB]">
            3. Ministry Activities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="evg-input" className="block text-xs font-medium text-[#14213D] mb-1">
                Evangelism / Outreaches Held <span className="text-red-500">*</span>
              </label>
              <input
                id="evg-input"
                type="number"
                min="0"
                step="1"
                disabled={Boolean(isLocked)}
                value={evg}
                onChange={(e) => setEvg(e.target.value)}
                placeholder="1"
                className={`w-full text-xs px-3 py-2 bg-white text-[#14213D] border rounded tabular-nums focus:outline-none focus:ring-1 focus:ring-[#B8923A] ${
                  errors.evg ? 'border-red-500' : 'border-[#E3E6EB]'
                }`}
              />
              {errors.evg && <p className="text-[11px] text-red-600 mt-1">{errors.evg}</p>}
            </div>

            <div>
              <label htmlFor="meet-input" className="block text-xs font-medium text-[#14213D] mb-1">
                Cell Meetings Conducted <span className="text-red-500">*</span>
              </label>
              <input
                id="meet-input"
                type="number"
                min="0"
                step="1"
                disabled={Boolean(isLocked)}
                value={meet}
                onChange={(e) => setMeet(e.target.value)}
                placeholder="1"
                className={`w-full text-xs px-3 py-2 bg-white text-[#14213D] border rounded tabular-nums focus:outline-none focus:ring-1 focus:ring-[#B8923A] ${
                  errors.meet ? 'border-red-500' : 'border-[#E3E6EB]'
                }`}
              />
              {errors.meet && <p className="text-[11px] text-red-600 mt-1">{errors.meet}</p>}
            </div>
          </div>
        </div>

        {/* Section 4: Narrative Reports (Prayer, Testimonies, Challenges) */}
        <div>
          <h2 className="text-xs font-semibold text-[#0F2447] uppercase tracking-wider mb-3 pb-1 border-b border-[#E3E6EB]">
            4. Narrative & Ministry Updates
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="prayer-input" className="block text-xs font-medium text-[#14213D] mb-1">
                Prayer Requests for the Cell
              </label>
              <textarea
                id="prayer-input"
                rows={2}
                disabled={Boolean(isLocked)}
                value={prayer}
                onChange={(e) => setPrayer(e.target.value)}
                placeholder="Specify prayer needs for members, converts, or upcoming outreaches..."
                className="w-full text-xs px-3 py-2 bg-white text-[#14213D] border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] resize-y"
              />
            </div>

            <div>
              <label htmlFor="test-input" className="block text-xs font-medium text-[#14213D] mb-1">
                Testimonies & Praise Reports
              </label>
              <textarea
                id="test-input"
                rows={2}
                disabled={Boolean(isLocked)}
                value={test}
                onChange={(e) => setTest(e.target.value)}
                placeholder="Record answered prayers, testimonies of healings, conversions, breakthroughs..."
                className="w-full text-xs px-3 py-2 bg-white text-[#14213D] border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] resize-y"
              />
            </div>

            <div>
              <label htmlFor="chal-input" className="block text-xs font-medium text-[#14213D] mb-1">
                Challenges & Remarks for Administrator
              </label>
              <textarea
                id="chal-input"
                rows={2}
                disabled={Boolean(isLocked)}
                value={chal}
                onChange={(e) => setChal(e.target.value)}
                placeholder="Venue constraints, member follow-up needs, or remarks..."
                className="w-full text-xs px-3 py-2 bg-white text-[#14213D] border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] resize-y"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-[#E3E6EB] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-[#5B6472] hover:text-[#0F2447] border border-[#E3E6EB] rounded bg-white hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2.5">
            <button
              type="button"
              disabled={Boolean(isLocked)}
              onClick={() => handleSubmit('Draft')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-[#0F2447] bg-white border border-[#E3E6EB] rounded hover:bg-slate-50 transition-colors shadow-2xs ${
                isLocked ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Save className="w-3.5 h-3.5 text-[#5B6472]" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={Boolean(isLocked)}
              onClick={() => handleSubmit('Submitted')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded transition-colors shadow-xs ${
                isLocked ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Send className="w-3.5 h-3.5 text-[#B8923A]" />
              <span>Submit Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
