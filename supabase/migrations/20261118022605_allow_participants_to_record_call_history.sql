create or replace function private.can_write_call_history(p_session_id uuid,p_target_user_id text)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,private
as $$
 select exists(select 1 from public.call_sessions cs
  where cs.id=p_session_id
   and (cs.caller_id=private.current_fni_profile_id()
     or cs.receiver_id=private.current_fni_profile_id()
     or private.is_call_participant(cs.id))
   and (p_target_user_id=cs.caller_id or p_target_user_id=cs.receiver_id
     or exists(select 1 from public.call_participants cp
       where cp.session_id=cs.id and cp.user_id=p_target_user_id)))
$$;
revoke all on function private.can_write_call_history(uuid,text) from public,anon;
grant execute on function private.can_write_call_history(uuid,text) to authenticated;
drop policy if exists call_history_insert_own on public.call_history;
create policy call_history_insert_own on public.call_history
for insert to authenticated
with check(user_id=(select private.current_fni_profile_id())
 or (session_id is not null and (select private.can_write_call_history(session_id,user_id))));
