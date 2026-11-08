import { collection, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
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
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDoc(doc(db, 'soulTargets', 'target-2026'));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as SoulTargetConfig;
          setStoredConfig(data);
          return data;
        }
      } catch (e) {
        console.warn('Firebase getConfig notice:', e);
      }
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

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'soulTargets', 'target-2026'), updated);
      } catch (e) {
        console.warn('Firebase save target notice:', e);
      }
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
      this.getConfig(),
      SettingsService.getSettings(),
      ReportService.getEvangelismReports(),
      ReportService.getCellMeetingReports(),
      CellService.getCells(),
    ]);

    const annualTarget = settings.annualSoulWinningTarget || config.annualTarget || 5000;

    // Filter valid reports (approved, newly submitted, or under review)
    const validEvang = evangelismReports.filter(
      r => r.status === 'Approved' || r.status === 'approved' || r.status === 'Newly Submitted' || r.status === 'submitted' || r.status === 'under_review'
    );
    const validMeetings = meetingReports.filter(
      r => r.status === 'Approved' || r.status === 'approved' || r.status === 'Newly Submitted' || r.status === 'submitted' || r.status === 'under_review'
    );

    let soulsFromEvangelism = 0;
    let soulsFromCells = 0;

    const weeklyMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    const quarterlyMap = new Map<string, number>();
    const cellMap = new Map<string, { cellName: string; souls: number; fromEvangelism: number; fromCells: number }>();
    const teamMap = new Map<string, { souls: number; outings: number }>();

    // Seed existing cells into cellMap so all cells appear in contributions
    cells.forEach(c => {
      cellMap.set(c.id, {
        cellName: c.name,
        souls: 0,
        fromEvangelism: 0,
        fromCells: 0,
      });
    });

    // 1. Process Evangelism Outreach Reports
    for (const rep of validEvang) {
      const souls = Number(rep.verifiedSoulsWon ?? rep.conversions) || 0;
      soulsFromEvangelism += souls;

      const dateObj = new Date(rep.date || rep.submittedAt || Date.now());
      const monthName = dateObj.toLocaleString('default', { month: 'short' });
      const weekLabel = `Week ${Math.ceil(dateObj.getDate() / 7)} (${monthName})`;
      const quarterLabel = `Q${Math.floor(dateObj.getMonth() / 3) + 1} ${dateObj.getFullYear()}`;

      weeklyMap.set(weekLabel, (weeklyMap.get(weekLabel) || 0) + souls);
      monthlyMap.set(monthName, (monthlyMap.get(monthName) || 0) + souls);
      quarterlyMap.set(quarterLabel, (quarterlyMap.get(quarterLabel) || 0) + souls);

      const cellId = rep.cellId;
      const c = cellMap.get(cellId) || { cellName: rep.cellName, souls: 0, fromEvangelism: 0, fromCells: 0 };
      cellMap.set(cellId, {
        cellName: rep.cellName,
        souls: c.souls + souls,
        fromEvangelism: c.fromEvangelism + souls,
        fromCells: c.fromCells,
      });

      const leader = rep.tutorName || 'Field Team';
      const t = teamMap.get(leader) || { souls: 0, outings: 0 };
      teamMap.set(leader, { souls: t.souls + souls, outings: t.outings + 1 });
    }

    // 2. Process Cell Meeting Reports (New members & converts added to cell)
    for (const rep of validMeetings) {
      const cellSouls = Number(rep.newMembers) || 0;
      soulsFromCells += cellSouls;

      const dateObj = new Date(rep.meetingDate || rep.submittedAt || Date.now());
      const monthName = dateObj.toLocaleString('default', { month: 'short' });
      const weekLabel = `Week ${Math.ceil(dateObj.getDate() / 7)} (${monthName})`;
      const quarterLabel = `Q${Math.floor(dateObj.getMonth() / 3) + 1} ${dateObj.getFullYear()}`;

      weeklyMap.set(weekLabel, (weeklyMap.get(weekLabel) || 0) + cellSouls);
      monthlyMap.set(monthName, (monthlyMap.get(monthName) || 0) + cellSouls);
      quarterlyMap.set(quarterLabel, (quarterlyMap.get(quarterLabel) || 0) + cellSouls);

      const cellId = rep.cellId;
      const c = cellMap.get(cellId) || { cellName: rep.cellName, souls: 0, fromEvangelism: 0, fromCells: 0 };
      cellMap.set(cellId, {
        cellName: rep.cellName,
        souls: c.souls + cellSouls,
        fromEvangelism: c.fromEvangelism,
        fromCells: c.fromCells + cellSouls,
      });

      const leader = rep.tutorName || 'Cell Tutor';
      const t = teamMap.get(leader) || { souls: 0, outings: 0 };
      teamMap.set(leader, { souls: t.souls + cellSouls, outings: t.outings + 1 });
    }

    const verifiedSoulsWon = soulsFromEvangelism + soulsFromCells;
    const remainingSouls = Math.max(0, annualTarget - verifiedSoulsWon);
    const percentageAchieved = annualTarget > 0
      ? Math.min(100, Math.round((verifiedSoulsWon / annualTarget) * 100))
      : 0;

    const cellContributions = Array.from(cellMap.entries())
      .map(([cellId, d]) => ({
        cellId,
        cellName: d.cellName,
        souls: d.souls,
        percentage: verifiedSoulsWon > 0 ? Math.round((d.souls / verifiedSoulsWon) * 100) : 0,
        fromEvangelism: d.fromEvangelism,
        fromCells: d.fromCells,
      }))
      .sort((a, b) => b.souls - a.souls);

    const teamContributions = Array.from(teamMap.entries())
      .map(([leaderName, d]) => ({
        leaderName,
        souls: d.souls,
        outings: d.outings,
      }))
      .sort((a, b) => b.souls - a.souls);

    return {
      annualTarget,
      year: config.year || 2026,
      verifiedSoulsWon,
      remainingSouls,
      percentageAchieved,
      soulsFromEvangelism,
      soulsFromCells,
      weeklyProgress: Array.from(weeklyMap.entries()).map(([week, souls]) => ({ week, souls })),
      monthlyProgress: Array.from(monthlyMap.entries()).map(([month, souls]) => ({ month, souls })),
      quarterlyProgress: Array.from(quarterlyMap.entries()).map(([quarter, souls]) => ({ quarter, souls })),
      cellContributions,
      teamContributions,
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
   * Attaches live snapshot listeners to Firestore and storage events.
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

    // Real-time Firestore snapshot listeners
    let unsubMeetings: (() => void) | null = null;
    let unsubEvang: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;

    if (isFirebaseConfigured && db) {
      try {
        unsubMeetings = onSnapshot(collection(db, 'cellMeetingReports'), () => {
          this.notifySubscribers();
        });
        unsubEvang = onSnapshot(collection(db, 'evangelismReports'), () => {
          this.notifySubscribers();
        });
        unsubSettings = onSnapshot(doc(db, 'settings', 'system'), () => {
          this.notifySubscribers();
        });
      } catch (e) {
        console.warn('Live snapshot setup notice:', e);
      }
    }

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
      if (unsubMeetings) unsubMeetings();
      if (unsubEvang) unsubEvang();
      if (unsubSettings) unsubSettings();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }
    };
  }
}
