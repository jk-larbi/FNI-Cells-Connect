-- Secure member and moderator administration for member-created group chats.
-- Direct self-insert/delete policies allowed members to join arbitrary groups by ID.
-- All membership changes now go through one authenticated, authorization-checked RPC.

drop policy if exists group_members_insert_owner_or_self on public.group_chat_members;
drop policy if exists group_members_delete_owner_or_self on public.group_chat_members;

revoke insert, update, delete on public.group_chat_members from authenticated;

create or replace function public.manage_fni_group_chat_member(
  p_group_id text,
  p_member_id text,
  p_action text,
  p_member_role text default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_actor_uid text := (select auth.uid())::text;
  v_actor_role text;
  v_target_role text;
  v_group_name text;
  v_target_name text;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_role text := lower(btrim(coalesce(p_member_role, 'member')));
begin
  if v_actor_uid is null then
    raise exception 'Sign in to manage group members.';
  end if;
  if coalesce(btrim(p_group_id), '') = '' or coalesce(btrim(p_member_id), '') = '' then
    raise exception 'A valid group and member are required.';
  end if;
  if v_action not in ('add_member', 'remove_member', 'set_role', 'leave') then
    raise exception 'Unsupported group member action.';
  end if;
  if v_action = 'set_role' and v_role not in ('member', 'moderator') then
    raise exception 'Choose member or moderator.';
  end if;

  select g.name into v_group_name
  from public.group_chats g
  where g.id = p_group_id;
  if not found then
    raise exception 'Group not found.';
  end if;

  select m.member_role into v_actor_role
  from public.group_chat_members m
  where m.group_id = p_group_id and m.user_id = v_actor_uid;

  if v_action = 'leave' then
    if p_member_id <> v_actor_uid then
      raise exception 'You can only leave a group as yourself.';
    end if;
    if v_actor_role is null then
      raise exception 'You are not a member of this group.';
    end if;
    if v_actor_role = 'owner' then
      raise exception 'Transfer group ownership before leaving this group.';
    end if;
    delete from public.group_chat_members
    where group_id = p_group_id and user_id = v_actor_uid;
    return jsonb_build_object('group_id', p_group_id, 'member_id', v_actor_uid, 'action', 'leave');
  end if;

  if v_actor_role not in ('owner', 'moderator') then
    raise exception 'Only the group owner or a moderator can manage members.';
  end if;

  if v_action = 'add_member' then
    if not exists (
      select 1 from public.profiles p
      where p.id = p_member_id
        and coalesce(p.is_active, true) = true
        and coalesce(p.is_test_account, false) = false
    ) then
      raise exception 'This FNI member is unavailable.';
    end if;
    insert into public.group_chat_members(group_id, user_id, member_role)
    values (p_group_id, p_member_id, 'member')
    on conflict (group_id, user_id) do nothing;
    if not found then
      raise exception 'This person is already in the group.';
    end if;
    select p.full_name into v_target_name from public.profiles p where p.id = p_member_id;
    insert into public.notifications(id, user_id, title, message, type, channel, target_tab, action_url, metadata, is_read, created_at)
    values (
      gen_random_uuid()::text, p_member_id, 'You were added to a group',
      'You have been added to "' || v_group_name || '".',
      'group_chat_added', 'in_app', 'messages', 'group:' || p_group_id,
      jsonb_build_object('groupId', p_group_id), false, now()
    );
  else
    select m.member_role into v_target_role
    from public.group_chat_members m
    where m.group_id = p_group_id and m.user_id = p_member_id;
    if v_target_role is null then
      raise exception 'That person is not a member of this group.';
    end if;
    if v_target_role = 'owner' then
      raise exception 'The group owner cannot be removed or have their role changed.';
    end if;

    if v_action = 'set_role' then
      if v_actor_role <> 'owner' then
        raise exception 'Only the group owner can appoint or remove moderators.';
      end if;
      update public.group_chat_members
      set member_role = v_role
      where group_id = p_group_id and user_id = p_member_id;
    elsif v_action = 'remove_member' then
      if v_actor_role = 'moderator' and v_target_role <> 'member' then
        raise exception 'Moderators can only remove regular members.';
      end if;
      delete from public.group_chat_members
      where group_id = p_group_id and user_id = p_member_id;
    end if;
    select p.full_name into v_target_name from public.profiles p where p.id = p_member_id;
  end if;

  insert into public.audit_logs(id, user_id, user_name, action, entity_type, entity_id, details, created_at)
  values (
    gen_random_uuid()::text, v_actor_uid,
    coalesce((select p.full_name from public.profiles p where p.supabase_user_id = auth.uid() limit 1), 'FNI Member'),
    case v_action
      when 'add_member' then 'ADD_GROUP_CHAT_MEMBER'
      when 'remove_member' then 'REMOVE_GROUP_CHAT_MEMBER'
      else 'CHANGE_GROUP_CHAT_MEMBER_ROLE'
    end,
    'group_chat', p_group_id,
    jsonb_build_object('member_id', p_member_id, 'member_name', v_target_name, 'action', v_action, 'member_role', case when v_action = 'set_role' then v_role else v_target_role end),
    now()
  );

  return jsonb_build_object(
    'group_id', p_group_id,
    'member_id', p_member_id,
    'action', v_action,
    'member_role', case when v_action = 'set_role' then v_role when v_action = 'add_member' then 'member' else v_target_role end
  );
end;
$function$;

revoke all on function public.manage_fni_group_chat_member(text, text, text, text) from public, anon;
grant execute on function public.manage_fni_group_chat_member(text, text, text, text) to authenticated;
