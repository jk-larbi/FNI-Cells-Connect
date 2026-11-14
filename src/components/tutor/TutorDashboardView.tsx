import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { PushNotificationService } from '../../services/pushNotificationService';
import { CellService } from '../../services/cellService';
import { ReportService } from '../../services/reportService';
import { FollowUpService } from '../../services/followUpService';
import { getCurrentDeadlineInfo } from '../../utils/deadlineUtil';
import { Cell, CellMeetingReport, EvangelismReport, EvangelismContact, SoulTargetMetrics } from '../../types';
import { SoulTargetService } from '../../services/soulTargetService';
import { LocationSharingPanel } from '../location/LocationSharingPanel';
import {
  Users,
  Flame,
  Clock,
  CheckCircle2,
  Calendar,
  FileText,
  MapPin,
  Bell,
  Heart,
  Sparkles,
  BookOpen,
  Phone,
  MessageCircle,
  Target,
  CheckSquare,
  Square,
  Quote,
  TrendingUp,
  Smile,
  Sunrise,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react';

interface TutorDashboardViewProps {
  onNavigateToTab: (tab: any) => void;
  onOpenReport?: (reportId: string) => void;
}

export const TutorDashboardView: React.FC<TutorDashboardViewProps> = ({
  onNavigateToTab,
  onOpenReport,
}) => {
  const { currentUser } = useAuth();
  const [cell, setCell] = useState<Cell | null>(null);
  const [meetingReports, setMeetingReports] = useState<CellMeetingReport[]>([]);
  const [evangReports, setEvangReports] = useState<EvangelismReport[]>([]);
  const [contacts, setContacts] = useState<EvangelismContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [soulMetrics, setSoulMetrics] = useState<SoulTargetMetrics | null>(null);

  // Push Notifications state
  const { isPushEnabled, requestPushPermission } = useNotifications();
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);
  const [isRequestingPush, setIsRequestingPush] = useState(false);

  // Shepherd Checklist State
  const deadlineInfo = getCurrentDeadlineInfo();
  const checklistStorageKey = `fni_shepherd_checklist_${currentUser?.id || 'tutor'}_${deadlineInfo.periodName}`;

  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem(checklistStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      outline: false,
      care: false,
      fellowship: false,
      report: false,
    };
  });

  const toggleChecklistItem = (key: string) => {
    setChecklist(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(checklistStorageKey, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  const handleEnablePush = async () => {
    setIsRequestingPush(true);
    try {
      const res = await requestPushPermission();
      if (res.success) {
        setPushStatusMsg('Push notifications successfully enabled on your device!');
      } else {
        setPushStatusMsg(res.error || 'Failed to enable push notifications');
      }
    } finally {
      setIsRequestingPush(false);
    }
  };

  const handleTestPush = () => {
    const success = PushNotificationService.showLocalNotification('FNI CELLS CONNECT Tutor Alert', {
      body: 'Verified: Tutor notifications active for review feedback and announcements!',
      tag: 'tutor-test-' + Date.now(),
      data: { targetTab: 'my-reports' },
    });
    if (success) {
      setPushStatusMsg('Test notification delivered to your browser / device!');
    } else {
      setPushStatusMsg('Push notification blocked by browser permissions.');
    }
  };

  useEffect(() => {
    // Live Soul Target Tracking Subscription
    const unsubSoul = SoulTargetService.subscribeToLiveSoulTracking(liveM => {
      setSoulMetrics(liveM);
    });

    return () => unsubSoul();
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const c = await CellService.getCellForTutor(currentUser);
        setCell(c);
        const [mList, eList, cntList] = await Promise.all([
          ReportService.getCellMeetingReports({ cellId: c.id }),
          ReportService.getEvangelismReports({ cellId: c.id }),
          FollowUpService.getContacts(c.id),
        ]);
        setMeetingReports(mList);
        setEvangReports(eList);
        setContacts(cntList);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-[#667085] font-medium flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#142B4A] border-t-transparent animate-spin" />
        <span>Loading your fellowship sanctuary...</span>
      </div>
    );
  }

  // Greeting based on time of day in Ghana
  const currentHour = new Date().getHours();
  const greetingIcon =
    currentHour < 12 ? (
      <Sunrise className="w-4 h-4 text-[#C6A45A]" />
    ) : currentHour < 17 ? (
      <Sun className="w-4 h-4 text-[#C6A45A]" />
    ) : (
      <Moon className="w-4 h-4 text-[#C6A45A]" />
    );

  const greetingText =
    currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  // Metrics for calculations
  const latestMeeting = meetingReports[0] || null;
  const latestAttendance = Number(latestMeeting?.attendance) || 0;
  const latestAbsent = Number(latestMeeting?.absentees) || 0;
  const totalRoster = latestAttendance + latestAbsent > 0
    ? latestAttendance + latestAbsent
    : (cell?.total_members || cell?.target_attendance || 0);

  // Attendance Vitality Rate
  const attendanceRate = totalRoster > 0
    ? Math.min(100, Math.round((latestAttendance / totalRoster) * 100))
    : 100;

  // Vitality classification
  let vitalityStatus = {
    label: 'Flourishing Fellowship',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    description: 'High member engagement and faithful attendance.',
  };
  if (attendanceRate < 60) {
    vitalityStatus = {
      label: 'Pastoral Care Required',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
      description: 'Multiple absentees noted. Reach out to restore connection.',
    };
  } else if (attendanceRate < 80) {
    vitalityStatus = {
      label: 'Steady Growth',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      dotClass: 'bg-blue-500',
      description: 'Good attendance with opportunities for follow-up.',
    };
  }

  // Cell Soul Harvest contribution
  const myCellContribution = soulMetrics?.cellContributions.find(
    c => c.cellId === cell?.id || c.cellName.toLowerCase() === (cell?.name || currentUser.cell_name || '').toLowerCase()
  )?.souls || 0;

  // Cycle submission check
  const hasSubmittedCurrentCycle = meetingReports.length > 0;
  const isLateSubmission = latestMeeting ? latestMeeting.late : false;

  // Pastoral Care Radar: Contacts needing care
  const careContacts = contacts
    .filter(
      c =>
        c.followUpStatus === 'New Contact' ||
        c.followUpStatus === 'Follow-up Pending' ||
        c.followUpStatus === 'Contacted' ||
        c.followUpStatus === 'Follow-up required'
    )
    .slice(0, 3);

  // Count checklist completion
  const completedSteps = Object.values(checklist).filter(Boolean).length;
  const checklistPercent = Math.round((completedSteps / 4) * 100);

  return (
    <div className="space-y-6">
      {/* 1. FELLOWSHIP PASTORAL SANCTUARY HEADER */}
      <div className="fni-tutor-sanctuary-header bg-gradient-to-r from-[#142B4A] via-[#1A365D] to-[#203D63] text-white rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden border border-[#142B4A]">
        {/* Subtle decorative gold glow */}
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#C6A45A]/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#C6A45A] text-xs font-bold uppercase tracking-wider backdrop-blur-xs border border-white/15">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover -ml-0.5" />
                ) : (
                  greetingIcon
                )}
                <span>{greetingText}, Tutor {currentUser.full_name?.split(' ')[0]}</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-[#C6A45A] text-[#142B4A] text-xs font-black uppercase tracking-wider shadow-2xs">
                Cell Sanctuary
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>{cell?.name || currentUser.cell_name}</span>
                <span className="text-[#C6A45A] text-xl font-bold font-serif italic">Fellowship</span>
              </h1>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-[#C6A45A] shrink-0" />
                  {cell?.location || 'Campus Center'}
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-4 h-4 text-[#C6A45A] shrink-0" />
                  {cell?.meeting_day || 'Wednesday'}s @ {cell?.meeting_time || '6:30 PM'}
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-200">
                  Theme: <strong className="text-white font-bold">Year of Supernatural Harvest</strong>
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 italic pt-1 max-w-xl leading-relaxed">
              &ldquo;Preach the word; be prepared in season and out of season; correct, rebuke and encourage with great patience and careful instruction.&rdquo; &mdash; 2 Timothy 4:2
            </p>
          </div>

          {/* Quick Filing Actions */}
          <div className="flex flex-col sm:flex-row items-stretch lg:items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateToTab('submit-cell-meeting-report')}
              className="h-10 sm:h-11 px-4 sm:px-4.5 rounded-2xl bg-[#C6A45A] hover:bg-[#B59349] text-[#142B4A] text-xs sm:text-sm font-black transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <FileText className="w-4 h-4 text-[#142B4A] shrink-0" />
              <span>Submit Meeting Return</span>
            </button>
            <button
              onClick={() => onNavigateToTab('submit-evangelism-report')}
              className="h-10 sm:h-11 px-4 sm:px-4.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold transition-all border border-white/20 backdrop-blur-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Flame className="w-4 h-4 text-[#C6A45A] shrink-0" />
              <span>Submit Evangelism</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. WEEKLY REPORTING CYCLE & CELEBRATION CARD */}
      <div className="bg-white rounded-3xl border border-[#E3E8EF] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs self-start sm:self-center ${
              hasSubmittedCurrentCycle
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-[#142B4A] text-[#C6A45A]'
            }`}>
              {hasSubmittedCurrentCycle ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                  Fellowship Cycle &bull; {deadlineInfo.periodName}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#F5F7FA] text-[#142B4A] border border-[#E3E8EF]">
                  Sunday 6:00 PM GMT Deadline
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#142B4A] mt-1">
                {hasSubmittedCurrentCycle
                  ? isLateSubmission
                    ? 'Fellowship Return Filed (Late Submission)'
                    : 'Fellowship Return Verified & Filed On-Time! 🙌'
                  : 'Weekly Fellowship Report Pending Submission'}
              </h2>
              <p className="text-xs sm:text-sm text-[#667085] mt-1 leading-relaxed">
                {hasSubmittedCurrentCycle
                  ? 'Your fellowship return is recorded and queued for pastoral review. Excellent diligence in shepherding God’s flock!'
                  : `Please file your fellowship attendance before Sunday at 6:00 PM GMT (${deadlineInfo.deadlineFormatted}).`}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2.5">
            {hasSubmittedCurrentCycle ? (
              <button
                onClick={() => onNavigateToTab('my-reports')}
                className="h-10 px-4 rounded-xl bg-[#F5F7FA] hover:bg-[#E3E8EF] text-[#142B4A] text-xs sm:text-sm font-bold transition-all border border-[#E3E8EF] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View Submitted Returns</span>
                <ChevronRight className="w-4 h-4 text-[#667085]" />
              </button>
            ) : (
              <button
                onClick={() => onNavigateToTab('submit-cell-meeting-report')}
                className="h-10 px-4 sm:px-4.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>File Return Now</span>
                <ChevronRight className="w-4 h-4 text-[#C6A45A]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN CREATIVE SHEPHERD PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vitality Health & Shepherd Checklist (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* CELL VITALITY & FELLOWSHIP HEALTH SCORECARD */}
          <div className="bg-white rounded-3xl border border-[#E3E8EF] p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E3E8EF]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#142B4A]">Cell Spiritual Health & Vitality</h3>
                  <p className="text-xs text-[#667085]">Live attendance retention from latest fellowship</p>
                </div>
              </div>

              <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 ${vitalityStatus.badgeClass}`}>
                <span className={`w-2 h-2 rounded-full ${vitalityStatus.dotClass} animate-pulse`} />
                <span>{vitalityStatus.label}</span>
              </div>
            </div>

            <div className="space-y-5">
              {/* Big Vitality Gauge Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#F5F7FA] border border-[#E3E8EF]">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                    Attendance Retention Rate
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-[#142B4A] flex items-baseline gap-2">
                    <span>{attendanceRate}%</span>
                    <span className="text-xs sm:text-sm font-semibold text-[#667085]">
                      ({latestAttendance} of {totalRoster} members gathered)
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#667085] leading-normal">{vitalityStatus.description}</p>
                </div>

                {/* Equal-width Present and Absent boxes */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="min-w-[88px] text-center px-4 py-2.5 rounded-xl bg-white border border-[#E3E8EF] shadow-2xs">
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Present</div>
                    <div className="text-xl font-black text-[#182230] mt-0.5">{latestAttendance}</div>
                  </div>
                  <div className="min-w-[88px] text-center px-4 py-2.5 rounded-xl bg-white border border-[#E3E8EF] shadow-2xs">
                    <div className="text-xs font-bold text-amber-600 uppercase tracking-wide">Absent</div>
                    <div className="text-xl font-black text-[#182230] mt-0.5">{latestAbsent}</div>
                  </div>
                </div>
              </div>

              {/* Attendance Visual Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm text-[#667085]">
                  <span className="font-medium">Fellowship Attendance Ratio</span>
                  <span className="font-bold text-[#142B4A]">
                    {latestAttendance} Present &bull; {latestAbsent} Absent
                  </span>
                </div>
                <div className="w-full bg-[#E3E8EF] h-3 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${attendanceRate}%` }}
                    className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
                    title={`Present: ${latestAttendance}`}
                  />
                  <div
                    style={{ width: `${100 - attendanceRate}%` }}
                    className="bg-amber-400 h-full rounded-r-full transition-all duration-500"
                    title={`Absent: ${latestAbsent}`}
                  />
                </div>
              </div>

              {/* Pastoral Insight note */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs sm:text-sm text-amber-950 flex items-start gap-3">
                <Heart className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-bold text-amber-950">Shepherd's Note: </strong>
                  {latestAbsent > 0 ? (
                    <span>
                      You have <strong>{latestAbsent} {latestAbsent === 1 ? 'member' : 'members'}</strong> who missed the last meeting. A quick check-in call or WhatsApp message brings immense warmth and encouragement to their hearts!
                    </span>
                  ) : (
                    <span>
                      Glory to God! Every single member on the roster was present in fellowship. Keep watering the flock with prayer and brotherly love!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TUTOR WEEKLY SHEPHERD CHECKLIST (Interactive & Saved) */}
          <div className="bg-white rounded-3xl border border-[#E3E8EF] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E3E8EF]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#142B4A] text-[#C6A45A] flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#142B4A]">Tutor Shepherd Checklist</h3>
                  <p className="text-xs text-[#667085]">Your weekly fellowship ministry journey</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs sm:text-sm font-black text-[#142B4A]">{completedSteps} of 4 Completed</span>
                <div className="text-xs text-[#667085]">{checklistPercent}% this cycle</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#E3E8EF] h-2.5 rounded-full overflow-hidden">
              <div
                style={{ width: `${checklistPercent}%` }}
                className="bg-[#142B4A] h-full rounded-full transition-all duration-300"
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-3 pt-1">
              {[
                {
                  key: 'outline',
                  title: '1. Study Weekly Teaching Outline',
                  desc: 'Review the official sermon outline & prepare discussion scriptures.',
                  navTab: 'materials',
                  actionText: 'View Outlines',
                },
                {
                  key: 'care',
                  title: '2. Mid-Week Pastoral Reach-Out',
                  desc: 'Check in on absent members & encourage new converts with prayers.',
                  navTab: 'follow-ups',
                  actionText: 'Open Care Pipeline',
                },
                {
                  key: 'fellowship',
                  title: '3. Lead Cell Fellowship Meeting',
                  desc: 'Gather the flock in love: Word, prayer, fellowship & offering.',
                  navTab: null,
                  actionText: null,
                },
                {
                  key: 'report',
                  title: '4. File Fellowship Return on Time',
                  desc: 'Submit attendance (present & absent) before Sunday 6:00 PM GMT.',
                  navTab: 'submit-cell-meeting-report',
                  actionText: 'File Return',
                },
              ].map(item => {
                const isChecked = !!checklist[item.key];
                return (
                  <div
                    key={item.key}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3.5 ${
                      isChecked
                        ? 'bg-emerald-50/50 border-emerald-200 text-[#182230]'
                        : 'bg-[#F5F7FA] border-[#E3E8EF] hover:border-[#142B4A]'
                    }`}
                  >
                    <div
                      onClick={() => toggleChecklistItem(item.key)}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <button
                        type="button"
                        className="shrink-0 text-[#142B4A] hover:scale-110 transition-transform cursor-pointer"
                        aria-label={isChecked ? `Uncheck ${item.title}` : `Check ${item.title}`}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Square className="w-5 h-5 text-[#667085]" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className={`text-xs sm:text-sm font-bold truncate ${isChecked ? 'line-through text-slate-500' : 'text-[#182230]'}`}>
                          {item.title}
                        </div>
                        <div className="text-xs text-[#667085] mt-0.5 leading-normal">{item.desc}</div>
                      </div>
                    </div>

                    {item.navTab && item.actionText && (
                      <button
                        onClick={() => onNavigateToTab(item.navTab)}
                        className="shrink-0 text-xs font-bold text-[#142B4A] hover:bg-[#F5F7FA] px-3 py-1.5 rounded-xl bg-white border border-[#E3E8EF] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>{item.actionText}</span>
                        <span>&rarr;</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Inspiration, Testimonies, Pastoral Care & Souls Target (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* PASTORAL WORD & DEVOTIONAL INSPIRATION */}
          <div className="bg-gradient-to-br from-[#142B4A] to-[#203D63] text-white rounded-3xl p-5 sm:p-6 shadow-xs border border-[#142B4A] relative overflow-hidden">
            <BookOpen className="w-20 h-20 text-[#C6A45A]/15 absolute -right-2 -bottom-2 pointer-events-none" />
            <div className="flex items-center gap-2 text-[#C6A45A] text-xs font-bold uppercase tracking-wider">
              <span className="p-1 rounded-lg bg-[#C6A45A]/15 text-[#C6A45A] flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </span>
              <span>Word of the Week for Tutors</span>
            </div>

            <div className="mt-3 relative z-10">
              <p className="text-sm sm:text-base font-serif italic text-slate-100 leading-relaxed">
                &ldquo;For God is not unjust to forget your work and labor of love which you have shown toward His name, in that you have ministered to the saints, and do minister.&rdquo;
              </p>
              <div className="text-right text-xs font-bold text-[#C6A45A] mt-2 flex items-center justify-end gap-1.5">
                <span className="text-sm">📖</span>
                <span>Hebrews 6:10</span>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed">
              <strong className="text-white block font-bold mb-1">Shepherd’s Encouragement:</strong>
              Leading a cell is raising kingdom giants. No prayer whispered, no follow-up call made, and no seat set in fellowship is in vain. God is expanding your territory!
            </div>
          </div>

          {/* 2026 KINGDOM SOUL-WINNING HARVEST */}
          <div className="bg-white rounded-3xl border border-[#E3E8EF] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E3E8EF]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#C6A45A] flex items-center justify-center border border-amber-100 shrink-0">
                  <span className="text-xl leading-none" role="img" aria-label="Souls harvest">🌾</span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#142B4A]">2026 Kingdom Soul Harvest</h3>
                  <p className="text-xs text-[#667085]">Ministry-wide 5,000 Souls Target</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200 shrink-0">
                Live Harvest
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-[#142B4A]">
                  {soulMetrics ? soulMetrics.verifiedSoulsWon.toLocaleString() : '0'} Souls
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#C6A45A]">
                  {soulMetrics?.percentageAchieved || 0}% of 5,000 Goal
                </span>
              </div>

              <div className="w-full bg-[#E3E8EF] h-2.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${soulMetrics?.percentageAchieved || 0}%` }}
                  className="bg-gradient-to-r from-[#C6A45A] to-emerald-500 h-full rounded-full transition-all duration-700"
                />
              </div>

              <div className="p-3.5 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] flex items-center justify-between text-xs sm:text-sm">
                <span className="text-[#667085] font-medium">Your Cell Contribution:</span>
                <span className="font-bold text-emerald-600">+{myCellContribution} souls harvested</span>
              </div>
            </div>
          </div>

          {/* IMMEDIATE PASTORAL CARE RADAR (Touchpoint with 1-tap WhatsApp) */}
          <div className="bg-white rounded-3xl border border-[#E3E8EF] p-5 sm:p-6 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E3E8EF]">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-[#142B4A] uppercase tracking-wider">
                  Pastoral Care Radar
                </h3>
              </div>
              <button
                onClick={() => onNavigateToTab('follow-ups')}
                className="text-xs font-bold text-[#142B4A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Pipeline</span>
                <span>&rarr;</span>
              </button>
            </div>

            <div className="space-y-3">
              {careContacts.length === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 text-center text-xs sm:text-sm text-emerald-800 space-y-1">
                  <Smile className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                  <div className="font-bold">All Members in Good Pastoral Care!</div>
                  <div className="text-xs text-emerald-700">
                    No pending follow-ups or unattended absentees.
                  </div>
                </div>
              ) : (
                careContacts.map(contact => {
                  const name = contact.contactName || contact.name || 'Fellowship Member';
                  const phone = contact.phone || '';
                  const cleanPhone = phone.replace(/[^0-9]/g, '');
                  const waText = encodeURIComponent(
                    `Hello ${name}! Thinking of you and praying for you. We missed you at fellowship and look forward to seeing you soon! - Tutor ${currentUser.full_name}`
                  );

                  return (
                    <div
                      key={contact.id}
                      className="p-3.5 rounded-2xl bg-[#F5F7FA] border border-[#E3E8EF] flex items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-bold text-[#182230] truncate">{name}</div>
                        <div className="text-xs text-[#667085] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>{contact.followUpStatus}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {cleanPhone ? (
                          <>
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${waText}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-transform hover:scale-105 shadow-2xs"
                              title="Send WhatsApp message"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                            <a
                              href={`tel:${cleanPhone}`}
                              className="w-9 h-9 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-2xs"
                              title="Make a phone call"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          </>
                        ) : (
                          <span className="text-xs text-[#667085] italic">No phone logged</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. PUSH NOTIFICATION ALERT STATUS */}
      <div className="bg-white rounded-3xl border border-[#E3E8EF] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#142B4A]/5 border border-[#142B4A]/10 flex items-center justify-center text-[#C6A45A] shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-[#142B4A]">
                Tutor Real-Time Notifications
              </span>
              {isPushEnabled ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active on this device
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                  Device Alerts Inactive
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#667085] mt-1 leading-normal">
              {isPushEnabled
                ? 'Your device receives instant alerts when administrators review your reports or send pastoral announcements.'
                : 'Turn on device push alerts so you never miss review feedback, corrections, or weekly announcements.'}
            </p>
            {pushStatusMsg && (
              <p className="text-xs text-[#203D63] bg-blue-50 px-2.5 py-1 rounded-md mt-1.5 border border-blue-100">
                {pushStatusMsg}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {isPushEnabled ? (
            <button
              type="button"
              onClick={handleTestPush}
              className="h-10 px-4 rounded-xl bg-[#F5F7FA] hover:bg-[#E3E8EF] text-[#142B4A] text-xs sm:text-sm font-bold transition-colors border border-[#E3E8EF] flex items-center gap-2 cursor-pointer"
            >
              <Bell className="w-4 h-4 text-[#C6A45A]" />
              <span>Test Alert</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={isRequestingPush}
              className="h-10 px-4 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs sm:text-sm font-bold transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              <Bell className="w-4 h-4 text-[#C6A45A]" />
              <span>{isRequestingPush ? 'Enabling...' : 'Enable Alerts'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
