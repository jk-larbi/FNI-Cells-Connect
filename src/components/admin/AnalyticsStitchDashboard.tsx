import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Download,
  FileCheck,
  Filter,
  Flame,
  Globe2,
  HeartHandshake,
  MapPin,
  Printer,
  Radio,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Users,
  UserCheck,
  Wifi,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Cell,
  CellLocationRecord,
  CellMeetingReport,
  CellPerformanceRecord,
  DashboardStats,
  EvangelismReport,
} from '../../types';
import './analyticsStitchDashboard.css';

type MetricKey = 'attendance' | 'souls' | 'offerings' | 'compliance';
type PeriodKey = 'weekly' | 'monthly' | 'quarterly' | 'ytd';

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

interface CellMapBeacon {
  id: string;
  cellName: string;
  tutorName: string;
  venue: string;
  attendance?: number;
  soulsWon?: number;
}

interface WavePoint {
  month: string;
  attendance: number;
  souls: number;
  sessions: number;
}

interface FollowUpCell extends CellPerformanceRecord {
  followUpReasons: string[];
}

interface AnalyticsStitchDashboardProps {
  stats: DashboardStats;
  cells: Cell[];
  weeklyTrends: Array<{ week: string; attendance: number; visitors: number; soulsWon: number }>;
  cellStats: CellPerformanceRecord[];
  filteredCellStats: CellPerformanceRecord[];
  locationHistory: CellLocationRecord[];
  meetingReports: CellMeetingReport[];
  evangelismReports: EvangelismReport[];
  mapBeacons: CellMapBeacon[];
  followUpCells: FollowUpCell[];
  liveActivities: TutorActivityItem[];
  waveChartData: WavePoint[];
  activeMonthData: WavePoint;
  displayAttendance: number;
  displaySouls: number;
  displayCompliance: number;
  soulTarget: number;
  targetPercent: number;
  selectedCell: string;
  setSelectedCell: (value: string) => void;
  selectedMetric: MetricKey;
  setSelectedMetric: (value: MetricKey) => void;
  timeDimension: PeriodKey;
  setTimeDimension: (value: PeriodKey) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  overviewMetric: 'attendance' | 'souls';
  setOverviewMetric: (value: 'attendance' | 'souls') => void;
  selectedMonthIdx: number;
  setSelectedMonthIdx: (value: number) => void;
  sidebarTab: 'activities' | 'tutors';
  setSidebarTab: (value: 'activities' | 'tutors') => void;
  leaderSearchQuery: string;
  setLeaderSearchQuery: (value: string) => void;
  activeBeacon: CellMapBeacon | null;
  setActiveBeacon: (value: CellMapBeacon | null) => void;
  onRefresh: () => void;
  onExport: () => void;
  onPrint: () => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenTargetSettings: () => void;
  onOpenCoreFoundation: () => void;
}

const number = (value: number | undefined) => (Number(value) || 0).toLocaleString();
const dateLabel = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const StatusPill: React.FC<{ value: string; tone?: 'success' | 'warning' | 'danger' | 'neutral' }> = ({ value, tone }) => {
  const resolved = tone || (value.toLowerCase().includes('track') || value.toLowerCase().includes('approved')
    ? 'success'
    : value.toLowerCase().includes('missing') || value.toLowerCase().includes('correction')
      ? 'danger'
      : value.toLowerCase().includes('awaiting') || value.toLowerCase().includes('pending')
        ? 'warning'
        : 'neutral');
  return <span className={`fni-an-status is-${resolved}`}>{value}</span>;
};

const MetricCard: React.FC<{ label: string; value: string | number; note: string; icon: React.ElementType; highlight?: boolean }> = ({ label, value, note, icon: Icon, highlight }) => (
  <article className={`fni-an-kpi ${highlight ? 'is-highlighted' : ''}`}>
    <div className="fni-an-kpi-label"><span>{label}</span><Icon className="h-4 w-4" /></div>
    <strong>{value}</strong>
    <small>{note}</small>
  </article>
);

export const AnalyticsStitchDashboard: React.FC<AnalyticsStitchDashboardProps> = props => {
  const {
    stats, cells, weeklyTrends, cellStats, filteredCellStats, locationHistory, meetingReports, evangelismReports,
    mapBeacons, followUpCells, liveActivities, waveChartData, activeMonthData, displayAttendance, displaySouls,
    displayCompliance, soulTarget, targetPercent, selectedCell, setSelectedCell, selectedMetric, setSelectedMetric,
    timeDimension, setTimeDimension, searchQuery, setSearchQuery, overviewMetric, setOverviewMetric, selectedMonthIdx,
    setSelectedMonthIdx, sidebarTab, setSidebarTab, leaderSearchQuery, setLeaderSearchQuery, activeBeacon, setActiveBeacon,
    onRefresh, onExport, onPrint, onNavigateToTab, onOpenTargetSettings, onOpenCoreFoundation,
  } = props;

  const [dateRange, setDateRange] = React.useState<'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = React.useState('');
  const [customEnd, setCustomEnd] = React.useState('');
  const [selectedLeader, setSelectedLeader] = React.useState('all');
  const [reportStatus, setReportStatus] = React.useState('all');
  const [activityCategory, setActivityCategory] = React.useState('all');
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  const now = new Date();
  const rangeStart = dateRange === 'custom' && customStart ? new Date(`${customStart}T00:00:00`)
    : dateRange === 'week' ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
      : dateRange === 'quarter' ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        : dateRange === 'year' ? new Date(now.getFullYear(), 0, 1)
          : new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeEnd = dateRange === 'custom' && customEnd ? new Date(`${customEnd}T23:59:59.999`) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const withinDateRange = (value?: string) => {
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date >= rangeStart && date <= rangeEnd;
  };

  const totalMembers = cells.reduce((sum, cell) => sum + (Number(cell.total_members ?? cell.active_members) || 0), 0);
  const newMembers = cells.reduce((sum, cell) => sum + (Number(cell.new_members) || 0), 0);
  const averageAttendance = stats.meetingReportsSubmitted
    ? Math.round(stats.totalAttendance / stats.meetingReportsSubmitted)
    : 0;
  const filteredByCell = filteredCellStats.filter(cell =>
    (selectedCell === 'All' || cell.name === selectedCell) &&
    (selectedLeader === 'all' || cell.leaderName === selectedLeader) &&
    (reportStatus === 'all' ||
      (reportStatus === 'submitted' && !/missing|pending|late|correction/i.test(cell.status)) ||
      (reportStatus === 'pending' && /pending|awaiting|correction/i.test(cell.status)) ||
      (reportStatus === 'late' && /late/i.test(cell.status)))
  );
  const filteredActivities = liveActivities.filter(item => {
    const categoryMatch = activityCategory === 'all' ||
      (activityCategory === 'meetings' && item.type === 'meeting') ||
      (activityCategory === 'evangelism' && item.type === 'evangelism') ||
      (activityCategory === 'followups' && item.type === 'followup') ||
      (activityCategory === 'membership' && /member|visitor|joined/i.test(`${item.actionText} ${item.details}`));
    const statusText = `${item.valueBadge || ''} ${item.actionText} ${item.details}`;
    const statusMatch = reportStatus === 'all' ||
      (reportStatus === 'submitted' && /submitted|approved|filed|logged/i.test(statusText) && !/late/i.test(statusText)) ||
      (reportStatus === 'pending' && /pending|awaiting|review|correction/i.test(statusText)) ||
      (reportStatus === 'late' && /late/i.test(statusText));
    const leaderMatch = selectedLeader === 'all' || item.tutorName === selectedLeader;
    return categoryMatch && statusMatch && leaderMatch && withinDateRange(item.timestamp);
  });
  const distribution = filteredByCell.map(cell => ({
    name: cell.name,
    value: selectedMetric === 'attendance' ? cell.totalAttendance
      : selectedMetric === 'souls' ? cell.soulsWon
        : selectedMetric === 'offerings' ? cell.offeringsGhs
          : cell.compliance,
  })).sort((a, b) => b.value - a.value).slice(0, 10);
  const distributionLabel = selectedMetric === 'attendance' ? 'Attendance'
    : selectedMetric === 'souls' ? 'Souls won'
      : selectedMetric === 'offerings' ? 'Offerings (GHS)'
        : 'Reporting compliance (%)';
  const chartData = timeDimension === 'monthly' ? waveChartData.map(item => ({ ...item, soulsWon: item.souls })) : weeklyTrends;
  const chartValueKey = overviewMetric === 'attendance' ? 'attendance' : 'soulsWon';
  const chartTitle = overviewMetric === 'attendance' ? 'Attendance trend' : 'Souls won trend';
  const averagePeriodAttendance = weeklyTrends.length
    ? Math.round(weeklyTrends.reduce((sum, row) => sum + (Number(row.attendance) || 0), 0) / weeklyTrends.length)
    : 0;
  const improvingAttendance = weeklyTrends.length >= 2
    ? Number(weeklyTrends[weeklyTrends.length - 1].attendance) > Number(weeklyTrends[weeklyTrends.length - 2].attendance)
    : null;
  const missingCells = cellStats.filter(cell => cell.status === 'Missing Report');
  const leadersWithoutAssignment = cellStats.filter(cell => !cell.leaderName?.trim());
  const leaders = cellStats.filter(cell => cell.leaderName?.toLowerCase().includes(leaderSearchQuery.toLowerCase()));
  const reportApprovalRate = stats.reportsSubmitted
    ? Math.round((stats.approvedReports / stats.reportsSubmitted) * 100)
    : 0;

  const kpis = [
    { label: 'Total Members', value: number(totalMembers), note: 'Recorded across active cells', icon: Users },
    { label: 'Active Cells', value: number(stats.totalCells), note: 'In the cell directory', icon: Building },
    { label: 'Total Leaders', value: number(stats.activeCellLeaders), note: 'Registered active cell leaders', icon: UserCheck },
    { label: 'Avg Attendance', value: number(averageAttendance), note: 'Per submitted cell meeting', icon: Activity },
    { label: 'Reports Submitted', value: number(stats.reportsSubmitted), note: `${number(stats.approvedReports)} approved`, icon: FileCheck },
    { label: 'New Members', value: number(newMembers), note: 'New members recorded by cells', icon: TrendingUp },
  ];

  return (
    <div className="fni-analytics-stitch-page">
      <header className="fni-an-header">
        <div>
          <p className="fni-an-eyebrow">ADMIN WORKSPACE / PERFORMANCE</p>
          <h1>Ministry Analytics</h1>
          <p>Insights into ministry growth, engagement, attendance, outreach and reporting performance.</p>
        </div>
        <div className="fni-an-header-actions">
          <span className="fni-an-live-state"><span />Database-backed</span>
          <button type="button" onClick={onRefresh} aria-label="Refresh analytics"><RefreshCw className="h-4 w-4" />Refresh</button>
          <button type="button" onClick={onExport} aria-label="Export analytics as CSV"><Download className="h-4 w-4" />Export</button>
          <button type="button" className="is-primary" onClick={onPrint} aria-label="Print analytics"><Printer className="h-4 w-4" />Print</button>
        </div>
      </header>

      <section className="fni-an-date-toolbar" aria-label="Analytics date range">
        <label className="fni-an-date-select"><Calendar className="h-4 w-4" /><select value={dateRange} onChange={event => setDateRange(event.target.value as typeof dateRange)} aria-label="Select analytics date range"><option value="week">This Week</option><option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option><option value="custom">Custom Range</option></select></label>
        <button type="button" className="fni-an-filter-toggle" aria-expanded={mobileFiltersOpen} onClick={() => setMobileFiltersOpen(value => !value)}><Filter className="h-4 w-4" />Filters</button>
      </section>
      {dateRange === 'custom' && <section className="fni-an-custom-range" aria-label="Custom date range"><label>Start date<input type="date" value={customStart} max={customEnd || undefined} onChange={event => setCustomStart(event.target.value)} /></label><label>End date<input type="date" value={customEnd} min={customStart || undefined} onChange={event => setCustomEnd(event.target.value)} /></label></section>}
      <section className={`fni-an-filters ${mobileFiltersOpen ? 'is-open' : ''}`} aria-label="Analytics filters">
        <label className="fni-an-search"><Search className="h-4 w-4" /><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search cell, leader or code…" aria-label="Search cells by name, leader, or cell code" />{searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear cell search"><X className="h-4 w-4" /></button>}</label>
        <label><Building className="h-4 w-4" /><select value={selectedCell} onChange={event => setSelectedCell(event.target.value)} aria-label="Filter by cell"><option value="All">All cell groups</option>{cells.map(cell => <option key={cell.id} value={cell.name}>{cell.name}</option>)}</select></label>
        <label><Users className="h-4 w-4" /><select value={selectedLeader} onChange={event => setSelectedLeader(event.target.value)} aria-label="Filter by cell leader"><option value="all">All cell leaders</option>{Array.from(new Set(cellStats.map(cell => cell.leaderName).filter(Boolean))).sort().map(leader => <option key={leader} value={leader}>{leader}</option>)}</select></label>
        <label><FileCheck className="h-4 w-4" /><select value={reportStatus} onChange={event => setReportStatus(event.target.value)} aria-label="Filter by report status"><option value="all">All report statuses</option><option value="submitted">Submitted</option><option value="pending">Pending</option><option value="late">Submitted Late</option></select></label>
        <label><Activity className="h-4 w-4" /><select value={activityCategory} onChange={event => setActivityCategory(event.target.value)} aria-label="Filter by activity category"><option value="all">All activity categories</option><option value="meetings">Cell meetings</option><option value="evangelism">Evangelism</option><option value="followups">Follow-ups</option><option value="membership">Membership</option></select></label>
        <label className="fni-an-period-filter"><Calendar className="h-4 w-4" /><select value={timeDimension} onChange={event => setTimeDimension(event.target.value as PeriodKey)} aria-label="Select chart cadence"><option value="weekly">Weekly trend</option><option value="monthly">Monthly trend</option></select></label>
        <button type="button" className="fni-an-reset-filters" onClick={() => { setSelectedCell('All'); setSelectedLeader('all'); setReportStatus('all'); setActivityCategory('all'); setSearchQuery(''); setDateRange('month'); setCustomStart(''); setCustomEnd(''); }}>Reset filters</button>
        <button type="button" className="fni-an-apply-filters" onClick={() => setMobileFiltersOpen(false)}>Apply filters</button>
      </section>

      <section className="fni-an-kpis" aria-label="Key Performance Indicators">
        {kpis.map(item => <MetricCard key={item.label} {...item} />)}
      </section>

      <section className="fni-an-attendance" aria-label="Attendance Analytics">
        <div className="fni-an-section-heading">
          <div><span className="fni-an-icon"><BarChart3 className="h-4 w-4" /></span><div><h2>Attendance Analytics</h2><p>Attendance movement and distribution across active fellowship cells.</p></div></div>
          <div className="fni-an-toggle" role="group" aria-label="Attendance view">
            <button type="button" className={overviewMetric === 'attendance' ? 'is-active' : ''} onClick={() => setOverviewMetric('attendance')}>Attendance</button>
            <button type="button" className={overviewMetric === 'souls' ? 'is-active' : ''} onClick={() => setOverviewMetric('souls')}>Souls won</button>
          </div>
        </div>
        <div className="fni-an-attendance-grid">
          <article className="fni-an-chart-panel">
            <div className="fni-an-chart-title"><div><h3>{chartTitle}</h3><p>{timeDimension === 'monthly' ? 'Monthly totals' : 'Recorded reporting periods'}</p></div><strong>{overviewMetric === 'attendance' ? number(displayAttendance) : number(displaySouls)}</strong></div>
            {chartData.length ? (
              <div className="fni-an-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}><defs><linearGradient id="fniAnalyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8E6C23" stopOpacity={0.25} /><stop offset="100%" stopColor="#8E6C23" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#DCE3EC" strokeDasharray="3 3" vertical={false} /><XAxis dataKey={timeDimension === 'monthly' ? 'month' : 'week'} tick={{ fill: '#68798B', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#68798B', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Area type="monotone" dataKey={chartValueKey} stroke="#8E6C23" strokeWidth={2.5} fill="url(#fniAnalyticsFill)" /></AreaChart></ResponsiveContainer></div>
            ) : <div className="fni-an-empty">No attendance trend records are available for this period.</div>}
            {timeDimension === 'monthly' && (
              <div className="fni-an-month-pills">{waveChartData.map((item, index) => <button type="button" key={item.month} onClick={() => setSelectedMonthIdx(index)} className={selectedMonthIdx === index ? 'is-active' : ''}>{item.month}</button>)}</div>
            )}
            <div className="fni-an-chart-footer"><span>Average attendance per report: <strong>{number(averageAttendance)}</strong></span><span>{timeDimension === 'monthly' ? `${activeMonthData.month}: ${number(activeMonthData.attendance)} attendance · ${number(activeMonthData.souls)} souls` : `Meeting reports: ${number(stats.meetingReportsSubmitted)}`}</span></div>
          </article>
          <article className="fni-an-distribution-panel">
            <div className="fni-an-panel-heading"><h3>Distribution by cell</h3><select value={selectedMetric} onChange={event => setSelectedMetric(event.target.value as MetricKey)} aria-label="Select cell distribution metric"><option value="attendance">Attendance</option><option value="souls">Souls won</option><option value="offerings">Offerings</option><option value="compliance">Compliance</option></select></div>
            {distribution.length ? <div className="fni-an-distribution-list">{distribution.map(item => <div key={item.name}><span>{item.name}</span><div><i style={{ width: `${Math.max(2, (item.value / Math.max(1, ...distribution.map(row => row.value))) * 100)}%` }} /></div><strong>{selectedMetric === 'compliance' ? `${item.value}%` : number(item.value)}</strong></div>)}</div> : <div className="fni-an-empty">No cell performance records are available.</div>}
          </article>
        </div>
      </section>

      <section className="fni-an-cell-performance" aria-label="Cell Group Performance">
        <div className="fni-an-section-heading"><div><span className="fni-an-icon"><Building className="h-4 w-4" /></span><div><h2>Cell Group Performance</h2><p>Compare attendance, outreach and reporting compliance across fellowship cells.</p></div></div><button type="button" className="fni-an-link" onClick={() => onNavigateToTab?.('cell-management')}>Cell directory<ArrowUpRight className="h-4 w-4" /></button></div>
        {filteredByCell.length ? (
          <div className="fni-an-table-wrap"><table><thead><tr><th>Cell</th><th>Leader</th><th>Attendance</th><th>Souls won</th><th>Reports</th><th>Compliance</th><th>Status</th></tr></thead><tbody>
            {filteredByCell.map(cell => <tr key={cell.id}><td><strong>{cell.name}</strong><small>{cell.code || '—'}</small></td><td>{cell.leaderName || 'Not assigned'}</td><td>{number(cell.totalAttendance)}</td><td>{number(cell.soulsWon)}</td><td>{number(cell.meetingReportsCount + cell.evangelismReportsCount)}</td><td><div className="fni-an-compliance"><span><i style={{ width: `${Math.min(100, Math.max(0, cell.compliance))}%` }} /></span><strong>{cell.compliance}%</strong></div></td><td><StatusPill value={cell.status} /></td></tr>)}
          </tbody></table></div>
        ) : <div className="fni-an-empty">No cell records match the selected filters.</div>}
        <div className="fni-an-venue-strip">
          <div><MapPin className="h-4 w-4" /><span>{mapBeacons.length} recorded cell venue(s)</span></div>
          <button type="button" onClick={() => onNavigateToTab?.('cell-location-history')}>View location history<ChevronRight className="h-4 w-4" /></button>
        </div>
        {activeBeacon && <div className="fni-an-selected-venue"><strong>{activeBeacon.cellName}</strong><span>{activeBeacon.venue}</span><span>{activeBeacon.tutorName}</span><button type="button" onClick={() => setActiveBeacon(null)}>Clear</button></div>}
        {mapBeacons.length > 0 && <div className="fni-an-venue-list">{mapBeacons.slice(0, 6).map(item => <button type="button" key={item.id} onClick={() => setActiveBeacon(item)}><MapPin className="h-3.5 w-3.5" /><span>{item.cellName}</span><small>{item.venue}</small></button>)}</div>}
      </section>

      <section className="fni-an-dual-grid">
        <article className="fni-an-panel" aria-label="Reporting Analytics">
          <div className="fni-an-section-heading"><div><span className="fni-an-icon"><FileCheck className="h-4 w-4" /></span><div><h2>Reporting Analytics</h2><p>Submission, approval and deadline compliance.</p></div></div><button type="button" className="fni-an-link" onClick={() => onNavigateToTab?.('report-review')}>Review reports<ArrowUpRight className="h-4 w-4" /></button></div>
          <div className="fni-an-report-total"><strong>{number(stats.reportsSubmitted)}</strong><span>Reports submitted</span><StatusPill value={`${stats.complianceRate}% compliance`} tone={stats.complianceRate >= 90 ? 'success' : 'warning'} /></div>
          <div className="fni-an-stat-grid">
            <div><span>Approved</span><strong>{number(stats.approvedReports)}</strong></div>
            <div><span>Awaiting review</span><strong>{number(stats.awaitingReviewCount)}</strong></div>
            <div><span>Needs correction</span><strong>{number(stats.needsCorrectionCount)}</strong></div>
            <div><span>Late reports</span><strong>{number(stats.lateReports)}</strong></div>
            <div><span>Cells missing reports</span><strong>{number(stats.missingCellsCount)}</strong></div>
            <div><span>Approval rate</span><strong>{reportApprovalRate}%</strong></div>
          </div>
          <div className="fni-an-progress"><span><i style={{ width: `${Math.min(100, Math.max(0, stats.complianceRate))}%` }} /></span><strong>{stats.complianceRate}% reporting compliance</strong></div>
        </article>

        <article className="fni-an-panel" aria-label="Evangelism Analytics">
          <div className="fni-an-section-heading"><div><span className="fni-an-icon"><Flame className="h-4 w-4" /></span><div><h2>Evangelism Analytics</h2><p>Outreach reach, verified harvest and follow-up activity.</p></div></div><button type="button" className="fni-an-link" onClick={() => onNavigateToTab?.('evangelism')}>View outreach<ArrowUpRight className="h-4 w-4" /></button></div>
          <div className="fni-an-harvest-highlight"><div><span>Verified souls won</span><strong>{number(stats.soulsWon)}</strong></div><div><span>People reached</span><strong>{number(stats.peopleReached)}</strong></div></div>
          <div className="fni-an-stat-grid">
            <div><span>Contacts captured</span><strong>{number(stats.contactsCaptured)}</strong></div>
            <div><span>Interested in ministry</span><strong>{number(stats.interestedInMinistry || 0)}</strong></div>
            <div><span>Follow-ups completed</span><strong>{number(stats.followUpsCompleted)}</strong></div>
            <div><span>Outstanding follow-ups</span><strong>{number(stats.outstandingFollowUps)}</strong></div>
          </div>
          <div className="fni-an-panel-footer"><span>{number(evangelismReports.length)} evangelism report(s) recorded</span><button type="button" onClick={() => onNavigateToTab?.('follow-ups')}>Open follow-ups<ChevronRight className="h-4 w-4" /></button></div>
        </article>
      </section>

      <section className="fni-an-growth" aria-label="Membership and Growth Analytics">
        <div className="fni-an-section-heading"><div><span className="fni-an-icon"><TrendingUp className="h-4 w-4" /></span><div><h2>Membership &amp; Growth Analytics</h2><p>Member records and annual ministry growth indicators.</p></div></div></div>
        <div className="fni-an-growth-grid">
          <div><span>Total members</span><strong>{number(totalMembers)}</strong><small>Across active cells</small></div>
          <div><span>New members</span><strong>{number(newMembers)}</strong><small>Recorded by cell leaders</small></div>
          <div><span>Visitors recorded</span><strong>{number(stats.visitorsRecorded)}</strong><small>From cell meeting returns</small></div>
          <div><span>Active leaders</span><strong>{number(stats.activeCellLeaders)}</strong><small>Registered cell leaders</small></div>
          <div className="fni-an-target-card"><div><span>Annual soul-winning target</span><strong>{number(soulTarget)}</strong><small>{targetPercent}% achieved · {number(displaySouls)} verified souls</small></div><div className="fni-an-target-actions"><button type="button" onClick={onOpenCoreFoundation}><Compass className="h-3.5 w-3.5" />Core Foundation</button><button type="button" onClick={onOpenTargetSettings}><Target className="h-3.5 w-3.5" />Target settings</button></div><div className="fni-an-target-track"><i style={{ width: `${targetPercent}%` }} /></div></div>
        </div>
      </section>

      <section className="fni-an-insights" aria-label="Insights and Performance Summary">
        <div className="fni-an-section-heading"><div><span className="fni-an-icon"><Bell className="h-4 w-4" /></span><div><h2>Insights &amp; Performance Summary</h2><p>Operational signals based on submitted reports and active cell records.</p></div></div></div>
        <div className="fni-an-insight-grid">
          <article><div className="fni-an-insight-title"><TrendingUp className="h-4 w-4" /><h3>Attendance movement</h3></div><strong>{improvingAttendance === null ? 'Not enough data' : improvingAttendance ? 'Improving' : Number(weeklyTrends[weeklyTrends.length - 1]?.attendance) < Number(weeklyTrends[weeklyTrends.length - 2]?.attendance) ? 'Declining' : 'Stable'}</strong><p>{weeklyTrends.length >= 2 ? `Latest reporting period compared with the previous period. Average attendance: ${number(averagePeriodAttendance)}.` : 'More reporting periods are needed to identify a reliable trend.'}</p></article>
          <article><div className="fni-an-insight-title"><CheckCircle2 className="h-4 w-4" /><h3>Reporting compliance</h3></div><strong>{stats.complianceRate}%</strong><p>{number(stats.missingCellsCount)} cell(s) currently have no meeting report recorded for the reporting cycle.</p></article>
          <article><div className="fni-an-insight-title"><AlertTriangle className="h-4 w-4" /><h3>Outstanding reports</h3></div><strong>{number(stats.pendingReports + stats.missingCellsCount)}</strong><p>{number(stats.pendingReports)} report(s) need review or correction; {number(stats.missingCellsCount)} cell(s) have missing returns.</p></article>
          <article><div className="fni-an-insight-title"><HeartHandshake className="h-4 w-4" /><h3>Follow-up attention</h3></div><strong>{number(stats.outstandingFollowUps)}</strong><p>Contacts remain in the follow-up pipeline and require continued pastoral engagement.</p><button type="button" onClick={() => onNavigateToTab?.('follow-ups')}>Review follow-ups<ChevronRight className="h-3.5 w-3.5" /></button></article>
          <article className="fni-an-insight-wide"><div className="fni-an-insight-title"><Users className="h-4 w-4" /><h3>Areas requiring leadership attention</h3></div>{followUpCells.length || leadersWithoutAssignment.length ? <ul>{followUpCells.slice(0, 5).map(cell => <li key={cell.id}><strong>{cell.name}</strong><span>{cell.followUpReasons.join(' · ')}</span></li>)}{leadersWithoutAssignment.slice(0, 3).map(cell => <li key={`leader-${cell.id}`}><strong>{cell.name}</strong><span>Leader not assigned</span></li>)}</ul> : <p>No cell follow-up gaps are currently identified in the available records.</p>}</article>
        </div>
      </section>

      <section className="fni-an-activity" aria-label="Recent Ministry Activity">
        <div className="fni-an-section-heading"><div><span className="fni-an-icon"><Radio className="h-4 w-4" /></span><div><h2>Recent Ministry Activity</h2><p>Latest recorded reports and venue updates.</p></div></div></div>
        <div className="fni-an-activity-tabs" role="tablist" aria-label="Activity view"><button type="button" role="tab" aria-selected={sidebarTab === 'activities'} className={sidebarTab === 'activities' ? 'is-active' : ''} onClick={() => setSidebarTab('activities')}>Activities</button><button type="button" role="tab" aria-selected={sidebarTab === 'tutors'} className={sidebarTab === 'tutors' ? 'is-active' : ''} onClick={() => setSidebarTab('tutors')}>Cell leaders</button></div>
        {sidebarTab === 'activities' ? (
          filteredActivities.length ? <div className="fni-an-activity-list">{filteredActivities.slice(0, 6).map(item => <div key={item.id}><span className="fni-an-activity-avatar">{item.avatarInitials}</span><div><strong>{item.tutorName} · {item.cellName}</strong><p>{item.actionText} — {item.details}</p><small>{item.relativeTime}</small></div>{item.valueBadge && <StatusPill value={item.valueBadge} tone="neutral" />}</div>)}</div> : <p className="fni-an-empty">No ministry activity matches the selected date range and filters.</p>
        ) : (
          <><label className="fni-an-leader-search"><Search className="h-4 w-4" /><input value={leaderSearchQuery} onChange={event => setLeaderSearchQuery(event.target.value)} placeholder="Search cell leader…" /></label><div className="fni-an-activity-list">{leaders.slice(0, 8).map(cell => <div key={cell.id}><span className="fni-an-activity-avatar">{cell.leaderName.split(' ').map(name => name[0]).slice(0, 2).join('').toUpperCase() || '—'}</span><div><strong>{cell.leaderName || 'Leader not assigned'}</strong><p>{cell.name} · {cell.leaderPhone || 'No phone recorded'}</p></div><StatusPill value={cell.status} /></div>)}</div></>
        )}
      </section>
    </div>
  );
};
