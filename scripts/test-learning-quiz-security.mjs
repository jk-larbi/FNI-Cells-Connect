import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261120145000_secure_learning_quiz_tables_and_answer_key_isolation.sql', 'utf8');
const retryMigration = readFileSync('supabase/migrations/20261120145300_make_quiz_attempt_submission_idempotent.sql', 'utf8');
const edge = readFileSync('supabase/functions/learning-portal/index.ts', 'utf8');
const service = readFileSync('src/services/learningService.ts', 'utf8');
const quizView = readFileSync('src/components/learning/LearningQuizzesView.tsx', 'utf8');
const overviewView = readFileSync('src/components/learning/LearningOverviewView.tsx', 'utf8');
const gradesView = readFileSync('src/components/learning/LearningGradesView.tsx', 'utf8');
const authContext = readFileSync('src/context/AuthContext.tsx', 'utf8');
const cloudSync = readFileSync('src/services/cloudSyncService.ts', 'utf8');
const supabaseClient = readFileSync('src/lib/supabase.ts', 'utf8');

assert.match(migration, /create table if not exists public\.learning_quiz_answer_keys/i);
assert.match(migration, /revoke all on public\.learning_quiz_answer_keys from anon,authenticated,public/i);
assert.match(migration, /revoke all on public\.learning_quiz_attempts from anon,authenticated,public/i);
assert.match(migration, /revoke all on public\.learning_quiz_sessions from anon,authenticated,public/i);
assert.match(migration, /alter table public\.learning_quiz_answer_keys enable row level security/i);
assert.match(migration, /learning_quiz_sync_state_owner_read/i);
assert.match(migration, /updated_at timestamptz not null default now\(\)/i);
assert.match(migration, /is_active boolean not null default true/i);

assert.match(edge, /auth\.getUser\(\)/);
assert.match(edge, /ADMIN_ROLES/);
assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(edge, /action === "submit_attempt"/);
assert.match(retryMigration, /unique index if not exists learning_quiz_attempts_session_unique_idx/i);
assert.match(edge, /eq\("session_id", session\.id\)/);
assert.match(edge, /session\.question_ids/);
assert.match(edge, /questions: sessionQuestions/);
assert.match(edge, /is_active/);
assert.match(edge, /scoreAutomaticText/);
assert.match(edge, /action === "grade_attempt"/);
assert.match(edge, /action === "release_all"/);
assert.match(edge, /results_released/);
assert.match(edge, /awaiting_results/);
assert.match(edge, /learning_quiz_answer_keys/);

assert.match(service, /functions\.invoke\('learning-portal'/);
assert.doesNotMatch(service, /from\(['"]learning_quiz_answer_keys['"]\)/);
assert.match(service, /action: 'submit_attempt'/);
assert.match(service, /action: 'get_attempts'/);
assert.match(quizView, /startQuizAttempt\(quiz\.id/);
assert.match(quizView, /quizSessionId/);
assert.match(quizView, /saveQuizDraftAnswers\(activeQuizForTest\.id/);
assert.match(authContext, /fni_learning_quiz_questions_v2/);
assert.match(authContext, /privilegedRoles/);
assert.match(cloudSync, /'learning_quiz_sync_state'/);
assert.match(cloudSync, /'learning_quizzes'/);
assert.match(overviewView, /learning_quiz_sync_state/);
assert.match(gradesView, /learning_quiz_sync_state/);
assert.doesNotMatch(supabaseClient, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);

console.log('Learning Portal security checks passed: answer keys and attempts are server-only, quiz grading is server-side, and tutor sessions/drafts sync through protected server actions.');
