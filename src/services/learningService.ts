/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Learning Portal Service
 * 
 * Handles Assignments, Attempt Limits, Versioned Submissions, Quizzes,
 * Auto-grading, Upcoming Events, and Learning Materials.
 * Fully backed by Supabase with safe offline localStorage fallbacks.
 */

import { supabase } from '../lib/supabase';
import {
  Assignment,
  AssignmentSubmission,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  QuizTimingSettings,
  QuestionGradingDetail,
  QuizAttemptStatus,
  LearningEvent,
  LearningResource,
  TutorParticipationMetric,
  SubmissionStatus,
} from '../types/learning';
import { NotificationService } from './notificationService';

// Storage Keys for Offline Resilience (Real Data Only)
const KEYS = {
  ASSIGNMENTS: 'fni_learning_assignments_v2',
  SUBMISSIONS: 'fni_learning_submissions_v2',
  QUIZZES: 'fni_learning_quizzes_v2',
  QUESTIONS: 'fni_learning_quiz_questions_v2',
  ATTEMPTS: 'fni_learning_quiz_attempts_v2',
  EVENTS: 'fni_learning_events_v2',
  RESOURCES: 'fni_learning_resources_v2',
};

// Purge any legacy mockup caches if present in client localStorage
try {
  [
    'fni_learning_assignments_v1',
    'fni_learning_submissions_v1',
    'fni_learning_quizzes_v1',
    'fni_learning_quiz_questions_v1',
    'fni_learning_quiz_attempts_v1',
    'fni_learning_events_v1',
    'fni_learning_resources_v1',
  ].forEach(k => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(k);
    }
  });
} catch {}

// Real initial state starts completely clean without mock items
const INITIAL_ASSIGNMENTS: Assignment[] = [];
const INITIAL_QUIZZES: Quiz[] = [];
const INITIAL_QUESTIONS: QuizQuestion[] = [];
const INITIAL_EVENTS: LearningEvent[] = [];
const INITIAL_RESOURCES: LearningResource[] = [];

// Helper: safe local storage reader & writer
function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`LocalStorage write notice for ${key}:`, e);
  }
}

async function invokeQuizAction<T = any>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Secure quiz service is unavailable. Please check your connection.');
  const { data, error } = await supabase.functions.invoke('learning-portal', { body });
  if (error) throw new Error((data as any)?.error || error.message || 'Quiz service request failed.');
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export class LearningService {
  // ============================================================================
  // 1. ASSIGNMENTS
  // ============================================================================
  static async getAssignments(isAdmin = false): Promise<Assignment[]> {
    // 1. Try Supabase
    try {
      if (supabase) {
        let query = supabase.from('learning_assignments').select('*').order('created_at', { ascending: false });
        if (!isAdmin) {
          query = query.eq('status', 'published');
        }
        const { data, error } = await query;
        if (!error && data) {
          const mapped: Assignment[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            instructions: d.instructions,
            attachments: Array.isArray(d.attachments) ? d.attachments : [],
            total_marks: Number(d.total_marks || 100),
            published_at: d.published_at,
            due_date: d.due_date,
            late_policy: d.late_policy || 'allow_with_penalty',
            submission_format: d.submission_format || 'both',
            max_attempts: Number(d.max_attempts ?? 1),
            status: d.status || 'draft',
            created_by: d.created_by,
            created_by_name: d.created_by_name || 'Church Leadership',
            created_at: d.created_at,
            updated_at: d.updated_at,
          }));
          writeLocal(KEYS.ASSIGNMENTS, mapped);
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Notice loading Supabase assignments, using local data:', e);
    }

    // 2. Local Fallback
    const local = readLocal<Assignment[]>(KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    return isAdmin ? local : local.filter(a => a.status === 'published');
  }

  static async getAssignmentById(id: string): Promise<Assignment | null> {
    const all = await this.getAssignments(true);
    return all.find(a => a.id === id) || null;
  }

  static async saveAssignment(
    assignment: Partial<Assignment>,
    currentUser: { id: string; name?: string }
  ): Promise<Assignment> {
    const nowIso = new Date().toISOString();
    const isNew = !assignment.id;
    const id = assignment.id || `asg-${Date.now()}`;

    const record: Assignment = {
      id,
      title: assignment.title?.trim() || 'Untitled Assignment',
      description: assignment.description?.trim() || '',
      instructions: assignment.instructions?.trim() || '',
      attachments: assignment.attachments || [],
      total_marks: Number(assignment.total_marks || 100),
      published_at: assignment.status === 'published' ? (assignment.published_at || nowIso) : undefined,
      due_date: assignment.due_date || new Date(Date.now() + 7 * 86400000).toISOString(),
      late_policy: assignment.late_policy || 'allow_with_penalty',
      submission_format: assignment.submission_format || 'both',
      max_attempts: Number(assignment.max_attempts ?? 1),
      status: assignment.status || 'draft',
      created_by: assignment.created_by || currentUser.id,
      created_by_name: assignment.created_by_name || currentUser.name || 'FNI Administrator',
      created_at: assignment.created_at || nowIso,
      updated_at: nowIso,
    };

    // 1. Supabase write
    try {
      if (supabase) {
        await supabase.from('learning_assignments').upsert({
          id: record.id,
          title: record.title,
          description: record.description,
          instructions: record.instructions,
          attachments: record.attachments,
          total_marks: record.total_marks,
          published_at: record.published_at,
          due_date: record.due_date,
          late_policy: record.late_policy,
          submission_format: record.submission_format,
          max_attempts: record.max_attempts,
          status: record.status,
          created_by: record.created_by,
          created_by_name: record.created_by_name,
          updated_at: record.updated_at,
        });
      }
    } catch (e) {
      console.warn('Notice saving assignment to Supabase:', e);
    }

    // 2. Local update
    const current = readLocal<Assignment[]>(KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    const index = current.findIndex(a => a.id === id);
    if (index >= 0) {
      current[index] = record;
    } else {
      current.unshift(record);
    }
    writeLocal(KEYS.ASSIGNMENTS, current);

    // 3. Distribution notification to all active tutors if newly published
    if (record.status === 'published') {
      try {
        await NotificationService.createNotification({
          userId: 'tutor_community',
          title: `New Assignment Published: ${record.title}`,
          message: `Leadership has published a new cell assignment. Due: ${new Date(record.due_date).toLocaleDateString()}. Maximum attempts: ${record.max_attempts === 0 ? 'Unlimited' : record.max_attempts}.`,
          type: 'announcement',
          channel: 'in_app',
          metadata: {
            category: 'learning',
            targetTab: 'learning-portal',
            section: 'assignments',
            assignmentId: record.id,
          },
        });
      } catch (err) {
        console.warn('Notice dispatching assignment notification:', err);
      }
    }

    return record;
  }

  static async archiveAssignment(id: string): Promise<void> {
    try {
      if (supabase) {
        await supabase.from('learning_assignments').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', id);
      }
    } catch (e) {
      console.warn('Notice archiving assignment in Supabase:', e);
    }
    const current = readLocal<Assignment[]>(KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    const updated = current.map(a => a.id === id ? { ...a, status: 'archived' as const } : a);
    writeLocal(KEYS.ASSIGNMENTS, updated);
  }

  static async deleteAssignment(id: string): Promise<void> {
    try {
      if (supabase) {
        await supabase.from('learning_assignments').delete().eq('id', id);
      }
    } catch (e) {
      console.warn('Notice deleting assignment in Supabase:', e);
    }
    const current = readLocal<Assignment[]>(KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
    writeLocal(KEYS.ASSIGNMENTS, current.filter(a => a.id !== id));
  }

  // ============================================================================
  // 2. SUBMISSIONS & ATTEMPT TRACKING
  // ============================================================================
  static async getSubmissions(assignmentId?: string, tutorId?: string): Promise<AssignmentSubmission[]> {
    try {
      if (supabase) {
        let query = supabase
          .from('learning_assignment_submissions')
          .select('*')
          .order('submitted_at', { ascending: false });

        if (assignmentId) query = query.eq('assignment_id', assignmentId);
        if (tutorId) query = query.eq('tutor_id', tutorId);

        const { data, error } = await query;
        if (!error && data) {
          const mapped: AssignmentSubmission[] = data.map((d: any) => ({
            id: d.id,
            assignment_id: d.assignment_id,
            tutor_id: d.tutor_id,
            tutor_name: d.tutor_name,
            cell_id: d.cell_id,
            cell_name: d.cell_name,
            attempt_number: Number(d.attempt_number || 1),
            written_response: d.written_response,
            attachment_name: d.attachment_name,
            attachment_url: d.attachment_url,
            attachment_size: d.attachment_size,
            submitted_at: d.submitted_at,
            is_late: Boolean(d.is_late),
            status: d.status || 'submitted',
            grade: d.grade !== null && d.grade !== undefined ? Number(d.grade) : undefined,
            feedback: d.feedback,
            graded_by: d.graded_by,
            graded_by_name: d.graded_by_name,
            graded_at: d.graded_at,
            results_released: Boolean(d.results_released),
          }));
          writeLocal(KEYS.SUBMISSIONS, mapped);
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Notice loading Supabase submissions, using local data:', e);
    }

    const local = readLocal<AssignmentSubmission[]>(KEYS.SUBMISSIONS, []);
    return local.filter(s => {
      if (assignmentId && s.assignment_id !== assignmentId) return false;
      if (tutorId && s.tutor_id !== tutorId) return false;
      return true;
    });
  }

  /**
   * Secure attempt counter and validation
   * Returns exact remaining attempts and latest submission details.
   */
  static async getAttemptStatus(
    assignmentId: string,
    tutorId: string
  ): Promise<{
    assignment: Assignment | null;
    attempts: AssignmentSubmission[];
    usedAttempts: number;
    maxAttempts: number;
    remainingAttempts: number | 'Unlimited';
    canSubmit: boolean;
    latestSubmission: AssignmentSubmission | null;
  }> {
    const [assignment, submissions] = await Promise.all([
      this.getAssignmentById(assignmentId),
      this.getSubmissions(assignmentId, tutorId),
    ]);

    const maxAttempts = assignment ? assignment.max_attempts : 1;
    const sortedAttempts = [...submissions].sort((a, b) => a.attempt_number - b.attempt_number);
    const usedAttempts = sortedAttempts.length;
    const latestSubmission = sortedAttempts.length > 0 ? sortedAttempts[sortedAttempts.length - 1] : null;

    let canSubmit = true;
    let remainingAttempts: number | 'Unlimited' = 'Unlimited';

    if (maxAttempts > 0) {
      const remaining = Math.max(0, maxAttempts - usedAttempts);
      remainingAttempts = remaining;
      canSubmit = remaining > 0;
    }

    return {
      assignment,
      attempts: sortedAttempts,
      usedAttempts,
      maxAttempts,
      remainingAttempts,
      canSubmit,
      latestSubmission,
    };
  }

  /**
   * Submit an assignment attempt. Enforces attempt count, preserves history,
   * flags late submissions, and prevents silent overwriting.
   */
  static async submitAssignmentAttempt(data: {
    assignmentId: string;
    tutorId: string;
    tutorName: string;
    cellId?: string;
    cellName?: string;
    writtenResponse?: string;
    attachmentName?: string;
    attachmentUrl?: string;
    attachmentSize?: string;
  }): Promise<AssignmentSubmission> {
    const attemptStatus = await this.getAttemptStatus(data.assignmentId, data.tutorId);
    if (!attemptStatus.canSubmit) {
      throw new Error(`Submission limit reached. You have already used all ${attemptStatus.maxAttempts} allowed attempts.`);
    }

    const assignment = attemptStatus.assignment;
    if (!assignment) {
      throw new Error('Assignment not found.');
    }

    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const isLate = now.getTime() > dueDate.getTime();

    if (isLate && assignment.late_policy === 'reject_late') {
      throw new Error('The deadline for this assignment has passed and late submissions are not accepted.');
    }

    const newAttemptNumber = attemptStatus.usedAttempts + 1;
    const submissionId = `sub-${Date.now()}-${newAttemptNumber}`;

    const submission: AssignmentSubmission = {
      id: submissionId,
      assignment_id: data.assignmentId,
      tutor_id: data.tutorId,
      tutor_name: data.tutorName,
      cell_id: data.cellId,
      cell_name: data.cellName,
      attempt_number: newAttemptNumber,
      written_response: data.writtenResponse?.trim(),
      attachment_name: data.attachmentName,
      attachment_url: data.attachmentUrl,
      attachment_size: data.attachmentSize,
      submitted_at: now.toISOString(),
      is_late: isLate,
      status: isLate ? 'submitted_late' : 'submitted',
      results_released: false,
    };

    // 1. Supabase write
    try {
      if (supabase) {
        const { error } = await supabase.from('learning_assignment_submissions').insert({
          id: submission.id,
          assignment_id: submission.assignment_id,
          tutor_id: submission.tutor_id,
          tutor_name: submission.tutor_name,
          cell_id: submission.cell_id,
          cell_name: submission.cell_name,
          attempt_number: submission.attempt_number,
          written_response: submission.written_response,
          attachment_name: submission.attachment_name,
          attachment_url: submission.attachment_url,
          attachment_size: submission.attachment_size,
          submitted_at: submission.submitted_at,
          is_late: submission.is_late,
          status: submission.status,
          results_released: false,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      console.warn('Notice saving submission to Supabase:', e);
      throw new Error(e?.message || 'Your assignment could not be saved to the cloud. Please try again when connected.');
    }

    // 2. Local update
    const all = readLocal<AssignmentSubmission[]>(KEYS.SUBMISSIONS, []);
    all.unshift(submission);
    writeLocal(KEYS.SUBMISSIONS, all);

    return submission;
  }

  /**
   * Grade a submission and provide feedback
   */
  static async gradeSubmission(
    submissionId: string,
    grade: number,
    feedback: string,
    adminId: string,
    adminName: string,
    releaseResults = false
  ): Promise<AssignmentSubmission> {
    const nowIso = new Date().toISOString();
    const status: SubmissionStatus = 'graded';

    try {
      if (supabase) {
        await supabase
          .from('learning_assignment_submissions')
          .update({
            grade,
            feedback,
            graded_by: adminId,
            graded_by_name: adminName,
            graded_at: nowIso,
            status,
            results_released: releaseResults,
          })
          .eq('id', submissionId);
      }
    } catch (e) {
      console.warn('Notice grading submission in Supabase:', e);
    }

    const all = readLocal<AssignmentSubmission[]>(KEYS.SUBMISSIONS, []);
    let updatedItem: AssignmentSubmission | null = null;
    const updated = all.map(s => {
      if (s.id === submissionId) {
        updatedItem = {
          ...s,
          grade,
          feedback,
          graded_by: adminId,
          graded_by_name: adminName,
          graded_at: nowIso,
          status,
          results_released: releaseResults,
        };
        return updatedItem;
      }
      return s;
    });
    writeLocal(KEYS.SUBMISSIONS, updated);

    // Notify tutor of grading
    if (updatedItem) {
      const item: AssignmentSubmission = updatedItem;
      try {
        await NotificationService.createNotification({
          userId: item.tutor_id,
          title: `Assignment Graded: ${grade} Marks Awarded`,
          message: `Your assignment submission (Attempt #${item.attempt_number}) has been evaluated by leadership. Feedback: "${feedback.slice(0, 80)}..."`,
          type: 'announcement',
          channel: 'in_app',
          metadata: {
            category: 'learning',
            targetTab: 'learning-portal',
            section: 'grades',
            submissionId: item.id,
          },
        });
      } catch (err) {
        console.warn('Notice dispatching grade notification:', err);
      }
      return item;
    }

    throw new Error('Submission not found.');
  }

  /**
   * Release all grades for an assignment
   */
  static async releaseAssignmentResults(assignmentId: string): Promise<void> {
    try {
      if (supabase) {
        await supabase
          .from('learning_assignment_submissions')
          .update({ results_released: true })
          .eq('assignment_id', assignmentId);
      }
    } catch (e) {
      console.warn('Notice releasing results in Supabase:', e);
    }

    const all = readLocal<AssignmentSubmission[]>(KEYS.SUBMISSIONS, []);
    const updated = all.map(s => (s.assignment_id === assignmentId ? { ...s, results_released: true } : s));
    writeLocal(KEYS.SUBMISSIONS, updated);
  }

  // ============================================================================
  // ============================================================================
  // 3. QUIZZES, MCQs, SUBJECTIVE QUESTIONS & TIMED ASSESSMENTS
  // ============================================================================
  static async getQuizzes(isAdmin = false): Promise<Quiz[]> {
    try {
      if (supabase) {
        let query = supabase.from('learning_quizzes').select('*').order('created_at', { ascending: false });
        if (!isAdmin) {
          query = query.eq('status', 'published');
        }
        const { data, error } = await query;
        if (!error && data) {
          const mapped: Quiz[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            instructions: d.instructions,
            time_limit_minutes: Number(d.time_limit_minutes || 15),
            passing_score: Number(d.passing_score || 70),
            total_points: Number(d.total_points || 100),
            mcq_points: Number(d.mcq_points || 0),
            subjective_points: Number(d.subjective_points || 0),
            has_mcq: Boolean(d.has_mcq),
            has_subjective: Boolean(d.has_subjective),
            published_at: d.published_at,
            due_date: d.due_date,
            status: d.status || 'draft',
            results_released: Boolean(d.results_released),
            timing_settings: d.timing_settings || undefined,
            created_by: d.created_by,
            created_at: d.created_at,
            updated_at: d.updated_at,
          }));
          writeLocal(KEYS.QUIZZES, mapped);
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Notice loading Supabase quizzes, using local data:', e);
    }

    const local = readLocal<Quiz[]>(KEYS.QUIZZES, INITIAL_QUIZZES);
    return isAdmin ? local : local.filter(q => q.status === 'published');
  }

  static async getQuizQuestions(quizId: string, isTutor = false): Promise<QuizQuestion[]> {
    if (isTutor) {
      if (!supabase) throw new Error('Quiz questions are unavailable while offline.');
      const { data, error } = await supabase
        .from('learning_quiz_questions')
        .select('id,quiz_id,section,question_text,question_type,options,points,marking_method,created_at')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []).map((d: any) => ({
        id: d.id, quiz_id: d.quiz_id, section: d.section, question_text: d.question_text,
        question_type: d.question_type, options: Array.isArray(d.options) ? d.options : [],
        points: Number(d.points || 10), marking_method: d.marking_method || undefined,
      }));
    }

    const data = await invokeQuizAction<any[]>({ action: 'get_editor_questions', quizId });
    return (data || []).map((d: any) => ({
      id: d.id, quiz_id: d.quiz_id, section: d.section, question_text: d.question_text,
      question_type: d.question_type, options: Array.isArray(d.options) ? d.options : [],
      points: Number(d.points || 10), marking_method: d.marking_method || undefined,
      correct_answer: d.correct_answer, explanation: d.explanation,
      expected_answer: d.expected_answer,
      acceptable_alternatives: d.acceptable_alternatives || [], keywords: d.keywords || [],
    }));
  }

  static async saveQuiz(
    quiz: Partial<Quiz>,
    questions: Partial<QuizQuestion>[],
    currentUser: { id: string }
  ): Promise<Quiz> {
    const nowIso = new Date().toISOString();
    const id = quiz.id || 'quiz-' + Date.now();
    const mcqQuestions = questions.filter(q => q.section === 'mcq' || q.question_type === 'multiple_choice' || q.question_type === 'true_false');
    const subjectiveQuestions = questions.filter(q => q.section === 'subjective' || q.question_type === 'written' || q.question_type === 'short_answer');
    const mcqPoints = mcqQuestions.reduce((sum, q) => sum + Number(q.points || 0), 0);
    const subjectivePoints = subjectiveQuestions.reduce((sum, q) => sum + Number(q.points || 0), 0);
    const timingSettings: QuizTimingSettings = {
      opens_at: quiz.timing_settings?.opens_at || quiz.published_at || nowIso,
      closes_at: quiz.timing_settings?.closes_at || quiz.due_date || new Date(Date.now() + 7 * 86400000).toISOString(),
      timezone: 'Africa/Accra',
      time_limit_minutes: Number(quiz.timing_settings?.time_limit_minutes ?? quiz.time_limit_minutes ?? 15),
      max_attempts: Number(quiz.timing_settings?.max_attempts ?? 1),
      allow_change_answers: quiz.timing_settings?.allow_change_answers ?? true,
      allow_review_before_submit: quiz.timing_settings?.allow_review_before_submit ?? true,
      allow_resubmission: quiz.timing_settings?.allow_resubmission ?? true,
      allow_late_submissions: quiz.timing_settings?.allow_late_submissions ?? false,
      auto_submit_on_expiry: quiz.timing_settings?.auto_submit_on_expiry ?? true,
      result_release_policy: quiz.timing_settings?.result_release_policy || 'immediate',
    };
    const record: Quiz = {
      id, title: quiz.title?.trim() || 'Untitled Quiz', description: quiz.description?.trim() || '',
      instructions: quiz.instructions?.trim() || '', time_limit_minutes: timingSettings.time_limit_minutes,
      passing_score: Number(quiz.passing_score ?? 70), total_points: mcqPoints + subjectivePoints || 100,
      mcq_points: mcqPoints, subjective_points: subjectivePoints,
      has_mcq: mcqQuestions.length > 0, has_subjective: subjectiveQuestions.length > 0,
      published_at: quiz.status === 'published' ? (quiz.published_at || nowIso) : undefined,
      due_date: timingSettings.closes_at || new Date(Date.now() + 7 * 86400000).toISOString(),
      status: quiz.status || 'draft', results_released: false, timing_settings: timingSettings,
      created_by: quiz.created_by || currentUser.id, created_at: quiz.created_at || nowIso, updated_at: nowIso,
    };
    const preparedQuestions: Partial<QuizQuestion>[] = questions.map((q, idx) => ({
      ...q,
      id: q.id || 'q-' + id + '-' + (idx + 1),
      quiz_id: id,
      section: q.section || (q.question_type === 'written' || q.question_type === 'short_answer' ? 'subjective' : 'mcq'),
      question_type: q.question_type || (q.section === 'subjective' ? 'written' : 'multiple_choice'),
      points: Number(q.points || 10),
      options: q.options || [],
    }));

    await invokeQuizAction({ action: 'save_quiz', quiz: record, questions: preparedQuestions });

    const current = readLocal<Quiz[]>(KEYS.QUIZZES, INITIAL_QUIZZES);
    const index = current.findIndex(q => q.id === id);
    if (index >= 0) current[index] = record; else current.unshift(record);
    writeLocal(KEYS.QUIZZES, current);
    // Never retain answer keys in browser storage, even on administrator devices.
    try { localStorage.removeItem(KEYS.QUESTIONS); } catch {}

    if (record.status === 'published') {
      try {
        await NotificationService.createNotification({
          userId: 'tutor_community', title: 'New Quiz Available: ' + record.title,
          message: 'A new learning quiz has been published for cell tutors. Total marks: ' + record.total_points + '. Due: ' + new Date(record.due_date).toLocaleDateString() + '.',
          type: 'announcement', channel: 'in_app',
          metadata: { category: 'learning', targetTab: 'learning-portal', section: 'quizzes', quizId: record.id },
        });
      } catch (err) { console.warn('Notice dispatching quiz notification:', err); }
    }
    return record;
  }

  static async startQuizAttempt(quizId: string, sessionId?: string): Promise<{
    sessionId: string; startedAt: string; expiresAt: string | null; answers: Record<string, any>; expired: boolean;
  }> {
    return invokeQuizAction({ action: 'start_attempt', quizId, sessionId });
  }

  static async getQuizSession(quizId: string, sessionId?: string): Promise<{
    sessionId: string; startedAt: string; expiresAt: string | null; answers: Record<string, any>; expired: boolean;
  }> {
    return invokeQuizAction({ action: 'get_session', quizId, sessionId });
  }

  static async saveQuizDraftAnswers(
    quizId: string, tutorId: string, answers: Record<string, any>, startedAt: string, sessionId?: string
  ): Promise<void> {
    try {
      const key = 'fni_quiz_draft_' + quizId + '_' + tutorId;
      localStorage.setItem(key, JSON.stringify({ answers, startedAt, sessionId, savedAt: Date.now() }));
    } catch (e) { console.warn('Error saving quiz draft locally:', e); }
    if (sessionId) {
      try { await invokeQuizAction({ action: 'save_draft', quizId, sessionId, answers }); }
      catch (e) { console.warn('Quiz draft is saved on this device but cloud sync is pending:', e); }
    }
  }

  static getQuizDraftAnswers(quizId: string, tutorId: string): {
    answers: Record<string, any>; startedAt: string; sessionId?: string;
  } | null {
    try {
      const item = localStorage.getItem('fni_quiz_draft_' + quizId + '_' + tutorId);
      if (item) return JSON.parse(item);
    } catch {}
    return null;
  }

  static clearQuizDraftAnswers(quizId: string, tutorId: string) {
    try { localStorage.removeItem('fni_quiz_draft_' + quizId + '_' + tutorId); } catch {}
  }

  static async submitQuizAttempt(data: {
    quizId: string; sessionId: string; answers: Record<string, any>; isAutoSubmittedOnExpiry?: boolean;
  }): Promise<QuizAttempt> {
    const attempt = await invokeQuizAction<QuizAttempt>({
      action: 'submit_attempt', quizId: data.quizId, sessionId: data.sessionId, answers: data.answers,
    });
    this.clearQuizDraftAnswers(data.quizId, (attempt as any).tutor_id || '');
    return attempt;
  }

  /**
   * Admin reviews & grades subjective or MCQ questions, overrides marks, and optionally releases results
   */
  static async updateQuizAttemptGrading(data: {
    attemptId: string;
    questionGrades: Record<string, QuestionGradingDetail>;
    feedback?: string;
    releaseResults: boolean;
    adminUser: { id: string; full_name?: string };
  }): Promise<QuizAttempt> {
    await invokeQuizAction({
      action: 'grade_attempt', attemptId: data.attemptId,
      questionGrades: data.questionGrades, feedback: data.feedback || '',
      releaseResults: data.releaseResults,
    });
    const attempts = await this.getQuizAttempts();
    const updated = attempts.find(a => a.id === data.attemptId);
    if (!updated) throw new Error('The grading was saved but the updated attempt could not be reloaded.');
    return updated;
  }

  /**
   * Release results in bulk for all attempts of a specific quiz
   */
  static async releaseAllQuizResults(quizId: string): Promise<void> {
    await invokeQuizAction({ action: 'release_all', quizId });
  }

  static async getQuizAttempts(quizId?: string, tutorId?: string): Promise<QuizAttempt[]> {
    return invokeQuizAction<QuizAttempt[]>({ action: 'get_attempts', quizId, tutorId });
  }

  // ============================================================================
  // 4. UPCOMING EVENTS
  // ============================================================================
  static async getEvents(): Promise<LearningEvent[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('learning_events')
          .select('*')
          .order('event_date', { ascending: true });

        if (!error && data) {
          const mapped: LearningEvent[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            event_date: d.event_date,
            start_time: d.start_time,
            end_time: d.end_time,
            location_or_link: d.location_or_link,
            meeting_type: d.meeting_type || 'online',
            speaker: d.speaker,
            materials_link: d.materials_link,
            status: d.status || 'upcoming',
            created_by: d.created_by,
            created_at: d.created_at,
          }));
          writeLocal(KEYS.EVENTS, mapped);
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Notice loading learning events from Supabase:', e);
    }

    return readLocal<LearningEvent[]>(KEYS.EVENTS, INITIAL_EVENTS);
  }

  static async saveEvent(
    eventData: Partial<LearningEvent>,
    currentUser: { id: string }
  ): Promise<LearningEvent> {
    const id = eventData.id || `evt-${Date.now()}`;
    const record: LearningEvent = {
      id,
      title: eventData.title?.trim() || 'Upcoming Event',
      description: eventData.description?.trim() || '',
      event_date: eventData.event_date || new Date().toISOString().split('T')[0],
      start_time: eventData.start_time || '18:00',
      end_time: eventData.end_time || '20:00',
      location_or_link: eventData.location_or_link || 'Zoom Webinar',
      meeting_type: eventData.meeting_type || 'online',
      speaker: eventData.speaker || 'FNI Ministry Leadership',
      materials_link: eventData.materials_link,
      status: eventData.status || 'upcoming',
      created_by: eventData.created_by || currentUser.id,
      created_at: eventData.created_at || new Date().toISOString(),
    };

    try {
      if (supabase) {
        await supabase.from('learning_events').upsert({
          id: record.id,
          title: record.title,
          description: record.description,
          event_date: record.event_date,
          start_time: record.start_time,
          end_time: record.end_time,
          location_or_link: record.location_or_link,
          meeting_type: record.meeting_type,
          speaker: record.speaker,
          materials_link: record.materials_link,
          status: record.status,
          created_by: record.created_by,
        });
      }
    } catch (e) {
      console.warn('Notice saving event to Supabase:', e);
    }

    const all = readLocal<LearningEvent[]>(KEYS.EVENTS, INITIAL_EVENTS);
    const index = all.findIndex(e => e.id === id);
    if (index >= 0) all[index] = record;
    else all.push(record);
    writeLocal(KEYS.EVENTS, all);

    // Notify all tutors
    try {
      await NotificationService.createNotification({
        userId: 'tutor_community',
        title: `Upcoming Ministry Event: ${record.title}`,
        message: `Date: ${record.event_date} from ${record.start_time} to ${record.end_time}. Venue/Link: ${record.location_or_link}.`,
        type: 'announcement',
        channel: 'in_app',
        metadata: {
          category: 'learning',
          targetTab: 'learning-portal',
          section: 'events',
          eventId: record.id,
        },
      });
    } catch (err) {
      console.warn('Notice dispatching event notification:', err);
    }

    return record;
  }

  static async deleteEvent(id: string): Promise<void> {
    try {
      if (supabase) {
        await supabase.from('learning_events').delete().eq('id', id);
      }
    } catch (e) {
      console.warn('Notice deleting event from Supabase:', e);
    }
    const all = readLocal<LearningEvent[]>(KEYS.EVENTS, INITIAL_EVENTS);
    writeLocal(KEYS.EVENTS, all.filter(e => e.id !== id));
  }

  // ============================================================================
  // 5. LEARNING MATERIALS / RESOURCES
  // ============================================================================
  static async getResources(isAdmin = false): Promise<LearningResource[]> {
    try {
      if (supabase) {
        let query = supabase.from('learning_resources').select('*').order('created_at', { ascending: false });
        if (!isAdmin) {
          query = query.eq('status', 'published');
        }
        const { data, error } = await query;
        if (!error && data) {
          const mapped: LearningResource[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            category: d.category || 'leadership',
            file_name: d.file_name,
            file_url: d.file_url,
            file_size: d.file_size || '1.0 MB',
            file_type: d.file_type || 'application/pdf',
            reading_time_minutes: d.reading_time_minutes,
            status: d.status || 'published',
            published_at: d.published_at,
            uploaded_by: d.uploaded_by,
            uploaded_by_name: d.uploaded_by_name || 'Church Administration',
            created_at: d.created_at,
          }));
          writeLocal(KEYS.RESOURCES, mapped);
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Notice loading learning resources from Supabase:', e);
    }

    const local = readLocal<LearningResource[]>(KEYS.RESOURCES, INITIAL_RESOURCES);
    return isAdmin ? local : local.filter(r => r.status === 'published');
  }

  static async saveResource(
    resourceData: Partial<LearningResource>,
    currentUser: { id: string; name?: string }
  ): Promise<LearningResource> {
    const id = resourceData.id || `res-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: LearningResource = {
      id,
      title: resourceData.title?.trim() || 'Untitled Resource',
      description: resourceData.description?.trim() || '',
      category: resourceData.category || 'leadership',
      file_name: resourceData.file_name || `${(resourceData.title || 'document').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      file_url: resourceData.file_url || '#',
      file_size: resourceData.file_size || '1.2 MB',
      file_type: resourceData.file_type || 'application/pdf',
      reading_time_minutes: Number(resourceData.reading_time_minutes || 15),
      status: resourceData.status || 'published',
      published_at: resourceData.status === 'published' ? (resourceData.published_at || nowIso) : undefined,
      uploaded_by: resourceData.uploaded_by || currentUser.id,
      uploaded_by_name: resourceData.uploaded_by_name || currentUser.name || 'Church Administration',
      created_at: resourceData.created_at || nowIso,
    };

    try {
      if (supabase) {
        await supabase.from('learning_resources').upsert({
          id: record.id,
          title: record.title,
          description: record.description,
          category: record.category,
          file_name: record.file_name,
          file_url: record.file_url,
          file_size: record.file_size,
          file_type: record.file_type,
          reading_time_minutes: record.reading_time_minutes,
          status: record.status,
          published_at: record.published_at,
          uploaded_by: record.uploaded_by,
          uploaded_by_name: record.uploaded_by_name,
        });
      }
    } catch (e) {
      console.warn('Notice saving resource to Supabase:', e);
    }

    const all = readLocal<LearningResource[]>(KEYS.RESOURCES, INITIAL_RESOURCES);
    const index = all.findIndex(r => r.id === id);
    if (index >= 0) all[index] = record;
    else all.unshift(record);
    writeLocal(KEYS.RESOURCES, all);

    // Notify all tutors
    if (record.status === 'published') {
      try {
        await NotificationService.createNotification({
          userId: 'tutor_community',
          title: `New Learning Material: ${record.title}`,
          message: `Category: ${record.category.toUpperCase()}. A new official document has been added to the Learning Materials library.`,
          type: 'teaching_notes',
          channel: 'in_app',
          metadata: {
            category: 'learning',
            targetTab: 'learning-portal',
            section: 'materials',
            resourceId: record.id,
          },
        });
      } catch (err) {
        console.warn('Notice dispatching material notification:', err);
      }
    }

    return record;
  }

  static async deleteResource(id: string): Promise<void> {
    try {
      if (supabase) {
        await supabase.from('learning_resources').delete().eq('id', id);
      }
    } catch (e) {
      console.warn('Notice deleting resource from Supabase:', e);
    }
    const all = readLocal<LearningResource[]>(KEYS.RESOURCES, INITIAL_RESOURCES);
    writeLocal(KEYS.RESOURCES, all.filter(r => r.id !== id));
  }

  // ============================================================================
  // 6. PARTICIPATION METRICS & GRADES AUDIT
  // ============================================================================
  static async getParticipationMetrics(allProfiles: any[]): Promise<TutorParticipationMetric[]> {
    const [assignments, submissions, quizzes, attempts] = await Promise.all([
      this.getAssignments(false),
      this.getSubmissions(),
      this.getQuizzes(false),
      this.getQuizAttempts(),
    ]);

    const activeTutors = allProfiles.filter(
      p =>
        (p.role === 'cell_leader' || p.role === 'tutor' || p.role !== 'admin') &&
        p.status !== 'inactive' &&
        p.status !== 'deactivated' &&
        !p.is_deactivated
    );

    const metrics: TutorParticipationMetric[] = activeTutors.map(tutor => {
      const tutorSubs = submissions.filter(s => s.tutor_id === tutor.id);
      const tutorAttempts = attempts.filter(a => a.tutor_id === tutor.id);

      // Unique assignments submitted
      const uniqueSubmittedAssignmentIds = new Set(tutorSubs.map(s => s.assignment_id));
      const assignmentsSubmitted = uniqueSubmittedAssignmentIds.size;
      const assignmentsTotal = assignments.length;

      // Unique quizzes completed
      const uniqueCompletedQuizIds = new Set(tutorAttempts.map(a => a.quiz_id));
      const quizzesCompleted = uniqueCompletedQuizIds.size;
      const quizzesTotal = quizzes.length;

      // Average score across graded submissions and quiz attempts
      const gradedGrades = tutorSubs.filter(s => s.grade !== undefined && s.grade !== null).map(s => s.grade as number);
      const quizPercentages = tutorAttempts.map(a => a.percentage);
      const allScores = [...gradedGrades, ...quizPercentages];
      const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

      // Participation rate
      const totalTasks = assignmentsTotal + quizzesTotal;
      const completedTasks = assignmentsSubmitted + quizzesCompleted;
      const participationRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

      // Last activity
      const allDates = [
        ...tutorSubs.map(s => s.submitted_at),
        ...tutorAttempts.map(a => a.completed_at),
      ].filter(Boolean).sort().reverse();
      const lastActivityDate = allDates[0];

      // Status determination
      let status: TutorParticipationMetric['status'] = 'Not started';
      if (completedTasks === totalTasks && totalTasks > 0) {
        status = 'Graded';
      } else if (completedTasks > 0) {
        status = 'In progress';
      } else {
        status = 'Not started';
      }

      return {
        tutor_id: tutor.id,
        tutor_name: tutor.full_name || tutor.username || 'Fellowship Tutor',
        cell_id: tutor.cell_id,
        cell_name: tutor.cell_name || 'Assigned Cell',
        phone: tutor.phone_number,
        assignments_submitted: assignmentsSubmitted,
        assignments_total: assignmentsTotal,
        quizzes_completed: quizzesCompleted,
        quizzes_total: quizzesTotal,
        average_score: avgScore,
        participation_rate: participationRate,
        status,
        last_activity_date: lastActivityDate,
      };
    });

    return metrics;
  }
}
