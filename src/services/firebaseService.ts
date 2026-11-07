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
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { CellReport, Cell, Region, ReportingPeriod, Profile, AuditLog } from '../types';

export class FirebaseService {
  // --- Cell Reports ---
  static async getReports(filters?: { cellId?: string; periodId?: string; status?: string }): Promise<CellReport[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const reportsRef = collection(db, 'cell_reports');
      let q = query(reportsRef, orderBy('created_at', 'desc'));

      if (filters?.cellId) {
        q = query(reportsRef, where('cell_id', '==', filters.cellId));
      }

      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as CellReport));
    } catch (e) {
      console.warn('Firebase getReports error', e);
      return [];
    }
  }

  static async submitReport(report: CellReport): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      const reportsRef = collection(db, 'cell_reports');
      await setDoc(doc(reportsRef, report.id), {
        ...report,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firebase submitReport error', e);
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
}
