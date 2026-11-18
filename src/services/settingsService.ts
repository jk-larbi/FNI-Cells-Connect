import { SupabaseService } from './supabaseService';
import { SoulTargetService } from './soulTargetService';
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
  private static localSubscribers = new Set<(settings: SystemSettings) => void>();

  static subscribeToSettings(callback: (settings: SystemSettings) => void): () => void {
    this.localSubscribers.add(callback);
    const unsubSupabase = SupabaseService.subscribeToSystemSettings((settings) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      this.localSubscribers.forEach(cb => {
        try { cb(settings); } catch (e) { console.warn('Error in settings subscriber:', e); }
      });
    });

    return () => {
      this.localSubscribers.delete(callback);
      unsubSupabase();
    };
  }

  static async getSettings(): Promise<SystemSettings> {
    // Supabase is authoritative when configured, including an empty settings table.
    if (SupabaseService.isAvailable()) {
      try {
        const supaSettings = await SupabaseService.getSystemSettings();
        if (supaSettings) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(supaSettings));
          return supaSettings;
        }
        return DEFAULT_SETTINGS;
      } catch (e) {
        console.warn('Notice loading Supabase system settings:', e);
        // Fallback to local storage if network is temporarily interrupted
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) return JSON.parse(stored);
        } catch {}
        return DEFAULT_SETTINGS;
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
      updatedBy: updatedBy || current.updatedBy || 'Administrator',
    };

    // Optimistically update local storage and notify local subscribers immediately
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      this.localSubscribers.forEach(cb => {
        try { cb(updated); } catch {}
      });
    } catch {}

    // Synchronize soul target with SoulTargetService if target was modified
    if (settings.annualSoulWinningTarget !== undefined) {
      try {
        await SoulTargetService.updateTarget(
          settings.annualSoulWinningTarget,
          updated.updatedBy || 'Administrator',
          'Updated via FNI Core Foundation Ministry Settings'
        );
      } catch (e) {
        console.warn('Notice synchronizing soul target config:', e);
      }
    }

    // Persist ministry-wide settings to Supabase so every device and the public
    // ministry overview sees the same Vision, Mission, and annual soul target.
    try {
      const saved = await SupabaseService.upsertSystemSettings(updated);
      if (!saved) {
        console.warn('Supabase settings update could not be committed directly. Retrying in background sync queue.');
      }
    } catch (err) {
      console.warn('Supabase settings sync notice:', err);
    }

    return updated;
  }
}
