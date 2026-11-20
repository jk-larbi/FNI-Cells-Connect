-- FNI Cells Connect: restore the community clear-history RPC with strict personal/admin scope.
create or replace function public.fni_clear_community_chat_history(p_for_everyone boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required to clear community history';
  end if;

  if coalesce(p_for_everyone, false) then
    if not (private.is_admin() or private.is_fni_admin() or public.is_admin()) then
      raise exception 'Administrator permission required to clear community chat for everyone.';
    end if;

    update public.community_messages
    set deleted_for_everyone_at = coalesce(deleted_for_everyone_at, now()),
        deleted_by = v_uid::text,
        content = '',
        attachments = '[]'::jsonb,
        is_pinned = false,
        pinned_at = null,
        pinned_by = null,
        pinned_by_name = null,
        pinned_notify = false
    where deleted_for_everyone_at is null;

    return true;
  end if;

  insert into public.community_chat_preferences (user_id, cleared_at, updated_at)
  values (v_uid, now(), now())
  on conflict (user_id) do update
    set cleared_at = excluded.cleared_at,
        updated_at = excluded.updated_at;

  return true;
end;
$$;

revoke all on function public.fni_clear_community_chat_history(boolean) from public, anon;
grant execute on function public.fni_clear_community_chat_history(boolean) to authenticated;
