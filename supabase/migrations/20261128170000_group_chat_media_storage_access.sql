-- Allow authenticated members of a private group to resolve only files
-- that are actually attached to messages in that same group.
-- The existing fni-chat-media bucket remains private and existing private/community
-- chat access policies are preserved.
drop policy if exists fni_group_chat_media_read_member on storage.objects;
create policy fni_group_chat_media_read_member
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'fni-chat-media'
    and exists (
      select 1
      from public.group_chat_messages message
      where message.attachments @> jsonb_build_array(jsonb_build_object('path', objects.name))
        and private.is_group_member(message.group_id)
    )
  );
