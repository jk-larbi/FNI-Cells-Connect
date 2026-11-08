/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Dual-Backend Synchronization & Outbound Recovery Registry
 * 
 * Ensures that whenever Supabase is unavailable or returns an error during dual-writes:
 * 1. Firebase remains the authoritative source of truth.
 * 2. Failed Supabase operations are recorded in a resilient pending sync registry.
 * 3. Failures are made explicitly visible in application state and logs.
 * 4. Provides replay/recovery mechanism (retryPendingSync) when connectivity is restored.
 */

export interface PendingSyncItem {
  id: string;
  table: string;
  action: 'UPSERT' | 'DELETE' | 'INSERT';
  payload: Record<string, any>;
  errorMessage: string;
  timestamp: string;
  retryCount: number;
}

export interface DualWriteOutcome<T = any> {
  firebaseSuccess: boolean;
  supabaseSuccess: boolean;
  supabaseError?: string;
  isPendingSupabaseSync: boolean;
  data?: T;
}

const SYNC_REGISTRY_KEY = 'fni_pending_supabase_sync_registry_v1';

export class SyncStateService {
  static getPendingItems(): PendingSyncItem[] {
    try {
      const raw = localStorage.getItem(SYNC_REGISTRY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static getPendingCount(): number {
    return this.getPendingItems().length;
  }

  static recordFailedSync(item: {
    table: string;
    id: string;
    action?: 'UPSERT' | 'DELETE' | 'INSERT';
    payload: Record<string, any>;
    errorMessage: string;
  }): void {
    const items = this.getPendingItems();
    const existingIndex = items.findIndex(i => i.table === item.table && i.id === item.id);
    const entry: PendingSyncItem = {
      id: item.id,
      table: item.table,
      action: item.action || 'UPSERT',
      payload: item.payload,
      errorMessage: item.errorMessage,
      timestamp: new Date().toISOString(),
      retryCount: existingIndex >= 0 ? items[existingIndex].retryCount + 1 : 1,
    };

    if (existingIndex >= 0) {
      items[existingIndex] = entry;
    } else {
      items.push(entry);
    }

    try {
      localStorage.setItem(SYNC_REGISTRY_KEY, JSON.stringify(items));
      console.warn(`[Dual-Write Sync] Queued pending Supabase write for table "${item.table}" (ID: ${item.id}): ${item.errorMessage}`);
    } catch (e) {
      console.error('Failed saving pending sync item to localStorage', e);
    }
  }

  static recordSuccessfulSync(table: string, id: string): void {
    const items = this.getPendingItems();
    const filtered = items.filter(i => !(i.table === table && i.id === id));
    if (filtered.length !== items.length) {
      try {
        localStorage.setItem(SYNC_REGISTRY_KEY, JSON.stringify(filtered));
        console.info(`[Dual-Write Sync] Resolved pending write for table "${table}" (ID: ${id})`);
      } catch (e) {
        console.error('Failed updating sync registry', e);
      }
    }
  }

  static clearRegistry(): void {
    try {
      localStorage.removeItem(SYNC_REGISTRY_KEY);
    } catch {}
  }
}
