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
  X,
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
import { AnalyticsStitchDashboard } from './AnalyticsStitchDashboard';
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
  attendance?: number;
  soulsWon?: number;
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
  const [leaderSearchQuery, setLeaderSearchQuery] = useState('');
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
    const relativeTime = (value?: string) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      const seconds = Math.round((date.getTime() - Date.now()) / 1000);
      const absSeconds = Math.abs(seconds);
      const units: Array<[number, Intl.RelativeTimeFormatUnit, number]> = [
        [60, 'second', 1],
        [3600, 'minute', 60],
        [86400, 'hour', 3600],
        [604800, 'day', 86400],
        [2629800, 'week', 604800],
        [31557600, 'month', 2629800],
        [Number.POSITIVE_INFINITY, 'year', 31557600],
      ];
      const [, unit, divisor] = units.find(([limit]) => absSeconds < limit) || units[units.length - 1];
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round(seconds / divisor), unit);
    };

    locHistory.forEach((loc, idx) => {
      const timestamp = loc.meeting_date;
      const timeLabel = relativeTime(timestamp);
      if (!timeLabel) return;
      const leader = loc.leader_name || 'Leader not recorded';
      items.push({
        id: `loc-${loc.id || idx}`,
        type: 'location',
        tutorName: leader,
        cellName: loc.cell_name,
        avatarInitials: (loc.leader_name || 'L').split(' ').map(s => s[0]).slice(0, 2).join(''),
        actionText: 'Convened fellowship meeting',
        details: `Venue: ${loc.venue || 'Not recorded'}`,
        timestamp,
        relativeTime: timeLabel,
        valueBadge: 'Venue Logged',
        badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      });
    });

    evang.forEach((report, idx) => {
      const timestamp = report.submittedAt || report.date;
      const timeLabel = relativeTime(timestamp);
      if (!timeLabel) return;
      const soulsValue = report.verifiedSoulsWon ?? report.conversions;
      const souls = soulsValue == null ? null : Number(soulsValue);
      const reached = report.peopleSpokenTo == null ? '—' : report.peopleSpokenTo;
      const leader = report.tutorName || 'Tutor not recorded';
      items.push({
        id: `evang-${report.id || idx}`,
        type: 'evangelism',
        tutorName: leader,
        cellName: report.cellName || 'Cell not recorded',
        avatarInitials: leader.split(' ').map((s: string) => s[0]).slice(0, 2).join(''),
        actionText: 'Logged Evangelism Outreach',
        details: `${report.location || 'Location not recorded'} · ${reached} reached`,
        timestamp,
        relativeTime: timeLabel,
        valueBadge: souls == null || !Number.isFinite(souls) ? 'Souls not recorded' : `+${souls} Souls`,
        badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      });
    });

    meetings.forEach((report, idx) => {
      const timestamp = report.submittedAt || report.meetingDate;
      const timeLabel = relativeTime(timestamp);
      if (!timeLabel) return;
      const attendance = report.attendance == null ? null : Number(report.attendance);
      const leader = report.tutorName || 'Tutor not recorded';
      items.push({
        id: `meet-${report.id || idx}`,
        type: 'meeting',
        tutorName: leader,
        cellName: report.cellName || 'Cell not recorded',
        avatarInitials: leader.split(' ').map((s: string) => s[0]).slice(0, 2).join(''),
        actionText: 'Filed Weekly Cell Return',
        details: `${attendance == null || !Number.isFinite(attendance) ? '—' : attendance} attendees · ${report.meetingLocation || 'Venue not recorded'}`,
        timestamp,
        relativeTime: timeLabel,
        valueBadge: attendance == null || !Number.isFinite(attendance) ? 'Attendance not recorded' : `${attendance} Present`,
        badgeColor: 'bg-[#142B4A]/10 text-[#142B4A] dark:bg-amber-400/10 dark:text-amber-300',
      });
    });

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setLiveActivities(items.slice(0, 12));
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

  // Show only venues that are actually recorded for a cell; never invent map coordinates or live presence.
  const mapBeacons = useMemo<CellMapBeacon[]>(() => {
    return cells.flatMap(cell => {
      const stat = cellStats.find(cs => cs.id === cell.id || cs.name === cell.name);
      const latestLocation = locationHistory
        .filter(record => record.cell_id === cell.id || record.cell_name === cell.name)
        .filter(record => record.venue?.trim())
        .sort((a, b) => new Date(b.meeting_date || 0).getTime() - new Date(a.meeting_date || 0).getTime())[0];
      const venue = latestLocation?.venue?.trim() || cell.meeting_location?.trim() || cell.location?.trim();
      if (!venue) return [];

      return [{
        id: cell.id,
        cellName: cell.name,
        tutorName: cell.leader_name || stat?.leaderName || 'Leader not assigned',
        venue,
        attendance: stat?.totalAttendance,
        soulsWon: stat?.soulsWon,
      }];
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

  // Highlight only objective follow-up gaps visible in the current cell records.
  const followUpCells = useMemo(() => filteredCellStats
    .filter(cell => selectedCell === 'All' || cell.name === selectedCell)
    .map(cell => ({
      ...cell,
      followUpReasons: [
        !cell.leaderName?.trim() ? 'Leader not assigned' : null,
        cell.meetingReportsCount === 0 ? 'No meeting reports recorded' : null,
      ].filter((reason): reason is string => Boolean(reason)),
    }))
    .filter(cell => cell.followUpReasons.length > 0),
  [filteredCellStats, selectedCell]);

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
        <p>Loading ministry analytics...</p>
      </div>
    );
  }

  const soulTarget = settings?.annualSoulWinningTarget || 5000;
  const targetPercent = Math.min(100, Math.round((displaySouls / soulTarget) * 100));

  return (
    <>
      <AnalyticsStitchDashboard
        stats={stats}
        cells={cells}
        weeklyTrends={weeklyTrends}
        cellStats={cellStats}
        filteredCellStats={filteredCellStats}
        locationHistory={locationHistory}
        meetingReports={meetingReports}
        evangelismReports={evangelismReports}
        mapBeacons={mapBeacons}
        followUpCells={followUpCells}
        liveActivities={liveActivities}
        waveChartData={waveChartData}
        activeMonthData={activeMonthData}
        displayAttendance={displayAttendance}
        displaySouls={displaySouls}
        displayCompliance={displayCompliance}
        soulTarget={soulTarget}
        targetPercent={targetPercent}
        selectedCell={selectedCell}
        setSelectedCell={setSelectedCell}
        selectedMetric={selectedMetric}
        setSelectedMetric={setSelectedMetric}
        timeDimension={timeDimension}
        setTimeDimension={setTimeDimension}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        overviewMetric={overviewMetric}
        setOverviewMetric={setOverviewMetric}
        selectedMonthIdx={selectedMonthIdx}
        setSelectedMonthIdx={setSelectedMonthIdx}
        sidebarTab={sidebarTab}
        setSidebarTab={setSidebarTab}
        leaderSearchQuery={leaderSearchQuery}
        setLeaderSearchQuery={setLeaderSearchQuery}
        activeBeacon={activeBeacon}
        setActiveBeacon={setActiveBeacon}
        onRefresh={() => void loadData(true)}
        onExport={() => void handleExportCsv()}
        onPrint={handlePrint}
        onNavigateToTab={onNavigateToTab}
        onOpenTargetSettings={() => setIsTargetModalOpen(true)}
        onOpenCoreFoundation={() => setIsCoreFoundationModalOpen(true)}
      />
      <SoulTargetSettingsModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        onUpdated={() => { void loadData(false); }}
      />
      <CoreFoundationModal
        isOpen={isCoreFoundationModalOpen}
        onClose={() => setIsCoreFoundationModalOpen(false)}
        onSaved={() => { void loadData(false); }}
      />
    </>
  );
};