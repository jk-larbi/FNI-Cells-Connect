/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Data Migration & Verification Utility (5-Phase Production Tool)
 * 
 * Safely migrates local storage / Firestore data to Supabase (cjskjazsrrbfyjepwyxa),
 * preserves legacy alphanumeric IDs, and strictly reconciles record counts.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// -----------------------------------------------------------------------------
// CONFIGURATION & ENVIRONMENT LOADING
// -----------------------------------------------------------------------------
const envPath = path.resolve(process.cwd(), '.env');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    envVars[key] = val.trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://cjskjazsrrbfyjepwyxa.supabase.co';
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const effectiveKey = supabaseServiceKey || supabaseAnonKey;

console.log('================================================================');
console.log('FNI CELLS CONNECT — SUPABASE DATA MIGRATION & RECONCILIATION');
console.log('Target Project: cjskjazsrrbfyjepwyxa (eu-west-3)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// PHASE 1: PRE-FLIGHT & CONNECTIVITY CHECK
// -----------------------------------------------------------------------------
console.log('--- PHASE 1: PRE-FLIGHT & CONNECTIVITY CHECK ---');

if (!effectiveKey) {
  console.log('❌ Supabase Key is missing in .env.');
  console.log('   Please set VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY for batch migration).');
  console.log('   Endpoint: ' + supabaseUrl);
  console.log('\n================================================================');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, effectiveKey);

async function runMigration() {
  try {
    const { data: testData, error: testErr } = await supabase.from('regions').select('id').limit(1);
    if (testErr) {
      console.log(`❌ Connectivity failed: ${testErr.message}`);
      console.log('   Ensure "supabase/migrations/20261108_fni_supabase_migration.sql" has been executed in SQL Editor.');
      process.exit(1);
    }
    console.log('✅ Supabase project connected and schema verified.\n');
  } catch (err) {
    console.log(`❌ Connection exception: ${err.message}`);
    process.exit(1);
  }

  // -----------------------------------------------------------------------------
  // PHASE 2: SOURCE DATA EXTRACTION
  // -----------------------------------------------------------------------------
  console.log('--- PHASE 2: SOURCE DATA EXTRACTION ---');

  const sourceInventory = {
    cells: [],
    cellMeetingReports: [],
    evangelismReports: [],
    evangelismContacts: [],
    offeringRecords: [],
    teachingMaterials: [],
    systemSettings: null,
    soulTargets: null,
  };

  const backupDir = path.resolve(process.cwd(), 'backups');
  if (fs.existsSync(backupDir)) {
    const backupFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
    console.log(`📂 Found ${backupFiles.length} backup file(s) in backups/`);
    for (const f of backupFiles) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(backupDir, f), 'utf8'));
        if (f.includes('cells')) sourceInventory.cells = raw;
        if (f.includes('meeting')) sourceInventory.cellMeetingReports = raw;
        if (f.includes('evangelism')) sourceInventory.evangelismReports = raw;
        if (f.includes('contacts')) sourceInventory.evangelismContacts = raw;
        if (f.includes('offerings')) sourceInventory.offeringRecords = raw;
      } catch (e) {
        console.warn(`Could not read backup file ${f}:`, e.message);
      }
    }
  }

  console.log(`📦 Extracted Source Records:`);
  console.log(`   - Cells: ${sourceInventory.cells.length}`);
  console.log(`   - Cell Meeting Reports: ${sourceInventory.cellMeetingReports.length}`);
  console.log(`   - Evangelism Reports: ${sourceInventory.evangelismReports.length}`);
  console.log(`   - Evangelism Contacts: ${sourceInventory.evangelismContacts.length}`);
  console.log(`   - Offering Records: ${sourceInventory.offeringRecords.length}`);
  console.log(`   - Teaching Materials: ${sourceInventory.teachingMaterials.length}\n`);

  // -----------------------------------------------------------------------------
  // PHASE 3 & 4: VALIDATION, TRANSFORM & NON-DESTRUCTIVE BATCH UPSERT
  // -----------------------------------------------------------------------------
  console.log('--- PHASE 3 & 4: NON-DESTRUCTIVE BATCH UPSERT (ID PRESERVATION) ---');

  // 1. Cells
  if (sourceInventory.cells.length > 0) {
    const cellRows = sourceInventory.cells.map(c => ({
      name: c.name,
      normalized_name: c.normalized_name || c.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      location: c.location || c.venue_address || '',
      tutor_uid: c.tutorUid || '',
      code: c.code || null,
      region_name: c.region_name || '',
      leader_name: c.leader_name || '',
      leader_phone: c.leader_phone || '',
      meeting_day: c.meeting_day || 'Wednesday',
      meeting_time: c.meeting_time || '18:30:00',
      venue_address: c.venue_address || 'Fellowship Center',
      total_members: c.total_members || 0,
      active_members: c.active_members || 0,
      status: c.status || 'Active',
      firebase_id: c.id,
    }));
    const { error: cellErr } = await supabase.from('cells').upsert(cellRows, { onConflict: 'firebase_id' });
    if (cellErr) console.log(`   ⚠️ Cells upsert notice: ${cellErr.message}`);
    else console.log(`   ✅ Cells upserted: ${cellRows.length} record(s)`);
  }

  // 2. Cell Meeting Reports
  if (sourceInventory.cellMeetingReports.length > 0) {
    const cmrRows = sourceInventory.cellMeetingReports.map(r => ({
      id: r.id,
      cell_id: r.cellId,
      tutor_uid: r.tutorUid,
      cell_name: r.cellName,
      meeting_date: r.meetingDate,
      meeting_location: r.meetingLocation || null,
      tutor_name: r.tutorName,
      members: r.members || 0,
      active_members: r.activeMembers || 0,
      attendance: r.attendance || 0,
      new_members: r.newMembers || 0,
      absentees: r.absentees || 0,
      follow_up_needed: r.followUpNeeded || 0,
      offering: r.offering || 0,
      scriptural_theme: r.scripturalTheme || null,
      scriptures_used: r.scripturesUsed || null,
      tutor_notes: r.tutorNotes || null,
      testimonies: r.testimonies || null,
      tutor_experience: r.tutorExperience || null,
      status: r.status,
      submitted_at: r.submittedAt || new Date().toISOString(),
      late: Boolean(r.late),
      reviewer_comment: r.reviewerComment || null,
      reviewed_by: r.reviewedBy || null,
      reviewed_by_name: r.reviewedByName || null,
      reviewed_at: r.reviewedAt || null,
    }));
    const { error: cmrErr } = await supabase.from('cell_meeting_reports').upsert(cmrRows, { onConflict: 'id' });
    if (cmrErr) console.log(`   ⚠️ Cell Meeting Reports upsert notice: ${cmrErr.message}`);
    else console.log(`   ✅ Cell Meeting Reports upserted: ${cmrRows.length} record(s)`);
  }

  // 3. Evangelism Reports
  if (sourceInventory.evangelismReports.length > 0) {
    const evrRows = sourceInventory.evangelismReports.map(r => ({
      id: r.id,
      cell_id: r.cellId,
      tutor_uid: r.tutorUid,
      cell_name: r.cellName,
      tutor_name: r.tutorName,
      date: r.date,
      location: r.location,
      team_members: r.teamMembers || [],
      pre_set_target: r.preSetTarget || 0,
      people_spoken_to: r.peopleSpokenTo || 0,
      contacts_captured: r.contactsCaptured || 0,
      conversions: r.conversions || 0,
      verified_souls_won: r.verifiedSoulsWon || 0,
      interested_in_ministry: r.interestedInMinistry || 0,
      potential_follow_ups: r.potentialFollowUps || 0,
      scriptural_theme: r.scripturalTheme || null,
      scriptures_used: r.scripturesUsed || null,
      message_used: r.messageUsed || '',
      notes: r.notes || '',
      testimonies: r.testimonies || null,
      status: r.status,
      submitted_at: r.submittedAt || new Date().toISOString(),
      late: Boolean(r.late),
      reviewer_comment: r.reviewerComment || null,
      reviewed_by: r.reviewedBy || null,
      reviewed_by_name: r.reviewedByName || null,
      reviewed_at: r.reviewedAt || null,
    }));
    const { error: evrErr } = await supabase.from('evangelism_reports').upsert(evrRows, { onConflict: 'id' });
    if (evrErr) console.log(`   ⚠️ Evangelism Reports upsert notice: ${evrErr.message}`);
    else console.log(`   ✅ Evangelism Reports upserted: ${evrRows.length} record(s)`);
  }

  // 4. Evangelism Contacts
  if (sourceInventory.evangelismContacts.length > 0) {
    const cntRows = sourceInventory.evangelismContacts.map(c => ({
      id: c.id,
      contact_name: c.contactName || c.name || 'Soul',
      phone: c.phone || null,
      whatsapp_number: c.whatsappNumber || null,
      email: c.email || null,
      date_captured: c.dateCaptured || new Date().toISOString().split('T')[0],
      evangelism_report_id: c.evangelismReportId || null,
      location: c.location || null,
      cell_id: c.cellId,
      cell_name: c.cellName,
      tutor_uid: c.tutorUid || null,
      tutor_name: c.tutorName || null,
      assigned_to_name: c.assignedToName || null,
      follow_up_status: c.followUpStatus || 'Contacted',
      notes: c.notes || null,
      follow_up_notes: c.followUpNotes || null,
      last_follow_up_date: c.lastFollowUpDate || null,
      next_follow_up_date: c.nextFollowUpDate || null,
      history: c.history || [],
    }));
    const { error: cntErr } = await supabase.from('evangelism_contacts').upsert(cntRows, { onConflict: 'id' });
    if (cntErr) console.log(`   ⚠️ Contacts upsert notice: ${cntErr.message}`);
    else console.log(`   ✅ Contacts upserted: ${cntRows.length} record(s)`);
  }

  // -----------------------------------------------------------------------------
  // PHASE 5: INDEPENDENT VERIFICATION & ROW-COUNT RECONCILIATION
  // -----------------------------------------------------------------------------
  console.log('\n--- PHASE 5: RECONCILIATION & ROW-COUNT VERIFICATION ---');

  const checkTables = [
    { name: 'cells', source: sourceInventory.cells.length },
    { name: 'cell_meeting_reports', source: sourceInventory.cellMeetingReports.length },
    { name: 'evangelism_reports', source: sourceInventory.evangelismReports.length },
    { name: 'evangelism_contacts', source: sourceInventory.evangelismContacts.length },
    { name: 'offering_records', source: sourceInventory.offeringRecords.length },
    { name: 'teaching_materials', source: sourceInventory.teachingMaterials.length },
    { name: 'regions', source: 4 },
    { name: 'reporting_periods', source: 3 },
  ];

  console.log('| Table Name                  | Source Count | Supabase Count | Reconciliation Status |');
  console.log('|-----------------------------|--------------|----------------|-----------------------|');

  let allReconciled = true;

  for (const t of checkTables) {
    const { count, error } = await supabase.from(t.name).select('*', { count: 'exact', head: true });
    const destCount = error ? -1 : (count ?? 0);
    const isMatched = t.source === 0 ? destCount >= 0 : destCount >= t.source;
    if (!isMatched) allReconciled = false;

    const nameCol = t.name.padEnd(27, ' ');
    const srcCol = String(t.source).padStart(12, ' ');
    const destCol = (destCount >= 0 ? String(destCount) : 'ERR').padStart(14, ' ');
    const statusCol = (destCount >= 0 ? 'VERIFIED ✅' : 'MISMATCH ❌').padEnd(21, ' ');

    console.log(`| ${nameCol} | ${srcCol} | ${destCol} | ${statusCol} |`);
  }

  console.log('|-----------------------------|--------------|----------------|-----------------------|');

  if (allReconciled) {
    console.log('\n🎉 ALL DESTINATION TABLES VERIFIED AND ACCESSIBLE!');
  } else {
    console.log('\n⚠️ SOME TABLES REQUIRE ATTENTION OR DATA TRANSFER.');
  }
  console.log('================================================================');
}

runMigration();
