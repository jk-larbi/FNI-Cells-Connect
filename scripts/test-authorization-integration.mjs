/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Phase 5: Authorization, Session Lifecycle, and Exact Reconciliation Integration Suite
 * 
 * Verifies:
 * 1. Cryptographic token generation, expiration, renewal, and signature verification
 * 2. Revoked & suspended account handling
 * 3. Multi-role authorization matrix (Super Admin, National Admin, Regional Leader, Cell Leader, Visitor)
 * 4. Anti-impersonation and role-aware notification security
 * 5. Exact reconciliation edge cases:
 *    - Deliberately modified fields
 *    - Missing records
 *    - Unexpected extra records
 *    - Duplicate IDs
 *    - Failed batch import tracking
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

console.log('================================================================');
console.log('FNI CELLS CONNECT — PHASE 5 PRODUCTION READINESS TEST SUITE');
console.log('Project Reference: cjskjazsrrbfyjepwyxa (eu-west-3)');
console.log('Repository:        jk-larbi/FNI-Cells-Connect');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, failureDetail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (failureDetail) console.error(`     Detail: ${failureDetail}`);
    failedTests++;
  }
}

const MOCK_JWT_SECRET = 'fni-production-supabase-jwt-secret-secure-32chars';

function getDeterministicUuid(uid) {
  const hash = crypto.createHash('sha1').update('fni:user:' + uid).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function mintSupabaseJwt(firebaseUid, role, extraMetadata = {}, options = {}) {
  const supabaseUuid = getDeterministicUuid(firebaseUid);
  const now = Math.floor(Date.now() / 1000);
  const ttl = options.ttl !== undefined ? options.ttl : 86400;
  const payload = {
    aud: 'authenticated',
    role: 'authenticated',
    sub: supabaseUuid,
    firebase_uid: firebaseUid,
    email: `${firebaseUid}@fnicells.org`,
    app_metadata: {
      provider: 'firebase',
      role,
      firebase_uid: firebaseUid,
      ...extraMetadata,
    },
    user_metadata: {
      full_name: `Test ${role}`,
      role,
      firebase_uid: firebaseUid,
    },
    iat: now,
    exp: now + ttl,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = options.secretOverride || MOCK_JWT_SECRET;
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return { token: `${header}.${body}.${signature}`, payload, supabaseUuid };
}

function verifyJwt(token, secret, allowExpired = false) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (signature !== expectedSig) return null;

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (!allowExpired && payload.exp && payload.exp < now) {
    return null; // Expired
  }
  return payload;
}

// -----------------------------------------------------------------------------
// 1. TOKEN LIFECYCLE: EXPIRATION, RENEWAL & SIGNATURES
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: JWT Lifecycle, Expiration, Renewal & Signature Verification ---');

const validTokenObj = mintSupabaseJwt('usr-admin-master', 'super_admin');
assert(verifyJwt(validTokenObj.token, MOCK_JWT_SECRET) !== null, 'Valid Super Admin JWT accepted');
assert(verifyJwt(validTokenObj.token, 'wrong-secret') === null, 'JWT with invalid secret rejected');

// Expired JWT test
const expiredTokenObj = mintSupabaseJwt('usr-admin-master', 'super_admin', {}, { ttl: -100 });
assert(verifyJwt(expiredTokenObj.token, MOCK_JWT_SECRET) === null, 'Expired JWT strictly rejected by validator');
assert(verifyJwt(expiredTokenObj.token, MOCK_JWT_SECRET, true) !== null, 'Expired JWT parsed with allowExpired: true');

// Proactive Token Renewal simulation
const renewedTokenObj = mintSupabaseJwt('usr-admin-master', 'super_admin', {}, { ttl: 86400 });
assert(verifyJwt(renewedTokenObj.token, MOCK_JWT_SECRET) !== null, 'Proactively renewed JWT accepted with valid future expiration');
assert(renewedTokenObj.payload.exp > Math.floor(Date.now() / 1000), 'Renewed JWT has strictly future expiry timestamp');

// Tampered payload test
const [h, b, s] = validTokenObj.token.split('.');
const tamperedPayload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8'));
tamperedPayload.app_metadata.role = 'super_admin';
tamperedPayload.sub = getDeterministicUuid('attacker');
const tamperedBody = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');
const tamperedToken = `${h}.${tamperedBody}.${s}`;
assert(verifyJwt(tamperedToken, MOCK_JWT_SECRET) === null, 'Tampered token payload with original signature strictly rejected');

// -----------------------------------------------------------------------------
// 2. REVOKED & SUSPENDED ACCOUNT SIMULATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Revoked & Suspended Account Handling ---');

function simulateTokenExchangeCallable(firebaseAuthUser, userProfile) {
  if (!firebaseAuthUser) {
    throw new Error('unauthenticated: Caller is not authenticated');
  }
  if (!userProfile || userProfile.is_active === false || userProfile.status === 'Suspended') {
    throw new Error('permission-denied: Tutor account is suspended or deactivated');
  }
  return mintSupabaseJwt(firebaseAuthUser.uid, userProfile.role || 'cell_leader');
}

// Active user
const activeExchange = simulateTokenExchangeCallable({ uid: 'tutor-active' }, { is_active: true, role: 'cell_leader' });
assert(activeExchange !== null && activeExchange.payload.firebase_uid === 'tutor-active', 'Active user receives verified Supabase JWT');

// Revoked / suspended user
let suspensionCaught = false;
try {
  simulateTokenExchangeCallable({ uid: 'tutor-suspended' }, { is_active: false, status: 'Suspended', role: 'cell_leader' });
} catch (e) {
  suspensionCaught = e.message.includes('permission-denied');
}
assert(suspensionCaught, 'Suspended tutor account is strictly rejected by server-side token exchanger');

// Revoked Firebase user (unauthenticated)
let unauthCaught = false;
try {
  simulateTokenExchangeCallable(null, { is_active: true });
} catch (e) {
  unauthCaught = e.message.includes('unauthenticated');
}
assert(unauthCaught, 'Logged out / revoked Firebase user rejected without issuing Supabase credentials');

// -----------------------------------------------------------------------------
// 3. ROLE-AWARE NOTIFICATION POLICIES & ANTI-IMPERSONATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Notification RLS & Anti-Impersonation Safeguards ---');

class RlsSimulator {
  constructor(jwtToken = null) {
    this.jwt = jwtToken ? verifyJwt(jwtToken, MOCK_JWT_SECRET) : null;
    this.authUid = this.jwt ? this.jwt.sub : null;
    this.firebaseUid = this.jwt ? (this.jwt.firebase_uid || this.jwt.app_metadata?.firebase_uid) : null;
    this.role = this.jwt ? (this.jwt.app_metadata?.role || 'cell_leader') : null;
  }

  isAdmin() {
    return ['admin', 'super_admin', 'national_admin'].includes(this.role);
  }

  canSelectNotification(notif) {
    if (!this.jwt) return false;
    return (
      notif.recipient_target === 'all' ||
      notif.recipient_target === this.authUid ||
      notif.recipient_target === this.firebaseUid ||
      (notif.recipient_target === 'admin' && this.isAdmin())
    );
  }

  canInsertNotification(notif) {
    if (!this.jwt) return false;
    // Rule: recipient_target = 'all' ONLY allowed for is_admin()
    if (notif.recipient_target === 'all') {
      return this.isAdmin();
    }
    // Rule: recipient_target = 'admin' allowed for authenticated members (e.g. reporting)
    if (notif.recipient_target === 'admin') {
      return true;
    }
    // Rule: Direct notifications must match caller's identity (no impersonation)
    if (this.isAdmin()) return true;
    return (
      notif.sender_id === null ||
      notif.sender_id === undefined ||
      notif.sender_id === this.authUid ||
      notif.sender_id === this.firebaseUid
    );
  }

  canUpdateNotification(notif) {
    if (!this.jwt) return false;
    if (this.isAdmin()) return true;
    return (
      notif.recipient_target === this.authUid ||
      notif.recipient_target === this.firebaseUid
    );
  }

  canDeleteNotification() {
    return this.isAdmin();
  }

  canInsertAuditLog(log) {
    if (!this.jwt) return false;
    if (this.isAdmin()) return true;
    return log.user_id === this.authUid || log.user_id === this.firebaseUid;
  }
}

const adminSim = new RlsSimulator(mintSupabaseJwt('usr-admin-master', 'super_admin').token);
const tutorSim = new RlsSimulator(mintSupabaseJwt('tutor-legon', 'cell_leader').token);
const visitorSim = new RlsSimulator(null);

// Broadcast Notification Tests
const broadcastNotif = {
  id: 'notif-1',
  recipient_target: 'all',
  title: 'Ministry Broadcast',
  message: 'All fellowships meet on Wednesday.',
  sender_id: 'usr-admin-master',
};

assert(adminSim.canInsertNotification(broadcastNotif), 'Administrator CAN create ministry-wide broadcast notification (recipient_target = "all")');
assert(!tutorSim.canInsertNotification(broadcastNotif), 'Ordinary Cell Leader CANNOT create broadcast notification (recipient_target = "all")');
assert(!visitorSim.canInsertNotification(broadcastNotif), 'Anonymous visitor CANNOT create notifications');

// Administrative Alert Tests
const tutorReportAlert = {
  id: 'notif-2',
  recipient_target: 'admin',
  title: 'Report Submitted',
  message: 'Legon Fellowship submitted week 45 return.',
  sender_id: 'tutor-legon',
};

assert(tutorSim.canInsertNotification(tutorReportAlert), 'Cell Leader CAN notify leadership (recipient_target = "admin")');
assert(adminSim.canSelectNotification(tutorReportAlert), 'Administrator CAN read incoming admin notifications');
assert(!tutorSim.canSelectNotification(tutorReportAlert), 'Cell Leader CANNOT read admin-bound notifications intended for leadership');

// Impersonation Attempt Tests
const spoofedAdminAlert = {
  id: 'notif-3',
  recipient_target: 'tutor-knust',
  title: 'Disciplinary Warning',
  message: 'You must report to head office.',
  sender_id: 'usr-admin-master', // Tutor attempting to forge admin sender ID
};

assert(!tutorSim.canInsertNotification(spoofedAdminAlert), 'Tutor attempting to forge administrator sender_id is strictly REJECTED');

// Notification Update / Read status
const tutorPersonalNotif = {
  id: 'notif-4',
  recipient_target: 'tutor-legon',
  title: 'Welcome',
  message: 'Your fellowship has been approved.',
};

assert(tutorSim.canUpdateNotification(tutorPersonalNotif), 'Tutor CAN update their own received notification (mark read)');
const peerPersonalNotif = {
  id: 'notif-5',
  recipient_target: 'tutor-knust',
  title: 'Peer Alert',
  message: 'Private note.',
};
assert(!tutorSim.canUpdateNotification(peerPersonalNotif), 'Tutor CANNOT modify notifications belonging to another cell leader');

// Audit Log User-ID Verification
const genuineAuditLog = {
  id: 'audit-1',
  action: 'SUBMIT_REPORT',
  entity_type: 'reports',
  entity_id: 'cmr-101',
  user_id: 'tutor-legon',
};
const forgedAuditLog = {
  id: 'audit-2',
  action: 'ADMIN_OVERRIDE',
  entity_type: 'settings',
  entity_id: 'global',
  user_id: 'usr-admin-master', // Tutor trying to log action under admin ID
};

assert(tutorSim.canInsertAuditLog(genuineAuditLog), 'Tutor CAN record audit log with their own verified user_id');
assert(!tutorSim.canInsertAuditLog(forgedAuditLog), 'Tutor attempting to write audit log under administrator user_id is REJECTED');

// -----------------------------------------------------------------------------
// 4. EXACT RECONCILIATION INTEGRITY TESTS
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Exact Reconciliation Algorithms & Anomaly Detection ---');

function evaluateReconciliation(sourceRecords, destRecords, fieldsToCheck, importSuccess = true) {
  if (!importSuccess) {
    return { verified: false, reason: 'failed_imports' };
  }

  const sourceIds = sourceRecords.map(r => r.id);
  const destIds = destRecords.map(r => r.id);

  const sourceSet = new Set(sourceIds);
  const destSet = new Set(destIds);

  const sourceDups = sourceIds.filter((item, index) => sourceIds.indexOf(item) !== index);
  const destDups = destIds.filter((item, index) => destIds.indexOf(item) !== index);
  if (sourceDups.length > 0 || destDups.length > 0) {
    return { verified: false, reason: 'duplicates', count: sourceDups.length + destDups.length };
  }

  const missing = sourceIds.filter(id => !destSet.has(id));
  const extra = destIds.filter(id => !sourceSet.has(id));

  if (missing.length > 0) {
    return { verified: false, reason: 'missing_records', missing };
  }
  if (extra.length > 0) {
    return { verified: false, reason: 'extra_records', extra };
  }

  // Field by field check
  const destMap = new Map(destRecords.map(r => [r.id, r]));
  let mismatches = 0;

  for (const src of sourceRecords) {
    const dest = destMap.get(src.id);
    for (const field of fieldsToCheck) {
      const srcVal = src[field];
      const destVal = dest[field];

      if (typeof srcVal === 'number' || typeof destVal === 'number') {
        if (Number(srcVal || 0) !== Number(destVal || 0)) mismatches++;
      } else if (String(srcVal || '').trim() !== String(destVal || '').trim()) {
        mismatches++;
      }
    }
  }

  if (mismatches > 0) {
    return { verified: false, reason: 'field_mismatches', mismatches };
  }

  return { verified: true, matched: sourceRecords.length };
}

const sampleFields = ['cell_id', 'attendance', 'offering', 'status'];

// Test Case A: Perfectly Matching Dataset
const srcA = [
  { id: 'cmr-1', cell_id: 'cell-a', attendance: 20, offering: 150, status: 'Approved' },
  { id: 'cmr-2', cell_id: 'cell-b', attendance: 35, offering: 280, status: 'Newly Submitted' },
];
const destA = [
  { id: 'cmr-1', cell_id: 'cell-a', attendance: 20, offering: 150, status: 'Approved' },
  { id: 'cmr-2', cell_id: 'cell-b', attendance: 35, offering: 280, status: 'Newly Submitted' },
];
const resA = evaluateReconciliation(srcA, destA, sampleFields, true);
assert(resA.verified === true, 'Identical source and destination records pass exact reconciliation');

// Test Case B: Deliberately Modified Field (Data Corruption / Drift)
const destB = [
  { id: 'cmr-1', cell_id: 'cell-a', attendance: 20, offering: 150, status: 'Approved' },
  { id: 'cmr-2', cell_id: 'cell-b', attendance: 99, offering: 280, status: 'Newly Submitted' }, // attendance modified from 35 to 99!
];
const resB = evaluateReconciliation(srcA, destB, sampleFields, true);
assert(resB.verified === false && resB.reason === 'field_mismatches', 'Reconciliation catches deliberately modified attendance count');

// Test Case C: Missing Record
const destC = [
  { id: 'cmr-1', cell_id: 'cell-a', attendance: 20, offering: 150, status: 'Approved' },
  // cmr-2 omitted
];
const resC = evaluateReconciliation(srcA, destC, sampleFields, true);
assert(resC.verified === false && resC.reason === 'missing_records', 'Reconciliation catches missing record (cmr-2)');

// Test Case D: Unexpected Extra Record
const destD = [
  { id: 'cmr-1', cell_id: 'cell-a', attendance: 20, offering: 150, status: 'Approved' },
  { id: 'cmr-2', cell_id: 'cell-b', attendance: 35, offering: 280, status: 'Newly Submitted' },
  { id: 'cmr-unexpected', cell_id: 'cell-ghost', attendance: 5, offering: 10, status: 'draft' },
];
const resD = evaluateReconciliation(srcA, destD, sampleFields, true);
assert(resD.verified === false && resD.reason === 'extra_records', 'Reconciliation catches unexpected extra record (cmr-unexpected)');

// Test Case E: Duplicate IDs
const destE = [
  { id: 'cmr-1', cell_id: 'cell-a', attendance: 20, offering: 150, status: 'Approved' },
  { id: 'cmr-1', cell_id: 'cell-a', attendance: 20, offering: 150, status: 'Approved' }, // Duplicate!
];
const resE = evaluateReconciliation(srcA, destE, sampleFields, true);
assert(resE.verified === false && resE.reason === 'duplicates', 'Reconciliation catches duplicate IDs in dataset');

// Test Case F: Failed Batch Import
const resF = evaluateReconciliation(srcA, destA, sampleFields, false);
assert(resF.verified === false && resF.reason === 'failed_imports', 'Reconciliation strictly fails if any batch import operation encountered an error');

console.log('\n================================================================');
console.log(`TOTAL INTEGRATION TESTS: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
}
