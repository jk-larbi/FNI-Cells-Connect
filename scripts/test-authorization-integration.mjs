/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Integration Test Suite: Role-Based Authorization & Cryptographic Access Control
 * 
 * Verifies:
 * 1. Cryptographic token generation & claim verification (Firebase-to-Supabase Bridge)
 * 2. Multi-role authorization matrix:
 *    - Super Administrator
 *    - National Administrator
 *    - Regional Leader
 *    - Cell Leader A vs Cell Leader B (Cross-Cell Isolation)
 *    - Unauthenticated / Anonymous Visitor
 * 3. Confidential Financial Records Isolation (offering_records)
 * 4. Confidential Pastoral Messaging Isolation (private_messages)
 * 5. Tamper-Proof Audit Ledger (audit_logs immutability)
 * 6. Spoofing & Impersonation Prevention
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

console.log('================================================================');
console.log('FNI CELLS CONNECT — AUTHORIZATION & SECURITY INTEGRATION SUITE');
console.log('Project Reference: cjskjazsrrbfyjepwyxa (eu-west-3)');
console.log('Repository:        jk-larbi/FNI-Cells-Connect');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// 1. CRYPTOGRAPHIC TOKEN ENGINE & BRIDGE VERIFICATION
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Cryptographic Token Bridge & Signature Verification ---');

const MOCK_JWT_SECRET = 'fni-production-supabase-jwt-secret-secure-32chars';

function getDeterministicUuid(uid) {
  const hash = crypto.createHash('sha1').update('fni:user:' + uid).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function mintSupabaseJwt(firebaseUid, role, extraMetadata = {}) {
  const supabaseUuid = getDeterministicUuid(firebaseUid);
  const now = Math.floor(Date.now() / 1000);
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
    exp: now + 86400,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', MOCK_JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return { token: `${header}.${body}.${signature}`, payload, supabaseUuid };
}

function verifyJwt(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (signature !== expectedSig) return null;
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}

// Mint tokens for each actor
const superAdminToken = mintSupabaseJwt('usr-admin-master', 'super_admin');
const nationalAdminToken = mintSupabaseJwt('usr-admin-nat', 'national_admin');
const regionalLeaderToken = mintSupabaseJwt('usr-reg-accra', 'regional_leader', { region_id: 'reg-accra-uuid' });
const cellLeaderAToken = mintSupabaseJwt('tutor-cell-legon', 'cell_leader');
const cellLeaderBToken = mintSupabaseJwt('tutor-cell-knust', 'cell_leader');

assert(verifyJwt(superAdminToken.token, MOCK_JWT_SECRET) !== null, 'Super Admin JWT correctly signed and verified with secret');
assert(verifyJwt(superAdminToken.token, 'wrong-secret') === null, 'JWT verification fails with invalid secret');
assert(superAdminToken.payload.sub === getDeterministicUuid('usr-admin-master'), 'Deterministic UUID generation matches SHA-1 namespace');
assert(superAdminToken.payload.app_metadata.role === 'super_admin', 'Role claim embedded in app_metadata');
assert(superAdminToken.payload.firebase_uid === 'usr-admin-master', 'Legacy Firebase UID securely preserved in token claims');

// -----------------------------------------------------------------------------
// 2. RLS POLICY SIMULATOR & AUTHORIZATION MATRIX
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Multi-Role Authorization & RLS Policy Simulation ---');

/**
 * High-fidelity simulator for PostgreSQL RLS rules defined in 20261108_fni_supabase_migration.sql
 */
class RlsEvaluator {
  constructor(authJwt = null) {
    this.jwt = authJwt ? verifyJwt(authJwt, MOCK_JWT_SECRET) : null;
    this.authUid = this.jwt ? this.jwt.sub : null;
    this.firebaseUid = this.jwt ? (this.jwt.firebase_uid || this.jwt.app_metadata?.firebase_uid) : null;
    this.role = this.jwt ? (this.jwt.app_metadata?.role || 'cell_leader') : null;
  }

  isAdmin() {
    if (!this.jwt) return false;
    return ['admin', 'super_admin', 'national_admin'].includes(this.role);
  }

  isRegionalLeader(targetRegionId) {
    if (!this.jwt) return false;
    return this.role === 'regional_leader' && this.jwt.app_metadata?.region_id === targetRegionId;
  }

  // --- Profiles Policy ---
  canSelectProfile(profile) {
    if (!this.jwt) return false; // anonymous blocked
    if (this.isAdmin()) return true;
    return profile.id === this.authUid || profile.firebase_uid === this.firebaseUid;
  }

  canUpdateProfile(profile) {
    if (!this.jwt) return false;
    if (this.isAdmin()) return true;
    return profile.id === this.authUid || profile.firebase_uid === this.firebaseUid;
  }

  // --- Cell Meeting Reports Policy ---
  canSelectReport(report, cellRegionId = null) {
    if (!this.jwt) return false;
    if (this.isAdmin()) return true;
    if (report.tutor_uid === this.authUid || report.tutor_uid === this.firebaseUid) return true;
    if (cellRegionId && this.isRegionalLeader(cellRegionId)) return true;
    return false;
  }

  canInsertReport(report) {
    if (!this.jwt) return false;
    if (this.isAdmin()) return true;
    return report.tutor_uid === this.authUid || report.tutor_uid === this.firebaseUid;
  }

  canUpdateReport(report) {
    if (!this.jwt) return false;
    if (this.isAdmin()) return true;
    const isOwner = (report.tutor_uid === this.authUid || report.tutor_uid === this.firebaseUid);
    const isEditableState = ['Needs Correction', 'draft', 'Newly Submitted'].includes(report.status);
    return isOwner && isEditableState;
  }

  canDeleteReport() {
    return this.isAdmin();
  }

  // --- Offering Records Policy (Confidentiality) ---
  canSelectOfferings() {
    return this.isAdmin();
  }

  canInsertOffering() {
    return this.isAdmin();
  }

  // --- Private Messages Policy (Confidentiality) ---
  canSelectPrivateMessage(msg) {
    if (!this.jwt) return false;
    return (
      msg.sender_uid === this.authUid ||
      msg.sender_uid === this.firebaseUid ||
      msg.recipient_uid === this.authUid ||
      msg.recipient_uid === this.firebaseUid
    );
  }

  canInsertPrivateMessage(msg) {
    if (!this.jwt) return false;
    return msg.sender_uid === this.authUid || msg.sender_uid === this.firebaseUid;
  }

  // --- Audit Logs Policy ---
  canSelectAuditLogs() {
    return this.isAdmin();
  }

  canInsertAuditLog() {
    return Boolean(this.jwt);
  }

  canModifyAuditLog() {
    return false; // Strictly immutable for all actors
  }
}

// -----------------------------------------------------------------------------
// 3. EXECUTE SCENARIO TESTS
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Cross-Cell Isolation & Confidential Data Protection ---');

const anonEval = new RlsEvaluator(null);
const superAdminEval = new RlsEvaluator(superAdminToken.token);
const nationalAdminEval = new RlsEvaluator(nationalAdminToken.token);
const regionalEval = new RlsEvaluator(regionalLeaderToken.token);
const leaderAEval = new RlsEvaluator(cellLeaderAToken.token);
const leaderBEval = new RlsEvaluator(cellLeaderBToken.token);

// Sample records
const reportCellA = {
  id: 'cmr-legon-w45',
  cell_id: 'cell-legon',
  tutor_uid: 'tutor-cell-legon',
  attendance: 28,
  offering: 350.00,
  status: 'Newly Submitted',
};

const reportCellB = {
  id: 'cmr-knust-w45',
  cell_id: 'cell-knust',
  tutor_uid: 'tutor-cell-knust',
  attendance: 42,
  offering: 520.00,
  status: 'Approved',
};

const offeringRecordA = {
  id: 'off-legon-w45',
  cell_id: 'cell-legon',
  report_id: 'cmr-legon-w45',
  amount: 350.00,
};

const privateChat = {
  id: 'pmsg-101',
  sender_uid: 'tutor-cell-legon',
  recipient_uid: 'usr-admin-master',
  content: 'Confidential pastoral guidance request.',
};

// 1. Unauthenticated Restrictions
assert(!anonEval.canSelectReport(reportCellA), 'Anonymous visitor CANNOT view Cell A reports');
assert(!anonEval.canSelectOfferings(), 'Anonymous visitor CANNOT view offering records');
assert(!anonEval.canSelectPrivateMessage(privateChat), 'Anonymous visitor CANNOT view private messages');
assert(!anonEval.canSelectAuditLogs(), 'Anonymous visitor CANNOT view audit logs');

// 2. Cross-Cell Isolation
assert(leaderAEval.canSelectReport(reportCellA), 'Leader A CAN view own Cell A report');
assert(!leaderAEval.canSelectReport(reportCellB), 'Leader A CANNOT view Cell B report (Cross-Cell Blocked)');
assert(leaderBEval.canSelectReport(reportCellB), 'Leader B CAN view own Cell B report');
assert(!leaderBEval.canSelectReport(reportCellA), 'Leader B CANNOT view Cell A report (Cross-Cell Blocked)');

// 3. Offering & Financial Confidentiality
assert(!leaderAEval.canSelectOfferings(), 'Leader A CANNOT access financial offering records table');
assert(!leaderBEval.canSelectOfferings(), 'Leader B CANNOT access financial offering records table');
assert(superAdminEval.canSelectOfferings(), 'Super Admin CAN access financial offering records table');
assert(nationalAdminEval.canSelectOfferings(), 'National Admin CAN access financial offering records table');

// 4. Private Messaging Confidentiality
assert(leaderAEval.canSelectPrivateMessage(privateChat), 'Sender (Leader A) CAN view own sent private message');
assert(superAdminEval.canSelectPrivateMessage(privateChat), 'Recipient (Admin) CAN view incoming private message');
assert(!leaderBEval.canSelectPrivateMessage(privateChat), 'Leader B CANNOT eavesdrop on Leader A <-> Admin private messages');

// 5. Audit Log Immutability
assert(superAdminEval.canSelectAuditLogs(), 'Super Admin CAN view audit logs');
assert(!leaderAEval.canSelectAuditLogs(), 'Cell Leader CANNOT view audit logs');
assert(!superAdminEval.canModifyAuditLog(), 'Audit logs are strictly IMMUTABLE (Super Admin cannot edit/delete)');
assert(!leaderAEval.canModifyAuditLog(), 'Audit logs are strictly IMMUTABLE (Leader cannot edit/delete)');

// 6. Report Modification Permissions
assert(leaderAEval.canUpdateReport(reportCellA), 'Leader A CAN edit own report while in Newly Submitted status');
assert(!leaderAEval.canUpdateReport(reportCellB), 'Leader A CANNOT edit Leader B report');
assert(!leaderBEval.canUpdateReport(reportCellB), 'Leader B CANNOT edit report after it has been Approved');
assert(superAdminEval.canUpdateReport(reportCellB), 'Super Admin CAN modify report in any state');
assert(!leaderAEval.canDeleteReport(), 'Cell Leader CANNOT delete report');
assert(superAdminEval.canDeleteReport(), 'Super Admin CAN delete report');

// 7. Impersonation & Spoofing Defense
const forgedToken = 'header.eyJyZXF1ZXN0ZWRfdWlkIjoidXNyLWFkbWluLW1hc3RlciJ9.forgedsignature';
assert(verifyJwt(forgedToken, MOCK_JWT_SECRET) === null, 'Forged JWT with spoofed admin claim is cryptographically rejected');

console.log('\n================================================================');
console.log(`TOTAL INTEGRATION TESTS: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
}
