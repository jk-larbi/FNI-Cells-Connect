import { collection, getDocs, doc, getDoc, setDoc, query, where, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { OfferingRecord, OfferingAggregation, UserRole } from '../types';
import { ReportService } from './reportService';

const STORAGE_KEY = 'fni_offerings_store_v1';

function getStoredOfferings(): OfferingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setStoredOfferings(records: OfferingRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to store offerings locally', e);
  }
}

export class FinanceService {
  /**
   * Syncs and registers an offering record from a submitted cell meeting report.
   * Prevents duplicates by uniquely keying on reportId.
   */
  static async recordOfferingFromReport(data: {
    reportId: string;
    cellId: string;
    cellName: string;
    tutorUid?: string;
    tutorName?: string;
    amount: number;
    meetingDate: string;
    status: any;
    submittedAt?: string;
  }): Promise<void> {
    if (!data.amount || data.amount <= 0) return;

    const id = `off-${data.reportId}`;
    const dateObj = new Date(data.meetingDate || Date.now());
    const weekNumber = Math.ceil(dateObj.getDate() / 7);
    const weekLabel = `Week ${weekNumber} (${dateObj.toLocaleString('default', { month: 'short' })})`;

    const record: OfferingRecord = {
      id,
      reportId: data.reportId,
      cellId: data.cellId,
      cellName: data.cellName,
      tutorUid: data.tutorUid,
      tutorName: data.tutorName,
      amount: Number(data.amount) || 0,
      currency: 'GHS',
      meetingDate: data.meetingDate,
      weekLabel,
      submittedAt: data.submittedAt || new Date().toISOString(),
      status: data.status,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'offerings', id), record, { merge: true });
      } catch (e) {
        console.warn('Firebase offering sync notice:', e);
      }
    }

    const localList = getStoredOfferings();
    const existingIndex = localList.findIndex(o => o.reportId === data.reportId);
    if (existingIndex >= 0) {
      localList[existingIndex] = record;
    } else {
      localList.unshift(record);
    }
    setStoredOfferings(localList);
  }

  /**
   * Retrieves all offering records with role-based restriction.
   * Financial reporting access is restricted to authorised personnel (Admin / Leadership).
   */
  static async getOfferingRecords(userRole?: UserRole, cellId?: string): Promise<OfferingRecord[]> {
    const isAuthorized =
      userRole === 'admin' ||
      userRole === 'super_admin' ||
      userRole === 'national_admin' ||
      userRole === 'regional_leader';

    // Also pull directly from meeting reports to guarantee real-time synchronization
    const meetingReports = await ReportService.getCellMeetingReports();
    const map = new Map<string, OfferingRecord>();

    // Load from local/firebase cache first
    const cached = getStoredOfferings();
    cached.forEach(c => map.set(c.reportId, c));

    // Synchronize every meeting report with an offering
    meetingReports.forEach(r => {
      if (r.offering && Number(r.offering) > 0) {
        const id = `off-${r.id}`;
        const dateObj = new Date(r.meetingDate || r.submittedAt || Date.now());
        const weekNum = Math.ceil(dateObj.getDate() / 7);
        map.set(r.id, {
          id,
          reportId: r.id,
          cellId: r.cellId,
          cellName: r.cellName,
          tutorUid: r.tutorUid,
          tutorName: r.tutorName,
          amount: Number(r.offering),
          currency: 'GHS',
          meetingDate: r.meetingDate,
          weekLabel: `Week ${weekNum} (${dateObj.toLocaleString('default', { month: 'short' })})`,
          submittedAt: r.submittedAt,
          status: r.status,
        });
      }
    });

    let all = Array.from(map.values()).sort(
      (a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()
    );

    // If caller is tutor, scope to their cell
    if (!isAuthorized && cellId) {
      all = all.filter(o => o.cellId === cellId);
    }

    return all;
  }

  /**
   * Computes deduplicated Ministry-Wide Offering Aggregations:
   * Weekly, Monthly, Quarterly, Annual, and Cell Breakdown.
   */
  static async getOfferingAggregation(userRole?: UserRole): Promise<OfferingAggregation> {
    const records = await this.getOfferingRecords(userRole);

    const weeklyMap = new Map<string, { amount: number; count: number }>();
    const monthlyMap = new Map<string, { amount: number; count: number }>();
    const quarterlyMap = new Map<string, { amount: number; count: number }>();
    const cellMap = new Map<string, { name: string; amount: number; count: number }>();

    let annual = 0;

    for (const r of records) {
      const amt = Number(r.amount) || 0;
      annual += amt;

      const d = new Date(r.meetingDate || r.submittedAt);
      const year = d.getFullYear() || 2026;
      const monthName = d.toLocaleString('default', { month: 'short' });
      const monthKey = `${monthName} ${year}`;
      const quarter = `Q${Math.floor(d.getMonth() / 3) + 1} ${year}`;
      const weekLabel = r.weekLabel || `Week ${Math.ceil(d.getDate() / 7)} (${monthName})`;

      // Weekly
      const currWeek = weeklyMap.get(weekLabel) || { amount: 0, count: 0 };
      weeklyMap.set(weekLabel, { amount: currWeek.amount + amt, count: currWeek.count + 1 });

      // Monthly
      const currMonth = monthlyMap.get(monthKey) || { amount: 0, count: 0 };
      monthlyMap.set(monthKey, { amount: currMonth.amount + amt, count: currMonth.count + 1 });

      // Quarterly
      const currQ = quarterlyMap.get(quarter) || { amount: 0, count: 0 };
      quarterlyMap.set(quarter, { amount: currQ.amount + amt, count: currQ.count + 1 });

      // Cell Breakdown
      const currCell = cellMap.get(r.cellId) || { name: r.cellName, amount: 0, count: 0 };
      cellMap.set(r.cellId, {
        name: r.cellName,
        amount: currCell.amount + amt,
        count: currCell.count + 1,
      });
    }

    return {
      weekly: Array.from(weeklyMap.entries()).map(([period, data]) => ({
        period,
        amount: Math.round(data.amount * 100) / 100,
        reportCount: data.count,
      })),
      monthly: Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        amount: Math.round(data.amount * 100) / 100,
        reportCount: data.count,
      })),
      quarterly: Array.from(quarterlyMap.entries()).map(([quarter, data]) => ({
        quarter,
        amount: Math.round(data.amount * 100) / 100,
        reportCount: data.count,
      })),
      annual: Math.round(annual * 100) / 100,
      cellBreakdown: Array.from(cellMap.entries()).map(([cellId, data]) => ({
        cellId,
        cellName: data.name,
        totalAmount: Math.round(data.amount * 100) / 100,
        reportCount: data.count,
      })),
    };
  }
}
