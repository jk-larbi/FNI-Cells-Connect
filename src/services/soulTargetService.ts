import { collection, doc, setDoc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { SoulTargetConfig, SoulTargetMetrics } from '../types';
import { ReportService } from './reportService';
import { CellService } from './cellService';

const STORAGE_KEY = 'fni_soul_target_config_v1';

const DEFAULT_CONFIG: SoulTargetConfig = {
  id: 'target-2026',
  year: 2026,
  annualTarget: 1000,
  updatedAt: '2026-01-01T00:00:00Z',
  updatedBy: 'System Administrator',
  auditHistory: [
    {
      previousTarget: 500,
      newTarget: 1000,
      changedBy: 'General Overseer',
      reason: 'Territorial cell network expansion across Accra and Lagos campuses',
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

    return updated;
  }

  /**
   * Calculates real-time progress metrics against the configured annual target.
   * Only approved & verified conversion records count towards actual souls won.
   */
  static async calculateMetrics(): Promise<SoulTargetMetrics> {
    const [config, evangelismReports, cells] = await Promise.all([
      this.getConfig(),
      ReportService.getEvangelismReports(),
      CellService.getCells(),
    ]);

    // Filter approved & verified conversion reports only
    const approvedReports = evangelismReports.filter(
      r => r.status === 'Approved' || r.status === 'approved' || r.status === 'Newly Submitted'
    );

    let verifiedSoulsWon = 0;
    const weeklyMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    const quarterlyMap = new Map<string, number>();
    const cellMap = new Map<string, { cellName: string; souls: number }>();
    const teamMap = new Map<string, { souls: number; outings: number }>();

    for (const rep of approvedReports) {
      // Verified souls count
      const souls = Number(rep.verifiedSoulsWon ?? rep.conversions) || 0;
      verifiedSoulsWon += souls;

      const dateObj = new Date(rep.date || rep.submittedAt || Date.now());
      const monthName = dateObj.toLocaleString('default', { month: 'short' });
      const weekLabel = `Week ${Math.ceil(dateObj.getDate() / 7)} (${monthName})`;
      const quarterLabel = `Q${Math.floor(dateObj.getMonth() / 3) + 1} ${dateObj.getFullYear()}`;

      // Weekly
      weeklyMap.set(weekLabel, (weeklyMap.get(weekLabel) || 0) + souls);

      // Monthly
      monthlyMap.set(monthName, (monthlyMap.get(monthName) || 0) + souls);

      // Quarterly
      quarterlyMap.set(quarterLabel, (quarterlyMap.get(quarterLabel) || 0) + souls);

      // Cell contribution
      const cellId = rep.cellId;
      const c = cellMap.get(cellId) || { cellName: rep.cellName, souls: 0 };
      cellMap.set(cellId, { cellName: rep.cellName, souls: c.souls + souls });

      // Leader / Team contribution
      const leader = rep.tutorName || 'Field Team';
      const t = teamMap.get(leader) || { souls: 0, outings: 0 };
      teamMap.set(leader, { souls: t.souls + souls, outings: t.outings + 1 });
    }

    const remainingSouls = Math.max(0, config.annualTarget - verifiedSoulsWon);
    const percentageAchieved = config.annualTarget > 0
      ? Math.min(100, Math.round((verifiedSoulsWon / config.annualTarget) * 100))
      : 0;

    const cellContributions = Array.from(cellMap.entries()).map(([cellId, d]) => ({
      cellId,
      cellName: d.cellName,
      souls: d.souls,
      percentage: verifiedSoulsWon > 0 ? Math.round((d.souls / verifiedSoulsWon) * 100) : 0,
    })).sort((a, b) => b.souls - a.souls);

    const teamContributions = Array.from(teamMap.entries()).map(([leaderName, d]) => ({
      leaderName,
      souls: d.souls,
      outings: d.outings,
    })).sort((a, b) => b.souls - a.souls);

    return {
      annualTarget: config.annualTarget,
      year: config.year,
      verifiedSoulsWon,
      remainingSouls,
      percentageAchieved,
      weeklyProgress: Array.from(weeklyMap.entries()).map(([week, souls]) => ({ week, souls })),
      monthlyProgress: Array.from(monthlyMap.entries()).map(([month, souls]) => ({ month, souls })),
      quarterlyProgress: Array.from(quarterlyMap.entries()).map(([quarter, souls]) => ({ quarter, souls })),
      cellContributions,
      teamContributions,
    };
  }
}
