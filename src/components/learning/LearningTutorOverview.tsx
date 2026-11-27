import React from 'react';
import { ArrowUpRight, Award, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Clock3, FileCheck2, GraduationCap, Image as ImageIcon, Library, Users } from 'lucide-react';
import { Assignment, AssignmentSubmission, LearningEvent, LearningPortalSection, LearningResource, Quiz, QuizAttempt } from '../../types/learning';
import './learningTutorOverview.css';

type UpcomingDeadline = { id: string; type: 'assignment' | 'quiz'; title: string; dueDate: string; totalMarks: number };
interface Props {
  firstName: string; assignments: Assignment[]; quizzes: Quiz[]; events: LearningEvent[];
  submissions: AssignmentSubmission[]; resources: LearningResource[]; pendingAssignmentsCount: number;
  pendingQuizzesCount: number; progressRate: number; upcomingDeadlines: UpcomingDeadline[];
  recentQuizResults: QuizAttempt[]; onNavigateSection: (section: LearningPortalSection) => void;
}
const formatDate = (value?: string) => {
  if (!value) return 'Date not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not set' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const statusLabel = (value: string) => value.replace(/_/g, ' ');

export const LearningTutorOverview: React.FC<Props> = props => {
  const { firstName, assignments, quizzes, events, submissions, resources, pendingAssignmentsCount, pendingQuizzesCount, progressRate, upcomingDeadlines, recentQuizResults, onNavigateSection } = props;
  const modules = [
    { id: 'assignments' as LearningPortalSection, title: 'Assignments', description: 'Review tasks and submit your work.', count: assignments.length, icon: BookOpen },
    { id: 'quizzes' as LearningPortalSection, title: 'Quizzes', description: 'Complete available knowledge checks.', count: quizzes.length, icon: FileCheck2 },
    { id: 'participation' as LearningPortalSection, title: 'Participation', description: 'Review your learning activity.', count: submissions.length + recentQuizResults.length, icon: Users },
    { id: 'grades' as LearningPortalSection, title: 'Grades & Scores', description: 'See evaluated submissions and results.', count: recentQuizResults.length, icon: Award },
    { id: 'events' as LearningPortalSection, title: 'Upcoming Events', description: 'View scheduled learning sessions.', count: events.length, icon: CalendarDays },
    { id: 'materials' as LearningPortalSection, title: 'Learning Materials', description: 'Open shared study resources.', count: resources.length, icon: Library },
    { id: 'gallery' as LearningPortalSection, title: 'Media Gallery', description: 'Browse ministry learning media.', icon: ImageIcon },
  ];
  return (
    <div className="fni-learning-tutor-overview">
      <header className="fni-lt-heading">
        <div><p className="fni-lt-eyebrow">TUTOR LEARNING WORKSPACE</p><h1>Welcome, {firstName}</h1><p>Access your fellowship curriculum, complete assessments and track your learning progress.</p></div>
        <div className="fni-lt-heading-actions">
          <button type="button" className="fni-lt-action-secondary" onClick={() => onNavigateSection('assignments')}><BookOpen className="h-4 w-4" /> My assignments</button>
          <button type="button" className="fni-lt-action-primary" onClick={() => onNavigateSection('quizzes')}><FileCheck2 className="h-4 w-4" /> Active quizzes</button>
        </div>
      </header>

      <section className="fni-lt-kpis" aria-label="Your learning summary">
        <article><span>Available assignments</span><strong>{assignments.length}</strong><small>Published for your fellowship</small></article>
        <article className={pendingAssignmentsCount > 0 ? 'is-highlighted' : ''}><span>Pending assignments</span><strong>{pendingAssignmentsCount}</strong><small>Still to submit</small></article>
        <article><span>Available quizzes</span><strong>{quizzes.length}</strong><small>{pendingQuizzesCount} not yet completed</small></article>
        <article><span>Personal progress</span><strong>{progressRate}%</strong><small>Completed learning activities</small><div className="fni-lt-progress-track" role="progressbar" aria-label="Personal learning progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressRate}><span style={{ width: progressRate + '%' }} /></div></article>
      </section>

      <section className="fni-lt-modules" aria-label="Learning modules">
        <div className="fni-lt-section-heading"><div><h2>Learning modules</h2><p>Choose an area to continue your fellowship development.</p></div></div>
        <div className="fni-lt-module-grid">
          {modules.map(item => { const Icon = item.icon; return (
            <button type="button" key={item.id} onClick={() => onNavigateSection(item.id)} className="fni-lt-module-card">
              <span className="fni-lt-module-icon"><Icon className="h-5 w-5" /></span>
              <span className="fni-lt-module-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
              {item.count !== undefined && <span className="fni-lt-module-count">{item.count}</span>}
              <ChevronRight className="fni-lt-module-arrow h-4 w-4" />
            </button>
          ); })}
        </div>
      </section>

      <section className="fni-lt-two-column">
        <article className="fni-lt-panel" aria-label="Upcoming deadlines">
          <div className="fni-lt-panel-heading"><div><span className="fni-lt-panel-icon"><Clock3 className="h-4 w-4" /></span><div><h2>Upcoming deadlines</h2><p>Published assessments with a recorded due date.</p></div></div><button type="button" onClick={() => onNavigateSection('assignments')}>View all <ArrowUpRight className="h-4 w-4" /></button></div>
          {upcomingDeadlines.length ? <div className="fni-lt-list">{upcomingDeadlines.slice(0, 5).map(item => (
            <button type="button" key={item.type + ':' + item.id} onClick={() => onNavigateSection(item.type === 'assignment' ? 'assignments' : 'quizzes')}>
              <span className="fni-lt-list-icon">{item.type === 'assignment' ? <BookOpen className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}</span>
              <span className="fni-lt-list-copy"><strong>{item.title}</strong><small>{item.type === 'assignment' ? 'Assignment' : 'Quiz'} · {item.totalMarks} marks</small></span>
              <span className="fni-lt-list-date">{formatDate(item.dueDate)}</span>
            </button>
          ))}</div> : <div className="fni-lt-empty"><Clock3 className="h-5 w-5" /><strong>No upcoming deadlines</strong><p>New published assessment deadlines will appear here.</p></div>}
        </article>

        <article className="fni-lt-panel" aria-label="Upcoming learning events">
          <div className="fni-lt-panel-heading"><div><span className="fni-lt-panel-icon"><CalendarDays className="h-4 w-4" /></span><div><h2>Upcoming learning events</h2><p>Scheduled sessions and ministry workshops.</p></div></div><button type="button" onClick={() => onNavigateSection('events')}>View all <ArrowUpRight className="h-4 w-4" /></button></div>
          {events.length ? <div className="fni-lt-list">{events.slice(0, 5).map(event => {
            const date = new Date(event.event_date);
            return <button type="button" key={event.id} onClick={() => onNavigateSection('events')}>
              <span className="fni-lt-event-date"><strong>{Number.isNaN(date.getTime()) ? '—' : date.getDate()}</strong><small>{Number.isNaN(date.getTime()) ? 'TBA' : date.toLocaleDateString('en-GB', { month: 'short' })}</small></span>
              <span className="fni-lt-list-copy"><strong>{event.title}</strong><small>{formatDate(event.event_date)} · {event.start_time || 'Time to be announced'}</small></span>
              <ChevronRight className="fni-lt-module-arrow h-4 w-4" />
            </button>;
          })}</div> : <div className="fni-lt-empty"><CalendarDays className="h-5 w-5" /><strong>No upcoming events</strong><p>Scheduled learning sessions will appear here.</p></div>}
        </article>
      </section>

      <section className="fni-lt-two-column">
        <article className="fni-lt-panel" aria-label="Recent assignment submissions">
          <div className="fni-lt-panel-heading"><div><span className="fni-lt-panel-icon"><CheckCircle2 className="h-4 w-4" /></span><div><h2>My assignment activity</h2><p>Your submitted work and current review status.</p></div></div><button type="button" onClick={() => onNavigateSection('grades')}>Gradebook <ArrowUpRight className="h-4 w-4" /></button></div>
          {submissions.length ? <div className="fni-lt-list">{submissions.slice(0, 5).map(item => {
            const assessment = assignments.find(row => row.id === item.assignment_id);
            return <div className="fni-lt-result-row" key={item.id}>
              <span className="fni-lt-list-copy"><strong>{assessment?.title || 'Assignment submission'}</strong><small>Submitted {formatDate(item.submitted_at)}</small></span>
              <span className="fni-lt-result-status">{item.grade !== undefined && item.grade !== null ? 'Graded · ' + item.grade + ' pts' : statusLabel(item.status)}</span>
            </div>;
          })}</div> : <div className="fni-lt-empty"><BookOpen className="h-5 w-5" /><strong>No submissions yet</strong><p>Your assignment submissions will appear here after you submit your work.</p></div>}
        </article>

        <article className="fni-lt-panel" aria-label="Recent quiz results">
          <div className="fni-lt-panel-heading"><div><span className="fni-lt-panel-icon"><Award className="h-4 w-4" /></span><div><h2>Recent quiz results</h2><p>Results released by your learning administrator.</p></div></div><button type="button" onClick={() => onNavigateSection('grades')}>View grades <ArrowUpRight className="h-4 w-4" /></button></div>
          {recentQuizResults.length ? <div className="fni-lt-list">{recentQuizResults.map(item => (
            <div className="fni-lt-result-row" key={item.id}>
              <span className="fni-lt-list-copy"><strong>{item.quiz_title || 'Quiz'}</strong><small>Completed {formatDate(item.completed_at)}</small></span>
              <span className={item.passed ? 'fni-lt-result-status is-success' : 'fni-lt-result-status is-warning'}>{item.percentage}% · {item.passed ? 'Passed' : 'Review'}</span>
            </div>
          ))}</div> : <div className="fni-lt-empty"><Award className="h-5 w-5" /><strong>No released quiz results</strong><p>Completed quiz results will appear here once they are released.</p></div>}
        </article>
      </section>

      <section className="fni-lt-resource-note" aria-label="Learning resources">
        <div><GraduationCap className="h-5 w-5" /><div><strong>Continue your learning</strong><p>{resources.length} learning resource(s) are currently available in the materials library.</p></div></div>
        <button type="button" onClick={() => onNavigateSection('materials')}>Open materials library <ChevronRight className="h-4 w-4" /></button>
      </section>
    </div>
  );
};
