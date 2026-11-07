import { Cell, WeeklyReport, NotificationItem, ReportStatus } from '../types';
import {
  upsertReportInSupabase,
  reviewReportInSupabase,
  insertNotificationToSupabase,
  fetchCellsFromSupabase,
  fetchReportsFromSupabase,
  fetchNotificationsFromSupabase
} from './supabaseService';

const STORAGE_KEY = 'fni-reporting-prod-v1';

export const getMonday = (d: Date | number | string = new Date()): string => {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday is 0, Sunday is 6
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export interface AppDataStore {
  cells: Cell[];
  reports: WeeklyReport[];
  notifications: NotificationItem[];
}

function initialSeed(): AppDataStore {
  const leaderInfo: Array<[string, string, string, string, string]> = [
    ['Kwame Mensah', 'Cape Coast', 'kwame.mensah@fni.org', '+233 24 112 3456', 'Wednesday'],
    ['Ama Owusu', 'Kasoa', 'ama.owusu@fni.org', '+233 20 223 4567', 'Thursday'],
    ['Kofi Boateng', 'Accra Central', 'kofi.boateng@fni.org', '+233 55 334 5678', 'Tuesday'],
    ['Abena Asare', 'Takoradi', 'abena.asare@fni.org', '+233 27 445 6789', 'Wednesday'],
    ['Yaw Darko', 'Kumasi', 'yaw.darko@fni.org', '+233 26 556 7890', 'Friday'],
    ['Efua Quaye', 'Winneba', 'efua.quaye@fni.org', '+233 24 667 8901', 'Tuesday']
  ];

  const cellNames = ['Grace', 'Zion', 'Bethel', 'Antioch', 'Berea', 'Ephesus'];

  const cells: Cell[] = leaderInfo.map((l, i) => ({
    id: `c${i + 1}`,
    name: `${cellNames[i]} Cell`,
    leader: l[0],
    area: l[1],
    leaderEmail: l[2],
    leaderPhone: l[3],
    meetingDay: l[4],
    meetingTime: '18:30',
    active: true,
    createdAt: '2026-01-15'
  }));

  // Fresh new system: no mock reports pre-populated
  const reports: WeeklyReport[] = [];
  const currentMon = getMonday();

  const notifications: NotificationItem[] = [
    {
      id: 'notif_welcome',
      to: 'all',
      title: 'FNI Digital Reporting System Online',
      msg: 'Welcome to the official FNI Digital Reporting System. Cell leaders are required to submit their weekly returns on or before Monday midnight.',
      date: currentMon,
      read: false,
      type: 'broadcast'
    }
  ];

  return { cells, reports, notifications };
}

let memoryStore: AppDataStore | null = null;

export function loadStore(): AppDataStore {
  if (memoryStore) return memoryStore;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memoryStore = JSON.parse(raw);
      if (memoryStore && Array.isArray(memoryStore.cells) && Array.isArray(memoryStore.reports)) {
        return memoryStore;
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored FNI data, restoring seed.', e);
  }

  memoryStore = initialSeed();
  saveStore(memoryStore);
  return memoryStore;
}

export function saveStore(store: AppDataStore): void {
  memoryStore = store;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Error saving store to localStorage:', e);
  }
}

export function resetStore(): AppDataStore {
  const seed = initialSeed();
  saveStore(seed);
  return seed;
}

// ---------------------------------------------------------------------------
// Cells API
// ---------------------------------------------------------------------------
export function getCells(): Cell[] {
  return loadStore().cells;
}

export function getCell(id?: string): Cell | undefined {
  if (!id) return undefined;
  return loadStore().cells.find(c => c.id === id);
}

export function addCell(newCellData: Omit<Cell, 'id' | 'createdAt'>): Cell {
  const store = loadStore();
  const id = `c_${Date.now()}`;
  const cell: Cell = {
    ...newCellData,
    id,
    createdAt: new Date().toISOString().slice(0, 10)
  };
  store.cells.push(cell);
  saveStore(store);

  addNotification({
    to: 'admin',
    title: 'New Cell Registered',
    msg: `New cell "${cell.name}" in ${cell.area} was registered with leader ${cell.leader}.`,
    type: 'broadcast',
    metadata: { cellId: cell.id }
  });

  return cell;
}

export function updateCell(id: string, updates: Partial<Cell>): Cell | undefined {
  const store = loadStore();
  const index = store.cells.findIndex(c => c.id === id);
  if (index === -1) return undefined;
  store.cells[index] = { ...store.cells[index], ...updates };
  saveStore(store);
  return store.cells[index];
}

// ---------------------------------------------------------------------------
// Reports API
// ---------------------------------------------------------------------------
export function getReports(): WeeklyReport[] {
  return loadStore().reports;
}

export function getReport(id?: string): WeeklyReport | undefined {
  if (!id) return undefined;
  return loadStore().reports.find(r => r.id === id);
}

export function getReportByCellAndWeek(cellId: string, week: string): WeeklyReport | undefined {
  return loadStore().reports.find(r => r.cell === cellId && r.week === week);
}

export function upsertReport(reportData: Omit<WeeklyReport, 'id' | 'date'> & { id?: string }): WeeklyReport {
  const store = loadStore();
  const existingIndex = store.reports.findIndex(
    r => (reportData.id && r.id === reportData.id) || (r.cell === reportData.cell && r.week === reportData.week)
  );

  const nowIso = new Date().toISOString().slice(0, 10);
  let savedReport: WeeklyReport;

  if (existingIndex >= 0) {
    savedReport = {
      ...store.reports[existingIndex],
      ...reportData,
      date: nowIso
    };
    store.reports[existingIndex] = savedReport;
  } else {
    savedReport = {
      ...reportData,
      id: `rep_${Date.now()}`,
      date: nowIso
    };
    store.reports.push(savedReport);
  }

  // If submitted, notify administrator
  if (savedReport.status === 'Submitted') {
    const cellObj = store.cells.find(c => c.id === savedReport.cell);
    const cellName = cellObj ? cellObj.name : 'A cell';
    addNotification({
      to: 'admin',
      title: 'Report Submitted',
      msg: `${cellName} submitted weekly report for ${formatDate(savedReport.week)}.`,
      type: 'submission',
      metadata: { reportId: savedReport.id, cellId: savedReport.cell, week: savedReport.week }
    });
  }

  saveStore(store);

  // Background sync to Supabase if connected
  upsertReportInSupabase(savedReport).catch(err => {
    console.debug('Supabase background sync notice:', err);
  });

  return savedReport;
}

export function reviewReport(
  reportId: string,
  newStatus: 'Approved' | 'Returned',
  reviewerNote: string,
  reviewerName = 'Administrator'
): WeeklyReport | undefined {
  const store = loadStore();
  const report = store.reports.find(r => r.id === reportId);
  if (!report) return undefined;

  report.status = newStatus;
  report.note = reviewerNote;
  report.reviewedAt = new Date().toISOString();
  report.reviewedBy = reviewerName;

  const cellObj = store.cells.find(c => c.id === report.cell);
  const cellName = cellObj ? cellObj.name : 'Your cell';

  // Notify cell leader
  addNotification({
    to: report.cell,
    title: newStatus === 'Approved' ? 'Report Approved' : 'Report Returned for Revision',
    msg: newStatus === 'Approved'
      ? `Your weekly report for ${formatDate(report.week)} was approved.${reviewerNote ? ` Note: "${reviewerNote}"` : ''}`
      : `Your weekly report for ${formatDate(report.week)} was returned for revision. Note: "${reviewerNote}"`,
    type: 'review',
    metadata: { reportId: report.id, cellId: report.cell, week: report.week }
  });

  saveStore(store);

  // Background sync review to Supabase if connected
  reviewReportInSupabase(reportId, newStatus, reviewerNote, reviewerName).catch(err => {
    console.debug('Supabase review sync notice:', err);
  });

  return report;
}

// ---------------------------------------------------------------------------
// Notifications API
// ---------------------------------------------------------------------------
export function getNotifications(recipientTarget?: string): NotificationItem[] {
  const all = loadStore().notifications;
  if (!recipientTarget) return all;
  return all.filter(n => n.to === recipientTarget || n.to === 'all');
}

export function addNotification(notif: Omit<NotificationItem, 'id' | 'date' | 'read'>): NotificationItem {
  const store = loadStore();
  const item: NotificationItem = {
    ...notif,
    id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString().slice(0, 10),
    read: false
  };
  store.notifications.unshift(item);
  saveStore(store);

  // Background sync notification to Supabase if connected
  insertNotificationToSupabase(item).catch(err => {
    console.debug('Supabase notification sync notice:', err);
  });

  return item;
}

export function markNotificationAsRead(id: string): void {
  const store = loadStore();
  const item = store.notifications.find(n => n.id === id);
  if (item) {
    item.read = true;
    saveStore(store);
  }
}

export function markAllNotificationsAsRead(recipientTarget: string): void {
  const store = loadStore();
  store.notifications.forEach(n => {
    if (n.to === recipientTarget || n.to === 'all') {
      n.read = true;
    }
  });
  saveStore(store);
}

/**
 * Synchronize local cache with live Supabase database
 */
export async function syncWithSupabase(): Promise<{
  success: boolean;
  cellsSynced: number;
  reportsSynced: number;
  notificationsSynced: number;
  message: string;
}> {
  try {
    const [remoteCells, remoteReports, remoteNotifs] = await Promise.all([
      fetchCellsFromSupabase(),
      fetchReportsFromSupabase(),
      fetchNotificationsFromSupabase()
    ]);

    if (!remoteCells && !remoteReports && !remoteNotifs) {
      return {
        success: false,
        cellsSynced: 0,
        reportsSynced: 0,
        notificationsSynced: 0,
        message: 'Could not connect to Supabase tables. Ensure credentials and SQL schema are deployed.'
      };
    }

    const store = loadStore();
    let cellsSynced = 0;
    let reportsSynced = 0;
    let notificationsSynced = 0;

    if (remoteCells && remoteCells.length > 0) {
      // Merge remote cells
      remoteCells.forEach(rc => {
        const idx = store.cells.findIndex(c => c.id === rc.id || c.name.toLowerCase() === rc.name.toLowerCase());
        if (idx >= 0) {
          store.cells[idx] = { ...store.cells[idx], ...rc };
        } else {
          store.cells.push(rc);
        }
        cellsSynced++;
      });
    }

    if (remoteReports && remoteReports.length > 0) {
      // Merge remote reports
      remoteReports.forEach(rr => {
        const idx = store.reports.findIndex(r => r.id === rr.id || (r.cell === rr.cell && r.week === rr.week));
        if (idx >= 0) {
          store.reports[idx] = { ...store.reports[idx], ...rr };
        } else {
          store.reports.push(rr);
        }
        reportsSynced++;
      });
    }

    if (remoteNotifs && remoteNotifs.length > 0) {
      remoteNotifs.forEach(rn => {
        if (!store.notifications.some(n => n.id === rn.id)) {
          store.notifications.unshift(rn);
          notificationsSynced++;
        }
      });
    }

    saveStore(store);

    return {
      success: true,
      cellsSynced,
      reportsSynced,
      notificationsSynced,
      message: `Synchronized with Supabase (${cellsSynced} cells, ${reportsSynced} reports, ${notificationsSynced} notices).`
    };
  } catch (err: any) {
    return {
      success: false,
      cellsSynced: 0,
      reportsSynced: 0,
      notificationsSynced: 0,
      message: err.message || 'Failed to synchronize with Supabase.'
    };
  }
}
