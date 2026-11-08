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


## Expanded code inventory completed (repository `main` snapshot)

### Firestore collections identified in deployed rules and application code

- Identity/profile: `profiles`, `users`, `internal_tutor_auth`, `systemSecurity`.
- Ministry structure: `cells`, `regions`, `systemSettings`.
- Reports and review workflow: `cellMeetingReports`, `evangelismReports`, `cell_reports`, `report_reviews`, `reviewLogs`, `audit_logs`, `reportingPeriods`, `reporting_periods`.
- Follow-up: `evangelismContacts`, `followUps`.
- Communications: `privateMessages`, `communityMessages`, `communityMembers`, `invitationCodes`.
- Notifications and device registration: `notifications`, `deviceTokens`.
- Finance: `offerings`.

Some collections are identified from Firestore rules and Cloud Functions, while others are confirmed by client services. Actual production document counts and whether each collection currently contains records remain unverified.

### Firebase Cloud Functions identified

Callable functions:
- `registerTutor`, `loginTutor`, `loginAdmin`, `changeAdminPassword`.
- `registerDeviceToken`, `unregisterDeviceToken`.

Scheduled function:
- `checkWeeklyReportsDeadline`.

Firestore-triggered functions:
- `onCellMeetingReportCreated`, `onEvangelismReportCreated`.
- `onPrivateMessageCreated`, `onCommunityMessageCreated`.
- `onTeachingMaterialCreated`, `onReviewLogCreated`, `onCellCreated`.

These functions implement authentication/registration, deadline reminders, FCM device-token management, and notifications triggered by reports, messages, teaching materials, review logs, and new cells. Their behavior must be recreated and tested before any Firebase function is disabled.

### Client service inventory

Firebase-backed services observed:
- `authService.ts`: callable registration/login/admin security operations, Firestore profile and cell writes, and local profile/session/credential fallback.
- `cellService.ts`: cell reads and writes, plus local cache/fallback.
- `reportService.ts`: meeting and evangelism reports, reporting periods, review logs, with local fallback stores.
- `followUpService.ts`: evangelism contacts and follow-ups, with local fallback.
- `notificationService.ts`: notification writes, read-state updates and realtime Firestore subscription, with local fallback.
- `messagingService.ts`: private/community messages, invitation codes, community membership, with local fallback.
- `financeService.ts`: offerings, with local fallback.
- `pushNotificationService.ts`: FCM token registration/removal and local notification preferences/device-token fallback.
- `firebase.ts` / `firebaseService.ts`: Firebase initialization and shared data operations.
- `NotificationContext.tsx`: app notification state integration.

Other service modules include analytics, settings, soul targets, and teaching materials; their full persistence paths should be checked during implementation.

### Firebase configuration and security assets

- `firebase.json` configures Firebase Hosting, Firestore rules, and Cloud Functions.
- `firestore.rules` contains role-aware access rules for the collections listed above. These rules are a key source for designing equivalent Supabase Row Level Security policies; do not translate them mechanically without reviewing role semantics.
- `public/firebase-messaging-sw.js` and FCM client code support web push notifications.
- `.env.example` documents Firebase web configuration. No Firebase service-account secret should be placed in the repository.
- No Firebase Storage bucket/rules configuration was found in `firebase.json`. Profile-photo upload currently processes images into data URLs through the uploader callback; inspect the profile persistence path before deciding whether Supabase Storage is required.
- `firebase.json` currently has no Storage rules entry.

### Supabase security finding — action taken

The Supabase security advisor reported that `public.rls_auto_enable()` (a SECURITY DEFINER event-trigger function used by the `ensure_rls` DDL event trigger) was executable by `anon` and `authenticated`. Inspection confirmed its purpose is to enable RLS on newly created public tables. We preserved the function and its event trigger, but revoked direct execution from `PUBLIC`, `anon`, and `authenticated`. This does not remove the event trigger; PostgreSQL invokes its trigger function through the DDL event mechanism. Re-run the Supabase security advisor after the change to confirm the warning is cleared.

### Not yet verified — requires Firebase Console/export access

The GitHub repository cannot reveal live Firebase production data or console configuration. The following require a Firebase Admin export or project-console inspection:
- Exact Firebase project ID used by the live deployment and whether it matches the project referenced by the deployed app.
- Auth user count, providers enabled, verified email/phone coverage, and user metadata.
- Firestore collection document counts, nested subcollections, document IDs, timestamps, and actual production contents.
- Cloud Functions deployed versions, regions, runtime, schedules, environment configuration, and invocation status.
- FCM registered device tokens and delivery health.
- Whether Firebase Storage contains any objects, even though no Storage integration was found in the repository snapshot.
- Firebase Hosting deployment target and live environment variables.

Do not treat source-code collection names as proof that a live collection exists or contains data.


## Current next action

Finish the repository-wide inventory of Firestore usage, Cloud Functions, Storage, messaging, local-storage keys, and role/permission checks. Then prepare a reviewed schema migration file. No production data or Firebase resources have been changed by this audit.
