import React, { useState } from 'react';
import {
  BookOpen,
  FileCheck2,
  Users,
  BarChart3,
  Calendar,
  Library,
  ChevronRight,
  Clock,
  GraduationCap,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MapPin,
  Video,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LearningPortalSection, Assignment, Quiz, LearningEvent } from '../../types/learning';

interface LearningOverviewViewProps {
  onNavigateSection: (section: LearningPortalSection) => void;
  assignments: Assignment[];
  quizzes: Quiz[];
  events: LearningEvent[];
  mySubmissionsCount: number;
  myQuizzesCompletedCount: number;
}

export const LearningOverviewView: React.FC<LearningOverviewViewProps> = ({
  onNavigateSection,
  assignments,
  quizzes,
  events,
  mySubmissionsCount,
  myQuizzesCompletedCount,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const firstName = currentUser?.full_name ? currentUser.full_name.split(' ')[0] : 'Leader';

  const upcomingEvents = events
    .filter(e => e.status === 'upcoming')
    .slice(0, 3);

  const activeAssignments = assignments.filter(a => a.status === 'published');
  const activeQuizzes = quizzes.filter(q => q.status === 'published');

  // Format date chip (e.g., "MAY", "24", "Fri")
  const formatDateChip = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const day = d.getDate();
      const weekday = d.toLocaleString('en-US', { weekday: 'short' });
      return { month, day, weekday };
    } catch {
      return { month: 'EVT', day: '01', weekday: 'Day' };
    }
  };

  // Quick access cards inspired by the reference student portal design
  const quickAccessItems = [
    {
      id: 'assignments' as LearningPortalSection,
      title: 'Assignments',
      subtitle: `${activeAssignments.length} active tasks`,
      bgTint: 'bg-amber-50/70 border-amber-200/70 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:border-amber-800/40',
      iconBg: 'bg-amber-500 text-white',
      icon: BookOpen,
      badge: activeAssignments.length > 0 ? `${activeAssignments.length}` : undefined,
    },
    {
      id: 'quizzes' as LearningPortalSection,
      title: 'Quizzes',
      subtitle: `${activeQuizzes.length} available tests`,
      bgTint: 'bg-emerald-50/70 border-emerald-200/70 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:border-emerald-800/40',
      iconBg: 'bg-emerald-600 text-white',
      icon: FileCheck2,
      badge: activeQuizzes.length > 0 ? `${activeQuizzes.length}` : undefined,
    },
    {
      id: 'participation' as LearningPortalSection,
      title: 'Participation',
      subtitle: isAdmin ? 'Monitor all active tutors' : 'My training compliance',
      bgTint: 'bg-blue-50/70 border-blue-200/70 hover:bg-blue-100/60 dark:bg-blue-950/20 dark:border-blue-800/40',
      iconBg: 'bg-blue-600 text-white',
      icon: Users,
    },
    {
      id: 'grades' as LearningPortalSection,
      title: 'Grades & Scores',
      subtitle: isAdmin ? 'Review & publish marks' : 'View marks & feedback',
      bgTint: 'bg-violet-50/70 border-violet-200/70 hover:bg-violet-100/60 dark:bg-violet-950/20 dark:border-violet-800/40',
      iconBg: 'bg-violet-600 text-white',
      icon: BarChart3,
    },
    {
      id: 'events' as LearningPortalSection,
      title: 'Upcoming Events',
      subtitle: `${upcomingEvents.length} scheduled sessions`,
      bgTint: 'bg-rose-50/70 border-rose-200/70 hover:bg-rose-100/60 dark:bg-rose-950/20 dark:border-rose-800/40',
      iconBg: 'bg-rose-500 text-white',
      icon: Calendar,
    },
    {
      id: 'materials' as LearningPortalSection,
      title: 'Learning Materials',
      subtitle: 'Official manuals & library',
      bgTint: 'bg-indigo-50/70 border-indigo-200/70 hover:bg-indigo-100/60 dark:bg-indigo-950/20 dark:border-indigo-800/40',
      iconBg: 'bg-indigo-600 text-white',
      icon: Library,
      badge: 'NEW',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner matching reference design */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#142B4A] via-[#1E3A64] to-[#2B4C7E] text-white p-6 sm:p-8 shadow-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[#E9D9B2] text-[11px] font-bold uppercase tracking-wider mb-2 border border-white/10">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>FNI Cells Connect &bull; Learning Directorate</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isAdmin ? 'Administrator Learning Portal' : 'Tutor Learning Portal'}
            </h1>
            <p className="text-sm text-slate-200 mt-1">
              Hello, {firstName} 👋 Have a fruitful session building the Kingdom!
            </p>
          </div>

          {/* Quick Metrics Chip */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
            <div className="text-center px-2">
              <div className="text-xl font-black text-[#E9D9B2]">
                {isAdmin ? activeAssignments.length : `${mySubmissionsCount}/${activeAssignments.length}`}
              </div>
              <div className="text-[10px] text-slate-300 font-semibold uppercase">
                {isAdmin ? 'Assignments' : 'Submitted'}
              </div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-2">
              <div className="text-xl font-black text-white">
                {isAdmin ? activeQuizzes.length : `${myQuizzesCompletedCount}/${activeQuizzes.length}`}
              </div>
              <div className="text-[10px] text-slate-300 font-semibold uppercase">
                {isAdmin ? 'Quizzes' : 'Quizzes Done'}
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar matching reference mockup */}
        <div className="relative mt-6 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search assignments, quizzes, materials or events..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl bg-white/95 text-[#182230] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C6A45A] shadow-xs"
          />
        </div>
      </div>

      {/* 2. Quick Access Grid (Exact styling pattern from user reference image) */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base font-bold text-[#142B4A] dark:text-white">
            Quick Access
          </h2>
          <span className="text-xs text-[#667085] font-semibold">
            All 7 Functional Modules
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
          {quickAccessItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigateSection(item.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-sm ${item.bgTint}`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${item.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-[#142B4A] text-white text-[10px] font-black">
                      {item.badge}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#182230] dark:text-white group-hover:text-[#142B4A]">
                      {item.title}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#667085] group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-0.5 truncate">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Upcoming Events Section (Clean Date Card style matching reference photo) */}
      <div className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E3E8EF] dark:border-[#26384d]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C6A45A]" />
            <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
              Upcoming Training Sessions & Events
            </h3>
          </div>
          <button
            onClick={() => onNavigateSection('events')}
            className="text-xs font-bold text-[#C6A45A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Events</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#667085]">
            No upcoming events scheduled at this moment.
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map(evt => {
              const chip = formatDateChip(evt.event_date);
              return (
                <div
                  key={evt.id}
                  onClick={() => onNavigateSection('events')}
                  className="flex items-center justify-between p-3 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] hover:border-[#C6A45A]/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Date Chip */}
                    <div className="w-12 h-13 rounded-xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] flex flex-col items-center justify-center shrink-0 shadow-2xs">
                      <span className="text-[9px] font-black uppercase text-[#C74646]">
                        {chip.month}
                      </span>
                      <span className="text-base font-black text-[#142B4A] dark:text-white leading-none">
                        {chip.day}
                      </span>
                      <span className="text-[9px] font-semibold text-[#667085]">
                        {chip.weekday}
                      </span>
                    </div>

                    {/* Event Info */}
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-[#182230] dark:text-white truncate group-hover:text-[#142B4A]">
                        {evt.title}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#667085] dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#C6A45A]" />
                          {evt.start_time} - {evt.end_time}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          {evt.meeting_type === 'online' ? (
                            <Video className="w-3 h-3 text-blue-500" />
                          ) : (
                            <MapPin className="w-3 h-3 text-emerald-500" />
                          )}
                          <span className="truncate">{evt.location_or_link}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 text-[10px] font-bold shrink-0 ml-2">
                    Upcoming
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Active Tasks Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Assignments */}
        <div className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF] dark:border-[#26384d] mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
                Active Assignments
              </h3>
            </div>
            <button
              onClick={() => onNavigateSection('assignments')}
              className="text-xs font-bold text-[#C6A45A] hover:underline"
            >
              Open Module &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {activeAssignments.slice(0, 2).map(asg => (
              <div
                key={asg.id}
                onClick={() => onNavigateSection('assignments')}
                className="p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] hover:bg-[#F5F7FA] dark:hover:bg-[#172437] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs text-[#182230] dark:text-white">
                    {asg.title}
                  </div>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 shrink-0">
                    {asg.total_marks} Marks
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#667085] mt-2">
                  <span>Due: {new Date(asg.due_date).toLocaleDateString()}</span>
                  <span>Attempts: {asg.max_attempts === 0 ? 'Unlimited' : asg.max_attempts}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Available Quizzes */}
        <div className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF] dark:border-[#26384d] mb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
                Available Quizzes
              </h3>
            </div>
            <button
              onClick={() => onNavigateSection('quizzes')}
              className="text-xs font-bold text-[#C6A45A] hover:underline"
            >
              Open Module &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {activeQuizzes.slice(0, 2).map(quiz => (
              <div
                key={quiz.id}
                onClick={() => onNavigateSection('quizzes')}
                className="p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] hover:bg-[#F5F7FA] dark:hover:bg-[#172437] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs text-[#182230] dark:text-white">
                    {quiz.title}
                  </div>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0">
                    {quiz.total_points} Pts
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#667085] mt-2">
                  <span>Time: {quiz.time_limit_minutes} mins</span>
                  <span>Pass mark: {quiz.passing_score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
