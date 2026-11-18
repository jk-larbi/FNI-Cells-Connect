create or replace function public.add_call_participants_for_host(p_session_id uuid,p_user_ids text[] default '{}')
returns integer language plpgsql security definer
set search_path=pg_catalog,public,private
as $$
declare v_actor_id text; v_session public.call_sessions%rowtype; v_inserted integer:=0;
begin
  v_actor_id:=private.current_fni_profile_id();
  if v_actor_id is null then raise exception 'An active FNI profile is required.'; end if;
  select * into v_session from public.call_sessions
  where id=p_session_id and caller_id=v_actor_id for update;
  if not found then raise exception 'Only the meeting host can add participants.'; end if;

  if v_session.call_mode='cell' then
    if not exists(select 1 from public.profiles p where p.id=v_actor_id
      and (p.cell_id=v_session.cell_id or p.role in ('admin','super_admin','national_admin'))) then
      raise exception 'You are not authorized to start this cell meeting.';
    end if;
    insert into public.call_participants(session_id,user_id,user_name,user_avatar,user_cell,role,is_muted,is_video_enabled)
    select v_session.id,p.id,coalesce(p.full_name,'FNI Member'),p.avatar_url,p.cell_name,
      case when p.id=v_actor_id then 'host' else 'participant' end,false,(v_session.call_type='video')
    from public.profiles p
    where p.is_active is true and coalesce(p.is_test_account,false) is false
      and p.role in ('tutor','admin','super_admin','national_admin')
      and (p.cell_id=v_session.cell_id or p.id=v_actor_id)
    on conflict(session_id,user_id) do nothing;
  else
    if coalesce(array_length(p_user_ids,1),0)>0 and exists(
      select 1 from unnest(p_user_ids) requested(id)
      left join public.profiles p on p.id=requested.id
      where p.id is null or p.is_active is not true or coalesce(p.is_test_account,false) is true
        or p.role not in ('tutor','admin','super_admin','national_admin')
    ) then raise exception 'One or more selected participants are not active FNI members.'; end if;
    insert into public.call_participants(session_id,user_id,user_name,user_avatar,user_cell,role,is_muted,is_video_enabled)
    select v_session.id,p.id,coalesce(p.full_name,'FNI Member'),p.avatar_url,p.cell_name,
      case when p.id=v_actor_id then 'host' else 'participant' end,false,(v_session.call_type='video')
    from public.profiles p
    where p.id=any(array_append(coalesce(p_user_ids,'{}'::text[]),v_actor_id))
      and p.is_active is true and coalesce(p.is_test_account,false) is false
    on conflict(session_id,user_id) do nothing;
  end if;
  get diagnostics v_inserted=row_count;
  return v_inserted;
end;
$$;
revoke all on function public.add_call_participants_for_host(uuid,text[]) from public,anon;
grant execute on function public.add_call_participants_for_host(uuid,text[]) to authenticated;
drop policy if exists call_participants_insert_self_or_host on public.call_participants;
drop policy if exists call_participants_insert_self on public.call_participants;
create policy call_participants_insert_self on public.call_participants
for insert to authenticated with check(user_id=(select private.current_fni_profile_id()));
