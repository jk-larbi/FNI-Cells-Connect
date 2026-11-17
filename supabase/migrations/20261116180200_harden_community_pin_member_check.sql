-- Reject missing profiles and NULL pin flags explicitly.
create or replace function public.set_community_message_pin(p_message_id text, p_pinned boolean)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  select role::text into v_role
  from public.profiles
  where id = auth.uid()::text and is_active = true;

  if auth.uid() is null or v_role is null or v_role not in ('tutor', 'admin', 'super_admin') then
    raise exception 'Only active FNI community members can pin messages';
  end if;
  if p_pinned is null then
    raise exception 'Choose whether to pin or unpin the message';
  end if;
  if not p_pinned and v_role not in ('admin', 'super_admin') then
    raise exception 'Only FNI administrators can remove a community pin';
  end if;

  if p_pinned then
    update public.community_messages
    set is_pinned = false, pinned_at = null, pinned_by = null
    where is_pinned = true and id <> p_message_id;

    update public.community_messages
    set is_pinned = true, pinned_at = now(), pinned_by = auth.uid()::text
    where id = p_message_id and deleted_for_everyone_at is null;

    if not found then
      raise exception 'Community message not found or already deleted';
    end if;
  else
    update public.community_messages
    set is_pinned = false, pinned_at = null, pinned_by = null
    where id = p_message_id;

    if not found then
      raise exception 'Community message not found';
    end if;
  end if;
end;
$$;

revoke all on function public.set_community_message_pin(text, boolean) from public;
grant execute on function public.set_community_message_pin(text, boolean) to authenticated;
