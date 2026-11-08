/**
 * Verification test for Cell Breakdown & Compliance (Zero Regional Data)
 */
import assert from 'assert';

console.log('========================================================');
console.log('FNI CELLS CONNECT — CELLS BREAKDOWN & COMPLIANCE TEST');
console.log('========================================================\n');

// 1. Mock minimal stores
const cellsStore = [];
const meetingsStore = [];
const evangStore = [];
const profilesStore = [];

function getCellPerformance() {
  return cellsStore.map(cell => {
    const cellMeetings = meetingsStore.filter(m => m.cellId === cell.id);
    const cellEvang = evangStore.filter(e => e.cellId === cell.id);

    const tutorProfile = profilesStore.find(p => p.cell_id === cell.id || p.id === cell.tutorUid);
    const leaderName = cell.leader_name || tutorProfile?.full_name || 'Assigned Tutor';

    const totalAttendance = cellMeetings.reduce((sum, m) => sum + (Number(m.attendance) || 0), 0);
    const soulsFromEvang = cellEvang.reduce((sum, e) => sum + (Number(e.conversions) || 0), 0);
    const soulsFromCell = cellMeetings.reduce((sum, m) => sum + (Number(m.newMembers) || 0), 0);
    const soulsWon = soulsFromEvang + soulsFromCell;
    const peopleReached = cellEvang.reduce((sum, e) => sum + (Number(e.peopleSpokenTo) || 0), 0);
    const offeringsGhs = cellMeetings.reduce((sum, m) => sum + (Number(m.offering) || 0), 0);

    const latest = [...cellMeetings, ...cellEvang].sort(
      (a, b) => new Date(b.submittedAt || b.date).getTime() - new Date(a.submittedAt || a.date).getTime()
    )[0];

    let compliance = 0;
    let status = 'Missing Report';

    if (!latest) {
      compliance = 0;
      status = 'Missing Report';
    } else if (latest.status === 'Needs Correction') {
      compliance = 60;
      status = 'Needs Correction';
    } else if (latest.status === 'Newly Submitted') {
      compliance = latest.late ? 75 : 90;
      status = 'Awaiting Review';
    } else if (latest.status === 'Approved') {
      compliance = latest.late ? 85 : 100;
      status = 'On Track';
    }

    return {
      id: cell.id,
      name: cell.name,
      code: cell.code,
      leaderName,
      meetingReportsCount: cellMeetings.length,
      evangelismReportsCount: cellEvang.length,
      totalAttendance,
      soulsWon,
      peopleReached,
      offeringsGhs,
      compliance,
      status,
    };
  });
}

// TEST 1: Empty database has zero cells and no mock regions
console.log('TEST 1: Empty state has zero rows and zero mock regions...');
const emptyPerf = getCellPerformance();
assert.strictEqual(emptyPerf.length, 0, 'Must have 0 cells when database is empty');
console.log('  ✅ No mock regions or dummy cells returned when database is clean.');

// TEST 2: Tutor signs up -> cell appears in Cell Breakdown
console.log('TEST 2: Tutor signs up -> cell appears with initial 0% compliance...');
const newCell = {
  id: 'cell-kingsway-101',
  name: 'Kingsway Fellowship Cell',
  code: 'FNI-CEL-001',
  leader_name: 'Brother Emmanuel',
  tutorUid: 'tutor-emmanuel-1',
};
cellsStore.push(newCell);
profilesStore.push({
  id: 'tutor-emmanuel-1',
  full_name: 'Brother Emmanuel',
  cell_id: 'cell-kingsway-101',
  role: 'tutor',
});

const afterSignup = getCellPerformance();
assert.strictEqual(afterSignup.length, 1);
assert.strictEqual(afterSignup[0].name, 'Kingsway Fellowship Cell');
assert.strictEqual(afterSignup[0].leaderName, 'Brother Emmanuel');
assert.strictEqual(afterSignup[0].compliance, 0);
assert.strictEqual(afterSignup[0].status, 'Missing Report');
console.log('  ✅ Registered cell appears immediately with initial Missing Report / 0% compliance.');

// TEST 3: Tutor submits weekly cell meeting report and evangelism report
console.log('TEST 3: Tutor submits meeting and evangelism reports -> metrics dynamically compute...');
meetingsStore.push({
  id: 'mtg-1',
  cellId: 'cell-kingsway-101',
  attendance: 28,
  newMembers: 3,
  offering: 350.50,
  status: 'Approved',
  late: false,
  submittedAt: new Date().toISOString(),
});
evangStore.push({
  id: 'evang-1',
  cellId: 'cell-kingsway-101',
  conversions: 6,
  peopleSpokenTo: 45,
  status: 'Approved',
  late: false,
  submittedAt: new Date().toISOString(),
});

const afterReports = getCellPerformance();
assert.strictEqual(afterReports[0].meetingReportsCount, 1);
assert.strictEqual(afterReports[0].evangelismReportsCount, 1);
assert.strictEqual(afterReports[0].totalAttendance, 28);
assert.strictEqual(afterReports[0].soulsWon, 9, 'Should sum 6 from evangelism + 3 new converts from cell meeting');
assert.strictEqual(afterReports[0].peopleReached, 45);
assert.strictEqual(afterReports[0].offeringsGhs, 350.50);
assert.strictEqual(afterReports[0].compliance, 100);
assert.strictEqual(afterReports[0].status, 'On Track');
console.log('  ✅ Cell breakdown & compliance accurately computes live attendance, harvest, and 100% on-track compliance!');

console.log('\n========================================================');
console.log('ALL CELL BREAKDOWN & COMPLIANCE TESTS PASSED! ✅');
console.log('========================================================');
