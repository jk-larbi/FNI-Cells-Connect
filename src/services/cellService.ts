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
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Cell } from '../types';

const STORAGE_KEY = 'fni_cells_store_v5_clean_prod';

function getStoredCells(): Cell[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredCells(cells: Cell[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cells));
  } catch (e) {
    console.warn('Failed saving cells to localStorage', e);
  }
}

export function normalizeCellName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export class CellService {
  static async getCells(): Promise<Cell[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'cells'));
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Cell));
          saveStoredCells(list);
          return list;
        }
      } catch (e) {
        console.warn('Firebase getCells error, falling back to local storage', e);
      }
    }
    return getStoredCells();
  }

  static async getCellById(cellId: string): Promise<Cell | null> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDoc(doc(db, 'cells', cellId));
        if (snap.exists()) {
          return { id: snap.id, ...snap.data() } as Cell;
        }
      } catch (e) {
        console.warn('Firebase getCellById error', e);
      }
    }
    const all = getStoredCells();
    return all.find(c => c.id === cellId) || null;
  }

  static async registerCell(data: {
    name: string;
    location: string;
    tutorUid: string;
    leaderName: string;
    leaderPhone: string;
    regionId?: string;
    regionName?: string;
    meetingDay?: string;
    meetingTime?: string;
    venueAddress?: string;
    targetAttendance?: number;
  }): Promise<{ cell: Cell; isExistingAssociated: boolean }> {
    const rawName = data.name.trim();
    const normalized = normalizeCellName(rawName);

    // 1. Fetch current cells from Firebase or local
    const allCells = await this.getCells();

    // 2. Strong duplicate detection via normalized string comparison
    const existing = allCells.find(c => {
      const existingNorm = c.normalized_name || normalizeCellName(c.name);
      return existingNorm === normalized || c.name.toLowerCase() === rawName.toLowerCase();
    });

    if (existing) {
      // Tutor joins / is associated with existing cell rather than creating a duplicate
      const updated: Cell = {
        ...existing,
        tutorUid: data.tutorUid,
        leader_id: data.tutorUid,
        leader_name: data.leaderName || existing.leader_name,
        leader_phone: data.leaderPhone || existing.leader_phone,
        location: data.location || existing.location,
        venue_address: data.venueAddress || existing.venue_address,
        meeting_day: data.meetingDay || existing.meeting_day,
        meeting_time: data.meetingTime || existing.meeting_time,
        target_attendance: data.targetAttendance || existing.target_attendance,
      };

      if (isFirebaseConfigured && db) {
        try {
          await updateDoc(doc(db, 'cells', existing.id), {
            tutorUid: updated.tutorUid,
            leader_id: updated.leader_id,
            leader_name: updated.leader_name,
            leader_phone: updated.leader_phone,
            location: updated.location,
            venue_address: updated.venue_address,
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Firebase cell update error', e);
        }
      }

      const list = allCells.map(c => (c.id === existing.id ? updated : c));
      saveStoredCells(list);

      return { cell: updated, isExistingAssociated: true };
    }

    // 3. Register brand-new unique cell
    const cellId = `cell-${Date.now()}`;
    const code = `FNI-CEL-${data.regionId ? data.regionId.replace('reg-', '').toUpperCase() : 'LOS'}-${(allCells.length + 1).toString().padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    const newCell: Cell = {
      id: cellId,
      name: rawName,
      normalized_name: normalized,
      location: data.location.trim() || 'Central Fellowship Campus',
      code,
      tutorUid: data.tutorUid,
      leader_id: data.tutorUid,
      leader_name: data.leaderName,
      leader_phone: data.leaderPhone,
      region_id: data.regionId || 'reg-lagos',
      region_name: data.regionName || 'Lagos Central Region',
      meeting_day: data.meetingDay || 'Wednesday',
      meeting_time: data.meetingTime || '18:30',
      venue_address: data.venueAddress || data.location,
      target_attendance: Number(data.targetAttendance) || 20,
      is_active: true,
      created_at: nowIso,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'cells', cellId), {
          ...newCell,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firebase setDoc cell error', e);
      }
    }

    const list = [newCell, ...allCells];
    saveStoredCells(list);

    return { cell: newCell, isExistingAssociated: false };
  }

  static async updateCell(cell: Cell): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'cells', cell.id), cell, { merge: true });
      } catch (e) {
        console.warn('Firebase updateCell error', e);
      }
    }
    const all = getStoredCells();
    const updated = all.map(c => (c.id === cell.id ? cell : c));
    saveStoredCells(updated);
  }
}
