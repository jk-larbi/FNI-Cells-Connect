-- =========================================================================
-- FNI CELLS CONNECT: SCHEDULED ACTIVITIES & REMINDERS
-- Automatic reminders for cell meetings, group meetings and evangelism activities
-- =========================================================================

create table if not exists public.scheduled_activities (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null check (activity_type in ('cell_meeting', 'group_meeting', 'evangelism')),
  title text not null,
  description text,
  scheduled_start_time timestamptz not null,
  scheduled_end_time timestamptz,
  cell_id text references public.cells(id) on delete set null,
  cell_name text,
  location text,
  created_by text not null references public.profiles(id) on delete cascade,
  creator_name text not null,
  invited_member_ids text[] not null default '{}'::text[],
  scope text not null default 'cell' check (scope in ('cell', 'group', 'all')),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for efficient queries
create index if not exists idx_scheduled_activities_start 
  on public.scheduled_activities (scheduled_start_time asc);
create index if not exists idx_scheduled_activities_cell 
  on public.scheduled_activities (cell_id);
create index if not exists idx_scheduled_activities_creator 
  on public.scheduled_activities (created_by);
create index if not exists idx_scheduled_activities_status 
  on public.scheduled_activities (status);

-- Enable RLS
alter table public.scheduled_activities enable row level security;

-- Grants
grant select, insert, update, delete on public.scheduled_activities to authenticated, anon;

-- Select policy:
-- User can view if:
-- 1. User created the activity
-- 2. User is admin
-- 3. Scope is 'all'
-- 4. Scope is 'cell' and matches user's cell
-- 5. User's id is in invited_member_ids
drop policy if exists scheduled_activities_select on public.scheduled_activities;
create policy scheduled_activities_select on public.scheduled_activities
  for select to authenticated, anon
  using (
    created_by = (select auth.uid())::text
    or scope = 'all'
    or (select auth.uid())::text = any(invited_member_ids)
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())::text
      and (p.role in ('Super_admin', 'Admin') or p.cell_id = scheduled_activities.cell_id)
    )
  );

-- Insert policy: Authenticated users can insert
drop policy if exists scheduled_activities_insert on public.scheduled_activities;
create policy scheduled_activities_insert on public.scheduled_activities
  for insert to authenticated, anon
  with check (
    created_by = (select auth.uid())::text
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())::text
      and p.role in ('Super_admin', 'Admin')
    )
  );

-- Update policy: Creator or Admin can update
drop policy if exists scheduled_activities_update on public.scheduled_activities;
create policy scheduled_activities_update on public.scheduled_activities
  for update to authenticated, anon
  using (
    created_by = (select auth.uid())::text
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())::text
      and p.role in ('Super_admin', 'Admin')
    )
  );

-- Delete policy: Creator or Admin can delete
drop policy if exists scheduled_activities_delete on public.scheduled_activities;
create policy scheduled_activities_delete on public.scheduled_activities
  for delete to authenticated, anon
  using (
    created_by = (select auth.uid())::text
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())::text
      and p.role in ('Super_admin', 'Admin')
    )
  );
