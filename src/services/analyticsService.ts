import { DashboardStats, UserRole, CellPerformanceRecord } from '../types';
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

  /**
   * Cell Breakdown & Compliance
   * Aggregates real operational performance strictly for signed-up cells from real submitted reports.
   */
  static async getCellPerformance(): Promise<CellPerformanceRecord[]> {
    const [cells, meetings, evang, allProfiles] = await Promise.all([
      CellService.getCells(),
      ReportService.getCellMeetingReports(),
      ReportService.getEvangelismReports(),
      Promise.resolve(AuthService.getAllProfiles()),
    ]);

    return cells.map(cell => {
      const cellMeetings = meetings.filter(m => m.cellId === cell.id);
      const cellEvang = evang.filter(e => e.cellId === cell.id);

      // Identify assigned tutor / leader
      const tutorProfile = allProfiles.find(
        p => p.cell_id === cell.id || p.id === cell.tutorUid || p.full_name.toLowerCase() === (cell.leader_name || '').toLowerCase()
      );
      const leaderName = cell.leader_name || tutorProfile?.full_name || 'Assigned Tutor';
      const leaderPhone = cell.leader_phone || tutorProfile?.phone_number || '';

      // Attendance
      const totalAttendance = cellMeetings.reduce((sum, m) => sum + (Number(m.attendance) || 0), 0);

      // Souls won: outreach conversions + cell meeting new converts/members
      const soulsFromEvang = cellEvang.reduce((sum, e) => sum + (Number(e.conversions) || 0), 0);
      const soulsFromCell = cellMeetings.reduce((sum, m) => sum + (Number(m.newMembers) || 0), 0);
      const soulsWon = soulsFromEvang + soulsFromCell;

      // People reached through evangelism
      const peopleReached = cellEvang.reduce((sum, e) => sum + (Number(e.peopleSpokenTo) || 0), 0);

      // Offerings reported (GHS)
      const offeringsGhs = cellMeetings.reduce(
        (sum, m) => sum + (Number(m.offering) || Number((m as any).offering_amount) || 0),
        0
      );

      // Check latest report status across meeting and evangelism
      const combinedReports = [
        ...cellMeetings.map(m => ({
          type: 'meeting',
          status: m.status,
          date: m.meetingDate || m.submittedAt,
          late: m.late,
          createdAt: m.submittedAt || m.meetingDate,
        })),
        ...cellEvang.map(e => ({
          type: 'evangelism',
          status: e.status,
          date: e.date || e.submittedAt,
          late: e.late,
          createdAt: e.submittedAt || e.date,
        })),
      ].sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

      const latest = combinedReports[0];

      let compliance = 0;
      let status: 'On Track' | 'Awaiting Review' | 'Needs Correction' | 'Missing Report' = 'Missing Report';
      let statusColor: 'emerald' | 'amber' | 'rose' = 'rose';

      if (!latest) {
        compliance = 0;
        status = 'Missing Report';
        statusColor = 'rose';
      } else if (latest.status === 'Needs Correction' || latest.status === 'needs_revision') {
        compliance = 60;
        status = 'Needs Correction';
        statusColor = 'rose';
      } else if (latest.status === 'Newly Submitted' || latest.status === 'submitted' || latest.status === 'under_review') {
        compliance = latest.late ? 75 : 90;
        status = 'Awaiting Review';
        statusColor = 'amber';
      } else if (latest.status === 'Approved' || latest.status === 'approved') {
        compliance = latest.late ? 85 : 100;
        status = 'On Track';
        statusColor = 'emerald';
      } else {
        compliance = 50;
        status = 'Missing Report';
        statusColor = 'rose';
      }

      return {
        id: cell.id,
        name: cell.name,
        code: cell.code || `FNI-CEL-${cell.name.slice(0, 3).toUpperCase()}`,
        leaderName,
        leaderPhone,
        location: cell.venue_address || cell.location || 'Local Fellowship Base',
        targetAttendance: cell.target_attendance || 20,
        meetingReportsCount: cellMeetings.length,
        evangelismReportsCount: cellEvang.length,
        totalAttendance,
        soulsWon,
        peopleReached,
        offeringsGhs,
        compliance,
        status,
        statusColor,
        latestMeetingDate: cellMeetings[0]?.meetingDate,
        latestSubmissionIso: latest?.createdAt,
      };
    });
  }

  // Legacy method mapped to cell performance
  static async getRegionalPerformance() {
    const cellStats = await this.getCellPerformance();
    return cellStats.map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      cells: 1,
      compliance: c.compliance,
      souls: c.soulsWon,
      attendance: c.totalAttendance,
      visitors: c.peopleReached,
    }));
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
