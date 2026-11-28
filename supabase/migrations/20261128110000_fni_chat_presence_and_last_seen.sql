-- Real-time member availability and durable last-seen timestamps for FNI chat.
create table if not exists public.fni_user_presence (
  user_id text primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fni_user_presence enable row level security;

drop policy if exists "fni_presence_read_active_members" on public.fni_user_presence;
create policy "fni_presence_read_active_members"
on public.fni_user_presence for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = user_id and p.is_active is true
    and coalesce(p.is_test_account, false) is false
));

drop policy if exists "fni_presence_insert_own" on public.fni_user_presence;
create policy "fni_presence_insert_own"
on public.fni_user_presence for insert to authenticated
with check (exists (
  select 1 from public.profiles p
  where p.id = user_id and p.supabase_user_id = (select auth.uid())
    and p.is_active is true and coalesce(p.is_test_account, false) is false
));

drop policy if exists "fni_presence_update_own" on public.fni_user_presence;
create policy "fni_presence_update_own"
on public.fni_user_presence for update to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = user_id and p.supabase_user_id = (select auth.uid())
    and p.is_active is true and coalesce(p.is_test_account, false) is false
))
with check (exists (
  select 1 from public.profiles p
  where p.id = user_id and p.supabase_user_id = (select auth.uid())
    and p.is_active is true and coalesce(p.is_test_account, false) is false
));

grant select, insert, update on public.fni_user_presence to authenticated;

drop policy if exists "fni_authenticated_member_presence_read" on realtime.messages;
create policy "fni_authenticated_member_presence_read"
on realtime.messages for select to authenticated
using (
  extension = 'presence'
  and split_part(realtime.topic(), ':', 1) = 'fni-presence'
  and exists (
    select 1 from public.profiles p
    where p.supabase_user_id = (select auth.uid())
      and p.is_active is true and coalesce(p.is_test_account, false) is false
  )
);

drop policy if exists "fni_authenticated_member_presence_write" on realtime.messages;
create policy "fni_authenticated_member_presence_write"
on realtime.messages for insert to authenticated
with check (
  extension = 'presence'
  and split_part(realtime.topic(), ':', 1) = 'fni-presence'
  and exists (
    select 1 from public.profiles p
    where p.supabase_user_id = (select auth.uid())
      and p.is_active is true and coalesce(p.is_test_account, false) is false
  )
);

do $$
begin
  alter publication supabase_realtime add table public.fni_user_presence;
exception when duplicate_object then null;
end $$;
