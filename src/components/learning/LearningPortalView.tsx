import React, { useState, useEffect } from 'react';
import { useBackHandler } from '../../hooks/useBackHandler';
import {
  GraduationCap,
  BookOpen,
  FileCheck2,
  Users,
  BarChart3,
  Calendar,
  Library,
  ArrowLeft,
  LayoutDashboard,
  Image as ImageIcon,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LearningPortalSection, Assignment, Quiz, LearningEvent } from '../../types/learning';
import { LearningService } from '../../services/learningService';

// Sub-components
import { LearningOverviewView } from './LearningOverviewView';
import { LearningAssignmentsView } from './LearningAssignmentsView';
import { LearningQuizzesView } from './LearningQuizzesView';
import { LearningParticipationView } from './LearningParticipationView';
import { LearningGradesView } from './LearningGradesView';
import { LearningEventsView } from './LearningEventsView';
import { LearningMaterialsView } from './LearningMaterialsView';
import { LearningGalleryView } from './LearningGalleryView';

interface LearningPortalViewProps {
  initialSection?: LearningPortalSection;
  onBack?: () => void;
  onNavigateAppTab?: (tab: any) => void;
  onOpenNotifications?: () => void;
  onOpenAccountSettings?: () => void;
  onToggleSidebar?: () => void;
}

export const LearningPortalView: React.FC<LearningPortalViewProps> = ({
  initialSection = 'overview',
  onBack,
  onNavigateAppTab,
  onOpenNotifications,
  onOpenAccountSettings,
  onToggleSidebar,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<LearningPortalSection>(initialSection);

  // Back navigation interceptor: return to Overview from any sub-section
  useBackHandler(() => {
    if (activeSection !== 'overview') {
      setActiveSection('overview');
      return true;
    }
    return false;
  }, activeSection !== 'overview');

  const handleBackNavigation = () => {
    if (activeSection !== 'overview') {
      setActiveSection('overview');
    } else if (onBack) {
      onBack();
    }
  };

  // Global state across portal
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [mySubmissionsCount, setMySubmissionsCount] = useState(0);
  const [myQuizzesCompletedCount, setMyQuizzesCompletedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPortalData();
  }, [isAdmin, currentUser]);

  // Refresh learning data when another signed-in device changes cloud-backed portal records.
  useEffect(() => {
    const handleLearningCloudChange = (event: Event) => {
      const table = (event as CustomEvent<{ table?: string }>).detail?.table;
      if (
        !table ||
        table === '*' ||
        ['learning_assignments', 'learning_assignment_submissions', 'learning_events', 'learning_resources', 'learning_quizzes', 'learning_quiz_questions', 'learning_quiz_sync_state'].includes(table)
      ) {
        void loadPortalData();
      }
    };
    window.addEventListener('fni:cloud-data-changed', handleLearningCloudChange);
    return () => window.removeEventListener('fni:cloud-data-changed', handleLearningCloudChange);
  }, [isAdmin, currentUser?.id]);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const loadPortalData = async () => {
    setIsLoading(true);
    try {
      const [asgs, qzs, evts] = await Promise.all([
        LearningService.getAssignments(isAdmin),
        LearningService.getQuizzes(isAdmin),
        LearningService.getEvents(),
      ]);
      setAssignments(asgs);
      setQuizzes(qzs);
      setEvents(evts);

      if (!isAdmin && currentUser?.id) {
        const [mySubs, myAtts] = await Promise.all([
          LearningService.getSubmissions(undefined, currentUser.id),
          LearningService.getQuizAttempts(undefined, currentUser.id),
        ]);
        const uniqueSubAsg = new Set(mySubs.map(s => s.assignment_id));
        setMySubmissionsCount(uniqueSubAsg.size);
        const uniqueQuiz = new Set(myAtts.map(a => a.quiz_id));
        setMyQuizzesCompletedCount(uniqueQuiz.size);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 8 Core Sub-sections matching user requirements
  const sections: { id: LearningPortalSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'assignments', label: 'Assignments', icon: BookOpen },
    { id: 'quizzes', label: 'Quizzes', icon: FileCheck2 },
    { id: 'participation', label: 'Participation', icon: Users },
    { id: 'grades', label: 'Grades & Scores', icon: BarChart3 },
    { id: 'events', label: 'Upcoming Events', icon: Calendar },
    { id: 'materials', label: 'Learning Materials', icon: Library },
    { id: 'gallery', label: 'Media Gallery', icon: ImageIcon },
  ];

  return (
    <div className="fni-learning-stitch min-h-full flex flex-col lg:flex-row">
      <aside className="fni-learning-sidebar hidden lg:flex" aria-label="Learning administration menu">
        <div className="fni-learning-sidebar-brand">
          <div className="fni-learning-brand-mark"><GraduationCap className="h-6 w-6" /></div>
          <div><strong>FNI</strong><span>CELLS CONNECT</span></div>
        </div>
        <div className="fni-learning-sidebar-caption">LEARNING &amp; ASSESSMENT</div>
        <nav className="fni-learning-sidebar-nav" aria-label="Learning sections">
          {sections.map(sec => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'is-active' : ''}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                <span>{sec.label}</span>
                {sec.id === 'assignments' && assignments.filter(a => a.status === 'published').length > 0 && (
                  <span className="fni-learning-nav-count">{assignments.filter(a => a.status === 'published').length}</span>
                )}
                {sec.id === 'quizzes' && quizzes.filter(q => q.status === 'published').length > 0 && (
                  <span className="fni-learning-nav-count">{quizzes.filter(q => q.status === 'published').length}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="fni-learning-sidebar-footer">
          <div className="fni-learning-sidebar-user-avatar">
            {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" /> : (currentUser?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'FN')}
          </div>
          <div className="fni-learning-sidebar-user-copy">
            <strong>{currentUser?.full_name || 'FNI Member'}</strong>
            <span>{isAdmin ? 'Administrator' : 'Fellowship Tutor'}</span>
          </div>
        </div>
      </aside>

      <div className="fni-learning-workspace flex min-w-0 flex-1 flex-col">
        <header className="fni-learning-topbar">
          <div className="flex min-w-0 items-center gap-3">
            {onBack && (
              <button type="button" onClick={handleBackNavigation} className="fni-learning-back" aria-label="Back to previous page">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="fni-learning-breadcrumb">
              <span>FNI Cells Connect</span><span aria-hidden="true">/</span><strong>Learning &amp; Assessment</strong>
            </div>
          </div>
          <div className="fni-learning-top-actions">
            <span className="fni-learning-sync-state"><span />{isLoading ? 'Syncing records' : 'Connected to learning records'}</span>
            <button type="button" onClick={() => void loadPortalData()} aria-label="Refresh learning records" title="Refresh learning records" className="fni-learning-icon-action">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {isAdmin && (
              <button type="button" onClick={() => setActiveSection('assignments')} className="fni-learning-create-action">
                <Plus className="h-4 w-4" /><span>Create assessment</span>
              </button>
            )}
            <button type="button" onClick={onOpenAccountSettings} aria-label="Open account settings" className="fni-learning-top-avatar">
              {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" /> : (currentUser?.full_name?.charAt(0).toUpperCase() || 'F')}
            </button>
          </div>
        </header>

        <main className="fni-learning-main">
          <section className="fni-learning-page-heading">
            <div>
              <p className="fni-learning-eyebrow">{isAdmin ? 'ADMINISTRATION WORKSPACE' : 'TUTOR LEARNING WORKSPACE'}</p>
              <h1>Learning &amp; Assessment</h1>
              <p>{isAdmin ? 'Manage learning activities, monitor participation and review assessment outcomes.' : 'Access your fellowship learning materials, complete assessments and track your progress.'}</p>
            </div>
            {isAdmin && (
              <button type="button" onClick={() => setActiveSection('assignments')} className="fni-learning-create-action fni-learning-heading-create">
                <Plus className="h-4 w-4" /> Create assessment
              </button>
            )}
          </section>

          <nav className="fni-learning-mobile-nav" aria-label="Learning sections">
            {sections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button key={sec.id} type="button" onClick={() => setActiveSection(sec.id)} aria-current={isActive ? 'page' : undefined} className={isActive ? 'is-active' : ''}>
                  <Icon className="h-4 w-4" aria-hidden="true" /><span>{sec.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="fni-learning-section-content min-w-0">
            {activeSection === 'overview' && (
              <LearningOverviewView
                onNavigateSection={sec => setActiveSection(sec)}
                assignments={assignments}
                quizzes={quizzes}
                events={events}
                mySubmissionsCount={mySubmissionsCount}
                myQuizzesCompletedCount={myQuizzesCompletedCount}
                onNavigateAppTab={onNavigateAppTab}
                onOpenNotifications={onOpenNotifications}
                onOpenAccountSettings={onOpenAccountSettings}
                onToggleSidebar={onToggleSidebar}
                onBack={onBack}
              />
            )}
            {activeSection === 'assignments' && <LearningAssignmentsView assignments={assignments} onRefresh={loadPortalData} />}
            {activeSection === 'quizzes' && <LearningQuizzesView quizzes={quizzes} onRefresh={loadPortalData} />}
            {activeSection === 'participation' && <LearningParticipationView />}
            {activeSection === 'grades' && <LearningGradesView assignments={assignments} />}
            {activeSection === 'events' && <LearningEventsView events={events} onRefresh={loadPortalData} />}
            {activeSection === 'materials' && <LearningMaterialsView />}
            {activeSection === 'gallery' && <LearningGalleryView />}
          </div>
        </main>
      </div>
    </div>

};
