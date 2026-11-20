-- FNI Learning Portal: cloud-backed core records.
-- Quiz tables are intentionally excluded until grading and answer-key access
-- are moved fully server-side; the legacy client-side grader exposes answer keys.

create table if not exists public.learning_assignments (
  id text primary key,
  title text not null,
  description text not null default '',
  instructions text,
  attachments jsonb not null default '[]'::jsonb,
  total_marks numeric not null default 100,
  published_at timestamptz,
  due_date timestamptz not null,
  late_policy text not null default 'allow_with_penalty' check (late_policy in ('allow_with_penalty','allow_no_penalty','reject_late')),
  submission_format text not null default 'both' check (submission_format in ('written','file','both')),
  max_attempts integer not null default 1 check (max_attempts >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by text references public.profiles(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_assignment_submissions (
  id text primary key,
  assignment_id text not null references public.learning_assignments(id) on delete cascade,
  tutor_id text not null references public.profiles(id) on delete cascade,
  tutor_name text not null,
  cell_id text references public.cells(id) on delete set null,
  cell_name text,
  attempt_number integer not null default 1 check (attempt_number > 0),
  written_response text,
  attachment_name text,
  attachment_url text,
  attachment_size text,
  submitted_at timestamptz not null default now(),
  is_late boolean not null default false,
  status text not null default 'submitted' check (status in ('submitted','submitted_late','awaiting_grading','graded','needs_correction')),
  grade numeric,
  feedback text,
  graded_by text references public.profiles(id) on delete set null,
  graded_by_name text,
  graded_at timestamptz,
  results_released boolean not null default false,
  created_at timestamptz not null default now(),
  constraint learning_assignment_submission_attempt_unique unique (assignment_id,tutor_id,attempt_number)
);

create table if not exists public.learning_events (
  id text primary key,
  title text not null,
  description text not null default '',
  event_date date not null,
  start_time time not null,
  end_time time not null,
  location_or_link text not null,
  meeting_type text not null default 'online' check (meeting_type in ('online','in_person','hybrid')),
  speaker text,
  materials_link text,
  status text not null default 'upcoming' check (status in ('upcoming','ongoing','completed','cancelled')),
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_resources (
  id text primary key,
  title text not null,
  description text not null default '',
  category text not null default 'leadership' check (category in ('theology','leadership','evangelism','discipleship','cell_operations')),
  file_name text not null,
  file_url text not null,
  file_size text not null default '1.0 MB',
  file_type text not null default 'application/pdf',
  reading_time_minutes integer not null default 10,
  status text not null default 'published' check (status in ('published','archived')),
  published_at timestamptz,
  uploaded_by text references public.profiles(id) on delete set null,
  uploaded_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists learning_assignments_status_idx on public.learning_assignments(status);
create index if not exists learning_submissions_assignment_idx on public.learning_assignment_submissions(assignment_id);
create index if not exists learning_submissions_tutor_idx on public.learning_assignment_submissions(tutor_id);
create index if not exists learning_events_date_idx on public.learning_events(event_date);
create index if not exists learning_resources_status_idx on public.learning_resources(status);

alter table public.learning_assignments enable row level security;
alter table public.learning_assignment_submissions enable row level security;
alter table public.learning_events enable row level security;
alter table public.learning_resources enable row level security;

grant select, insert, update, delete on public.learning_assignments to authenticated;
grant select, insert, update, delete on public.learning_assignment_submissions to authenticated;
grant select, insert, update, delete on public.learning_events to authenticated;
grant select, insert, update, delete on public.learning_resources to authenticated;

drop policy if exists learning_assignments_admin_all on public.learning_assignments;
create policy learning_assignments_admin_all on public.learning_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists learning_assignments_tutor_published_read on public.learning_assignments;
create policy learning_assignments_tutor_published_read on public.learning_assignments for select to authenticated using (status = 'published');

drop policy if exists learning_submissions_admin_all on public.learning_assignment_submissions;
create policy learning_submissions_admin_all on public.learning_assignment_submissions for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists learning_submissions_tutor_read_own on public.learning_assignment_submissions;
create policy learning_submissions_tutor_read_own on public.learning_assignment_submissions for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = tutor_id and p.supabase_user_id = (select auth.uid()))
);
drop policy if exists learning_submissions_tutor_insert_own on public.learning_assignment_submissions;
create policy learning_submissions_tutor_insert_own on public.learning_assignment_submissions for insert to authenticated with check (
  exists (select 1 from public.profiles p where p.id = tutor_id and p.supabase_user_id = (select auth.uid()))
);

drop policy if exists learning_events_admin_all on public.learning_events;
create policy learning_events_admin_all on public.learning_events for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists learning_events_authenticated_read on public.learning_events;
create policy learning_events_authenticated_read on public.learning_events for select to authenticated using (true);

drop policy if exists learning_resources_admin_all on public.learning_resources;
create policy learning_resources_admin_all on public.learning_resources for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists learning_resources_tutor_published_read on public.learning_resources;
create policy learning_resources_tutor_published_read on public.learning_resources for select to authenticated using (status = 'published');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.learning_assignments; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.learning_assignment_submissions; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.learning_events; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.learning_resources; exception when duplicate_object then null; end;
  end if;
end $$;
