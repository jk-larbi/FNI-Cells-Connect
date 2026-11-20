-- Secure Learning Portal quizzes: prompts are public to enrolled tutors,
-- answer keys, sessions and attempts are server-only, and Realtime exposes only
-- a minimal per-tutor sync marker.

create table if not exists public.learning_quizzes (
  id text primary key,
  title text not null,
  description text not null default '',
  instructions text,
  time_limit_minutes integer not null default 15,
  passing_score numeric not null default 70,
  total_points numeric not null default 100,
  mcq_points numeric not null default 0,
  subjective_points numeric not null default 0,
  has_mcq boolean not null default false,
  has_subjective boolean not null default false,
  published_at timestamptz,
  due_date timestamptz not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  results_released boolean not null default false,
  timing_settings jsonb not null default '{}'::jsonb,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_quiz_questions (
  id text primary key,
  quiz_id text not null references public.learning_quizzes(id) on delete cascade,
  section text not null check (section in ('mcq','subjective')),
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice','true_false','short_answer','written')),
  options jsonb not null default '[]'::jsonb,
  points numeric not null default 10 check (points >= 0),
  marking_method text check (marking_method in ('automatic','manual')),
  created_at timestamptz not null default now()
);

create table if not exists public.learning_quiz_answer_keys (
  question_id text primary key references public.learning_quiz_questions(id) on delete cascade,
  quiz_id text not null references public.learning_quizzes(id) on delete cascade,
  correct_answer text,
  explanation text,
  expected_answer text,
  acceptable_alternatives jsonb not null default '[]'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id text not null references public.learning_quizzes(id) on delete cascade,
  tutor_id text not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists learning_quiz_one_active_session_idx
  on public.learning_quiz_sessions(quiz_id,tutor_id) where consumed_at is null;

create table if not exists public.learning_quiz_attempts (
  id text primary key,
  quiz_id text not null references public.learning_quizzes(id) on delete cascade,
  tutor_id text not null references public.profiles(id) on delete cascade,
  tutor_name text not null,
  cell_id text references public.cells(id) on delete set null,
  cell_name text,
  attempt_number integer not null check (attempt_number > 0),
  answers jsonb not null default '{}'::jsonb,
  question_grades jsonb not null default '{}'::jsonb,
  score numeric not null default 0,
  total_possible numeric not null default 0,
  percentage numeric not null default 0,
  passed boolean not null default false,
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  status text not null default 'submitted',
  grading_status text not null default 'graded' check (grading_status in ('graded','awaiting_grading')),
  results_released boolean not null default false,
  feedback text,
  graded_by text,
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  unique(quiz_id,tutor_id,attempt_number)
);
create index if not exists learning_quiz_attempts_tutor_idx on public.learning_quiz_attempts(tutor_id,completed_at desc);
create index if not exists learning_quiz_attempts_quiz_idx on public.learning_quiz_attempts(quiz_id,completed_at desc);

create table if not exists public.learning_quiz_sync_state (
  id text primary key,
  quiz_id text not null references public.learning_quizzes(id) on delete cascade,
  tutor_id text not null references public.profiles(id) on delete cascade,
  attempt_id text,
  event_type text not null default 'updated',
  updated_at timestamptz not null default now()
);
create index if not exists learning_quiz_sync_state_tutor_idx on public.learning_quiz_sync_state(tutor_id,updated_at desc);

alter table public.learning_quizzes enable row level security;
alter table public.learning_quiz_questions enable row level security;
alter table public.learning_quiz_answer_keys enable row level security;
alter table public.learning_quiz_sessions enable row level security;
alter table public.learning_quiz_attempts enable row level security;
alter table public.learning_quiz_sync_state enable row level security;

grant select,insert,update,delete on public.learning_quizzes to authenticated;
grant select,insert,update,delete on public.learning_quiz_questions to authenticated;
grant select on public.learning_quiz_sync_state to authenticated;
revoke all on public.learning_quiz_answer_keys from anon,authenticated,public;
revoke all on public.learning_quiz_sessions from anon,authenticated,public;
revoke all on public.learning_quiz_attempts from anon,authenticated,public;
grant all on public.learning_quiz_answer_keys,public.learning_quiz_sessions,public.learning_quiz_attempts,public.learning_quiz_sync_state to service_role;

drop policy if exists learning_quizzes_admin_all on public.learning_quizzes;
create policy learning_quizzes_admin_all on public.learning_quizzes for all to authenticated
using (exists (select 1 from public.profiles p where p.supabase_user_id=(select auth.uid()) and p.role in ('admin','super_admin','national_admin')))
with check (exists (select 1 from public.profiles p where p.supabase_user_id=(select auth.uid()) and p.role in ('admin','super_admin','national_admin')));
drop policy if exists learning_quizzes_tutor_published_read on public.learning_quizzes;
create policy learning_quizzes_tutor_published_read on public.learning_quizzes for select to authenticated
using (status='published');

drop policy if exists learning_quiz_questions_admin_all on public.learning_quiz_questions;
create policy learning_quiz_questions_admin_all on public.learning_quiz_questions for all to authenticated
using (exists (select 1 from public.profiles p where p.supabase_user_id=(select auth.uid()) and p.role in ('admin','super_admin','national_admin')))
with check (exists (select 1 from public.profiles p where p.supabase_user_id=(select auth.uid()) and p.role in ('admin','super_admin','national_admin')));
drop policy if exists learning_quiz_questions_published_read on public.learning_quiz_questions;
create policy learning_quiz_questions_published_read on public.learning_quiz_questions for select to authenticated
using (exists (select 1 from public.learning_quizzes q where q.id=quiz_id and q.status='published'));

drop policy if exists learning_quiz_sync_state_owner_read on public.learning_quiz_sync_state;
create policy learning_quiz_sync_state_owner_read on public.learning_quiz_sync_state for select to authenticated
using (exists (select 1 from public.profiles p where p.id=tutor_id and p.supabase_user_id=(select auth.uid()))
  or exists (select 1 from public.profiles p where p.supabase_user_id=(select auth.uid()) and p.role in ('admin','super_admin','national_admin')));

do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    begin alter publication supabase_realtime add table public.learning_quizzes; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.learning_quiz_questions; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.learning_quiz_sync_state; exception when duplicate_object then null; end;
  end if;
end $$;
