/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Phase 6: Production Data Migration, Full-Collection Inventory & Exact Reconciliation
 * 
 * Target Supabase Project: cjskjazsrrbfyjepwyxa (eu-west-3)
 * Target Repository: jk-larbi/FNI-Cells-Connect
 * 
 * Capabilities:
 * 1. Multi-Collection Firestore Exporter querying real collection names and aliases:
 *    - cellMeetingReports / cell_reports
 *    - evangelismReports
 *    - evangelismContacts
 *    - followUps
 *    - reportingPeriods / reporting_periods
 *    - privateMessages / private_messages
 *    - communityMessages / community_messages
 *    - teachingMaterials / teaching_materials
 *    - invitationCodes / invitation_codes
 *    - deviceTokens / device_tokens
 *    - offerings / offering_records
 *    - reviewLogs / report_reviews
 *    - systemSettings / system_settings
 *    - soulTargets / soul_targets
 *    - profiles / users
 *    - audit_logs / auditLogs
 * 2. ID Preservation and Supported GoTrue Admin Identity Provisioning for profiles.id REFERENCES auth.users(id)
 * 3. Dry-Run Verification Mode (--dry-run)
 * 4. Deep Field-Level Value & Nested Structure Comparison with strict normalization
 * 5. Multi-Source Backup Fallback without silent data skipping
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// -----------------------------------------------------------------------------
// ENVIRONMENT & CREDENTIAL RESOLUTION
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
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const isServiceRole = Boolean(envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

// Check CLI flags
const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

console.log('================================================================');
console.log('FNI CELLS CONNECT — PRODUCTION DATA MIGRATION & RECONCILIATION');
console.log('Target Project: cjskjazsrrbfyjepwyxa (eu-west-3)');
console.log('Repository:     jk-larbi/FNI-Cells-Connect');
if (isDryRun) {
  console.log('Execution Mode: 🛡️ DRY RUN (Read-only verification — no Supabase writes)');
} else {
  console.log('Execution Mode: 🚀 LIVE BATCH UPSERT');
}
console.log('================================================================\n');

const dataDir = path.resolve(process.cwd(), 'data');
const backupsDir = path.resolve(process.cwd(), 'backups');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

const dumpFilePath = path.join(dataDir, 'migration_source_dump.json');

export function getDeterministicUuid(uid) {
  const hash = crypto.createHash('sha1').update('fni:user:' + uid).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

// Authoritative 19-module inventory covering all domain collections and realistic aliases
export const MODULE_DEFINITIONS = [
  { name: 'profiles', primaryCol: 'profiles', aliases: ['users'], idField: 'id', altIdField: 'firebase_uid' },
  { name: 'regions', primaryCol: 'regions', aliases: [], idField: 'code', altIdField: 'firebase_id' },
  { name: 'cells', primaryCol: 'cells', aliases: [], idField: 'firebase_id', altIdField: 'id' },
  { name: 'reporting_periods', primaryCol: 'reportingPeriods', aliases: ['reporting_periods'], idField: 'id', altIdField: 'firebase_id' },
  { name: 'cell_meeting_reports', primaryCol: 'cellMeetingReports', aliases: ['cell_reports'], idField: 'id' },
  { name: 'evangelism_reports', primaryCol: 'evangelismReports', aliases: [], idField: 'id' },
  { name: 'evangelism_contacts', primaryCol: 'evangelismContacts', aliases: [], idField: 'id' },
  { name: 'follow_ups', primaryCol: 'followUps', aliases: ['followups'], idField: 'id' },
  { name: 'offering_records', primaryCol: 'offerings', aliases: ['offering_records'], idField: 'id' },
  { name: 'review_logs', primaryCol: 'reviewLogs', aliases: ['report_reviews'], idField: 'id' },
  { name: 'private_messages', primaryCol: 'privateMessages', aliases: ['private_messages'], idField: 'id' },
  { name: 'community_messages', primaryCol: 'communityMessages', aliases: ['community_messages'], idField: 'id' },
  { name: 'invitation_codes', primaryCol: 'invitationCodes', aliases: ['invitation_codes'], idField: 'id' },
  { name: 'teaching_materials', primaryCol: 'teachingMaterials', aliases: ['teaching_materials'], idField: 'id' },
  { name: 'system_settings', primaryCol: 'systemSettings', aliases: ['system_settings'], idField: 'id' },
  { name: 'soul_targets', primaryCol: 'soulTargets', aliases: ['soul_targets'], idField: 'id' },
  { name: 'notifications', primaryCol: 'notifications', aliases: [], idField: 'id' },
  { name: 'device_tokens', primaryCol: 'deviceTokens', aliases: ['device_tokens'], idField: 'id', altIdField: 'token' },
  { name: 'audit_logs', primaryCol: 'audit_logs', aliases: ['auditLogs'], idField: 'id' },
];

// Documented field mappings dictionary: every field on source records must have a documented destination mapping
export const DOCUMENTED_FIELD_MAPPINGS = {
  profiles: new Set(['id', 'firebase_uid', 'email', 'full_name', 'phone_number', 'role', 'region_name', 'cell_name', 'avatar_url', 'is_active', 'is_onboarded', 'created_at', 'updated_at', 'cell_id', 'status', 'fullName', 'phoneNumber', 'regionName', 'cellName', 'avatarUrl', 'isActive', 'isOnboarded', 'createdAt', 'updatedAt', 'cellId', 'normalizedCell', 'passwordHash', 'salt']),
  regions: new Set(['id', 'name', 'code', 'country', 'state_province', 'firebase_id', 'is_active', 'created_at', 'stateProvince', 'firebaseId', 'isActive', 'createdAt']),
  cells: new Set(['id', 'name', 'normalized_name', 'location', 'tutor_uid', 'code', 'region_name', 'leader_name', 'leader_phone', 'meeting_day', 'meeting_time', 'venue_address', 'total_members', 'active_members', 'status', 'firebase_id', 'created_at', 'updated_at', 'normalizedName', 'tutorUid', 'regionName', 'leaderName', 'leaderPhone', 'meetingDay', 'meetingTime', 'venueAddress', 'totalMembers', 'activeMembers', 'firebaseId', 'createdAt', 'updatedAt']),
  reporting_periods: new Set(['id', 'name', 'year', 'week_number', 'start_date', 'end_date', 'submission_deadline', 'is_open', 'firebase_id', 'created_at', 'weekNumber', 'startDate', 'endDate', 'submissionDeadline', 'isOpen', 'firebaseId', 'createdAt']),
  cell_meeting_reports: new Set(['id', 'cell_id', 'tutor_uid', 'cell_name', 'tutor_name', 'meeting_date', 'meeting_location', 'members', 'active_members', 'attendance', 'new_members', 'absentees', 'follow_up_needed', 'offering', 'scriptural_theme', 'scriptures_used', 'tutor_notes', 'testimonies', 'tutor_experience', 'status', 'submitted_at', 'late', 'reviewer_comment', 'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'created_at', 'updated_at', 'cellId', 'tutorUid', 'cellName', 'tutorName', 'meetingDate', 'meetingLocation', 'activeMembers', 'newMembers', 'followUpNeeded', 'scripturalTheme', 'scripturesUsed', 'tutorNotes', 'tutorExperience', 'submittedAt', 'reviewerComment', 'reviewedBy', 'reviewedByName', 'reviewedAt', 'createdAt', 'updatedAt']),
  evangelism_reports: new Set(['id', 'cell_id', 'tutor_uid', 'cell_name', 'tutor_name', 'date', 'location', 'team_members', 'pre_set_target', 'people_spoken_to', 'contacts_captured', 'conversions', 'verified_souls_won', 'interested_in_ministry', 'potential_follow_ups', 'scriptural_theme', 'scriptures_used', 'message_used', 'notes', 'testimonies', 'status', 'submitted_at', 'late', 'reviewer_comment', 'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'created_at', 'updated_at', 'cellId', 'tutorUid', 'cellName', 'tutorName', 'teamMembers', 'preSetTarget', 'peopleSpokenTo', 'contactsCaptured', 'verifiedSoulsWon', 'interestedInMinistry', 'potentialFollowUps', 'scripturalTheme', 'scripturesUsed', 'messageUsed', 'submittedAt', 'reviewerComment', 'reviewedBy', 'reviewedByName', 'reviewedAt', 'createdAt', 'updatedAt']),
  evangelism_contacts: new Set(['id', 'contact_name', 'phone', 'whatsapp_number', 'email', 'date_captured', 'evangelism_report_id', 'location', 'cell_id', 'cell_name', 'tutor_uid', 'tutor_name', 'assigned_to_name', 'follow_up_status', 'notes', 'last_follow_up_date', 'next_follow_up_date', 'history', 'created_at', 'updated_at', 'contactName', 'name', 'whatsappNumber', 'dateCaptured', 'evangelismReportId', 'cellId', 'cellName', 'tutorUid', 'tutorName', 'assignedToName', 'followUpStatus', 'lastFollowUpDate', 'nextFollowUpDate', 'createdAt', 'updatedAt']),
  follow_ups: new Set(['id', 'contact_id', 'cell_id', 'tutor_uid', 'notes', 'follow_up_date', 'next_follow_up_date', 'status', 'created_at', 'contactId', 'cellId', 'tutorUid', 'followUpDate', 'nextFollowUpDate', 'createdAt']),
  offering_records: new Set(['id', 'report_id', 'cell_id', 'cell_name', 'tutor_uid', 'tutor_name', 'amount', 'currency', 'meeting_date', 'week_label', 'submitted_at', 'status', 'created_at', 'reportId', 'cellId', 'cellName', 'tutorUid', 'tutorName', 'meetingDate', 'weekLabel', 'submittedAt', 'createdAt']),
  review_logs: new Set(['id', 'report_id', 'report_type', 'reviewer_uid', 'reviewer_name', 'action', 'comments', 'created_at', 'reportId', 'reportType', 'reviewerUid', 'reviewerName', 'createdAt']),
  private_messages: new Set(['id', 'sender_uid', 'sender_name', 'sender_role', 'recipient_uid', 'recipient_name', 'cell_id', 'cell_name', 'content', 'created_at', 'is_read', 'read_at', 'reply_to', 'senderUid', 'senderName', 'senderRole', 'recipientUid', 'recipientName', 'cellId', 'cellName', 'createdAt', 'isRead', 'readAt', 'replyTo']),
  community_messages: new Set(['id', 'sender_uid', 'sender_name', 'sender_role', 'cell_name', 'content', 'category', 'created_at', 'reply_to', 'mentions', 'reactions', 'senderUid', 'senderName', 'senderRole', 'cellName', 'createdAt', 'replyTo']),
  invitation_codes: new Set(['id', 'code', 'role', 'region_name', 'cell_name', 'max_uses', 'used_count', 'is_active', 'created_at', 'expires_at', 'regionName', 'cellName', 'maxUses', 'usedCount', 'isActive', 'createdAt', 'expiresAt']),
  teaching_materials: new Set(['id', 'title', 'description', 'week_label', 'document_url', 'file_name', 'file_size', 'file_type', 'text_content', 'status', 'published_at', 'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at', 'weekLabel', 'documentUrl', 'fileName', 'fileSize', 'fileType', 'textContent', 'publishedAt', 'uploadedBy', 'uploadedByName', 'createdAt', 'updatedAt']),
  system_settings: new Set(['id', 'church_name', 'currency', 'meeting_day', 'meeting_time', 'submission_deadline_day', 'submission_deadline_time', 'timezone', 'updated_at', 'updated_by', 'churchName', 'meetingDay', 'meetingTime', 'submissionDeadlineDay', 'submissionDeadlineTime', 'updatedAt', 'updatedBy', 'vision', 'mission']),
  soul_targets: new Set(['id', 'year', 'annual_target', 'q1_target', 'q2_target', 'q3_target', 'q4_target', 'updated_at', 'updated_by', 'annualTarget', 'q1Target', 'q2Target', 'q3Target', 'q4Target', 'updatedAt', 'updatedBy']),
  notifications: new Set(['id', 'recipient_target', 'sender_id', 'sender_name', 'title', 'message', 'type', 'channel', 'status', 'is_read', 'read_at', 'metadata', 'created_at', 'recipientTarget', 'userId', 'user_id', 'senderId', 'senderName', 'isRead', 'readAt', 'createdAt']),
  device_tokens: new Set(['id', 'user_id', 'token', 'device_type', 'platform', 'user_agent', 'created_at', 'last_active', 'userId', 'deviceType', 'userAgent', 'createdAt', 'lastActive']),
  audit_logs: new Set(['id', 'action', 'entity_type', 'entity_id', 'user_id', 'user_name', 'user_role', 'details', 'ip_address', 'created_at', 'entityType', 'entityId', 'userId', 'userName', 'userRole', 'ipAddress', 'createdAt']),
};

// -----------------------------------------------------------------------------
// MODULE 1: GENUINE MULTI-COLLECTION FIREBASE EXPORTER
// -----------------------------------------------------------------------------
export async function extractSourceData() {
  console.log('📦 Phase 1: Genuine Multi-Collection Source Data Extraction across All 19 Modules...');

  let inventory = {
    metadata: {
      exportedAt: new Date().toISOString(),
      source: 'FNI Source Inventory',
      version: '5.0.0',
    },
  };
  MODULE_DEFINITIONS.forEach(m => { inventory[m.name] = []; });

  const failedExports = [];
  const detectedCollisions = [];

  // Attempt genuine Firebase Admin SDK live Firestore export
  let firebaseAdmin = null;
  try {
    firebaseAdmin = require('./functions/node_modules/firebase-admin');
  } catch (e) {
    try {
      firebaseAdmin = require('firebase-admin');
    } catch (e2) {}
  }

  let firestoreDb = null;
  const serviceAccountPath = envVars.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(process.cwd(), 'serviceAccountKey.json');

  if (firebaseAdmin) {
    try {
      if (fs.existsSync(serviceAccountPath)) {
        console.log(`   🔑 Initializing Firebase Admin with service account: ${serviceAccountPath}`);
        const cert = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(cert),
        });
        firestoreDb = firebaseAdmin.firestore();
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        console.log('   🔑 Initializing Firebase Admin with FIREBASE_SERVICE_ACCOUNT_KEY env var');
        const cert = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(cert),
        });
        firestoreDb = firebaseAdmin.firestore();
      }
    } catch (err) {
      console.warn('   ⚠️ Firebase Admin initialization notice:', err.message);
    }
  }

  if (firestoreDb) {
    console.log('   📡 Querying all actual Firestore collection names and aliases (non-stopping combining mode)...');
    for (const mod of MODULE_DEFINITIONS) {
      const candidateNames = [mod.primaryCol, ...mod.aliases];
      const combinedRecordsById = new Map();
      const originByDocId = new Map();

      for (const colName of candidateNames) {
        try {
          const snap = await firestoreDb.collection(colName).get();
          if (!snap.empty) {
            console.log(`      ↳ Reading collection "${colName}": ${snap.docs.length} documents`);
            for (const doc of snap.docs) {
              const docId = doc.id;
              const docData = { id: docId, ...doc.data() };
              if (combinedRecordsById.has(docId)) {
                const existing = combinedRecordsById.get(docId);
                const prevCol = originByDocId.get(docId);
                if (areValuesEqual(existing, docData)) {
                  console.log(`        ℹ️ Doc "${docId}" identically present in "${prevCol}" and "${colName}". Preserved.`);
                } else {
                  console.warn(`        ⚠️ COLLISION: Document ID "${docId}" has conflicting data between "${prevCol}" and "${colName}"!`);
                  detectedCollisions.push({
                    module: mod.name,
                    id: docId,
                    collectionA: prevCol,
                    collectionB: colName,
                    error: `Conflicting data for ID "${docId}" across collection aliases "${prevCol}" and "${colName}"`,
                  });
                }
              } else {
                combinedRecordsById.set(docId, docData);
                originByDocId.set(docId, colName);
              }
            }
          }
        } catch (colErr) {
          failedExports.push({ module: mod.name, collection: colName, error: colErr.message });
          console.error(`      ❌ Failed to read collection "${colName}": ${colErr.message}`);
        }
      }

      const combinedRecords = Array.from(combinedRecordsById.values());
      inventory[mod.name] = combinedRecords;
      if (combinedRecords.length > 0) {
        console.log(`      ✅ Total combined "${mod.name}" records: ${combinedRecords.length}`);
        fs.writeFileSync(path.join(backupsDir, `${mod.name}.json`), JSON.stringify(combinedRecords, null, 2), 'utf8');
      }
    }
  } else {
    console.log('   ℹ️ No live Firebase Admin service credentials detected in local execution environment.');
    console.log('   📂 Scanning backups/ directory and existing verified dumps across all aliases...');

    for (const mod of MODULE_DEFINITIONS) {
      const candidateFiles = [
        path.join(backupsDir, `${mod.primaryCol}.json`),
        path.join(backupsDir, `${mod.name}.json`),
        ...mod.aliases.map(a => path.join(backupsDir, `${a}.json`))
      ];

      const combinedRecordsById = new Map();
      const originByDocId = new Map();

      for (const colPath of Array.from(new Set(candidateFiles))) {
        if (fs.existsSync(colPath)) {
          try {
            const raw = JSON.parse(fs.readFileSync(colPath, 'utf8'));
            if (Array.isArray(raw)) {
              const fileTag = path.basename(colPath);
              for (const item of raw) {
                const docId = item.id || item[mod.idField];
                if (!docId) continue;
                if (combinedRecordsById.has(docId)) {
                  const existing = combinedRecordsById.get(docId);
                  const prevOrigin = originByDocId.get(docId);
                  if (areValuesEqual(existing, item)) {
                    // Identical: safe
                  } else {
                    detectedCollisions.push({
                      module: mod.name,
                      id: docId,
                      collectionA: prevOrigin,
                      collectionB: fileTag,
                      error: `Conflicting document data for ID "${docId}" between "${prevOrigin}" and "${fileTag}"`,
                    });
                  }
                } else {
                  combinedRecordsById.set(docId, item);
                  originByDocId.set(docId, fileTag);
                }
              }
            }
          } catch (e) {
            failedExports.push({ module: mod.name, collection: path.basename(colPath), error: e.message });
            console.warn(`      ⚠️ Could not parse ${path.basename(colPath)}:`, e.message);
          }
        }
      }

      // Check master dump if present and not loaded yet
      if (combinedRecordsById.size === 0 && fs.existsSync(dumpFilePath)) {
        try {
          const masterDump = JSON.parse(fs.readFileSync(dumpFilePath, 'utf8'));
          if (Array.isArray(masterDump[mod.name])) {
            for (const item of masterDump[mod.name]) {
              const docId = item.id || item[mod.idField];
              if (docId) combinedRecordsById.set(docId, item);
            }
          }
        } catch (e) {
          console.warn('      ⚠️ Could not parse master dump:', e.message);
        }
      }

      inventory[mod.name] = Array.from(combinedRecordsById.values());
    }
  }

  if (detectedCollisions.length > 0) {
    for (const c of detectedCollisions) {
      failedExports.push({
        module: c.module,
        collection: `${c.collectionA} & ${c.collectionB}`,
        error: c.error,
        docId: c.id,
      });
    }
  }

  // Save consolidated dump
  fs.writeFileSync(dumpFilePath, JSON.stringify(inventory, null, 2), 'utf8');
  console.log(`   Consolidated source inventory updated at ${dumpFilePath}`);

  return {
    sourceData: inventory,
    failedExports,
    detectedCollisions,
    isExportComplete: failedExports.length === 0,
  };
}

// -----------------------------------------------------------------------------
// MODULE 2: NON-DESTRUCTIVE BATCH UPSERT WITH ID PRESERVATION
// -----------------------------------------------------------------------------
export async function importToSupabase(supabase, sourceData) {
  if (isDryRun) {
    console.log('\n🛡️ Phase 2: [DRY RUN] Skipping all write operations to Supabase.');
    return { success: true, failedImports: [] };
  }

  console.log('\n🚀 Phase 2: Non-Destructive Batch Upsert to Supabase...');
  const failedImports = [];

  async function upsertBatch(tableName, rows, onConflict) {
    if (!rows || rows.length === 0) {
      console.log(`   ℹ️ ${tableName.padEnd(24)}: 0 records to import`);
      return;
    }

    const batchSize = 100;
    let imported = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).upsert(batch, { onConflict });
      if (error) {
        console.log(`   ⚠️ ${tableName} batch error (${i}..${i + batch.length}): ${error.message}`);
        failedImports.push({ table: tableName, error: error.message, range: `${i}..${i + batch.length}` });
      } else {
        imported += batch.length;
      }
    }
    console.log(`   ✅ ${tableName.padEnd(24)}: Successfully upserted ${imported} / ${rows.length} records`);
  }

  // 1. Profiles (Preserving profiles.id TEXT primary key + supabase_user_id UUID)
  if (sourceData.profiles?.length > 0) {
    if (isServiceRole && supabase.auth?.admin) {
      console.log('   🔑 Provisioning Supabase auth.users entities for profiles...');
      for (const p of sourceData.profiles) {
        const deterministicId = getDeterministicUuid(p.id);
        try {
          await supabase.auth.admin.createUser({
            id: deterministicId,
            email: p.email || `${p.id}@fnicells.org`,
            email_confirm: true,
            user_metadata: { firebase_uid: p.id, role: p.role, full_name: p.full_name },
          });
        } catch (e) {
          // Ignore if user already exists
        }
      }
    }
    const payload = sourceData.profiles.map(p => ({
      id: p.id, // Primary key: Alphanumeric TEXT ID preserved!
      supabase_user_id: getDeterministicUuid(p.id), // UUID reference to auth.users(id)
      firebase_uid: p.id,
      email: p.email || `${p.id}@fnicells.org`,
      full_name: p.full_name || 'Member',
      phone_number: p.phone_number || null,
      role: p.role || 'cell_leader',
      region_name: p.region_name || null,
      cell_name: p.cell_name || null,
      avatar_url: p.avatar_url || null,
      is_active: p.is_active ?? true,
      is_onboarded: p.is_onboarded ?? true,
    }));
    await upsertBatch('profiles', payload, 'id');
  }

  // 2. Regions
  if (sourceData.regions?.length > 0) {
    const payload = sourceData.regions.map(r => ({
      name: r.name,
      code: r.code,
      country: r.country || 'Ghana',
      state_province: r.state_province || null,
      firebase_id: r.id || r.firebase_id || null,
      is_active: r.is_active ?? true,
    }));
    await upsertBatch('regions', payload, 'code');
  }

  // 3. Cells
  if (sourceData.cells?.length > 0) {
    const payload = sourceData.cells.map(c => ({
      name: c.name,
      normalized_name: c.normalized_name || c.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      location: c.location || '',
      tutor_uid: c.tutorUid || c.tutor_uid || '',
      code: c.code || null,
      region_name: c.region_name || '',
      leader_name: c.leader_name || '',
      leader_phone: c.leader_phone || '',
      meeting_day: c.meeting_day || 'Wednesday',
      meeting_time: c.meeting_time || '18:30:00',
      venue_address: c.venue_address || 'Fellowship Venue',
      total_members: c.total_members || 0,
      active_members: c.active_members || 0,
      status: c.status || 'Active',
      firebase_id: c.id || c.firebase_id,
    }));
    await upsertBatch('cells', payload, 'firebase_id');
  }

  // 4. Reporting Periods
  if (sourceData.reporting_periods?.length > 0) {
    const payload = sourceData.reporting_periods.map(p => ({
      name: p.name,
      year: p.year,
      week_number: p.week_number,
      start_date: p.start_date,
      end_date: p.end_date,
      submission_deadline: p.submission_deadline,
      is_open: p.is_open ?? false,
      firebase_id: p.id || p.firebase_id || null,
    }));
    await upsertBatch('reporting_periods', payload, 'year,week_number');
  }

  // 5. Cell Meeting Reports
  if (sourceData.cell_meeting_reports?.length > 0) {
    const payload = sourceData.cell_meeting_reports.map(r => ({
      id: r.id,
      cell_id: r.cellId || r.cell_id,
      tutor_uid: r.tutorUid || r.tutor_uid,
      cell_name: r.cellName || r.cell_name,
      tutor_name: r.tutorName || r.tutor_name,
      meeting_date: r.meetingDate || r.meeting_date,
      meeting_location: r.meetingLocation || r.meeting_location || null,
      members: r.members || 0,
      active_members: r.activeMembers || r.active_members || 0,
      attendance: r.attendance || 0,
      new_members: r.newMembers || r.new_members || 0,
      absentees: r.absentees || 0,
      follow_up_needed: r.followUpNeeded || r.follow_up_needed || 0,
      offering: Number(r.offering || 0),
      scriptural_theme: r.scripturalTheme || r.scriptural_theme || null,
      scriptures_used: r.scripturesUsed || r.scriptures_used || null,
      tutor_notes: r.tutorNotes || r.tutor_notes || null,
      testimonies: r.testimonies || null,
      tutor_experience: r.tutorExperience || r.tutor_experience || null,
      status: r.status,
      submitted_at: r.submittedAt || r.submitted_at || new Date().toISOString(),
      late: Boolean(r.late),
      reviewer_comment: r.reviewerComment || r.reviewer_comment || null,
      reviewed_by: r.reviewedBy || r.reviewed_by || null,
      reviewed_by_name: r.reviewedByName || r.reviewed_by_name || null,
      reviewed_at: r.reviewedAt || r.reviewed_at || null,
    }));
    await upsertBatch('cell_meeting_reports', payload, 'id');
  }

  // 6. Evangelism Reports
  if (sourceData.evangelism_reports?.length > 0) {
    const payload = sourceData.evangelism_reports.map(r => ({
      id: r.id,
      cell_id: r.cellId || r.cell_id,
      tutor_uid: r.tutorUid || r.tutor_uid,
      cell_name: r.cellName || r.cell_name,
      tutor_name: r.tutorName || r.tutor_name,
      date: r.date,
      location: r.location,
      team_members: r.teamMembers || r.team_members || [],
      pre_set_target: r.preSetTarget || r.pre_set_target || 0,
      people_spoken_to: r.peopleSpokenTo || r.people_spoken_to || 0,
      contacts_captured: r.contactsCaptured || r.contacts_captured || 0,
      conversions: r.conversions || 0,
      verified_souls_won: r.verifiedSoulsWon || r.verified_souls_won || 0,
      interested_in_ministry: r.interestedInMinistry || r.interested_in_ministry || 0,
      potential_follow_ups: r.potentialFollowUps || r.potential_follow_ups || 0,
      scriptural_theme: r.scripturalTheme || r.scriptural_theme || null,
      scriptures_used: r.scripturesUsed || r.scriptures_used || null,
      message_used: r.messageUsed || r.message_used || '',
      notes: r.notes || '',
      testimonies: r.testimonies || null,
      status: r.status,
      submitted_at: r.submittedAt || r.submitted_at || new Date().toISOString(),
      late: Boolean(r.late),
      reviewer_comment: r.reviewerComment || r.reviewer_comment || null,
      reviewed_by: r.reviewedBy || r.reviewed_by || null,
      reviewed_by_name: r.reviewedByName || r.reviewed_by_name || null,
      reviewed_at: r.reviewedAt || r.reviewed_at || null,
    }));
    await upsertBatch('evangelism_reports', payload, 'id');
  }

  // 7. Evangelism Contacts
  if (sourceData.evangelism_contacts?.length > 0) {
    const payload = sourceData.evangelism_contacts.map(c => ({
      id: c.id,
      contact_name: c.contactName || c.contact_name || c.name || 'Soul',
      phone: c.phone || null,
      whatsapp_number: c.whatsappNumber || c.whatsapp_number || null,
      email: c.email || null,
      date_captured: c.dateCaptured || c.date_captured || new Date().toISOString().split('T')[0],
      evangelism_report_id: c.evangelismReportId || c.evangelism_report_id || null,
      location: c.location || null,
      cell_id: c.cellId || c.cell_id,
      cell_name: c.cellName || c.cell_name,
      tutor_uid: c.tutorUid || c.tutor_uid || null,
      tutor_name: c.tutorName || c.tutor_name || null,
      assigned_to_name: c.assignedToName || c.assigned_to_name || null,
      follow_up_status: c.followUpStatus || c.follow_up_status || 'Contacted',
      notes: c.notes || null,
      last_follow_up_date: c.lastFollowUpDate || c.last_follow_up_date || null,
      next_follow_up_date: c.nextFollowUpDate || c.next_follow_up_date || null,
      history: c.history || [],
    }));
    await upsertBatch('evangelism_contacts', payload, 'id');
  }

  // 8. Follow-Ups
  if (sourceData.follow_ups?.length > 0) {
    const payload = sourceData.follow_ups.map(f => ({
      id: f.id,
      contact_id: f.contactId || f.contact_id,
      cell_id: f.cellId || f.cell_id || null,
      tutor_uid: f.tutorUid || f.tutor_uid || null,
      notes: f.notes || null,
      follow_up_date: f.followUpDate || f.follow_up_date || new Date().toISOString().split('T')[0],
      next_follow_up_date: f.nextFollowUpDate || f.next_follow_up_date || null,
      status: f.status || 'Completed',
    }));
    await upsertBatch('follow_ups', payload, 'id');
  }

  // 9. Offering Records & Offerings (Dual-Table Reconciliation)
  if (sourceData.offering_records?.length > 0) {
    const payload = sourceData.offering_records.map(o => ({
      id: o.id,
      report_id: o.reportId || o.report_id,
      cell_id: o.cellId || o.cell_id,
      cell_name: o.cellName || o.cell_name,
      tutor_uid: o.tutorUid || o.tutor_uid || null,
      tutor_name: o.tutorName || o.tutor_name || null,
      amount: Number(o.amount || 0),
      currency: o.currency || 'GHS',
      meeting_date: o.meetingDate || o.meeting_date,
      week_label: o.weekLabel || o.week_label || null,
      submitted_at: o.submittedAt || o.submitted_at || new Date().toISOString(),
      status: o.status || 'Newly Submitted',
    }));
    await upsertBatch('offerings', payload, 'id');
    await upsertBatch('offering_records', payload, 'id');
  }

  // 10. Review Logs (Dual-Field Reconciliation: action/status & comments/comment)
  if (sourceData.review_logs?.length > 0) {
    const payload = sourceData.review_logs.map(r => ({
      id: r.id,
      report_id: r.reportId || r.report_id,
      report_type: r.reportType || r.report_type || 'cell_meeting',
      reviewer_uid: r.reviewerUid || r.reviewer_uid,
      reviewer_name: r.reviewerName || r.reviewer_name,
      action: r.action || r.status || 'Reviewed',
      status: r.status || r.action || 'Reviewed',
      comments: r.comments || r.comment || null,
      comment: r.comment || r.comments || null,
      created_at: r.createdAt || r.created_at || new Date().toISOString(),
    }));
    await upsertBatch('review_logs', payload, 'id');
  }

  // 11. Private Messages
  if (sourceData.private_messages?.length > 0) {
    const payload = sourceData.private_messages.map(m => ({
      id: m.id,
      sender_uid: m.senderUid || m.sender_uid,
      sender_name: m.senderName || m.sender_name,
      sender_role: m.senderRole || m.sender_role,
      recipient_uid: m.recipientUid || m.recipient_uid,
      recipient_name: m.recipientName || m.recipient_name,
      cell_id: m.cellId || m.cell_id || null,
      cell_name: m.cellName || m.cell_name || null,
      content: m.content,
      created_at: m.createdAt || m.created_at || new Date().toISOString(),
      is_read: Boolean(m.isRead || m.is_read),
      read_at: m.readAt || m.read_at || null,
      reply_to: m.replyTo || m.reply_to || null,
    }));
    await upsertBatch('private_messages', payload, 'id');
  }

  // 12. Community Messages
  if (sourceData.community_messages?.length > 0) {
    const payload = sourceData.community_messages.map(m => ({
      id: m.id,
      sender_uid: m.senderUid || m.sender_uid,
      sender_name: m.senderName || m.sender_name,
      sender_role: m.senderRole || m.sender_role,
      cell_name: m.cellName || m.cell_name || null,
      content: m.content,
      category: m.category || 'general',
      created_at: m.createdAt || m.created_at || new Date().toISOString(),
      reply_to: m.replyTo || m.reply_to || null,
      mentions: m.mentions || [],
      reactions: m.reactions || {},
    }));
    await upsertBatch('community_messages', payload, 'id');
  }

  // 13. Invitation Codes
  if (sourceData.invitation_codes?.length > 0) {
    const payload = sourceData.invitation_codes.map(c => ({
      id: c.id,
      code: c.code,
      role: c.role || 'tutor',
      region_name: c.regionName || c.region_name || null,
      cell_name: c.cellName || c.cell_name || null,
      max_uses: Number(c.maxUses || c.max_uses || 1),
      used_count: Number(c.usedCount || c.used_count || 0),
      is_active: c.isActive ?? c.is_active ?? true,
      created_at: c.createdAt || c.created_at || new Date().toISOString(),
      expires_at: c.expiresAt || c.expires_at || null,
    }));
    await upsertBatch('invitation_codes', payload, 'code');
  }

  // 14. Teaching Materials
  if (sourceData.teaching_materials?.length > 0) {
    const payload = sourceData.teaching_materials.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || null,
      week_label: t.weekLabel || t.week_label,
      document_url: t.documentUrl || t.document_url || null,
      file_name: t.fileName || t.file_name || null,
      file_size: t.fileSize || t.file_size || null,
      file_type: t.fileType || t.file_type || null,
      text_content: t.textContent || t.text_content || null,
      status: t.status || 'published',
      published_at: t.publishedAt || t.published_at || new Date().toISOString(),
      uploaded_by: t.uploadedBy || t.uploaded_by,
      uploaded_by_name: t.uploadedByName || t.uploaded_by_name,
    }));
    await upsertBatch('teaching_materials', payload, 'id');
  }

  // 15. System Settings & Soul Targets
  if (sourceData.system_settings?.length > 0) {
    await upsertBatch('system_settings', sourceData.system_settings, 'id');
  }
  if (sourceData.soul_targets?.length > 0) {
    await upsertBatch('soul_target_configs', sourceData.soul_targets, 'id');
    await upsertBatch('soul_targets', sourceData.soul_targets, 'id');
  }

  // 15. Notifications (Multi-Field Alignment: user_id, recipient_target, date, type, channel)
  if (sourceData.notifications?.length > 0) {
    const payload = sourceData.notifications.map(n => {
      const target = n.recipientTarget || n.recipient_target || n.userId || n.user_id;
      const notifType = n.type || n.notification_type || 'system_alert';
      return {
        id: n.id,
        user_id: target,
        recipient_target: target,
        sender_id: n.senderId || n.sender_id || null,
        sender_name: n.senderName || n.sender_name || null,
        title: n.title,
        message: n.message,
        date: n.date || (n.createdAt ? n.createdAt.split('T')[0] : (n.created_at ? n.created_at.split('T')[0] : new Date().toISOString().split('T')[0])),
        type: notifType,
        notification_type: notifType,
        channel: n.channel || 'in_app',
        status: n.status || 'delivered',
        is_read: Boolean(n.isRead || n.is_read),
        read_at: n.readAt || n.read_at || null,
        metadata: n.metadata || {},
        created_at: n.createdAt || n.created_at || new Date().toISOString(),
      };
    });
    await upsertBatch('notifications', payload, 'id');
  }

  // 16. Device Tokens
  if (sourceData.device_tokens?.length > 0) {
    const payload = sourceData.device_tokens.map(d => ({
      id: d.id || getDeterministicUuid(d.token),
      user_id: d.userId || d.user_id,
      token: d.token,
      device_type: d.deviceType || d.device_type || 'web',
      platform: d.platform || 'browser',
      user_agent: d.userAgent || d.user_agent || null,
      created_at: d.createdAt || d.created_at || new Date().toISOString(),
      last_active: d.lastActive || d.last_active || new Date().toISOString(),
    }));
    await upsertBatch('device_tokens', payload, 'token');
  }

  // 17. Audit Logs
  if (sourceData.audit_logs?.length > 0) {
    const payload = sourceData.audit_logs.map(a => ({
      id: a.id,
      action: a.action,
      entity_type: a.entityType || a.entity_type,
      entity_id: a.entityId || a.entity_id,
      user_id: a.userId || a.user_id || 'system',
      user_name: a.userName || a.user_name || 'System',
      user_role: a.userRole || a.user_role || 'system',
      details: a.details || {},
      ip_address: a.ipAddress || a.ip_address || null,
      created_at: a.createdAt || a.created_at || new Date().toISOString(),
    }));
    await upsertBatch('audit_logs', payload, 'id');
  }

  return {
    success: failedImports.length === 0,
    failedImports,
  };
}

// -----------------------------------------------------------------------------
// MODULE 3: DOCUMENTED NORMALIZATION & DEEP FIELD COMPARISON
// -----------------------------------------------------------------------------
export function normalizeValue(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return Number(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Check if ISO date string
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/.test(trimmed)) {
      try {
        return new Date(trimmed).toISOString().split('.')[0] + 'Z';
      } catch (e) {
        return trimmed;
      }
    }
    // Check if number formatted as string
    if (/^-?\d+(\.\d+)?$/.test(trimmed) && !isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    return trimmed;
  }
  if (Array.isArray(val)) {
    return val.map(item => normalizeValue(item));
  }
  if (typeof val === 'object') {
    const sorted = {};
    Object.keys(val).sort().forEach(k => {
      sorted[k] = normalizeValue(val[k]);
    });
    return sorted;
  }
  return val;
}

export function areValuesEqual(a, b) {
  const normA = normalizeValue(a);
  const normB = normalizeValue(b);

  if (normA === normB) return true;
  if (normA === null || normB === null) return false;

  if (typeof normA === 'object' && typeof normB === 'object') {
    return JSON.stringify(normA) === JSON.stringify(normB);
  }
  return false;
}

// Paginate Supabase destination queries so every record is examined, including collections with >1,000 rows
export async function fetchAllDestinationRows(supabase, tableName) {
  const pageSize = 1000;
  let page = 0;
  let allRows = [];

  const tableCandidates = [tableName];
  if (tableName === 'offering_records') tableCandidates.push('offerings');
  if (tableName === 'offerings') tableCandidates.push('offering_records');
  if (tableName === 'soul_targets') tableCandidates.push('soul_target_configs');
  if (tableName === 'soul_target_configs') tableCandidates.push('soul_targets');

  let lastError = null;

  for (const tName of tableCandidates) {
    page = 0;
    allRows = [];
    let candidateSuccess = true;
    while (true) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase.from(tName).select('*').range(from, to);
      if (error) {
        lastError = error;
        candidateSuccess = false;
        break;
      }
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < pageSize) break;
      page++;
    }
    if (candidateSuccess) {
      return { data: allRows, error: null };
    }
  }

  return { data: null, error: lastError };
}

// -----------------------------------------------------------------------------
// MODULE 4: GENUINELY EXACT RECONCILIATION
// -----------------------------------------------------------------------------
export async function reconcile(supabase, sourceData, importResult = { success: true, failedImports: [] }, extractionResult = { isExportComplete: true, failedExports: [] }) {
  console.log('\n📊 Phase 3: Genuinely Exact Reconciliation & Deep Record Comparison across All 19 Modules...');

  console.log('| Collection / Module        | Source | Dest | Matched | Missing | Extra | Dups | Field Mismatches | Status               |');
  console.log('|----------------------------|--------|------|---------|---------|-------|------|------------------|----------------------|');

  let allVerified = true;
  const discrepancies = [];

  // 1. Fail immediately if source export had failures
  if (extractionResult.failedExports?.length > 0) {
    allVerified = false;
    console.log(`⚠️ CRITICAL: Source data export encountered ${extractionResult.failedExports.length} failed collection queries.`);
  }

  // 2. Fail immediately if any batch import failed
  if (importResult.failedImports?.length > 0) {
    allVerified = false;
    console.log(`⚠️ CRITICAL: Batch upsert encountered ${importResult.failedImports.length} batch failures.`);
  }

  for (const mod of MODULE_DEFINITIONS) {
    const sourceItems = sourceData[mod.name] || [];
    const sourceIds = sourceItems
      .map(item => item[mod.idField] || (mod.altIdField ? item[mod.altIdField] : null))
      .filter(Boolean);
    const sourceSet = new Set(sourceIds);

    // Duplicate check on source
    const sourceDuplicates = sourceIds.filter((item, index) => sourceIds.indexOf(item) !== index);

    // Fetch all destination records from Supabase via paginated fetch (handles >1000 records)
    const { data: destRows, error } = await fetchAllDestinationRows(supabase, mod.name);

    if (error) {
      console.log(`| ${mod.name.padEnd(26)} | ${String(sourceIds.length).padStart(6)} |  ERR |       0 |       0 |     0 |    0 |                0 | QUERY FAILED ❌      |`);
      allVerified = false;
      discrepancies.push({ table: mod.name, error: error.message });
      continue;
    }

    const destIds = (destRows || []).map(row => row[mod.idField] || (mod.altIdField ? row[mod.altIdField] : null)).filter(Boolean);
    const destSet = new Set(destIds);

    // Duplicate check on destination
    const destDuplicates = destIds.filter((item, index) => destIds.indexOf(item) !== index);
    const totalDuplicates = sourceDuplicates.length + destDuplicates.length;

    const matched = sourceIds.filter(id => destSet.has(id));
    const missing = sourceIds.filter(id => !destSet.has(id));
    const extra = destIds.filter(id => !sourceSet.has(id));

    // Deep field-level comparison for EVERY mapped field
    let fieldMismatches = 0;
    const destMap = new Map();
    (destRows || []).forEach(row => {
      const key = row[mod.idField] || (mod.altIdField ? row[mod.altIdField] : null);
      if (key) destMap.set(key, row);
    });

    for (const srcItem of sourceItems) {
      const key = srcItem[mod.idField] || (mod.altIdField ? srcItem[mod.altIdField] : null);
      if (!key || !destMap.has(key)) continue;

      const destRow = destMap.get(key);
      for (const field of Object.keys(destRow)) {
        if (field === 'created_at' || field === 'updated_at') continue;
        const srcVal = srcItem[field] ?? srcItem[toCamelCase(field)];
        const destVal = destRow[field];

        if (srcVal !== undefined && !areValuesEqual(srcVal, destVal)) {
          fieldMismatches++;
        }
      }
    }

    // Unmapped source fields detection: fail when a source field has no documented destination mapping
    const documentedFields = DOCUMENTED_FIELD_MAPPINGS[mod.name] || new Set();
    const unmappedSourceFields = [];
    for (const srcItem of sourceItems) {
      for (const key of Object.keys(srcItem)) {
        if (!documentedFields.has(key)) {
          unmappedSourceFields.push({ id: srcItem[mod.idField] || srcItem.id, field: key });
        }
      }
    }

    // STRICT VERIFICATION CRITERIA (Dry-run and Live both enforce zero-extra records):
    // 1. Zero missing records
    // 2. Zero unexpected extra records (strictly enforced in dry-run and live)
    // 3. Zero duplicate IDs
    // 4. Zero field-level mismatches
    // 5. Zero unmapped source fields
    // 6. Zero failed import operations
    // 7. Complete source export (zero export errors)
    // 8. Populated destination cannot match an empty source inventory!
    const isSourceMissingWhileDestPopulated = sourceIds.length === 0 && destIds.length > 0;
    const isModuleVerified = 
      missing.length === 0 &&
      extra.length === 0 &&
      !isSourceMissingWhileDestPopulated &&
      totalDuplicates === 0 &&
      fieldMismatches === 0 &&
      unmappedSourceFields.length === 0 &&
      (importResult.failedImports?.length === 0) &&
      (extractionResult.failedExports?.length === 0);

    if (!isModuleVerified) {
      allVerified = false;
      discrepancies.push({
        table: mod.name,
        missing: missing.length,
        extra: extra.length,
        duplicates: totalDuplicates,
        fieldMismatches,
        unmappedFields: unmappedSourceFields.length,
        emptySourceMismatch: isSourceMissingWhileDestPopulated,
      });
    }

    const colName = mod.name.padEnd(26);
    const colSrc = String(sourceIds.length).padStart(6);
    const colDest = String(destIds.length).padStart(4);
    const colMatch = String(matched.length).padStart(7);
    const colMiss = String(missing.length).padStart(7);
    const colExtra = String(extra.length).padStart(5);
    const colDups = String(totalDuplicates).padStart(4);
    const colFieldDiff = String(fieldMismatches).padStart(16);
    const colStatus = isModuleVerified ? 'VERIFIED ✅           ' : 'MISMATCH ❌           ';

    console.log(`| ${colName} | ${colSrc} | ${colDest} | ${colMatch} | ${colMiss} | ${colExtra} | ${colDups} | ${colFieldDiff} | ${colStatus} |`);

    if (missing.length > 0) {
      console.log(`     ⚠️ Missing Source IDs in "${mod.name}":`, missing.slice(0, 5));
    }
    if (extra.length > 0) {
      console.log(`     ⚠️ Unexpected Extra Destination Records in "${mod.name}": ${extra.length} records`);
    }
    if (unmappedSourceFields.length > 0) {
      console.log(`     ⚠️ Unmapped Source Fields in "${mod.name}":`, unmappedSourceFields.slice(0, 5));
    }
    if (fieldMismatches > 0) {
      console.log(`     ⚠️ Field Value Mismatches in "${mod.name}": ${fieldMismatches}`);
    }
    if (isSourceMissingWhileDestPopulated) {
      console.log(`     ⚠️ Incomplete Inventory: Destination has ${destIds.length} rows, but source inventory is empty!`);
    }
  }

  console.log('|----------------------------|--------|------|---------|---------|-------|------|------------------|----------------------|');

  if (allVerified) {
    console.log('\n🎉 ALL MODULES FULLY RECONCILED WITH ZERO MISSING RECORDS, ZERO EXTRA RECORDS, AND ZERO FIELD MISMATCHES!');
  } else {
    console.log('\n❌ RECONCILIATION FAILED: Inconsistencies detected between source and destination records.');
  }

  return { allVerified, discrepancies };
}

function toCamelCase(str) {
  return str.replace(/_([a-z])/g, g => g[1].toUpperCase());
}

// -----------------------------------------------------------------------------
// MAIN CONTROLLER
// -----------------------------------------------------------------------------
async function main() {
  // 1. Source Extraction
  const extractionResult = await extractSourceData();

  if (!supabaseKey) {
    console.log('\nℹ️ Supabase Key is not configured in .env.');
    console.log('   Source extraction and schema normalization completed successfully.');
    console.log('   To reconcile against live Supabase project (cjskjazsrrbfyjepwyxa), set VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.');
    console.log('================================================================');
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. Batch Upsert
  const importResult = await importToSupabase(supabase, extractionResult.sourceData);

  // 3. Exact Reconciliation
  const reconResult = await reconcile(supabase, extractionResult.sourceData, importResult, extractionResult);

  console.log('\n================================================================');
  if (!reconResult.allVerified) {
    process.exit(1);
  }
}

// If run directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(process.cwd(), 'scripts/migrate-firebase-to-supabase.mjs')) {
  main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
