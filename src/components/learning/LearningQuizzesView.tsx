import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Check,
  X,
  HelpCircle,
  Eye,
  Award,
  Trash2,
  Edit2,
  Send,
  Timer,
  Calendar,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Sparkles,
  BookOpen,
  User,
  Building,
  Search,
  Filter,
  Save,
  MessageSquare,
  Lock,
  Unlock,
  AlertTriangle,
  History,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import {
  Quiz,
  QuizQuestion,
  QuizAttempt,
  QuizSectionType,
  SubjectiveMarkingMethod,
  QuizResultReleasePolicy,
  QuestionGradingDetail,
} from '../../types/learning';
import { LearningService } from '../../services/learningService';

interface LearningQuizzesViewProps {
  quizzes: Quiz[];
  onRefresh: () => void;
}

export const LearningQuizzesView: React.FC<LearningQuizzesViewProps> = ({
  quizzes,
  onRefresh,
}) => {
  const { currentUser, isAdmin } = useAuth();

  // Top-level Navigation Mode (Catalog vs Admin Attempt Monitoring)
  const [activeTab, setActiveTab] = useState<'catalog' | 'monitoring'>('catalog');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  // =========================================================================
  // ADMIN QUIZ BUILDER STATE
  // =========================================================================
  const [isQuizFormOpen, setIsQuizFormOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [builderTab, setBuilderTab] = useState<'general' | 'mcq' | 'subjective' | 'timing' | 'preview'>('general');

  // General details
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizInstructions, setQuizInstructions] = useState('');
  const [quizPassingScore, setQuizPassingScore] = useState('70');

  // Section 1: MCQs
  const [mcqQuestions, setMcqQuestions] = useState<Partial<QuizQuestion>[]>([
    {
      id: `mcq-${Date.now()}-1`,
      section: 'mcq',
      question_type: 'multiple_choice',
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      points: 10,
      explanation: '',
    },
  ]);

  // Section 2: Subjective Questions
  const [subjectiveQuestions, setSubjectiveQuestions] = useState<Partial<QuizQuestion>[]>([]);

  // Timing & Submission Settings
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('15');
  const [customTimeLimit, setCustomTimeLimit] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [allowChangeAnswers, setAllowChangeAnswers] = useState(true);
  const [allowReviewBeforeSubmit, setAllowReviewBeforeSubmit] = useState(true);
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(false);
  const [autoSubmitOnExpiry, setAutoSubmitOnExpiry] = useState(true);
  const [resultReleasePolicy, setResultReleasePolicy] = useState<QuizResultReleasePolicy>('immediate');

  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  // =========================================================================
  // TUTOR QUIZ RUNNER STATE
  // =========================================================================
  const [activeQuizForTest, setActiveQuizForTest] = useState<Quiz | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [quizStartedAt, setQuizStartedAt] = useState<string>('');
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isPreviewReviewOpen, setIsPreviewReviewOpen] = useState(false);
  const [autoSaveNotice, setAutoSaveNotice] = useState<string>('');

  // Result & Attempt Inspection
  const [viewingAttempt, setViewingAttempt] = useState<QuizAttempt | null>(null);

  // =========================================================================
  // ADMIN MONITORING & GRADING QUEUE STATE
  // =========================================================================
  const [allAttempts, setAllAttempts] = useState<QuizAttempt[]>([]);
  const [monitoringQuizFilter, setMonitoringQuizFilter] = useState<string>('all');
  const [monitoringStatusFilter, setMonitoringStatusFilter] = useState<string>('all');
  const [monitoringSearch, setMonitoringSearch] = useState<string>('');
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);

  // Admin Manual Grading Modal
  const [gradingAttempt, setGradingAttempt] = useState<QuizAttempt | null>(null);
  const [gradingQuestionGrades, setGradingQuestionGrades] = useState<Record<string, QuestionGradingDetail>>({});
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [isSavingGrading, setIsSavingGrading] = useState<boolean>(false);

  // Tutor attempts cache for buttons
  const [tutorAttempts, setTutorAttempts] = useState<QuizAttempt[]>([]);

  // Intercept back actions for active quiz runner, quiz builder modal, grading, and preview modals
  useBackHandler(() => {
    if (isPreviewReviewOpen) {
      setIsPreviewReviewOpen(false);
      return true;
    }
    if (gradingAttempt) {
      setGradingAttempt(null);
      return true;
    }
    if (viewingAttempt) {
      setViewingAttempt(null);
      return true;
    }
    if (isQuizFormOpen) {
      setIsQuizFormOpen(false);
      return true;
    }
    if (activeQuizForTest) {
      if (window.confirm('Are you sure you want to exit the quiz? Any unsaved answers may be lost.')) {
        setActiveQuizForTest(null);
      }
      return true;
    }
    return false;
  }, Boolean(isPreviewReviewOpen || gradingAttempt || viewingAttempt || isQuizFormOpen || activeQuizForTest));

  // Load Tutor Attempts
  useEffect(() => {
    if (!isAdmin && currentUser?.id) {
      LearningService.getQuizAttempts(undefined, currentUser.id).then(atts => {
        setTutorAttempts(atts);
      });
    }
  }, [isAdmin, currentUser, quizzes]);

  // Load All Attempts for Admin
  useEffect(() => {
    if (isAdmin) {
      loadAllAdminAttempts();
    }
  }, [isAdmin, quizzes]);

  const loadAllAdminAttempts = async () => {
    setIsLoadingAttempts(true);
    try {
      const atts = await LearningService.getQuizAttempts();
      setAllAttempts(atts);
    } finally {
      setIsLoadingAttempts(false);
    }
  };

  // Continuous auto-save draft for active attempt
  useEffect(() => {
    if (activeQuizForTest && currentUser?.id && quizStartedAt) {
      LearningService.saveQuizDraftAnswers(activeQuizForTest.id, currentUser.id, userAnswers, quizStartedAt);
      setAutoSaveNotice('Draft auto-saved');
      const timer = setTimeout(() => setAutoSaveNotice(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [userAnswers, activeQuizForTest, currentUser, quizStartedAt]);

  // Quiz Countdown Timer
  useEffect(() => {
    if (!activeQuizForTest || timeRemainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimeRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitOnTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuizForTest, timeRemainingSeconds]);

  const handleAutoSubmitOnTimeout = async () => {
    if (!activeQuizForTest) return;
    alert('Time limit reached! Your answers are being submitted automatically.');
    await executeQuizSubmission(true);
  };

  // Calculate Section Totals in Builder
  const mcqTotalPoints = useMemo(() => {
    return mcqQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  }, [mcqQuestions]);

  const subjectiveTotalPoints = useMemo(() => {
    return subjectiveQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  }, [subjectiveQuestions]);

  const grandTotalPoints = mcqTotalPoints + subjectiveTotalPoints;

  // Open Quiz Builder Form
  const handleOpenCreateQuiz = async (q?: Quiz) => {
    if (q) {
      setEditingQuiz(q);
      setQuizTitle(q.title);
      setQuizDescription(q.description);
      setQuizInstructions(q.instructions || '');
      setQuizPassingScore(String(q.passing_score || 70));

      const timing = q.timing_settings;
      setTimeLimitMinutes(timing?.time_limit_minutes ? String(timing.time_limit_minutes) : String(q.time_limit_minutes || 15));
      setMaxAttempts(timing?.max_attempts !== undefined ? String(timing.max_attempts) : '1');
      setOpensAt(timing?.opens_at ? timing.opens_at.slice(0, 16) : (q.published_at ? q.published_at.slice(0, 16) : ''));
      setClosesAt(timing?.closes_at ? timing.closes_at.slice(0, 16) : (q.due_date ? q.due_date.slice(0, 16) : ''));
      setAllowChangeAnswers(timing?.allow_change_answers ?? true);
      setAllowReviewBeforeSubmit(timing?.allow_review_before_submit ?? true);
      setAllowResubmission(timing?.allow_resubmission ?? true);
      setAllowLateSubmissions(timing?.allow_late_submissions ?? false);
      setAutoSubmitOnExpiry(timing?.auto_submit_on_expiry ?? true);
      setResultReleasePolicy(timing?.result_release_policy || 'immediate');

      const questions = await LearningService.getQuizQuestions(q.id, false);
      const mcqs = questions.filter(
        item => item.section === 'mcq' || item.question_type === 'multiple_choice' || item.question_type === 'true_false'
      );
      const subjectives = questions.filter(
        item => item.section === 'subjective' || item.question_type === 'written'
      );

      setMcqQuestions(mcqs.length > 0 ? mcqs : []);
      setSubjectiveQuestions(subjectives);
    } else {
      setEditingQuiz(null);
      setQuizTitle('');
      setQuizDescription('');
      setQuizInstructions('');
      setQuizPassingScore('70');
      setTimeLimitMinutes('15');
      setCustomTimeLimit('');
      setMaxAttempts('1');
      const now = new Date();
      setOpensAt(now.toISOString().slice(0, 16));
      const in7Days = new Date(Date.now() + 7 * 86400000);
      setClosesAt(in7Days.toISOString().slice(0, 16));
      setAllowChangeAnswers(true);
      setAllowReviewBeforeSubmit(true);
      setAllowResubmission(true);
      setAllowLateSubmissions(false);
      setAutoSubmitOnExpiry(true);
      setResultReleasePolicy('immediate');

      setMcqQuestions([
        {
          id: `mcq-${Date.now()}-1`,
          section: 'mcq',
          question_type: 'multiple_choice',
          question_text: '',
          options: ['', '', '', ''],
          correct_answer: 0,
          points: 10,
          explanation: '',
        },
      ]);
      setSubjectiveQuestions([]);
    }
    setBuilderTab('general');
    setIsQuizFormOpen(true);
  };

  // Add MCQ Question
  const handleAddMcqQuestion = () => {
    setMcqQuestions(prev => [
      ...prev,
      {
        id: `mcq-${Date.now()}-${prev.length + 1}`,
        section: 'mcq',
        question_type: 'multiple_choice',
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        points: 10,
        explanation: '',
      },
    ]);
  };

  // Add Subjective Question
  const handleAddSubjectiveQuestion = () => {
    setSubjectiveQuestions(prev => [
      ...prev,
      {
        id: `sub-${Date.now()}-${prev.length + 1}`,
        section: 'subjective',
        question_type: 'written',
        question_text: '',
        marking_method: 'automatic',
        expected_answer: '',
        acceptable_alternatives: [],
        keywords: [],
        points: 10,
      },
    ]);
  };

  // Save Quiz (Draft or Published)
  const handleSaveQuiz = async (publishStatus: 'draft' | 'published') => {
    if (!quizTitle.trim()) {
      alert('Please provide a Quiz Title.');
      setBuilderTab('general');
      return;
    }

    const allQuestions = [...mcqQuestions, ...subjectiveQuestions];
    if (allQuestions.length === 0) {
      alert('Please add at least one question (MCQ or Subjective).');
      return;
    }

    const effectiveDuration = timeLimitMinutes === 'custom'
      ? Number(customTimeLimit) || 15
      : Number(timeLimitMinutes);

    setIsSavingQuiz(true);
    try {
      await LearningService.saveQuiz(
        {
          id: editingQuiz?.id,
          title: quizTitle,
          description: quizDescription,
          instructions: quizInstructions,
          passing_score: Number(quizPassingScore) || 70,
          status: publishStatus,
          due_date: closesAt ? new Date(closesAt).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
          timing_settings: {
            opens_at: opensAt ? new Date(opensAt).toISOString() : new Date().toISOString(),
            closes_at: closesAt ? new Date(closesAt).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
            timezone: 'Africa/Accra',
            time_limit_minutes: effectiveDuration,
            max_attempts: Number(maxAttempts) || 1,
            allow_change_answers: allowChangeAnswers,
            allow_review_before_submit: allowReviewBeforeSubmit,
            allow_resubmission: allowResubmission,
            allow_late_submissions: allowLateSubmissions,
            auto_submit_on_expiry: autoSubmitOnExpiry,
            result_release_policy: resultReleasePolicy,
          },
        },
        allQuestions,
        currentUser || { id: 'admin-1' }
      );

      setIsQuizFormOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('Error saving quiz: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSavingQuiz(false);
    }
  };

  // Tutor Starts or Resumes a Quiz
  const handleStartQuiz = async (quiz: Quiz) => {
    // 1. Availability validation
    const timing = quiz.timing_settings;
    const nowIso = new Date().toISOString();

    if (timing?.opens_at && nowIso < timing.opens_at) {
      alert(`This quiz opens on ${new Date(timing.opens_at).toLocaleString('en-US', { timeZone: 'Africa/Accra' })} (Ghana Time).`);
      return;
    }

    if (timing?.closes_at && nowIso > timing.closes_at && !timing.allow_late_submissions) {
      alert(`This quiz closed on ${new Date(timing.closes_at).toLocaleString('en-US', { timeZone: 'Africa/Accra' })}.`);
      return;
    }

    // 2. Max attempts check
    const myAttempts = tutorAttempts.filter(a => a.quiz_id === quiz.id);
    const maxAtt = timing?.max_attempts ?? 1;
    if (maxAtt > 0 && myAttempts.length >= maxAtt) {
      alert(`You have reached the maximum allowed attempts (${maxAtt} of ${maxAtt}) for this quiz.`);
      return;
    }

    // 3. Check for existing active draft to resume
    const draft = LearningService.getQuizDraftAnswers(quiz.id, currentUser?.id || 'tutor');
    let startIso = new Date().toISOString();
    let initialAnswers: Record<string, any> = {};

    const questions = await LearningService.getQuizQuestions(quiz.id, true);
    setActiveQuestions(questions);

    if (draft && draft.startedAt) {
      startIso = draft.startedAt;
      initialAnswers = draft.answers || {};
    }

    // Calculate time remaining based on started_at
    const durationMinutes = timing?.time_limit_minutes ?? quiz.time_limit_minutes ?? 15;
    if (durationMinutes > 0) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
      const totalAllowedSeconds = durationMinutes * 60;
      const remaining = Math.max(0, totalAllowedSeconds - elapsedSeconds);
      if (remaining <= 0) {
        alert('Your active attempt time has expired. Submitting your saved answers.');
        setUserAnswers(initialAnswers);
        await executeQuizSubmission(true, quiz, initialAnswers, startIso);
        return;
      }
      setTimeRemainingSeconds(remaining);
    } else {
      setTimeRemainingSeconds(0); // unlimited
    }

    setActiveQuizForTest(quiz);
    setQuizStartedAt(startIso);
    setUserAnswers(initialAnswers);
  };

  // Submit Quiz Attempt
  const executeQuizSubmission = async (
    isAutoExpired = false,
    quizToSubmit?: Quiz,
    overrideAnswers?: Record<string, any>,
    overrideStartedAt?: string
  ) => {
    const quiz = quizToSubmit || activeQuizForTest;
    if (!quiz || !currentUser) return;

    setIsSubmittingQuiz(true);
    try {
      const answersToSend = overrideAnswers || userAnswers;
      const startToSend = overrideStartedAt || quizStartedAt;

      const attempt = await LearningService.submitQuizAttempt({
        quizId: quiz.id,
        tutorId: currentUser.id,
        tutorName: currentUser.full_name || 'Tutor',
        cellId: currentUser.cell_id,
        cellName: currentUser.cell_name,
        answers: answersToSend,
        startedAt: startToSend,
        isAutoSubmittedOnExpiry: isAutoExpired,
      });

      setActiveQuizForTest(null);
      setIsPreviewReviewOpen(false);
      setViewingAttempt(attempt);

      // Refresh attempts cache
      if (!isAdmin) {
        const atts = await LearningService.getQuizAttempts(undefined, currentUser.id);
        setTutorAttempts(atts);
      } else {
        loadAllAdminAttempts();
      }
      onRefresh();
    } catch (err: any) {
      alert('Error submitting quiz: ' + (err?.message || 'Please check connection'));
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // Admin opens Attempt for Manual Grading & Review
  const handleOpenGradingModal = (attempt: QuizAttempt) => {
    setGradingAttempt(attempt);
    setGradingQuestionGrades(attempt.question_grades ? { ...attempt.question_grades } : {});
    setGradingFeedback(attempt.feedback || '');
  };

  // Admin saves graded attempt
  const handleSaveGrading = async (releaseResults: boolean) => {
    if (!gradingAttempt) return;
    setIsSavingGrading(true);
    try {
      await LearningService.updateQuizAttemptGrading({
        attemptId: gradingAttempt.id,
        questionGrades: gradingQuestionGrades,
        feedback: gradingFeedback,
        releaseResults,
        adminUser: currentUser || { id: 'admin-1', full_name: 'Administrator' },
      });

      setGradingAttempt(null);
      loadAllAdminAttempts();
      onRefresh();
    } catch (err: any) {
      alert('Error saving grading: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSavingGrading(false);
    }
  };

  // Format MM:SS for countdown timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Filter Catalog
  const filteredQuizzes = quizzes.filter(q => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (catalogSearch.trim()) {
      const term = catalogSearch.toLowerCase();
      return (
        q.title.toLowerCase().includes(term) ||
        q.description.toLowerCase().includes(term) ||
        (q.instructions && q.instructions.toLowerCase().includes(term))
      );
    }
    return true;
  });

  // Filter Monitoring Attempts
  const filteredAttempts = allAttempts.filter(att => {
    if (monitoringQuizFilter !== 'all' && att.quiz_id !== monitoringQuizFilter) return false;
    if (monitoringStatusFilter !== 'all' && att.status !== monitoringStatusFilter) return false;
    if (monitoringSearch.trim()) {
      const term = monitoringSearch.toLowerCase();
      return (
        att.tutor_name.toLowerCase().includes(term) ||
        (att.cell_name && att.cell_name.toLowerCase().includes(term)) ||
        (att.quiz_title && att.quiz_title.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const pendingGradingCount = allAttempts.filter(a => a.grading_status === 'awaiting_grading').length;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 1. Header & Navigation Modes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E8EF] dark:border-[#26384d]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#142B4A] dark:text-white tracking-tight">
              Quizzes & Knowledge Checks
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
              MCQs &bull; Subjective &bull; Timed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#667085] dark:text-slate-400 mt-0.5">
            Institutional knowledge validation, automated multiple choice tests, and pastoral subjective writing.
          </p>
        </div>

        {/* Admin Navigation Tabs & Action */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex items-center bg-[#F5F7FA] dark:bg-[#172437] p-1 rounded-xl border border-[#E3E8EF] dark:border-[#26384d]">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'catalog'
                    ? 'bg-[#142B4A] text-white shadow-2xs'
                    : 'text-[#667085] dark:text-slate-400 hover:text-[#182230]'
                }`}
              >
                Quiz Catalog
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('monitoring')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'monitoring'
                    ? 'bg-[#142B4A] text-white shadow-2xs'
                    : 'text-[#667085] dark:text-slate-400 hover:text-[#182230]'
                }`}
              >
                <span>Attempt Monitoring</span>
                {pendingGradingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
                    {pendingGradingCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleOpenCreateQuiz()}
              className="px-4 py-2 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#C6A45A]" />
              <span>Create New Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB 1: QUIZ CATALOG                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111c2d] p-3 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="Search quizzes by title or topic..."
                className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
              />
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1.5">
                {(['all', 'published', 'draft', 'archived'] as const).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                      statusFilter === status
                        ? 'bg-[#142B4A] text-white font-bold'
                        : 'bg-[#F5F7FA] dark:bg-[#172437] text-[#667085] dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quizzes Grid */}
          {filteredQuizzes.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-8">
              <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
                No Quizzes Found
              </h3>
              <p className="text-xs text-[#667085] dark:text-slate-400 mt-1 max-w-md mx-auto">
                {isAdmin
                  ? 'Click "Create New Quiz" above to author multiple-choice and subjective questions.'
                  : 'There are no active quizzes available for your fellowship cohort at this moment.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map(quiz => {
                const myAttempts = tutorAttempts.filter(a => a.quiz_id === quiz.id);
                const timing = quiz.timing_settings;
                const maxAtt = timing?.max_attempts ?? 1;
                const attemptsRemaining = maxAtt === 0 ? 'Unlimited' : Math.max(0, maxAtt - myAttempts.length);
                const hasReachedLimit = maxAtt > 0 && myAttempts.length >= maxAtt;
                const latestAttempt = myAttempts[0];

                const nowIso = new Date().toISOString();
                const isNotYetOpen = timing?.opens_at && nowIso < timing.opens_at;
                const isClosed = timing?.closes_at && nowIso > timing.closes_at;

                return (
                  <div
                    key={quiz.id}
                    className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {quiz.status === 'published' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                              PUBLISHED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold">
                              DRAFT
                            </span>
                          )}

                          {quiz.has_mcq && quiz.has_subjective ? (
                            <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300 text-[10px] font-bold">
                              MCQ + Written
                            </span>
                          ) : quiz.has_subjective ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 text-[10px] font-bold">
                              Subjective Only
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold">
                              MCQ Only
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                          {quiz.total_points} Pts
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-bold text-sm sm:text-base text-[#182230] dark:text-white line-clamp-1">
                        {quiz.title}
                      </h3>
                      <p className="text-xs text-[#667085] dark:text-slate-400 mt-1 line-clamp-2">
                        {quiz.description || 'Comprehensive institutional training quiz.'}
                      </p>

                      {/* Metrics Info */}
                      <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#172437] text-[11px]">
                        <div>
                          <span className="text-[#667085] dark:text-slate-400 block text-[10px]">Duration</span>
                          <span className="font-bold text-[#182230] dark:text-white flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-[#C6A45A]" />
                            {quiz.time_limit_minutes > 0 ? `${quiz.time_limit_minutes} Mins` : 'Untimed'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#667085] dark:text-slate-400 block text-[10px]">Pass Mark</span>
                          <span className="font-bold text-[#182230] dark:text-white mt-0.5 block">
                            {quiz.passing_score}%
                          </span>
                        </div>
                      </div>

                      {/* Tutor Attempt Info */}
                      {!isAdmin && (
                        <div className="mb-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[#667085]">Attempts:</span>
                            <span className="font-bold text-[#142B4A] dark:text-white">
                              {myAttempts.length} of {maxAtt === 0 ? 'Unlimited' : maxAtt} used ({attemptsRemaining} left)
                            </span>
                          </div>
                          {latestAttempt && (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-[#667085]">Latest Status:</span>
                              <span className={`font-bold ${
                                latestAttempt.passed ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {latestAttempt.grading_status === 'awaiting_grading'
                                  ? 'Awaiting Manual Grading'
                                  : `${latestAttempt.percentage}% (${latestAttempt.passed ? 'Passed' : 'Not Passed'})`}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between gap-2">
                      {isAdmin ? (
                        <>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenCreateQuiz(quiz)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                              title="Edit Quiz"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMonitoringQuizFilter(quiz.id);
                                setActiveTab('monitoring');
                              }}
                              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold"
                              title="View Attempts"
                            >
                              Attempts
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartQuiz(quiz)}
                            className="px-3 py-1.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3 h-3 text-[#C6A45A]" />
                            <span>Test Run</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {latestAttempt && (
                            <button
                              type="button"
                              onClick={() => setViewingAttempt(latestAttempt)}
                              className="text-xs font-bold text-[#7F56D9] hover:underline"
                            >
                              View Result
                            </button>
                          )}

                          {isNotYetOpen ? (
                            <span className="text-[11px] text-amber-600 font-bold">
                              Opens {new Date(timing!.opens_at!).toLocaleDateString()}
                            </span>
                          ) : isClosed && !timing?.allow_late_submissions ? (
                            <span className="text-[11px] text-rose-600 font-bold">
                              Closed
                            </span>
                          ) : hasReachedLimit ? (
                            <span className="text-[11px] text-slate-500 font-bold">
                              Limit Reached
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartQuiz(quiz)}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ml-auto"
                            >
                              <Play className="w-3.5 h-3.5 text-[#C6A45A]" />
                              <span>{myAttempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB 2: ADMIN ATTEMPT MONITORING & GRADING QUEUE                         */}
      {/* ========================================================================= */}
      {activeTab === 'monitoring' && isAdmin && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111c2d] p-3.5 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={monitoringSearch}
                onChange={e => setMonitoringSearch(e.target.value)}
                placeholder="Search attempts by tutor name, cell or quiz title..."
                className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={monitoringQuizFilter}
                onChange={e => setMonitoringQuizFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] text-xs font-semibold bg-[#F5F7FA] dark:bg-[#172437] text-[#182230] dark:text-white"
              >
                <option value="all">All Quizzes</option>
                {quizzes.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>

              <select
                value={monitoringStatusFilter}
                onChange={e => setMonitoringStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] text-xs font-semibold bg-[#F5F7FA] dark:bg-[#172437] text-[#182230] dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="awaiting_grading">Awaiting Grading</option>
                <option value="graded">Graded</option>
                <option value="submitted">Submitted</option>
                <option value="submitted_late">Submitted Late</option>
                <option value="time_expired">Time Expired</option>
              </select>
            </div>
          </div>

          {/* Attempts List */}
          {isLoadingAttempts ? (
            <div className="py-12 text-center text-xs text-[#667085]">
              Loading candidate attempts...
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-8">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
                No Attempts Match Filters
              </h3>
              <p className="text-xs text-[#667085] mt-1">
                When tutors complete or submit quizzes, their attempts and subjective answers appear here for monitoring and review.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] overflow-hidden shadow-2xs">
              <div className="table-scroll-container">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F7FA] dark:bg-[#172437] border-b border-[#E3E8EF] dark:border-[#26384d] text-[#667085] font-bold">
                    <tr>
                      <th className="p-3.5">Tutor & Cell</th>
                      <th className="p-3.5">Quiz Title</th>
                      <th className="p-3.5">Attempt</th>
                      <th className="p-3.5">Submitted</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Score</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8EF] dark:divide-[#26384d]">
                    {filteredAttempts.map(att => (
                      <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-[#172437]/50 transition-colors">
                        <td className="p-3.5 font-bold text-[#182230] dark:text-white">
                          <div>{att.tutor_name}</div>
                          <div className="text-[11px] font-normal text-[#667085]">
                            {att.cell_name || 'Cell Leader'}
                          </div>
                        </td>
                        <td className="p-3.5 font-semibold text-[#182230] dark:text-white">
                          {att.quiz_title || att.quiz_id}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold">
                            Attempt #{att.attempt_number || 1}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#667085]">
                          {att.completed_at ? new Date(att.completed_at).toLocaleString() : 'In Progress'}
                        </td>
                        <td className="p-3.5">
                          {att.grading_status === 'awaiting_grading' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-black border border-amber-200">
                              Awaiting Grading
                            </span>
                          ) : att.status === 'time_expired' ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-bold">
                              Time Expired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                              Graded
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-black text-[#142B4A] dark:text-white">
                          {att.score}/{att.total_possible} ({att.percentage}%)
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenGradingModal(att)}
                            className="px-3 py-1.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Award className="w-3.5 h-3.5 text-[#C6A45A]" />
                            <span>{att.grading_status === 'awaiting_grading' ? 'Grade Work' : 'Review'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ADMIN MODAL: REDESIGNED QUIZ BUILDER                                   */}
      {/* ========================================================================= */}
      {isQuizFormOpen && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-6 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF] dark:border-[#26384d] shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-[#C6A45A] tracking-wider">
                  Quiz Authoring Suite
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#142B4A] dark:text-white">
                  {editingQuiz ? 'Edit Quiz' : 'Create New Assessment'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuizFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#182230] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Builder Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto py-2.5 border-b border-[#E3E8EF] dark:border-[#26384d] shrink-0">
              {[
                { id: 'general', label: '1. General Info' },
                { id: 'mcq', label: `2. MCQs (${mcqQuestions.length})` },
                { id: 'subjective', label: `3. Subjective (${subjectiveQuestions.length})` },
                { id: 'timing', label: '4. Timing & Submission' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBuilderTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                    builderTab === tab.id
                      ? 'bg-[#142B4A] text-white shadow-2xs'
                      : 'text-[#667085] hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 custom-scrollbar pr-1">
              {/* TAB 1: GENERAL INFO */}
              {builderTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#182230] dark:text-white mb-1">
                      Quiz Title *
                    </label>
                    <input
                      type="text"
                      value={quizTitle}
                      onChange={e => setQuizTitle(e.target.value)}
                      placeholder="e.g. Cell Discipleship & Leadership Assessment"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#182230] dark:text-white mb-1">
                      Description & Overview
                    </label>
                    <textarea
                      rows={2}
                      value={quizDescription}
                      onChange={e => setQuizDescription(e.target.value)}
                      placeholder="Brief overview explaining the objective and scope of this quiz..."
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-xs focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#182230] dark:text-white mb-1">
                      Instructions for Tutors
                    </label>
                    <textarea
                      rows={2}
                      value={quizInstructions}
                      onChange={e => setQuizInstructions(e.target.value)}
                      placeholder="Guidelines: 'Answer all multiple choice questions, and provide thoughtful written answers for subjective sections...'"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-xs focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#182230] dark:text-white mb-1">
                        Passing Score Percentage (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={quizPassingScore}
                        onChange={e => setQuizPassingScore(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MULTIPLE CHOICE QUESTIONS (MCQs) */}
              {builderTab === 'mcq' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <div>
                      <h4 className="text-xs font-bold text-[#142B4A] dark:text-white">
                        Section 1: Multiple Choice Questions (MCQs)
                      </h4>
                      <p className="text-[11px] text-[#667085] dark:text-slate-400">
                        Each question has options (A, B, C, D). Mark the correct radio option. The system evaluates answers automatically.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#142B4A] text-white text-xs font-black shrink-0">
                      Subtotal: {mcqTotalPoints} Pts
                    </span>
                  </div>

                  {mcqQuestions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#142B4A] dark:text-white uppercase tracking-wider">
                          MCQ Question #{idx + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-[#667085]">Marks:</span>
                            <input
                              type="number"
                              min="1"
                              value={q.points || 10}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setMcqQuestions(prev => {
                                  const c = [...prev];
                                  c[idx].points = val;
                                  return c;
                                });
                              }}
                              className="w-16 px-2 py-1 text-xs font-black rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111c2d]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setMcqQuestions(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50"
                            title="Remove Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        value={q.question_text || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setMcqQuestions(prev => {
                            const c = [...prev];
                            c[idx].question_text = val;
                            return c;
                          });
                        }}
                        placeholder={`Enter question text #${idx + 1}...`}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111c2d] text-xs font-semibold focus:outline-none"
                      />

                      {/* 4 Options: A, B, C, D */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                          const isCorrect = Number(q.correct_answer) === optIdx;
                          return (
                            <div
                              key={letter}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                isCorrect
                                  ? 'border-[#C6A45A] bg-amber-50/50 dark:bg-amber-950/20'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111c2d]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setMcqQuestions(prev => {
                                    const c = [...prev];
                                    c[idx].correct_answer = optIdx;
                                    return c;
                                  });
                                }}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-transform ${
                                  isCorrect
                                    ? 'bg-[#142B4A] text-[#C6A45A] ring-2 ring-[#C6A45A]'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                                title="Set as correct answer"
                              >
                                {letter}
                              </button>
                              <input
                                type="text"
                                value={(q.options && q.options[optIdx]) || ''}
                                onChange={e => {
                                  const text = e.target.value;
                                  setMcqQuestions(prev => {
                                    const c = [...prev];
                                    const opts = c[idx].options ? [...c[idx].options!] : ['', '', '', ''];
                                    opts[optIdx] = text;
                                    c[idx].options = opts;
                                    return c;
                                  });
                                }}
                                placeholder={`Option ${letter}...`}
                                className="w-full text-xs bg-transparent focus:outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddMcqQuestion}
                    className="w-full py-2.5 rounded-2xl border-2 border-dashed border-[#142B4A]/30 hover:border-[#142B4A] dark:border-slate-700 text-[#142B4A] dark:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Multiple Choice Question (MCQ)</span>
                  </button>
                </div>
              )}

              {/* TAB 3: SUBJECTIVE QUESTIONS */}
              {builderTab === 'subjective' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800">
                    <div>
                      <h4 className="text-xs font-bold text-[#142B4A] dark:text-white">
                        Section 2: Subjective Written Questions
                      </h4>
                      <p className="text-[11px] text-[#667085] dark:text-slate-400">
                        Assign Automatic Marking (keyword & model answer matching) or Manual Marking (queue for Admin review & feedback).
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#142B4A] text-white text-xs font-black shrink-0">
                      Subtotal: {subjectiveTotalPoints} Pts
                    </span>
                  </div>

                  {subjectiveQuestions.map((q, idx) => {
                    const isAuto = q.marking_method === 'automatic';
                    return (
                      <div
                        key={q.id || idx}
                        className="p-4 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#142B4A] dark:text-white uppercase tracking-wider">
                            Subjective Question #{idx + 1}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-[#667085]">Marks:</span>
                              <input
                                type="number"
                                min="1"
                                value={q.points || 10}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setSubjectiveQuestions(prev => {
                                    const c = [...prev];
                                    c[idx].points = val;
                                    return c;
                                  });
                                }}
                                className="w-16 px-2 py-1 text-xs font-black rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111c2d]"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSubjectiveQuestions(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50"
                              title="Remove Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={q.question_text || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setSubjectiveQuestions(prev => {
                              const c = [...prev];
                              c[idx].question_text = val;
                              return c;
                            });
                          }}
                          placeholder={`Enter subjective question prompt #${idx + 1}...`}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111c2d] text-xs font-semibold focus:outline-none"
                        />

                        {/* Marking Method Switcher */}
                        <div className="pt-1">
                          <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block mb-1">
                            Marking Method:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSubjectiveQuestions(prev => {
                                  const c = [...prev];
                                  c[idx].marking_method = 'automatic';
                                  return c;
                                });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isAuto
                                  ? 'bg-[#142B4A] text-white shadow-2xs'
                                  : 'bg-white dark:bg-[#111c2d] border border-slate-300 dark:border-slate-700 text-[#667085]'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#C6A45A]" />
                              <span>Automatic Marking</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSubjectiveQuestions(prev => {
                                  const c = [...prev];
                                  c[idx].marking_method = 'manual';
                                  return c;
                                });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                !isAuto
                                  ? 'bg-[#142B4A] text-white shadow-2xs'
                                  : 'bg-white dark:bg-[#111c2d] border border-slate-300 dark:border-slate-700 text-[#667085]'
                              }`}
                            >
                              <Award className="w-3.5 h-3.5 text-[#C6A45A]" />
                              <span>Manual Marking</span>
                            </button>
                          </div>
                        </div>

                        {/* Automatic Marking Fields */}
                        {isAuto ? (
                          <div className="space-y-2.5 p-3 rounded-xl bg-white dark:bg-[#111c2d] border border-slate-200 dark:border-slate-700">
                            <div>
                              <label className="block text-[11px] font-bold text-[#182230] dark:text-white mb-1">
                                Expected / Model Answer *
                              </label>
                              <textarea
                                rows={2}
                                value={q.expected_answer || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setSubjectiveQuestions(prev => {
                                    const c = [...prev];
                                    c[idx].expected_answer = val;
                                    return c;
                                  });
                                }}
                                placeholder="Enter the exact or primary model answer..."
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F5F7FA] dark:bg-[#172437]"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-[#182230] dark:text-white mb-1">
                                Acceptable Alternative Answers (One per line)
                              </label>
                              <textarea
                                rows={2}
                                value={(q.acceptable_alternatives || []).join('\n')}
                                onChange={e => {
                                  const lines = e.target.value.split('\n');
                                  setSubjectiveQuestions(prev => {
                                    const c = [...prev];
                                    c[idx].acceptable_alternatives = lines;
                                    return c;
                                  });
                                }}
                                placeholder="Alternative acceptable phrasing 1&#10;Alternative acceptable phrasing 2"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F5F7FA] dark:bg-[#172437]"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-[#182230] dark:text-white mb-1">
                                Relevant Keywords (Comma-separated)
                              </label>
                              <input
                                type="text"
                                value={(q.keywords || []).join(', ')}
                                onChange={e => {
                                  const kws = e.target.value.split(',').map(s => s.trim());
                                  setSubjectiveQuestions(prev => {
                                    const c = [...prev];
                                    c[idx].keywords = kws;
                                    return c;
                                  });
                                }}
                                placeholder="e.g. faith, righteousness, grace, salvation"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F5F7FA] dark:bg-[#172437]"
                              />
                              <p className="text-[10px] text-[#667085] mt-1">
                                The system analyzes keyword presence and awards proportional marks. Admin can review and override anytime.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Manual Grading Policy:</span> You do not need to provide expected answers. When tutors submit, their responses will be placed into the Admin Attempt Monitoring queue for personal review, mark assignment, and feedback.
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleAddSubjectiveQuestion}
                    className="w-full py-2.5 rounded-2xl border-2 border-dashed border-[#142B4A]/30 hover:border-[#142B4A] dark:border-slate-700 text-[#142B4A] dark:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Subjective Written Question</span>
                  </button>
                </div>
              )}

              {/* TAB 4: TIMING & SUBMISSION SETTINGS */}
              {builderTab === 'timing' && (
                <div className="space-y-5">
                  {/* Availability */}
                  <div className="p-4 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#C6A45A]" />
                      <h4 className="text-xs font-bold text-[#142B4A] dark:text-white">
                        Quiz Availability Window
                      </h4>
                      <span className="ml-auto text-[10px] font-bold text-[#667085]">
                        Timezone: Africa/Accra (GMT+0)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-[#182230] dark:text-white mb-1">
                          Opening Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={opensAt}
                          onChange={e => setOpensAt(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111c2d] font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#182230] dark:text-white mb-1">
                          Closing Date & Time (Deadline)
                        </label>
                        <input
                          type="datetime-local"
                          value={closesAt}
                          onChange={e => setClosesAt(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111c2d] font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="p-4 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] space-y-3">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-[#C6A45A]" />
                      <h4 className="text-xs font-bold text-[#142B4A] dark:text-white">
                        Quiz Duration & Countdown
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { label: 'No Limit', val: '0' },
                        { label: '15 mins', val: '15' },
                        { label: '30 mins', val: '30' },
                        { label: '45 mins', val: '45' },
                        { label: '1 hour', val: '60' },
                        { label: '1h 30m', val: '90' },
                        { label: '2 hours', val: '120' },
                        { label: 'Custom', val: 'custom' },
                      ].map(item => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setTimeLimitMinutes(item.val)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            timeLimitMinutes === item.val
                              ? 'bg-[#142B4A] text-white shadow-2xs'
                              : 'bg-white dark:bg-[#111c2d] border border-slate-300 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}

                      {timeLimitMinutes === 'custom' && (
                        <input
                          type="number"
                          min="1"
                          placeholder="Minutes"
                          value={customTimeLimit}
                          onChange={e => setCustomTimeLimit(e.target.value)}
                          className="w-24 px-3 py-1.5 text-xs font-bold rounded-xl border border-[#C6A45A] bg-white dark:bg-[#111c2d]"
                        />
                      )}
                    </div>
                  </div>

                  {/* Submission Attempts */}
                  <div className="p-4 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] space-y-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#C6A45A]" />
                      <h4 className="text-xs font-bold text-[#142B4A] dark:text-white">
                        Maximum Submission Attempts
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { label: '1 Attempt', val: '1' },
                        { label: '2 Attempts', val: '2' },
                        { label: '3 Attempts', val: '3' },
                        { label: '5 Attempts', val: '5' },
                        { label: 'Unlimited', val: '0' },
                      ].map(item => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setMaxAttempts(item.val)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            maxAttempts === item.val
                              ? 'bg-[#142B4A] text-white shadow-2xs'
                              : 'bg-white dark:bg-[#111c2d] border border-slate-300 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submission Rules & Toggles */}
                  <div className="p-4 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] space-y-2.5">
                    <h4 className="text-xs font-bold text-[#142B4A] dark:text-white mb-2">
                      Candidate Submission Rules
                    </h4>

                    {[
                      { label: 'Allow tutors to change answers before submission', state: allowChangeAnswers, set: setAllowChangeAnswers },
                      { label: 'Allow review screen before final submission', state: allowReviewBeforeSubmit, set: setAllowReviewBeforeSubmit },
                      { label: 'Allow resubmission within remaining attempts', state: allowResubmission, set: setAllowResubmission },
                      { label: 'Allow late submissions after closing time', state: allowLateSubmissions, set: setAllowLateSubmissions },
                      { label: 'Automatically submit answers when countdown expires', state: autoSubmitOnExpiry, set: setAutoSubmitOnExpiry },
                    ].map(rule => (
                      <label key={rule.label} className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={rule.state}
                          onChange={e => rule.set(e.target.checked)}
                          className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A]"
                        />
                        <span className="text-[#182230] dark:text-white">{rule.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Result Release Policy */}
                  <div className="p-4 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] space-y-3">
                    <h4 className="text-xs font-bold text-[#142B4A] dark:text-white">
                      Results & Answer Visibility
                    </h4>

                    <div className="space-y-2">
                      {[
                        { id: 'immediate', title: 'Immediately after submission (if all questions auto-graded)' },
                        { id: 'after_close', title: 'After quiz availability window closes' },
                        { id: 'manual', title: 'Only after Admin manually releases results' },
                      ].map(pol => (
                        <label key={pol.id} className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold">
                          <input
                            type="radio"
                            name="resultPolicy"
                            checked={resultReleasePolicy === pol.id}
                            onChange={() => setResultReleasePolicy(pol.id as any)}
                            className="w-4 h-4 text-[#142B4A]"
                          />
                          <span className="text-[#182230] dark:text-white">{pol.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Summary Bar & Footer Actions */}
            <div className="pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-[#667085]">
                  MCQ: <strong className="text-[#142B4A] dark:text-white">{mcqTotalPoints} pts</strong>
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="font-bold text-[#667085]">
                  Subjective: <strong className="text-[#142B4A] dark:text-white">{subjectiveTotalPoints} pts</strong>
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="font-bold text-[#142B4A] dark:text-white">
                  Total: <strong className="text-[#C6A45A] font-black">{grandTotalPoints} pts</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuizFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingQuiz}
                  onClick={() => handleSaveQuiz('draft')}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={isSavingQuiz}
                  onClick={() => handleSaveQuiz('published')}
                  className="px-5 py-2 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#C6A45A]" />
                  <span>{isSavingQuiz ? 'Saving...' : 'Publish Quiz'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TUTOR RUNNER MODAL: TAKING A QUIZ                                      */}
      {/* ========================================================================= */}
      {activeQuizForTest && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-6 max-h-[92vh] flex flex-col">
            {/* Top Bar: Title, Attempts, Countdown & Auto-save */}
            <div className="pb-3 border-b border-[#E3E8EF] dark:border-[#26384d] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="font-bold text-base text-[#142B4A] dark:text-white">
                  {activeQuizForTest.title}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-[#667085] mt-0.5">
                  <span>
                    Attempt #{tutorAttempts.filter(a => a.quiz_id === activeQuizForTest.id).length + 1}
                  </span>
                  {autoSaveNotice && (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {autoSaveNotice}
                    </span>
                  )}
                </div>
              </div>

              {timeRemainingSeconds > 0 && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs ${
                  timeRemainingSeconds < 120
                    ? 'bg-rose-50 text-rose-600 animate-pulse'
                    : 'bg-amber-50 text-amber-800'
                }`}>
                  <Timer className="w-4 h-4" />
                  <span>{formatTimer(timeRemainingSeconds)}</span>
                </div>
              )}
            </div>

            {/* Questions Container */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 custom-scrollbar pr-1">
              {/* SECTION 1: MCQs */}
              {activeQuestions.filter(q => q.section === 'mcq' || q.question_type === 'multiple_choice').length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200">
                    <span className="font-bold text-xs text-[#142B4A] dark:text-white">
                      Section 1: Multiple Choice Questions
                    </span>
                    <span className="text-[10px] font-bold text-[#667085]">
                      Select the best option
                    </span>
                  </div>

                  {activeQuestions
                    .filter(q => q.section === 'mcq' || q.question_type === 'multiple_choice')
                    .map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-4 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs sm:text-sm text-[#182230] dark:text-white">
                            {idx + 1}. {q.question_text}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 shrink-0">
                            {q.points} Pts
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                            const isSelected = userAnswers[q.id] === optIdx;
                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={() => {
                                  setUserAnswers(prev => ({ ...prev, [q.id]: optIdx }));
                                }}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#142B4A] text-white border-[#142B4A] shadow-xs'
                                    : 'bg-white dark:bg-[#111c2d] border-slate-200 dark:border-slate-700 text-[#182230] dark:text-white hover:bg-slate-100'
                                }`}
                              >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                  isSelected ? 'bg-[#C6A45A] text-[#142B4A]' : 'bg-slate-100 dark:bg-slate-800'
                                }`}>
                                  {letter}
                                </span>
                                <span className="text-xs font-semibold">
                                  {(q.options && q.options[optIdx]) || `Option ${letter}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* SECTION 2: SUBJECTIVE QUESTIONS */}
              {activeQuestions.filter(q => q.section === 'subjective' || q.question_type === 'written').length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200">
                    <span className="font-bold text-xs text-[#142B4A] dark:text-white">
                      Section 2: Subjective Written Questions
                    </span>
                    <span className="text-[10px] font-bold text-[#667085]">
                      Write your answers clearly
                    </span>
                  </div>

                  {activeQuestions
                    .filter(q => q.section === 'subjective' || q.question_type === 'written')
                    .map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-4 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs sm:text-sm text-[#182230] dark:text-white">
                            {idx + 1}. {q.question_text}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 shrink-0">
                            {q.points} Pts
                          </span>
                        </div>

                        <textarea
                          rows={4}
                          value={userAnswers[q.id] || ''}
                          onChange={e => {
                            const text = e.target.value;
                            setUserAnswers(prev => ({ ...prev, [q.id]: text }));
                          }}
                          placeholder="Type your complete written response here..."
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111c2d] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                        />

                        <div className="text-right text-[10px] text-[#667085]">
                          {(userAnswers[q.id] || '').length} characters &bull; {((userAnswers[q.id] || '').trim().split(/\s+/).filter(Boolean)).length} words
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Bottom Submit Controls */}
            <div className="pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-[#667085]">
                {Object.keys(userAnswers).length} of {activeQuestions.length} answered
              </span>

              <div className="flex items-center gap-2">
                {activeQuizForTest.timing_settings?.allow_review_before_submit && (
                  <button
                    type="button"
                    onClick={() => setIsPreviewReviewOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Review Answers
                  </button>
                )}

                <button
                  type="button"
                  disabled={isSubmittingQuiz}
                  onClick={() => executeQuizSubmission(false)}
                  className="px-5 py-2 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 text-[#C6A45A]" />
                  <span>{isSubmittingQuiz ? 'Submitting...' : 'Submit Final Quiz'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TUTOR REVIEW MODAL BEFORE SUBMIT                                       */}
      {/* ========================================================================= */}
      {isPreviewReviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111c2d] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
              Review Your Answers
            </h3>
            <p className="text-xs text-[#667085]">
              Verify that you have completed all questions before final submission.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activeQuestions.map((q, idx) => {
                const isAnswered = userAnswers[q.id] !== undefined && userAnswers[q.id] !== '';
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <span>Question #{idx + 1} ({q.section === 'mcq' ? 'MCQ' : 'Written'})</span>
                    {isAnswered ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Answered
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold">Unanswered</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsPreviewReviewOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600"
              >
                Back to Questions
              </button>
              <button
                type="button"
                onClick={() => executeQuizSubmission(false)}
                className="px-4 py-1.5 rounded-lg bg-[#142B4A] text-white text-xs font-bold"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CANDIDATE RESULTS MODAL (AFTER SUBMISSION / VIEW RESULT)               */}
      {/* ========================================================================= */}
      {viewingAttempt && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-8 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF] dark:border-[#26384d]">
              <div>
                <span className="text-[10px] font-black uppercase text-[#C6A45A] tracking-wider">
                  Quiz Assessment Result
                </span>
                <h3 className="text-base font-bold text-[#142B4A] dark:text-white">
                  {viewingAttempt.quiz_title || 'Quiz Performance'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingAttempt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-[#182230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If Results are Released */}
            {viewingAttempt.results_released ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl flex items-center justify-between ${
                  viewingAttempt.passed
                    ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200'
                }`}>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block">
                      {viewingAttempt.passed ? 'Assessment Passed' : 'Assessment Not Passed'}
                    </span>
                    <span className="text-2xl font-black">
                      {viewingAttempt.percentage}%
                    </span>
                    <span className="text-xs ml-2">
                      ({viewingAttempt.score} of {viewingAttempt.total_possible} Points)
                    </span>
                  </div>
                  <Award className="w-10 h-10 opacity-70" />
                </div>

                {viewingAttempt.feedback && (
                  <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 text-xs">
                    <span className="font-bold text-[#142B4A] dark:text-white block mb-1">
                      Admin Feedback:
                    </span>
                    <p className="text-[#667085] dark:text-slate-300">
                      {viewingAttempt.feedback}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center bg-amber-50/70 dark:bg-amber-950/20 rounded-2xl border border-amber-200 text-amber-900 dark:text-amber-200 space-y-2">
                <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                <h4 className="font-bold text-sm">
                  {viewingAttempt.grading_status === 'awaiting_grading'
                    ? 'Awaiting Admin Manual Grading'
                    : 'Results Pending Administrator Release'}
                </h4>
                <p className="text-xs max-w-md mx-auto text-amber-800 dark:text-amber-300">
                  Your submission has been safely recorded. You will be notified in the app as soon as your marks and feedback are reviewed and officially released.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. ADMIN MODAL: MANUAL GRADING & REVIEW INTERFACE                         */}
      {/* ========================================================================= */}
      {gradingAttempt && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-6 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF] dark:border-[#26384d] shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-[#C6A45A] tracking-wider">
                  Admin Assessment Review
                </span>
                <h3 className="text-base font-bold text-[#142B4A] dark:text-white">
                  {gradingAttempt.tutor_name} &bull; {gradingAttempt.quiz_title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGradingAttempt(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#182230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions to Grade */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar pr-1">
              {Object.values(gradingQuestionGrades).map((g, idx) => (
                <div
                  key={g.question_id || idx}
                  className="p-4 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-[#182230] dark:text-white">
                      #{idx + 1}. {g.question_text}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-black shrink-0">
                      Max: {g.max_points} Pts
                    </span>
                  </div>

                  {/* MCQ vs Subjective Render */}
                  {g.section === 'mcq' ? (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#111c2d] border border-slate-200 dark:border-slate-700">
                      <div className="text-[#667085]">
                        Candidate Selected: <strong>Option {['A', 'B', 'C', 'D'][Number(g.user_answer)] || 'None'}</strong>
                        {String(g.user_answer) === String(g.correct_answer) ? (
                          <span className="text-emerald-600 font-bold ml-2">&#10003; Correct</span>
                        ) : (
                          <span className="text-rose-600 font-bold ml-2">&#10007; Incorrect (Correct: Option {['A', 'B', 'C', 'D'][Number(g.correct_answer)]})</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 p-2.5 rounded-xl bg-white dark:bg-[#111c2d] border border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-[10px] text-[#667085] uppercase font-bold block">Candidate Written Answer:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-wrap mt-0.5">
                          {g.user_answer || '(No response provided)'}
                        </p>
                      </div>

                      {g.expected_answer && (
                        <div>
                          <span className="text-[10px] text-[#667085] uppercase font-bold block">Model / Expected Answer:</span>
                          <p className="text-slate-600 dark:text-slate-300 italic">
                            {g.expected_answer}
                          </p>
                        </div>
                      )}

                      {g.keywords_matched && g.keywords_matched.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-[#667085] font-bold">Keywords Matched:</span>
                          {g.keywords_matched.map(kw => (
                            <span key={kw} className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Marks input */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-bold text-[#667085]">
                      Awarded Marks (Override if needed):
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={g.max_points}
                      value={g.points_awarded}
                      onChange={e => {
                        const val = Math.min(g.max_points, Math.max(0, Number(e.target.value) || 0));
                        setGradingQuestionGrades(prev => ({
                          ...prev,
                          [g.question_id]: {
                            ...prev[g.question_id],
                            points_awarded: val,
                            overridden_by_admin: true,
                          },
                        }));
                      }}
                      className="w-20 px-2 py-1 text-xs font-black rounded-lg border border-[#C6A45A] bg-white dark:bg-[#111c2d]"
                    />
                  </div>
                </div>
              ))}

              {/* Feedback to Candidate */}
              <div>
                <label className="block text-xs font-bold text-[#182230] dark:text-white mb-1">
                  Overall Feedback / Pastoral Commendation
                </label>
                <textarea
                  rows={3}
                  value={gradingFeedback}
                  onChange={e => setGradingFeedback(e.target.value)}
                  placeholder="Provide encouragement, constructive feedback, and notes for this tutor..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#172437] text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setGradingAttempt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingGrading}
                onClick={() => handleSaveGrading(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Save Draft Marks
              </button>
              <button
                type="button"
                disabled={isSavingGrading}
                onClick={() => handleSaveGrading(true)}
                className="px-5 py-2 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Award className="w-3.5 h-3.5 text-[#C6A45A]" />
                <span>Save & Release Results to Tutor</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
