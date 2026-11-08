import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { SupabaseService } from './supabaseService';
import { SystemSettings } from '../types';

const STORAGE_KEY = 'fni_system_settings_v5_clean';

export const DEFAULT_SETTINGS: SystemSettings = {
  id: 'general',
  vision: 'To raise a global army of consecrated believers equipped with apostolic and prophetic depth, establishing the reign of Christ across all spheres of society.',
  mission: 'Mobilizing territorial cell fellowships, rigorous discipleship training, dynamic evangelism outreaches, and systematic pastoral care to transform lives and communities.',
  annualSoulWinningTarget: 5000,
  weeklyDeadline: 'Sunday at 6:00 PM Ghana Time (Africa/Accra, UTC+0)',
  updatedAt: '2026-01-01T00:00:00Z',
};

export class SettingsService {
  static async getSettings(): Promise<SystemSettings> {
    // 1. Primary: Try Supabase
    const supaSettings = await SupabaseService.getSystemSettings();
    if (supaSettings) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(supaSettings));
      return supaSettings;
    }
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDoc(doc(db, 'systemSettings', 'general'));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as SystemSettings;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.warn('Firebase getSettings error', e);
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return DEFAULT_SETTINGS;
  }

  static async updateSettings(settings: Partial<SystemSettings>, updatedBy?: string): Promise<SystemSettings> {
    const current = await this.getSettings();
    const updated: SystemSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || current.updatedBy,
    };

    // Dual-write to Supabase
    try {
      await SupabaseService.upsertSystemSettings(updated);
    } catch (err) {
      console.warn('Supabase settings sync notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'systemSettings', 'general'), {
          ...updated,
          serverUpdatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firebase updateSettings error', e);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
}
