alter table public.learning_quiz_sessions
  add column if not exists updated_at timestamptz not null default now();
