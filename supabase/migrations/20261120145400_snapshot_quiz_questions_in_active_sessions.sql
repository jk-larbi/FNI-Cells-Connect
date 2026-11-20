alter table public.learning_quiz_sessions
  add column if not exists question_ids jsonb not null default '[]'::jsonb;

update public.learning_quiz_sessions s
set question_ids = coalesce((
  select jsonb_agg(q.id order by q.created_at)
  from public.learning_quiz_questions q
  where q.quiz_id=s.quiz_id and q.is_active=true
), '[]'::jsonb)
where s.question_ids = '[]'::jsonb;