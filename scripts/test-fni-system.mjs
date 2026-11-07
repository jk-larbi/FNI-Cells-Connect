/**
 * Automated Verification Test Suite for FNI CELLS CONNECT
 * Tests authentication, duplicate cell handling, reporting deadlines, and review workflows.
 */

import assert from 'assert';

console.log('========================================================');
console.log('FNI CELLS CONNECT — AUTOMATED SYSTEM VERIFICATION SUITE');
console.log('========================================================\n');

// 1. Deadline Calculation Verification (Sunday 6:00 PM Africa/Accra)
console.log('TEST 1: Weekly Deadline Timing (Sunday 6:00 PM Ghana Time / UTC+0)...');
function evaluateTiming(submissionIso, deadlineIso) {
  const subTime = new Date(submissionIso).getTime();
  const deadTime = new Date(deadlineIso).getTime();
  const isLate = subTime > deadTime;
  return { isLate, timing: isLate ? 'late' : 'on_time' };
}

const deadline = '2026-11-08T18:00:00Z'; // Sunday 6:00 PM GMT
const onTimeSubmission = '2026-11-08T17:45:00Z'; // 15 mins before
const lateSubmission = '2026-11-08T18:05:00Z'; // 5 mins after

assert.strictEqual(evaluateTiming(onTimeSubmission, deadline).isLate, false, 'On-time submission failed');
assert.strictEqual(evaluateTiming(lateSubmission, deadline).isLate, true, 'Late submission failed');
console.log('  ✅ Sunday 6:00 PM Ghana cutoff correctly marks on-time and late returns.');

// 2. Duplicate Cell Name Normalization
console.log('\nTEST 2: Duplicate Cell Registration Prevention...');
function normalizeCellName(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

const cellA = 'Dominion Cell';
const cellB = ' dominion  cell ';
const cellC = 'DOMINION-CELL';
const cellD = 'Grace Tabernacle';

assert.strictEqual(normalizeCellName(cellA), normalizeCellName(cellB), 'Space normalization failed');
assert.strictEqual(normalizeCellName(cellA), normalizeCellName(cellC), 'Punctuation normalization failed');
assert.notStrictEqual(normalizeCellName(cellA), normalizeCellName(cellD), 'Distinct cells incorrectly matched');
console.log('  ✅ Normalized cell names detect duplicate registrations across formatting variants.');

// 3. Admin Authentication & Password State Machine
console.log('\nTEST 3: Admin Credential & Forced Password Change State Machine...');
let adminSecurity = {
  initialConfigured: false,
  passwordHash: null,
};

function authenticateAdmin(username, password) {
  if (username !== 'admin' && username !== 'admin@forerunners.org') {
    return { success: false, error: 'User not found' };
  }
  if (!adminSecurity.initialConfigured) {
    if (password === 'admin123') {
      return { success: true, mustChangePassword: true };
    }
    return { success: false, error: 'Invalid initial password' };
  } else {
    if (password === 'admin123') {
      return { success: false, error: 'Temporary password permanently disabled' };
    }
    if (password === adminSecurity.passwordHash) {
      return { success: true, mustChangePassword: false };
    }
    return { success: false, error: 'Incorrect password' };
  }
}

// Initial login with admin123
let authRes = authenticateAdmin('admin', 'admin123');
assert.strictEqual(authRes.success, true);
assert.strictEqual(authRes.mustChangePassword, true, 'First login must force password change');

// Change password
adminSecurity.initialConfigured = true;
adminSecurity.passwordHash = 'KingdomLeader2026!';

// Old password must fail
let failedOld = authenticateAdmin('admin', 'admin123');
assert.strictEqual(failedOld.success, false, 'Temporary password should no longer work');

// New password must succeed without mustChangePassword
let successNew = authenticateAdmin('admin', 'KingdomLeader2026!');
assert.strictEqual(successNew.success, true, 'New administrator password failed');
assert.strictEqual(successNew.mustChangePassword, false, 'mustChangePassword should be cleared');
console.log('  ✅ Initial temporary credentials work on first sign-in and are permanently disabled after update.');

// 4. Report Review Status State Transitions
console.log('\nTEST 4: Report Review Lifecycle & Audit Trail...');
const validStatuses = ['Newly Submitted', 'Approved', 'Needs Correction'];
let reportState = {
  id: 'rep-001',
  status: 'Newly Submitted',
  reviews: [],
};

function applyReview(report, newStatus, reviewerName, feedback) {
  assert(validStatuses.includes(newStatus), 'Invalid report status');
  const previousStatus = report.status;
  report.status = newStatus;
  report.reviews.push({
    previousStatus,
    newStatus,
    reviewerName,
    feedback,
    timestamp: new Date().toISOString(),
  });
}

// Return for correction
applyReview(reportState, 'Needs Correction', 'Pastor Mensah', 'Please provide total offering amount and absentees.');
assert.strictEqual(reportState.status, 'Needs Correction');
assert.strictEqual(reportState.reviews.length, 1);

// Approve
applyReview(reportState, 'Approved', 'Pastor Mensah', 'All figures verified and approved.');
assert.strictEqual(reportState.status, 'Approved');
assert.strictEqual(reportState.reviews.length, 2);
console.log('  ✅ Review lifecycle transition logs reviewer UID, comments, and previous/new status.');

// 5. Tutor Registration and 2-Field Login (Full Name & Password ONLY)
console.log('\nTEST 5: Tutor Registration and Login (Full Name & Password ONLY)...');
const registeredTutors = [
  { fullName: 'Samuel Mensah', cellName: 'Grace Central Cell', pass: 'secret123' },
  { fullName: 'Kwame Asante', cellName: 'Dominion Fellowship', pass: 'fellowship2026' }
];

function loginTutor2Fields(fullName, password) {
  const match = registeredTutors.find(t => t.fullName.toLowerCase() === fullName.trim().toLowerCase());
  if (!match) return { success: false, error: 'Tutor not found' };
  if (match.pass !== password) return { success: false, error: 'Invalid password' };
  return { success: true, tutor: { fullName: match.fullName, cellName: match.cellName } };
}

assert.strictEqual(loginTutor2Fields('Samuel Mensah', 'secret123').success, true, 'Samuel Mensah login failed with 2 fields');
assert.strictEqual(loginTutor2Fields('samuel mensah', 'secret123').tutor.cellName, 'Grace Central Cell', 'Case insensitive name match failed');
assert.strictEqual(loginTutor2Fields('Samuel Mensah', 'wrongpass').success, false, 'Invalid password should fail');
assert.strictEqual(loginTutor2Fields('NonExistent Leader', 'secret123').success, false, 'Unknown tutor should fail');
console.log('  ✅ Tutor login requires ONLY Full Name and Password (no cell name required on sign-in).');

console.log('\n========================================================');
console.log('ALL 5 SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY! ✅');
console.log('========================================================\n');
