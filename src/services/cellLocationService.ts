/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Cell Location History Service
 * 
 * Maintains a permanent historical record of physical meeting locations
 * for every registered fellowship cell. Never overwrites historical entries.
 */

import { supabase } from '../lib/supabase';
import { CellLocationRecord } from '../types';

const STORAGE_KEY = 'fni_cell_location_history_v1';

function readLocalHistory(): CellLocationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalHistory(items: CellLocationRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Notice writing cell location history to localStorage:', e);
  }
}

export class CellLocationService {
  /**
   * Fetch all cell location history records ordered newest first.
   */
  static async getLocationHistory(filters?: {
    cellId?: string;
    leaderId?: string;
    searchQuery?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<CellLocationRecord[]> {
    // 1. Try Supabase
    try {
      if (supabase) {
        let query = supabase
          .from('cell_location_history')
          .select('*')
          .order('meeting_date', { ascending: false });

        if (filters?.cellId && filters.cellId !== 'all') {
          query = query.eq('cell_id', filters.cellId);
        }
        if (filters?.leaderId && filters.leaderId !== 'all') {
          query = query.eq('leader_id', filters.leaderId);
        }
        if (filters?.startDate) {
          query = query.gte('meeting_date', filters.startDate);
        }
        if (filters?.endDate) {
          query = query.lte('meeting_date', filters.endDate);
        }

        const { data, error } = await query;
        if (!error && data) {
          const mapped: CellLocationRecord[] = data.map((d: any) => ({
            id: d.id,
            cell_id: d.cell_id,
            cell_name: d.cell_name,
            venue: d.venue,
            meeting_date: d.meeting_date,
            leader_id: d.leader_id,
            leader_name: d.leader_name,
            notes: d.notes,
            created_at: d.created_at,
            created_by: d.created_by,
          }));
          writeLocalHistory(mapped);
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Notice loading cell location history from Supabase, using local cache:', e);
    }

    // 2. Fallback to Local Cache (clean actual records only)
    let records = readLocalHistory();
    if (filters?.cellId && filters.cellId !== 'all') {
      records = records.filter(r => r.cell_id === filters.cellId);
    }
    if (filters?.leaderId && filters.leaderId !== 'all') {
      records = records.filter(r => r.leader_id === filters.leaderId);
    }
    if (filters?.startDate) {
      records = records.filter(r => r.meeting_date >= filters.startDate!);
    }
    if (filters?.endDate) {
      records = records.filter(r => r.meeting_date <= filters.endDate!);
    }
    if (filters?.searchQuery?.trim()) {
      const q = filters.searchQuery.toLowerCase();
      records = records.filter(
        r =>
          r.cell_name.toLowerCase().includes(q) ||
          r.venue.toLowerCase().includes(q) ||
          r.leader_name.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    return records.sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());
  }

  /**
   * Record a new historical cell meeting location.
   */
  static async recordLocation(
    data: {
      cell_id: string;
      cell_name: string;
      venue: string;
      meeting_date?: string;
      leader_id?: string;
      leader_name?: string;
      notes?: string;
    },
    currentUser: { id: string; name?: string }
  ): Promise<CellLocationRecord> {
    const id = `loc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const nowIso = new Date().toISOString();
    const meetingDate = data.meeting_date || nowIso.split('T')[0];

    const record: CellLocationRecord = {
      id,
      cell_id: data.cell_id,
      cell_name: data.cell_name.trim(),
      venue: data.venue.trim(),
      meeting_date: meetingDate,
      leader_id: data.leader_id || currentUser.id,
      leader_name: data.leader_name?.trim() || currentUser.name || 'Cell Leader',
      notes: data.notes?.trim(),
      created_at: nowIso,
      created_by: currentUser.id,
    };

    // 1. Supabase write
    try {
      if (supabase) {
        await supabase.from('cell_location_history').insert({
          id: record.id,
          cell_id: record.cell_id,
          cell_name: record.cell_name,
          venue: record.venue,
          meeting_date: record.meeting_date,
          leader_id: record.leader_id,
          leader_name: record.leader_name,
          notes: record.notes,
          created_at: record.created_at,
          created_by: record.created_by,
        });
      }
    } catch (e) {
      console.warn('Notice saving cell location record to Supabase:', e);
    }

    // 2. Local update
    const current = readLocalHistory();
    current.unshift(record);
    writeLocalHistory(current);

    return record;
  }

  /**
   * Update a location record (Admin only).
   */
  static async updateLocation(
    id: string,
    updates: Partial<CellLocationRecord>
  ): Promise<CellLocationRecord | null> {
    try {
      if (supabase) {
        await supabase
          .from('cell_location_history')
          .update({
            venue: updates.venue,
            meeting_date: updates.meeting_date,
            leader_name: updates.leader_name,
            notes: updates.notes,
          })
          .eq('id', id);
      }
    } catch (e) {
      console.warn('Notice updating location history in Supabase:', e);
    }

    const current = readLocalHistory();
    const idx = current.findIndex(r => r.id === id);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...updates };
      writeLocalHistory(current);
      return current[idx];
    }
    return null;
  }

  /**
   * Delete a location record (Admin only).
   */
  static async deleteLocation(id: string): Promise<void> {
    try {
      if (supabase) {
        await supabase.from('cell_location_history').delete().eq('id', id);
      }
    } catch (e) {
      console.warn('Notice deleting location record from Supabase:', e);
    }
    const current = readLocalHistory();
    writeLocalHistory(current.filter(r => r.id !== id));
  }
}
