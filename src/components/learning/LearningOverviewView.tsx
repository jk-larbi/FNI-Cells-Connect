import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileCheck2,
  Users,
  BarChart3,
  Calendar,
  Library,
  ChevronRight,
  Clock,
  Search,
  MapPin,
  Video,
  Award,
  AlertCircle,
  CheckCircle2,
  Bell,
  ArrowRight,
  GraduationCap,
  Inbox,
  Send,
  HelpCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  LearningPortalSection,
  Assignment,
  Quiz,
  LearningEvent,
  AssignmentSubmission,
  QuizAttempt,
  LearningResource,
} from '../../types/learning';
import { LearningService } from '../../services/learningService';
import { MessagingService } from '../../services/messagingService';

interface LearningOverviewViewProps {
  onNavigateSection: (section: LearningPortalSection) => void;
  assignments: Assignment[];
  quizzes: Quiz[];
  events: LearningEvent[];
  mySubmissionsCount: number;
  myQuizzesCompletedCount: number;
  onNavigateAppTab?: (tab: any) => void;
  onOpenNotifications?: () => void;
  onOpenAccountSettings?: () => void;
  onToggleSidebar?: () => void;
  onBack?: () => void;
}

export const LearningOverviewView: React.FC<LearningOverviewViewProps> = ({
  onNavigateSection,
  assignments,
  quizzes,
  events,
  mySubmissionsCount,
  myQuizzesCompletedCount,
  onNavigateAppTab,
  onOpenNotifications,
  onOpenAccountSettings,
  onToggleSidebar,
  onBack,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();

  // Real Database Submissions, Quiz Attempts & Resources
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [activeTutorsCount, setActiveTutorsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const firstName = currentUser?.full_name ? currentUser.full_name.split(' ')[0] : 'Leader';

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [subs, atts, res, members] = await Promise.all([
          LearningService.getSubmissions(undefined, isAdmin ? undefined : currentUser?.id),
          LearningService.getQuizAttempts(undefined, isAdmin ? undefined : currentUser?.id),
          LearningService.getResources(isAdmin),
          MessagingService.getMemberDirectory(),
        ]);
        if (!isMounted) return;
        setSubmissions(subs || []);
        setQuizAttempts(atts || []);
        setResources(res || []);
        if (members) {
          const tutorMembers = members.filter(m => m.role === 'tutor' || m.role === 'cell_leader');
          setActiveTutorsCount(tutorMembers.length || members.length);
        }
      } catch (e) {
        console.warn('Overview load notice:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, currentUser]);

  // Published Activities
  const publishedAssignments = assignments.filter(a => a.status === 'published');
  const publishedQuizzes = quizzes.filter(q => q.status === 'published');
  const upcomingEvents = events.filter(e => e.status === 'upcoming');

  // Format date chip
  const formatDateChip = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const day = d.getDate();
      const weekday = d.toLocaleString('en-US', { weekday: 'short' });
      return { month, day: String(day).padStart(2, '0'), weekday };
    } catch {
      return { month: 'EVT', day: '01', weekday: 'Day' };
    }
  };

  // ---------------------------------------------------------------------------
  // ADMIN METRICS (Strictly Real Data)
  // ---------------------------------------------------------------------------
  const assignmentsCreated = assignments.length;
  const assignmentsSubmittedCount = submissions.length;
  const assignmentsPendingGrading = submissions.filter(
    s => s.status === 'submitted' || s.status === 'submitted_late' || s.status === 'awaiting_grading'
  ).length;

  const quizzesPublishedCount = publishedQuizzes.length;
  const uniqueQuizTutors = new Set(quizAttempts.map(a => a.tutor_id)).size;
  const quizParticipationRate =
    activeTutorsCount > 0 ? Math.round((uniqueQuizTutors / activeTutorsCount) * 100) : 0;

  // Average Scores across graded assignments and quizzes
  const allGradedAssignmentScores = submissions
    .filter(s => s.grade !== undefined && s.grade !== null)
    .map(s => {
      const asg = assignments.find(a => a.id === s.assignment_id);
      const total = asg?.total_marks || 100;
      return Math.round(((s.grade || 0) / total) * 100);
    });
  const allQuizScores = quizAttempts.map(a => a.percentage || 0);
  const combinedScores = [...allGradedAssignmentScores, ...allQuizScores];
  const averageScore =
    combinedScores.length > 0
      ? Math.round(combinedScores.reduce((a, b) => a + b, 0) / combinedScores.length)
      : 0;

  // Tutors Awaiting Grading
  const tutorsAwaitingAssignmentGrading = new Set(
    submissions
      .filter(s => s.status === 'submitted' || s.status === 'submitted_late' || s.status === 'awaiting_grading')
      .map(s => s.tutor_id)
  );
  const tutorsAwaitingQuizGrading = new Set(
    quizAttempts
      .filter(a => a.status === 'awaiting_grading' || (a.question_grades && Object.values(a.question_grades).some(q => q.is_manual_review_needed)))
      .map(a => a.tutor_id)
  );
  const totalTutorsAwaitingGrading = new Set([
    ...Array.from(tutorsAwaitingAssignmentGrading),
    ...Array.from(tutorsAwaitingQuizGrading),
  ]).size;

  // ---------------------------------------------------------------------------
  // TUTOR METRICS (Personal Real Data)
  // ---------------------------------------------------------------------------
  const tutorSubmittedAssignmentIds = new Set(submissions.map(s => s.assignment_id));
  const tutorCompletedQuizIds = new Set(quizAttempts.map(a => a.quiz_id));

  const availableAssignmentsCount = publishedAssignments.length;
  const pendingAssignmentsList = publishedAssignments.filter(
    a => !tutorSubmittedAssignmentIds.has(a.id)
  );
  const pendingAssignmentsCount = pendingAssignmentsList.length;

  const availableQuizzesCount = publishedQuizzes.length;
  const pendingQuizzesList = publishedQuizzes.filter(
    q => !tutorCompletedQuizIds.has(q.id)
  );

  // Upcoming Deadlines (Assignments and Quizzes)
  const now = new Date();
  const upcomingDeadlines = [
    ...publishedAssignments
      .filter(a => new Date(a.due_date) >= now)
      .map(a => ({
        id: a.id,
        type: 'assignment' as const,
        title: a.title,
        dueDate: a.due_date,
        totalMarks: a.total_marks,
      })),
    ...publishedQuizzes
      .filter(q => q.due_date && new Date(q.due_date) >= now)
      .map(q => ({
        id: q.id,
        type: 'quiz' as const,
        title: q.title,
        dueDate: q.due_date,
        totalMarks: q.total_points,
      })),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Personal Progress
  const totalAvailableTasks = availableAssignmentsCount + availableQuizzesCount;
  const totalCompletedTasks = tutorSubmittedAssignmentIds.size + tutorCompletedQuizIds.size;
  const personalProgressRate =
    totalAvailableTasks > 0 ? Math.round((totalCompletedTasks / totalAvailableTasks) * 100) : 100;

  // Recent Quiz Results for Tutor (Only released or graded)
  const tutorRecentQuizResults = quizAttempts
    .filter(a => a.results_released || a.status === 'graded')
    .slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Frosted Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#142B4A] bg-gradient-to-br from-[#142B4A] via-[#1E3A8A] to-[#2563EB] text-white p-6 sm:p-8 shadow-xl border border-blue-900/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-[#C6A45A]/25 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-[#C6A45A] text-[#142B4A] text-xs font-black uppercase tracking-wider shadow-xs">
                {isAdmin ? 'ADMIN TEACHER DIRECTORATE' : 'TUTOR FELLOWSHIP ACADEMY'}
              </span>
              <span className="text-blue-100 text-xs font-bold">
                • Institutional Learning Environment
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome, {firstName}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
              {isAdmin
                ? 'Oversee pastoral teaching, publish assignments, monitor quiz engagement, and grade tutor submissions in real-time.'
                : 'Access your fellowship curriculum, complete ministerial assignments, test your pastoral knowledge, and review evaluated grades.'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={() => onNavigateSection('assignments')}
              className="px-4 py-2.5 rounded-2xl bg-white text-[#142B4A] hover:bg-blue-50 text-xs font-bold shadow-sm transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>{isAdmin ? 'Create Assignment' : 'My Assignments'}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('quizzes')}
              className="px-4 py-2.5 rounded-2xl bg-[#C6A45A] hover:bg-[#b89547] text-[#142B4A] text-xs font-bold shadow-sm transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <FileCheck2 className="w-4 h-4 text-[#142B4A]" />
              <span>{isAdmin ? 'Publish Quiz' : 'Active Quizzes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Dual-Role Overview KPI Metrics Cards */}
      {isAdmin ? (
        /* ======================== ADMIN OVERVIEW METRICS ======================== */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold text-[#182230] dark:text-white">
              Institutional Teaching Metrics
            </h2>
            <span className="text-xs font-semibold text-slate-500">Live database metrics</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Active Tutors */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Active Tutors
                </span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-[#142B4A] dark:text-white mt-1.5">
                {activeTutorsCount}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                Registered fellowship leaders
              </span>
            </div>

            {/* Assignments Created */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Assignments
                </span>
                <BookOpen className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-[#142B4A] dark:text-white mt-1.5">
                {assignmentsCreated}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                {publishedAssignments.length} published • {assignmentsCreated - publishedAssignments.length} draft
              </span>
            </div>

            {/* Submissions & Pending Grading */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Submissions
                </span>
                <Send className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-1.5">
                {assignmentsSubmittedCount}
              </div>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1 block">
                {assignmentsPendingGrading} awaiting grading
              </span>
            </div>

            {/* Quizzes Published */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Quizzes
                </span>
                <FileCheck2 className="w-4 h-4 text-[#C6A45A]" />
              </div>
              <div className="text-2xl font-black text-[#142B4A] dark:text-white mt-1.5">
                {quizzesPublishedCount}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                {quizAttempts.length} total attempts
              </span>
            </div>

            {/* Quiz Participation */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Quiz Participation
                </span>
                <BarChart3 className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="text-2xl font-black text-cyan-600 mt-1.5">
                {quizParticipationRate}%
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                {uniqueQuizTutors} of {activeTutorsCount} tutors tested
              </span>
            </div>

            {/* Average Scores */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Average Score
                </span>
                <Award className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-purple-600 mt-1.5">
                {averageScore}%
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                Across assignments & quizzes
              </span>
            </div>

            {/* Tutors Awaiting Grading */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Needs Grading
                </span>
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-600 mt-1.5">
                {totalTutorsAwaitingGrading}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                Tutors awaiting evaluation
              </span>
            </div>

            {/* Upcoming Activities */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Events Scheduled
                </span>
                <Calendar className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-600 mt-1.5">
                {upcomingEvents.length}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                Upcoming teaching events
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== TUTOR OVERVIEW METRICS ======================== */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold text-[#182230] dark:text-white">
              My Learning Summary
            </h2>
            <span className="text-xs font-semibold text-slate-500">Personal performance tracking</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Available Assignments */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Available Assignments
                </span>
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-[#142B4A] dark:text-white mt-1.5">
                {availableAssignmentsCount}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                {tutorSubmittedAssignmentIds.size} completed
              </span>
            </div>

            {/* Pending Assignments */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Pending Assignments
                </span>
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div className={`text-2xl font-black mt-1.5 ${pendingAssignmentsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {pendingAssignmentsCount}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                {pendingAssignmentsCount > 0 ? 'Awaiting your submission' : 'All caught up!'}
              </span>
            </div>

            {/* Available Quizzes */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Available Quizzes
                </span>
                <FileCheck2 className="w-4 h-4 text-[#C6A45A]" />
              </div>
              <div className="text-2xl font-black text-[#142B4A] dark:text-white mt-1.5">
                {availableQuizzesCount}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                {tutorCompletedQuizIds.size} quizzes taken
              </span>
            </div>

            {/* Personal Progress */}
            <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Personal Progress
                </span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-1.5">
                {personalProgressRate}%
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                {totalCompletedTasks} of {totalAvailableTasks} tasks completed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Quick Section Access Hub (The 7 Portal Sections + Media Gallery) */}
      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-[#182230] dark:text-white px-1">
          Explore Learning Sections
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { id: 'assignments' as LearningPortalSection, title: 'Assignments', count: publishedAssignments.length, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
            { id: 'quizzes' as LearningPortalSection, title: 'Quizzes', count: publishedQuizzes.length, icon: FileCheck2, color: 'text-[#C6A45A] bg-amber-50 dark:bg-amber-950/40' },
            { id: 'participation' as LearningPortalSection, title: 'Participation', count: activeTutorsCount, icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
            { id: 'grades' as LearningPortalSection, title: 'Grades & Scores', count: submissions.length, icon: BarChart3, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
            { id: 'events' as LearningPortalSection, title: 'Upcoming Events', count: upcomingEvents.length, icon: Calendar, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
            { id: 'materials' as LearningPortalSection, title: 'Materials Library', count: resources.length, icon: Library, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
            { id: 'gallery' as LearningPortalSection, title: 'Media Gallery', count: 7, icon: ImageIcon, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
          ].map(sec => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onNavigateSection(sec.id)}
                className="p-3.5 rounded-3xl fni-glass-panel border border-slate-200/80 dark:border-white/10 hover:border-blue-500 transition-all text-left group cursor-pointer flex flex-col justify-between shadow-xs active:scale-98"
              >
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${sec.color} mb-3 shadow-2xs`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#182230] dark:text-white truncate">
                      {sec.title}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 block">
                    {sec.count} record{sec.count === 1 ? '' : 's'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Split Grid: Upcoming Deadlines & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Upcoming Deadlines / Activities */}
        <div className="fni-glass-card bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 shadow-card">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
                Upcoming Academic Deadlines
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('assignments')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="py-10 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold">No pending upcoming deadlines!</p>
              <p className="text-[11px] text-slate-400">All published assignments and quizzes are up to date.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingDeadlines.slice(0, 4).map(item => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => onNavigateSection(item.type === 'assignment' ? 'assignments' : 'quizzes')}
                  className="flex items-center justify-between p-3 rounded-2xl fni-glass-panel border border-slate-200/70 dark:border-white/10 hover:border-blue-500 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'assignment' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300' : 'bg-amber-50 text-[#C6A45A] dark:bg-amber-950/40'}`}>
                      {item.type === 'assignment' ? <BookOpen className="w-4 h-4" /> : <FileCheck2 className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                        <span>• {item.totalMarks} marks</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-[10px] font-bold shrink-0">
                    {item.type === 'assignment' ? 'Assignment' : 'Quiz'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Card: Upcoming Learning Events */}
        <div className="fni-glass-card bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 shadow-card">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
                Upcoming Learning Events
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('events')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Events</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="py-10 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold">No upcoming events scheduled</p>
              <p className="text-[11px] text-slate-400">Pastoral sessions and fellowship workshops will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingEvents.slice(0, 4).map(evt => {
                const chip = formatDateChip(evt.event_date);
                return (
                  <div
                    key={evt.id}
                    onClick={() => onNavigateSection('events')}
                    className="flex items-center justify-between p-3 rounded-2xl fni-glass-panel border border-slate-200/70 dark:border-white/10 hover:border-blue-500 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Lavender Date Capsule */}
                      <div className="w-11 h-13 rounded-2xl bg-[#F4F0FF] dark:bg-[#251B42] text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col items-center justify-center shrink-0 py-1">
                        <span className="text-[8px] font-black uppercase leading-none">{chip.month}</span>
                        <span className="text-sm font-black leading-tight my-0.5">{chip.day}</span>
                        <span className="text-[8px] font-semibold text-slate-500 dark:text-slate-400 leading-none">{chip.weekday}</span>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600">
                          {evt.title}
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {evt.start_time} - {evt.end_time}
                          </span>
                          <span className="truncate flex items-center gap-1">
                            {evt.meeting_type === 'online' ? <Video className="w-3 h-3 text-blue-500" /> : <MapPin className="w-3 h-3 text-rose-500" />}
                            {evt.location_or_link}
                          </span>
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 text-[10px] font-bold shrink-0">
                      Upcoming
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. Recent Submissions & Activity Feed (Admin: Recent Submissions / Tutor: Recent Results) */}
      <div className="fni-glass-card bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 shadow-card">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
              {isAdmin ? 'Recent Submissions & Activity Feed' : 'Recent Quiz & Assignment Results'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('grades')}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Gradebook</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isAdmin ? (
          /* Admin View: Recent submissions list */
          submissions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No assignment submissions recorded in the database yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {submissions.slice(0, 5).map(sub => {
                const asg = assignments.find(a => a.id === sub.assignment_id);
                return (
                  <div key={sub.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {sub.tutor_name} • <span className="text-slate-500">{sub.cell_name || 'Cell Leader'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Submitted: {asg?.title || 'Assignment'} (Attempt #{sub.attempt_number}) on {new Date(sub.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      sub.status === 'graded'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {sub.status === 'graded' ? `Graded: ${sub.grade} pts` : 'Awaiting Grading'}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Tutor View: Recent Results */
          tutorRecentQuizResults.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No evaluated quiz results available yet. Complete active quizzes to see results.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {tutorRecentQuizResults.map(att => (
                <div key={att.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {att.quiz_title || 'Pastoral Quiz'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Completed on {new Date(att.completed_at).toLocaleDateString()} • Score: {att.score}/{att.total_possible}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    att.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {att.percentage}% ({att.passed ? 'Passed' : 'Needs Review'})
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
