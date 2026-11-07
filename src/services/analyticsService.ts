import { DashboardStats, UserRole } from '../types';
import { ReportService } from './reportService';
import { CellService } from './cellService';
import { FollowUpService } from './followUpService';
import { SettingsService } from './settingsService';

export class AnalyticsService {
  static async getDashboardStats(
    role: UserRole,
    userRegionId?: string,
    userCellId?: string
  ): Promise<DashboardStats> {
    const isAdmin =
      role === 'admin' || role === 'super_admin' || role === 'national_admin' || role === 'regional_leader';

    const [allCells, meetingReports, evangelismReports, contacts, settings] = await Promise.all([
      CellService.getCells(),
      ReportService.getCellMeetingReports(),
      ReportService.getEvangelismReports(),
      FollowUpService.getContacts(),
      SettingsService.getSettings(),
    ]);

    // Filter scope by user cell if tutor
    let scopedCells = allCells;
    let scopedMeetings = meetingReports;
    let scopedEvang = evangelismReports;
    let scopedContacts = contacts;

    if (!isAdmin && userCellId) {
      scopedCells = allCells.filter(c => c.id === userCellId);
      scopedMeetings = meetingReports.filter(m => m.cellId === userCellId);
      scopedEvang = evangelismReports.filter(e => e.cellId === userCellId);
      scopedContacts = contacts.filter(c => c.cellId === userCellId);
    }

    const totalCells = scopedCells.length;
    const activeCellLeaders = scopedCells.filter(c => c.is_active && c.tutorUid).length;

    // Reporting stats across both meeting and evangelism reports
    const allUnifiedReports = [
      ...scopedMeetings.map(m => ({ status: m.status, late: m.late, cellId: m.cellId })),
      ...scopedEvang.map(e => ({ status: e.status, late: e.late, cellId: e.cellId })),
    ];

    const reportsSubmitted = allUnifiedReports.length;
    const approvedReports = allUnifiedReports.filter(r => r.status === 'Approved' || r.status === 'approved').length;
    const awaitingReviewCount = allUnifiedReports.filter(
      r => r.status === 'Newly Submitted' || r.status === 'submitted' || r.status === 'under_review'
    ).length;
    const needsCorrectionCount = allUnifiedReports.filter(
      r => r.status === 'Needs Correction' || r.status === 'needs_revision'
    ).length;
    const lateReports = allUnifiedReports.filter(r => Boolean(r.late)).length;

    // Missing cells: registered cells with 0 meeting reports
    const submittedCellIds = new Set(scopedMeetings.map(m => m.cellId));
    const missingCellsCount = scopedCells.filter(c => c.is_active && !submittedCellIds.has(c.id)).length;

    // Evangelism numbers
    const soulsWon = scopedEvang.reduce((sum, e) => sum + (Number(e.conversions) || 0), 0);
    const peopleReached = scopedEvang.reduce((sum, e) => sum + (Number(e.peopleSpokenTo) || 0), 0);
    const contactsCaptured = scopedContacts.length;

    const followUpsCompleted = scopedContacts.filter(
      c => c.followUpStatus === 'Joined Ministry' || c.followUpStatus === 'Completed'
    ).length;

    const outstandingFollowUps = scopedContacts.filter(
      c => c.followUpStatus === 'New Contact' || c.followUpStatus === 'Follow-up Pending'
    ).length;

    // Meeting attendance
    const totalAttendance = scopedMeetings.reduce((sum, m) => sum + (Number(m.attendance) || 0), 0);
    const visitorsRecorded = scopedMeetings.reduce((sum, m) => sum + (Number(m.absentees) || 0), 0);

    // Compliance rate
    const complianceRate = totalCells > 0 ? Math.round(((totalCells - missingCellsCount) / totalCells) * 100) : 0;

    return {
      totalCells,
      activeCellLeaders,
      reportsSubmitted,
      approvedReports,
      pendingReports: awaitingReviewCount + needsCorrectionCount,
      awaitingReviewCount,
      needsCorrectionCount,
      lateReports,
      missingCellsCount,
      soulsWon,
      peopleReached,
      contactsCaptured,
      followUpsCompleted,
      outstandingFollowUps,
      visitorsRecorded,
      totalAttendance,
      complianceRate,
    };
  }

  static async getWeeklyTrends(role: UserRole, userRegionId?: string, userCellId?: string) {
    const isAdmin =
      role === 'admin' || role === 'super_admin' || role === 'national_admin' || role === 'regional_leader';

    const [meetings, evang] = await Promise.all([
      ReportService.getCellMeetingReports(),
      ReportService.getEvangelismReports(),
    ]);

    let fMeetings = meetings;
    let fEvang = evang;
    if (!isAdmin && userCellId) {
      fMeetings = meetings.filter(m => m.cellId === userCellId);
      fEvang = evang.filter(e => e.cellId === userCellId);
    }

    const periods = await ReportService.getPeriods();

    return periods.map(p => {
      const attendance = fMeetings.reduce((sum, m) => sum + (Number(m.attendance) || 0), 0);
      const peopleReached = fEvang.reduce((sum, e) => sum + (Number(e.peopleSpokenTo) || 0), 0);
      const soulsWon = fEvang.reduce((sum, e) => sum + (Number(e.conversions) || 0), 0);

      return {
        week: p.name.replace('2026 - ', ''),
        attendance,
        visitors: peopleReached,
        soulsWon,
      };
    });
  }

  static async getRegionalPerformance() {
    const regions = await ReportService.getRegions();
    const cells = await CellService.getCells();
    const meetings = await ReportService.getCellMeetingReports();
    const evang = await ReportService.getEvangelismReports();

    return regions.map(reg => {
      const regCells = cells.filter(c => c.region_id === reg.id);
      const regCellIds = new Set(regCells.map(c => c.id));

      const regMeetings = meetings.filter(m => regCellIds.has(m.cellId));
      const regEvang = evang.filter(e => regCellIds.has(e.cellId));

      const souls = regEvang.reduce((s, e) => s + (Number(e.conversions) || 0), 0);
      const visitors = regEvang.reduce((v, e) => v + (Number(e.peopleSpokenTo) || 0), 0);
      const attendance = regMeetings.reduce((a, m) => a + (Number(m.attendance) || 0), 0);

      const submittedCount = regMeetings.filter(m => m.status === 'Approved' || m.status === 'Newly Submitted').length;
      const totalCells = regCells.length || 1;
      const compliance = regCells.length > 0 ? Math.min(100, Math.round((submittedCount / totalCells) * 100)) : 0;

      return {
        id: reg.id,
        name: reg.name,
        code: reg.code,
        cells: regCells.length,
        compliance,
        souls,
        visitors,
        attendance,
      };
    });
  }
}
