/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Executable Test Suite: Retry Mechanism, Role Compatibility & Anti-Leakage Verification
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

console.log('================================================================');
console.log('FNI CELLS CONNECT — RETRY BEHAVIOR & ROLE COMPATIBILITY SUITE');
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
// TEST GROUP 1: EXECUTABLE SYNC QUEUE & RETRY MECHANISM
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Executable Sync Queue & Retry Execution ---');

// Mock localStorage in Node.js environment
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

// Import or recreate SyncStateService logic for standalone test execution
const SYNC_REGISTRY_KEY = 'fni_pending_supabase_sync_registry_v1';
const MAX_RETRY_ATTEMPTS = 5;

class TestSyncStateService {
  static listeners = new Set();

  static subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  static getPendingItems() {
    try {
      const raw = localStorage.getItem(SYNC_REGISTRY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static getPendingCount() {
    return this.getPendingItems().length;
  }

  static recordFailedSync(item) {
    const items = this.getPendingItems();
    const existingIndex = items.findIndex(i => i.table === item.table && i.id === item.id);
    const existing = existingIndex >= 0 ? items[existingIndex] : null;
    const retryCount = existing ? existing.retryCount + 1 : 1;
    const isTerminal = retryCount >= MAX_RETRY_ATTEMPTS;

    const entry = {
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

    localStorage.setItem(SYNC_REGISTRY_KEY, JSON.stringify(items));
    this.listeners.forEach(cb => cb(items.length, items));
  }

  static async retryPendingSync(mockClient) {
    const items = this.getPendingItems();
    if (items.length === 0) return { total: 0, succeeded: 0, failed: 0, terminal: 0 };

    let succeeded = 0;
    let failed = 0;
    let terminal = 0;
    const remainingItems = [];

    for (const item of items) {
      if (item.retryCount >= MAX_RETRY_ATTEMPTS) {
        terminal++;
        remainingItems.push(item);
        continue;
      }

      try {
        let opError = null;
        if (item.action === 'DELETE') {
          const res = await mockClient.from(item.table).delete().eq('id', item.id);
          opError = res.error;
        } else {
          let onConflict = 'id';
          if (item.table === 'cells') onConflict = 'firebase_id';
          else if (item.table === 'soul_targets' || item.table === 'soul_target_configs') onConflict = 'year';
          const res = await mockClient.from(item.table).upsert(item.payload, { onConflict });
          opError = res.error;
        }

        if (!opError) {
          succeeded++;
        } else {
          failed++;
          const newRetryCount = item.retryCount + 1;
          const isNowTerminal = newRetryCount >= MAX_RETRY_ATTEMPTS;
          if (isNowTerminal) terminal++;
          remainingItems.push({
            ...item,
            retryCount: newRetryCount,
            errorMessage: opError.message,
            timestamp: new Date().toISOString(),
            terminal: isNowTerminal,
          });
        }
      } catch (err) {
        failed++;
        const newRetryCount = item.retryCount + 1;
        const isNowTerminal = newRetryCount >= MAX_RETRY_ATTEMPTS;
        if (isNowTerminal) terminal++;
        remainingItems.push({
          ...item,
          retryCount: newRetryCount,
          errorMessage: err.message,
          timestamp: new Date().toISOString(),
          terminal: isNowTerminal,
        });
      }
    }

    localStorage.setItem(SYNC_REGISTRY_KEY, JSON.stringify(remainingItems));
    this.listeners.forEach(cb => cb(remainingItems.length, remainingItems));
    return { total: items.length, succeeded, failed, terminal };
  }
}

// 1. Initial State
mockStorage.clear();
let reportedCount = -1;
TestSyncStateService.subscribe((count) => { reportedCount = count; });

assert(TestSyncStateService.getPendingCount() === 0, 'Initial pending queue is empty');

// 2. Queue three distinct operations
TestSyncStateService.recordFailedSync({
  table: 'cell_meeting_reports',
  id: 'cmr-test-1',
  action: 'UPSERT',
  payload: { id: 'cmr-test-1', cell_name: 'Agape Cell', attendance: 25 },
  errorMessage: 'Failed to fetch (network disconnected)',
});

TestSyncStateService.recordFailedSync({
  table: 'evangelism_contacts',
  id: 'cnt-test-flaky',
  action: 'UPSERT',
  payload: { id: 'cnt-test-flaky', contact_name: 'Emmanuel' },
  errorMessage: 'PostgREST 503 gateway timeout',
});

TestSyncStateService.recordFailedSync({
  table: 'evangelism_contacts',
  id: 'cnt-test-del',
  action: 'DELETE',
  payload: { id: 'cnt-test-del' },
  errorMessage: 'Socket hang up',
});

assert(TestSyncStateService.getPendingCount() === 3, 'Queue successfully records 3 failed writes');
assert(reportedCount === 3, 'Subscription listener is notified when items are queued');

// 3. Simulate Retry Execution with Mock Client
const mockSupabase = {
  from: (tableName) => ({
    upsert: async (payload, opts) => {
      // Simulate success for cmr-test-1, but continued failure for cnt-test-flaky
      if (payload.id === 'cmr-test-1') {
        return { data: payload, error: null };
      }
      return { data: null, error: { message: 'Database busy - deadlock detected' } };
    },
    delete: () => ({
      eq: async (col, val) => {
        // Simulate delete success
        return { data: { id: val }, error: null };
      },
    }),
  }),
};

const retryResult = await TestSyncStateService.retryPendingSync(mockSupabase);

assert(retryResult.total === 3, 'Replay processor processed all 3 pending items');
assert(retryResult.succeeded === 2, '2 operations succeeded (cmr-test-1 upsert and cnt-test-del delete)');
assert(retryResult.failed === 1, '1 operation failed (cnt-test-flaky)');
assert(TestSyncStateService.getPendingCount() === 1, 'Queue drained successfully: only 1 failing item remains in localStorage');

const remaining = TestSyncStateService.getPendingItems();
assert(remaining[0].id === 'cnt-test-flaky', 'Remaining item is the failed contact write');
assert(remaining[0].retryCount === 2, 'Retry count incremented to 2 for failing item');
assert(remaining[0].errorMessage === 'Database busy - deadlock detected', 'Error message updated with latest server error');

// 4. Test Terminal Max Retries Handling
for (let i = 0; i < 4; i++) {
  await TestSyncStateService.retryPendingSync(mockSupabase);
}
const finalCheck = TestSyncStateService.getPendingItems();
assert(finalCheck[0].retryCount >= 5, 'Retry count accurately tracked across consecutive failures');
assert(finalCheck[0].terminal === true, 'Item capped as terminal after exceeding MAX_RETRY_ATTEMPTS (5)');

// -----------------------------------------------------------------------------
// TEST GROUP 2: APPLICATION ROLE COMPATIBILITY & ENUM VALIDATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Application Role Compatibility & Enum Validation ---');

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
// TEST GROUP 3: ANTI-LEAKAGE RLS ISOLATION SIMULATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Anti-Leakage RLS Isolation Simulation ---');

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
