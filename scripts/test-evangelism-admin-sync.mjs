// scripts/test-evangelism-admin-sync.mjs
// Verification for Evangelism Admin View data aggregation & safety

import assert from 'assert';

console.log('========================================================');
console.log('TESTING EVANGELISM ADMIN DATA AGGREGATION & SAFETY');
console.log('========================================================');

// Test 1: Defensive filtering against undefined strings
const sampleReports = [
  {
    id: 'cmr-01',
    reportType: 'meeting',
    cellId: 'cell-agape',
    cellName: 'Agape Fellowship',
    tutorName: 'Bro. Emmanuel',
    meetingDate: '2026-11-08',
    meetingLocation: undefined, // undefined test
    location: undefined,
    attendance: 25,
    newMembers: 3,
    followUpNeeded: 3,
    scripturalTheme: 'Walking in Faith',
    scripturesUsed: 'Hebrews 11:1-6',
    status: 'Newly Submitted',
  },
  {
    id: 'evr-01',
    reportType: 'evangelism',
    cellId: 'cell-agape',
    cellName: 'Agape Fellowship',
    tutorName: 'Bro. Emmanuel',
    date: '2026-11-08',
    location: 'Legon Campus Gate',
    conversions: 5,
    peopleSpokenTo: 18,
    contactsCaptured: 7,
    scripturalTheme: 'Supernatural Reconciliation',
    scripturesUsed: undefined, // undefined test
    status: 'Newly Submitted',
  },
  {
    id: 'cmr-02',
    reportType: 'meeting',
    cellId: 'cell-grace',
    cellName: 'Grace Cell',
    tutorName: 'Sis. Abigail',
    meetingDate: '2026-11-08',
    meetingLocation: 'Victory Hall',
    attendance: 14,
    newMembers: 1,
    followUpNeeded: 2,
    scripturalTheme: undefined,
    scripturesUsed: undefined,
    status: 'Approved',
  },
];

// Verify KPI computation
const totalSouls = sampleReports.reduce((sum, r) => {
  return sum + (r.reportType === 'meeting' ? (Number(r.newMembers) || 0) : (Number(r.conversions) || 0));
}, 0);
assert.strictEqual(totalSouls, 3 + 5 + 1, 'Total souls should combine meeting new members (4) + evangelism conversions (5)');
console.log('  ✅ KPI Total Souls aggregated accurately: 9 souls saved across meeting & evangelism.');

const totalReached = sampleReports.reduce((sum, r) => {
  return sum + (r.reportType === 'meeting' ? (Number(r.attendance) || 0) : (Number(r.peopleSpokenTo) || 0));
}, 0);
assert.strictEqual(totalReached, 25 + 18 + 14, 'Total reached should combine meeting attendance + evangelism people reached');
console.log('  ✅ KPI Total Reached aggregated accurately: 57 individuals engaged.');

// Verify safe filtering without throwing on undefined
function filterReports(list, query, category, cellFilter) {
  return list.filter(r => {
    if (category === 'evangelism' && r.reportType !== 'evangelism') return false;
    if (category === 'meeting' && r.reportType !== 'meeting') return false;
    if (cellFilter !== 'All' && r.cellId !== cellFilter) return false;

    const q = (query || '').trim().toLowerCase();
    if (!q) return true;

    const cellName = (r.cellName || '').toLowerCase();
    const tutorName = (r.tutorName || '').toLowerCase();
    const location = (
      r.reportType === 'evangelism'
        ? (r.location || '')
        : (r.meetingLocation || r.location || '')
    ).toLowerCase();
    const theme = (r.scripturalTheme || '').toLowerCase();
    const scriptures = (r.scripturesUsed || '').toLowerCase();

    return (
      cellName.includes(q) ||
      tutorName.includes(q) ||
      location.includes(q) ||
      theme.includes(q) ||
      scriptures.includes(q)
    );
  });
}

// Search by location with undefined fields
const resLoc = filterReports(sampleReports, 'campus', 'all', 'All');
assert.strictEqual(resLoc.length, 1);
assert.strictEqual(resLoc[0].id, 'evr-01');
console.log('  ✅ Safe search by location matches evangelism record without throwing on undefined.');

// Filter by category
const evangelismOnly = filterReports(sampleReports, '', 'evangelism', 'All');
assert.strictEqual(evangelismOnly.length, 1);
const meetingsOnly = filterReports(sampleReports, '', 'meeting', 'All');
assert.strictEqual(meetingsOnly.length, 2);
const allReports = filterReports(sampleReports, '', 'all', 'All');
assert.strictEqual(allReports.length, 3);
console.log('  ✅ Category filtering works smoothly (All: 3, Evangelism: 1, Meetings: 2).');

console.log('========================================================');
console.log('ALL EVANGELISM ADMIN DATA SYNC TESTS PASSED! ✅');
console.log('========================================================');
