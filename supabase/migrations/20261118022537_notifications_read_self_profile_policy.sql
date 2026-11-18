drop policy if exists notifications_read_self_profile on public.notifications;
create policy notifications_read_self_profile on public.notifications
for select to authenticated
using (user_id=(select private.current_fni_profile_id()));
