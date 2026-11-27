import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
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
import { LearningAdminOverview } from './LearningAdminOverview';
import { LearningTutorOverview } from './LearningTutorOverview';

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
}) => {
  const { currentUser, isAdmin } = useAuth();

  // Real Database Submissions, Quiz Attempts & Resources
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [activeTutorsCount, setActiveTutorsCount] = useState<number>(0);

  const firstName = currentUser?.full_name ? currentUser.full_name.split(' ')[0] : 'Leader';

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
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
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, currentUser]);

  // Keep overview metrics current when quiz attempts or learning records change on another device.
  useEffect(() => {
    const refreshOverviewRecords = async () => {
      try {
        const [subs, atts, res] = await Promise.all([
          LearningService.getSubmissions(undefined, isAdmin ? undefined : currentUser?.id),
          LearningService.getQuizAttempts(undefined, isAdmin ? undefined : currentUser?.id),
          LearningService.getResources(isAdmin),
        ]);
        setSubmissions(subs || []);
        setQuizAttempts(atts || []);
        setResources(res || []);
      } catch (error) {
        console.warn('Overview cross-device refresh notice:', error);
      }
    };
    const handleCloudChange = (event: Event) => {
      const table = (event as CustomEvent<{ table?: string }>).detail?.table;
      if (!table || table === '*' || [
        'learning_assignment_submissions', 'learning_quiz_sync_state', 'learning_quizzes',
        'learning_quiz_questions', 'learning_resources',
      ].includes(table)) {
        void refreshOverviewRecords();
      }
    };
    window.addEventListener('fni:cloud-data-changed', handleCloudChange);
    return () => window.removeEventListener('fni:cloud-data-changed', handleCloudChange);
  }, [isAdmin, currentUser?.id]);

  // Published Activities
  const publishedAssignments = assignments.filter(a => a.status === 'published');
  const publishedQuizzes = quizzes.filter(q => q.status === 'published');
  const upcomingEvents = events.filter(e => e.status === 'upcoming');

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

  if (isAdmin) {
    return (
      <LearningAdminOverview
        assignments={assignments}
        quizzes={quizzes}
        events={events}
        submissions={submissions}
        quizAttempts={quizAttempts}
        activeTutorsCount={activeTutorsCount}
        onNavigateSection={onNavigateSection}
      />
    );
  }

  return (
    <LearningTutorOverview
      firstName={firstName}
      assignments={publishedAssignments}
      quizzes={publishedQuizzes}
      events={upcomingEvents}
      submissions={submissions}
      resources={resources}
      pendingAssignmentsCount={pendingAssignmentsCount}
      pendingQuizzesCount={pendingQuizzesList.length}
      progressRate={personalProgressRate}
      upcomingDeadlines={upcomingDeadlines}
      recentQuizResults={tutorRecentQuizResults}
      onNavigateSection={onNavigateSection}
    />
  );
};
