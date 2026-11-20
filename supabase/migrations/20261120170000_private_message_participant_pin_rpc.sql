-- Allow either participant to pin or unpin either side's private messages.
-- Use a SECURITY DEFINER RPC so RLS cannot silently block the operation,
-- while enforcing conversation membership at the database boundary.
drop function if exists public.set_private_message_pin(text, boolean);

create function public.set_private_message_pin(
  p_message_id text,
  p_pinned boolean
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
  v_sender text;
  v_recipient text;
begin
  if v_uid is null then
    raise exception 'Authentication required to pin private messages';
  end if;
  if p_pinned is null then
    raise exception 'Choose whether to pin or unpin the message';
  end if;

  v_profile_id := coalesce(private.current_fni_profile_id(), v_uid);

  select role::text, full_name
    into v_role, v_user_name
  from public.profiles
  where id = v_profile_id and is_active is true;

  select sender_uid, recipient_uid
    into v_sender, v_recipient
  from public.private_messages
  where id = p_message_id
    and deleted_for_everyone_at is null
  for update;

  if not found then
    raise exception 'Private message not found or already deleted';
  end if;

  if v_profile_id is distinct from v_sender
     and v_profile_id is distinct from v_recipient
     and not (private.is_admin() or private.is_fni_admin() or public.is_admin()) then
    raise exception 'You must be a participant in this conversation to pin its messages';
  end if;

  if v_role is null or (v_profile_id <> v_sender and v_profile_id <> v_recipient
     and v_role not in ('admin', 'super_admin', 'national_admin')) then
    raise exception 'Only active FNI members can pin private messages';
  end if;

  update public.private_messages
  set is_pinned = p_pinned,
      pinned_at = case when p_pinned then now() else null end,
      pinned_by = case when p_pinned then v_profile_id else null end,
      pinned_by_name = case when p_pinned then coalesce(v_user_name, 'FNI Member') else null end,
      pinned_notify = case when p_pinned then coalesce(pinned_notify, false) else false end
  where id = p_message_id;

  return true;
end;
$$;

revoke all on function public.set_private_message_pin(text, boolean) from public, anon;
grant execute on function public.set_private_message_pin(text, boolean) to authenticated;
