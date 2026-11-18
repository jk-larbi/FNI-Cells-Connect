-- =========================================================================
-- FNI CELLS CONNECT: TELEGRAM / WHATSAPP GROUP SETTINGS & CUSTOM STICKERS
-- =========================================================================

-- 1. EXTEND COMMUNITY GROUPS TABLE WITH TELEGRAM/WHATSAPP SETTINGS
alter table public.community_groups
  add column if not exists permissions jsonb not null default '{
    "send_messages": "all",
    "send_media": "all",
    "send_docs": "all",
    "send_links": "all",
    "add_members": "all",
    "edit_group_info": "admins",
    "pin_messages": "admins_mods",
    "start_calls": "all"
  }'::jsonb,
  add column if not exists announcement_mode boolean not null default false,
  add column if not exists invite_code text default 'fni-community-fellowship',
  add column if not exists require_approval boolean not null default false,
  add column if not exists disappearing_messages text not null default 'off',
  add column if not exists meeting_schedule text default 'Sunday 5:00 PM GMT • Midweek Wednesday 6:30 PM',
  add column if not exists meeting_location text default 'FNI Main Sanctuary & Online Fellowship',
  add column if not exists oversight_contact text default 'FNI Leadership Directorate';

-- Update community_groups policies so admins and authorized moderators can update
drop policy if exists community_groups_update_policy on public.community_groups;
create policy community_groups_update_policy on public.community_groups
  for update to authenticated
  using (
    private.is_fni_admin()
    or exists (
      select 1 from public.community_group_members m
      where m.group_id = community_groups.id
        and m.user_id = (select auth.uid())::text
        and m.role in ('admin', 'moderator')
        and m.is_active = true
    )
  )
  with check (
    private.is_fni_admin()
    or exists (
      select 1 from public.community_group_members m
      where m.group_id = community_groups.id
        and m.user_id = (select auth.uid())::text
        and m.role in ('admin', 'moderator')
        and m.is_active = true
    )
  );

-- 2. USER GROUP PREFERENCES (Personal Mute, Mention notifications)
create table if not exists public.user_group_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  group_id text not null,
  is_muted boolean not null default false,
  muted_until timestamptz,
  notify_mentions boolean not null default true,
  notify_announcements boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint user_group_preferences_user_group_key unique (user_id, group_id)
);

create index if not exists idx_user_group_preferences_user_group
  on public.user_group_preferences (user_id, group_id);

alter table public.user_group_preferences enable row level security;
grant select, insert, update, delete on public.user_group_preferences to authenticated;

drop policy if exists user_group_preferences_select on public.user_group_preferences;
create policy user_group_preferences_select on public.user_group_preferences
  for select to authenticated using (user_id = (select auth.uid())::text);

drop policy if exists user_group_preferences_insert on public.user_group_preferences;
create policy user_group_preferences_insert on public.user_group_preferences
  for insert to authenticated with check (user_id = (select auth.uid())::text);

drop policy if exists user_group_preferences_update on public.user_group_preferences;
create policy user_group_preferences_update on public.user_group_preferences
  for update to authenticated using (user_id = (select auth.uid())::text);

drop policy if exists user_group_preferences_delete on public.user_group_preferences;
create policy user_group_preferences_delete on public.user_group_preferences
  for delete to authenticated using (user_id = (select auth.uid())::text);


-- 3. USER CUSTOM STICKERS & FAVORITES
create table if not exists public.user_custom_stickers (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  sticker_type text not null default 'custom', -- 'custom' | 'favorite' | 'recent'
  image_url text,
  emoji text,
  label text not null,
  usage_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_custom_stickers_user_type
  on public.user_custom_stickers (user_id, sticker_type);

alter table public.user_custom_stickers enable row level security;
grant select, insert, update, delete on public.user_custom_stickers to authenticated;

drop policy if exists user_custom_stickers_select on public.user_custom_stickers;
create policy user_custom_stickers_select on public.user_custom_stickers
  for select to authenticated using (user_id = (select auth.uid())::text);

drop policy if exists user_custom_stickers_insert on public.user_custom_stickers;
create policy user_custom_stickers_insert on public.user_custom_stickers
  for insert to authenticated with check (user_id = (select auth.uid())::text);

drop policy if exists user_custom_stickers_update on public.user_custom_stickers;
create policy user_custom_stickers_update on public.user_custom_stickers
  for update to authenticated using (user_id = (select auth.uid())::text);

drop policy if exists user_custom_stickers_delete on public.user_custom_stickers;
create policy user_custom_stickers_delete on public.user_custom_stickers
  for delete to authenticated using (user_id = (select auth.uid())::text);


-- 4. REALTIME REPLICATION ENABLEMENT
do $$
begin
  execute 'alter publication supabase_realtime add table public.user_group_preferences';
exception when others then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.user_custom_stickers';
exception when others then null;
end $$;
