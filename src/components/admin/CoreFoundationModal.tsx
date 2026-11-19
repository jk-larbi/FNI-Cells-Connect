import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SettingsService } from '../../services/settingsService';
import { DeadlineService, DAYS_OF_WEEK } from '../../services/deadlineService';
import {
  Compass,
  Award,
  Flame,
  Clock,
  Target,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface CoreFoundationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const CoreFoundationModal: React.FC<CoreFoundationModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [target, setTarget] = useState(5000);
  const [meetingDay, setMeetingDay] = useState(0);
  const [meetingTime, setMeetingTime] = useState('18:00');
  const [evangDay, setEvangDay] = useState(6);
  const [evangTime, setEvangTime] = useState('18:00');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setIsLoading(true);
    setSaveNotice(null);
    setErrorMessage(null);

    Promise.all([
      SettingsService.getSettings(),
      DeadlineService.getDeadlineSettings(),
    ])
      .then(([s, dl]) => {
        if (!active) return;
        setVision(s.vision || '');
        setMission(s.mission || '');
        setTarget(s.annualSoulWinningTarget || 5000);
        setMeetingDay(dl.meeting.dayOfWeek);
        setMeetingTime(dl.meeting.deadlineTime);
        setEvangDay(dl.evangelism.dayOfWeek);
        setEvangTime(dl.evangelism.deadlineTime);
      })
      .catch(err => {
        if (active) setErrorMessage(err?.message || 'Failed to load foundation settings.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMessage('Administrator privileges are required to configure the FNI Core Foundation.');
      return;
    }

    setIsSaving(true);
    setSaveNotice(null);
    setErrorMessage(null);

    try {
      const meetingDayName = DAYS_OF_WEEK.find(d => d.value === Number(meetingDay))?.label || 'Sunday';
      const evangDayName = DAYS_OF_WEEK.find(d => d.value === Number(evangDay))?.label || 'Saturday';
      const summaryDeadline = `Cell Meetings: ${meetingDayName} at ${meetingTime} | Evangelism: ${evangDayName} at ${evangTime} Ghana Time`;

      // 1. Update deadlines in DeadlineService
      await DeadlineService.updateDeadlineSettings(
        {
          meeting: {
            reportType: 'meeting',
            dayOfWeek: Number(meetingDay),
            dayName: meetingDayName,
            deadlineTime: meetingTime,
            remindersEnabled: true,
          },
          evangelism: {
            reportType: 'evangelism',
            dayOfWeek: Number(evangDay),
            dayName: evangDayName,
            deadlineTime: evangTime,
            remindersEnabled: true,
          },
        },
        currentUser?.full_name || 'Administrator'
      );

      // 2. Update core foundation settings in SettingsService
      await SettingsService.updateSettings(
        {
          vision,
          mission,
          annualSoulWinningTarget: Number(target),
          weeklyDeadline: summaryDeadline,
        },
        currentUser?.full_name || 'Administrator'
      );

      setSaveNotice('FNI Core Foundation saved and synchronized across all cells!');
      if (onSaved) onSaved();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not save the Core Foundation. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0c1626] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Banner - Matches Image 2 */}
        <div className="p-5 sm:p-6 bg-[#0f1d32] border-b border-slate-800 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#0b1424] border border-[#1e3455] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Compass className="w-6 h-6 text-[#C6A45A]" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">FNI Vision & Mission</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#e0b865] bg-[#2a2215] px-2.5 py-0.5 rounded-full border border-[#5c451b]">
                    <Award className="w-3.5 h-3.5 text-[#e0b865]" /> Core Foundation
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 font-normal leading-relaxed max-w-lg">
                  Apostolic mandate, spiritual vision, mission statement, and ministry harvest targets
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16233a] border border-slate-700/70 shadow-xs">
                <span className="text-[#C6A45A] font-bold text-[11px]">Habakkuk 2:2</span>
                <span className="text-slate-400 text-[10px]">•</span>
                <span className="text-white text-[11px] font-medium">Write the vision plainly</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 text-xs bg-[#0c1626] overflow-y-auto grow">
          {saveNotice && (
            <div className="p-3.5 bg-emerald-950/50 border-l-4 border-[#23845B] text-emerald-300 rounded-xl font-semibold flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{saveNotice}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-950/50 border-l-4 border-rose-500 text-rose-300 rounded-xl font-semibold flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading current ministry foundation...</div>
          ) : (
            <>
              {/* FNI Vision */}
              <div className="rounded-xl border border-slate-800 p-4 bg-[#0f1d32]/70 space-y-2 focus-within:border-[#C6A45A] transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <div className="w-6 h-6 rounded-lg bg-[#C6A45A]/20 flex items-center justify-center text-[#C6A45A]">
                      <Compass className="w-3.5 h-3.5" />
                    </div>
                    <span>FNI Spiritual Vision</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                    {vision.length} characters
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  The apostolic directive and long-term kingdom mandate revealed for Forerunners Network International.
                </p>
                <textarea
                  rows={3}
                  value={vision}
                  onChange={e => setVision(e.target.value)}
                  placeholder="Enter the FNI Vision statement..."
                  required
                  className="w-full p-3 rounded-lg border border-slate-700 bg-[#16233a] text-white text-xs leading-relaxed placeholder:text-slate-400 focus:border-[#C6A45A] focus:ring-1 focus:ring-[#C6A45A] focus:outline-none transition-all shadow-sm"
                />
              </div>

              {/* FNI Mission */}
              <div className="rounded-xl border border-slate-800 p-4 bg-[#0f1d32]/70 space-y-2 focus-within:border-[#C6A45A] transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <div className="w-6 h-6 rounded-lg bg-[#23845B]/20 flex items-center justify-center text-emerald-400">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <span>FNI Mission Statement</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                    {mission.length} characters
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  How our cell fellowships mobilize discipleship, soul-winning outreaches, and territorial transformation.
                </p>
                <textarea
                  rows={3}
                  value={mission}
                  onChange={e => setMission(e.target.value)}
                  placeholder="Enter the FNI Mission statement..."
                  required
                  className="w-full p-3 rounded-lg border border-slate-700 bg-[#16233a] text-white text-xs leading-relaxed placeholder:text-slate-400 focus:border-[#C6A45A] focus:ring-1 focus:ring-[#C6A45A] focus:outline-none transition-all shadow-sm"
                />
              </div>

              {/* Annual Soul Winning Target */}
              <div className="rounded-xl border border-slate-800 p-4 bg-[#0f1d32]/70 space-y-2 focus-within:border-[#C6A45A] transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-[#C6A45A]">
                      <Flame className="w-3.5 h-3.5" />
                    </div>
                    <span>Kingdom Harvest Target (Annual Souls)</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#e0b865] bg-[#2a2215] px-2 py-0.5 rounded-full border border-[#5c451b]">
                    Network Goal
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Total souls targeted across all 16 cells. Progress is tracked live on the executive dashboard.
                </p>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    value={target}
                    onChange={e => setTarget(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#16233a] text-white font-bold text-sm focus:border-[#C6A45A] focus:ring-1 focus:ring-[#C6A45A] focus:outline-none transition-all shadow-sm"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                    souls
                  </span>
                </div>
              </div>

              {/* Report Deadlines (Cell Meetings & Evangelism) */}
              <div className="rounded-xl border border-slate-800 p-4 bg-[#0f1d32]/70 space-y-3">
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span>Reporting Cutoff Times (Africa/Accra GMT)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Meeting Cutoff */}
                  <div className="p-3 rounded-lg bg-[#16233a] border border-slate-700 space-y-2">
                    <span className="text-[11px] font-bold text-white block">Weekly Cell Meeting Cutoff</span>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={meetingDay}
                        onChange={e => setMeetingDay(Number(e.target.value))}
                        className="p-2 rounded bg-[#0f1d32] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C6A45A]"
                      >
                        {DAYS_OF_WEEK.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={meetingTime}
                        onChange={e => setMeetingTime(e.target.value)}
                        className="p-2 rounded bg-[#0f1d32] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C6A45A]"
                      />
                    </div>
                  </div>

                  {/* Evangelism Cutoff */}
                  <div className="p-3 rounded-lg bg-[#16233a] border border-slate-700 space-y-2">
                    <span className="text-[11px] font-bold text-white block">Weekly Evangelism Cutoff</span>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={evangDay}
                        onChange={e => setEvangDay(Number(e.target.value))}
                        className="p-2 rounded bg-[#0f1d32] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C6A45A]"
                      >
                        {DAYS_OF_WEEK.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={evangTime}
                        onChange={e => setEvangTime(e.target.value)}
                        className="p-2 rounded bg-[#0f1d32] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#C6A45A]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C6A45A] to-[#D4AF37] hover:from-[#d4af37] hover:to-[#e0b865] text-[#0c1626] font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Core Foundation...' : 'Save Core Foundation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
