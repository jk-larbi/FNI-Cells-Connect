-- Explicitly allow an authenticated member to create their own private message.
-- Existing participant/admin SELECT policies continue to control message visibility.
grant insert on table public.private_messages to authenticated;

drop policy if exists private_messages_sender_insert on public.private_messages;
create policy private_messages_sender_insert
on public.private_messages
for insert
to authenticated
with check (sender_uid = (select auth.uid())::text);
