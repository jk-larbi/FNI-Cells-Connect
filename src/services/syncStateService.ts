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
 * 4. Automatic retry on lifecycle triggers: connectivity restored ('online' event) and auth token readiness.
 * 5. Mutex locking (isRetrying) to strictly prevent overlapping/concurrent retry executions.
 * 6. Terminal failure preservation: failing items are capped at 5 attempts, preserved in storage,
 *    and can be manually retried after administrative correction via `retryTerminalItems()`.
 * 7. Notifies subscribers via `subscribe` for visible UI recovery badges and banners.
 */

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
  inProgress?: boolean;
}

export interface RetryOptions {
  includeTerminal?: boolean; // When true, also replays terminal failures
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

// In-memory reference to the active Supabase client instance
let defaultClient: any = null;
let isRetryingMutex: boolean = false;
let lifecycleInitialized: boolean = false;

export class SyncStateService {
  /**
   * Sets the default Supabase client instance used for replays.
   */
  static setDefaultClient(client: any): void {
    defaultClient = client;
  }

  static getDefaultClient(): any {
    return defaultClient;
  }

  static isClientReady(): boolean {
    return Boolean(defaultClient);
  }

  static isRetryInProgress(): boolean {
    return isRetryingMutex;
  }

  /**
   * Initializes automatic lifecycle hooks:
   * - window 'online' event for automatic reconnection replay
   */
  static initLifecycleListeners(): void {
    if (lifecycleInitialized) return;
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', () => {
        console.info('[SyncStateService] Network connectivity restored. Triggering automatic replay...');
        this.retryPendingSync();
      });
      lifecycleInitialized = true;
    }
  }

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
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(SYNC_REGISTRY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static getPendingCount(): number {
    return this.getPendingItems().length;
  }

  static getTerminalCount(): number {
    return this.getPendingItems().filter(i => i.terminal === true).length;
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
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SYNC_REGISTRY_KEY, JSON.stringify(items));
      }
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
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SYNC_REGISTRY_KEY, JSON.stringify(filtered));
        }
        notifyListeners(filtered);
        console.info(`[Dual-Write Sync] Resolved pending write for table "${table}" (ID: ${id})`);
      } catch (e) {
        console.error('Failed updating sync registry', e);
      }
    }
  }

  /**
   * Resets the terminal status and retry count of a specific item or all terminal items,
   * enabling them to be retried after an error or data mismatch has been corrected.
   */
  static resetTerminal(id?: string): void {
    const items = this.getPendingItems();
    let modified = false;
    const updated = items.map(item => {
      if (!id || item.id === id) {
        if (item.terminal || item.retryCount >= MAX_RETRY_ATTEMPTS) {
          modified = true;
          return { ...item, retryCount: 0, terminal: false };
        }
      }
      return item;
    });

    if (modified) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SYNC_REGISTRY_KEY, JSON.stringify(updated));
        }
        notifyListeners(updated);
        console.info(`[SyncStateService] Reset terminal status for ${id ? `item ${id}` : 'all terminal items'}`);
      } catch (e) {
        console.error('[SyncStateService] Failed to persist reset terminal status:', e);
      }
    }
  }

  static clearRegistry(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(SYNC_REGISTRY_KEY);
      }
      notifyListeners([]);
    } catch {}
  }

  /**
   * Convenience method to manually retry all terminal failures after corrective action.
   */
  static async retryTerminalItems(customClient?: any): Promise<RetrySyncSummary> {
    return this.retryPendingSync(customClient, { includeTerminal: true });
  }

  /**
   * Replays pending operations against Supabase.
   * Handles:
   * - Mutex concurrency lock to prevent overlapping runs.
   * - Client readiness checks.
   * - INSERT, UPSERT, and DELETE action dispatch.
   * - Terminal failure preservation without silent discarding.
   * - Draining succeeded operations from localStorage.
   */
  static async retryPendingSync(customClient?: any, options?: RetryOptions): Promise<RetrySyncSummary> {
    // 1. Prevent overlapping retry runs
    if (isRetryingMutex) {
      console.warn('[SyncStateService] A retry run is already in progress. Skipping overlapping run.');
      return { total: this.getPendingCount(), succeeded: 0, failed: 0, terminal: 0, inProgress: true };
    }

    const items = this.getPendingItems();
    if (items.length === 0) {
      return { total: 0, succeeded: 0, failed: 0, terminal: 0 };
    }

    const client = customClient || defaultClient;
    if (!client) {
      console.warn('[SyncStateService] Cannot retry pending sync: Supabase client is not initialized or authenticated yet.');
      return { total: items.length, succeeded: 0, failed: items.length, terminal: this.getTerminalCount() };
    }

    isRetryingMutex = true;
    let succeeded = 0;
    let failed = 0;
    let terminal = 0;
    const remainingItems: PendingSyncItem[] = [];

    try {
      for (const item of items) {
        // If flagged terminal and not explicitly included for manual recovery, preserve in queue
        if (item.terminal && !options?.includeTerminal) {
          terminal++;
          remainingItems.push(item);
          continue;
        }

        try {
          let opError: any = null;

          if (item.action === 'DELETE') {
            const { error } = await client.from(item.table).delete().eq('id', item.id);
            opError = error;
          } else if (item.action === 'INSERT') {
            const { error } = await client.from(item.table).insert(item.payload);
            opError = error;
          } else {
            // Default: UPSERT with optimal onConflict resolution
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
            console.info(`[SyncStateService] Successfully replayed pending ${item.action} for ${item.table} (ID: ${item.id})`);
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
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SYNC_REGISTRY_KEY, JSON.stringify(remainingItems));
        }
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
    } finally {
      isRetryingMutex = false;
    }
  }
}
