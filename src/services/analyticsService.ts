import { DashboardStats, UserRole, CellReport } from '../types';
import { ReportService } from './reportService';

export class AnalyticsService {
  static async getDashboardStats(
    role: UserRole,
    userRegionId?: string,
    userCellId?: string
  ): Promise<DashboardStats> {
    const allReports = await ReportService.getReports();
    const allCells = await ReportService.getCells();

    // Filter scope by role
    let scopedReports: CellReport[] = allReports;
    let scopedCells = allCells;

    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'national_admin' || role === 'regional_leader';

    if (!isAdmin && userCellId) {
      scopedReports = allReports.filter(r => r.cell_id === userCellId);
      scopedCells = allCells.filter(c => c.id === userCellId);
    }

    const totalCells = scopedCells.length;
    const activeCellLeaders = scopedCells.filter(c => c.is_active && c.leader_name).length;

    // Real dynamic stats derived strictly from submitted/approved reports
    const submittedReports = scopedReports.filter(r => r.status === 'submitted' || r.status === 'approved');
    const pendingReports = scopedReports.filter(r => r.status === 'draft' || r.status === 'under_review' || r.status === 'needs_revision');

    const soulsWon = scopedReports.reduce((acc, curr) => acc + (Number(curr.souls_won) || 0), 0);
    const visitorsRecorded = scopedReports.reduce((acc, curr) => acc + (Number(curr.visitors_count) || 0), 0);
    const totalAttendance = scopedReports.reduce((acc, curr) => acc + (Number(curr.total_attendance) || 0), 0);

    // Compliance rate = (cells that submitted report for current active week / total active cells) * 100
    const currentWeekReports = scopedReports.filter(r => r.period_id === 'prd-w45' && (r.status === 'submitted' || r.status === 'approved'));
    const complianceRate = totalCells > 0 ? Math.round((currentWeekReports.length / totalCells) * 100) : 0;

    return {
      totalCells,
      activeCellLeaders,
      reportsSubmitted: submittedReports.length,
      pendingReports: pendingReports.length,
      soulsWon,
      visitorsRecorded,
      totalAttendance,
      complianceRate,
    };
  }

  static async getWeeklyTrends(role: UserRole, userRegionId?: string, userCellId?: string) {
    const reports = await ReportService.getReports();
    const periods = await ReportService.getPeriods();

    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'national_admin' || role === 'regional_leader';

    let filtered = reports;
    if (!isAdmin && userCellId) {
      filtered = reports.filter(r => r.cell_id === userCellId);
    }

    // Truly dynamic: Calculate real counts grouped by active periods
    return periods.map(p => {
      const pReports = filtered.filter(r => r.period_id === p.id && r.status !== 'draft');
      const attendance = pReports.reduce((sum, r) => sum + (Number(r.total_attendance) || 0), 0);
      const visitors = pReports.reduce((sum, r) => sum + (Number(r.visitors_count) || 0), 0);
      const soulsWon = pReports.reduce((sum, r) => sum + (Number(r.souls_won) || 0), 0);

      return {
        week: p.name.replace('2026 - ', ''),
        attendance,
        visitors,
        soulsWon,
      };
    });
  }

  static async getRegionalPerformance() {
    const regions = await ReportService.getRegions();
    const reports = await ReportService.getReports();

    return regions.map(reg => {
      const regReports = reports.filter(r => r.region_id === reg.id);
      const souls = regReports.reduce((s, r) => s + (Number(r.souls_won) || 0), 0);
      const visitors = regReports.reduce((v, r) => v + (Number(r.visitors_count) || 0), 0);
      const attendance = regReports.reduce((a, r) => a + (Number(r.total_attendance) || 0), 0);

      const week45ReportCount = regReports.filter(r => r.period_id === 'prd-w45' && (r.status === 'approved' || r.status === 'submitted')).length;
      const totalCells = reg.total_cells || 1;
      const compliance = Math.min(100, Math.round((week45ReportCount / totalCells) * 100));

      return {
        id: reg.id,
        name: reg.name,
        code: reg.code,
        cells: totalCells,
        compliance,
        souls,
        visitors,
        attendance,
      };
    });
  }
}
