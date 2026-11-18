drop policy if exists notifications_insert_self_profile on public.notifications;
create policy notifications_insert_self_profile on public.notifications
for insert to authenticated with check (user_id=(select private.current_fni_profile_id()));

drop policy if exists notifications_read_admin_profile on public.notifications;
create policy notifications_read_admin_profile on public.notifications
for select to authenticated using ((select private.is_fni_admin()));

drop policy if exists notifications_update_self_profile on public.notifications;
create policy notifications_update_self_profile on public.notifications
for update to authenticated
using (user_id=(select private.current_fni_profile_id()))
with check (user_id=(select private.current_fni_profile_id()));

drop policy if exists notifications_update_admin_profile on public.notifications;
create policy notifications_update_admin_profile on public.notifications
for update to authenticated using ((select private.is_fni_admin()))
with check ((select private.is_fni_admin()));

drop policy if exists notifications_delete_admin_profile on public.notifications;
create policy notifications_delete_admin_profile on public.notifications
for delete to authenticated using ((select private.is_fni_admin()));
