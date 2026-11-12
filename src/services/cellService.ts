/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Cell Fellowship Management Service
 * 
 * Supabase-first data management with local storage caching for offline resilience.
 * Zero Firebase dependencies.
 */

import { SupabaseService } from './supabaseService';
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
    // 1. Primary: Supabase
    const supaCells = await SupabaseService.getCells();
    if (supaCells && supaCells.length > 0) {
      saveStoredCells(supaCells);
      return supaCells;
    }

    // 2. Offline / LocalStorage cache
    return getStoredCells();
  }

  static async getCellById(cellId: string): Promise<Cell | null> {
    // 1. Primary: Supabase
    const supaCell = await SupabaseService.getCellById(cellId);
    if (supaCell) return supaCell;

    // 2. Cache
    const all = getStoredCells();
    return all.find(c => c.id === cellId) || null;
  }

  /**
   * Resolves or synthesizes the exact cell fellowship registered to a tutor.
   * Guarantees that the fellowship name automatically matches the name registered by the tutor.
   */
  static async getCellForTutor(user: {
    id?: string;
    cell_id?: string;
    cell_name?: string;
    full_name?: string;
  }): Promise<Cell> {
    const allCells = await this.getCells();

    // 1. Try resolving by explicit cell_id
    if (user.cell_id) {
      const byId = allCells.find(c => c.id === user.cell_id);
      if (byId) return byId;
    }

    // 2. Try resolving by registered cell_name
    if (user.cell_name && user.cell_name.trim()) {
      const cleanCellName = user.cell_name.trim();
      const targetNorm = normalizeCellName(cleanCellName);
      const byName = allCells.find(c => {
        const norm = c.normalized_name || normalizeCellName(c.name);
        return norm === targetNorm || c.name.toLowerCase() === cleanCellName.toLowerCase();
      });
      if (byName) return byName;
    }

    // 3. Try resolving by tutor ID
    if (user.id) {
      const byTutor = allCells.find(c => c.tutorUid === user.id || c.leader_id === user.id);
      if (byTutor) return byTutor;
    }

    // 4. Automatically create and persist cell with the exact registered fellowship name
    const cleanCellName = (user.cell_name || 'Fellowship Cell').trim();
    const cellId = user.cell_id || `cell-${Date.now()}`;
    const syntheticCell: Cell = {
      id: cellId,
      name: cleanCellName,
      normalized_name: normalizeCellName(cleanCellName),
      location: 'Central Campus',
      code: `FNI-CEL-${(allCells.length + 1).toString().padStart(3, '0')}`,
      tutorUid: user.id || 'tutor',
      leader_id: user.id || 'tutor',
      leader_name: user.full_name || 'Cell Leader',
      meeting_day: 'Wednesday',
      meeting_time: '18:30',
      venue_address: 'Fellowship Center',
      target_attendance: 25,
      total_members: 10,
      active_members: 8,
      new_members: 2,
      status: 'Active',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    await this.updateCell(syntheticCell);
    return syntheticCell;
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

    // 1. Fetch current cells from Supabase or local cache
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

      await SupabaseService.upsertCell(updated);

      const list = allCells.map(c => (c.id === existing.id ? updated : c));
      saveStoredCells(list);

      return { cell: updated, isExistingAssociated: true };
    }

    // 3. Register brand-new unique cell
    const cellId = `cell-${Date.now()}`;
    const code = `FNI-CEL-${(allCells.length + 1).toString().padStart(3, '0')}`;
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
      region_id: data.regionId || '',
      region_name: data.regionName || '',
      meeting_day: data.meetingDay || 'Wednesday',
      meeting_time: data.meetingTime || '18:30',
      venue_address: data.venueAddress || data.location,
      target_attendance: Number(data.targetAttendance) || 20,
      is_active: true,
      created_at: nowIso,
    };

    await SupabaseService.upsertCell(newCell);

    const list = [newCell, ...allCells];
    saveStoredCells(list);

    return { cell: newCell, isExistingAssociated: false };
  }

  static async deleteCells(cellIds: string[]): Promise<boolean> {
    if (!cellIds.length) return false;
    const deleted = await SupabaseService.deleteCellRegistrations(cellIds);
    if (!deleted) return false;
    const removed = new Set(cellIds);
    saveStoredCells(getStoredCells().filter(cell => !removed.has(cell.id)));
    return true;
  }

  static async updateCell(cell: Cell): Promise<void> {
    await SupabaseService.upsertCell(cell);
    const all = getStoredCells();
    const updated = all.map(c => (c.id === cell.id ? cell : c));
    saveStoredCells(updated);
  }
}
