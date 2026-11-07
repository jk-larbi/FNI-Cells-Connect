import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  CellMeetingReport,
  EvangelismReport,
  UnifiedReportItem,
  ReportStatus,
  CellReport,
  Cell,
  Region,
  ReportingPeriod,
  AuditLog,
} from '../types';
import { evaluateSubmissionTiming, getCurrentDeadlineInfo } from '../utils/deadlineUtil';
import { CellService } from './cellService';

const STORAGE_KEYS = {
  MEETING_REPORTS: 'fni_meeting_reports_v5_clean',
  EVANGELISM_REPORTS: 'fni_evangelism_reports_v5_clean',
  LEGACY_REPORTS: 'fni_reports_store_v5_clean_prod',
  REGIONS: 'fni_regions_store_v5_clean_prod',
  PERIODS: 'fni_periods_store_v5_clean_prod',
  AUDIT: 'fni_audit_store_v5_clean_prod',
};

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to store locally', e);
  }
}

export class ReportService {
  // =========================================================================
  // 1. CELL MEETING REPORTS
  // =========================================================================

  static async getCellMeetingReports(filters?: {
    cellId?: string;
    tutorUid?: string;
    status?: ReportStatus;
  }): Promise<CellMeetingReport[]> {
    if (isFirebaseConfigured && db) {
      try {
        const ref = collection(db, 'cellMeetingReports');
        let q = query(ref, orderBy('submittedAt', 'desc'));
        if (filters?.cellId) q = query(ref, where('cellId', '==', filters.cellId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CellMeetingReport));
          if (filters?.tutorUid) list = list.filter(r => r.tutorUid === filters.tutorUid);
          if (filters?.status) list = list.filter(r => r.status === filters.status);
          setStored(STORAGE_KEYS.MEETING_REPORTS, list);
          return list;
        }
      } catch (e) {
        console.warn('Firebase getCellMeetingReports error', e);
      }
    }

    let reports = getStored<CellMeetingReport[]>(STORAGE_KEYS.MEETING_REPORTS, []);
    if (filters?.cellId) reports = reports.filter(r => r.cellId === filters.cellId);
    if (filters?.tutorUid) reports = reports.filter(r => r.tutorUid === filters.tutorUid);
    if (filters?.status) reports = reports.filter(r => r.status === filters.status);
    return reports.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  static async submitCellMeetingReport(data: {
    id?: string;
    cellId: string;
    tutorUid: string;
    cellName: string;
    meetingDate: string;
    tutorName: string;
    members: number;
    activeMembers: number;
    attendance: number;
    newMembers: number;
    absentees: number;
    followUpNeeded: number;
    offering?: number;
    tutorNotes?: string;
    testimonies?: string;
    isDraft?: boolean;
  }): Promise<CellMeetingReport> {
    const nowIso = new Date().toISOString();
    const deadlineInfo = getCurrentDeadlineInfo();
    const timing = evaluateSubmissionTiming(nowIso, deadlineInfo.deadlineIso);

    // Duplicate check: Prevent duplicate submissions for same cell and meetingDate
    const existing = await this.getCellMeetingReports({ cellId: data.cellId });
    const duplicate = existing.find(
      r => r.meetingDate === data.meetingDate && r.id !== data.id && r.status !== 'Needs Correction'
    );
    if (duplicate && !data.isDraft) {
      throw new Error(`A cell meeting report for "${data.cellName}" on ${data.meetingDate} has already been submitted.`);
    }

    const reportId = data.id || `cmr-${Date.now()}`;
    const report: CellMeetingReport = {
      id: reportId,
      cellId: data.cellId,
      tutorUid: data.tutorUid,
      cellName: data.cellName,
      meetingDate: data.meetingDate,
      tutorName: data.tutorName,
      members: Number(data.members || 0),
      activeMembers: Number(data.activeMembers || 0),
      attendance: Number(data.attendance || 0),
      newMembers: Number(data.newMembers || 0),
      absentees: Number(data.absentees || 0),
      followUpNeeded: Number(data.followUpNeeded || 0),
      offering: data.offering ? Number(data.offering) : undefined,
      tutorNotes: data.tutorNotes || '',
      testimonies: data.testimonies || '',
      status: 'Newly Submitted',
      submittedAt: nowIso,
      late: timing.isLate,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'cellMeetingReports', reportId), {
          ...report,
          serverTimestamp: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firebase setDoc cellMeetingReports error', e);
      }
    }

    const list = getStored<CellMeetingReport[]>(STORAGE_KEYS.MEETING_REPORTS, []);
    const idx = list.findIndex(r => r.id === reportId);
    if (idx >= 0) {
      list[idx] = report;
    } else {
      list.unshift(report);
    }
    setStored(STORAGE_KEYS.MEETING_REPORTS, list);

    this.recordAuditLog({
      action: timing.isLate ? 'SUBMIT_LATE_MEETING_REPORT' : 'SUBMIT_MEETING_REPORT',
      entity_type: 'cellMeetingReports',
      entity_id: reportId,
      details: {
        cellName: report.cellName,
        meetingDate: report.meetingDate,
        attendance: report.attendance,
        late: report.late,
      },
    });

    return report;
  }

  // =========================================================================
  // 2. EVANGELISM REPORTS
  // =========================================================================

  static async getEvangelismReports(filters?: {
    cellId?: string;
    tutorUid?: string;
    status?: ReportStatus;
  }): Promise<EvangelismReport[]> {
    if (isFirebaseConfigured && db) {
      try {
        const ref = collection(db, 'evangelismReports');
        let q = query(ref, orderBy('submittedAt', 'desc'));
        if (filters?.cellId) q = query(ref, where('cellId', '==', filters.cellId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as EvangelismReport));
          if (filters?.tutorUid) list = list.filter(r => r.tutorUid === filters.tutorUid);
          if (filters?.status) list = list.filter(r => r.status === filters.status);
          setStored(STORAGE_KEYS.EVANGELISM_REPORTS, list);
          return list;
        }
      } catch (e) {
        console.warn('Firebase getEvangelismReports error', e);
      }
    }

    let reports = getStored<EvangelismReport[]>(STORAGE_KEYS.EVANGELISM_REPORTS, []);
    if (filters?.cellId) reports = reports.filter(r => r.cellId === filters.cellId);
    if (filters?.tutorUid) reports = reports.filter(r => r.tutorUid === filters.tutorUid);
    if (filters?.status) reports = reports.filter(r => r.status === filters.status);
    return reports.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  static async submitEvangelismReport(data: {
    id?: string;
    cellId: string;
    tutorUid: string;
    cellName: string;
    tutorName: string;
    date: string;
    location: string;
    teamMembers: string[];
    peopleSpokenTo: number;
    contactsCaptured: number;
    conversions: number;
    interestedInMinistry: number;
    potentialFollowUps: number;
    messageUsed: string;
    notes: string;
    testimonies?: string;
  }): Promise<EvangelismReport> {
    const nowIso = new Date().toISOString();
    const deadlineInfo = getCurrentDeadlineInfo();
    const timing = evaluateSubmissionTiming(nowIso, deadlineInfo.deadlineIso);

    const reportId = data.id || `evr-${Date.now()}`;
    const report: EvangelismReport = {
      id: reportId,
      cellId: data.cellId,
      tutorUid: data.tutorUid,
      cellName: data.cellName,
      tutorName: data.tutorName,
      date: data.date,
      location: data.location,
      teamMembers: data.teamMembers || [],
      peopleSpokenTo: Number(data.peopleSpokenTo || 0),
      contactsCaptured: Number(data.contactsCaptured || 0),
      conversions: Number(data.conversions || 0),
      interestedInMinistry: Number(data.interestedInMinistry || 0),
      potentialFollowUps: Number(data.potentialFollowUps || 0),
      messageUsed: data.messageUsed || '',
      notes: data.notes || '',
      testimonies: data.testimonies || '',
      status: 'Newly Submitted',
      submittedAt: nowIso,
      late: timing.isLate,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'evangelismReports', reportId), {
          ...report,
          serverTimestamp: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firebase setDoc evangelismReports error', e);
      }
    }

    const list = getStored<EvangelismReport[]>(STORAGE_KEYS.EVANGELISM_REPORTS, []);
    const idx = list.findIndex(r => r.id === reportId);
    if (idx >= 0) {
      list[idx] = report;
    } else {
      list.unshift(report);
    }
    setStored(STORAGE_KEYS.EVANGELISM_REPORTS, list);

    this.recordAuditLog({
      action: timing.isLate ? 'SUBMIT_LATE_EVANGELISM_REPORT' : 'SUBMIT_EVANGELISM_REPORT',
      entity_type: 'evangelismReports',
      entity_id: reportId,
      details: {
        cellName: report.cellName,
        date: report.date,
        peopleSpokenTo: report.peopleSpokenTo,
        conversions: report.conversions,
        contactsCaptured: report.contactsCaptured,
        late: report.late,
      },
    });

    return report;
  }

  // =========================================================================
  // 3. UNIFIED REVIEW QUEUE (Cell Meeting + Evangelism Reports)
  // =========================================================================

  static async getUnifiedReviewQueue(filters?: {
    reportType?: 'all' | 'meeting' | 'evangelism';
    cellId?: string;
    tutorUid?: string;
    status?: ReportStatus | 'all';
    searchQuery?: string;
  }): Promise<UnifiedReportItem[]> {
    const [meetingReps, evangReps] = await Promise.all([
      this.getCellMeetingReports(),
      this.getEvangelismReports(),
    ]);

    const formattedMeetings: UnifiedReportItem[] = meetingReps.map(m => ({
      ...m,
      reportType: 'meeting',
    }));

    const formattedEvang: UnifiedReportItem[] = evangReps.map(e => ({
      ...e,
      reportType: 'evangelism',
    }));

    let combined: UnifiedReportItem[] = [];
    if (!filters?.reportType || filters.reportType === 'all') {
      combined = [...formattedMeetings, ...formattedEvang];
    } else if (filters.reportType === 'meeting') {
      combined = formattedMeetings;
    } else if (filters.reportType === 'evangelism') {
      combined = formattedEvang;
    }

    if (filters?.cellId && filters.cellId !== 'all') {
      combined = combined.filter(r => r.cellId === filters.cellId);
    }
    if (filters?.tutorUid && filters.tutorUid !== 'all') {
      combined = combined.filter(r => r.tutorUid === filters.tutorUid);
    }
    if (filters?.status && filters.status !== 'all') {
      combined = combined.filter(r => r.status === filters.status);
    }
    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      combined = combined.filter(
        r =>
          r.cellName.toLowerCase().includes(q) ||
          r.tutorName.toLowerCase().includes(q)
      );
    }

    return combined.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  static async reviewReport(
    reportId: string,
    arg2: 'meeting' | 'evangelism' | ReportStatus | string,
    arg3: 'Approved' | 'Needs Correction' | string,
    arg4: string,
    arg5?: string,
    arg6?: string
  ): Promise<any> {
    const isFiveArgs = arg6 === undefined;
    const reportType: 'meeting' | 'evangelism' = isFiveArgs ? 'meeting' : (arg2 as 'meeting' | 'evangelism');
    const rawStatus = isFiveArgs ? (arg2 as string) : (arg3 as string);
    const comment = isFiveArgs ? (arg3 as string) : arg4;
    const reviewerUid = isFiveArgs ? (arg4 as string) : (arg5 || '');
    const reviewerName = isFiveArgs ? (arg5 || 'Admin') : (arg6 || 'Admin');

    const status: ReportStatus =
      rawStatus === 'approved' || rawStatus === 'Approved'
        ? 'Approved'
        : rawStatus === 'needs_revision' || rawStatus === 'Needs Correction'
        ? 'Needs Correction'
        : (rawStatus as ReportStatus);

    const nowIso = new Date().toISOString();
    const collectionName = reportType === 'meeting' ? 'cellMeetingReports' : 'evangelismReports';

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, collectionName, reportId), {
          status,
          reviewerComment: comment,
          reviewedBy: reviewerUid,
          reviewedByName: reviewerName,
          reviewedAt: nowIso,
          serverReviewedAt: serverTimestamp(),
        });

        // Record in reviewLogs
        await addDoc(collection(db, 'reviewLogs'), {
          reportId,
          reportType,
          status,
          comment,
          reviewerUid,
          reviewerName,
          timestamp: serverTimestamp(),
          createdAt: nowIso,
        });
      } catch (e) {
        console.warn('Firebase reviewReport error', e);
      }
    }

    let updatedReport: any = null;

    // Local storage updates
    if (reportType === 'meeting') {
      const list = getStored<CellMeetingReport[]>(STORAGE_KEYS.MEETING_REPORTS, []);
      const idx = list.findIndex(r => r.id === reportId);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          status,
          reviewerComment: comment,
          reviewedBy: reviewerUid,
          reviewedByName: reviewerName,
          reviewedAt: nowIso,
        };
        setStored(STORAGE_KEYS.MEETING_REPORTS, list);
        updatedReport = list[idx];
      }
    } else {
      const list = getStored<EvangelismReport[]>(STORAGE_KEYS.EVANGELISM_REPORTS, []);
      const idx = list.findIndex(r => r.id === reportId);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          status,
          reviewerComment: comment,
          reviewedBy: reviewerUid,
          reviewedByName: reviewerName,
          reviewedAt: nowIso,
        };
        setStored(STORAGE_KEYS.EVANGELISM_REPORTS, list);
        updatedReport = list[idx];
      }
    }

    this.recordAuditLog({
      action: status === 'Approved' ? 'APPROVE_REPORT' : 'RETURN_REPORT_FOR_CORRECTION',
      entity_type: collectionName,
      entity_id: reportId,
      details: {
        status,
        comment,
        reviewer: reviewerName,
      },
    });

    return updatedReport;
  }

  static async bulkApproveReports(
    reports: { id: string; reportType: 'meeting' | 'evangelism' }[],
    reviewerUid: string,
    reviewerName: string
  ): Promise<number> {
    let approvedCount = 0;
    for (const item of reports) {
      try {
        await this.reviewReport(item.id, item.reportType, 'Approved', 'Bulk approved by church administration.', reviewerUid, reviewerName);
        approvedCount++;
      } catch (e) {
        console.warn('Error in bulk approval item', item.id, e);
      }
    }
    return approvedCount;
  }

  // =========================================================================
  // 4. CELLS & REGIONS DELEGATION
  // =========================================================================

  static async getCells(): Promise<Cell[]> {
    return CellService.getCells();
  }

  static async addCell(cell: Cell): Promise<void> {
    return CellService.updateCell(cell);
  }

  static async updateCell(cell: Cell): Promise<void> {
    return CellService.updateCell(cell);
  }

  static async getRegions(): Promise<Region[]> {
    const list = getStored<Region[]>(STORAGE_KEYS.REGIONS, [
      {
        id: 'reg-lagos',
        name: 'Lagos Central Region',
        code: 'FNI-REG-LOS',
        country: 'Nigeria',
        state_province: 'Lagos',
        total_cells: 0,
        active_cells: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'reg-abuja',
        name: 'Abuja Capital Region',
        code: 'FNI-REG-ABJ',
        country: 'Nigeria',
        state_province: 'FCT Abuja',
        total_cells: 0,
        active_cells: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'reg-london',
        name: 'London Diaspora Region',
        code: 'FNI-REG-LON',
        country: 'United Kingdom',
        state_province: 'Greater London',
        total_cells: 0,
        active_cells: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'reg-accra',
        name: 'Accra Hub Region',
        code: 'FNI-REG-ACC',
        country: 'Ghana',
        state_province: 'Greater Accra',
        total_cells: 0,
        active_cells: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    return list;
  }

  static async addRegion(region: Region): Promise<void> {
    const list = await this.getRegions();
    setStored(STORAGE_KEYS.REGIONS, [...list, region]);
  }

  static async getPeriods(): Promise<ReportingPeriod[]> {
    return getStored<ReportingPeriod[]>(STORAGE_KEYS.PERIODS, [
      {
        id: 'prd-w45',
        name: '2026 - Week 45',
        year: 2026,
        week_number: 45,
        start_date: '2026-11-02',
        end_date: '2026-11-08',
        submission_deadline: '2026-11-08T18:00:00Z',
        is_open: true,
        created_at: '2026-11-01T00:00:00Z',
      },
    ]);
  }

  static async addPeriod(period: ReportingPeriod): Promise<void> {
    const list = await this.getPeriods();
    setStored(STORAGE_KEYS.PERIODS, [period, ...list]);
  }

  // Missing cells: registered cells with no report submitted for the cycle
  static async getMissingCells(periodId = 'prd-w45'): Promise<Cell[]> {
    const cells = await this.getCells();
    const meetingReports = await this.getCellMeetingReports();
    const submittedCellIds = new Set(
      meetingReports.filter(r => r.status === 'Newly Submitted' || r.status === 'Approved').map(r => r.cellId)
    );
    return cells.filter(c => c.is_active && !submittedCellIds.has(c.id));
  }

  // Backward compatibility method
  static async getReports(filters?: {
    regionId?: string;
    cellId?: string;
    periodId?: string;
    status?: any;
    isLate?: boolean;
  }): Promise<CellReport[]> {
    const meetings = await this.getCellMeetingReports({ cellId: filters?.cellId });
    return meetings.map(m => ({
      id: m.id,
      cell_id: m.cellId,
      cell_name: m.cellName,
      region_id: 'reg-lagos',
      region_name: 'Lagos Central Region',
      period_id: 'prd-w45',
      period_name: '2026 - Week 45',
      submitted_by: m.tutorUid,
      submitted_by_name: m.tutorName,
      status: m.status as any,
      members_present: m.members,
      visitors_count: m.absentees,
      total_attendance: m.attendance,
      souls_won: 0,
      evangelism_outreaches_held: 0,
      follow_ups_conducted: m.followUpNeeded,
      first_timers_contacted: 0,
      converts_established: 0,
      meeting_held: true,
      meeting_date: m.meetingDate,
      meeting_topic: m.tutorNotes || '',
      offering_amount: m.offering || 0,
      submitted_at: m.submittedAt,
      is_late: m.late,
      created_at: m.submittedAt,
      updated_at: m.submittedAt,
    }));
  }

  static async submitReport(reportData: Partial<CellReport>): Promise<CellReport> {
    const res = await this.submitCellMeetingReport({
      id: reportData.id,
      cellId: reportData.cell_id || '',
      tutorUid: reportData.submitted_by || '',
      cellName: reportData.cell_name || 'Fellowship Cell',
      meetingDate: reportData.meeting_date || new Date().toISOString().split('T')[0],
      tutorName: reportData.submitted_by_name || 'Tutor',
      members: reportData.members_present || 0,
      activeMembers: reportData.members_present || 0,
      attendance: reportData.total_attendance || (Number(reportData.members_present || 0) + Number(reportData.visitors_count || 0)),
      newMembers: reportData.first_timers_contacted || 0,
      absentees: reportData.visitors_count || 0,
      followUpNeeded: reportData.follow_ups_conducted || 0,
      offering: reportData.offering_amount,
      tutorNotes: reportData.additional_remarks || reportData.meeting_topic,
    });
    return {
      id: res.id,
      cell_id: res.cellId,
      cell_name: res.cellName,
      period_id: 'prd-w45',
      submitted_by: res.tutorUid,
      submitted_by_name: res.tutorName,
      status: res.status as any,
      members_present: res.members,
      visitors_count: res.absentees,
      total_attendance: res.attendance,
      souls_won: 0,
      evangelism_outreaches_held: 0,
      follow_ups_conducted: res.followUpNeeded,
      first_timers_contacted: res.newMembers,
      converts_established: 0,
      meeting_held: true,
      meeting_date: res.meetingDate,
      meeting_topic: res.tutorNotes || '',
      offering_amount: res.offering,
      submitted_at: res.submittedAt,
      is_late: res.late,
      created_at: res.submittedAt,
      updated_at: res.submittedAt,
    };
  }

  // Audit Logs
  static async getAuditLogs(): Promise<AuditLog[]> {
    return getStored<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
  }

  static recordAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): void {
    const currentLogs = getStored<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
    const newLog: AuditLog = {
      ...log,
      id: `aud-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setStored(STORAGE_KEYS.AUDIT, [newLog, ...currentLogs]);
  }

  static resetToCleanSlate(): void {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('fni_cells_store_v5_clean');
    localStorage.removeItem('fni_contacts_store_v5_clean');
    localStorage.removeItem('fni_system_settings_v5_clean');
  }
}
