import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AnalyticsService } from '../../services/analyticsService';
import { ReportService } from '../../services/reportService';
import { DashboardStats, CellReport } from '../../types';
import { StatCard, ActionStatCard } from './StatCard';
import { WeeklyPerformanceChart } from './WeeklyPerformanceChart';
import { SoulsWonChart } from './SoulsWonChart';
import { RecentReportsTable } from './RecentReportsTable';
import { ComplianceTracker } from './ComplianceTracker';
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
  ShieldAlert,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToForm: () => void;
  onNavigateToReports: () => void;
  onNavigateToRegional: () => void;
  onSelectReport: (report: CellReport) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToForm,
  onNavigateToReports,
  onNavigateToRegional,
  onSelectReport,
}) => {
  const { currentRole, currentUser, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [regionalStats, setRegionalStats] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<CellReport[]>([]);
  const [activeCell, setActiveCell] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);
        const [dashStats, trendData, regData, allReports, allCells] = await Promise.all([
          AnalyticsService.getDashboardStats(currentRole, currentUser.region_id, currentUser.cell_id),
          AnalyticsService.getWeeklyTrends(currentRole, currentUser.region_id, currentUser.cell_id),
          AnalyticsService.getRegionalPerformance(),
          ReportService.getReports(),
          ReportService.getCells(),
        ]);

        setStats(dashStats);
        setTrends(trendData);
        setRegionalStats(regData);

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
    }
    loadDashboard();
  }, [currentRole, currentUser, isAdmin]);

  if (isLoading || !stats) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 font-medium">
        Loading organizational intelligence...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Row with Title and Pill Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-950">
            {isAdmin ? 'Admin Dashboard' : 'Cell Leader Dashboard'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin
              ? 'Organization-wide reporting metrics • Week 45 Cycle'
              : `Fellowship Unit: ${currentUser.cell_name || activeCell?.name || 'Awaiting Cell Registration'} • ${currentUser.region_name || 'Ecclesiastical Region'}`}
          </p>
        </div>

        {/* Search Bar matching screenshot style */}
        <div className="relative">
          <input
            type="text"
            placeholder={isAdmin ? 'Search reports or leaders...' : 'Search my submissions...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-56 sm:w-64 text-xs font-medium rounded-full border-0 bg-white px-4 py-2.5 pl-9 text-slate-800 placeholder-slate-400 shadow-card focus:ring-2 focus:ring-navy-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      {/* Modern Top Horizontal Stat Cards (Matching screenshot layout) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={isAdmin ? 'Total Cells' : 'Cell Attendance'}
          value={isAdmin ? stats.totalCells : stats.totalAttendance}
          subtitle={isAdmin ? `${stats.activeCellLeaders} Active leaders` : `${stats.totalAttendance} total turnout`}
          icon={<Users className="w-5 h-5 text-gold-400" />}
          isActive={true}
        />

        <StatCard
          title={isAdmin ? 'Active Leaders' : 'Weekly Visitors'}
          value={isAdmin ? stats.activeCellLeaders : stats.visitorsRecorded}
          subtitle={isAdmin ? 'Field leadership network' : `${stats.visitorsRecorded} first-timers recorded`}
          icon={<UserCheck className="w-5 h-5 text-gold-400" />}
          isActive={false}
        />

        <StatCard
          title="Souls Won"
          value={`+${stats.soulsWon}`}
          subtitle="Confirmed evangelism harvest"
          icon={<Flame className="w-5 h-5 text-gold-400" />}
          isActive={false}
        />

        <ActionStatCard
          label={isAdmin ? 'Review Reports' : 'Submit Report'}
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
                    {recentReports[0] ? `Week 45 Report Filed (${recentReports[0].status.toUpperCase()})` : 'Awaiting submission for Week 45'}
                  </span>
                </div>

                <button
                  onClick={onNavigateToForm}
                  className="w-full py-2.5 rounded-xl bg-navy-900 text-white font-bold text-xs hover:bg-navy-950 transition-colors shadow-sm"
                >
                  {recentReports[0] ? 'Edit / Submit Next Return' : '+ File Week 45 Return'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
