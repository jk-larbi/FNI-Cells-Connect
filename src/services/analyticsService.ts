import { DashboardStats, UserRole } from '../types';
import { ReportService } from './reportService';
import { CellService } from './cellService';
import { FollowUpService } from './followUpService';
import { SettingsService } from './settingsService';
import { AuthService } from './authService';

export class AnalyticsService {
  static async getDashboardStats(
    role: UserRole,
    userRegionId?: string,
    userCellId?: string
  ): Promise<DashboardStats> {
    const isAdmin =
      role === 'admin' || role === 'super_admin' || role === 'national_admin' || role === 'regional_leader';

    const [allCells, meetingReports, evangelismReports, contacts, settings, allProfiles] = await Promise.all([
      CellService.getCells(),
      ReportService.getCellMeetingReports(),
      ReportService.getEvangelismReports(),
      FollowUpService.getContacts(),
      SettingsService.getSettings(),
      Promise.resolve(AuthService.getAllProfiles()),
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
    const registeredTutors = allProfiles.filter(p => p.role === 'tutor' || p.role === 'cell_leader');
    const activeCellLeaders = isAdmin ? registeredTutors.length : (scopedCells.filter(c => c.is_active && c.tutorUid).length || 1);

    // Meeting and Evangelism counts
    const meetingReportsSubmitted = scopedMeetings.length;
    const evangelismReportsSubmitted = scopedEvang.length;

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

    // Missing cells: registered cells with 0 meeting reports for the current cycle
    const submittedCellIds = new Set(scopedMeetings.map(m => m.cellId));
    const missingCellsCount = scopedCells.filter(c => c.is_active && !submittedCellIds.has(c.id)).length;

    // Evangelism numbers
    const soulsWon = scopedEvang.reduce((sum, e) => sum + (Number(e.conversions) || 0), 0);
    const peopleReached = scopedEvang.reduce((sum, e) => sum + (Number(e.peopleSpokenTo) || 0), 0);
    const contactsCaptured = scopedContacts.length;
    const interestedInMinistry = scopedEvang.reduce((sum, e) => sum + (Number(e.interestedInMinistry) || 0), 0);

    const followUpsCompleted = scopedContacts.filter(
      c => c.followUpStatus === 'Joined Ministry' || c.followUpStatus === 'Completed'
    ).length;

    const outstandingFollowUps = scopedContacts.filter(
      c => c.followUpStatus === 'New Contact' || c.followUpStatus === 'Follow-up Pending' || c.followUpStatus === 'Contacted' || c.followUpStatus === 'Interested'
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
      meetingReportsSubmitted,
      evangelismReportsSubmitted,
      approvedReports,
      pendingReports: awaitingReviewCount + needsCorrectionCount,
      awaitingReviewCount,
      needsCorrectionCount,
      lateReports,
      missingCellsCount,
      soulsWon,
      peopleReached,
      contactsCaptured,
      interestedInMinistry,
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
        attendance,
        visitors,
      };
    });
  }

  static async exportAnalyticsCsv(): Promise<string> {
    const [cells, meetings, evang, contacts] = await Promise.all([
      CellService.getCells(),
      ReportService.getCellMeetingReports(),
      ReportService.getEvangelismReports(),
      FollowUpService.getContacts(),
    ]);

    const rows = [
      ['Cell Name', 'Location', 'Leader', 'Meeting Reports', 'Attendance', 'Evangelism Reports', 'People Reached', 'Souls Won', 'Follow-ups Completed'],
    ];

    cells.forEach(cell => {
      const cellMeetings = meetings.filter(m => m.cellId === cell.id);
      const cellEvang = evang.filter(e => e.cellId === cell.id);
      const cellContacts = contacts.filter(c => c.cellId === cell.id);

      const totalAttendance = cellMeetings.reduce((sum, m) => sum + (Number(m.attendance) || 0), 0);
      const peopleReached = cellEvang.reduce((sum, e) => sum + (Number(e.peopleSpokenTo) || 0), 0);
      const soulsWon = cellEvang.reduce((sum, e) => sum + (Number(e.conversions) || 0), 0);
      const completedFollowUps = cellContacts.filter(c => c.followUpStatus === 'Joined Ministry' || c.followUpStatus === 'Completed').length;

      rows.push([
        `"${cell.name}"`,
        `"${cell.location || ''}"`,
        `"${cell.leader_name || ''}"`,
        cellMeetings.length.toString(),
        totalAttendance.toString(),
        cellEvang.length.toString(),
        peopleReached.toString(),
        soulsWon.toString(),
        completedFollowUps.toString(),
      ]);
    });

    return rows.map(r => r.join(',')).join('\n');
  }
}
