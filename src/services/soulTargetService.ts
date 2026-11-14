import { SupabaseService } from './supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SoulTargetConfig, SoulTargetMetrics } from '../types';
import { ReportService } from './reportService';
import { CellService } from './cellService';
import { SettingsService } from './settingsService';

const STORAGE_KEY = 'fni_soul_target_config_v2_clean';

const DEFAULT_CONFIG: SoulTargetConfig = {
  id: 'target-2026',
  year: 2026,
  annualTarget: 5000,
  updatedAt: '2026-01-01T00:00:00Z',
  updatedBy: 'System Administrator',
  auditHistory: [
    {
      previousTarget: 1000,
      newTarget: 5000,
      changedBy: 'General Overseer',
      reason: 'Territorial kingdom expansion across cell fellowships and harvest outreaches',
      timestamp: '2026-01-01T00:00:00Z',
    },
  ],
};

function getStoredConfig(): SoulTargetConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function setStoredConfig(cfg: SoulTargetConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn('Failed saving target config locally', e);
  }
}

export class SoulTargetService {
  private static liveListeners: Set<(metrics: SoulTargetMetrics) => void> = new Set();

  static async getConfig(): Promise<SoulTargetConfig> {
    // 1. Primary: Try Supabase
    try {
      const supaConfig = await SupabaseService.getSoulTargetConfig();
      if (supaConfig) {
        setStoredConfig(supaConfig);
        return supaConfig;
      }
    } catch (e) {
      console.warn('Notice loading Supabase soul target config:', e);
    }

    return getStoredConfig();
  }

  static async updateTarget(newTarget: number, changedBy: string, reason: string): Promise<SoulTargetConfig> {
    const current = await this.getConfig();
    const nowIso = new Date().toISOString();

    const auditEntry = {
      previousTarget: current.annualTarget,
      newTarget: Number(newTarget),
      changedBy,
      reason: reason.trim() || 'Annual goal recalibration',
      timestamp: nowIso,
    };

    const updated: SoulTargetConfig = {
      ...current,
      annualTarget: Number(newTarget),
      updatedAt: nowIso,
      updatedBy: changedBy,
      auditHistory: [auditEntry, ...(current.auditHistory || [])],
    };

    setStoredConfig(updated);

    // Primary write to Supabase
    try {
      await SupabaseService.upsertSoulTargetConfig(updated);
    } catch (e) {
      console.warn('Supabase save target notice:', e);
    }

    // Push live update to all listeners
    this.notifySubscribers();

    return updated;
  }

  /**
   * Calculates real-time progress metrics against the configured annual target.
   * Both weekly cell meeting returns (new members & converts) and evangelism outreach returns contribute live.
   */
  static async calculateMetrics(): Promise<SoulTargetMetrics> {
    const [config, settings, evangelismReports, meetingReports, cells] = await Promise.all([
      this.getConfig(), SettingsService.getSettings(), ReportService.getEvangelismReports(),
      ReportService.getCellMeetingReports(), CellService.getCells(),
    ]);
    const year = config.year || new Date().getFullYear();
    const annualTarget = settings.annualSoulWinningTarget || config.annualTarget || 5000;
    const isInTargetYear = (value?: string) => {
      if (!value) return false;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date.getFullYear() === year;
    };
    const isApproved = (status: string) => status === 'Approved' || status === 'approved';
    const isPending = (status: string) => ['Newly Submitted', 'submitted', 'under_review'].includes(status);
    // Only approved field conversions count toward the annual soul-winning target.
    const validEvang = evangelismReports.filter(r => isApproved(r.status) && isInTargetYear(r.date || r.submittedAt));
    const pendingEvang = evangelismReports.filter(r => isPending(r.status) && isInTargetYear(r.date || r.submittedAt));
    // Cell meeting newMembers means first-time visitors contacted, not conversions.
    const validMeetings = meetingReports.filter(r => isApproved(r.status) && isInTargetYear(r.meetingDate || r.submittedAt));
    const firstTimersFromCells = validMeetings.reduce((sum, r) => sum + (Number(r.newMembers) || 0), 0);
    const pendingSouls = pendingEvang.reduce((sum, r) => sum + (Number(r.verifiedSoulsWon ?? r.conversions) || 0), 0);

    let soulsFromEvangelism = 0;
    const weeklyMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    const quarterlyMap = new Map<string, number>();
    const cellMap = new Map<string, { cellName: string; souls: number; fromEvangelism: number }>();
    const teamMap = new Map<string, { souls: number; outings: number }>();
    cells.forEach(cell => cellMap.set(cell.id, { cellName: cell.name, souls: 0, fromEvangelism: 0 }));

    for (const report of validEvang) {
      const souls = Math.max(0, Number(report.verifiedSoulsWon ?? report.conversions) || 0);
      soulsFromEvangelism += souls;
      const date = new Date(report.date || report.submittedAt);
      const month = date.toLocaleString('en', { month: 'short' });
      const week = `Week ${Math.ceil(date.getDate() / 7)} (${month})`;
      const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      weeklyMap.set(week, (weeklyMap.get(week) || 0) + souls);
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + souls);
      quarterlyMap.set(quarter, (quarterlyMap.get(quarter) || 0) + souls);
      const cell = cellMap.get(report.cellId) || { cellName: report.cellName || 'Unassigned Cell', souls: 0, fromEvangelism: 0 };
      cellMap.set(report.cellId, { cellName: report.cellName || cell.cellName, souls: cell.souls + souls, fromEvangelism: cell.fromEvangelism + souls });
      const leader = report.tutorName || 'Field Team';
      const team = teamMap.get(leader) || { souls: 0, outings: 0 };
      teamMap.set(leader, { souls: team.souls + souls, outings: team.outings + 1 });
    }

    const verifiedSoulsWon = soulsFromEvangelism;
    const remainingSouls = Math.max(0, annualTarget - verifiedSoulsWon);
    const percentageAchieved = annualTarget > 0 ? Math.min(100, Math.round((verifiedSoulsWon / annualTarget) * 100)) : 0;
    const cellContributions = Array.from(cellMap.entries()).map(([cellId, data]) => ({
      cellId, cellName: data.cellName, souls: data.souls,
      percentage: verifiedSoulsWon > 0 ? Math.round((data.souls / verifiedSoulsWon) * 100) : 0,
      fromEvangelism: data.fromEvangelism, fromCells: 0,
    })).sort((a, b) => b.souls - a.souls);
    const teamContributions = Array.from(teamMap.entries()).map(([leaderName, data]) => ({ leaderName, souls: data.souls, outings: data.outings })).sort((a, b) => b.souls - a.souls);

    return {
      annualTarget, year, verifiedSoulsWon, remainingSouls, percentageAchieved,
      soulsFromEvangelism, soulsFromCells: 0, firstTimersFromCells, pendingSouls,
      weeklyProgress: Array.from(weeklyMap.entries()).map(([week, souls]) => ({ week, souls })),
      monthlyProgress: Array.from(monthlyMap.entries()).map(([month, souls]) => ({ month, souls })),
      quarterlyProgress: Array.from(quarterlyMap.entries()).map(([quarter, souls]) => ({ quarter, souls })),
      cellContributions, teamContributions,
    };
  }

  /**
   * Pushes recalculated metrics to all active live listeners
   */
  static async notifySubscribers(): Promise<void> {
    if (this.liveListeners.size === 0) return;
    try {
      const metrics = await this.calculateMetrics();
      this.liveListeners.forEach(cb => {
        try {
          cb(metrics);
        } catch (e) {
          console.warn('Live subscriber error', e);
        }
      });
    } catch (e) {
      console.warn('Failed recalculating live soul metrics', e);
    }
  }

  /**
   * Real-Time Live Tracking Subscription:
   * Attaches live subscription to Supabase Realtime and storage events.
   * Both cell reports and evangelism reports trigger instantaneous metric updates.
   */
  static subscribeToLiveSoulTracking(callback: (metrics: SoulTargetMetrics) => void): () => void {
    this.liveListeners.add(callback);

    // Initial calculation
    this.calculateMetrics()
      .then(m => {
        if (this.liveListeners.has(callback)) {
          callback(m);
        }
      })
      .catch(console.warn);

    // Supabase Realtime channel listeners
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        channel = supabase
          .channel('public:soul_tracking')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'cell_meeting_reports' }, () => {
            this.notifySubscribers();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'evangelism_reports' }, () => {
            this.notifySubscribers();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
            this.notifySubscribers();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'soul_target_configs' }, () => {
            this.notifySubscribers();
          })
          .subscribe();
      } catch (e) {
        console.warn('Supabase Realtime soul tracking setup notice:', e);
      }
    }

    // Periodic reconciliation is a fallback if a device temporarily loses its Realtime socket.
    const refreshTimer = typeof window !== 'undefined' ? window.setInterval(() => this.notifySubscribers(), 30000) : null;

    // Cross-tab storage synchronization
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key?.includes('meeting_reports') ||
        e.key?.includes('evangelism_reports') ||
        e.key?.includes('settings') ||
        e.key?.includes('cells')
      ) {
        this.notifySubscribers();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    return () => {
      this.liveListeners.delete(callback);
      if (channel && supabase) {
        supabase.removeChannel(channel).catch(() => {});
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        if (refreshTimer !== null) window.clearInterval(refreshTimer);
      }
    };
  }
}
