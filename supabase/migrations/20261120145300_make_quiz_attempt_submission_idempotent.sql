alter table public.learning_quiz_attempts
  add column if not exists session_id uuid references public.learning_quiz_sessions(id) on delete set null;
create unique index if not exists learning_quiz_attempts_session_unique_idx
  on public.learning_quiz_attempts(session_id) where session_id is not null;