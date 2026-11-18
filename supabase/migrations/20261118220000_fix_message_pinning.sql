-- =========================================================================
-- FNI CELLS CONNECT: FIX MESSAGE PINNING SYSTEM & OVERLOAD RESOLUTION
-- =========================================================================

-- 1. DROP OBSOLETE OVERLOADED FUNCTIONS TO PREVENT PGRST203
drop function if exists public.set_community_message_pin(text, boolean);
drop function if exists public.set_community_message_pin(text, boolean, boolean);

-- 2. RECREATE SET_COMMUNITY_MESSAGE_PIN AS SECURITY DEFINER
-- Allows authorized leaders and administrators to pin messages.
create or replace function public.set_community_message_pin(
  p_message_id text,
  p_pinned boolean,
  p_notify boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_role text;
  v_user_name text;
  v_user_id text;
begin
  v_user_id := auth.uid()::text;
  if v_user_id is null then
    raise exception 'Authentication required to pin community messages';
  end if;

  select role::text, full_name into v_role, v_user_name
  from public.profiles
  where id = v_user_id and is_active = true;

  if v_role not in ('tutor', 'admin', 'super_admin', 'national_admin') then
    raise exception 'Only active FNI leaders and administrators can pin community messages';
  end if;

  if not p_pinned and v_role not in ('admin', 'super_admin', 'national_admin') then
    raise exception 'Only FNI administrators can remove community pins';
  end if;

  if p_pinned then
    update public.community_messages
    set is_pinned = true,
        pinned_at = now(),
        pinned_by = v_user_id,
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

-- 3. RECREATE SET_PRIVATE_MESSAGE_PIN AS SECURITY DEFINER
drop function if exists public.set_private_message_pin(text, boolean);

create or replace function public.set_private_message_pin(
  p_message_id text,
  p_pinned boolean
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id text;
  v_user_name text;
  v_sender text;
  v_recipient text;
begin
  v_user_id := auth.uid()::text;
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select sender_uid, recipient_uid into v_sender, v_recipient
  from public.private_messages
  where id = p_message_id;

  if v_sender is null then
    raise exception 'Private message not found';
  end if;

  if v_user_id <> v_sender and v_user_id <> v_recipient and not private.is_admin() then
    raise exception 'Not authorized to pin this message';
  end if;

  select full_name into v_user_name from public.profiles where id = v_user_id;

  if p_pinned then
    update public.private_messages
    set is_pinned = true,
        pinned_at = now(),
        pinned_by = v_user_id,
        pinned_by_name = coalesce(v_user_name, 'Participant')
    where id = p_message_id;

    -- Sync private_message_pins
    insert into public.private_message_pins (user_id, message_id, pinned_at)
    values (v_user_id, p_message_id, now())
    on conflict (user_id, message_id) do update set pinned_at = now();
  else
    update public.private_messages
    set is_pinned = false,
        pinned_at = null,
        pinned_by = null,
        pinned_by_name = null
    where id = p_message_id;

    delete from public.private_message_pins
    where user_id = v_user_id and message_id = p_message_id;
  end if;
end;
$$;

revoke all on function public.set_private_message_pin(text, boolean) from public;
grant execute on function public.set_private_message_pin(text, boolean) to authenticated;

-- 4. GRANT COLUMN UPDATES FOR PIN METADATA
grant update (is_pinned, pinned_at, pinned_by, pinned_by_name, pinned_notify) on table public.community_messages to authenticated;
grant update (is_pinned, pinned_at, pinned_by, pinned_by_name, pinned_notify) on table public.private_messages to authenticated;
