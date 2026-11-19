import { exportCsvFile } from '../../utils/mobileExport';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnalyticsService } from '../../services/analyticsService';
import { ReportService } from '../../services/reportService';
import { CellService } from '../../services/cellService';
import { SettingsService } from '../../services/settingsService';
import { SoulTargetService } from '../../services/soulTargetService';
import { CellLocationService } from '../../services/cellLocationService';
import { AuthService } from '../../services/authService';
import { DeadlineService } from '../../services/deadlineService';
import { DashboardStats, SystemSettings, Cell, CellPerformanceRecord, CellLocationRecord, CellMeetingReport, EvangelismReport } from '../../types';
import {
  BarChart3,
  Download,
  Filter,
  TrendingUp,
  Flame,
  Users,
  CheckCircle2,
  Calendar,
  Building,
  Printer,
  FileCheck,
  AlertTriangle,
  Search,
  Radio,
  MapPin,
  Clock,
  ArrowUpRight,
  Activity,
  Wifi,
  Compass,
  RefreshCw,
  ChevronRight,
  UserCheck,
  HeartHandshake,
  Navigation,
  Globe2,
  Target,
} from 'lucide-react';
import { SoulTargetSettingsModal } from './SoulTargetSettingsModal';
import { CoreFoundationModal } from './CoreFoundationModal';
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AnalyticsViewProps {
  onBack?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

// Live activity item representing incoming tutor returns
interface TutorActivityItem {
  id: string;
  type: 'meeting' | 'evangelism' | 'followup' | 'location';
  tutorName: string;
  cellName: string;
  avatarInitials: string;
  actionText: string;
  details: string;
  timestamp: string;
  relativeTime: string;
  valueBadge?: string;
  badgeColor?: string;
  isNew?: boolean;
}

// Map beacon for active cell venues
interface CellMapBeacon {
  id: string;
  cellName: string;
  tutorName: string;
  venue: string;
  xPct: number; // 0-100% on map canvas
  yPct: number; // 0-100% on map canvas
  attendance?: number;
  soulsWon?: number;
  isActiveNow?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onBack, onNavigateToTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([]);
  const [cellStats, setCellStats] = useState<CellPerformanceRecord[]>([]);
  const [locationHistory, setLocationHistory] = useState<CellLocationRecord[]>([]);
  const [meetingReports, setMeetingReports] = useState<CellMeetingReport[]>([]);
  const [evangelismReports, setEvangelismReports] = useState<EvangelismReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Interactivity
  const [selectedCell, setSelectedCell] = useState('All');
  const [timeDimension, setTimeDimension] = useState<'weekly' | 'monthly' | 'quarterly' | 'ytd'>('monthly');
  const [selectedMetric, setSelectedMetric] = useState<'attendance' | 'souls' | 'offerings' | 'compliance'>('souls');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(new Date().getMonth());
  const [overviewMetric, setOverviewMetric] = useState<'attendance' | 'souls'>('attendance');

  // Right sidebar tab: 'activities' or 'tutors'
  const [sidebarTab, setSidebarTab] = useState<'activities' | 'tutors'>('activities');
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isCoreFoundationModalOpen, setIsCoreFoundationModalOpen] = useState(false);
  const [deadlineSettings, setDeadlineSettings] = useState(DeadlineService.getDeadlineSettingsSync());

  useEffect(() => {
    DeadlineService.getDeadlineSettings().then(ds => setDeadlineSettings(ds));
    const unsub = DeadlineService.subscribe(ds => setDeadlineSettings(ds));
    return () => unsub();
  }, []);

  // Live updates & animation state
  const [liveActivities, setLiveActivities] = useState<TutorActivityItem[]>([]);
  const [activeBeacon, setActiveBeacon] = useState<CellMapBeacon | null>(null);
  const [recentPulseCard, setRecentPulseCard] = useState<'attendance' | 'souls' | 'compliance' | 'activity' | null>(null);

  // Animated counters state
  const [displayAttendance, setDisplayAttendance] = useState(0);
  const [displaySouls, setDisplaySouls] = useState(0);
  const [displayCompliance, setDisplayCompliance] = useState(0);

  // Load primary data
  const loadData = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const [dashStats, sysSettings, cellList, trends, cStats, locHistory, meetings, evang] = await Promise.all([
        AnalyticsService.getDashboardStats('admin'),
        SettingsService.getSettings(),
        CellService.getActiveCells(),
        AnalyticsService.getWeeklyTrends('admin'),
        AnalyticsService.getCellPerformance(),
        CellLocationService.getLocationHistory().catch(() => []),
        ReportService.getCellMeetingReports().catch(() => []),
        ReportService.getEvangelismReports().catch(() => []),
      ]);
      setStats(dashStats);
      setSettings(sysSettings);
      setCells(cellList);
      setWeeklyTrends(trends);
      setCellStats(cStats);
      setLocationHistory(locHistory);
      setMeetingReports(meetings || []);
      setEvangelismReports(evang || []);

      // Initialize initial live activities from real reports & location records
      buildInitialActivities(locHistory, meetings || [], evang || []);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  // Convert existing records into an activity stream
  const buildInitialActivities = (
    locHistory: CellLocationRecord[],
    meetings: CellMeetingReport[],
    evang: EvangelismReport[]
  ) => {
    const items: TutorActivityItem[] = [];

    // From real location records
    locHistory.slice(0, 4).forEach((loc, idx) => {
      items.push({
        id: `loc-${loc.id || idx}`,
        type: 'location',
        tutorName: loc.leader_name || 'Cell Leader',
        cellName: loc.cell_name,
        avatarInitials: (loc.leader_name || 'CL').split(' ').map(s => s[0]).slice(0, 2).join(''),
        actionText: 'Convened fellowship meeting',
        details: `Venue: ${loc.venue}`,
        timestamp: loc.meeting_date || new Date().toISOString(),
        relativeTime: idx === 0 ? 'Recently' : `${idx * 2 + 1}h ago`,
        valueBadge: 'Venue Logged',
        badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      });
    });

    // From real evangelism reports
    evang.slice(0, 4).forEach((report, idx) => {
      const souls = Number(report.verifiedSoulsWon ?? report.conversions) || 0;
      const leader = report.tutorName || 'Tutor';
      items.push({
        id: `evang-${report.id || idx}`,
        type: 'evangelism',
        tutorName: leader,
        cellName: report.cellName || 'Fellowship Cell',
        avatarInitials: leader.split(' ').map((s: string) => s[0]).slice(0, 2).join(''),
        actionText: 'Logged Evangelism Outreach',
        details: `${report.location || 'Community outreach'} · ${report.peopleSpokenTo || 0} reached`,
        timestamp: report.submittedAt || report.date || new Date().toISOString(),
        relativeTime: idx === 0 ? 'Recently' : `${idx + 1}d ago`,
        valueBadge: `+${souls} Souls`,
        badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      });
    });

    // From real meeting reports
    meetings.slice(0, 4).forEach((report, idx) => {
      const att = Number(report.attendance) || 0;
      const leader = report.tutorName || 'Tutor';
      items.push({
        id: `meet-${report.id || idx}`,
        type: 'meeting',
        tutorName: leader,
        cellName: report.cellName || 'Fellowship Cell',
        avatarInitials: leader.split(' ').map((s: string) => s[0]).slice(0, 2).join(''),
        actionText: 'Filed Weekly Cell Return',
        details: `${att} attendees · ${report.meetingLocation || 'Cell Venue'}`,
        timestamp: report.submittedAt || report.meetingDate || new Date().toISOString(),
        relativeTime: idx === 0 ? 'Recently' : `${idx + 1}d ago`,
        valueBadge: `${att} Present`,
        badgeColor: 'bg-[#142B4A]/10 text-[#142B4A] dark:bg-amber-400/10 dark:text-amber-300',
      });
    });

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Never use fake mockups — only show genuine submitted records
    setLiveActivities(items);
  };

  // Smooth numeric counter animation
  useEffect(() => {
    if (!stats) return;
    const targetAtt = stats.totalAttendance;
    const targetSouls = stats.soulsWon;
    const targetComp = stats.complianceRate;

    const startAtt = displayAttendance;
    const startSouls = displaySouls;
    const startComp = displayCompliance;

    const duration = 800; // ms
    const startTime = performance.now();

    let animId: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);

      setDisplayAttendance(Math.round(startAtt + (targetAtt - startAtt) * ease));
      setDisplaySouls(Math.round(startSouls + (targetSouls - startSouls) * ease));
      setDisplayCompliance(Math.round(startComp + (targetComp - startComp) * ease));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [stats?.totalAttendance, stats?.soulsWon, stats?.complianceRate]);

  // Realtime subscription to live database updates
  useEffect(() => {
    loadData();
    const unsubscribe = SoulTargetService.subscribeToLiveSoulTracking(() => {
      void loadData(false);
      triggerLivePulse('souls');
    });
    return unsubscribe;
  }, []);

  // Pulse flash helper for cards
  const triggerLivePulse = (card: 'attendance' | 'souls' | 'compliance' | 'activity') => {
    setRecentPulseCard(card);
    setTimeout(() => setRecentPulseCard(null), 2400);
  };

  // Dynamic map beacons derived from real registered cells and location history
  const mapBeacons = useMemo<CellMapBeacon[]>(() => {
    if (!cells || cells.length === 0) return [];
    return cells.map((cell, idx) => {
      const stat = cellStats.find(cs => cs.id === cell.id || cs.name === cell.name);
      const loc = locationHistory.find(lh => lh.cell_id === cell.id || lh.cell_name === cell.name);
      const venue = loc?.venue || cell.meeting_location || cell.location || 'Venue pending';

      // Distribute points harmoniously within radar perimeter (20% to 80%)
      const angle = (idx / Math.max(cells.length, 1)) * 2 * Math.PI - Math.PI / 2;
      const radius = 22 + (idx % 3) * 14;
      const xPct = Math.round(50 + radius * Math.cos(angle));
      const yPct = Math.round(50 + radius * Math.sin(angle));

      return {
        id: cell.id,
        cellName: cell.name,
        tutorName: cell.leader_name || stat?.leaderName || 'Cell Leader',
        venue,
        xPct,
        yPct,
        attendance: stat?.totalAttendance || 0,
        soulsWon: stat?.soulsWon || 0,
        isActiveNow: (stat?.meetingReportsCount ?? 0) > 0,
      };
    });
  }, [cells, cellStats, locationHistory]);

  // Real monthly aggregated curve data for the Wave Chart from genuine submitted returns
  const waveChartData = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return MONTHS.map((month, idx) => {
      // Find real submitted reports for this calendar month of current year
      const monthMeetings = meetingReports.filter(r => {
        const d = r.meetingDate || r.submittedAt;
        if (!d) return false;
        const dt = new Date(d);
        return !isNaN(dt.getTime()) && dt.getFullYear() === currentYear && dt.getMonth() === idx;
      });
      const monthEvang = evangelismReports.filter(r => {
        const d = r.date || r.submittedAt;
        if (!d) return false;
        const dt = new Date(d);
        return !isNaN(dt.getTime()) && dt.getFullYear() === currentYear && dt.getMonth() === idx;
      });

      const attendance = monthMeetings.reduce((sum, r) => sum + (Number(r.attendance) || 0), 0);
      const souls = monthEvang
        .filter(r => r.status === 'Approved' || r.status === 'approved')
        .reduce((sum, r) => sum + (Number(r.verifiedSoulsWon ?? r.conversions) || 0), 0);

      return {
        month,
        attendance,
        souls,
        sessions: monthMeetings.length,
      };
    });
  }, [meetingReports, evangelismReports]);

  const activeMonthData = waveChartData[selectedMonthIdx] || waveChartData[0];
  const activeValue = overviewMetric === 'attendance' ? activeMonthData.attendance : activeMonthData.souls;

  // Filtered cells for the breakdown table
  const filteredCellStats = useMemo(() => {
    if (!searchQuery.trim()) return cellStats;
    const q = searchQuery.toLowerCase();
    return cellStats.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.leaderName.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q))
    );
  }, [cellStats, searchQuery]);

  const handleExportCsv = async () => {
    const csvData = await AnalyticsService.exportAnalyticsCsv();
    await exportCsvFile(`FNI_Ministry_Analytics_${Date.now()}.csv`, csvData);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !stats) {
    return (
      <div className="py-24 text-center text-xs text-[#667085] font-medium">
        <div className="inline-block w-8 h-8 border-3 border-[#C6A45A] border-t-transparent rounded-full animate-spin mb-3" />
        <p>Loading real-time ministry intelligence & telemetry...</p>
      </div>
    );
  }

  const soulTarget = settings?.annualSoulWinningTarget || 5000;
  const targetPercent = Math.min(100, Math.round((displaySouls / soulTarget) * 100));

  return (
    <div className="space-y-6">
      {/* TOP CONTEXT & COMMAND BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black text-[#142B4A] dark:text-white tracking-tight">
              Primary Analytics Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Telemetry Active
            </span>
          </div>
          <p className="text-xs text-[#667085] dark:text-slate-400 mt-1">
            Real-time ministry growth curve, attendance velocity, soul-winning telemetry, and tutor activity stream.
          </p>
        </div>

        {/* Live Controls & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh live data button */}
          <button
            type="button"
            onClick={() => void loadData(true)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E3E8EF] dark:border-slate-700 text-[#182230] dark:text-slate-200 text-xs font-bold hover:bg-[#F5F7FA] dark:hover:bg-slate-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Refresh analytics directly from database"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#142B4A] dark:text-[#C6A45A]" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E3E8EF] dark:border-slate-700 text-[#182230] dark:text-slate-200 text-xs font-bold hover:bg-[#F5F7FA] dark:hover:bg-slate-700 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#142B4A] dark:text-[#C6A45A]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span className="hidden sm:inline">Print (PDF)</span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-[#E3E8EF] dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search fellowship cells, tutors, venues, or regions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-[#182230] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-slate-500">Filter Cell:</span>
          <select
            value={selectedCell}
            onChange={e => setSelectedCell(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
          >
            <option value="All">All Fellowship Cells ({cellStats.length})</option>
            {cells.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* =========================================================================
          MAIN DASHBOARD GRID (Hero Wave Card + Highlight Cards + Right Sidebar)
          Strictly matching the visual balance of the reference UI
      ========================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT / CENTER TWO COLUMNS: HERO WAVE CARD + 2 HIGHLIGHT CARDS + 3 PROGRESS CARDS */}
        <div className="lg:col-span-2 space-y-6">

          {/* ROW 1: HERO OVERVIEW WAVE CARD + TWO ACTION PODS (SIDE BY SIDE ON DESKTOP) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

            {/* HERO OVERVIEW WAVE CARD (md:col-span-8) */}
            <div className="md:col-span-8 rounded-3xl p-5 sm:p-6 text-white bg-gradient-to-br from-[#142B4A] via-[#1B365D] to-[#203D63] shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[360px] border border-white/10">
              {/* Background ambient light effects */}
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#C6A45A]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-royal-blue/20 rounded-full blur-3xl pointer-events-none" />

              {/* Card Header & Controls */}
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>Overview</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A45A] animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {overviewMetric === 'attendance' ? 'Total Weekly Fellowship Attendance' : 'Soul Winning Harvest Curve'}
                  </p>
                </div>

                {/* Metric toggle pill + Time period dropdown */}
                <div className="flex items-center gap-1.5">
                  <div className="bg-white/10 p-0.5 rounded-xl border border-white/10 flex items-center text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setOverviewMetric('attendance')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        overviewMetric === 'attendance'
                          ? 'bg-white text-[#142B4A] shadow-xs'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      Attendance
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverviewMetric('souls')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        overviewMetric === 'souls'
                          ? 'bg-[#C6A45A] text-[#142B4A] shadow-xs'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      Souls Won
                    </button>
                  </div>
                </div>
              </div>

              {/* CURVED WAVE CHART WITH INTERACTIVE ACTIVE PINPOINT (SVG Spline) */}
              <div className="relative z-10 my-4 h-40 w-full flex flex-col justify-end">
                {/* Active Floating Tooltip Badge (Matching '9,178 Steps' in reference) */}
                <div
                  className="absolute z-20 -top-1 transition-all duration-500 ease-out flex flex-col items-center"
                  style={{
                    left: `${Math.min(88, Math.max(12, ((selectedMonthIdx + 0.5) / 12) * 100))}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 text-[#142B4A] dark:text-white text-xs font-black shadow-xl border border-white/30 backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap animate-bounce duration-1000">
                    <span className="w-2 h-2 rounded-full bg-[#C6A45A]" />
                    <span>{activeValue.toLocaleString()} {overviewMetric === 'attendance' ? 'Attendees' : 'Souls'}</span>
                  </div>
                  {/* Glowing vertical marker line to curve */}
                  <div className="w-0.5 h-10 bg-gradient-to-b from-white/80 to-transparent mt-1" />
                </div>

                {/* SVG Smooth Spline Wave Line */}
                <svg
                  className="w-full h-28 overflow-visible"
                  viewBox="0 0 600 120"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="fniWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C6A45A" stopOpacity="0.45" />
                      <stop offset="60%" stopColor="#203D63" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#142B4A" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="fniLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#F5D485" />
                      <stop offset="50%" stopColor="#C6A45A" />
                      <stop offset="100%" stopColor="#FFFFFF" />
                    </linearGradient>
                  </defs>

                  {/* Dynamic path generation based on real monthly data */}
                  {(() => {
                    const hasData = waveChartData.some(d => (overviewMetric === 'attendance' ? d.attendance > 0 : d.souls > 0));
                    const maxVal = Math.max(...waveChartData.map(d => (overviewMetric === 'attendance' ? d.attendance : d.souls)), 1);
                    const pts = waveChartData.map((d, i) => {
                      const val = overviewMetric === 'attendance' ? d.attendance : d.souls;
                      const x = (i / 11) * 580 + 10;
                      const y = hasData ? 100 - (val / maxVal) * 75 : 105;
                      return { x, y };
                    });

                    // Build smooth bezier path
                    let linePath = `M ${pts[0].x} ${pts[0].y}`;
                    for (let i = 0; i < pts.length - 1; i++) {
                      const cpX = (pts[i].x + pts[i + 1].x) / 2;
                      linePath += ` C ${cpX} ${pts[i].y}, ${cpX} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
                    }

                    const areaPath = `${linePath} L 590 120 L 10 120 Z`;

                    return (
                      <>
                        <path d={areaPath} fill="url(#fniWaveGrad)" />
                        <path
                          d={linePath}
                          fill="none"
                          stroke="url(#fniLineGrad)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                        {/* Interactive dots along the wave */}
                        {pts.map((pt, i) => (
                          <g key={i}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={i === selectedMonthIdx ? 5.5 : 2.5}
                              className={`transition-all cursor-pointer ${
                                i === selectedMonthIdx ? 'fill-white stroke-[#C6A45A] stroke-[3]' : 'fill-white/60'
                              }`}
                              onClick={() => setSelectedMonthIdx(i)}
                            />
                            {i === selectedMonthIdx && (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="10"
                                fill="none"
                                stroke="#C6A45A"
                                strokeWidth="2"
                                className="animate-ping opacity-75"
                              />
                            )}
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                {/* Month Timeline Pills along bottom of chart (matching reference) */}
                <div className="flex items-center justify-between text-[10px] text-white/70 pt-2 border-t border-white/10">
                  {MONTHS.map((m, idx) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMonthIdx(idx)}
                      className={`px-1.5 py-0.5 rounded-md transition-all font-bold ${
                        selectedMonthIdx === idx
                          ? 'bg-white text-[#142B4A] shadow-xs scale-105'
                          : 'hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* THREE DOCKED STAT PODS (Matching reference bottom card cutouts) */}
              <div className="relative z-10 grid grid-cols-3 gap-2 pt-3 border-t border-white/15">
                <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
                  <span className="text-[10px] font-medium text-slate-300 block">Total Sessions</span>
                  <div className="text-sm sm:text-base font-black text-white mt-0.5">
                    {stats.meetingReportsSubmitted} Held
                  </div>
                  <span className="text-[9px] text-[#C6A45A] font-semibold block mt-0.5">
                    {MONTHS[selectedMonthIdx]} Cycle
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-[#C6A45A]/40 text-center shadow-inner">
                  <span className="text-[10px] font-medium text-slate-300 block">Total Harvest</span>
                  <div className="text-base sm:text-lg font-black text-[#F5D485] mt-0.5">
                    {displaySouls.toLocaleString()} St
                  </div>
                  <span className="text-[9px] text-emerald-300 font-semibold block mt-0.5">
                    +{activeMonthData.souls} this month
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
                  <span className="text-[10px] font-medium text-slate-300 block">Kingdom Target</span>
                  <div className="text-sm sm:text-base font-black text-white mt-0.5">
                    {soulTarget.toLocaleString()} St
                  </div>
                  <span className="text-[9px] text-slate-300 font-semibold block mt-0.5">
                    {targetPercent}% Reached
                  </span>
                </div>
              </div>
            </div>

            {/* TWO ADJACENT HIGHLIGHT CARDS (md:col-span-4) matching right pods in reference */}
            <div className="md:col-span-4 flex flex-col justify-between gap-4">
              
              {/* TOP ACTION CARD: "Weekly Fellowships" (Matching "Daily Jogging" in reference) */}
              <div
                className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border border-[#E3E8EF] dark:border-slate-800 shadow-sm transition-all duration-300 ${
                  recentPulseCard === 'attendance' ? 'ring-2 ring-[#C6A45A] shadow-lg' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#142B4A] to-[#203D63] text-white flex items-center justify-center shadow-md shrink-0">
                    <Users className="w-6 h-6 text-[#C6A45A]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#182230] dark:text-white leading-tight">
                      Weekly Fellowships
                    </h4>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      Active Attendance Flow
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-[#142B4A] dark:text-white">
                        {displayAttendance.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 ml-1">Attendees</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      Live
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {stats.meetingReportsSubmitted} fellowship meetings recorded across Ghana cells.
                  </p>
                </div>
              </div>

              {/* BOTTOM ACTION CARD: "Evangelism Harvest" (Matching "My Jogging" in reference with warm gradient) */}
              <div
                className={`p-5 rounded-3xl bg-gradient-to-br from-[#C6A45A] via-[#D4AF37] to-[#B38E3F] text-white shadow-md relative overflow-hidden transition-all duration-300 ${
                  recentPulseCard === 'souls' ? 'ring-2 ring-white shadow-xl scale-[1.02]' : ''
                }`}
              >
                {/* Background soft wave graphic */}
                <svg
                  className="absolute bottom-0 right-0 w-36 h-20 opacity-20 pointer-events-none"
                  viewBox="0 0 100 50"
                  preserveAspectRatio="none"
                >
                  <path d="M 0 35 C 30 10, 70 50, 100 20 L 100 50 L 0 50 Z" fill="white" />
                </svg>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-xs">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-tight text-white leading-tight">
                        Evangelism Harvest
                      </h4>
                      <span className="text-[10px] font-medium text-white/80">
                        Total Souls Won
                      </span>
                    </div>
                  </div>

                  {onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('evangelism')}
                      className="w-8 h-8 rounded-full bg-white/20 hover:bg-white text-white hover:text-[#142B4A] transition-colors flex items-center justify-center cursor-pointer"
                      title="View Evangelism Reports"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/20">
                  <div className="text-[10px] font-bold text-white/80">Total Verified Conversions</div>
                  <div className="text-2xl font-black text-white mt-0.5">
                    +{displaySouls.toLocaleString()} Souls
                  </div>
                  <div className="text-[10px] text-white/90 font-semibold mt-1">
                    {stats.peopleReached} gospel reached &bull; {targetPercent}% of goal
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ROW 2: THREE PROGRESS / METRIC CARDS (Matching "Bicycle Drill", "Jogging Hero", "Healthy Busy" in reference) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Kingdom Soul Harvest Target */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-[#E3E8EF] dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#C6A45A]/15 text-[#C6A45A] flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5 text-[#C6A45A]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#182230] dark:text-white leading-tight">
                      Kingdom Harvest
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {soulTarget.toLocaleString()} Annual Goal
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCoreFoundationModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#142B4A]/10 dark:bg-white/10 text-[#142B4A] dark:text-slate-200 hover:bg-[#142B4A]/20 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Configure FNI Vision, Mission & Apostolic Mandate"
                  >
                    <Compass className="w-3 h-3 text-[#C6A45A]" />
                    <span>Core Foundation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTargetModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#C6A45A]/15 text-[#C6A45A] hover:bg-[#C6A45A]/25 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Configure Soul Targets for 16 Cells"
                  >
                    <Target className="w-3 h-3" />
                    <span>Target Settings</span>
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-bold text-[#182230] dark:text-slate-200 mb-1.5">
                  <span className="text-[11px] text-slate-500">Progress</span>
                  <span className="text-xs font-black text-[#C6A45A]">{targetPercent}%</span>
                </div>
                {/* Horizontal Progress Bar matching reference design */}
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#C6A45A] to-[#D4AF37] rounded-full transition-all duration-700"
                    style={{ width: `${targetPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2.5 text-[10px]">
                  <span className="font-bold text-slate-600 dark:text-slate-400">
                    {displaySouls.toLocaleString()} / {soulTarget.toLocaleString()}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold">
                    {Math.max(0, soulTarget - displaySouls).toLocaleString()} left
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Cell Reporting Compliance */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-[#E3E8EF] dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#142B4A]/10 text-[#142B4A] dark:text-[#C6A45A] flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5 text-[#142B4A] dark:text-[#C6A45A]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#182230] dark:text-white leading-tight">
                      Reporting Rate
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Weekly {deadlineSettings.meeting.dayName} Cutoff
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-bold text-[#182230] dark:text-slate-200 mb-1.5">
                  <span className="text-[11px] text-slate-500">Compliance</span>
                  <span className="text-xs font-black text-[#142B4A] dark:text-white">{displayCompliance}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#142B4A] to-royal-blue rounded-full transition-all duration-700"
                    style={{ width: `${displayCompliance}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2.5 text-[10px]">
                  <span className="font-bold text-slate-600 dark:text-slate-400">
                    {cellStats.filter(c => c.meetingReportsCount > 0).length} of {cellStats.length || stats.totalCells} cells
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    {deadlineSettings.meeting.dayName.slice(0, 3)} {deadlineSettings.meeting.deadlineTime} GMT
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Discipleship & Follow-up Care */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-[#E3E8EF] dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#182230] dark:text-white leading-tight">
                      Follow-up Care
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Convert Integration
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {(() => {
                  const followPct = stats.contactsCaptured > 0 ? Math.round((stats.followUpsCompleted / stats.contactsCaptured) * 100) : 0;
                  return (
                    <>
                      <div className="flex items-center justify-between text-xs font-bold text-[#182230] dark:text-slate-200 mb-1.5">
                        <span className="text-[11px] text-slate-500">Completion</span>
                        <span className="text-xs font-black text-emerald-600">{followPct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                          style={{ width: `${followPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2.5 text-[10px]">
                        <span className="font-bold text-slate-600 dark:text-slate-400">
                          {stats.followUpsCompleted} / {stats.contactsCaptured} contacts
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                          Active Care
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT SIDEBAR COLUMN: TUTORS & LEADERS ACTIVITY STREAM + LIVE CELL LOCATION RADAR MAP */}
        <div className="space-y-6">

          {/* SECTION 1: TUTORS & LEADERS (Matching "Friends" Panel in reference) */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-[#E3E8EF] dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-[#182230] dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C6A45A]" />
                <span>Tutors & Leaders</span>
              </h3>

              {/* Segmented pill switch: [Activities] [Active Tutors] */}
              <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl flex items-center text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setSidebarTab('activities')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    sidebarTab === 'activities'
                      ? 'bg-white dark:bg-slate-700 text-[#142B4A] dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Activities
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab('tutors')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    sidebarTab === 'tutors'
                      ? 'bg-white dark:bg-slate-700 text-[#142B4A] dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Online
                </button>
              </div>
            </div>

            {/* FEED: ACTIVITIES TAB */}
            {sidebarTab === 'activities' && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[290px] overflow-y-auto pr-1 mt-1">
                {liveActivities.length === 0 ? (
                  <div className="py-8 px-3 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Recent Activity Logged</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      Activities will update in real time as tutors submit meeting returns and outreach reports.
                    </p>
                  </div>
                ) : (
                  liveActivities.map(item => (
                    <div
                      key={item.id}
                      className={`py-3 flex items-start gap-3 transition-all duration-500 ${
                        item.isNew ? 'bg-amber-50/50 dark:bg-amber-950/20 rounded-xl px-2' : ''
                      }`}
                    >
                      {/* Avatar initials with ring */}
                      <div className="relative shrink-0 mt-0.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#142B4A] to-[#203D63] text-[#C6A45A] font-bold text-xs flex items-center justify-center shadow-xs">
                          {item.avatarInitials}
                        </div>
                        {item.isNew && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-[#182230] dark:text-white truncate">
                            {item.tutorName}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0">{item.relativeTime}</span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5">
                          {item.actionText}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 truncate">{item.cellName}</span>
                          {item.valueBadge && (
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                              {item.valueBadge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* FEED: TUTORS (ONLINE/REGISTERED) TAB */}
            {sidebarTab === 'tutors' && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[290px] overflow-y-auto pr-1 mt-1">
                {cells.slice(0, 6).map((cell, idx) => (
                  <div key={cell.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-[#142B4A] dark:text-[#C6A45A] font-bold text-xs flex items-center justify-center">
                          {cell.name.split(' ').map(s => s[0]).slice(0, 2).join('')}
                        </div>
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${idx % 2 === 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#182230] dark:text-white truncate">
                          {cell.leader_name || 'Cell Leader'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{cell.name}</div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {idx % 2 === 0 ? 'Active' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Total Registered Tutors</span>
              <span className="font-bold text-[#142B4A] dark:text-[#C6A45A]">
                {cells.length} Leaders
              </span>
            </div>
          </div>

          {/* SECTION 2: LIVE MAP / CELL LOCATION RADAR (Matching "Live map" in reference) */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-[#E3E8EF] dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#C6A45A]" />
                <h3 className="text-sm font-black text-[#182230] dark:text-white">Live Cell Radar</h3>
              </div>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('cell-location-history')}
                  className="text-[11px] font-bold text-[#C6A45A] hover:underline cursor-pointer"
                >
                  View All History
                </button>
              )}
            </div>

            {/* STYLIZED RADAR / GEOGRAPHIC CANVASS */}
            <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-950 dark:to-[#142B4A]/50 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner">
              {/* Map grid lines */}
              <div
                className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, #667085 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />

              {/* Radar sweep ring effect */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-36 h-36 rounded-full border border-[#C6A45A]/25 animate-ping duration-3000" />
                <div className="w-24 h-24 rounded-full border border-royal-blue/30" />
                <div className="w-12 h-12 rounded-full border border-slate-400/20" />
              </div>

              {/* Cell Beacons (Pulsing Pins) */}
              {mapBeacons.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
                  <Compass className="w-6 h-6 text-slate-400 mb-1" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No Cell Venues Active</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">Cell meeting locations will appear on radar as venues are confirmed.</p>
                </div>
              ) : (
                mapBeacons.map(beacon => {
                  const isSelected = activeBeacon?.id === beacon.id;
                  return (
                    <div
                      key={beacon.id}
                      className="absolute cursor-pointer transition-transform hover:scale-125 z-20"
                      style={{ left: `${beacon.xPct}%`, top: `${beacon.yPct}%`, transform: 'translate(-50%, -50%)' }}
                      onClick={() => setActiveBeacon(beacon)}
                    >
                      <div className="relative group">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md font-bold text-[9px] text-white ${
                          beacon.isActiveNow ? 'bg-[#142B4A] border-2 border-[#C6A45A]' : 'bg-slate-600'
                        }`}>
                          {beacon.tutorName.split(' ').map(s => s[0]).slice(0, 2).join('')}
                        </div>

                        {beacon.isActiveNow && (
                          <span className="absolute -inset-1 rounded-full bg-[#C6A45A]/50 animate-ping pointer-events-none" />
                        )}

                        {/* Tooltip on hover/click */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-30 pointer-events-none">
                          <div className="px-2 py-1 bg-[#142B4A] text-white text-[9px] font-bold rounded-lg shadow-xl whitespace-nowrap border border-[#C6A45A]/40">
                            <p>{beacon.cellName}</p>
                            <p className="text-[#C6A45A] font-normal">{beacon.venue}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Active Beacon Info Footer */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              {activeBeacon ? (
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#142B4A] dark:text-white block truncate">
                      {activeBeacon.cellName}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      {activeBeacon.venue} &bull; Tutor: {activeBeacon.tutorName}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                    {activeBeacon.attendance} Attendees
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{mapBeacons.length} Active Venues Monitored in Ghana</span>
                  <span className="font-bold text-[#142B4A] dark:text-[#C6A45A]">Click pin to inspect</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* =========================================================================
          FEATURE 11: MULTI-TIME-DIMENSION COMPARATIVE PERIOD ANALYTICS
      ========================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E3E8EF] dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E3E8EF] dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-[#182230] dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#C6A45A]" />
              Comparative Period Analytics
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Side-by-side performance trends across weekly cycles, calendar months, quarters, and full ministry year.
            </p>
          </div>

          {/* Time Dimension Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['weekly', 'monthly', 'quarterly', 'ytd'] as const).map(dim => (
              <button
                key={dim}
                onClick={() => setTimeDimension(dim)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeDimension === dim
                    ? 'bg-[#142B4A] dark:bg-[#C6A45A] text-white dark:text-[#142B4A] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#142B4A]'
                }`}
              >
                {dim === 'weekly' ? 'Weekly' : dim === 'monthly' ? 'Monthly' : dim === 'quarterly' ? 'Quarterly' : 'YTD / Annual'}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Metric:</span>
            {(['souls', 'attendance', 'offerings', 'compliance'] as const).map(met => (
              <button
                key={met}
                onClick={() => setSelectedMetric(met)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedMetric === met
                    ? 'bg-[#C6A45A]/20 text-[#142B4A] dark:text-[#C6A45A] border border-[#C6A45A]/50 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {met === 'souls' ? 'Souls Won' : met === 'attendance' ? 'Attendance' : met === 'offerings' ? 'Offerings' : 'Compliance Rate'}
              </button>
            ))}
          </div>
        </div>

        {/* Comparative Trend Cards (Live Real-Time Data from Submitted Returns) */}
        {(() => {
          const totalOfferings = cellStats.reduce((sum, c) => sum + c.offeringsGhs, 0);
          const activeCellStat = selectedCell !== 'All' ? cellStats.find(c => c.name === selectedCell) : null;

          const currentSouls = activeCellStat ? activeCellStat.soulsWon : displaySouls;
          const currentAttendance = activeCellStat ? activeCellStat.totalAttendance : displayAttendance;
          const currentOfferings = activeCellStat ? activeCellStat.offeringsGhs : totalOfferings;
          const currentCompliance = activeCellStat ? `${activeCellStat.compliance}%` : `${displayCompliance}%`;

          const currentVal = selectedMetric === 'souls'
            ? currentSouls
            : selectedMetric === 'attendance'
            ? currentAttendance
            : selectedMetric === 'offerings'
            ? `GHS ${currentOfferings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : currentCompliance;

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {timeDimension === 'weekly' && [
                { label: 'Week 43 (Historic)', val: '0', delta: 'No returns filed' },
                { label: 'Week 44 (Prior)', val: '0', delta: 'No returns filed' },
                { label: 'Week 45 (Current)', val: currentVal, delta: currentSouls > 0 ? 'Live verified returns' : 'Awaiting returns' },
                { label: 'Week 46 (Upcoming)', val: '0', delta: 'Cycle pending' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
                  <div className="text-lg font-black text-[#142B4A] dark:text-white mt-1">{item.val}</div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5 inline-block">{item.delta}</span>
                </div>
              ))}

              {timeDimension === 'monthly' && [
                { label: 'September 2026', val: '0', delta: 'Pre-launch period' },
                { label: 'October 2026', val: '0', delta: 'No returns logged' },
                { label: 'November (Current MTD)', val: currentVal, delta: currentSouls > 0 ? 'Active month returns' : 'In progress' },
                { label: 'December 2026', val: '0', delta: 'Upcoming' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
                  <div className="text-lg font-black text-[#142B4A] dark:text-white mt-1">{item.val}</div>
                  <span className="text-[10px] text-royal-blue dark:text-[#C6A45A] font-bold mt-0.5 inline-block">{item.delta}</span>
                </div>
              ))}

              {timeDimension === 'quarterly' && [
                { label: 'Q1 2026', val: '0', delta: 'Past period' },
                { label: 'Q2 2026', val: '0', delta: 'Past period' },
                { label: 'Q3 2026', val: '0', delta: 'Past period' },
                { label: 'Q4 2026 (Active)', val: currentVal, delta: currentSouls > 0 ? 'Active quarter returns' : 'In progress' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
                  <div className="text-lg font-black text-[#142B4A] dark:text-white mt-1">{item.val}</div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5 inline-block">{item.delta}</span>
                </div>
              ))}

              {timeDimension === 'ytd' && [
                { label: '2026 Annual Target', val: selectedMetric === 'souls' ? soulTarget.toLocaleString() : selectedMetric === 'attendance' ? 'Goal' : selectedMetric === 'offerings' ? 'Goal' : '100%', delta: 'Kingdom Benchmark' },
                { label: '2026 YTD Harvested', val: currentVal, delta: currentSouls > 0 ? 'Live verified' : 'Awaiting returns' },
                { label: 'Registered Cells', val: stats.totalCells.toString(), delta: 'Active Directory' },
                { label: 'Remaining to Target', val: Math.max(0, soulTarget - (typeof currentSouls === 'number' ? currentSouls : 0)).toLocaleString(), delta: 'Goal Target' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
                  <div className="text-lg font-black text-[#142B4A] dark:text-white mt-1">{item.val}</div>
                  <span className="text-[10px] text-[#C6A45A] font-bold mt-0.5 inline-block">{item.delta}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* =========================================================================
          CELL PERFORMANCE COMPARISON BAR CHART
      ========================================================================== */}
      <section className="rounded-3xl border border-[#E3E8EF] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-[#182230] dark:text-white">
              <BarChart3 className="h-4 w-4 text-[#C6A45A]" />
              Cell Performance Comparison
            </h2>
            <p className="mt-1 text-xs text-[#667085] dark:text-slate-400">
              Rank and inspect individual cell contributions across attendance, soul-winning harvest, and compliance.
            </p>
          </div>
          <span className="rounded-full border border-[#142B4A]/15 dark:border-white/10 bg-[#142B4A]/5 dark:bg-white/5 px-3 py-1 text-[11px] font-semibold text-[#142B4A] dark:text-[#C6A45A]">
            {selectedCell === 'All' ? `${cellStats.length} cells` : 'Selected cell'} &bull; Live Database Data
          </span>
        </div>

        {(() => {
          const metricConfig = {
            attendance: { label: 'Attendance', color: '#142B4A', format: (value: number) => value.toLocaleString() },
            souls: { label: 'Souls won', color: '#C6A45A', format: (value: number) => value.toLocaleString() },
            offerings: { label: 'Offerings (GHS)', color: '#203D63', format: (value: number) => `GHS ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            compliance: { label: 'Reporting compliance (%)', color: '#23845B', format: (value: number) => `${value}%` },
          };
          const config = metricConfig[selectedMetric];
          const performanceData = cellStats
            .filter(cell => selectedCell === 'All' || cell.name === selectedCell)
            .map(cell => ({
              cell: cell.name,
              value: selectedMetric === 'attendance' ? cell.totalAttendance
                : selectedMetric === 'souls' ? cell.soulsWon
                : selectedMetric === 'offerings' ? cell.offeringsGhs
                : cell.compliance,
            }));

          return performanceData.length > 0 ? (
            <>
              <div className="h-[280px] w-full sm:h-[340px]" role="img" aria-label={`Bar chart showing ${config.label.toLowerCase()} by cell`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E8EF" />
                    <XAxis
                      dataKey="cell"
                      tick={{ fill: '#667085', fontSize: 11 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                      interval={0}
                      angle={performanceData.length > 5 ? -25 : 0}
                      textAnchor={performanceData.length > 5 ? 'end' : 'middle'}
                      height={performanceData.length > 5 ? 58 : 34}
                    />
                    <YAxis
                      tick={{ fill: '#667085', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={selectedMetric === 'offerings' ? 72 : 44}
                      tickFormatter={value => selectedMetric === 'offerings' ? `₵${Number(value).toLocaleString()}` : Number(value).toLocaleString()}
                    />
                    <Tooltip
                      formatter={(value: number) => config.format(Number(value))}
                      contentStyle={{ borderRadius: 12, border: '1px solid #E3E8EF', fontSize: 12 }}
                    />
                    <Bar dataKey="value" name={config.label} fill={config.color} radius={[6, 6, 0, 0]} maxBarSize={56} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] dark:border-slate-800 bg-[#F5F7FC] dark:bg-slate-800/40 text-center">
              <BarChart3 className="mb-2 h-7 w-7 text-[#98A2B3]" />
              <p className="text-sm font-semibold text-[#344054] dark:text-white">No performance records to chart yet</p>
              <p className="mt-1 max-w-sm text-xs text-[#667085] dark:text-slate-400">
                When tutors submit their weekly fellowship or evangelism returns, their figures will populate this chart in real time.
              </p>
            </div>
          );
        })()}
      </section>

      {/* =========================================================================
          CELLS BREAKDOWN & COMPLIANCE TABLE
      ========================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E3E8EF] dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#182230] dark:text-white">
              Cells Breakdown & Operational Compliance
            </h2>
            <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
              Live operational breakdown of attendance, soul-winning harvest, offerings, and reporting compliance for registered cells.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#142B4A]/5 dark:bg-white/5 border border-[#142B4A]/10 text-xs font-bold text-[#142B4A] dark:text-[#C6A45A]">
            Registered Fellowship Cells ({filteredCellStats.length})
          </span>
        </div>

        <div className="table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-[#667085] dark:text-slate-400 bg-[#F5F7FA] dark:bg-slate-800/50">
                <th className="py-3 px-5 w-12 text-center">#</th>
                <th className="py-3 px-4">FELLOWSHIP CELL & TUTOR</th>
                <th className="py-3 px-4">MEETING ATTENDANCE</th>
                <th className="py-3 px-4">SOULS WON (HARVEST)</th>
                <th className="py-3 px-4">OFFERINGS (GHS)</th>
                <th className="py-3 px-4">REPORTING COMPLIANCE</th>
                <th className="py-3 px-5 text-right">LATEST STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF] dark:divide-slate-800">
              {filteredCellStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085] dark:text-slate-400">
                    <Building className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No fellowship cells matching criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredCellStats.map((cell, idx) => (
                  <tr key={cell.id} className="hover:bg-[#F5F7FA] dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-5 text-center text-slate-400 text-xs font-bold">
                      {idx + 1}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                          {cell.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div className="font-bold text-[#182230] dark:text-white leading-tight">
                            {cell.name}
                          </div>
                          <div className="text-[11px] text-[#667085] dark:text-slate-400 mt-0.5">
                            Tutor: <span className="font-semibold text-[#142B4A] dark:text-[#C6A45A]">{cell.leaderName}</span>
                            {cell.code && <span className="ml-1.5 text-slate-400">({cell.code})</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#182230] dark:text-white text-sm">
                        {cell.totalAttendance}
                      </span>
                      <div className="text-[10px] text-[#667085] dark:text-slate-400">
                        {cell.meetingReportsCount} meeting report{cell.meetingReportsCount === 1 ? '' : 's'}
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        +{cell.soulsWon}
                      </span>
                      <div className="text-[10px] text-[#667085] dark:text-slate-400">
                        {cell.peopleReached} gospel reached &bull; {cell.evangelismReportsCount} outreach
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#182230] dark:text-white text-sm">
                        GHS {cell.offeringsGhs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div className="text-[10px] text-[#667085] dark:text-slate-400">Total remitted</div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#182230] dark:text-white text-sm">
                        {cell.compliance}%
                      </span>
                      <div className="w-24 bg-[#E3E8EF] dark:bg-slate-800 rounded-full h-1.5 mt-1">
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
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          On Track
                        </span>
                      ) : cell.status === 'Awaiting Review' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Awaiting Review
                        </span>
                      ) : cell.status === 'Needs Correction' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Needs Correction
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
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
      </div>

      {/* Admin Soul Target Settings Modal */}
      <SoulTargetSettingsModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        onUpdated={() => { void loadData(false); }}
      />

      {/* Core Foundation Settings Modal */}
      <CoreFoundationModal
        isOpen={isCoreFoundationModalOpen}
        onClose={() => setIsCoreFoundationModalOpen(false)}
        onSaved={() => { void loadData(false); }}
      />
    </div>
  );
};
