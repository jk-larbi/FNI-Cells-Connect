create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_fni_profile_id()
returns text language sql stable security definer
set search_path = pg_catalog, public
as $$
  select p.id from public.profiles p
  where p.supabase_user_id = (select auth.uid())
    and p.is_active is true and coalesce(p.is_test_account,false) is false
  limit 1
$$;
create or replace function private.is_fni_admin()
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles p
    where p.supabase_user_id = (select auth.uid())
      and p.is_active is true and coalesce(p.is_test_account,false) is false
      and p.role in ('admin','super_admin','national_admin')
  )
$$;
create or replace function private.is_call_participant(p_session_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, private
as $$
  select exists (select 1 from public.call_participants cp
    where cp.session_id=p_session_id and cp.user_id=private.current_fni_profile_id())
$$;
create or replace function private.is_call_host(p_session_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, private
as $$
  select exists (select 1 from public.call_sessions cs
    where cs.id=p_session_id and cs.caller_id=private.current_fni_profile_id())
$$;

revoke all on function private.current_fni_profile_id() from public, anon;
revoke all on function private.is_fni_admin() from public, anon;
revoke all on function private.is_call_participant(uuid) from public, anon;
revoke all on function private.is_call_host(uuid) from public, anon;
grant execute on function private.current_fni_profile_id() to authenticated;
grant execute on function private.is_fni_admin() to authenticated;
grant execute on function private.is_call_participant(uuid) to authenticated;
grant execute on function private.is_call_host(uuid) to authenticated;

alter table public.call_sessions enable row level security;
alter table public.call_participants enable row level security;
alter table public.call_history enable row level security;
alter table public.call_blocked_users enable row level security;
alter table public.gallery_albums enable row level security;
alter table public.gallery_items enable row level security;

drop policy if exists "Users can view sessions they participate in" on public.call_sessions;
drop policy if exists "Authenticated users can create call sessions" on public.call_sessions;
drop policy if exists "Participants can update call sessions" on public.call_sessions;
drop policy if exists call_sessions_select_participants on public.call_sessions;
drop policy if exists call_sessions_insert_self on public.call_sessions;
drop policy if exists call_sessions_update_direct_participants on public.call_sessions;
create policy call_sessions_select_participants on public.call_sessions
for select to authenticated using (
  caller_id=(select private.current_fni_profile_id())
  or receiver_id=(select private.current_fni_profile_id())
  or (select private.is_call_participant(id))
);
create policy call_sessions_insert_self on public.call_sessions
for insert to authenticated with check (caller_id=(select private.current_fni_profile_id()));
create policy call_sessions_update_direct_participants on public.call_sessions
for update to authenticated
using (caller_id=(select private.current_fni_profile_id()) or receiver_id=(select private.current_fni_profile_id()))
with check (caller_id=(select private.current_fni_profile_id()) or receiver_id=(select private.current_fni_profile_id()));

drop policy if exists "Users can view call participants" on public.call_participants;
drop policy if exists "Users can join or update their participation" on public.call_participants;
drop policy if exists call_participants_select_same_session on public.call_participants;
drop policy if exists call_participants_insert_self_or_host on public.call_participants;
drop policy if exists call_participants_update_self_or_host on public.call_participants;
drop policy if exists call_participants_delete_self_or_host on public.call_participants;
create policy call_participants_select_same_session on public.call_participants
for select to authenticated using (
  user_id=(select private.current_fni_profile_id())
  or (select private.is_call_participant(session_id))
  or (select private.is_call_host(session_id))
);
create policy call_participants_insert_self_or_host on public.call_participants
for insert to authenticated with check (
  user_id=(select private.current_fni_profile_id()) or (select private.is_call_host(session_id))
);
create policy call_participants_update_self_or_host on public.call_participants
for update to authenticated
using (user_id=(select private.current_fni_profile_id()) or (select private.is_call_host(session_id)))
with check (user_id=(select private.current_fni_profile_id()) or (select private.is_call_host(session_id)));
create policy call_participants_delete_self_or_host on public.call_participants
for delete to authenticated using (
  user_id=(select private.current_fni_profile_id()) or (select private.is_call_host(session_id))
);

drop policy if exists "Users can view own call history" on public.call_history;
drop policy if exists "Users can insert own call history" on public.call_history;
drop policy if exists call_history_select_own on public.call_history;
drop policy if exists call_history_insert_own on public.call_history;
create policy call_history_select_own on public.call_history
for select to authenticated using (user_id=(select private.current_fni_profile_id()));
create policy call_history_insert_own on public.call_history
for insert to authenticated with check (user_id=(select private.current_fni_profile_id()));

drop policy if exists "Users can manage blocked users" on public.call_blocked_users;
drop policy if exists call_blocked_users_manage_own on public.call_blocked_users;
create policy call_blocked_users_manage_own on public.call_blocked_users
for all to authenticated
using (user_id=(select private.current_fni_profile_id()))
with check (user_id=(select private.current_fni_profile_id()));

drop policy if exists gallery_albums_select_policy on public.gallery_albums;
drop policy if exists gallery_albums_admin_insert on public.gallery_albums;
drop policy if exists gallery_albums_admin_update on public.gallery_albums;
drop policy if exists gallery_albums_admin_delete on public.gallery_albums;
create policy gallery_albums_select_policy on public.gallery_albums for select to authenticated using (true);
create policy gallery_albums_admin_insert on public.gallery_albums for insert to authenticated with check ((select private.is_fni_admin()));
create policy gallery_albums_admin_update on public.gallery_albums for update to authenticated
using ((select private.is_fni_admin())) with check ((select private.is_fni_admin()));
create policy gallery_albums_admin_delete on public.gallery_albums for delete to authenticated using ((select private.is_fni_admin()));

drop policy if exists gallery_items_select_policy on public.gallery_items;
drop policy if exists gallery_items_admin_insert on public.gallery_items;
drop policy if exists gallery_items_admin_update on public.gallery_items;
drop policy if exists gallery_items_admin_delete on public.gallery_items;
create policy gallery_items_select_policy on public.gallery_items for select to authenticated
using (is_published is true or (select private.is_fni_admin()));
create policy gallery_items_admin_insert on public.gallery_items for insert to authenticated with check ((select private.is_fni_admin()));
create policy gallery_items_admin_update on public.gallery_items for update to authenticated
using ((select private.is_fni_admin())) with check ((select private.is_fni_admin()));
create policy gallery_items_admin_delete on public.gallery_items for delete to authenticated using ((select private.is_fni_admin()));

drop policy if exists fni_gallery_admin_upload on storage.objects;
drop policy if exists fni_gallery_admin_update on storage.objects;
drop policy if exists fni_gallery_admin_delete on storage.objects;
create policy fni_gallery_admin_upload on storage.objects for insert to authenticated
with check (bucket_id='fni-gallery-media' and (select private.is_fni_admin()));
create policy fni_gallery_admin_update on storage.objects for update to authenticated
using (bucket_id='fni-gallery-media' and (select private.is_fni_admin()))
with check (bucket_id='fni-gallery-media' and (select private.is_fni_admin()));
create policy fni_gallery_admin_delete on storage.objects for delete to authenticated
using (bucket_id='fni-gallery-media' and (select private.is_fni_admin()));

grant select,insert,update,delete on public.gallery_albums,public.gallery_items to authenticated;
grant select,insert,update,delete on public.call_sessions,public.call_participants,public.call_history,public.call_blocked_users to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='call_sessions') then
    alter publication supabase_realtime add table public.call_sessions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='call_participants') then
    alter publication supabase_realtime add table public.call_participants;
  end if;
end $$;
