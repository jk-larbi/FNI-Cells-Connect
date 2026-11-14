import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { PushNotificationService } from '../../services/pushNotificationService';
import { AnalyticsService } from '../../services/analyticsService';
import { ReportService } from '../../services/reportService';
import { SettingsService, DEFAULT_SETTINGS } from '../../services/settingsService';
import { SoulTargetService } from '../../services/soulTargetService';
import { DashboardStats, SystemSettings, UnifiedReportItem, SoulTargetMetrics, CellPerformanceRecord } from '../../types';
import { getCurrentDeadlineInfo, formatLiveSubmissionTracking } from '../../utils/deadlineUtil';
import {
  Users,
  Building,
  FileCheck,
  Flame,
  UserPlus,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  AlertTriangle,
  Compass,
  Target,
  Edit3,
  TrendingUp,
  UserCheck,
  ArrowRight,
  Eye,
  AlertCircle,
  FileText,
  DollarSign,
  MessageSquare,
  BookOpen,
  Settings,
  Bell,
  ShieldCheck,
  Check,
  X,
  Wheat,
  Cross,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToTab: (tab: any) => void;
  onOpenReport?: (reportId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToTab,
  onOpenReport,
}) => {
  const { currentRole, currentUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [recentQueue, setRecentQueue] = useState<UnifiedReportItem[]>([]);
  const [cellPerformance, setCellPerformance] = useState<CellPerformanceRecord[]>([]);
  const [soulMetrics, setSoulMetrics] = useState<SoulTargetMetrics | null>(null);
  const [showSoulModal, setShowSoulModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [soulMetricsUpdatedAt, setSoulMetricsUpdatedAt] = useState<Date | null>(null);

  // Push Notifications state
  const { isPushEnabled, isPushSupported, requestPushPermission, dispatchNotification } = useNotifications();
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);
  const [isRequestingPush, setIsRequestingPush] = useState(false);

  const handleEnablePush = async () => {
    setIsRequestingPush(true);
    try {
      const res = await requestPushPermission();
      if (res.success) {
        setPushStatusMsg('Push notifications successfully enabled for administrator device!');
      } else {
        setPushStatusMsg(res.error || 'Failed to enable push notifications');
      }
    } finally {
      setIsRequestingPush(false);
    }
  };

  const handleTestPush = () => {
    const success = PushNotificationService.showLocalNotification('FNI CELLS CONNECT Admin Alert', {
      body: 'Verified: Leadership push notifications active for tutor report submissions!',
      tag: 'admin-test-' + Date.now(),
      data: { targetTab: 'report-review' },
    });
    if (success) {
      setPushStatusMsg('Test push notification delivered to your system!');
    } else {
      setPushStatusMsg('Push notification blocked by browser permissions.');
    }
  };

  // Settings modal inline state
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editVision, setEditVision] = useState('');
  const [editMission, setEditMission] = useState('');
  const [editTarget, setEditTarget] = useState(5000);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dashStats, systemSettings, queue, sMetrics, cPerf] = await Promise.all([
        AnalyticsService.getDashboardStats('admin'),
        SettingsService.getSettings(),
        ReportService.getUnifiedReviewQueue(),
        SoulTargetService.calculateMetrics(),
        AnalyticsService.getCellPerformance(),
      ]);
      setStats(dashStats);
      setSettings(systemSettings);
      setRecentQueue(queue.slice(0, 7));
      setSoulMetrics(sMetrics);
      setSoulMetricsUpdatedAt(new Date());
      setCellPerformance(cPerf);
      setEditVision(systemSettings.vision);
      setEditMission(systemSettings.mission);
      setEditTarget(systemSettings.annualSoulWinningTarget);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Live Soul Target Tracking Subscription (Real-time updates from cells and evangelism)
    const unsubSoul = SoulTargetService.subscribeToLiveSoulTracking(liveM => {
      setSoulMetrics(liveM);
      setSoulMetricsUpdatedAt(new Date());
      setStats(prev => prev ? {
        ...prev,
        soulsWon: liveM.verifiedSoulsWon,
      } : prev);
      AnalyticsService.getCellPerformance().then(setCellPerformance);
    });

    return () => {
      unsubSoul();
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await SettingsService.updateSettings({
      vision: editVision,
      mission: editMission,
      annualSoulWinningTarget: editTarget,
    });
    setSettings(prev => ({
      ...prev,
      vision: editVision,
      mission: editMission,
      annualSoulWinningTarget: editTarget,
    }));
    setIsEditingSettings(false);
  };

  if (isLoading || !stats) {
    return (
      <div className="py-24 text-center text-xs text-[#667085] font-medium">
        Loading FNI CELLS CONNECT ministry intelligence...
      </div>
    );
  }

  const soulTarget = soulMetrics?.annualTarget || settings.annualSoulWinningTarget || 5000;
  const currentSoulsWon = soulMetrics ? soulMetrics.verifiedSoulsWon : stats.soulsWon;
  const targetPercent = Math.min(100, Math.round((currentSoulsWon / soulTarget) * 100));
  const remainingTarget = Math.max(0, soulTarget - currentSoulsWon);
  const today = new Date();
  const currentMonthName = today.toLocaleString('en', { month: 'short' });
  const currentWeekLabel = `Week ${Math.ceil(today.getDate() / 7)} (${currentMonthName})`;
  const currentQuarterLabel = `Q${Math.floor(today.getMonth() / 3) + 1} ${soulMetrics?.year ?? today.getFullYear()}`;
  const currentWeekSouls = soulMetrics?.weeklyProgress.find(item => item.week === currentWeekLabel)?.souls ?? 0;
  const currentMonthSouls = soulMetrics?.monthlyProgress.find(item => item.month === currentMonthName)?.souls ?? 0;
  const currentQuarterSouls = soulMetrics?.quarterlyProgress.find(item => item.quarter === currentQuarterLabel)?.souls ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
              Administrator Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#142B4A] text-[#C6A45A] text-[10px] font-bold uppercase tracking-wider">
              Leadership
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">
            Centralised oversight of fellowship cells, weekly reporting, evangelism outreach, and discipleship.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('report-review')}
            className="px-4 py-2.5 rounded-xl bg-[#142B4A] text-white text-xs font-extrabold hover:bg-[#203D63] transition-colors shadow-sm flex items-center gap-2 cursor-pointer border border-[#C6A45A]/30"
          >
            <FileCheck className="w-4 h-4 text-[#C6A45A]" />
            <span>Accept / Decline Reports</span>
            {stats.awaitingReviewCount > 0 ? (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-[#D99A32] text-white text-[10px] font-bold animate-pulse">
                {stats.awaitingReviewCount} Awaiting Decision
              </span>
            ) : (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-700/60 text-white text-[10px] font-semibold">
                All Cleared
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Vision, Mission & Annual Soul-Winning Target Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Vision & Mission Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E3E8EF] p-5 shadow-sm relative">
          <div className="flex items-center justify-between mb-3 border-b border-[#E3E8EF] pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#C6A45A]" aria-label="FNI Kingdom Vision and Mission" strokeWidth={2} />
              <h2 className="text-sm font-bold text-[#142B4A] uppercase tracking-wider">
                FNI Kingdom Vision & Mission
              </h2>
            </div>
            <button
              onClick={() => setIsEditingSettings(true)}
              className="text-xs font-semibold text-[#142B4A] hover:text-[#203D63] flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
              <div className="text-[11px] font-bold text-[#142B4A] uppercase tracking-wider mb-1">
                Our Vision
              </div>
              <p className="text-xs text-[#182230] leading-relaxed">
                "{settings.vision}"
              </p>
            </div>

            <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
              <div className="text-[11px] font-bold text-[#142B4A] uppercase tracking-wider mb-1">
                Our Mission
              </div>
              <p className="text-xs text-[#182230] leading-relaxed">
                "{settings.mission}"
              </p>
            </div>
          </div>
        </div>

        {/* Annual Soul-Winning Target Progress Card */}
        <div onClick={() => setShowSoulModal(true)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowSoulModal(true); } }} className="bg-white rounded-2xl border border-[#E3E8EF] p-5 shadow-sm flex flex-col justify-between hover:border-[#C6A45A] hover:shadow-md cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-[#C6A45A]/40" title="Open the audited annual soul-winning progress and cell contributions">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 border-b border-[#E3E8EF] pb-3"><div className="flex items-center gap-2 min-w-0"><Wheat className="w-4 h-4 text-[#C6A45A] shrink-0" aria-label="Kingdom harvest target" /><h2 className="text-sm font-bold text-[#142B4A] uppercase tracking-wider">Soul-Winning Target</h2></div><span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live updates</span></div>
            <div className="flex items-end justify-between gap-3"><div><span className="block text-[10px] font-bold uppercase tracking-wider text-[#667085]">Approved conversions</span><div className="text-3xl font-black leading-tight text-[#142B4A] tabular-nums">{currentSoulsWon.toLocaleString()}</div><span className="text-[11px] text-[#667085]">of {soulTarget.toLocaleString()} annual goal</span></div><div className="text-right shrink-0"><div className="text-2xl font-black text-[#23845B] tabular-nums">{targetPercent}%</div><span className="text-[10px] font-semibold text-[#667085]">achieved</span></div></div>
            <div className="mt-3 w-full bg-[#E9EDF2] rounded-full h-3 overflow-hidden" role="progressbar" aria-label="Annual soul-winning target progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={targetPercent}><div className="bg-[#23845B] h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${targetPercent}%` }} /></div>
            <div className="grid grid-cols-2 gap-2 mt-4"><div className="rounded-xl bg-[#F5F7FA] border border-[#E3E8EF] p-3"><span className="block text-[10px] text-[#667085] font-semibold">Remaining</span><strong className="block text-lg text-[#142B4A] tabular-nums">{remainingTarget.toLocaleString()}</strong></div><div className="rounded-xl bg-amber-50 border border-amber-200 p-3"><span className="block text-[10px] text-amber-800 font-semibold">Awaiting approval</span><strong className="block text-lg text-amber-900 tabular-nums">{(soulMetrics?.pendingSouls ?? 0).toLocaleString()}</strong></div></div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]"><div className="flex items-center justify-between gap-2 rounded-lg border border-[#E3E8EF] px-3 py-2"><span className="text-[#667085]">Outreach conversions</span><strong className="text-[#182230] tabular-nums">+{(soulMetrics?.soulsFromEvangelism ?? 0).toLocaleString()}</strong></div><div className="flex items-center justify-between gap-2 rounded-lg border border-[#E3E8EF] px-3 py-2"><span className="text-[#667085]">First-time visitors</span><strong className="text-[#182230] tabular-nums">+{(soulMetrics?.firstTimersFromCells ?? 0).toLocaleString()}</strong></div></div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E3E8EF] flex items-center justify-between gap-3 text-[11px]"><div className="min-w-0"><span className="block text-[#142B4A] font-bold group-hover:underline">View full breakdown →</span><span className="block text-[10px] text-[#667085] mt-0.5">{soulMetricsUpdatedAt ? `Updated ${soulMetricsUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for live data'}</span></div><button onClick={e => { e.stopPropagation(); onNavigateToTab('analytics'); }} className="font-bold text-[#142B4A] hover:underline flex items-center gap-1 shrink-0">Analytics <ArrowRight className="w-3 h-3" /></button></div>
        </div>
      </div>

      {/* 13 REAL METRICS GRID (Specified in Prompt Section 5) */}
      <div>
        <h3 className="text-xs font-bold text-[#667085] uppercase tracking-wider mb-3">
          Key Performance Indicators & Ministry Analytics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
          {/* 1. Total Registered Cells */}
          <div
            onClick={() => onNavigateToTab('cell-management')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">Total Cells</div>
            <div className="text-xl font-black text-[#182230] mt-1">{stats.totalCells}</div>
            <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">Directory Active</div>
          </div>

          {/* 2. Total Registered Tutors */}
          <div
            onClick={() => onNavigateToTab('cell-leaders')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">Registered Tutors</div>
            <div className="text-xl font-black text-[#182230] mt-1">{stats.activeCellLeaders}</div>
            <div className="text-[10px] text-[#667085] font-semibold mt-0.5">Assigned Leaders</div>
          </div>

          {/* 3. Meeting Reports Submitted */}
          <div
            onClick={() => onNavigateToTab('report-review')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">Meeting Reports</div>
            <div className="text-xl font-black text-[#182230] mt-1">{stats.meetingReportsSubmitted || 0}</div>
            <div className="text-[10px] text-[#667085] font-semibold mt-0.5">Weekly Returns</div>
          </div>

          {/* 4. Evangelism Reports Submitted */}
          <div
            onClick={() => onNavigateToTab('evangelism')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">Evangelism Reports</div>
            <div className="text-xl font-black text-[#182230] mt-1">{stats.evangelismReportsSubmitted || 0}</div>
            <div className="text-[10px] text-[#C6A45A] font-semibold mt-0.5">Outreach Records</div>
          </div>

          {/* 5. Reports Awaiting Review */}
          <div
            onClick={() => onNavigateToTab('report-review')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#D99A32] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">Awaiting Review</div>
            <div className="text-xl font-black text-[#D99A32] mt-1">{stats.awaitingReviewCount}</div>
            <div className="text-[10px] text-[#D99A32] font-semibold mt-0.5">Requires Action</div>
          </div>

          {/* 6. Approved Reports */}
          <div
            onClick={() => onNavigateToTab('report-review')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#23845B] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">Approved Reports</div>
            <div className="text-xl font-black text-[#23845B] mt-1">{stats.approvedReports}</div>
            <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">Verified Returns</div>
          </div>

          {/* 7. Reports Needing Correction */}
          <div
            onClick={() => onNavigateToTab('report-review')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#C74646] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">Needs Correction</div>
            <div className="text-xl font-black text-[#C74646] mt-1">{stats.needsCorrectionCount}</div>
            <div className="text-[10px] text-[#C74646] font-semibold mt-0.5">Returned to Tutors</div>
          </div>

          {/* 8. Cells with Missing Weekly Reports */}
          <div
            onClick={() => onNavigateToTab('cell-management')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#C74646] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">Missing Reports</div>
            <div className="text-xl font-black text-[#C74646] mt-1">{stats.missingCellsCount}</div>
            <div className="text-[10px] text-[#C74646] font-semibold mt-0.5">Cells Unreported</div>
          </div>

          {/* 9. Total People Reached */}
          <div
            onClick={() => onNavigateToTab('evangelism')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">People Reached</div>
            <div className="text-xl font-black text-[#182230] mt-1">{stats.peopleReached}</div>
            <div className="text-[10px] text-[#667085] font-semibold mt-0.5">Gospel Witnessed</div>
          </div>

          {/* 10. Total Conversions Recorded */}
          <div
            onClick={() => onNavigateToTab('evangelism')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#23845B] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">Conversions Recorded</div>
            <div className="text-xl font-black text-[#23845B] mt-1">{stats.soulsWon}</div>
            <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">Souls Won for Christ</div>
          </div>

          {/* 11. Interested in Joining Ministry */}
          <div
            onClick={() => onNavigateToTab('follow-ups')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">Interested in Joining</div>
            <div className="text-xl font-black text-[#182230] mt-1">{stats.interestedInMinistry || 0}</div>
            <div className="text-[10px] text-[#C6A45A] font-semibold mt-0.5">Potential Members</div>
          </div>

          {/* 12. Pending & Completed Follow-ups */}
          <div
            onClick={() => onNavigateToTab('follow-ups')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085] truncate">Follow-up Pipeline</div>
            <div className="text-xl font-black text-[#182230] mt-1">
              {stats.followUpsCompleted} / {stats.contactsCaptured}
            </div>
            <div className="text-[10px] text-[#667085] font-semibold mt-0.5">
              {stats.outstandingFollowUps} Pending
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Leadership Alerts & Device Push Notification Readiness */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#142B4A]/5 border border-[#142B4A]/10 flex items-center justify-center text-[#C6A45A] shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#142B4A]">
                Real-Time Administrator Push Notifications
              </span>
              {isPushEnabled ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active on this device
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                  Permission Required
                </span>
              )}
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              {isPushEnabled
                ? 'Your device is actively registered to receive immediate push notifications whenever tutors submit weekly returns or message leadership.'
                : 'Enable device push alerts so you are notified immediately when cell tutors file returns, even when this browser tab is closed.'}
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
              <span>Test Push Alert</span>
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

      {/* Administrative Operations & Operational Hubs */}
      <div>
        <h3 className="text-xs font-bold text-[#667085] uppercase tracking-wider mb-3">
          Ministry Systems & Operational Hubs
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Finance / Offering Aggregation */}
          <div
            onClick={() => onNavigateToTab('finance')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#C6A45A] hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-50 border border-[#C6A45A]/20 flex items-center justify-center text-[#C6A45A] shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-gold-700 transition-colors">
                  Offering Aggregation
                </div>
                <div className="text-[11px] text-[#667085]">
                  Weekly & Annual Ministry Totals
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
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#142B4A] shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-[#203D63] transition-colors">
                  Communications Hub
                </div>
                <div className="text-[11px] text-[#667085]">
                  1-on-1 Chats & Community
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
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#23845B] shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-emerald-700 transition-colors">
                  Teaching Outlines
                </div>
                <div className="text-[11px] text-[#667085]">
                  Publish Weekly Discipleship Notes
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#142B4A] group-hover:translate-x-1 transition-all" />
          </div>

          {/* System Settings */}
          <div
            onClick={() => onNavigateToTab('settings')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#667085] shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#142B4A] text-xs group-hover:text-[#142B4A] transition-colors">
                  System Settings
                </div>
                <div className="text-[11px] text-[#667085]">
                  Rules, Deadlines & Audit Trail
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#142B4A] group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>

      {/* CELLS BREAKDOWN & COMPLIANCE (Live Tracking For Registered Cells) */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#182230]">
                Cells Breakdown & Reporting Compliance
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Cells
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Live submission status, meeting attendance, and harvest returns across all registered fellowship cells.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('analytics')}
            className="text-xs font-bold text-[#142B4A] hover:text-[#203D63] flex items-center gap-1 transition-colors"
          >
            <span>Full Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">
                  <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                </th>
                <th className="py-3 px-4">FELLOWSHIP CELL & TUTOR</th>
                <th className="py-3 px-4">ATTENDANCE</th>
                <th className="py-3 px-4">SOULS WON</th>
                <th className="py-3 px-4">OFFERINGS (GHS)</th>
                <th className="py-3 px-4">REPORTING COMPLIANCE</th>
                <th className="py-3 px-5 text-right">LATEST STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {cellPerformance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#667085]">
                    <Building className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No fellowship cells registered yet.</p>
                    <p className="text-[11px] text-[#667085] mt-0.5">
                      Only cells that sign up are tracked here. As soon as a tutor registers, their cell and returns appear live.
                    </p>
                  </td>
                </tr>
              ) : (
                cellPerformance.map(cell => (
                  <tr
                    key={cell.id}
                    onClick={() => onNavigateToTab('cell-management')}
                    className="hover:bg-[#F5F7FA] transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-5 text-center">
                      <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                          {cell.name
                            .split(' ')
                            .map(n => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold text-[#182230] leading-tight">
                            {cell.name}
                          </div>
                          <div className="text-[11px] text-[#667085] mt-0.5">
                            Tutor: <span className="font-semibold text-[#142B4A]">{cell.leaderName}</span>
                            {cell.code && <span className="ml-1.5 text-slate-400">({cell.code})</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#182230] text-sm">
                        {cell.totalAttendance}
                      </span>
                      <div className="text-[10px] text-[#667085]">
                        {cell.meetingReportsCount} return{cell.meetingReportsCount === 1 ? '' : 's'}
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#23845B] text-sm">
                        +{cell.soulsWon}
                      </span>
                      <div className="text-[10px] text-[#667085]">
                        {cell.peopleReached} reached
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#182230] text-sm">
                        GHS {cell.offeringsGhs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div className="text-[10px] text-[#667085]">Remitted</div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#182230] text-sm">
                        {cell.compliance}%
                      </span>
                      <div className="w-24 bg-[#E3E8EF] rounded-full h-1.5 mt-1">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cell.compliance >= 80
                              ? 'bg-[#23845B]'
                              : cell.compliance >= 50
                              ? 'bg-[#D99A32]'
                              : 'bg-[#C74646]'
                          }`}
                          style={{ width: `${cell.compliance}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap text-right">
                      {cell.status === 'On Track' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#23845B]">
                          <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                          On Track
                        </span>
                      ) : cell.status === 'Awaiting Review' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#D99A32]">
                          <span className="w-2 h-2 rounded-full bg-[#D99A32]" />
                          Awaiting Review
                        </span>
                      ) : cell.status === 'Needs Correction' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                          <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                          Needs Correction
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                          <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                          Missing Return
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile Cells Breakdown Cards (Visible on Phones only, hidden on md+) */}
        <div className="block md:hidden divide-y divide-[#E3E8EF]">
          {cellPerformance.length === 0 ? (
            <div className="py-10 px-4 text-center text-[#667085]">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F7FA] text-[#C6A45A] flex items-center justify-center mx-auto mb-2 border border-[#E3E8EF]">
                <Building className="w-6 h-6 text-[#C6A45A]" />
              </div>
              <p className="text-xs font-bold text-[#142B4A]">No registered cells found.</p>
              <p className="text-[11px] text-[#667085] mt-0.5">Cells appear here dynamically as tutors register.</p>
            </div>
          ) : (
            cellPerformance.map(cell => (
              <div
                key={cell.id}
                onClick={() => onNavigateToTab('cell-management')}
                className="p-4 bg-white hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {cell.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs text-[#182230] truncate">{cell.name}</h4>
                      <p className="text-[11px] text-[#667085] truncate">
                        Leader: {cell.leaderName} {cell.leaderPhone ? `(${cell.leaderPhone})` : ''}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                    cell.status === 'On Track' ? 'bg-emerald-50 text-[#23845B] border border-emerald-200' :
                    cell.status === 'Awaiting Review' ? 'bg-amber-50 text-[#D99A32] border border-amber-200' :
                    'bg-rose-50 text-[#C74646] border border-rose-200'
                  }`}>
                    {cell.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="p-2 bg-[#F8FAFC] rounded-xl border border-[#E3E8EF]">
                    <span className="text-[10px] text-[#667085] font-semibold block">Attendance</span>
                    <span className="font-extrabold text-[#182230] text-sm">{cell.totalAttendance}</span>
                  </div>
                  <div className="p-2 bg-[#F8FAFC] rounded-xl border border-[#E3E8EF]">
                    <span className="text-[10px] text-[#667085] font-semibold block">Souls Won</span>
                    <span className="font-extrabold text-[#23845B] text-sm">+{cell.soulsWon}</span>
                  </div>
                  <div className="p-2 bg-[#F8FAFC] rounded-xl border border-[#E3E8EF]">
                    <span className="text-[10px] text-[#667085] font-semibold block">Offerings</span>
                    <span className="font-extrabold text-[#182230] text-sm">GHS {cell.offeringsGhs.toLocaleString()}</span>
                  </div>
                  <div className="p-2 bg-[#F8FAFC] rounded-xl border border-[#E3E8EF]">
                    <span className="text-[10px] text-[#667085] font-semibold block">Compliance</span>
                    <span className={`font-extrabold text-sm ${cell.compliance >= 80 ? 'text-[#23845B]' : cell.compliance >= 50 ? 'text-[#D99A32]' : 'text-[#C74646]'}`}>
                      {cell.compliance}%
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* RECENT SUBMISSIONS TABLE (Styled directly after the Reference Image!) */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        {/* Table Header Section */}
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#182230]">
              Recent Submissions — Accept / Decline Queue ({recentQueue.length})
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Weekly fellowship returns and evangelism reports. Directly accept (approve) or decline (return for correction).
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('report-review')}
            className="px-3 py-1.5 rounded-xl bg-[#FAF6EE] text-[#142B4A] border border-[#C6A45A]/30 text-xs font-bold hover:bg-[#F5F0E4] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Open Accept / Decline Directorate</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A]" />
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">
                  <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                </th>
                <th className="py-3 px-4">NAME & CELL</th>
                <th className="py-3 px-4">REPORT TYPE</th>
                <th className="py-3 px-4">KEY METRIC</th>
                <th className="py-3 px-4">REVIEW STATUS</th>
                <th className="py-3 px-4">SUBMISSION TIME (LIVE)</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {recentQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5F7FA] text-[#C6A45A] flex items-center justify-center mx-auto mb-2.5 border border-[#E3E8EF] shadow-2xs">
                      <FileCheck className="w-6 h-6 text-[#C6A45A]" />
                    </div>
                    <p className="text-xs font-bold text-[#142B4A]">No reports submitted yet.</p>
                    <p className="text-[11px] text-[#667085] mt-0.5">
                      When tutors submit weekly returns, they will appear here in the review stream.
                    </p>
                  </td>
                </tr>
              ) : (
                recentQueue.map(item => {
                  const isNeedsCorrection =
                    item.status === 'Needs Correction' || item.status === 'needs_revision';
                  const isApproved = item.status === 'Approved' || item.status === 'approved';
                  const isNewlySubmitted =
                    item.status === 'Newly Submitted' || item.status === 'submitted' || item.status === 'under_review';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        if (onOpenReport) {
                          onOpenReport(item.id);
                        } else {
                          onNavigateToTab('report-review');
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isNeedsCorrection
                          ? 'bg-[#FFF5F5] border-l-4 border-[#C74646]' // Exact reference image highlight row!
                          : 'hover:bg-[#F5F7FA]'
                      }`}
                    >
                      {/* Selection indicator circle */}
                      <td className="py-4 px-5 text-center">
                        <div className="w-4 h-4 rounded-full border border-[#CBD5E1] hover:border-[#142B4A] mx-auto" />
                      </td>

                      {/* Name & Avatar Column */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                            {item.tutorName
                              ? item.tutorName
                                  .split(' ')
                                  .map(n => n[0])
                                  .slice(0, 2)
                                  .join('')
                              : 'FN'}
                          </div>
                          <div>
                            <div className="font-bold text-[#182230] leading-tight">
                              {item.tutorName || 'Cell Leader'}
                            </div>
                            <div className="text-[11px] text-[#667085] mt-0.5">
                              {item.cellName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Report Type */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#182230]">
                          {item.reportType === 'meeting' ? 'Cell Meeting' : 'Evangelism'}
                        </span>
                        <div className="text-[11px] text-[#667085]">
                          {item.reportType === 'meeting'
                            ? (item as any).meetingDate
                            : (item as any).date}
                        </div>
                      </td>

                      {/* Key Metric Column */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {item.reportType === 'meeting' ? (
                          <div>
                            <div className="font-bold text-[#182230]">
                              {(item as any).attendance} Attendance
                            </div>
                            <div className="text-[11px] text-[#667085]">
                              {(item as any).members} Total Members
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-[#23845B]">
                              +{(item as any).conversions} Souls Won
                            </div>
                            <div className="text-[11px] text-[#667085]">
                              {(item as any).peopleSpokenTo} Reached
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Status indicator with colored dot (matches reference image!) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                            <span className="font-medium text-[#23845B]">Approved</span>
                          </span>
                        )}
                        {isNewlySubmitted && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#D99A32]" />
                            <span className="font-medium text-[#D99A32]">Awaiting Review</span>
                          </span>
                        )}
                        {isNeedsCorrection && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                            <span className="font-medium text-[#C74646]">Needs Correction</span>
                          </span>
                        )}
                      </td>

                      {/* Submission Time & Live Tracking */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {(() => {
                          const liveTime = formatLiveSubmissionTracking(item.submittedAt, liveTicker);
                          return (
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-[#142B4A]">
                                <Clock className="w-3.5 h-3.5 text-[#C6A45A]" />
                                <span>{liveTime.timeFormatted} GMT</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                                  liveTime.isJustNow ? 'bg-emerald-100 text-[#23845B] animate-pulse' : 'bg-[#F0F5FA] text-[#142B4A] border border-[#E3E8EF]'
                                }`}>
                                  {liveTime.isJustNow && <span className="w-1.5 h-1.5 rounded-full bg-[#23845B] animate-ping" />}
                                  {liveTime.relativeTime}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#667085] mt-0.5">
                                {liveTime.dateFormatted} &bull;{' '}
                                <span className={item.late ? 'text-[#C74646] font-bold' : 'text-[#23845B] font-bold'}>
                                  {item.late ? 'Late Return' : 'On-Time'}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Action Buttons: Accept / Decline / Inspect */}
                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isApproved && (
                            <button
                              onClick={async e => {
                                e.stopPropagation();
                                await ReportService.reviewReport(
                                  item.id,
                                  item.reportType,
                                  'Approved',
                                  'Accepted by Administrator from Dashboard',
                                  currentUser.id,
                                  currentUser.full_name
                                );
                                dispatchNotification(
                                  `Report Accepted: ${item.cellName}`,
                                  `Your ${item.reportType === 'meeting' ? 'Cell Meeting' : 'Evangelism'} report has been accepted.`,
                                  'report_approved',
                                  'in_app'
                                );
                                // Refresh dashboard
                                const [updatedStats, updatedQueue] = await Promise.all([
                                  AnalyticsService.getDashboardStats('admin'),
                                  ReportService.getUnifiedReviewQueue(),
                                ]);
                                setStats(updatedStats);
                                setRecentQueue(updatedQueue.slice(0, 5));
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-[#23845B] hover:bg-emerald-100 inline-flex items-center gap-1 text-[11px] font-bold transition-colors shadow-2xs cursor-pointer border border-emerald-200"
                              title="Accept Report"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>
                          )}
                          {!isNeedsCorrection && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (onOpenReport) {
                                  onOpenReport(item.id);
                                } else {
                                  onNavigateToTab('report-review');
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-50 text-[#C74646] hover:bg-rose-100 inline-flex items-center gap-1 text-[11px] font-bold transition-colors shadow-2xs cursor-pointer border border-rose-200"
                              title="Decline / Return for Correction"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (onOpenReport) {
                                onOpenReport(item.id);
                              } else {
                                onNavigateToTab('report-review');
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            title="Read complete report before approving"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-[#C6A45A]" />
                            <span>Read Report</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile Submissions Cards (Visible on Phones only, hidden on md+) */}
        <div className="block md:hidden divide-y divide-[#E3E8EF]">
          {recentQueue.length === 0 ? (
            <div className="py-10 px-4 text-center text-[#667085]">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F7FA] text-[#C6A45A] flex items-center justify-center mx-auto mb-2 border border-[#E3E8EF]">
                <FileCheck className="w-6 h-6 text-[#C6A45A]" />
              </div>
              <p className="text-xs font-bold text-[#142B4A]">No reports submitted yet.</p>
              <p className="text-[11px] text-[#667085] mt-0.5">When tutors submit weekly returns, they will appear here.</p>
            </div>
          ) : (
            recentQueue.map(item => {
              const isNeedsCorrection = item.status === 'Needs Correction' || item.status === 'needs_revision';
              const isApproved = item.status === 'Approved' || item.status === 'approved';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onOpenReport) onOpenReport(item.id);
                    else onNavigateToTab('report-review');
                  }}
                  className={`p-4 transition-colors cursor-pointer ${
                    isNeedsCorrection ? 'bg-[#FFF5F5] border-l-4 border-[#C74646]' : 'bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {item.tutorName ? item.tutorName.split(' ').map(n => n[0]).slice(0, 2).join('') : 'TL'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs text-[#182230] truncate">{item.tutorName}</h4>
                        <p className="text-[11px] text-[#667085] truncate">{item.cellName}</p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                      isApproved ? 'bg-emerald-50 text-[#23845B] border border-emerald-200' :
                      isNeedsCorrection ? 'bg-rose-50 text-[#C74646] border border-rose-200' :
                      'bg-amber-50 text-[#D99A32] border border-amber-200'
                    }`}>
                      {isApproved ? 'Accepted' : isNeedsCorrection ? 'Declined' : 'Pending'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#667085] bg-[#F5F7FA] px-2.5 py-1.5 rounded-xl border border-[#E3E8EF]">
                    <span className="font-bold text-[#142B4A] flex items-center gap-1">
                      {item.reportType === 'meeting' ? <FileText className="w-3 h-3 text-[#142B4A]" /> : <Flame className="w-3 h-3 text-[#C6A45A]" />}
                      {item.reportType === 'meeting' ? 'Cell Meeting' : 'Evangelism'}
                    </span>
                    <span className={item.late ? 'text-[#C74646] font-bold' : 'text-[#23845B] font-semibold'}>
                      {item.late ? 'Late' : 'On-Time'}
                    </span>
                  </div>

                  <div className="mt-2.5 p-2 bg-[#F8FAFC] rounded-xl border border-[#E3E8EF] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#667085] font-semibold">Key Metric:</span>
                    <span className="font-extrabold text-[#182230]">
                      {item.reportType === 'meeting'
                        ? `${item.attendance} Attended • ${item.members} Members`
                        : `+${item.conversions} Souls • ${item.peopleSpokenTo} Reached`}
                    </span>
                  </div>

                  {/* Touch Action Bar */}
                  <div className="mt-3 pt-2.5 border-t border-[#E3E8EF] flex items-center gap-2">
                    {!isApproved && (
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          await ReportService.reviewReport(
                            item.id,
                            item.reportType,
                            'Approved',
                            'Accepted by Administrator from Dashboard',
                            currentUser.id,
                            currentUser.full_name
                          );
                          dispatchNotification(
                            `Report Accepted: ${item.cellName}`,
                            `Your ${item.reportType === 'meeting' ? 'Cell Meeting' : 'Evangelism'} report has been accepted.`,
                            'report_approved',
                            'in_app'
                          );
                          const [updatedStats, updatedQueue] = await Promise.all([
                            AnalyticsService.getDashboardStats('admin'),
                            ReportService.getUnifiedReviewQueue(),
                          ]);
                          setStats(updatedStats);
                          setRecentQueue(updatedQueue.slice(0, 5));
                        }}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-50 text-[#23845B] hover:bg-emerald-100 font-extrabold text-xs flex items-center justify-center gap-1 border border-emerald-200 shadow-2xs cursor-pointer min-h-[40px]"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    )}

                    {!isNeedsCorrection && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (onOpenReport) onOpenReport(item.id);
                          else onNavigateToTab('report-review');
                        }}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-rose-50 text-[#C74646] hover:bg-rose-100 font-extrabold text-xs flex items-center justify-center gap-1 border border-rose-200 shadow-2xs cursor-pointer min-h-[40px]"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    )}

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (onOpenReport) onOpenReport(item.id);
                        else onNavigateToTab('report-review');
                      }}
                      className="py-2 px-3 rounded-xl bg-[#142B4A] text-white hover:bg-[#203D63] font-bold text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer min-h-[40px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Feature 6: Soul-Winning Target Interactive Breakdown Modal */}
      {showSoulModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gold-50 text-gold-600 border border-gold-200 flex items-center justify-center">
                  <Wheat className="w-5 h-5 text-gold-600" aria-label="Kingdom harvest target" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-950">Annual Soul-Winning Target Breakdown</h3>
                  <p className="text-[11px] text-slate-500">Real-time audited contributions by fellowship cell & timeframe</p>
                </div>
              </div>
              <button
                onClick={() => setShowSoulModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-navy-950 flex items-center justify-center text-xs"
              >
                &times;
              </button>
            </div>

            {/* Overall Progress Summary */}
            <div className="p-4 bg-navy-950 text-white rounded-2xl border border-navy-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gold-400 uppercase tracking-wider block">Verified Souls Harvested</span>
                  <div className="text-3xl font-black text-white mt-0.5">
                    {soulMetrics?.verifiedSoulsWon ?? stats.soulsWon} <span className="text-sm font-semibold text-slate-400">/ {soulTarget.toLocaleString()} Goal</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-gold-400">{soulMetrics?.percentageAchieved ?? targetPercent}%</div>
                  <span className="text-[10px] text-slate-300">Achieved</span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-navy-900 rounded-full h-3 overflow-hidden border border-navy-800">
                <div
                  className="bg-gold-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${soulMetrics?.percentageAchieved ?? targetPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-300 pt-1">
                <span>Remaining: <strong className="text-white">{soulMetrics?.remainingSouls ?? remainingTarget} souls</strong></span>
                <span>Annual Cycle: <strong>{soulMetrics?.year ?? new Date().getFullYear()}</strong></span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1"><div className="rounded-xl bg-white/10 border border-white/10 p-2.5"><span className="block text-[10px] text-slate-300">Awaiting report approval</span><strong className="text-lg text-amber-300 tabular-nums">{(soulMetrics?.pendingSouls ?? 0).toLocaleString()}</strong></div><div className="rounded-xl bg-white/10 border border-white/10 p-2.5"><span className="block text-[10px] text-slate-300">First-time cell visitors</span><strong className="text-lg text-white tabular-nums">{(soulMetrics?.firstTimersFromCells ?? 0).toLocaleString()}</strong></div></div>
            </div>

            {/* Time Breakdown Cards */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">This Week</span>
                <div className="text-lg font-black text-navy-950 mt-1">
                  +{currentWeekSouls}
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold">Active harvest</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">This Month</span>
                <div className="text-lg font-black text-navy-950 mt-1">
                  +{currentMonthSouls}
                </div>
                <span className="text-[10px] text-slate-500">Current month</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">This Quarter</span>
                <div className="text-lg font-black text-navy-950 mt-1">
                  +{currentQuarterSouls}
                </div>
                <span className="text-[10px] text-gold-700 font-semibold">Q{Math.floor(new Date().getMonth() / 3) + 1} Harvest</span>
              </div>
            </div>

            {/* Cell Contributions Ranking */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy-950 mb-2">
                Contribution by Fellowship Cell / Team
              </h4>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {soulMetrics && soulMetrics.cellContributions.length > 0 ? (
                  soulMetrics.cellContributions.map(c => (
                    <div key={c.cellId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-navy-950 block">{c.cellName}</span>
                        <span className="text-[10px] text-slate-500">
                          Approved outreach conversions: +{c.fromEvangelism || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-navy-900">+{c.souls} souls</span>
                        <span className="text-[10px] text-gold-700 bg-gold-50 px-1.5 py-0.5 rounded font-bold">
                          {c.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                    No individual cell contributions logged yet for this period.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="italic">Only approved outreach conversions count toward the goal. First-time visitors are tracked separately.</span>
              <button
                onClick={() => setShowSoulModal(false)}
                className="px-4 py-1.5 bg-navy-950 text-white rounded-xl font-bold text-xs hover:bg-navy-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Modal for Editing Vision, Mission & Annual Target */}
      {isEditingSettings && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-[#E3E8EF] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF]">
              <h3 className="text-base font-bold text-[#142B4A]">
                Update FNI Vision, Mission & Target
              </h3>
              <button
                onClick={() => setIsEditingSettings(false)}
                className="text-xs text-[#667085] hover:text-[#182230]"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#182230] mb-1">FNI Vision</label>
                <textarea
                  rows={3}
                  value={editVision}
                  onChange={e => setEditVision(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#182230] mb-1">FNI Mission</label>
                <textarea
                  rows={3}
                  value={editMission}
                  onChange={e => setEditMission(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#182230] mb-1">
                  Annual Soul-Winning Target
                </label>
                <input
                  type="number"
                  value={editTarget}
                  onChange={e => setEditTarget(Number(e.target.value))}
                  min={1}
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingSettings(false)}
                  className="px-4 py-2 rounded-xl text-[#667085] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#142B4A] text-white font-bold hover:bg-[#203D63]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
