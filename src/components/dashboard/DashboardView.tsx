import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AnalyticsService } from '../../services/analyticsService';
import { ReportService } from '../../services/reportService';
import { SettingsService, DEFAULT_SETTINGS } from '../../services/settingsService';
import { FollowUpService } from '../../services/followUpService';
import { DashboardStats, CellReport, SystemSettings } from '../../types';
import { getCurrentDeadlineInfo } from '../../utils/deadlineUtil';
import { StatCard, ActionStatCard } from './StatCard';
import { WeeklyPerformanceChart } from './WeeklyPerformanceChart';
import { SoulsWonChart } from './SoulsWonChart';
import { RecentReportsTable } from './RecentReportsTable';
import { ComplianceTracker } from './ComplianceTracker';
import { SettingsModal } from '../settings/SettingsModal';
import {
  Users,
  UserCheck,
  Flame,
  UserPlus,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  FileCheck2,
  AlertCircle,
  Compass,
  BookOpen,
  Target,
  Edit3,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToForm: () => void;
  onNavigateToEvangelismForm?: () => void;
  onNavigateToReports: () => void;
  onNavigateToRegional: () => void;
  onNavigateToFollowUps?: () => void;
  onSelectReport: (report: CellReport) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToForm,
  onNavigateToEvangelismForm,
  onNavigateToReports,
  onNavigateToRegional,
  onNavigateToFollowUps,
  onSelectReport,
}) => {
  const { currentRole, currentUser, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [trends, setTrends] = useState<any[]>([]);
  const [regionalStats, setRegionalStats] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<CellReport[]>([]);
  const [activeCell, setActiveCell] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVisionExpanded, setIsVisionExpanded] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [dashStats, trendData, regData, allReports, allCells, systemSettings] =
        await Promise.all([
          AnalyticsService.getDashboardStats(currentRole, currentUser.region_id, currentUser.cell_id),
          AnalyticsService.getWeeklyTrends(currentRole, currentUser.region_id, currentUser.cell_id),
          AnalyticsService.getRegionalPerformance(),
          ReportService.getReports(),
          ReportService.getCells(),
          SettingsService.getSettings(),
        ]);

      setStats(dashStats);
      setTrends(trendData);
      setRegionalStats(regData);
      setSettings(systemSettings);

      if (currentUser.cell_id) {
        const matched = allCells.find(c => c.id === currentUser.cell_id);
        if (matched) setActiveCell(matched);
      }

      let filtered = allReports;
      if (!isAdmin && currentUser.cell_id) {
        filtered = allReports.filter(r => r.cell_id === currentUser.cell_id);
      }
      setRecentReports(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentRole, currentUser, isAdmin]);

  if (isLoading || !stats) {
    return (
      <div className="py-24 text-center text-xs text-slate-400 font-medium">
        Loading FNI CELLS CONNECT ministry intelligence...
      </div>
    );
  }

  const soulTarget = settings.annualSoulWinningTarget || 5000;
  const targetPercent = Math.min(100, Math.round((stats.soulsWon / soulTarget) * 100));

  return (
    <div className="space-y-6">
      {/* Top Header Row with FNI Brand Subtitle and Pill Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-navy-950">
              FNI CELLS CONNECT
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-navy-100 text-navy-900 border border-navy-200">
              {isAdmin ? 'Church Leadership' : 'Tutor Portal'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cell Document Optimisation & Reporting Platform • {isAdmin ? 'Organisation Oversight' : currentUser.cell_name || 'Fellowship Cell'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder={isAdmin ? 'Search reports or leaders...' : 'Search submissions...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-56 sm:w-64 text-xs font-medium rounded-full border-0 bg-white px-4 py-2.5 pl-9 text-slate-800 placeholder-slate-400 shadow-card focus:ring-2 focus:ring-navy-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      {/* Vision & Mission Expandable Card */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 text-white rounded-3xl p-5 sm:p-6 shadow-card border border-navy-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/20 text-gold-400 flex items-center justify-center font-bold shrink-0 border border-gold-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
                  Kingdom Vision & Mission
                </span>
                <span className="text-[10px] text-slate-400">• Forerunners Network International</span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5 line-clamp-1 max-w-2xl font-medium">
                {settings.vision}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {isAdmin && (
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-gold-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-navy-700"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Configure Targets</span>
              </button>
            )}
            <button
              onClick={() => setIsVisionExpanded(prev => !prev)}
              className="p-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 transition-colors"
              title={isVisionExpanded ? 'Collapse statement' : 'View full statement'}
            >
              {isVisionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isVisionExpanded && (
          <div className="mt-4 pt-4 border-t border-navy-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in duration-150">
            <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-navy-800">
              <span className="text-[11px] font-bold text-gold-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" /> Vision
              </span>
              <p className="text-slate-300 leading-relaxed">{settings.vision}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-navy-800">
              <span className="text-[11px] font-bold text-gold-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Mission
              </span>
              <p className="text-slate-300 leading-relaxed">{settings.mission}</p>
            </div>
          </div>
        )}
      </div>

      {/* Mandatory Weekly Deadline Banner */}
      {!isAdmin && (
        <div
          className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card ${
            getCurrentDeadlineInfo().isPastDeadline
              ? 'bg-amber-50/90 border-amber-200 text-amber-950'
              : 'bg-white text-navy-950 border-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                getCurrentDeadlineInfo().isPastDeadline
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-navy-900 text-gold-400'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-2">
                <span>Weekly Return Deadline: Sunday 6:00 PM Ghana Time (Africa/Accra, UTC+0)</span>
                {getCurrentDeadlineInfo().isPastDeadline ? (
                  <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold">
                    LATE WINDOW
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                    ON-TIME WINDOW
                  </span>
                )}
              </div>
              <div
                className={`text-[11px] mt-0.5 ${
                  getCurrentDeadlineInfo().isPastDeadline ? 'text-amber-800' : 'text-slate-400'
                }`}
              >
                {getCurrentDeadlineInfo().timeRemainingText} • Authoritative deadline enforced via trusted server timestamp.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              onClick={onNavigateToForm}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-navy-900 text-white hover:bg-navy-950 transition-colors shadow-sm"
            >
              Submit Meeting Report
            </button>
            {onNavigateToEvangelismForm && (
              <button
                onClick={onNavigateToEvangelismForm}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gold-500 text-navy-950 hover:bg-gold-400 transition-colors shadow-sm"
              >
                Submit Evangelism
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin Notice for Missing Submissions */}
      {isAdmin && stats.missingCellsCount > 0 && (
        <div className="p-4 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-950">
                {stats.missingCellsCount} Registered Fellowship Cell{stats.missingCellsCount > 1 ? 's' : ''} Missing Current Returns
              </div>
              <div className="text-[11px] text-rose-800 mt-0.5">
                Sunday 6:00 PM Ghana Time cutoff passed. Inspect unsubmitted units and dispatch notifications.
              </div>
            </div>
          </div>
          <button
            onClick={onNavigateToReports}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-900 text-white hover:bg-rose-950 transition-all shrink-0 self-start sm:self-auto"
          >
            Inspect Missing Cells
          </button>
        </div>
      )}

      {/* CENTRAL CHURCH PROGRESS: Annual Soul-Winning Target & Evangelism Reach */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Annual Soul-Winning Target Progress Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-navy-950">Annual Soul-Winning Target</h3>
                  <p className="text-[11px] text-slate-400">Verified conversions recorded across all evangelism reports</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-navy-950 bg-slate-100 px-3 py-1 rounded-full">
                {targetPercent}% Achieved
              </span>
            </div>

            {/* Metric Comparison */}
            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-navy-950">{stats.soulsWon}</span>
              <span className="text-xs font-semibold text-slate-400">
                of <strong className="text-slate-700">{soulTarget.toLocaleString()}</strong> target souls
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-gold-500 to-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, targetPercent)}%` }}
              />
            </div>
          </div>

          {/* Sub metrics */}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Conversions</span>
              <span className="text-sm font-bold text-navy-950">+{stats.soulsWon}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">People Reached</span>
              <span className="text-sm font-bold text-navy-950">{stats.peopleReached}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Contacts Captured</span>
              <span className="text-sm font-bold text-navy-950">{stats.contactsCaptured}</span>
            </div>
          </div>
        </div>

        {/* Central Follow-Up Summary Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-navy-50 text-navy-900 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-navy-950">Follow-Up Pipeline</h3>
                  <p className="text-[11px] text-slate-400">Discipleship & soul preservation</p>
                </div>
              </div>
              {onNavigateToFollowUps && (
                <button
                  onClick={onNavigateToFollowUps}
                  className="text-[11px] text-navy-900 font-bold hover:underline"
                >
                  Manage
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium">Total Contacts Captured</span>
                <span className="font-bold text-navy-950">{stats.contactsCaptured}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-amber-50/70 rounded-xl">
                <span className="text-amber-800 font-medium">Requiring Follow-Up</span>
                <span className="font-bold text-amber-700">{stats.outstandingFollowUps}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 rounded-xl">
                <span className="text-emerald-800 font-medium">Completed / Joined</span>
                <span className="font-bold text-emerald-700">{stats.followUpsCompleted}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 block text-center">
              Targeting 100% discipleship integration for every outreach soul
            </span>
          </div>
        </div>
      </div>

      {/* Reporting Overview & Workflow Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Submitted
          </span>
          <div className="text-xl font-extrabold text-navy-950 mt-1">{stats.reportsSubmitted}</div>
          <span className="text-[10px] text-slate-400">Total reports filed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
            Awaiting Review
          </span>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{stats.awaitingReviewCount}</div>
          <span className="text-[10px] text-slate-400">Needs administrative review</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
            Approved
          </span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{stats.approvedReports}</div>
          <span className="text-[10px] text-slate-400">Verified & confirmed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
            Needs Correction
          </span>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{stats.needsCorrectionCount}</div>
          <span className="text-[10px] text-slate-400">Returned to tutors</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Missing Units
          </span>
          <div className="text-xl font-extrabold text-slate-700 mt-1">{stats.missingCellsCount}</div>
          <span className="text-[10px] text-slate-400">Pending return</span>
        </div>
      </div>

      {/* Horizontal Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={isAdmin ? 'Total Registered Cells' : 'Cell Attendance'}
          value={isAdmin ? stats.totalCells : stats.totalAttendance}
          subtitle={isAdmin ? `${stats.activeCellLeaders} Active leaders` : `${stats.totalAttendance} total turnout`}
          icon={<Users className="w-5 h-5 text-gold-400" />}
          isActive={true}
        />

        <StatCard
          title={isAdmin ? 'Total Turnout' : 'Weekly Visitors'}
          value={isAdmin ? stats.totalAttendance : stats.visitorsRecorded}
          subtitle={isAdmin ? `${stats.visitorsRecorded} visitors recorded` : `${stats.visitorsRecorded} first-timers recorded`}
          icon={isAdmin ? <TrendingUp className="w-5 h-5 text-gold-400" /> : <UserCheck className="w-5 h-5 text-gold-400" />}
          isActive={false}
        />

        <StatCard
          title={isAdmin ? 'Late Submissions' : 'Souls Won'}
          value={isAdmin ? `${stats.lateReports} late` : `+${stats.soulsWon}`}
          subtitle={isAdmin ? 'Past Sunday 6 PM cutoff' : 'Confirmed evangelism harvest'}
          icon={isAdmin ? <AlertTriangle className="w-5 h-5 text-gold-400" /> : <Flame className="w-5 h-5 text-gold-400" />}
          isActive={false}
        />

        <ActionStatCard
          label={isAdmin ? 'Unified Review Queue' : 'Submit Return'}
          sublabel="Week 45 Cycle"
          onClick={isAdmin ? onNavigateToReports : onNavigateToForm}
        />
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
          <WeeklyPerformanceChart
            data={trends}
            title={isAdmin ? 'Weekly Attendance & Visitors (All Units)' : `${currentUser.cell_name || activeCell?.name || 'My Cell'} Attendance Trend`}
          />
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
          <SoulsWonChart
            data={trends}
            title={isAdmin ? 'Evangelism Harvest Across Cycles' : `${currentUser.cell_name || activeCell?.name || 'My Cell'} Souls Won Harvest`}
          />
        </div>
      </div>

      {/* Split Grid: Recent Reports & Compliance / Cell Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
          <RecentReportsTable
            reports={recentReports}
            onSelectReport={onSelectReport}
            onViewAll={onNavigateToReports}
          />
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
          {isAdmin ? (
            <ComplianceTracker
              regionalStats={regionalStats}
              onViewRegional={onNavigateToRegional}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cell Unit Info
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                  {activeCell ? 'Registered' : 'Awaiting Registration'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">Meeting Schedule</span>
                  <span className="font-bold text-navy-950">
                    {activeCell?.meeting_day ? `Every ${activeCell.meeting_day} @ ${activeCell.meeting_time}` : 'Schedule not yet configured'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">Venue Address</span>
                  <span className="font-medium text-slate-700">
                    {activeCell?.venue_address || 'Venue address pending'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">Current Cycle Status</span>
                  <span className={`font-bold ${recentReports[0] ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {recentReports[0] ? `Report Filed (${recentReports[0].status.toUpperCase()})` : 'Awaiting submission for Week 45'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onNavigateToForm}
                    className="py-2.5 rounded-xl bg-navy-900 text-white font-bold text-xs hover:bg-navy-950 transition-colors shadow-sm"
                  >
                    Meeting Report
                  </button>
                  {onNavigateToEvangelismForm && (
                    <button
                      onClick={onNavigateToEvangelismForm}
                      className="py-2.5 rounded-xl bg-gold-500 text-navy-950 font-bold text-xs hover:bg-gold-400 transition-colors shadow-sm"
                    >
                      Evangelism
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSettingsUpdated={updated => {
          setSettings(updated);
          loadDashboardData();
        }}
      />
    </div>
  );
};
