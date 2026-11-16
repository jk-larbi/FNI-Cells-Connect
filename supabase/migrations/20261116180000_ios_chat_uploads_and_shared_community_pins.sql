-- Make chat photo uploads tolerant of iOS HEIF/AVIF formats and
-- let active FNI community members pin a post for everyone to see.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fni-chat-media',
  'fni-chat-media',
  false,
  52428800,
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif',
    'image/heic-sequence','image/heif-sequence',
    'video/mp4','video/quicktime','video/webm',
    'audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/webm'
  ]
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Restrict authenticated UPDATE to pin metadata, then permit active community members
-- to update those three columns. Message content continues through the guarded RPC.
revoke update on table public.community_messages from authenticated, anon;
grant update (is_pinned, pinned_at, pinned_by) on table public.community_messages to authenticated;

drop policy if exists community_messages_pin_update on public.community_messages;
create policy community_messages_pin_update
on public.community_messages
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.role::text in ('tutor', 'admin', 'super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.role::text in ('tutor', 'admin', 'super_admin')
  )
);

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
  where id = auth.uid() and is_active = true;

  if auth.uid() is null or v_role not in ('tutor', 'admin', 'super_admin') then
    raise exception 'Only active FNI community members can pin messages';
  end if;

  -- Members may pin a message for the whole community. Only leadership can
  -- remove the current shared pin, keeping the community pin under moderation.
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
