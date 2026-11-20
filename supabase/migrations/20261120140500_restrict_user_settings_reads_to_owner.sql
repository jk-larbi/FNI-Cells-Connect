-- User preferences are private to the account owner; admin role does not
-- grant blanket read access to notification settings or personal chat wallpapers.
drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings"
on public.user_settings for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = user_settings.user_id
      and p.supabase_user_id = (select auth.uid())
  )
);
