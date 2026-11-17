import React, { useState, useEffect } from 'react';
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

interface LearningPortalViewProps {
  initialSection?: LearningPortalSection;
  onBack?: () => void;
}

export const LearningPortalView: React.FC<LearningPortalViewProps> = ({
  initialSection = 'overview',
  onBack,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<LearningPortalSection>(initialSection);

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

  // 7 Core Sub-sections matching user requirements
  const sections: { id: LearningPortalSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'assignments', label: 'Assignments', icon: BookOpen },
    { id: 'quizzes', label: 'Quizzes', icon: FileCheck2 },
    { id: 'participation', label: 'Participation', icon: Users },
    { id: 'grades', label: 'Grades & Scores', icon: BarChart3 },
    { id: 'events', label: 'Upcoming Events', icon: Calendar },
    { id: 'materials', label: 'Learning Materials', icon: Library },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Portal Navigation Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E3E8EF] dark:border-[#26384d]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#172437] hover:bg-[#E3E8EF] text-[#142B4A] dark:text-slate-200 transition-colors cursor-pointer group"
              title="Return to main dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#142B4A] text-[#C6A45A] flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-[#142B4A] dark:text-white tracking-tight">
                  Learning Portal
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                  {isAdmin ? 'ADMIN DIRECTORATE' : 'TUTOR ACADEMY'}
                </span>
              </div>
              <p className="text-[11px] text-[#667085] dark:text-slate-400">
                Institutional fellowship training, assignments, quizzes, and ministerial resources.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Section Switcher Tabs (All 7 Sections with responsive scrolling) */}
      <div className="bg-white dark:bg-[#111c2d] p-1.5 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {sections.map(sec => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#142B4A] text-white shadow-2xs'
                    : 'text-[#667085] hover:text-[#182230] dark:hover:text-white hover:bg-[#F5F7FA] dark:hover:bg-[#172437]'
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
      </div>
    </div>
  );
};
