-- FNI Cells Connect: additive Supabase foundation.
-- This migration creates schema only. It does not import, alter, or delete Firebase data.
-- All public tables have RLS enabled and intentionally have NO client policies yet.
-- Application access must remain on Firebase until reviewed policies and services are implemented.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

-- Raw, lossless Firestore export staging. Kept outside exposed API schemas because
-- historical documents may contain private authentication/security metadata.
create table if not exists private.firebase_legacy_documents (
  id bigint generated always as identity primary key,
  source_project_id text not null,
  source_collection text not null,
  source_document_path text not null,
  source_document_id text not null,
  document_data jsonb not null,
  source_create_time timestamptz,
  source_update_time timestamptz,
  exported_at timestamptz not null default now(),
  imported_at timestamptz,
  migration_batch_id uuid,
  unique (source_project_id, source_document_path)
);
alter table private.firebase_legacy_documents enable row level security;
revoke all on private.firebase_legacy_documents from public, anon, authenticated;
grant select, insert, update on private.firebase_legacy_documents to service_role;
grant usage, select on sequence private.firebase_legacy_documents_id_seq to service_role;

-- Profiles retain the existing FNI application ID. Supabase Auth identity is
-- a separate nullable mapping so Firebase IDs are never silently replaced.
create table if not exists public.profiles (
  id text primary key,
  supabase_user_id uuid unique references auth.users(id) on delete set null,
  legacy_firebase_uid text unique,
  email text,
  full_name text not null,
  phone_number text,
  role text not null check (role in ('tutor','cell_leader','admin','super_admin','national_admin','regional_leader')),
  region_id text,
  region_name text,
  cell_id text,
  cell_name text,
  avatar_url text,
  is_active boolean not null default true,
  is_onboarded boolean not null default false,
  must_change_password boolean not null default false,
  auth_provider text check (auth_provider is null or auth_provider in ('google','apple','email','credentials','firebase')),
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.regions (
  id text primary key,
  name text not null,
  code text,
  country text,
  state_province text,
  leader_id text,
  leader_name text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cells (
  id text primary key,
  name text not null,
  normalized_name text,
  location text,
  meeting_location text,
  tutor_uid text,
  leader_id text,
  leader_name text,
  leader_phone text,
  code text,
  region_id text,
  region_name text,
  meeting_day text,
  meeting_time text,
  venue_address text,
  total_members integer,
  active_members integer,
  new_members integer,
  requiring_follow_up integer,
  target_attendance integer,
  status text,
  is_active boolean not null default true,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reporting_periods (
  id text primary key,
  name text not null,
  year integer,
  week_number integer,
  start_date date,
  end_date date,
  submission_deadline timestamptz,
  is_open boolean not null default true,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cell_meeting_reports (
  id text primary key,
  cell_id text not null,
  tutor_uid text not null,
  cell_name text,
  meeting_date date,
  meeting_location text,
  tutor_name text,
  members integer,
  active_members integer,
  attendance integer,
  new_members integer,
  absentees integer,
  follow_up_needed integer,
  offering numeric(14,2),
  scriptural_theme text,
  scriptures_used text,
  tutor_notes text,
  testimonies text,
  tutor_experience text,
  status text,
  submitted_at timestamptz,
  late boolean not null default false,
  reviewer_comment text,
  reviewed_by text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evangelism_reports (
  id text primary key,
  cell_id text not null,
  tutor_uid text not null,
  cell_name text,
  tutor_name text,
  report_date date,
  location text,
  team_members jsonb not null default '[]'::jsonb,
  pre_set_target integer,
  people_spoken_to integer,
  contacts_captured integer,
  conversions integer,
  verified_souls_won integer,
  interested_in_ministry integer,
  potential_follow_ups integer,
  scriptural_theme text,
  scriptures_used text,
  message_used text,
  notes text,
  testimonies text,
  status text,
  submitted_at timestamptz,
  late boolean not null default false,
  reviewer_comment text,
  reviewed_by text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evangelism_contacts (
  id text primary key,
  contact_name text,
  contact_details text,
  phone text,
  whatsapp_number text,
  email text,
  date_captured timestamptz,
  evangelism_report_id text,
  evangelism_location text,
  cell_id text not null,
  cell_name text,
  tutor_uid text,
  tutor_name text,
  assigned_to_name text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id text primary key,
  contact_id text,
  cell_id text,
  tutor_uid text,
  follow_up_status text,
  follow_up_notes text,
  last_follow_up_date timestamptz,
  next_follow_up_date timestamptz,
  history jsonb not null default '[]'::jsonb,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offerings (
  id text primary key,
  report_id text,
  cell_id text,
  cell_name text,
  tutor_uid text,
  tutor_name text,
  amount numeric(14,2) not null default 0,
  currency text not null default 'GHS',
  meeting_date date,
  week_label text,
  submitted_at timestamptz,
  status text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  user_id text not null,
  title text not null,
  message text not null,
  type text,
  channel text,
  target_tab text,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.private_messages (
  id text primary key,
  sender_uid text not null,
  sender_name text,
  sender_role text,
  recipient_uid text not null,
  recipient_name text,
  cell_id text,
  cell_name text,
  content text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  reply_to jsonb,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.community_messages (
  id text primary key,
  sender_uid text not null,
  sender_name text,
  sender_role text,
  cell_name text,
  content text not null,
  category text,
  reply_to jsonb,
  mentions jsonb not null default '[]'::jsonb,
  reactions jsonb not null default '{}'::jsonb,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  id text primary key,
  user_id text not null,
  cell_id text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.invitation_codes (
  id text primary key,
  code text not null unique,
  created_by text not null,
  created_by_name text,
  expires_at timestamptz,
  expiry_minutes integer,
  max_uses integer,
  used_count integer not null default 0,
  is_revoked boolean not null default false,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.teaching_materials (
  id text primary key,
  title text not null,
  description text,
  week_label text,
  document_url text,
  file_name text,
  file_size text,
  file_type text,
  text_content text,
  status text,
  published_at timestamptz,
  uploaded_by text,
  uploaded_by_name text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_logs (
  id text primary key,
  report_id text,
  report_type text,
  status text,
  comment text,
  reviewer_uid text,
  reviewer_name text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  user_id text,
  user_name text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  ip_address inet,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.device_tokens (
  id text primary key,
  user_id text not null,
  token text not null unique,
  role text,
  device text,
  platform text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  id text primary key,
  vision text,
  mission text,
  annual_soul_winning_target integer,
  weekly_deadline text,
  updated_by text,
  legacy_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.soul_target_configs (
  id text primary key,
  year integer not null,
  annual_target integer not null,
  updated_by text,
  audit_history jsonb not null default '[]'::jsonb,
  legacy_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Indexes for common dashboard, ownership, and inbox queries.
create index if not exists profiles_supabase_user_id_idx on public.profiles (supabase_user_id);
create index if not exists profiles_cell_id_idx on public.profiles (cell_id);
create index if not exists profiles_region_id_idx on public.profiles (region_id);
create index if not exists cells_region_id_idx on public.cells (region_id);
create index if not exists cells_tutor_uid_idx on public.cells (tutor_uid);
create index if not exists meeting_reports_cell_date_idx on public.cell_meeting_reports (cell_id, meeting_date desc);
create index if not exists meeting_reports_tutor_idx on public.cell_meeting_reports (tutor_uid);
create index if not exists evangelism_reports_cell_date_idx on public.evangelism_reports (cell_id, report_date desc);
create index if not exists evangelism_reports_tutor_idx on public.evangelism_reports (tutor_uid);
create index if not exists contacts_cell_id_idx on public.evangelism_contacts (cell_id);
create index if not exists follow_ups_next_date_idx on public.follow_ups (next_follow_up_date);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists private_messages_recipient_created_idx on public.private_messages (recipient_uid, created_at desc);
create index if not exists community_messages_created_idx on public.community_messages (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id);

-- Explicitly enable RLS on every application table. No policies are added yet:
-- this intentionally denies browser access until role-aware policies are reviewed.
alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.cells enable row level security;
alter table public.reporting_periods enable row level security;
alter table public.cell_meeting_reports enable row level security;
alter table public.evangelism_reports enable row level security;
alter table public.evangelism_contacts enable row level security;
alter table public.follow_ups enable row level security;
alter table public.offerings enable row level security;
alter table public.notifications enable row level security;
alter table public.private_messages enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_members enable row level security;
alter table public.invitation_codes enable row level security;
alter table public.teaching_materials enable row level security;
alter table public.review_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.device_tokens enable row level security;
alter table public.system_settings enable row level security;
alter table public.soul_target_configs enable row level security;

comment on schema private is 'Internal migration and sensitive legacy staging. Not exposed through the Supabase Data API.';
comment on table private.firebase_legacy_documents is 'Lossless staging of Firebase Firestore exports. Do not expose to client roles.';
comment on table public.profiles is 'FNI application profiles. id preserves the legacy FNI profile identifier; supabase_user_id maps to Supabase Auth separately.';

commit;
