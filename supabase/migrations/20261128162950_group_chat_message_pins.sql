create or replace function public.manage_fni_group_chat_pin(
  p_message_id text,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_actor_uid text := (select auth.uid())::text;
  v_group_id text;
  v_actor_role text;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_pinned_at timestamptz;
  v_actor_name text;
begin
  if v_actor_uid is null then
    raise exception 'Sign in before managing pinned messages.';
  end if;
  if coalesce(btrim(p_message_id), '') = '' then
    raise exception 'Choose a valid group message.';
  end if;
  if v_action not in ('pin', 'unpin') then
    raise exception 'Choose pin or unpin.';
  end if;

  select m.group_id into v_group_id
  from public.group_chat_messages m
  where m.id = p_message_id
  for update;
  if not found then
    raise exception 'Group message not found.';
  end if;

  select gm.member_role into v_actor_role
  from public.group_chat_members gm
  where gm.group_id = v_group_id
    and gm.user_id = v_actor_uid;

  if v_actor_role is null or v_actor_role not in ('owner', 'moderator') then
    raise exception 'Only the group owner or a moderator can pin messages.';
  end if;

  if v_action = 'pin' then
    if exists (
      select 1 from public.group_chat_messages m
      where m.id = p_message_id and m.deleted_at is not null
    ) then
      raise exception 'Deleted messages cannot be pinned.';
    end if;
    update public.group_chat_messages
    set is_pinned = true, pinned_at = now(), pinned_by = v_actor_uid
    where id = p_message_id
    returning pinned_at into v_pinned_at;
  else
    update public.group_chat_messages
    set is_pinned = false, pinned_at = null, pinned_by = null
    where id = p_message_id;
    v_pinned_at := null;
  end if;

  select p.full_name into v_actor_name
  from public.profiles p
  where p.supabase_user_id = v_actor_uid
  limit 1;

  insert into public.audit_logs(
    id, user_id, user_name, action, entity_type, entity_id, details, created_at
  )
  values (
    gen_random_uuid()::text,
    v_actor_uid,
    coalesce(v_actor_name, 'FNI Member'),
    case when v_action = 'pin' then 'PIN_GROUP_CHAT_MESSAGE' else 'UNPIN_GROUP_CHAT_MESSAGE' end,
    'group_chat_message',
    p_message_id,
    jsonb_build_object('group_id', v_group_id, 'message_id', p_message_id, 'action', v_action),
    now()
  );

  return jsonb_build_object(
    'group_id', v_group_id,
    'message_id', p_message_id,
    'is_pinned', v_action = 'pin',
    'pinned_at', v_pinned_at,
    'pinned_by', case when v_action = 'pin' then v_actor_uid else null end
  );
end;
$function$;

revoke all on function public.manage_fni_group_chat_pin(text, text) from public, anon;
grant execute on function public.manage_fni_group_chat_pin(text, text) to authenticated;
