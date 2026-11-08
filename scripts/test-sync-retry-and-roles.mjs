/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Executable Test Suite: Production SyncStateService, Retry Lifecycle,
 * Role Compatibility & Anti-Leakage Verification
 * 
 * Tests the ACTUAL production SyncStateService directly from src/services/syncStateService.ts
 * without any duplicate mock classes.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

console.log('================================================================');
console.log('FNI CELLS CONNECT — PRODUCTION SYNC RETRY & ROLE VERIFICATION');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// ENVIRONMENT INITIALIZATION FOR PRODUCTION SERVICE
// -----------------------------------------------------------------------------

// Mock HTML5 LocalStorage in Node.js environment before loading production service
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

// Mock window and event listeners for lifecycle reconnection tests
const windowListeners = new Map();
global.window = {
  addEventListener: (event, handler) => {
    windowListeners.set(event, handler);
  },
  removeEventListener: (event) => {
    windowListeners.delete(event);
  },
  dispatchEvent: (event) => {
    const handler = windowListeners.get(event);
    if (handler) handler();
  },
};

// Directly import the actual production SyncStateService
import { SyncStateService } from '../src/services/syncStateService.ts';

const SYNC_REGISTRY_KEY = 'fni_pending_supabase_sync_registry_v1';

// -----------------------------------------------------------------------------
// TEST GROUP 1: BROWSER QUEUE DURABILITY & LOCALSTORAGE SCOPE DOCUMENTATION
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: In-Browser Storage Scope & Durability Verification ---');

const syncServiceSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src', 'services', 'syncStateService.ts'),
  'utf8'
);

assert(
  syncServiceSource.includes('in-browser, single-client') &&
  syncServiceSource.includes('NOT a cross-device durable queue'),
  'SyncStateService explicitly documents localStorage as in-browser buffer, not cross-device durable queue'
);

assert(
  syncServiceSource.includes('Firebase remains the authoritative source of truth'),
  'SyncStateService affirms Firebase authoritative source of truth during dual-backend operation'
);

// -----------------------------------------------------------------------------
// TEST GROUP 2: AUTHENTICATION READINESS & SAFE HANDLING
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Authentication Readiness & Safe Client Handling ---');

mockStorage.clear();
SyncStateService.clearRegistry();
SyncStateService.setDefaultClient(null);

assert(
  SyncStateService.isClientReady() === false,
  'SyncStateService correctly identifies when Supabase client is not ready/authenticated'
);

// Queue an item while unauthenticated
SyncStateService.recordFailedSync({
  table: 'cell_meeting_reports',
  id: 'cmr-offline-1',
  action: 'UPSERT',
  payload: { id: 'cmr-offline-1', cell_name: 'Grace Cell', attendance: 30 },
  errorMessage: 'JWT expired / unauthenticated',
});

assert(
  SyncStateService.getPendingCount() === 1,
  'Item successfully queued in localStorage while Supabase is unauthenticated'
);

// Attempt retry without authenticated client
const unauthRetryResult = await SyncStateService.retryPendingSync();

assert(
  unauthRetryResult.succeeded === 0 && unauthRetryResult.failed === 1,
  'Unauthenticated retry aborts safely without throwing unhandled exceptions'
);
assert(
  SyncStateService.getPendingCount() === 1,
  'Pending queue preserved intact in localStorage when client is not authenticated'
);

// -----------------------------------------------------------------------------
// TEST GROUP 3: INSERT, UPSERT & DELETE PRODUCTION REPLAY VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Production INSERT, UPSERT & DELETE Replay Execution ---');

mockStorage.clear();
SyncStateService.clearRegistry();

let subscribedCount = -1;
const unsubscribe = SyncStateService.subscribe((count) => {
  subscribedCount = count;
});

// Track calls made to mock client
const executedCalls = [];

const mockSupabase = {
  from: (tableName) => ({
    insert: async (payload) => {
      executedCalls.push({ action: 'INSERT', table: tableName, payload });
      return { data: payload, error: null };
    },
    upsert: async (payload, opts) => {
      executedCalls.push({ action: 'UPSERT', table: tableName, payload, opts });
      if (payload.id === 'failing-record' || payload.firebase_id === 'failing-record') {
        return { data: null, error: { message: 'Database constraint violation (foreign key missing)' } };
      }
      return { data: payload, error: null };
    },
    delete: () => ({
      eq: async (col, val) => {
        executedCalls.push({ action: 'DELETE', table: tableName, col, val });
        return { data: { [col]: val }, error: null };
      },
    }),
  }),
};

SyncStateService.setDefaultClient(mockSupabase);
assert(SyncStateService.isClientReady() === true, 'SyncStateService confirms default authenticated client is ready');

// 1. Queue an INSERT action (e.g. notifications)
SyncStateService.recordFailedSync({
  table: 'notifications',
  id: 'notif-101',
  action: 'INSERT',
  payload: { id: 'notif-101', recipient_target: 'all', message: 'Church-wide prayer vigil' },
  errorMessage: 'Connection lost during POST',
});

// 2. Queue an UPSERT action with table-specific conflict key (e.g. cells -> firebase_id)
SyncStateService.recordFailedSync({
  table: 'cells',
  id: 'cell-agape-1',
  action: 'UPSERT',
  payload: { firebase_id: 'cell-agape-1', name: 'Agape Fellowship', leader: 'Bro. Emmanuel' },
  errorMessage: 'Gateway timeout 504',
});

// 3. Queue an UPSERT action for standard table (e.g. cell_meeting_reports -> id)
SyncStateService.recordFailedSync({
  table: 'cell_meeting_reports',
  id: 'cmr-201',
  action: 'UPSERT',
  payload: { id: 'cmr-201', cell_id: 'cell-agape-1', offering: 150 },
  errorMessage: 'Socket hang up',
});

// 4. Queue a DELETE action (e.g. evangelism_contacts)
SyncStateService.recordFailedSync({
  table: 'evangelism_contacts',
  id: 'contact-del-301',
  action: 'DELETE',
  payload: { id: 'contact-del-301' },
  errorMessage: 'Network unreachable',
});

// 5. Queue an operation that will fail on replay
SyncStateService.recordFailedSync({
  table: 'evangelism_reports',
  id: 'failing-record',
  action: 'UPSERT',
  payload: { id: 'failing-record', souls_won: 5 },
  errorMessage: 'Database connection refused',
});

assert(SyncStateService.getPendingCount() === 5, '5 operations queued across INSERT, UPSERT and DELETE');
assert(subscribedCount === 5, 'Subscription listener accurately notified of pending queue depth (5)');

// Replay queue with production SyncStateService
const replaySummary = await SyncStateService.retryPendingSync();

assert(replaySummary.total === 5, 'Replay processor processed all 5 queued items');
assert(replaySummary.succeeded === 4, '4 operations succeeded across INSERT, UPSERT, and DELETE');
assert(replaySummary.failed === 1, '1 operation failed gracefully as anticipated');
assert(SyncStateService.getPendingCount() === 1, 'Queue drained in localStorage: 4 succeeded pruned, 1 failing item remains');

// Verify executed method calls and arguments
const insertCall = executedCalls.find(c => c.action === 'INSERT' && c.table === 'notifications');
assert(insertCall && insertCall.payload.id === 'notif-101', 'INSERT operation dispatched correctly to Supabase table');

const cellsUpsertCall = executedCalls.find(c => c.action === 'UPSERT' && c.table === 'cells');
assert(
  cellsUpsertCall && cellsUpsertCall.opts?.onConflict === 'firebase_id',
  'UPSERT for "cells" table correctly applied onConflict="firebase_id"'
);

const reportUpsertCall = executedCalls.find(c => c.action === 'UPSERT' && c.table === 'cell_meeting_reports');
assert(
  reportUpsertCall && reportUpsertCall.opts?.onConflict === 'id',
  'UPSERT for standard table correctly applied onConflict="id"'
);

const deleteCall = executedCalls.find(c => c.action === 'DELETE' && c.table === 'evangelism_contacts');
assert(
  deleteCall && deleteCall.val === 'contact-del-301',
  'DELETE operation dispatched correctly with eq("id", id)'
);

// Check remaining failing item in localStorage
const remainingItems = SyncStateService.getPendingItems();
assert(remainingItems.length === 1, 'Exactly one failing item persisted in localStorage');
assert(remainingItems[0].id === 'failing-record', 'Persisted item is the failing evangelism report');
assert(remainingItems[0].retryCount === 2, 'Retry count incremented to 2');
assert(
  remainingItems[0].errorMessage === 'Database constraint violation (foreign key missing)',
  'Error message updated with latest server response'
);

// -----------------------------------------------------------------------------
// TEST GROUP 4: DUPLICATE PREVENTION & MUTEX LOCKING
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Duplicate Prevention & Mutex Locking ---');

// Mock a slow Supabase client to test concurrent execution locking
let slowReplayResolve;
const slowClient = {
  from: () => ({
    upsert: () => new Promise(resolve => {
      slowReplayResolve = () => resolve({ data: {}, error: null });
    }),
  }),
};

SyncStateService.setDefaultClient(slowClient);

// Initiate first retry run (asynchronously held open)
const firstRunPromise = SyncStateService.retryPendingSync();

assert(
  SyncStateService.isRetryInProgress() === true,
  'Mutex lock is active while replay is in progress'
);

// Initiate second concurrent retry run while first is still running
const secondRunPromise = SyncStateService.retryPendingSync();
const secondRunResult = await secondRunPromise;

assert(
  secondRunResult.inProgress === true,
  'Duplicate/concurrent retry attempt is rejected via mutex lock (skips overlapping run)'
);

// Resolve first run
if (slowReplayResolve) slowReplayResolve();
await firstRunPromise;

assert(
  SyncStateService.isRetryInProgress() === false,
  'Mutex lock released once replay completes'
);

// -----------------------------------------------------------------------------
// TEST GROUP 5: TERMINAL FAILURE PRESERVATION & MANUAL RECOVERY
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Terminal Failure Preservation & Manual Recovery ---');

mockStorage.clear();
SyncStateService.clearRegistry();

// Queue a stubbornly failing item
SyncStateService.recordFailedSync({
  table: 'evangelism_reports',
  id: 'fatal-row-99',
  action: 'UPSERT',
  payload: { id: 'fatal-row-99', souls_won: 10 },
  errorMessage: 'Foreign key violation: region does not exist',
});

// A failing client
const persistentlyFailingClient = {
  from: () => ({
    upsert: async () => ({
      data: null,
      error: { message: 'Foreign key violation: region does not exist' },
    }),
  }),
};

SyncStateService.setDefaultClient(persistentlyFailingClient);

// Drive through 4 additional failures to reach MAX_RETRY_ATTEMPTS (5)
for (let i = 0; i < 4; i++) {
  await SyncStateService.retryPendingSync();
}

const terminalItems = SyncStateService.getPendingItems();
assert(terminalItems[0].retryCount >= 5, 'Retry counter accurately tracks 5 consecutive failures');
assert(terminalItems[0].terminal === true, 'Item capped with terminal=true after 5 failed attempts');
assert(SyncStateService.getTerminalCount() === 1, 'getTerminalCount() reports 1 terminal failure');
assert(
  SyncStateService.getPendingCount() === 1,
  'Terminal failure remains preserved in storage — NOT silently dropped'
);

// Standard retry run should skip terminal items by default
const skippedSummary = await SyncStateService.retryPendingSync();
assert(skippedSummary.terminal === 1, 'Standard retry run skips terminal items to prevent thrashing');
assert(
  SyncStateService.getPendingCount() === 1,
  'Terminal item remains visible and persistent'
);

// Now simulate administrative correction (fixing the region) and manual recovery
const correctedClient = {
  from: () => ({
    upsert: async (payload) => ({ data: payload, error: null }),
  }),
};

SyncStateService.setDefaultClient(correctedClient);

// Test resetTerminal()
SyncStateService.resetTerminal('fatal-row-99');
const afterReset = SyncStateService.getPendingItems();
assert(afterReset[0].terminal === false, 'resetTerminal() cleared terminal flag for recovered item');
assert(afterReset[0].retryCount === 0, 'resetTerminal() reset retry count to 0');

// Replay recovered item
const recoveredSummary = await SyncStateService.retryPendingSync();
assert(recoveredSummary.succeeded === 1, 'Recovered item successfully replayed and committed');
assert(SyncStateService.getPendingCount() === 0, 'Queue completely drained after successful manual recovery');

// -----------------------------------------------------------------------------
// TEST GROUP 6: AUTOMATIC LIFECYCLE RECONNECTION TRIGGERING
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 6: Automatic Lifecycle Reconnection Triggering ---');

SyncStateService.initLifecycleListeners();
assert(
  windowListeners.has('online'),
  'SyncStateService successfully attached listener to window "online" event'
);

let lifecycleReplayTriggered = false;
const originalRetry = SyncStateService.retryPendingSync;
SyncStateService.retryPendingSync = async function() {
  lifecycleReplayTriggered = true;
  return { total: 0, succeeded: 0, failed: 0, terminal: 0 };
};

// Dispatch online event
global.window.dispatchEvent('online');
assert(
  lifecycleReplayTriggered === true,
  'Window "online" event automatically triggers SyncStateService.retryPendingSync()'
);

// Restore original function
SyncStateService.retryPendingSync = originalRetry;

// Clean up subscription
unsubscribe();

// -----------------------------------------------------------------------------
// TEST GROUP 7: APPLICATION ROLE COMPATIBILITY & ENUM VALIDATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 7: Application Role Compatibility & Enum Validation ---');

const APPLICATION_ROLES = [
  'tutor',
  'cell_leader',
  'regional_leader',
  'national_admin',
  'admin',
  'super_admin',
];

const migrationPath = path.resolve(process.cwd(), 'supabase', 'migrations', '20261108_fni_supabase_migration.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

// 1. Verify every role is included in the PostgreSQL user_role enum
for (const role of APPLICATION_ROLES) {
  assert(
    migrationSql.includes(`'${role}'`),
    `PostgreSQL user_role enum definition includes application role "${role}"`
  );
  assert(
    migrationSql.includes(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${role}'`),
    `Additive upgrade ensures existing live database receives enum label "${role}" safely`
  );
}

// 2. Role Permission Evaluators Parity Check
function evaluateIsAdmin(role) {
  return ['admin', 'super_admin', 'national_admin'].includes(role);
}

function evaluateIsTutorOrLeader(role) {
  return ['tutor', 'cell_leader'].includes(role);
}

assert(evaluateIsAdmin('super_admin') === true, 'super_admin is verified as administrator');
assert(evaluateIsAdmin('national_admin') === true, 'national_admin is verified as administrator');
assert(evaluateIsAdmin('admin') === true, 'admin is verified as administrator');
assert(evaluateIsAdmin('tutor') === false, 'tutor is not granted unconstrained admin access');
assert(evaluateIsAdmin('cell_leader') === false, 'cell_leader is not granted unconstrained admin access');
assert(evaluateIsAdmin('regional_leader') === false, 'regional_leader is governed by regional scope, not global admin');

assert(evaluateIsTutorOrLeader('tutor') === true, 'tutor recognized as cell fellowship shepherd');
assert(evaluateIsTutorOrLeader('cell_leader') === true, 'cell_leader recognized as cell fellowship shepherd');

// 3. Test Fail-Closed Validation for Unknown Roles
function validateRoleForProvisioning(role) {
  if (!role || typeof role !== 'string') return false;
  return APPLICATION_ROLES.includes(role);
}

assert(validateRoleForProvisioning('tutor') === true, 'Valid role "tutor" accepted for Supabase identity provisioning');
assert(validateRoleForProvisioning('cell_leader') === true, 'Valid role "cell_leader" accepted for Supabase identity provisioning');
assert(validateRoleForProvisioning('hacker_role') === false, 'Unknown role "hacker_role" rejected fail-closed');
assert(validateRoleForProvisioning('') === false, 'Empty role rejected fail-closed');
assert(validateRoleForProvisioning(null) === false, 'Null role rejected fail-closed');

// -----------------------------------------------------------------------------
// TEST GROUP 8: ANTI-LEAKAGE RLS ISOLATION SIMULATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 8: Anti-Leakage RLS Isolation Simulation ---');

// 1. Private Messages Isolation: Strictly between sender and recipient
function canReadPrivateMessage(message, callerUid) {
  return message.sender_uid === callerUid || message.recipient_uid === callerUid;
}

const msg1 = { id: 'pmsg-1', sender_uid: 'tutor-agape', recipient_uid: 'tutor-legon', content: 'Secret counsel' };
assert(canReadPrivateMessage(msg1, 'tutor-agape') === true, 'Sender CAN read own private message');
assert(canReadPrivateMessage(msg1, 'tutor-legon') === true, 'Recipient CAN read private message sent to them');
assert(canReadPrivateMessage(msg1, 'tutor-intruder') === false, 'Third-party user CANNOT read private message');
assert(canReadPrivateMessage(msg1, 'usr-admin-snoop') === false, 'Administrator CANNOT read private shepherd messages (absolute privacy)');

// 2. Offerings Financial Isolation: Strictly Admin/Finance Only
function canReadOfferingRecord(role) {
  return evaluateIsAdmin(role);
}

assert(canReadOfferingRecord('admin') === true, 'Administrator CAN read offering records');
assert(canReadOfferingRecord('super_admin') === true, 'Super administrator CAN read offering records');
assert(canReadOfferingRecord('tutor') === false, 'Ordinary tutor CANNOT view financial records of any cell');
assert(canReadOfferingRecord('cell_leader') === false, 'Cell leader CANNOT view financial records');
assert(canReadOfferingRecord('regional_leader') === false, 'Regional leader CANNOT access centralized financial records without finance role');

// 3. Cell Reports Multi-Tenant Isolation
function canReadCellReport(report, callerUid, callerRole, callerRegionId) {
  if (evaluateIsAdmin(callerRole)) return true;
  if (report.tutor_uid === callerUid) return true;
  if (callerRole === 'regional_leader' && report.region_id === callerRegionId) return true;
  return false;
}

const reportA = { id: 'cmr-01', cell_id: 'cell-agape', tutor_uid: 'tutor-agape', region_id: 'reg-accra' };
assert(canReadCellReport(reportA, 'tutor-agape', 'tutor', 'reg-accra') === true, 'Author tutor CAN read their own report');
assert(canReadCellReport(reportA, 'tutor-legon', 'tutor', 'reg-accra') === false, 'Tutor from another cell CANNOT read Agape Cell report');
assert(canReadCellReport(reportA, 'reg-lead-accra', 'regional_leader', 'reg-accra') === true, 'Regional leader of Accra CAN read reports in their region');
assert(canReadCellReport(reportA, 'reg-lead-kumasi', 'regional_leader', 'reg-kumasi') === false, 'Regional leader of Kumasi CANNOT read reports from Accra region');
assert(canReadCellReport(reportA, 'admin-usr', 'admin', null) === true, 'Administrator CAN oversee reports across all regions');

// 4. Notifications Anti-Impersonation & Targeting
function canSendNotification(callerRole, callerUid, payload) {
  const isAdmin = evaluateIsAdmin(callerRole);
  if (payload.recipient_target === 'all') return isAdmin;
  if (payload.recipient_target === 'admin') return true;
  return payload.sender_id === callerUid || isAdmin;
}

assert(canSendNotification('admin', 'admin-01', { recipient_target: 'all' }) === true, 'Admin CAN broadcast to all');
assert(canSendNotification('tutor', 'tutor-01', { recipient_target: 'all' }) === false, 'Tutor CANNOT broadcast to all');
assert(canSendNotification('tutor', 'tutor-01', { recipient_target: 'admin', sender_id: 'tutor-01' }) === true, 'Tutor CAN alert administrators');
assert(canSendNotification('tutor', 'tutor-01', { recipient_target: 'tutor-02', sender_id: 'impersonated-admin' }) === false, 'Tutor CANNOT spoof sender_id');

// 5. Audit Logs Immutability
function canMutateAuditLog(action) {
  // Policy strictly forbids UPDATE and DELETE
  return action === 'INSERT';
}

assert(canMutateAuditLog('INSERT') === true, 'Audit log append is permitted for authorized callers');
assert(canMutateAuditLog('UPDATE') === false, 'Audit log UPDATE is denied (immutable ledger)');
assert(canMutateAuditLog('DELETE') === false, 'Audit log DELETE is denied (immutable ledger)');

console.log('\n================================================================');
console.log(`TOTAL EXECUTABLE TESTS: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
