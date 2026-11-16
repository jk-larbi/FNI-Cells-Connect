-- Consolidate the shared-pin and message-owner update policies.
-- Column grants still limit authenticated UPDATE to pin metadata only.
drop policy if exists community_messages_pin_update on public.community_messages;
drop policy if exists community_messages_modify on public.community_messages;

create policy community_messages_modify
on public.community_messages
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())::text
      and p.is_active = true
      and p.role in ('tutor', 'admin', 'super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())::text
      and p.is_active = true
      and p.role in ('tutor', 'admin', 'super_admin')
  )
);
