import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  CellReport,
  Cell,
  Region,
  ReportingPeriod,
  Profile,
  AuditLog,
  NotificationItem,
  ReportStatus,
  ReportReview,
} from '../types';
import { evaluateSubmissionTiming, getCurrentDeadlineInfo } from '../utils/deadlineUtil';

export class FirebaseService {
  // --- Cell Reports ---
  static async getReports(filters?: {
    cellId?: string;
    periodId?: string;
    status?: ReportStatus;
    regionId?: string;
    isLate?: boolean;
  }): Promise<CellReport[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const reportsRef = collection(db, 'cell_reports');
      let q = query(reportsRef, orderBy('created_at', 'desc'));

      if (filters?.cellId) {
        q = query(reportsRef, where('cell_id', '==', filters.cellId));
      }

      const snap = await getDocs(q);
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CellReport));

      if (filters?.periodId) {
        list = list.filter(r => r.period_id === filters.periodId);
      }
      if (filters?.status) {
        list = list.filter(r => r.status === filters.status);
      }
      if (filters?.regionId) {
        list = list.filter(r => r.region_id === filters.regionId);
      }
      if (typeof filters?.isLate === 'boolean') {
        list = list.filter(r => Boolean(r.is_late) === filters.isLate);
      }

      return list;
    } catch (e) {
      console.warn('Firebase getReports error', e);
      return [];
    }
  }

  static async submitReport(report: CellReport): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      const reportsRef = collection(db, 'cell_reports');
      const nowIso = new Date().toISOString();

      // Check deadline timing: Sunday 6:00 PM Ghana Time (Africa/Accra, UTC+0)
      const deadlineIso = report.deadline || getCurrentDeadlineInfo().deadlineIso;
      const timingResult = evaluateSubmissionTiming(nowIso, deadlineIso);

      const payload: CellReport = {
        ...report,
        is_late: timingResult.isLate,
        submission_timing: timingResult.timing,
        deadline: deadlineIso,
        submitted_at: report.status === 'draft' ? undefined : (report.submitted_at || nowIso),
        updated_at: nowIso,
      };

      await setDoc(doc(reportsRef, report.id), payload);

      // Record audit log
      await this.recordAuditLog({
        action: report.status === 'draft' ? 'SAVE_DRAFT_FIREBASE' : (timingResult.isLate ? 'SUBMIT_LATE_REPORT_FIREBASE' : 'SUBMIT_REPORT_FIREBASE'),
        entity_type: 'cell_reports',
        entity_id: report.id,
        details: {
          cell_name: report.cell_name,
          period: report.period_name,
          is_late: timingResult.isLate,
          timing: timingResult.timing,
          total_attendance: report.total_attendance,
          souls_won: report.souls_won,
        },
      });
    } catch (e) {
      console.warn('Firebase submitReport error', e);
    }
  }

  static async reviewReport(
    reportId: string,
    newStatus: ReportStatus,
    feedback: string,
    reviewerId: string,
    reviewerName: string
  ): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      const nowIso = new Date().toISOString();
      const reportRef = doc(db, 'cell_reports', reportId);
      const snap = await getDoc(reportRef);
      if (!snap.exists()) return;

      const prev = snap.data() as CellReport;
      const updatedRemarks = feedback
        ? `${prev.additional_remarks ? prev.additional_remarks + '\n\n' : ''}[Admin Feedback - ${reviewerName}]: ${feedback}`
        : prev.additional_remarks;

      await updateDoc(reportRef, {
        status: newStatus,
        reviewed_by: reviewerId,
        reviewed_by_name: reviewerName,
        last_reviewed_at: nowIso,
        updated_at: nowIso,
        additional_remarks: updatedRemarks,
      });

      // Save formal review entry
      const reviewsRef = collection(db, 'report_reviews');
      const reviewRecord: ReportReview = {
        id: `rev-${Date.now()}`,
        report_id: reportId,
        reviewer_id: reviewerId,
        reviewer_name: reviewerName,
        reviewer_role: 'admin',
        previous_status: prev.status,
        new_status: newStatus,
        feedback,
        created_at: nowIso,
      };
      await setDoc(doc(reviewsRef, reviewRecord.id), reviewRecord);

      // Send in-app notification to the submitting leader
      if (prev.submitted_by) {
        await this.sendNotification({
          user_id: prev.submitted_by,
          title: newStatus === 'approved' ? 'Weekly Report Approved' : 'Report Returned for Revision',
          message: newStatus === 'approved'
            ? `Your Week ${prev.period_name || 'report'} for ${prev.cell_name} has been reviewed and approved.`
            : `Your report for ${prev.cell_name} requires revision: "${feedback}"`,
          type: newStatus === 'approved' ? 'report_approved' : 'revision_requested',
          channel: 'in_app',
          is_read: false,
          metadata: { report_id: reportId, status: newStatus },
        });
      }
    } catch (e) {
      console.warn('Firebase reviewReport error', e);
    }
  }

  // --- Cells ---
  static async getCells(): Promise<Cell[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const cellsRef = collection(db, 'cells');
      const snap = await getDocs(cellsRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Cell));
    } catch (e) {
      console.warn('Firebase getCells error', e);
      return [];
    }
  }

  static async addCell(cell: Cell): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      await setDoc(doc(db, 'cells', cell.id), cell);
      await this.recordAuditLog({
        action: 'REGISTER_CELL_FIREBASE',
        entity_type: 'cells',
        entity_id: cell.id,
        details: { cell_name: cell.name, code: cell.code, region_id: cell.region_id },
      });
    } catch (e) {
      console.warn('Firebase addCell error', e);
    }
  }

  static async updateCell(cell: Cell): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      await setDoc(doc(db, 'cells', cell.id), cell, { merge: true });
    } catch (e) {
      console.warn('Firebase updateCell error', e);
    }
  }

  // --- Missing Cells Inspection ---
  static async getMissingCells(periodId: string): Promise<Cell[]> {
    const cells = await this.getCells();
    const reports = await this.getReports({ periodId });
    const submittedCellIds = new Set(
      reports.filter(r => r.status === 'submitted' || r.status === 'approved' || r.status === 'under_review').map(r => r.cell_id)
    );
    return cells.filter(c => c.is_active && !submittedCellIds.has(c.id));
  }

  // --- Regions ---
  static async getRegions(): Promise<Region[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const snap = await getDocs(collection(db, 'regions'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Region));
    } catch (e) {
      console.warn('Firebase getRegions error', e);
      return [];
    }
  }

  static async addRegion(region: Region): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      await setDoc(doc(db, 'regions', region.id), region);
    } catch (e) {
      console.warn('Firebase addRegion error', e);
    }
  }

  // --- Reporting Periods ---
  static async getPeriods(): Promise<ReportingPeriod[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const snap = await getDocs(collection(db, 'reporting_periods'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReportingPeriod));
    } catch (e) {
      console.warn('Firebase getPeriods error', e);
      return [];
    }
  }

  static async addPeriod(period: ReportingPeriod): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      await setDoc(doc(db, 'reporting_periods', period.id), period);
    } catch (e) {
      console.warn('Firebase addPeriod error', e);
    }
  }

  // --- User Profiles ---
  static async saveProfile(profile: Profile): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      await setDoc(doc(db, 'profiles', profile.id), profile, { merge: true });
    } catch (e) {
      console.warn('Firebase saveProfile error', e);
    }
  }

  static async getProfile(uid: string): Promise<Profile | null> {
    if (!isFirebaseConfigured || !db) return null;
    try {
      const snap = await getDoc(doc(db, 'profiles', uid));
      return snap.exists() ? (snap.data() as Profile) : null;
    } catch (e) {
      console.warn('Firebase getProfile error', e);
      return null;
    }
  }

  static async getAllProfiles(): Promise<Profile[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const snap = await getDocs(collection(db, 'profiles'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Profile));
    } catch (e) {
      console.warn('Firebase getAllProfiles error', e);
      return [];
    }
  }

  // --- Notifications ---
  static async getNotifications(userId: string): Promise<NotificationItem[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const notifsRef = collection(db, 'notifications');
      const snap = await getDocs(query(notifsRef, orderBy('created_at', 'desc')));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem));
      return all.filter(n => n.user_id === userId || n.user_id === 'all');
    } catch (e) {
      console.warn('Firebase getNotifications error', e);
      return [];
    }
  }

  static async sendNotification(item: Omit<NotificationItem, 'id' | 'created_at'>): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      const id = `notif-${Date.now()}`;
      await setDoc(doc(db, 'notifications', id), {
        id,
        ...item,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firebase sendNotification error', e);
    }
  }

  // --- Audit Logs ---
  static async recordAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      await addDoc(collection(db, 'audit_logs'), {
        ...log,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firebase recordAuditLog error', e);
    }
  }

  static async getAuditLogs(): Promise<AuditLog[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('created_at', 'desc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
    } catch (e) {
      console.warn('Firebase getAuditLogs error', e);
      return [];
    }
  }
}
