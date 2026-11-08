# FNI Cells Connect — Safe Supabase Migration Plan

## Non-negotiable safety rules

- Firebase remains enabled and is the live fallback until every replacement has been verified.
- Do not delete Firestore collections, Firebase Auth users, Cloud Functions, Firebase project configuration, or local-storage compatibility paths during the migration.
- Do not reset, overwrite, or bulk-import production records until a verified export and reconciliation report exist.
- Preserve existing FNI profile IDs and cell IDs as legacy/application identifiers. Do not assume Firebase UIDs and Supabase Auth UUIDs are interchangeable.
- Never copy password hashes into client-readable tables. Password recovery must use verified identity ownership and Supabase Auth flows; matching email addresses alone are not proof of account ownership.
- Keep all changes on this migration branch until reviewed and tested.

## Confirmed source-code inventory (initial audit)

The current application still imports and uses Firebase Auth, Firestore, Cloud Functions, and Firebase Messaging. The Supabase client exists in `src/lib/supabase.ts`, but the inspected auth and data services do not yet use it as their primary store.

Observed Firestore collections/references include:
- `profiles` and `users` — profile records.
- `internal_tutor_auth` — private tutor credential records written by the Firebase callable registration flow.
- `cells` — fellowship/cell records.
- `cellMeetingReports` — meeting reports.
- `notifications` — notification records.

The inspected reporting service also maintains local fallback data for meeting reports, evangelism reports, legacy reports, regions, reporting periods, and audit logs. The notification and cell services also contain local-storage fallback paths. The complete collection inventory must be established by scanning every Firestore service and Cloud Function before any schema is finalized.

## Supabase project audit

- Project: `FNI-Cells-Connect` (`cjskjazsrrbfyjepwyxa`)
- Status at audit: active and healthy.
- Region: `eu-west-3`.
- Public schema at audit: no tables and no recorded migrations.
- Edge Functions at audit: none.
- Security advisor found a public SECURITY DEFINER function `public.rls_auto_enable()` executable by anon and authenticated roles. Review and restrict this function before exposing the database API. Do not blindly run it or drop it until its origin and purpose are understood.

## Migration phases

### 1. Complete inventory and backup
- Inventory every Firestore collection, Cloud Function, Storage bucket/path, Auth provider, scheduled task, messaging function, and local-storage key.
- Determine which Firebase resources are production and which are demo/test.
- Export Firestore documents and metadata, Firebase Auth user metadata, and Storage object listings/files where applicable.
- Store exports securely outside the public repository. Never commit credentials, private keys, service-account JSON, password material, or personal member exports to GitHub.
- Record counts and stable identifiers, and create a reconciliation report.

### 2. Design the Supabase schema
Design normalized tables for profiles, cells, regions, reporting periods, meeting reports, evangelism reports, follow-ups/contacts, notifications, audit events, and any additional entities discovered in the inventory.
- Use UUIDs for Supabase Auth identities, with explicit legacy Firebase UID/application ID columns for mapping.
- Add foreign keys, indexes, timestamps, status constraints, and Row Level Security policies.
- Keep private auth/security metadata out of public tables.
- Generate TypeScript database types and review RLS policies before client integration.

### 3. Build a compatibility layer
- Add Supabase repositories/services alongside existing Firebase services.
- Add explicit feature flags and read-only comparison mode.
- Initially read from Firebase and compare counts/records against staged Supabase imports.
- Do not dual-write until idempotency, rollback behavior, and conflict handling are tested.
- Preserve existing service interfaces where practical to avoid breaking screens.

### 4. Identity migration and account recovery
- Map each existing FNI profile to a verified Supabase Auth identity.
- Firebase custom-token accounts and legacy PBKDF2 credential records require a deliberate migration/recovery strategy; they cannot be assumed to be directly importable as Supabase Auth passwords.
- Verify ownership through a real email/phone or an administrator-approved recovery process before linking Google/Apple identities.
- Start with Google if provider credentials are available. Apple sign-in requires Apple developer-side configuration.
- Keep Firebase login working until each account cohort has a tested migration path.

### 5. Data migration and verification
- Import in dependency order (regions/cells/profiles, periods, reports, follow-ups, notifications, audit records, then related data).
- Use idempotent scripts and stable legacy IDs.
- Compare source and destination counts, key fields, relationships, and sample records.
- Record rejected/duplicate/orphan rows for manual resolution; never silently discard them.

### 6. Gradual cutover and rollback
- Move one feature at a time behind a feature flag.
- Test tutor/admin/super-admin permissions, registration, login, recovery, reports, cell management, notifications, file access, and mobile behavior.
- Keep Firebase exports and the live Firebase services available through the agreed observation period.
- Only decommission an individual Firebase service after explicit verification and a restorable backup.

## Current next action

Finish the repository-wide inventory of Firestore usage, Cloud Functions, Storage, messaging, local-storage keys, and role/permission checks. Then prepare a reviewed schema migration file. No production data or Firebase resources have been changed by this audit.
