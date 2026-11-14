-- Telegram-style chat media and delete-for-everyone support.
alter table public.private_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists deleted_for_everyone_at timestamptz,
  add column if not exists deleted_by text;

alter table public.community_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists deleted_for_everyone_at timestamptz,
  add column if not exists deleted_by text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fni-chat-media',
  'fni-chat-media',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/heic','video/mp4','video/quicktime','video/webm','audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/webm']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fni_chat_media_upload_own on storage.objects;
create policy fni_chat_media_upload_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'fni-chat-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists fni_chat_media_read_private_participant on storage.objects;
create policy fni_chat_media_read_private_participant
on storage.objects for select to authenticated
using (
  bucket_id = 'fni-chat-media'
  and (
    exists (
      select 1 from public.private_messages pm
      where pm.attachments @> jsonb_build_array(jsonb_build_object('path', name))
        and (
          pm.sender_uid = (select auth.uid())::text
          or pm.recipient_uid = (select auth.uid())::text
          or private.is_admin()
        )
    )
    or exists (
      select 1 from public.community_messages cm
      where cm.attachments @> jsonb_build_array(jsonb_build_object('path', name))
    )
  )
);

drop policy if exists fni_chat_media_delete_own on storage.objects;
create policy fni_chat_media_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'fni-chat-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or private.is_admin()
  )
);

create or replace function public.fni_delete_private_message_for_everyone(p_message_id text)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_uid text := (select auth.uid())::text;
  v_sender text;
begin
  select sender_uid into v_sender
  from public.private_messages
  where id = p_message_id;

  if not found then return false; end if;
  if v_sender <> v_uid and not private.is_admin() then
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

create or replace function public.fni_delete_community_message_for_everyone(p_message_id text)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_uid text := (select auth.uid())::text;
  v_sender text;
begin
  select sender_uid into v_sender
  from public.community_messages
  where id = p_message_id;

  if not found then return false; end if;
  if v_sender <> v_uid and not private.is_admin() then
    raise exception 'You can only delete your own message for everyone.';
  end if;

  update public.community_messages
  set deleted_for_everyone_at = coalesce(deleted_for_everyone_at, now()),
      deleted_by = v_uid,
      content = '',
      attachments = '[]'::jsonb
  where id = p_message_id;

  return true;
end;
$$;

revoke all on function public.fni_delete_private_message_for_everyone(text) from public;
revoke all on function public.fni_delete_community_message_for_everyone(text) from public;
grant execute on function public.fni_delete_private_message_for_everyone(text) to authenticated;
grant execute on function public.fni_delete_community_message_for_everyone(text) to authenticated;
