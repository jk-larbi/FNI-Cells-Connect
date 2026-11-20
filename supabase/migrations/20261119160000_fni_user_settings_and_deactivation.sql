-- FNI user settings and account deactivation requests.
-- Compatible with production profiles.id TEXT and profiles.supabase_user_id UUID.
create table if not exists public.user_settings (
  user_id text primary key references public.profiles(id) on delete cascade,
  notification_preferences jsonb not null default '{}'::jsonb,
  chat_wallpapers jsonb not null default '{}'::jsonb,
  general_preferences jsonb not null default '{}'::jsonb,
  theme_preference text not null default 'system' check (theme_preference in ('light','dark','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
grant select, insert, update, delete on public.user_settings to authenticated;
drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings" on public.user_settings for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id=user_settings.user_id and p.supabase_user_id=(select auth.uid()))
  or exists (select 1 from public.profiles p where p.supabase_user_id=(select auth.uid()) and p.role in ('admin','super_admin','national_admin'))
);
drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings" on public.user_settings for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id=user_settings.user_id and p.supabase_user_id=(select auth.uid())));
drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings" on public.user_settings for update to authenticated
using (exists (select 1 from public.profiles p where p.id=user_settings.user_id and p.supabase_user_id=(select auth.uid())))
with check (exists (select 1 from public.profiles p where p.id=user_settings.user_id and p.supabase_user_id=(select auth.uid())));

create table if not exists public.account_deactivation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  user_name text not null,
  cell_name text,
  role text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','declined','cancelled')),
  admin_notes text,
  reviewed_by text references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_pending_deactivation_per_user on public.account_deactivation_requests(user_id) where status='pending';
create index if not exists idx_deactivation_requests_status on public.account_deactivation_requests(status,created_at desc);
alter table public.account_deactivation_requests enable row level security;
grant select, insert, update on public.account_deactivation_requests to authenticated;
drop policy if exists "Users view own deactivation requests" on public.account_deactivation_requests;
create policy "Users view own deactivation requests" on public.account_deactivation_requests for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id=account_deactivation_requests.user_id and p.supabase_user_id=(select auth.uid()))
  or exists (select 1 from public.profiles p where p.supabase_user_id=(select auth.uid()) and p.role in ('admin','super_admin','national_admin'))
);
drop policy if exists "Users insert own deactivation request" on public.account_deactivation_requests;
create policy "Users insert own deactivation request" on public.account_deactivation_requests for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id=account_deactivation_requests.user_id and p.supabase_user_id=(select auth.uid())));
drop policy if exists "Admins and users update deactivation requests" on public.account_deactivation_requests;
create policy "Admins and users update deactivation requests" on public.account_deactivation_requests for update to authenticated
using (
  (exists (select 1 from public.profiles p where p.id=account_deactivation_requests.user_id and p.supabase_user_id=(select auth.uid())) and status='pending')
  or exists (select 1 from public.profiles p where p.supabase_user_id=(select auth.uid()) and p.role in ('admin','super_admin','national_admin'))
)
with check (
  exists (select 1 from public.profiles p where p.supabase_user_id=(select auth.uid()) and
    (p.id=account_deactivation_requests.user_id or p.role in ('admin','super_admin','national_admin')))
);
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_settings') then
    alter publication supabase_realtime add table public.user_settings;
  end if;
end $$;
