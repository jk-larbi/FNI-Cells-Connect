-- Transfer group ownership atomically to an existing member.
-- The previous owner remains in the group as a moderator.
create or replace function public.transfer_fni_group_chat_ownership(
  p_group_id text,
  p_new_owner_id text
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
  v_actor_name text;
  v_target_name text;
begin
  if v_actor_uid is null then
    raise exception 'Sign in before transferring group ownership.';
  end if;
  if coalesce(btrim(p_group_id), '') = '' or coalesce(btrim(p_new_owner_id), '') = '' then
    raise exception 'Choose a valid group member to become the new owner.';
  end if;
  if p_new_owner_id = v_actor_uid then
    raise exception 'Choose another group member to receive ownership.';
  end if;

  select g.name into v_group_name
  from public.group_chats g
  where g.id = p_group_id
  for update;
  if not found then
    raise exception 'Group not found.';
  end if;

  select m.member_role into v_actor_role
  from public.group_chat_members m
  where m.group_id = p_group_id and m.user_id = v_actor_uid
  for update;
  if v_actor_role is distinct from 'owner' then
    raise exception 'Only the current group owner can transfer ownership.';
  end if;

  select m.member_role into v_target_role
  from public.group_chat_members m
  where m.group_id = p_group_id and m.user_id = p_new_owner_id
  for update;
  if v_target_role is null then
    raise exception 'The new owner must already be a member of this group.';
  end if;
  if v_target_role not in ('member', 'moderator') then
    raise exception 'That member cannot receive ownership.';
  end if;

  select p.full_name into v_actor_name
  from public.profiles p where p.supabase_user_id = v_actor_uid limit 1;
  select p.full_name into v_target_name
  from public.profiles p where p.id = p_new_owner_id limit 1;

  update public.group_chat_members
  set member_role = 'moderator'
  where group_id = p_group_id and user_id = v_actor_uid;

  update public.group_chat_members
  set member_role = 'owner'
  where group_id = p_group_id and user_id = p_new_owner_id;

  update public.group_chats
  set created_by_uid = p_new_owner_id
  where id = p_group_id;

  insert into public.notifications(
    id, user_id, title, message, type, channel, target_tab, action_url, metadata, is_read, created_at
  )
  values
    (
      gen_random_uuid()::text, p_new_owner_id,
      'You are now the group owner',
      'You are now responsible for managing "' || v_group_name || '".',
      'group_chat_ownership_transferred', 'in_app', 'messages', 'group:' || p_group_id,
      jsonb_build_object('groupId', p_group_id, 'previousOwnerId', v_actor_uid), false, now()
    ),
    (
      gen_random_uuid()::text, v_actor_uid,
      'Group ownership transferred',
      'Ownership of "' || v_group_name || '" was transferred to ' || coalesce(v_target_name, 'another group member') || '. You are now a moderator.',
      'group_chat_ownership_transferred', 'in_app', 'messages', 'group:' || p_group_id,
      jsonb_build_object('groupId', p_group_id, 'newOwnerId', p_new_owner_id), false, now()
    );

  insert into public.audit_logs(id, user_id, user_name, action, entity_type, entity_id, details, created_at)
  values (
    gen_random_uuid()::text, v_actor_uid, coalesce(v_actor_name, 'FNI Member'),
    'TRANSFER_GROUP_CHAT_OWNERSHIP', 'group_chat', p_group_id,
    jsonb_build_object(
      'previous_owner_id', v_actor_uid,
      'previous_owner_name', v_actor_name,
      'new_owner_id', p_new_owner_id,
      'new_owner_name', v_target_name
    ),
    now()
  );

  return jsonb_build_object(
    'group_id', p_group_id,
    'previous_owner_id', v_actor_uid,
    'new_owner_id', p_new_owner_id,
    'previous_owner_role', 'moderator',
    'new_owner_role', 'owner'
  );
end;
$function$;

revoke execute on function public.transfer_fni_group_chat_ownership(text, text) from public, anon;
grant execute on function public.transfer_fni_group_chat_ownership(text, text) to authenticated;
