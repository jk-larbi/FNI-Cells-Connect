-- FNI Cells Connect: reliable community message ownership, pinning and personal clears.
-- A single RPC signature avoids PostgREST overload ambiguity. Pins are multi-message,
-- shared state; active community members may pin/unpin, including their own posts.
drop function if exists public.set_community_message_pin(text, boolean);
drop function if exists public.set_community_message_pin(text, boolean, boolean);
drop index if exists public.community_messages_one_pinned_idx;

create or replace function public.set_community_message_pin(
  p_message_id text,
  p_pinned boolean,
  p_notify boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_uid text := auth.uid()::text;
  v_profile_id text;
  v_role text;
  v_user_name text;
begin
  if v_uid is null then
    raise exception 'Authentication required to pin community messages';
  end if;
  if p_pinned is null then
    raise exception 'Choose whether to pin or unpin the message';
  end if;

  v_profile_id := coalesce(private.current_fni_profile_id(), v_uid);

  select role::text, full_name
    into v_role, v_user_name
  from public.profiles
  where id = v_profile_id and is_active = true;

  if v_role is null or v_role not in ('tutor', 'admin', 'super_admin', 'national_admin') then
    raise exception 'Only active FNI community members can pin messages';
  end if;

  perform 1
  from public.community_messages
  where id = p_message_id
    and deleted_for_everyone_at is null
  for update;

  if not found then
    raise exception 'Community message not found or already deleted';
  end if;

  update public.community_messages
  set is_pinned = p_pinned,
      pinned_at = case when p_pinned then now() else null end,
      pinned_by = case when p_pinned then v_uid else null end,
      pinned_by_name = case when p_pinned then coalesce(v_user_name, 'FNI Member') else null end,
      pinned_notify = case when p_pinned then coalesce(p_notify, false) else false end
  where id = p_message_id;

  return true;
end;
$$;

revoke all on function public.set_community_message_pin(text, boolean, boolean) from public, anon;
grant execute on function public.set_community_message_pin(text, boolean, boolean) to authenticated;

-- The author can always delete their own post for everyone, even when the
-- other participant is an administrator. Administrators retain moderation rights.
create or replace function public.fni_delete_community_message_for_everyone(p_message_id text)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_uid text := auth.uid()::text;
  v_profile_id text;
  v_sender text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_profile_id := coalesce(private.current_fni_profile_id(), v_uid);

  select sender_uid
    into v_sender
  from public.community_messages
  where id = p_message_id
  for update;

  if not found then
    return false;
  end if;

  if v_sender is distinct from v_uid
     and v_sender is distinct from v_profile_id
     and not (private.is_admin() or private.is_fni_admin() or public.is_admin()) then
    raise exception 'You can only delete your own message for everyone.';
  end if;

  update public.community_messages
  set deleted_for_everyone_at = coalesce(deleted_for_everyone_at, now()),
      deleted_by = v_uid,
      content = '',
      attachments = '[]'::jsonb,
      is_pinned = false,
      pinned_at = null,
      pinned_by = null,
      pinned_by_name = null,
      pinned_notify = false
  where id = p_message_id;

  return true;
end;
$$;

revoke all on function public.fni_delete_community_message_for_everyone(text) from public, anon;
grant execute on function public.fni_delete_community_message_for_everyone(text) to authenticated;

-- Apply the same owner/profile-ID check to direct tutor/admin conversations.
create or replace function public.fni_delete_private_message_for_everyone(p_message_id text)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_uid text := auth.uid()::text;
  v_profile_id text;
  v_sender text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_profile_id := coalesce(private.current_fni_profile_id(), v_uid);

  select sender_uid
    into v_sender
  from public.private_messages
  where id = p_message_id
  for update;

  if not found then
    return false;
  end if;

  if v_sender is distinct from v_uid
     and v_sender is distinct from v_profile_id
     and not (private.is_admin() or private.is_fni_admin() or public.is_admin()) then
    raise exception 'You can only delete your own message for everyone.';
  end if;

  update public.private_messages
  set deleted_for_everyone_at = coalesce(deleted_for_everyone_at, now()),
      deleted_by = v_uid,
      content = '',
      attachments = '[]'::jsonb
  where id = p_message_id;

  return true;
end;
$$;

revoke all on function public.fni_delete_private_message_for_everyone(text) from public, anon;
grant execute on function public.fni_delete_private_message_for_everyone(text) to authenticated;
