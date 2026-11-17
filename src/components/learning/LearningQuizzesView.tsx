import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Quiz, QuizQuestion, QuizAttempt } from '../../types/learning';
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

  // Create / Edit Quiz Modal (Admin)
  const [isQuizFormOpen, setIsQuizFormOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizInstructions, setQuizInstructions] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState('15');
  const [quizPassingScore, setQuizPassingScore] = useState('70');
  const [quizDueDate, setQuizDueDate] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<Partial<QuizQuestion>[]>([
    {
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: 0,
      points: 10,
      explanation: '',
    },
  ]);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  // Take Quiz Runner (Tutor)
  const [activeQuizForTest, setActiveQuizForTest] = useState<Quiz | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [quizStartedAt, setQuizStartedAt] = useState<string>('');
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  // Result display
  const [completedAttempt, setCompletedAttempt] = useState<QuizAttempt | null>(null);

  // Attempts History & Inspection
  const [inspectingQuiz, setInspectingQuiz] = useState<Quiz | null>(null);
  const [quizAttemptsList, setQuizAttemptsList] = useState<QuizAttempt[]>([]);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);

  // Tutor attempts cache
  const [tutorAttempts, setTutorAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    if (!isAdmin && currentUser?.id) {
      LearningService.getQuizAttempts(undefined, currentUser.id).then(atts => {
        setTutorAttempts(atts);
      });
    }
  }, [isAdmin, currentUser, quizzes]);

  // Quiz timer runner
  useEffect(() => {
    if (!activeQuizForTest || timeRemainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimeRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // auto submit
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
    alert('Time limit reached! Submitting your answers for automatic grading...');
    await executeQuizSubmission();
  };

  // Open Create Quiz Modal
  const handleOpenCreateQuiz = async (q?: Quiz) => {
    if (q) {
      setEditingQuiz(q);
      setQuizTitle(q.title);
      setQuizDescription(q.description);
      setQuizInstructions(q.instructions || '');
      setQuizTimeLimit(String(q.time_limit_minutes));
      setQuizPassingScore(String(q.passing_score));
      setQuizDueDate(q.due_date ? q.due_date.split('T')[0] : '');

      const questions = await LearningService.getQuizQuestions(q.id);
      if (questions.length > 0) {
        setQuizQuestions(questions);
      } else {
        setQuizQuestions([
          {
            question_text: '',
            question_type: 'multiple_choice',
            options: ['', '', '', ''],
            correct_answer: 0,
            points: 10,
            explanation: '',
          },
        ]);
      }
    } else {
      setEditingQuiz(null);
      setQuizTitle('');
      setQuizDescription('');
      setQuizInstructions('');
      setQuizTimeLimit('15');
      setQuizPassingScore('70');
      const d = new Date(Date.now() + 7 * 86400000);
      setQuizDueDate(d.toISOString().split('T')[0]);
      setQuizQuestions([
        {
          question_text: '',
          question_type: 'multiple_choice',
          options: ['', '', '', ''],
          correct_answer: 0,
          points: 10,
          explanation: '',
        },
      ]);
    }
    setIsQuizFormOpen(true);
  };

  // Add question to builder
  const handleAddQuestion = () => {
    setQuizQuestions(prev => [
      ...prev,
      {
        question_text: '',
        question_type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_answer: 0,
        points: 10,
        explanation: '',
      },
    ]);
  };

  // Remove question
  const handleRemoveQuestion = (idx: number) => {
    setQuizQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  // Save Quiz (Admin)
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim()) {
      alert('Please enter a quiz title.');
      return;
    }
    if (quizQuestions.length === 0 || !quizQuestions[0].question_text?.trim()) {
      alert('Please add at least one question to the quiz.');
      return;
    }

    setIsSavingQuiz(true);
    try {
      await LearningService.saveQuiz(
        {
          id: editingQuiz?.id,
          title: quizTitle.trim(),
          description: quizDescription.trim(),
          instructions: quizInstructions.trim(),
          time_limit_minutes: Number(quizTimeLimit) || 15,
          passing_score: Number(quizPassingScore) || 70,
          due_date: new Date(quizDueDate || Date.now() + 7 * 86400000).toISOString(),
          status: 'published',
          results_released: true,
        },
        quizQuestions,
        { id: currentUser.id }
      );

      setIsQuizFormOpen(false);
      onRefresh();
      alert('Quiz successfully published for all active tutors!');
    } catch (err: any) {
      alert(err.message || 'Failed to save quiz.');
    } finally {
      setIsSavingQuiz(false);
    }
  };

  // Start Quiz (Tutor)
  const handleStartQuiz = async (quiz: Quiz) => {
    const questions = await LearningService.getQuizQuestions(quiz.id);
    if (questions.length === 0) {
      alert('This quiz does not have any questions configured yet.');
      return;
    }

    setActiveQuizForTest(quiz);
    setActiveQuestions(questions);
    setUserAnswers({});
    setTimeRemainingSeconds((quiz.time_limit_minutes || 15) * 60);
    setQuizStartedAt(new Date().toISOString());
    setCompletedAttempt(null);
  };

  // Execute Submission & Auto-grading
  const executeQuizSubmission = async () => {
    if (!activeQuizForTest) return;
    setIsSubmittingQuiz(true);
    try {
      const attempt = await LearningService.submitQuizAttempt({
        quizId: activeQuizForTest.id,
        tutorId: currentUser.id,
        tutorName: currentUser.full_name || 'Fellowship Tutor',
        cellId: currentUser.cell_id,
        cellName: currentUser.cell_name,
        answers: userAnswers,
        startedAt: quizStartedAt,
      });

      setCompletedAttempt(attempt);
      setActiveQuizForTest(null);

      // Refresh tutor attempts cache
      const atts = await LearningService.getQuizAttempts(undefined, currentUser.id);
      setTutorAttempts(atts);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Quiz submission failed.');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // Inspect Quiz Attempts (Admin)
  const handleInspectQuizAttempts = async (quiz: Quiz) => {
    setInspectingQuiz(quiz);
    setIsLoadingAttempts(true);
    try {
      const atts = await LearningService.getQuizAttempts(quiz.id);
      setQuizAttemptsList(atts);
    } finally {
      setIsLoadingAttempts(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#142B4A] dark:text-white">
                Knowledge Checks & Quizzes
              </h2>
              <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
                {isAdmin
                  ? 'Author assessments, define question banks, and review auto-graded results.'
                  : 'Test your grasp of doctrine, cell operations, and soul-winning guidelines.'}
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => handleOpenCreateQuiz()}
            className="px-4 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#C6A45A]" />
            <span>Create Quiz</span>
          </button>
        )}
      </div>

      {/* 2. Quizzes List */}
      {quizzes.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d]">
          <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
            No quizzes available
          </h3>
          <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto">
            {isAdmin
              ? 'Click "Create Quiz" above to author an assessment with automated grading.'
              : 'Leadership has not published any quizzes at this time. Check back soon.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map(quiz => {
            const myAttempts = tutorAttempts.filter(a => a.quiz_id === quiz.id);
            const latestAttempt = myAttempts[0];

            return (
              <div
                key={quiz.id}
                className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        quiz.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                    >
                      {quiz.status}
                    </span>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                        {quiz.total_points} Pts
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#F5F7FA] text-[#142B4A] dark:bg-[#172437] dark:text-slate-300 border border-[#E3E8EF] dark:border-[#26384d] flex items-center gap-1">
                        <Timer className="w-3 h-3 text-[#C6A45A]" />
                        <span>{quiz.time_limit_minutes} Mins</span>
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-[#182230] dark:text-white leading-snug">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-[#667085] dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {quiz.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] text-[11px] text-[#667085]">
                    <span>
                      Pass Mark: <strong className="text-[#142B4A] dark:text-white">{quiz.passing_score}%</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Due: {new Date(quiz.due_date).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Tutor Personal Standing */}
                  {!isAdmin && latestAttempt && (
                    <div className="mt-3.5 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-[#142B4A] dark:text-white">Your Best Result:</span>
                        <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                          latestAttempt.passed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}>
                          {latestAttempt.passed ? 'PASSED' : 'RETRY NEEDED'} &bull; {latestAttempt.percentage}%
                        </span>
                      </div>
                      <div className="text-[11px] text-[#667085] dark:text-slate-400 mt-1">
                        Score: {latestAttempt.score}/{latestAttempt.total_possible} points &bull; Completed {new Date(latestAttempt.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3.5 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between gap-2">
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleInspectQuizAttempts(quiz)}
                        className="px-3 py-1.5 rounded-lg bg-[#F5F7FA] hover:bg-[#E3E8EF] text-[#142B4A] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#C6A45A]" />
                        <span>View Results</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenCreateQuiz(quiz)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#142B4A] hover:bg-slate-100"
                          title="Edit Quiz"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartQuiz(quiz)}
                      className="w-full py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-[#C6A45A] fill-current" />
                      <span>{latestAttempt ? 'Retake Quiz' : 'Start Quiz Now'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE QUIZ RUNNER MODAL (With Countdown & Immediate Auto-grade)   */}
      {/* ========================================================================= */}
      {activeQuizForTest && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-8 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-6">
            {/* Header & Sticky Timer */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E3E8EF] dark:border-[#26384d]">
              <div>
                <span className="text-[10px] font-black uppercase text-[#C6A45A] tracking-wider">
                  Live Assessment
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#142B4A] dark:text-white">
                  {activeQuizForTest.title}
                </h3>
              </div>

              {/* Timer Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-mono font-bold text-xs shrink-0">
                <Clock className="w-4 h-4 text-[#C6A45A] animate-pulse" />
                <span>
                  {Math.floor(timeRemainingSeconds / 60)}:
                  {String(timeRemainingSeconds % 60).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {activeQuestions.map((q, qIndex) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#172437] border border-[#E3E8EF] dark:border-[#26384d] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                        {qIndex + 1}
                      </span>
                      <p className="font-bold text-xs sm:text-sm text-[#182230] dark:text-white">
                        {q.question_text}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#667085] shrink-0">
                      {q.points} pts
                    </span>
                  </div>

                  {/* Options */}
                  {q.question_type === 'multiple_choice' && q.options && (
                    <div className="space-y-2 pt-1 pl-8">
                      {q.options.map((opt, optIndex) => {
                        const isSelected = userAnswers[q.id] === optIndex;
                        return (
                          <button
                            key={optIndex}
                            type="button"
                            onClick={() => setUserAnswers(prev => ({ ...prev, [q.id]: optIndex }))}
                            className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#142B4A] text-white border-[#142B4A] shadow-xs'
                                : 'bg-white dark:bg-[#111c2d] text-[#182230] dark:text-slate-200 border-[#E3E8EF] dark:border-[#26384d] hover:bg-slate-100'
                            }`}
                          >
                            <span>{opt}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#C6A45A]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False */}
                  {q.question_type === 'true_false' && (
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1 pl-2 sm:pl-8">
                      {['True', 'False'].map((lbl, idx) => {
                        const isSelected = userAnswers[q.id] === idx;
                        return (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setUserAnswers(prev => ({ ...prev, [q.id]: idx }))}
                            className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#142B4A] text-white border-[#142B4A] shadow-xs'
                                : 'bg-white dark:bg-[#111c2d] text-[#182230] dark:text-slate-200 border-[#E3E8EF] dark:border-[#26384d] hover:bg-slate-100'
                            }`}
                          >
                            {lbl}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer */}
                  {q.question_type === 'short_answer' && (
                    <div className="pl-8 pt-1">
                      <input
                        type="text"
                        value={userAnswers[q.id] || ''}
                        onChange={e => setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Type your brief answer..."
                        className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#111c2d] text-xs text-[#182230] dark:text-white"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Cancel and exit quiz? Your progress will not be saved.')) {
                    setActiveQuizForTest(null);
                  }
                }}
                className="px-4 py-2 text-xs text-slate-500 hover:text-[#C74646]"
              >
                Quit Quiz
              </button>

              <button
                type="button"
                disabled={isSubmittingQuiz}
                onClick={executeQuizSubmission}
                className="px-6 py-2.5 rounded-xl bg-[#23845B] hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingQuiz ? 'Grading Answers...' : 'Submit & Finish Quiz'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. RESULT MODAL (Immediate Objective Feedback after submission)           */}
      {/* ========================================================================= */}
      {completedAttempt && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] animate-fade-in">
            <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-md ${
              completedAttempt.passed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
            }`}>
              <Award className="w-8 h-8" />
            </div>

            <div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                completedAttempt.passed
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              }`}>
                {completedAttempt.passed ? 'Passed Successfully!' : 'Review Recommended'}
              </span>
              <h3 className="text-xl font-black text-[#142B4A] dark:text-white mt-2">
                Score: {completedAttempt.score} / {completedAttempt.total_possible}
              </h3>
              <p className="text-sm font-bold text-[#C6A45A] mt-0.5">
                {completedAttempt.percentage}% Achieved
              </p>
            </div>

            <p className="text-xs text-[#667085] leading-relaxed">
              {completedAttempt.passed
                ? 'Congratulations! You have satisfied the knowledge requirements for this module.'
                : 'Good effort. You may review the cell outlines and retake the quiz to sharpen your mastery.'}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCompletedAttempt(null)}
                className="w-full py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADMIN MODAL: CREATE / EDIT QUIZ                                        */}
      {/* ========================================================================= */}
      {isQuizFormOpen && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-[#E3E8EF] dark:border-[#26384d]">
              <div>
                <h3 className="text-lg font-bold text-[#142B4A] dark:text-white">
                  {editingQuiz ? 'Edit Quiz' : 'Create New Assessment'}
                </h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Questions are automatically graded upon tutor submission.
                </p>
              </div>
              <button
                onClick={() => setIsQuizFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-[#182230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  required
                  value={quizTitle}
                  onChange={e => setQuizTitle(e.target.value)}
                  placeholder="e.g. FNI Kingdom Vision & Core Doctrine"
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={quizDescription}
                  onChange={e => setQuizDescription(e.target.value)}
                  placeholder="Briefly explain the scope of this quiz..."
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={quizTimeLimit}
                    onChange={e => setQuizTimeLimit(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Pass Score (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quizPassingScore}
                    onChange={e => setQuizPassingScore(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={quizDueDate}
                    onChange={e => setQuizDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  />
                </div>
              </div>

              {/* Questions Builder */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-[#142B4A] dark:text-white">
                    Questions ({quizQuestions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {quizQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#172437] border border-[#E3E8EF] dark:border-[#26384d] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-[#142B4A] dark:text-white">
                          Question #{idx + 1}
                        </span>
                        {quizQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="text-slate-400 hover:text-[#C74646]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        required
                        value={q.question_text || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setQuizQuestions(prev => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], question_text: val };
                            return copy;
                          });
                        }}
                        placeholder="Enter question text here..."
                        className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#111c2d] text-[#182230] dark:text-white font-medium"
                      />

                      {/* Options */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold text-[#667085] uppercase">
                          Answer Choices (Select radio button for correct answer)
                        </span>
                        {q.options?.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${idx}`}
                              checked={q.correct_answer === oIdx}
                              onChange={() => {
                                setQuizQuestions(prev => {
                                  const copy = [...prev];
                                  copy[idx] = { ...copy[idx], correct_answer: oIdx };
                                  return copy;
                                });
                              }}
                              className="accent-[#C6A45A]"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={e => {
                                const val = e.target.value;
                                setQuizQuestions(prev => {
                                  const copy = [...prev];
                                  const opts = [...(copy[idx].options || [])];
                                  opts[oIdx] = val;
                                  copy[idx] = { ...copy[idx], options: opts };
                                  return copy;
                                });
                              }}
                              placeholder={`Option ${oIdx + 1}`}
                              className="flex-1 p-2 rounded-lg border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#111c2d] text-xs text-[#182230] dark:text-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuizFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuiz}
                  className="px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-[#C6A45A]" />
                  <span>{isSavingQuiz ? 'Publishing...' : 'Publish Quiz'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ADMIN MODAL: VIEW ATTEMPTS                                             */}
      {/* ========================================================================= */}
      {inspectingQuiz && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-8 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF] dark:border-[#26384d]">
              <div>
                <span className="text-[10px] font-black uppercase text-[#C6A45A] tracking-wider">
                  Tutor Quiz Performance
                </span>
                <h3 className="text-base font-bold text-[#142B4A] dark:text-white">
                  {inspectingQuiz.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectingQuiz(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-[#182230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingAttempts ? (
              <div className="py-8 text-center text-xs text-[#667085]">
                Loading attempts...
              </div>
            ) : quizAttemptsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#667085]">
                No tutors have taken this quiz yet.
              </div>
            ) : (
              <div className="space-y-2">
                {quizAttemptsList.map(att => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#182230] dark:text-white">
                        {att.tutor_name}
                      </div>
                      <div className="text-[11px] text-[#667085]">
                        {att.cell_name} &bull; {new Date(att.completed_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                        att.passed
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}>
                        {att.percentage}% ({att.score}/{att.total_possible} pts)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
