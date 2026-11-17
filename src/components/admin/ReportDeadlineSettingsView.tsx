import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  DeadlineService,
  SystemDeadlineSettings,
  DEFAULT_DEADLINE_SETTINGS,
  DAYS_OF_WEEK,
} from '../../services/deadlineService';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import {
  Clock,
  Calendar,
  Save,
  CheckCircle2,
  AlertTriangle,
  Bell,
  BellRing,
  ArrowLeft,
  FileCheck,
  Flame,
  Globe,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ReportDeadlineSettingsViewProps {
  onBack?: () => void;
}

export const ReportDeadlineSettingsView: React.FC<ReportDeadlineSettingsViewProps> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<SystemDeadlineSettings>(DEFAULT_DEADLINE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ success: boolean; message: string } | null>(null);

  // Form states
  const [meetingDay, setMeetingDay] = useState(0);
  const [meetingTime, setMeetingTime] = useState('18:00');
  const [meetingReminders, setMeetingReminders] = useState(true);

  const [evangDay, setEvangDay] = useState(6);
  const [evangTime, setEvangTime] = useState('17:00');
  const [evangReminders, setEvangReminders] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const data = await DeadlineService.getDeadlineSettings();
        setSettings(data);
        setMeetingDay(data.meeting.dayOfWeek);
        setMeetingTime(data.meeting.deadlineTime);
        setMeetingReminders(data.meeting.remindersEnabled);

        setEvangDay(data.evangelism.dayOfWeek);
        setEvangTime(data.evangelism.deadlineTime);
        setEvangReminders(data.evangelism.remindersEnabled);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveNotice(null);

    const meetingDayName = DAYS_OF_WEEK.find(d => d.value === Number(meetingDay))?.label || 'Sunday';
    const evangDayName = DAYS_OF_WEEK.find(d => d.value === Number(evangDay))?.label || 'Saturday';

    try {
      const updated = await DeadlineService.updateDeadlineSettings(
        {
          meeting: {
            reportType: 'meeting',
            dayOfWeek: Number(meetingDay),
            dayName: meetingDayName,
            deadlineTime: meetingTime,
            remindersEnabled: meetingReminders,
          },
          evangelism: {
            reportType: 'evangelism',
            dayOfWeek: Number(evangDay),
            dayName: evangDayName,
            deadlineTime: evangTime,
            remindersEnabled: evangReminders,
          },
        },
        currentUser?.full_name || currentUser?.username || 'FNI Administrator'
      );

      setSettings(updated);
      setSaveNotice({
        success: true,
        message: 'Report deadline settings successfully saved across all cell portals.',
      });
      setTimeout(() => setSaveNotice(null), 5000);
    } catch (err: any) {
      setSaveNotice({
        success: false,
        message: err?.message || 'Could not save deadline settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Preview calculations
  const meetingPreview = DeadlineService.calculateDeadlineForWeek('meeting', 2026, 45, {
    meeting: {
      reportType: 'meeting',
      dayOfWeek: Number(meetingDay),
      dayName: DAYS_OF_WEEK.find(d => d.value === Number(meetingDay))?.label || 'Sunday',
      deadlineTime: meetingTime,
      remindersEnabled: meetingReminders,
    },
    evangelism: settings.evangelism,
  });

  const evangPreview = DeadlineService.calculateDeadlineForWeek('evangelism', 2026, 45, {
    meeting: settings.meeting,
    evangelism: {
      reportType: 'evangelism',
      dayOfWeek: Number(evangDay),
      dayName: DAYS_OF_WEEK.find(d => d.value === Number(evangDay))?.label || 'Saturday',
      deadlineTime: evangTime,
      remindersEnabled: evangReminders,
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#142B4A] dark:hover:text-white mb-2 cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
              <span>Back to Previous</span>
            </button>
          )}
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#C6A45A]/10 text-[#C6A45A] border border-[#C6A45A]/30 mb-1">
            <Clock className="w-3 h-3" />
            <span>Administrative Governance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#142B4A] dark:text-white tracking-tight">
            Report Deadline Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure official weekly return cutoff schedules for Cell Meeting and Evangelism harvest reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-2xl bg-white dark:bg-[#142238] border border-slate-200 dark:border-[#26384d] text-xs flex items-center gap-2 shadow-2xs">
            <Globe className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="block text-[10px] font-extrabold uppercase text-slate-400">Standard Timezone</span>
              <span className="font-bold text-[#142B4A] dark:text-white">Africa/Accra (GMT, UTC+0)</span>
            </div>
          </div>
        </div>
      </div>

      {saveNotice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xs ${
            saveNotice.success
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {saveNotice.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{saveNotice.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* =============================================================== */}
          {/* CARD 1: CELL MEETING REPORTS DEADLINE                           */}
          {/* =============================================================== */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#142238] border border-slate-200 dark:border-[#26384d] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#26384d]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-400">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142B4A] dark:text-white">
                    Cell Meeting Report Deadline
                  </h3>
                  <span className="text-[11px] text-slate-400">Weekly fellowship attendance & financial returns</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                Default: Sunday 6:00 PM
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white mb-1.5">
                  Submission Cutoff Day
                </label>
                <select
                  value={meetingDay}
                  onChange={e => setMeetingDay(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-[#121c2c] text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white mb-1.5">
                  Submission Deadline Time (Ghana Time)
                </label>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={e => setMeetingTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-[#121c2c] text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                />
              </div>

              {/* Reminder toggle */}
              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#18283c] border border-slate-200 dark:border-[#2a3e56]">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-[#C6A45A]" />
                  <div>
                    <span className="font-bold text-[#142B4A] dark:text-white block">Automated Deadline Reminders</span>
                    <span className="text-[10px] text-slate-400">Send reminder alerts to tutors before the cutoff</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMeetingReminders(!meetingReminders)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    meetingReminders ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                      meetingReminders ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-xs">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  Active Rule Preview:
                </span>
                <span className="font-bold text-[#142B4A] dark:text-white mt-1 block">
                  {meetingPreview.formatted}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Reports filed after this timestamp are automatically tagged as <strong>Submitted Late</strong>. Unsubmitted cells after deadline are flagged as <strong>Missed</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* CARD 2: EVANGELISM REPORTS DEADLINE                             */}
          {/* =============================================================== */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#142238] border border-slate-200 dark:border-[#26384d] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#26384d]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142B4A] dark:text-white">
                    Evangelism Harvest Report Deadline
                  </h3>
                  <span className="text-[11px] text-slate-400">Souls won, first-timers, and contact capture returns</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                Default: Saturday 5:00 PM
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white mb-1.5">
                  Submission Cutoff Day
                </label>
                <select
                  value={evangDay}
                  onChange={e => setEvangDay(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-[#121c2c] text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white mb-1.5">
                  Submission Deadline Time (Ghana Time)
                </label>
                <input
                  type="time"
                  value={evangTime}
                  onChange={e => setEvangTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-[#121c2c] text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                />
              </div>

              {/* Reminder toggle */}
              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#18283c] border border-slate-200 dark:border-[#2a3e56]">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-[#C6A45A]" />
                  <div>
                    <span className="font-bold text-[#142B4A] dark:text-white block">Automated Outreach Reminders</span>
                    <span className="text-[10px] text-slate-400">Send reminder alerts to soul-winning teams</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEvangReminders(!evangReminders)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    evangReminders ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                      evangReminders ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                  Active Rule Preview:
                </span>
                <span className="font-bold text-[#142B4A] dark:text-white mt-1 block">
                  {evangPreview.formatted}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Outreach harvest returns filed after this cutoff will automatically reflect as <strong>Submitted Late</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Governance & Accountability Notice */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#142238] border border-slate-200 dark:border-[#26384d] flex items-start gap-3 text-xs">
          <ShieldCheck className="w-5 h-5 text-[#C6A45A] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-[#142B4A] dark:text-white">Historical Period Protection Rule</div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Updated deadlines automatically apply to <strong>future reporting cycles</strong>. In compliance with FNI system integrity, deadlines for past reporting periods with recorded submissions remain permanently preserved for audit and historical fidelity.
            </p>
            {settings.updatedAt && (
              <p className="text-[11px] text-slate-400 pt-1">
                Last modified on{' '}
                {new Date(settings.updatedAt).toLocaleString('en-GH', {
                  timeZone: 'Africa/Accra',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}{' '}
                by <strong>{settings.updatedBy || 'FNI Administrator'}</strong>.
              </p>
            )}
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onBack && (
            <Button variant="outline" size="md" onClick={onBack}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSaving}
            leftIcon={<Save className="w-4 h-4 text-[#C6A45A]" />}
          >
            {isSaving ? 'Saving Deadlines...' : 'Save Deadline Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};
