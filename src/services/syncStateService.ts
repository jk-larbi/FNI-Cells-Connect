/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Dual-Backend Synchronization & Outbound Recovery Registry
 * 
 * ARCHITECTURAL NOTICE ON DURABILITY & SCOPE:
 * This registry uses the browser's HTML5 LocalStorage as an in-browser, single-client
 * retry buffer for the active device session. It is NOT a cross-device durable queue.
 * If a user switches devices or clears browser data, pending offline writes remain local
 * to this browser instance until replayed. Firebase remains the authoritative source of truth.
 * 
 * Capabilities:
 * 1. Guarantees Firebase is authoritative; failed Supabase operations never block the user.
 * 2. Records failed writes in 'fni_pending_supabase_sync_registry_v1' with payload, table, and error.
 * 3. Provides genuine replay/recovery mechanism via `retryPendingSync(client)` with backoff tracking.
 * 4. Notifies subscribers via `subscribe` for visible UI recovery badges and banners.
 */

import { supabase } from '../lib/supabase';

export interface PendingSyncItem {
  id: string;
  table: string;
  action: 'UPSERT' | 'DELETE' | 'INSERT';
  payload: Record<string, any>;
  errorMessage: string;
  timestamp: string;
  retryCount: number;
  terminal?: boolean;
}

export interface DualWriteOutcome<T = any> {
  firebaseSuccess: boolean;
  supabaseSuccess: boolean;
  supabaseError?: string;
  isPendingSupabaseSync: boolean;
  data?: T;
}

export interface RetrySyncSummary {
  total: number;
  succeeded: number;
  failed: number;
  terminal: number;
}

const SYNC_REGISTRY_KEY = 'fni_pending_supabase_sync_registry_v1';
const MAX_RETRY_ATTEMPTS = 5;

type SyncListener = (pendingCount: number, items: PendingSyncItem[]) => void;
const listeners: Set<SyncListener> = new Set();

function notifyListeners(items: PendingSyncItem[]): void {
  const count = items.length;
  listeners.forEach(cb => {
    try {
      cb(count, items);
    } catch (e) {
      console.warn('[SyncStateService] Listener error:', e);
    }
  });
}

export class SyncStateService {
  /**
   * Register a callback to be notified whenever pending queue count changes
   */
  static subscribe(listener: SyncListener): () => void {
    listeners.add(listener);
    // Initial notification
    listener(this.getPendingCount(), this.getPendingItems());
    return () => listeners.delete(listener);
  }

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
    const existing = existingIndex >= 0 ? items[existingIndex] : null;

    const retryCount = existing ? existing.retryCount + 1 : 1;
    const isTerminal = retryCount >= MAX_RETRY_ATTEMPTS;

    const entry: PendingSyncItem = {
      id: item.id,
      table: item.table,
      action: item.action || 'UPSERT',
      payload: item.payload,
      errorMessage: item.errorMessage,
      timestamp: new Date().toISOString(),
      retryCount,
      terminal: isTerminal,
    };

    if (existingIndex >= 0) {
      items[existingIndex] = entry;
    } else {
      items.push(entry);
    }

    try {
      localStorage.setItem(SYNC_REGISTRY_KEY, JSON.stringify(items));
      notifyListeners(items);
      console.warn(`[Dual-Write Sync] Queued pending Supabase write for table "${item.table}" (ID: ${item.id}) [attempt ${retryCount}]: ${item.errorMessage}`);
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
        notifyListeners(filtered);
        console.info(`[Dual-Write Sync] Resolved pending write for table "${table}" (ID: ${id})`);
      } catch (e) {
        console.error('Failed updating sync registry', e);
      }
    }
  }

  static clearRegistry(): void {
    try {
      localStorage.removeItem(SYNC_REGISTRY_KEY);
      notifyListeners([]);
    } catch {}
  }

  /**
   * Replays pending operations against Supabase.
   * Can accept an optional Supabase client instance (useful for unit testing and custom token contexts).
   */
  static async retryPendingSync(customClient?: any): Promise<RetrySyncSummary> {
    const client = customClient || supabase;
    const items = this.getPendingItems();
    
    if (items.length === 0) {
      return { total: 0, succeeded: 0, failed: 0, terminal: 0 };
    }

    if (!client) {
      console.warn('[SyncStateService] Cannot retry pending sync: Supabase client is not initialized.');
      return { total: items.length, succeeded: 0, failed: items.length, terminal: 0 };
    }

    let succeeded = 0;
    let failed = 0;
    let terminal = 0;
    const remainingItems: PendingSyncItem[] = [];

    for (const item of items) {
      // If already flagged terminal and max retries exceeded, preserve without hammering unless reset
      if (item.retryCount >= MAX_RETRY_ATTEMPTS) {
        terminal++;
        remainingItems.push(item);
        continue;
      }

      try {
        let opError: any = null;

        if (item.action === 'DELETE') {
          const { error } = await client.from(item.table).delete().eq('id', item.id);
          opError = error;
        } else {
          // Determine optimal onConflict key for table
          let onConflict = 'id';
          if (item.table === 'cells') onConflict = 'firebase_id';
          else if (item.table === 'system_settings') onConflict = 'id';
          else if (item.table === 'soul_targets' || item.table === 'soul_target_configs') onConflict = 'year';
          else if (item.table === 'device_tokens') onConflict = 'token';
          else if (item.table === 'invitation_codes') onConflict = 'code';
          else if (item.table === 'reporting_periods') onConflict = 'year,week_number';

          const { error } = await client.from(item.table).upsert(item.payload, { onConflict });
          opError = error;
        }

        if (!opError) {
          succeeded++;
          console.info(`[SyncStateService] Successfully replayed pending write for ${item.table} (ID: ${item.id})`);
        } else {
          failed++;
          const newRetryCount = item.retryCount + 1;
          const isNowTerminal = newRetryCount >= MAX_RETRY_ATTEMPTS;
          if (isNowTerminal) terminal++;

          remainingItems.push({
            ...item,
            retryCount: newRetryCount,
            errorMessage: opError.message || String(opError),
            timestamp: new Date().toISOString(),
            terminal: isNowTerminal,
          });
          console.warn(`[SyncStateService] Replay failed for ${item.table} (ID: ${item.id}) [attempt ${newRetryCount}]: ${opError.message}`);
        }
      } catch (err: any) {
        failed++;
        const newRetryCount = item.retryCount + 1;
        const isNowTerminal = newRetryCount >= MAX_RETRY_ATTEMPTS;
        if (isNowTerminal) terminal++;

        remainingItems.push({
          ...item,
          retryCount: newRetryCount,
          errorMessage: err?.message || String(err),
          timestamp: new Date().toISOString(),
          terminal: isNowTerminal,
        });
        console.warn(`[SyncStateService] Replay exception for ${item.table} (ID: ${item.id}):`, err);
      }
    }

    try {
      localStorage.setItem(SYNC_REGISTRY_KEY, JSON.stringify(remainingItems));
      notifyListeners(remainingItems);
    } catch (e) {
      console.error('[SyncStateService] Failed to persist remaining sync items:', e);
    }

    return {
      total: items.length,
      succeeded,
      failed,
      terminal,
    };
  }
}
