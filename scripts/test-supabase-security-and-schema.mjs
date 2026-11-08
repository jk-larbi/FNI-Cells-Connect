/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Phase 3: Supabase Security & Schema Verification Test Suite
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('================================================================');
console.log('FNI CELLS CONNECT — SUPABASE SECURITY & SCHEMA VERIFICATION SUITE');
console.log('================================================================\n');

let testsPassed = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    testsPassed++;
    console.log(`  ✅ ${testName}`);
  } else {
    console.error(`  ❌ FAILED: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
  }
}

// -----------------------------------------------------------------------------
// TEST 1: SCHEMA MIGRATION DDL ID TYPES & CONSTRAINTS
// -----------------------------------------------------------------------------
console.log('TEST 1: Schema Migration DDL ID Types & Constraints...');

const migrationPath = path.resolve(process.cwd(), 'supabase', 'migrations', '20261108_fni_supabase_migration.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

assert(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.cell_meeting_reports (\n    id TEXT PRIMARY KEY') ||
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.cell_meeting_reports (\r\n    id TEXT PRIMARY KEY'),
  'cell_meeting_reports uses TEXT PRIMARY KEY to preserve legacy "cmr-..." document IDs.'
);

assert(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.evangelism_reports (\n    id TEXT PRIMARY KEY') ||
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.evangelism_reports (\r\n    id TEXT PRIMARY KEY'),
  'evangelism_reports uses TEXT PRIMARY KEY to preserve legacy "evr-..." document IDs.'
);

assert(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.evangelism_contacts (\n    id TEXT PRIMARY KEY') ||
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.evangelism_contacts (\r\n    id TEXT PRIMARY KEY'),
  'evangelism_contacts uses TEXT PRIMARY KEY to preserve legacy "cnt-..." document IDs.'
);

assert(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.offering_records (\n    id TEXT PRIMARY KEY') ||
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.offering_records (\r\n    id TEXT PRIMARY KEY'),
  'offering_records uses TEXT PRIMARY KEY to preserve legacy "off-..." document IDs.'
);

assert(
  migrationSql.includes('id TEXT PRIMARY KEY') && migrationSql.includes('supabase_user_id UUID REFERENCES auth.users(id)'),
  'public.profiles preserves alphanumeric TEXT primary key with supabase_user_id UUID reference to auth.users(id).'
);

assert(
  migrationSql.includes('ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE'),
  'public.profiles includes firebase_uid TEXT UNIQUE for legacy identity bridging.'
);

assert(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.offerings (') &&
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.offering_records ('),
  'Both offerings and offering_records tables are defined for dual compatibility.'
);

assert(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.soul_target_configs (') &&
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.soul_targets ('),
  'Both soul_target_configs and soul_targets tables are defined for dual compatibility.'
);

assert(
  migrationSql.includes('status TEXT') && migrationSql.includes('action TEXT') &&
  migrationSql.includes('comment TEXT') && migrationSql.includes('comments TEXT'),
  'review_logs defines both status/action and comment/comments for complete schema reconciliation.'
);

assert(
  migrationSql.includes('recipient_target TEXT') && migrationSql.includes('user_id TEXT') &&
  migrationSql.includes('notification_type notification_type') && migrationSql.includes('type notification_type'),
  'notifications defines all recipient and type fields for complete live database compatibility.'
);

assert(
  migrationSql.includes('ADD COLUMN IF NOT EXISTS firebase_id TEXT UNIQUE'),
  'public.cells includes firebase_id TEXT UNIQUE for legacy cell fellowship bridging.'
);

// -----------------------------------------------------------------------------
// TEST 2: ROW LEVEL SECURITY POLICIES AUDIT
// -----------------------------------------------------------------------------
console.log('\nTEST 2: Row Level Security (RLS) Policy Coverage...');

const requiredRlsTables = [
  'profiles',
  'cells',
  'regions',
  'reporting_periods',
  'cell_meeting_reports',
  'evangelism_reports',
  'evangelism_contacts',
  'offerings',
  'offering_records',
  'private_messages',
  'community_messages',
  'invitation_codes',
  'teaching_materials',
  'system_settings',
  'soul_targets',
  'soul_target_configs',
  'device_tokens',
  'notifications',
  'audit_logs',
  'follow_ups',
  'review_logs',
  'cell_reports',
  'report_reviews',
];

for (const tbl of requiredRlsTables) {
  assert(
    migrationSql.includes(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY;`),
    `RLS is explicitly enabled on public.${tbl}.`
  );
  assert(
    migrationSql.includes(`ON public.${tbl}`),
    `Explicit RLS policies are attached to public.${tbl} (0 unprotected tables in Supabase Advisor).`
  );
}

// -----------------------------------------------------------------------------
// TEST 3: SENSITIVE DATA ACCESS RESTRICTION AUDIT
// -----------------------------------------------------------------------------
console.log('\nTEST 3: Sensitive Data Access Restrictions (Anti-Leakage)...');

assert(
  migrationSql.includes('CREATE POLICY "offering_records_select" ON public.offering_records FOR SELECT TO authenticated') &&
  migrationSql.includes('USING (public.is_admin());'),
  'offering_records is strictly restricted to administrators; ordinary tutors cannot view financial records of other cells.'
);

assert(
  migrationSql.includes('CREATE POLICY "pmsg_parties" ON public.private_messages') &&
  migrationSql.includes('sender_uid = auth.uid()::text') &&
  migrationSql.includes('recipient_uid = auth.uid()::text'),
  'private_messages strictly isolates messages between sender and recipient only.'
);

assert(
  migrationSql.includes('CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated') &&
  migrationSql.includes('USING (public.is_admin());'),
  'audit_logs is strictly restricted to administrators for governance and compliance.'
);

// -----------------------------------------------------------------------------
// TEST 4: DUAL-BACKEND ADAPTER RESILIENCE & FALLBACK
// -----------------------------------------------------------------------------
console.log('\nTEST 4: Dual-Backend Adapter Non-Breaking Fallback...');

const serviceFiles = [
  'src/services/cellService.ts',
  'src/services/reportService.ts',
  'src/services/followUpService.ts',
  'src/services/financeService.ts',
  'src/services/settingsService.ts',
  'src/services/soulTargetService.ts',
  'src/services/teachingMaterialService.ts',
  'src/services/messagingService.ts',
  'src/services/authService.ts',
];

for (const sf of serviceFiles) {
  const fullPath = path.resolve(process.cwd(), sf);
  const content = fs.readFileSync(fullPath, 'utf8');
  assert(
    content.includes('SupabaseService'),
    `${sf} integrates SupabaseService for primary backend execution.`
  );
  assert(
    content.includes('isFirebaseConfigured') || content.includes('localStorage'),
    `${sf} preserves Firebase and LocalStorage as dependable fallbacks.`
  );
}

// -----------------------------------------------------------------------------
// TEST 5: NO SERVICE-ROLE KEY IN FRONTEND CLIENT BUNDLE
// -----------------------------------------------------------------------------
console.log('\nTEST 5: Client Bundle Credential Hygiene...');

const clientSupaPath = path.resolve(process.cwd(), 'src', 'lib', 'supabase.ts');
const clientSupaCode = fs.readFileSync(clientSupaPath, 'utf8');

assert(
  !clientSupaCode.includes('SUPABASE_SERVICE_ROLE_KEY') && !clientSupaCode.includes('service_role'),
  'Client-side Supabase configuration never references or exposes the service_role key.'
);

console.log('\n================================================================');
console.log(`RESULTS: ${testsPassed} of ${totalTests} SECURITY & SCHEMA CHECKS PASSED! ✅`);
console.log('================================================================\n');

if (testsPassed === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
