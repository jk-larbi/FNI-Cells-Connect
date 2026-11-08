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
import {
  Users,
  Building,
  Flame,
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Plus,
  ArrowRight,
  UserPlus,
  AlertTriangle,
  FileText,
  MapPin,
  Compass,
  Bell,
  BookOpen,
  MessageSquare,
  History,
  ShieldCheck,
  Target,
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
  const { isPushEnabled, isPushSupported, requestPushPermission } = useNotifications();
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);
  const [isRequestingPush, setIsRequestingPush] = useState(false);

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

  const deadlineInfo = getCurrentDeadlineInfo();

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
      <div className="py-24 text-center text-xs text-[#667085] font-medium">
        Loading your cell intelligence...
      </div>
    );
  }

  // Calculate metrics for this tutor's cell
  const latestMeeting = meetingReports[0] || null;
  const totalMembers = latestMeeting ? latestMeeting.members : (cell?.target_attendance || 0);
  const activeMembers = latestMeeting ? latestMeeting.activeMembers : 0;
  const latestAttendance = latestMeeting ? latestMeeting.attendance : 0;
  const newMembersCount = latestMeeting ? latestMeeting.newMembers : 0;

  const totalEvangelismActivities = evangReports.length;
  const peopleReached = evangReports.reduce((s, e) => s + (Number(e.peopleSpokenTo) || 0), 0);
  const conversions = evangReports.reduce((s, e) => s + (Number(e.conversions) || 0), 0);

  const completedFollowUps = contacts.filter(
    c => c.followUpStatus === 'Joined Ministry' || c.followUpStatus === 'Completed'
  ).length;
  const requiringFollowUp = contacts.filter(
    c =>
      c.followUpStatus === 'New Contact' ||
      c.followUpStatus === 'Follow-up Pending' ||
      c.followUpStatus === 'Contacted' ||
      c.followUpStatus === 'Interested'
  ).length;

  const allTutorReports = [...meetingReports, ...evangReports];
  const awaitingReview = allTutorReports.filter(
    r => r.status === 'Newly Submitted' || r.status === 'submitted' || r.status === 'under_review'
  ).length;
  const approvedCount = allTutorReports.filter(r => r.status === 'Approved' || r.status === 'approved').length;
  const needsCorrectionCount = allTutorReports.filter(
    r => r.status === 'Needs Correction' || r.status === 'needs_revision'
  ).length;

  const hasSubmittedCurrentCycle = meetingReports.length > 0;
  const isLateSubmission = latestMeeting ? latestMeeting.late : false;

  const myCellContribution = soulMetrics?.cellContributions.find(
    c => c.cellId === cell?.id || c.cellName.toLowerCase() === (cell?.name || currentUser.cell_name || '').toLowerCase()
  )?.souls || 0;
  const myCellPercent = soulMetrics?.cellContributions.find(
    c => c.cellId === cell?.id || c.cellName.toLowerCase() === (cell?.name || currentUser.cell_name || '').toLowerCase()
  )?.percentage || 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
              My Cell Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#142B4A] text-[#C6A45A] text-[10px] font-bold uppercase tracking-wider">
              Tutor
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">
            Welcome back, <span className="font-bold text-[#182230]">{currentUser.full_name}</span> &bull; Fellowship: <span className="font-bold text-[#182230]">{cell?.name || currentUser.cell_name}</span> ({cell?.location || 'Central Campus'})
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onNavigateToTab('submit-cell-meeting-report')}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Submit Meeting</span>
          </button>
          <button
            onClick={() => onNavigateToTab('submit-evangelism-report')}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-[#23845B] text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Submit Evangelism</span>
          </button>
        </div>
      </div>

      {/* WEEKLY REPORTING DEADLINE BANNER (Prompt Section 8) */}
      <div className="bg-white rounded-2xl border-2 border-[#142B4A] p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#142B4A] flex items-center justify-center text-[#C6A45A] shrink-0 mt-0.5 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                  Weekly Reporting Deadline
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#142B4A] text-white text-[10px] font-semibold">
                  {deadlineInfo.periodName}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-[#142B4A] mt-0.5">
                Every Sunday at 6:00 PM Ghana time (Africa/Accra)
              </h2>
              <p className="text-xs text-[#667085] mt-1">
                Next Deadline: <span className="font-bold text-[#182230]">{deadlineInfo.deadlineFormatted}</span>
              </p>
            </div>
          </div>

          {/* Submission Status Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF] text-xs">
              <div className="text-[10px] text-[#667085] font-semibold">Weekly Filing Status</div>
              <div className="font-bold mt-0.5 flex items-center gap-1.5">
                {hasSubmittedCurrentCycle ? (
                  isLateSubmission ? (
                    <span className="text-[#C74646] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Filed (Late)
                    </span>
                  ) : (
                    <span className="text-[#23845B] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Filed On-Time
                    </span>
                  )
                ) : (
                  <span className="text-[#D99A32] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Submission Pending
                  </span>
                )}
              </div>
            </div>

            {!hasSubmittedCurrentCycle && (
              <button
                onClick={() => onNavigateToTab('submit-cell-meeting-report')}
                className="px-4 py-2.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] shadow-sm flex items-center gap-1.5"
              >
                <span>File Return Now</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2026 ANNUAL SOUL-WINNING TARGET LIVE TRACKER */}
      <div className="bg-gradient-to-br from-[#142B4A] to-[#203D63] text-white rounded-2xl p-5 shadow-sm border border-[#142B4A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C6A45A] text-[#142B4A] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C6A45A]">
                  2026 Kingdom Soul-Winning Target
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Harvest
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {soulMetrics ? `${soulMetrics.verifiedSoulsWon.toLocaleString()} Souls Harvested` : '0 Souls Harvested'}
                <span className="text-sm font-normal text-slate-300 ml-2">
                  / {soulMetrics?.annualTarget.toLocaleString() || '5,000'} Goal ({soulMetrics?.percentageAchieved || 0}%)
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Your Fellowship Contribution: <strong className="text-white">+{myCellContribution} souls</strong> ({myCellPercent}% of ministry total)
              </p>
            </div>
          </div>

          <div className="w-full md:w-64 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Ministry Progress</span>
              <span className="font-bold text-[#C6A45A]">{soulMetrics?.percentageAchieved || 0}% Achieved</span>
            </div>
            <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-[#C6A45A] to-emerald-400 h-full rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${soulMetrics?.percentageAchieved || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-300">
              <span>Remaining: <strong className="text-white">{soulMetrics?.remainingSouls.toLocaleString() || '5,000'}</strong></span>
              <span>Cell Meetings & Outreach</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Status Warning if any needs correction */}
      {needsCorrectionCount > 0 && (
        <div className="p-4 bg-[#FFF5F5] rounded-2xl border-l-4 border-[#C74646] flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#C74646] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-[#C74646]">
                {needsCorrectionCount} Report Returned for Correction
              </h3>
              <p className="text-xs text-[#182230] mt-0.5">
                The administrator reviewed your submission and requested adjustments. Please inspect reviewer feedback comments and resubmit.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('my-reports')}
            className="px-3 py-1.5 rounded-xl bg-[#C74646] text-white text-xs font-bold hover:bg-rose-700 shrink-0"
          >
            Review & Edit
          </button>
        </div>
      )}

      {/* METRICS GRID FOR THIS CELL */}
      <div>
        <h3 className="text-xs font-bold text-[#667085] uppercase tracking-wider mb-3">
          Cell Vital Statistics & Ministry Harvest
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
          {/* Total Members */}
          <div
            onClick={() => onNavigateToTab('my-cell')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all"
            title="Update your cell membership, location and meeting times"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Total Members</div>
            <div className="text-xl font-black text-[#182230] mt-1">{totalMembers}</div>
            <div className="text-[10px] text-[#142B4A] font-semibold mt-0.5">Cell Details &rarr;</div>
          </div>

          {/* Active Members */}
          <div
            onClick={() => onNavigateToTab('my-cell')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#23845B] hover:shadow-md cursor-pointer transition-all"
            title="View regular active attendees"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Active Members</div>
            <div className="text-xl font-black text-[#23845B] mt-1">{activeMembers}</div>
            <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">Regular Attendees &rarr;</div>
          </div>

          {/* Latest Attendance */}
          <div
            onClick={() => onNavigateToTab('my-reports')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all"
            title="Inspect submitted meeting returns"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Latest Attendance</div>
            <div className="text-xl font-black text-[#142B4A] mt-1">{latestAttendance}</div>
            <div className="text-[10px] text-[#667085] font-semibold mt-0.5">Last Fellowship &rarr;</div>
          </div>

          {/* New Members */}
          <div
            onClick={() => onNavigateToTab('my-cell')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#C6A45A] hover:shadow-md cursor-pointer transition-all"
            title="Review new cell members"
          >
            <div className="text-[11px] font-semibold text-[#667085]">New Members</div>
            <div className="text-xl font-black text-[#C6A45A] mt-1">+{newMembersCount}</div>
            <div className="text-[10px] text-[#C6A45A] font-semibold mt-0.5">Added to Cell &rarr;</div>
          </div>

          {/* Evangelism Activities */}
          <div
            onClick={() => onNavigateToTab('my-reports')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all"
            title="View submitted evangelism reports"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Outreaches Held</div>
            <div className="text-xl font-black text-[#182230] mt-1">{totalEvangelismActivities}</div>
            <div className="text-[10px] text-[#667085] font-semibold mt-0.5">Missions Filed &rarr;</div>
          </div>

          {/* Conversions */}
          <div
            onClick={() => onNavigateToTab('evangelism-contacts')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#23845B] hover:shadow-md cursor-pointer transition-all"
            title="View list of souls won and contacts"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Souls Won</div>
            <div className="text-xl font-black text-[#23845B] mt-1">+{conversions}</div>
            <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">Conversions &rarr;</div>
          </div>

          {/* People Reached */}
          <div
            onClick={() => onNavigateToTab('evangelism-contacts')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all"
            title="View outreach witness contacts"
          >
            <div className="text-[11px] font-semibold text-[#667085]">People Spoken To</div>
            <div className="text-xl font-black text-[#182230] mt-1">{peopleReached}</div>
            <div className="text-[10px] text-[#667085] font-semibold mt-0.5">Gospel Witness &rarr;</div>
          </div>

          {/* Contacts Requiring Follow-Up */}
          <div
            onClick={() => onNavigateToTab('follow-ups')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#D99A32] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Follow-Up Required</div>
            <div className="text-xl font-black text-[#D99A32] mt-1">{requiringFollowUp}</div>
            <div className="text-[10px] text-[#D99A32] mt-0.5">Discipleship Pipeline</div>
          </div>

          {/* Completed Follow-ups */}
          <div
            onClick={() => onNavigateToTab('follow-ups')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#23845B] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Follow-ups Completed</div>
            <div className="text-xl font-black text-[#23845B] mt-1">{completedFollowUps}</div>
            <div className="text-[10px] text-[#23845B] mt-0.5">Retained / Joined</div>
          </div>

          {/* Reports Awaiting Review */}
          <div
            onClick={() => onNavigateToTab('my-reports')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Awaiting Review</div>
            <div className="text-xl font-black text-[#182230] mt-1">{awaitingReview}</div>
            <div className="text-[10px] text-[#667085] mt-0.5">Central Review</div>
          </div>

          {/* Approved Reports */}
          <div
            onClick={() => onNavigateToTab('my-reports')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#23845B] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Approved Reports</div>
            <div className="text-xl font-black text-[#23845B] mt-1">{approvedCount}</div>
            <div className="text-[10px] text-[#23845B] mt-0.5">Verified Returns</div>
          </div>

          {/* Needs Correction */}
          <div
            onClick={() => onNavigateToTab('my-reports')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#C74646] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Needs Correction</div>
            <div className="text-xl font-black text-[#C74646] mt-1">{needsCorrectionCount}</div>
            <div className="text-[10px] text-[#C74646] mt-0.5">Requires Resubmit</div>
          </div>
        </div>
      </div>

      {/* Real-time Push Notification Readiness Card for Tutors */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#142B4A]/5 border border-[#142B4A]/10 flex items-center justify-center text-[#C6A45A] shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#142B4A]">
                Tutor Push Notification Alerts
              </span>
              {isPushEnabled ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active on this device
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                  Enable for Live Updates
                </span>
              )}
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              {isPushEnabled
                ? 'Your device will receive instant alerts when administrators review or approve your reports, request corrections, or publish teaching notes.'
                : 'Enable device alerts to never miss administrator feedback, report review notifications, or weekly teaching notes.'}
            </p>
            {pushStatusMsg && (
              <p className="text-[11px] text-[#203D63] bg-blue-50/70 px-2 py-1 rounded-md mt-1.5 border border-blue-100">
                {pushStatusMsg}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          {isPushEnabled ? (
            <button
              type="button"
              onClick={handleTestPush}
              className="px-3.5 py-2 rounded-xl bg-[#F5F7FA] hover:bg-[#E3E8EF] text-[#142B4A] text-xs font-bold transition-colors border border-[#E3E8EF] flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#C6A45A]" />
              <span>Test Alert</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={isRequestingPush}
              className="px-3.5 py-2 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#C6A45A]" />
              <span>{isRequestingPush ? 'Registering...' : 'Enable Push Alerts'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Fellowship Operations & Discipleship Hub */}
      <div>
        <h3 className="text-xs font-bold text-[#667085] uppercase tracking-wider mb-3">
          Fellowship Operations & Discipleship Tools
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* My Cell Management */}
          <div
            onClick={() => onNavigateToTab('my-cell')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#142B4A] shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-[#203D63] transition-colors">
                  My Cell Fellowship
                </div>
                <div className="text-[11px] text-[#667085]">
                  Venue, Day & Total Members
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#142B4A] group-hover:translate-x-1 transition-all" />
          </div>

          {/* Submit Meeting Return */}
          <div
            onClick={() => onNavigateToTab('submit-cell-meeting-report')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#D99A32] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-[#203D63] transition-colors">
                  Submit Meeting Return
                </div>
                <div className="text-[11px] text-[#667085]">
                  Attendance, Absent & Offering
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#142B4A] group-hover:translate-x-1 transition-all" />
          </div>

          {/* Submit Evangelism */}
          <div
            onClick={() => onNavigateToTab('submit-evangelism-report')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#23845B] hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#23845B] shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-emerald-700 transition-colors">
                  Evangelism Outreach
                </div>
                <div className="text-[11px] text-[#667085]">
                  Record Souls Won & Contacts
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#142B4A] group-hover:translate-x-1 transition-all" />
          </div>

          {/* Teaching Outlines */}
          <div
            onClick={() => onNavigateToTab('materials')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-50 border border-[#C6A45A]/20 flex items-center justify-center text-[#C6A45A] shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-gold-700 transition-colors">
                  Teaching Outlines
                </div>
                <div className="text-[11px] text-[#667085]">
                  Official Weekly Sermon Notes
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#142B4A] group-hover:translate-x-1 transition-all" />
          </div>

          {/* Follow-up Pipeline */}
          <div
            onClick={() => onNavigateToTab('follow-ups')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-indigo-700 transition-colors">
                  Discipleship Pipeline
                </div>
                <div className="text-[11px] text-[#667085]">
                  Follow-ups & Cell Integration
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#142B4A] group-hover:translate-x-1 transition-all" />
          </div>

          {/* Communications Hub */}
          <div
            onClick={() => onNavigateToTab('messages')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-sky-700 transition-colors">
                  Tutor Community & Admin
                </div>
                <div className="text-[11px] text-[#667085]">
                  Private Admin Line & Peer Chat
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#142B4A] group-hover:translate-x-1 transition-all" />
          </div>

          {/* My Submitted Reports */}
          <div
            onClick={() => onNavigateToTab('my-reports')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#23845B] shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-[#23845B] transition-colors">
                  My Returns & Feedback
                </div>
                <div className="text-[11px] text-[#667085]">
                  Review Status & Admin Notes
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#142B4A] group-hover:translate-x-1 transition-all" />
          </div>

          {/* Cell Activity History */}
          <div
            onClick={() => onNavigateToTab('cell-activity-history')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#667085] shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-[#142B4A] transition-colors">
                  Cell Activity History
                </div>
                <div className="text-[11px] text-[#667085]">
                  Chronological Fellowship Growth
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#142B4A] group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>

      {/* Recent Submissions List for this Cell (Reference Image Styled!) */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#182230]">
            My Recent Returns ({allTutorReports.length})
          </h2>
          <button
            onClick={() => onNavigateToTab('my-reports')}
            className="text-xs font-bold text-[#142B4A] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-[#E3E8EF]">
          {allTutorReports.length === 0 ? (
            <div className="py-12 text-center text-[#667085] text-xs">
              No reports filed yet for this cell. Click "+ Submit Meeting Return" to start.
            </div>
          ) : (
            allTutorReports.slice(0, 5).map(report => {
              const isMeeting = 'attendance' in report;
              const isNeedsCorrection =
                report.status === 'Needs Correction' || report.status === 'needs_revision';
              const isApproved = report.status === 'Approved' || report.status === 'approved';

              return (
                <div
                  key={report.id}
                  onClick={() => {
                    if (onOpenReport) {
                      onOpenReport(report.id);
                    } else {
                      onNavigateToTab('my-reports');
                    }
                  }}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                    isNeedsCorrection
                      ? 'bg-[#FFF5F5] border-l-4 border-[#C74646]'
                      : 'hover:bg-[#F5F7FA]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                      {isMeeting ? 'MR' : 'EV'}
                    </div>
                    <div>
                      <div className="font-bold text-[#182230] text-xs">
                        {isMeeting
                          ? `Meeting Return: ${(report as CellMeetingReport).meetingDate}`
                          : `Evangelism Outreach: ${(report as EvangelismReport).date}`}
                      </div>
                      <div className="text-[11px] text-[#667085] mt-0.5">
                        {isMeeting
                          ? `${(report as CellMeetingReport).attendance} Attended &bull; ${(report as CellMeetingReport).members} Members`
                          : `+${(report as EvangelismReport).conversions} Souls &bull; ${(report as EvangelismReport).location}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Status Dot */}
                    <div>
                      {isApproved && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-[#23845B]">
                          <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                          Approved
                        </span>
                      )}
                      {!isApproved && !isNeedsCorrection && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-[#D99A32]">
                          <span className="w-2 h-2 rounded-full bg-[#D99A32]" />
                          Awaiting Review
                        </span>
                      )}
                      {isNeedsCorrection && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-[#C74646]">
                          <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                          Needs Correction
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-[#667085] hidden sm:block">
                      {new Date(report.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
