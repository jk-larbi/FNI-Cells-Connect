export type SubmissionFormat = 'written' | 'file' | 'both';
export type LatePolicy = 'allow_with_penalty' | 'allow_no_penalty' | 'reject_late';
export type AssignmentStatus = 'draft' | 'published' | 'archived';

export type SubmissionStatus =
  | 'submitted'
  | 'submitted_late'
  | 'awaiting_grading'
  | 'graded'
  | 'needs_correction';

export type ParticipationStatus =
  | 'Not started'
  | 'In progress'
  | 'Submitted'
  | 'Submitted late'
  | 'Missed'
  | 'Awaiting grading'
  | 'Graded'
  | 'Quiz completed';

export type QuizStatus = 'draft' | 'published' | 'archived';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'written';

export type LearningPortalSection =
  | 'overview'
  | 'assignments'
  | 'quizzes'
  | 'participation'
  | 'grades'
  | 'events'
  | 'materials';

export interface AttachmentItem {
  id?: string;
  name: string;
  url: string;
  size?: string;
  type?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  attachments: AttachmentItem[];
  total_marks: number;
  published_at?: string;
  due_date: string;
  late_policy: LatePolicy;
  submission_format: SubmissionFormat;
  max_attempts: number; // 1 | 2 | 3 | 5 | 0 (0 = unlimited)
  status: AssignmentStatus;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  // Computed / aggregated fields for convenience
  submission_count?: number;
  graded_count?: number;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  tutor_id: string;
  tutor_name: string;
  cell_id?: string;
  cell_name?: string;
  attempt_number: number;
  written_response?: string;
  attachment_name?: string;
  attachment_url?: string;
  attachment_size?: string;
  submitted_at: string;
  is_late: boolean;
  status: SubmissionStatus;
  grade?: number;
  feedback?: string;
  graded_by?: string;
  graded_by_name?: string;
  graded_at?: string;
  results_released: boolean;
}

export type QuizSectionType = 'mcq' | 'subjective';
export type SubjectiveMarkingMethod = 'automatic' | 'manual';
export type QuizResultReleasePolicy = 'immediate' | 'after_close' | 'manual';
export type QuizAttemptStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'submitted_late'
  | 'time_expired'
  | 'awaiting_grading'
  | 'graded';

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  section?: QuizSectionType; // 'mcq' | 'subjective'
  question_text: string;
  question_type: QuestionType; // 'multiple_choice' | 'true_false' | 'written'
  options?: string[]; // for multiple_choice & true_false [A, B, C, D]
  correct_answer?: string | number; // index (0..3) for MCQ, or expected answer for subjective auto
  points: number;
  explanation?: string;
  // Subjective Question Specifics
  marking_method?: SubjectiveMarkingMethod; // 'automatic' | 'manual'
  expected_answer?: string;
  acceptable_alternatives?: string[];
  keywords?: string[];
}

export interface QuizTimingSettings {
  opens_at?: string; // ISO string
  closes_at?: string; // ISO string
  timezone: string; // 'Africa/Accra'
  time_limit_minutes: number; // 0 = no time limit, 15, 30, 45, 60, 90, 120, or custom
  max_attempts: number; // 1, 2, 3, 5, 0 (0 = unlimited)
  allow_change_answers: boolean;
  allow_review_before_submit: boolean;
  allow_resubmission: boolean;
  allow_late_submissions: boolean;
  auto_submit_on_expiry: boolean;
  result_release_policy: QuizResultReleasePolicy; // 'immediate' | 'after_close' | 'manual'
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  time_limit_minutes: number; // 0 = no time limit
  passing_score: number; // percentage (e.g. 70)
  total_points: number;
  mcq_points?: number;
  subjective_points?: number;
  has_mcq?: boolean;
  has_subjective?: boolean;
  questions?: QuizQuestion[];
  published_at?: string;
  due_date: string;
  status: QuizStatus;
  results_released: boolean;
  timing_settings?: QuizTimingSettings;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Computed
  attempt_count?: number;
}

export interface QuestionGradingDetail {
  question_id: string;
  question_text: string;
  section: QuizSectionType;
  marking_method?: SubjectiveMarkingMethod;
  user_answer: any;
  correct_answer?: any;
  expected_answer?: string;
  keywords_matched?: string[];
  max_points: number;
  points_awarded: number;
  is_correct?: boolean;
  is_manual_review_needed?: boolean;
  feedback?: string;
  overridden_by_admin?: boolean;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  quiz_title?: string;
  tutor_id: string;
  tutor_name: string;
  cell_id?: string;
  cell_name?: string;
  attempt_number?: number;
  answers: Record<string, any>; // question_id -> selected answer
  question_grades?: Record<string, QuestionGradingDetail>;
  score: number;
  total_possible: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  completed_at: string;
  status: QuizAttemptStatus;
  grading_status?: 'graded' | 'awaiting_grading';
  results_released?: boolean;
  feedback?: string;
  graded_by?: string;
  graded_at?: string;
}

export interface LearningEvent {
  id: string;
  title: string;
  description: string;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  location_or_link: string;
  meeting_type: 'online' | 'in_person' | 'hybrid';
  speaker?: string;
  materials_link?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
}

export interface LearningResource {
  id: string;
  title: string;
  description: string;
  category: 'theology' | 'leadership' | 'evangelism' | 'discipleship' | 'cell_operations';
  file_name: string;
  file_url: string;
  file_size: string;
  file_type: string;
  reading_time_minutes?: number;
  status: 'published' | 'archived';
  published_at?: string;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface TutorParticipationMetric {
  tutor_id: string;
  tutor_name: string;
  cell_id?: string;
  cell_name?: string;
  phone?: string;
  assignments_submitted: number;
  assignments_total: number;
  quizzes_completed: number;
  quizzes_total: number;
  average_score: number;
  participation_rate: number; // percentage
  status: ParticipationStatus;
  last_activity_date?: string;
}
