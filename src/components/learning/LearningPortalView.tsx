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
    <div className="space-y-6">
      {/* Learning Hub brand and primary actions */}
      <header className="flex items-center justify-between gap-3 border-b border-[#DCE3EC] pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#142842] text-[#EEC068]">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-display text-lg font-bold tracking-tight text-[#142842] dark:text-white">FNI</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8E6C23]">Cells Connect</span>
              <span className="hidden h-4 w-px bg-[#DCE3EC] sm:block" aria-hidden="true" />
              <span className="hidden text-xs font-semibold text-[#5A6B7C] sm:inline">{isAdmin ? 'Administration' : 'Tutor Academy'}</span>
            </div>
            <p className="truncate text-xs text-[#5A6B7C] dark:text-slate-400">Learning &amp; Assessment</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => void loadPortalData()} aria-label="Refresh learning records" title="Refresh"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE3EC] bg-white text-[#354863] transition-colors hover:bg-[#EEF2F7] focus:outline-none focus:ring-2 focus:ring-[#8E6C23]/30 dark:border-slate-700 dark:bg-[#111c2d] dark:text-slate-200">
            <RefreshCw className="h-4 w-4" />
          </button>
          {isAdmin && (
            <button type="button" onClick={() => setActiveSection('assignments')}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#142842] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E314C] focus:outline-none focus:ring-2 focus:ring-[#8E6C23]/40">
              <Plus className="h-4 w-4 text-[#EEC068]" />
              <span className="hidden sm:inline">Create assessment</span>
              <span className="sm:hidden">Create</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Top Section Switcher Tabs (All 7 Sections with responsive scrolling) */}
      <div className="overflow-x-auto rounded-xl border border-[#DCE3EC] bg-white p-1.5 shadow-sm custom-scrollbar dark:border-slate-700 dark:bg-[#111c2d]">
        <div role="tablist" aria-label="Learning sections" className="flex min-w-max items-center gap-1">
          {sections.map(sec => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#142842] text-white shadow-sm'
                    : 'text-[#5A6B7C] hover:bg-[#EEF2F7] hover:text-[#142842] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#C6A45A]' : ''}`} />
                <span>{sec.label}</span>
                {sec.id === 'assignments' && assignments.filter(a => a.status === 'published').length > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-[#C6A45A] text-[#142B4A]' : 'bg-slate-100 dark:bg-slate-800 text-[#667085]'
                  }`}>
                    {assignments.filter(a => a.status === 'published').length}
                  </span>
                )}
                {sec.id === 'quizzes' && quizzes.filter(q => q.status === 'published').length > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-[#C6A45A] text-[#142B4A]' : 'bg-slate-100 dark:bg-slate-800 text-[#667085]'
                  }`}>
                    {quizzes.filter(q => q.status === 'published').length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Section Content Renderer */}
      <div className="min-w-0">
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

        {activeSection === 'assignments' && (
          <LearningAssignmentsView
            assignments={assignments}
            onRefresh={loadPortalData}
          />
        )}

        {activeSection === 'quizzes' && (
          <LearningQuizzesView
            quizzes={quizzes}
            onRefresh={loadPortalData}
          />
        )}

        {activeSection === 'participation' && (
          <LearningParticipationView />
        )}

        {activeSection === 'grades' && (
          <LearningGradesView assignments={assignments} />
        )}

        {activeSection === 'events' && (
          <LearningEventsView
            events={events}
            onRefresh={loadPortalData}
          />
        )}

        {activeSection === 'materials' && (
          <LearningMaterialsView />
        )}

        {activeSection === 'gallery' && (
          <LearningGalleryView />
        )}
      </div>
    </div>
  );
};
