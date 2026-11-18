-- =========================================================================
-- FNI CELLS CONNECT: TELEGRAM-INSPIRED MESSAGING UPGRADE MIGRATION
-- =========================================================================

-- 1. USER-SPECIFIC PINNED CHATS (Personal conversation ordering)
create table if not exists public.user_pinned_chats (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  chat_id text not null,
  order_index integer not null default 0,
  pinned_at timestamptz not null default now(),
  constraint user_pinned_chats_user_chat_key unique (user_id, chat_id)
);

create index if not exists idx_user_pinned_chats_user_order 
  on public.user_pinned_chats (user_id, order_index asc);

alter table public.user_pinned_chats enable row level security;
grant select, insert, update, delete on public.user_pinned_chats to authenticated;

drop policy if exists user_pinned_chats_select on public.user_pinned_chats;
create policy user_pinned_chats_select on public.user_pinned_chats
  for select to authenticated using (user_id = (select auth.uid())::text);

drop policy if exists user_pinned_chats_insert on public.user_pinned_chats;
create policy user_pinned_chats_insert on public.user_pinned_chats
  for insert to authenticated with check (user_id = (select auth.uid())::text);

drop policy if exists user_pinned_chats_update on public.user_pinned_chats;
create policy user_pinned_chats_update on public.user_pinned_chats
  for update to authenticated using (user_id = (select auth.uid())::text);

drop policy if exists user_pinned_chats_delete on public.user_pinned_chats;
create policy user_pinned_chats_delete on public.user_pinned_chats
  for delete to authenticated using (user_id = (select auth.uid())::text);


-- 2. MULTIPLE PINNED MESSAGES IN COMMUNITY & PRIVATE CONVERSATIONS
-- Drop single pinned unique index so multiple messages can be pinned
drop index if exists public.community_messages_one_pinned_idx;

alter table public.community_messages
  add column if not exists pinned_by_name text,
  add column if not exists pinned_notify boolean not null default false;

alter table public.private_messages
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by text,
  add column if not exists pinned_by_name text,
  add column if not exists pinned_notify boolean not null default false,
  add column if not exists mentions text[] default '{}'::text[],
  add column if not exists edited_at timestamptz;

-- Update set_community_message_pin to allow multiple pinned messages and optional notification
create or replace function public.set_community_message_pin(
  p_message_id text, 
  p_pinned boolean,
  p_notify boolean default false
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_user_name text;
begin
  select role::text, full_name into v_role, v_user_name
  from public.profiles
  where id = private.current_fni_profile_id() and is_active = true;

  if auth.uid() is null or v_role not in ('tutor', 'admin', 'super_admin', 'national_admin') then
    raise exception 'Only active FNI leaders and administrators can pin community messages';
  end if;

  if not p_pinned and v_role not in ('admin', 'super_admin', 'national_admin') then
    raise exception 'Only FNI administrators can remove community pins';
  end if;

  if p_pinned then
    update public.community_messages
    set is_pinned = true, 
        pinned_at = now(), 
        pinned_by = auth.uid()::text,
        pinned_by_name = coalesce(v_user_name, 'FNI Leader'),
        pinned_notify = p_notify
    where id = p_message_id and deleted_for_everyone_at is null;

    if not found then
      raise exception 'Community message not found or already deleted';
    end if;
  else
    update public.community_messages
    set is_pinned = false, 
        pinned_at = null, 
        pinned_by = null,
        pinned_by_name = null,
        pinned_notify = false
    where id = p_message_id;

    if not found then
      raise exception 'Community message not found';
    end if;
  end if;
end;
$$;

revoke all on function public.set_community_message_pin(text, boolean, boolean) from public;
grant execute on function public.set_community_message_pin(text, boolean, boolean) to authenticated;

-- Function for private chat message pin
create or replace function public.set_private_message_pin(
  p_message_id text,
  p_pinned boolean
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_name text;
  v_sender text;
  v_recipient text;
begin
  select sender_uid, recipient_uid into v_sender, v_recipient
  from public.private_messages
  where id = p_message_id;

  if v_sender is null then
    raise exception 'Private message not found';
  end if;

  if private.current_fni_profile_id() <> v_sender and private.current_fni_profile_id() <> v_recipient and not private.is_fni_admin() then
    raise exception 'Not authorized to pin this message';
  end if;

  select full_name into v_user_name from public.profiles where id = auth.uid()::text;

  if p_pinned then
    update public.private_messages
    set is_pinned = true,
        pinned_at = now(),
        pinned_by = auth.uid()::text,
        pinned_by_name = coalesce(v_user_name, 'Participant')
    where id = p_message_id;
  else
    update public.private_messages
    set is_pinned = false,
        pinned_at = null,
        pinned_by = null,
        pinned_by_name = null
    where id = p_message_id;
  end if;
end;
$$;

revoke all on function public.set_private_message_pin(text, boolean) from public;
grant execute on function public.set_private_message_pin(text, boolean) to authenticated;


-- 3. MESSAGE REACTIONS (1 active reaction per user per message)
-- Unique per (message_id, user_id)
alter table public.community_message_reactions
  drop constraint if exists community_message_reactions_unique;

alter table public.community_message_reactions
  add constraint community_message_reactions_user_unique unique (message_id, user_id);

alter table public.private_message_reactions
  drop constraint if exists private_message_reactions_unique;

alter table public.private_message_reactions
  add constraint private_message_reactions_user_unique unique (message_id, user_id);


-- 4. OFFICIAL FNI COMMUNITY GROUPS
create table if not exists public.community_groups (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text,
  avatar_url text,
  category text default 'general',
  is_official boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_groups enable row level security;
grant select on public.community_groups to authenticated;
grant insert, update, delete on public.community_groups to authenticated;

drop policy if exists community_groups_read_all on public.community_groups;
create policy community_groups_read_all on public.community_groups
  for select to authenticated using (true);

drop policy if exists community_groups_admin_manage on public.community_groups;
create policy community_groups_admin_manage on public.community_groups
  for all to authenticated
  using (private.is_fni_admin())
  with check (private.is_fni_admin());

-- Seed default official group if absent
insert into public.community_groups (id, name, description, is_official, category)
values (
  'fni-community',
  'FNI Community',
  'Official community for active FNI tutors and leaders',
  true,
  'official'
)
on conflict (id) do update set is_official = true;

-- Members table
create table if not exists public.community_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.community_groups(id) on delete cascade,
  user_id text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint community_group_members_unique unique (group_id, user_id)
);

create index if not exists idx_community_group_members_user on public.community_group_members (user_id);
create index if not exists idx_community_group_members_group on public.community_group_members (group_id);

alter table public.community_group_members enable row level security;
grant select, insert, update on public.community_group_members to authenticated;

drop policy if exists community_group_members_select on public.community_group_members;
create policy community_group_members_select on public.community_group_members
  for select to authenticated using (true);

drop policy if exists community_group_members_admin on public.community_group_members;
create policy community_group_members_admin on public.community_group_members
  for all to authenticated
  using (private.is_fni_admin())
  with check (private.is_fni_admin());

-- Audit History table for official group designation changes
create table if not exists public.official_community_group_history (
  id uuid primary key default gen_random_uuid(),
  previous_group_id text not null,
  previous_group_name text not null,
  new_group_id text not null,
  new_group_name text not null,
  changed_by_uid text not null,
  changed_by_name text not null,
  changed_at timestamptz not null default now(),
  reason text
);

alter table public.official_community_group_history enable row level security;
grant select on public.official_community_group_history to authenticated;
grant insert on public.official_community_group_history to authenticated;

drop policy if exists official_community_group_history_select on public.official_community_group_history;
create policy official_community_group_history_select on public.official_community_group_history
  for select to authenticated using (true);

drop policy if exists official_community_group_history_admin on public.official_community_group_history;
create policy official_community_group_history_admin on public.official_community_group_history
  for insert to authenticated with check (private.is_fni_admin());


-- 5. RPC PROCEDURE: DESIGNATE OFFICIAL COMMUNITY GROUP
create or replace function public.designate_official_community_group(
  p_new_group_id text,
  p_reason text default 'Administrative designation update'
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_admin_uid text;
  v_admin_name text;
  v_old_group_id text;
  v_old_group_name text;
  v_new_group_name text;
  v_enrolled_count integer := 0;
begin
  if private.current_fni_profile_id() is null or not private.is_fni_admin() then
    raise exception 'Only FNI system administrators can change the official community group designation.';
  end if;

  v_admin_uid := private.current_fni_profile_id();
  select full_name into v_admin_name from public.profiles where id = v_admin_uid;
  v_admin_name := coalesce(v_admin_name, 'System Administrator');

  -- Get current official group
  select id, name into v_old_group_id, v_old_group_name
  from public.community_groups
  where is_official = true
  limit 1;

  -- Get target group
  select name into v_new_group_name
  from public.community_groups
  where id = p_new_group_id;

  if v_new_group_name is null then
    raise exception 'Target group does not exist.';
  end if;

  if v_old_group_id = p_new_group_id then
    return jsonb_build_object(
      'success', true, 
      'message', 'Group is already the designated official community group',
      'groupId', p_new_group_id
    );
  end if;

  -- Log audit history
  insert into public.official_community_group_history (
    previous_group_id,
    previous_group_name,
    new_group_id,
    new_group_name,
    changed_by_uid,
    changed_by_name,
    reason
  ) values (
    coalesce(v_old_group_id, 'none'),
    coalesce(v_old_group_name, 'None'),
    p_new_group_id,
    v_new_group_name,
    v_admin_uid,
    v_admin_name,
    p_reason
  );

  -- Update official flags
  update public.community_groups set is_official = false where is_official = true;
  update public.community_groups set is_official = true, updated_at = now() where id = p_new_group_id;

  -- Automatically enroll all registered and active tutors into the newly designated group
  insert into public.community_group_members (group_id, user_id, role, is_active)
  select p_new_group_id, p.id, 
         case when p.role in ('admin', 'super_admin', 'national_admin') then 'admin' else 'member' end,
         true
  from public.profiles p
  where p.is_active = true and coalesce(p.is_test_account,false) is false and p.role::text in ('tutor', 'admin', 'super_admin', 'national_admin')
  on conflict (group_id, user_id) do update set is_active = true;

  get diagnostics v_enrolled_count = row_count;

  return jsonb_build_object(
    'success', true,
    'previousGroupId', v_old_group_id,
    'previousGroupName', v_old_group_name,
    'newGroupId', p_new_group_id,
    'newGroupName', v_new_group_name,
    'enrolledCount', v_enrolled_count
  );
end;
$$;

revoke all on function public.designate_official_community_group(text, text) from public;
grant execute on function public.designate_official_community_group(text, text) to authenticated;


-- 6. AUTOMATIC ENROLLMENT TRIGGER FOR NEW / ACTIVATED TUTORS
create or replace function public.auto_enroll_active_tutor_in_official_group()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_official_group_id text;
begin
  if NEW.is_active = true and coalesce(NEW.is_test_account,false) is false and NEW.role::text in ('tutor', 'admin', 'super_admin', 'national_admin') then
    select id into v_official_group_id
    from public.community_groups
    where is_official = true
    limit 1;

    if v_official_group_id is not null then
      insert into public.community_group_members (group_id, user_id, role, is_active)
      values (
        v_official_group_id, 
        NEW.id, 
        case when NEW.role in ('admin', 'super_admin', 'national_admin') then 'admin' else 'member' end, 
        true
      )
      on conflict (group_id, user_id) do update set is_active = true;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_auto_enroll_official_group on public.profiles;
create trigger trg_auto_enroll_official_group
  after insert or update of is_active, role, is_test_account on public.profiles
  for each row execute function public.auto_enroll_active_tutor_in_official_group();

-- Backfill all existing active tutors and leaders into the official group now
insert into public.community_group_members (group_id, user_id, role, is_active)
select 'fni-community', p.id,
       case when p.role in ('admin', 'super_admin', 'national_admin') then 'admin' else 'member' end,
       true
from public.profiles p
where p.is_active = true and coalesce(p.is_test_account,false) is false and p.role::text in ('tutor', 'admin', 'super_admin', 'national_admin')
on conflict (group_id, user_id) do update set is_active = true;


-- 7. REALTIME REPLICATION ENABLEMENT
do $$
begin
  execute 'alter publication supabase_realtime add table public.user_pinned_chats';
exception when others then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.community_groups';
exception when others then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.community_group_members';
exception when others then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.official_community_group_history';
exception when others then null;
end $$;
