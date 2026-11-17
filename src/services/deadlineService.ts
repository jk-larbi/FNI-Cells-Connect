import { SupabaseService } from './supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SystemSettings } from '../types';

export interface ReportDeadlineConfig {
  reportType: 'meeting' | 'evangelism';
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string; // 'Sunday', 'Saturday', etc.
  deadlineTime: string; // "18:00", "17:00" in 24h format
  remindersEnabled: boolean;
  reminderHoursBefore?: number;
  effectiveFromWeek?: number;
  effectiveFromYear?: number;
}

export interface SystemDeadlineSettings {
  meeting: ReportDeadlineConfig;
  evangelism: ReportDeadlineConfig;
  updatedAt?: string;
  updatedBy?: string;
}

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const DEFAULT_DEADLINE_SETTINGS: SystemDeadlineSettings = {
  meeting: {
    reportType: 'meeting',
    dayOfWeek: 0, // Sunday
    dayName: 'Sunday',
    deadlineTime: '18:00', // 6:00 PM GMT
    remindersEnabled: true,
    reminderHoursBefore: 4,
  },
  evangelism: {
    reportType: 'evangelism',
    dayOfWeek: 6, // Saturday
    dayName: 'Saturday',
    deadlineTime: '17:00', // 5:00 PM GMT
    remindersEnabled: true,
    reminderHoursBefore: 4,
  },
};

const STORAGE_KEY = 'fni_report_deadline_settings_v2';
const SUBSCRIBERS = new Set<(settings: SystemDeadlineSettings) => void>();

function getStoredDeadlineSettings(): SystemDeadlineSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        meeting: { ...DEFAULT_DEADLINE_SETTINGS.meeting, ...(parsed.meeting || {}) },
        evangelism: { ...DEFAULT_DEADLINE_SETTINGS.evangelism, ...(parsed.evangelism || {}) },
        updatedAt: parsed.updatedAt,
        updatedBy: parsed.updatedBy,
      };
    }
    return DEFAULT_DEADLINE_SETTINGS;
  } catch {
    return DEFAULT_DEADLINE_SETTINGS;
  }
}

function saveStoredDeadlineSettings(settings: SystemDeadlineSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    SUBSCRIBERS.forEach(cb => {
      try {
        cb(settings);
      } catch (e) {
        console.warn('Deadline subscriber error', e);
      }
    });
  } catch (e) {
    console.warn('Failed to save deadline settings locally', e);
  }
}

export class DeadlineService {
  /**
   * Get active report deadline settings
   */
  static async getDeadlineSettings(): Promise<SystemDeadlineSettings> {
    // 1. Try Supabase system_settings
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 'global')
          .maybeSingle();

        if (!error && data) {
          const meetingDay = data.submission_deadline_day || 'Sunday';
          const meetingTime = data.submission_deadline_time || '18:00';
          const meetingDayIdx = DAYS_OF_WEEK.find(d => d.label.toLowerCase() === meetingDay.toLowerCase())?.value ?? 0;

          const evangDay = data.evangelism_deadline_day || 'Saturday';
          const evangTime = data.evangelism_deadline_time || '17:00';
          const evangDayIdx = DAYS_OF_WEEK.find(d => d.label.toLowerCase() === evangDay.toLowerCase())?.value ?? 6;

          const remoteSettings: SystemDeadlineSettings = {
            meeting: {
              reportType: 'meeting',
              dayOfWeek: meetingDayIdx,
              dayName: meetingDay,
              deadlineTime: meetingTime,
              remindersEnabled: data.enable_meeting_reminders !== false,
            },
            evangelism: {
              reportType: 'evangelism',
              dayOfWeek: evangDayIdx,
              dayName: evangDay,
              deadlineTime: evangTime,
              remindersEnabled: data.enable_evangelism_reminders !== false,
            },
            updatedAt: data.updated_at,
            updatedBy: data.updated_by,
          };
          saveStoredDeadlineSettings(remoteSettings);
          return remoteSettings;
        }
      } catch (e) {
        console.warn('Notice loading Supabase deadline settings:', e);
      }
    }

    return getStoredDeadlineSettings();
  }

  /**
   * Get active report deadline settings synchronously from cache
   */
  static getDeadlineSettingsSync(): SystemDeadlineSettings {
    return getStoredDeadlineSettings();
  }

  /**
   * Update report deadline settings
   */
  static async updateDeadlineSettings(
    newSettings: Partial<SystemDeadlineSettings>,
    updatedBy: string
  ): Promise<SystemDeadlineSettings> {
    const current = await this.getDeadlineSettings();
    const nowIso = new Date().toISOString();

    const merged: SystemDeadlineSettings = {
      meeting: { ...current.meeting, ...(newSettings.meeting || {}) },
      evangelism: { ...current.evangelism, ...(newSettings.evangelism || {}) },
      updatedAt: nowIso,
      updatedBy,
    };

    saveStoredDeadlineSettings(merged);

    // Save to Supabase system_settings
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('system_settings').upsert({
          id: 'global',
          submission_deadline_day: merged.meeting.dayName,
          submission_deadline_time: merged.meeting.deadlineTime,
          weekly_deadline: `Every ${merged.meeting.dayName} at ${merged.meeting.deadlineTime} Ghana Time (Africa/Accra)`,
          updated_at: nowIso,
          updated_by: updatedBy,
        }, { onConflict: 'id' });
      } catch (e) {
        console.warn('Failed saving deadline settings to Supabase', e);
      }
    }

    return merged;
  }

  /**
   * Calculate exact deadline ISO string for a specific year and week number
   */
  static calculateDeadlineForWeek(
    reportType: 'meeting' | 'evangelism',
    year: number,
    weekNumber: number,
    settings?: SystemDeadlineSettings
  ): { startDate: string; endDate: string; deadlineIso: string; formatted: string } {
    const activeSettings = settings || getStoredDeadlineSettings();
    const cfg = reportType === 'meeting' ? activeSettings.meeting : activeSettings.evangelism;

    // ISO week start (Monday)
    const simple = new Date(Date.UTC(year, 0, 1 + (weekNumber - 1) * 7));
    const dayOfWeek = simple.getUTCDay();
    const ISOweekStart = new Date(simple);
    if (dayOfWeek <= 4) {
      ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
    } else {
      ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
    }

    // Determine target day of week
    // cfg.dayOfWeek: 0 = Sunday, 1 = Monday, 6 = Saturday
    // Monday is offset 0; Sunday is offset 6; Saturday is offset 5
    const targetOffset = cfg.dayOfWeek === 0 ? 6 : cfg.dayOfWeek - 1;

    const targetDate = new Date(ISOweekStart);
    targetDate.setUTCDate(ISOweekStart.getUTCDate() + targetOffset);

    // Parse deadlineTime "HH:MM"
    const [hours, minutes] = cfg.deadlineTime.split(':').map(Number);
    targetDate.setUTCHours(hours || 18, minutes || 0, 0, 0);

    const startDateStr = ISOweekStart.toISOString().split('T')[0];
    const endDateStr = targetDate.toISOString().split('T')[0];
    const deadlineIso = targetDate.toISOString();

    const formattedTime = targetDate.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Accra',
    });

    const formatted = `${cfg.dayName} ${formattedTime} Ghana Time (Africa/Accra)`;

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      deadlineIso,
      formatted,
    };
  }

  /**
   * Evaluate submission timing status: 'submitted' (on-time), 'submitted_late', or 'missed'
   */
  static evaluateReportStatus(
    submittedAtIso?: string | null,
    deadlineIso?: string | null
  ): 'submitted' | 'submitted_late' | 'missed' {
    if (!deadlineIso) return 'submitted';
    const deadlineTime = new Date(deadlineIso).getTime();

    if (!submittedAtIso) {
      const now = Date.now();
      return now > deadlineTime ? 'missed' : 'submitted';
    }

    const submitTime = new Date(submittedAtIso).getTime();
    return submitTime > deadlineTime ? 'submitted_late' : 'submitted';
  }

  /**
   * Subscribe to live deadline settings updates
   */
  static subscribe(callback: (settings: SystemDeadlineSettings) => void): () => void {
    SUBSCRIBERS.add(callback);
    callback(getStoredDeadlineSettings());
    return () => {
      SUBSCRIBERS.delete(callback);
    };
  }
}
