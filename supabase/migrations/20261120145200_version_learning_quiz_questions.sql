alter table public.learning_quiz_questions
  add column if not exists is_active boolean not null default true;

drop policy if exists learning_quiz_questions_published_read on public.learning_quiz_questions;
create policy learning_quiz_questions_published_read on public.learning_quiz_questions for select to authenticated
using (is_active = true and exists (select 1 from public.learning_quizzes q where q.id=quiz_id and q.status='published'));