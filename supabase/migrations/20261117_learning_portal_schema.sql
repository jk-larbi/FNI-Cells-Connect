-- ==============================================================================
-- Forerunners Network International (FNI) - Digital Reporting System
-- Migration: Learning Portal Schema & Security Policies
-- Date: November 17, 2026
-- Description: Assignments, Submissions, Quizzes, Quiz Questions, Quiz Attempts,
--              Events, and Learning Resources with strict RLS policies.
-- ==============================================================================

-- 1. LEARNING ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.learning_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  total_marks NUMERIC NOT NULL DEFAULT 100,
  published_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ NOT NULL,
  late_policy TEXT NOT NULL DEFAULT 'allow_with_penalty' CHECK (late_policy IN ('allow_with_penalty', 'allow_no_penalty', 'reject_late')),
  submission_format TEXT NOT NULL DEFAULT 'both' CHECK (submission_format IN ('written', 'file', 'both')),
  max_attempts INT NOT NULL DEFAULT 1 CHECK (max_attempts IN (0, 1, 2, 3, 5)), -- 0 = unlimited
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. LEARNING ASSIGNMENT SUBMISSIONS (Preserves every attempt version)
CREATE TABLE IF NOT EXISTS public.learning_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.learning_assignments(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_name TEXT NOT NULL,
  cell_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
  cell_name TEXT,
  attempt_number INT NOT NULL DEFAULT 1,
  written_response TEXT,
  attachment_name TEXT,
  attachment_url TEXT,
  attachment_size TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_late BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'submitted_late', 'awaiting_grading', 'graded', 'needs_correction')),
  grade NUMERIC,
  feedback TEXT,
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  graded_by_name TEXT,
  graded_at TIMESTAMPTZ,
  results_released BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_assignment_tutor_attempt UNIQUE (assignment_id, tutor_id, attempt_number)
);

-- 3. LEARNING QUIZZES
CREATE TABLE IF NOT EXISTS public.learning_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT,
  time_limit_minutes INT NOT NULL DEFAULT 15,
  passing_score NUMERIC NOT NULL DEFAULT 70,
  total_points NUMERIC NOT NULL DEFAULT 100,
  published_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  results_released BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. LEARNING QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS public.learning_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.learning_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  points NUMERIC NOT NULL DEFAULT 10,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. LEARNING QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS public.learning_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.learning_quizzes(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_name TEXT NOT NULL,
  cell_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
  cell_name TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC NOT NULL DEFAULT 0,
  total_possible NUMERIC NOT NULL DEFAULT 100,
  percentage NUMERIC NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. LEARNING EVENTS
CREATE TABLE IF NOT EXISTS public.learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_or_link TEXT NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'online' CHECK (meeting_type IN ('online', 'in_person', 'hybrid')),
  speaker TEXT,
  materials_link TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. LEARNING RESOURCES / MATERIALS
CREATE TABLE IF NOT EXISTS public.learning_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'leadership' CHECK (category IN ('theology', 'leadership', 'evangelism', 'discipleship', 'cell_operations')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT NOT NULL DEFAULT '1.0 MB',
  file_type TEXT NOT NULL DEFAULT 'application/pdf',
  reading_time_minutes INT DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'archived')),
  published_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.learning_assignments(status);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.learning_assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_tutor ON public.learning_assignment_submissions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON public.learning_quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.learning_quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.learning_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_tutor ON public.learning_quiz_attempts(tutor_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_date ON public.learning_events(event_date);
CREATE INDEX IF NOT EXISTS idx_learning_resources_category ON public.learning_resources(category);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.learning_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;

-- 1. ASSIGNMENTS POLICIES
-- Admin has full access
CREATE POLICY "Admin full access to assignments"
  ON public.learning_assignments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tutors can view published assignments
CREATE POLICY "Tutors view published assignments"
  ON public.learning_assignments FOR SELECT
  TO authenticated
  USING (status = 'published');

-- 2. SUBMISSIONS POLICIES
-- Admin has full access
CREATE POLICY "Admin full access to submissions"
  ON public.learning_assignment_submissions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tutors can view ONLY their own submissions
CREATE POLICY "Tutors view own submissions"
  ON public.learning_assignment_submissions FOR SELECT
  TO authenticated
  USING (tutor_id = auth.uid());

-- Tutors can insert their own submissions
CREATE POLICY "Tutors insert own submissions"
  ON public.learning_assignment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (tutor_id = auth.uid());

-- 3. QUIZZES POLICIES
-- Admin full access
CREATE POLICY "Admin full access to quizzes"
  ON public.learning_quizzes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tutors view published quizzes
CREATE POLICY "Tutors view published quizzes"
  ON public.learning_quizzes FOR SELECT
  TO authenticated
  USING (status = 'published');

-- 4. QUIZ QUESTIONS POLICIES
CREATE POLICY "Admin full access to quiz questions"
  ON public.learning_quiz_questions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Tutors view questions of published quizzes"
  ON public.learning_quiz_questions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.learning_quizzes q
    WHERE q.id = learning_quiz_questions.quiz_id AND q.status = 'published'
  ));

-- 5. QUIZ ATTEMPTS POLICIES
CREATE POLICY "Admin full access to quiz attempts"
  ON public.learning_quiz_attempts FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Tutors view own quiz attempts"
  ON public.learning_quiz_attempts FOR SELECT
  TO authenticated
  USING (tutor_id = auth.uid());

CREATE POLICY "Tutors insert own quiz attempts"
  ON public.learning_quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (tutor_id = auth.uid());

-- 6. EVENTS POLICIES
CREATE POLICY "Admin full access to events"
  ON public.learning_events FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users view upcoming events"
  ON public.learning_events FOR SELECT
  TO authenticated
  USING (true);

-- 7. LEARNING RESOURCES POLICIES
CREATE POLICY "Admin full access to resources"
  ON public.learning_resources FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Tutors view published resources"
  ON public.learning_resources FOR SELECT
  TO authenticated
  USING (status = 'published');

-- REALTIME PUBLICATION
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.learning_assignments,
      public.learning_assignment_submissions,
      public.learning_quizzes,
      public.learning_events,
      public.learning_resources;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
