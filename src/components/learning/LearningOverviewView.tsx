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
  Search,
  MapPin,
  Video,
  User,
  MessageCircle,
  Image as ImageIcon,
  DollarSign,
  Bell,
  Menu,
  ArrowLeft,
  X,
  ExternalLink,
  GraduationCap,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { LearningPortalSection, Assignment, Quiz, LearningEvent } from '../../types/learning';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState<string>('all');

  const firstName = currentUser?.full_name ? currentUser.full_name.split(' ')[0] : 'Leader';
  const userInitials = currentUser?.full_name
    ? currentUser.full_name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'FN';

  const activeAssignments = assignments.filter(a => a.status === 'published');
  const activeQuizzes = quizzes.filter(q => q.status === 'published');

  // Format date chip (e.g., "MAY", "24", "Fri")
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

  // Default events if Supabase events are empty, to demonstrate the schedule fidelity
  const displayEvents: LearningEvent[] = events.length > 0
    ? events.filter(e => e.status === 'upcoming').slice(0, 4)
    : [
        {
          id: 'evt-1',
          title: 'Cell Leadership Summit & Training',
          description: 'Quarterly training seminar for all cell leaders and tutors.',
          event_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          start_time: '10:00 AM',
          end_time: '01:00 PM',
          location_or_link: 'Main Sanctuary / Fellowship Hall',
          meeting_type: 'in_person',
          status: 'upcoming',
          created_by: 'system',
          created_at: new Date().toISOString(),
        },
        {
          id: 'evt-2',
          title: 'Ministry Evangelism & Discipleship Class',
          description: 'Special discipleship cohort and strategy session.',
          event_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
          start_time: '02:00 PM',
          end_time: '04:00 PM',
          location_or_link: 'Room 204 / Zoom Room A',
          meeting_type: 'online',
          status: 'upcoming',
          created_by: 'system',
          created_at: new Date().toISOString(),
        },
      ];

  // 12 Quick Access cards matching the exact screenshot layout (3x4)
  const allQuickAccessItems = [
    {
      id: 'profile',
      title: 'Profile',
      subtitle: 'View & edit profile',
      icon: User,
      iconBg: 'bg-[#7F56D9] text-white',
      cardStyle: 'bg-[#F9F5FF] border-[#E9D7FE] dark:bg-[#1E1638] dark:border-[#382663]',
      onClick: () => {
        if (onOpenAccountSettings) onOpenAccountSettings();
        else if (onNavigateAppTab) onNavigateAppTab('my-account');
      },
    },
    {
      id: 'events',
      title: 'Events',
      subtitle: 'School events',
      icon: Calendar,
      iconBg: 'bg-[#F79009] text-white',
      cardStyle: 'bg-[#FFF9F5] border-[#FEDF89] dark:bg-[#2C1C0F] dark:border-[#4B2F17]',
      onClick: () => onNavigateSection('events'),
    },
    {
      id: 'staffs',
      title: 'Staffs',
      subtitle: 'Faculty directory',
      icon: Users,
      iconBg: 'bg-[#2E90FA] text-white',
      cardStyle: 'bg-[#EFF8FF] border-[#B2DDFF] dark:bg-[#0F223A] dark:border-[#17375B]',
      onClick: () => {
        if (onNavigateAppTab) onNavigateAppTab('cell-leaders');
        else onNavigateSection('participation');
      },
    },
    {
      id: 'attendance',
      title: 'Attendance',
      subtitle: 'Check attendance',
      icon: CalendarCheck,
      iconBg: 'bg-[#12B76A] text-white',
      cardStyle: 'bg-[#ECFDF3] border-[#A6F4C5] dark:bg-[#0D261C] dark:border-[#144431]',
      onClick: () => onNavigateSection('participation'),
    },
    {
      id: 'chatbox',
      title: 'Chatbox',
      subtitle: 'Message & support',
      icon: MessageCircle,
      iconBg: 'bg-[#F63D68] text-white',
      cardStyle: 'bg-[#FFF0F4] border-[#FECDCA] dark:bg-[#2D1219] dark:border-[#4C1B29]',
      onClick: () => {
        if (onNavigateAppTab) onNavigateAppTab('messages');
      },
    },
    {
      id: 'gradesheet',
      title: 'GradeSheet',
      subtitle: 'View your grades',
      icon: BarChart3,
      iconBg: 'bg-[#EAAA08] text-white',
      cardStyle: 'bg-[#FEFDF0] border-[#FEDF89] dark:bg-[#28210C] dark:border-[#453613]',
      onClick: () => onNavigateSection('grades'),
    },
    {
      id: 'gallery',
      title: 'Gallery',
      subtitle: 'Photos & albums',
      icon: ImageIcon,
      iconBg: 'bg-[#0BA5EC] text-white',
      cardStyle: 'bg-[#F0F9FF] border-[#B9E6FE] dark:bg-[#0E2333] dark:border-[#163B54]',
      onClick: () => setIsGalleryOpen(true),
    },
    {
      id: 'fees',
      title: 'Fees Details',
      subtitle: 'Payments & history',
      icon: DollarSign,
      iconBg: 'bg-[#0E9384] text-white',
      cardStyle: 'bg-[#F0FDF9] border-[#A6F4C5] dark:bg-[#0D2721] dark:border-[#144237]',
      onClick: () => {
        if (onNavigateAppTab) {
          onNavigateAppTab(isAdmin ? 'report-history' : 'my-reports');
        }
      },
    },
    {
      id: 'notices',
      title: 'Notices',
      subtitle: 'Latest updates',
      icon: Bell,
      iconBg: 'bg-[#7F56D9] text-white',
      cardStyle: 'bg-[#F9F5FF] border-[#E9D7FE] dark:bg-[#1E1638] dark:border-[#382663]',
      hasNewBadge: true,
      onClick: () => {
        if (onOpenNotifications) onOpenNotifications();
        else if (onNavigateAppTab) onNavigateAppTab('notifications');
      },
    },
    {
      id: 'assignments',
      title: 'Assignments',
      subtitle: 'Tasks & submissions',
      icon: BookOpen,
      iconBg: 'bg-[#FF692E] text-white',
      cardStyle: 'bg-[#FFF6ED] border-[#FDC4B3] dark:bg-[#2E1810] dark:border-[#4E2416]',
      onClick: () => onNavigateSection('assignments'),
    },
    {
      id: 'exams',
      title: 'Exams',
      subtitle: 'Schedule & results',
      icon: FileCheck2,
      iconBg: 'bg-[#16B364] text-white',
      cardStyle: 'bg-[#F6FEF9] border-[#A6F4C5] dark:bg-[#0D251C] dark:border-[#154231]',
      onClick: () => onNavigateSection('quizzes'),
    },
    {
      id: 'library',
      title: 'Library',
      subtitle: 'Books & resources',
      icon: Library,
      iconBg: 'bg-[#0299BA] text-white',
      cardStyle: 'bg-[#F0F9FF] border-[#BAE6FD] dark:bg-[#0E2434] dark:border-[#153C56]',
      onClick: () => onNavigateSection('materials'),
    },
  ];

  // Search filter
  const filteredQuickAccess = searchQuery.trim()
    ? allQuickAccessItems.filter(
        item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allQuickAccessItems;

  const filteredEvents = searchQuery.trim()
    ? displayEvents.filter(
        e =>
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.location_or_link.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayEvents;

  // Mock photo albums for the interactive gallery modal
  const galleryItems = [
    { id: 1, title: 'Annual Cell Leaders Summit 2026', category: 'leadership', count: '48 Photos', cover: 'bg-gradient-to-br from-[#142B4A] to-[#203D63]' },
    { id: 2, title: 'Evangelism & Harvest Outreach', category: 'outreach', count: '64 Photos', cover: 'bg-gradient-to-br from-amber-600 to-yellow-500' },
    { id: 3, title: 'Youth & Academic Fellowships', category: 'fellowship', count: '32 Photos', cover: 'bg-gradient-to-br from-indigo-600 to-purple-600' },
    { id: 4, title: 'Regional Tutors Orientation', category: 'leadership', count: '29 Photos', cover: 'bg-gradient-to-br from-teal-600 to-emerald-600' },
    { id: 5, title: 'Quarterly Holy Communion & Prayer', category: 'fellowship', count: '52 Photos', cover: 'bg-gradient-to-br from-rose-600 to-pink-600' },
    { id: 6, title: 'New Convert Discipleship Cohort', category: 'outreach', count: '41 Photos', cover: 'bg-gradient-to-br from-blue-600 to-cyan-600' },
  ];

  const filteredGallery = selectedGalleryCategory === 'all'
    ? galleryItems
    : galleryItems.filter(g => g.category === selectedGalleryCategory);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header Banner matching reference design */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#4F46E5] text-white p-5 sm:p-7 shadow-lg">
        {/* Ambient decorative glowing circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-[#C6A45A]/20 blur-xl pointer-events-none" />

        {/* Top bar with Navigation, Title, Notifications & Avatar */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {onToggleSidebar ? (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
                title="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            ) : onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : null}

            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                Student Portal
              </h1>
              <div className="text-[10px] sm:text-[11px] font-semibold text-blue-100/90 tracking-wide uppercase">
                {isAdmin ? 'Admin Directorate' : 'Tutor Academy'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell with Badge */}
            <button
              type="button"
              onClick={onOpenNotifications || (() => onNavigateAppTab && onNavigateAppTab('notifications'))}
              className="relative p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                  3
                </span>
              )}
            </button>

            {/* Profile Avatar circle */}
            <button
              type="button"
              onClick={onOpenAccountSettings || (() => onNavigateAppTab && onNavigateAppTab('my-account'))}
              className="w-10 h-10 rounded-full border-2 border-white/60 bg-white/20 flex items-center justify-center text-white font-black text-xs shadow-xs hover:scale-105 transition-transform cursor-pointer"
              title="My Account"
            >
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>{userInitials}</span>
              )}
            </button>
          </div>
        </div>

        {/* Greeting line */}
        <div className="relative z-10 my-3">
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Hello, {firstName} 👋
          </div>
          <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
            Have a great day ahead!
          </p>
        </div>

        {/* Search bar inside banner pill */}
        <div className="relative z-10 mt-4">
          <div className="relative flex items-center bg-white text-[#182230] rounded-full shadow-md px-3.5 py-2.5 sm:py-3 transition-all focus-within:ring-2 focus-within:ring-[#C6A45A]">
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search anything..."
              className="w-full text-xs sm:text-sm bg-transparent placeholder-slate-400 text-[#182230] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Quick Access Grid (3 Columns on Mobile, 3x4 Layout matching Reference Image) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base sm:text-lg font-bold text-[#182230] dark:text-white">
            Quick Access
          </h2>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs font-semibold text-[#7F56D9] dark:text-[#B692F6] hover:underline cursor-pointer"
          >
            View All
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
          {filteredQuickAccess.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`relative p-2.5 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-sm active:scale-98 ${item.cardStyle}`}
              >
                {/* NEW Badge on Notices card */}
                {item.hasNewBadge && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.2 rounded-full bg-[#7F56D9] text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-xs">
                    NEW
                  </span>
                )}

                {/* Circular Icon Container */}
                <div className="flex items-start justify-between">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-xs shrink-0 ${item.iconBg}`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                {/* Card Title, Subtitle and Chevron */}
                <div className="mt-2.5 sm:mt-3 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] sm:text-xs md:text-sm text-[#182230] dark:text-white truncate">
                      {item.title}
                    </span>
                    <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#98A2B3] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-0.5" />
                  </div>
                  <p className="text-[9px] sm:text-[10px] md:text-[11px] text-[#667085] dark:text-slate-300 mt-0.5 truncate leading-tight">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Upcoming Events Section matching reference design */}
      <div className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-[#E3E8EF] dark:border-[#26384d]">
          <h3 className="font-bold text-sm sm:text-base text-[#182230] dark:text-white">
            Upcoming Events
          </h3>
          <button
            type="button"
            onClick={() => onNavigateSection('events')}
            className="text-xs font-semibold text-[#7F56D9] dark:text-[#B692F6] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Calendar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#667085] dark:text-slate-400">
            No events match your search.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredEvents.map(evt => {
              const chip = formatDateChip(evt.event_date);
              return (
                <div
                  key={evt.id}
                  onClick={() => onNavigateSection('events')}
                  className="flex items-center justify-between p-3 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] hover:border-[#7F56D9]/40 dark:hover:border-[#7F56D9]/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    {/* Lavender Date Box with Month, Day, Weekday */}
                    <div className="w-12 h-14 sm:w-14 sm:h-16 rounded-2xl bg-[#F4F0FF] dark:bg-[#251B42] text-[#7F56D9] dark:text-[#D6BBFB] border border-[#E9D7FE] dark:border-[#3E2C68] flex flex-col items-center justify-center shrink-0 shadow-2xs py-1">
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider leading-none">
                        {chip.month}
                      </span>
                      <span className="text-base sm:text-lg font-black leading-tight my-0.5">
                        {chip.day}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-300 leading-none">
                        {chip.weekday}
                      </span>
                    </div>

                    {/* Event Info */}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs sm:text-sm text-[#182230] dark:text-white truncate group-hover:text-[#7F56D9] dark:group-hover:text-[#B692F6] transition-colors">
                        {evt.title}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[10px] sm:text-[11px] text-[#667085] dark:text-slate-300 mt-1">
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-[#7F56D9] dark:text-[#B692F6]" />
                          <span>{evt.start_time} - {evt.end_time}</span>
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[200px] sm:max-w-none">
                          {evt.meeting_type === 'online' ? (
                            <Video className="w-3 h-3 text-blue-500 shrink-0" />
                          ) : (
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          )}
                          <span className="truncate">{evt.location_or_link}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Upcoming Status Pill Badge */}
                  <span className="px-2.5 py-1 rounded-full bg-[#F4F0FF] text-[#7F56D9] dark:bg-[#251B42] dark:text-[#D6BBFB] border border-[#E9D7FE] dark:border-[#3E2C68] text-[10px] font-bold shrink-0 ml-2">
                    Upcoming
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* View All Events centered link */}
        <div className="mt-4 pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] text-center">
          <button
            type="button"
            onClick={() => onNavigateSection('events')}
            className="text-xs font-bold text-[#7F56D9] dark:text-[#B692F6] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View All Events</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Ministry Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl border border-[#E3E8EF] dark:border-[#26384d] max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF] dark:border-[#26384d]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0BA5EC] text-white flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#182230] dark:text-white">
                    Ministry Photos & Albums
                  </h3>
                  <p className="text-[11px] text-[#667085] dark:text-slate-400">
                    FNI Cells Connect media repository
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Albums' },
                { id: 'leadership', label: 'Leadership' },
                { id: 'outreach', label: 'Outreach & Harvest' },
                { id: 'fellowship', label: 'Fellowship' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedGalleryCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    selectedGalleryCategory === cat.id
                      ? 'bg-[#7F56D9] text-white'
                      : 'bg-[#F5F7FA] dark:bg-[#172437] text-[#667085] dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Albums Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
              {filteredGallery.map(album => (
                <div
                  key={album.id}
                  className="rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] overflow-hidden group hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#172437]"
                >
                  <div className={`h-24 sm:h-28 ${album.cover} flex items-center justify-center text-white/40 group-hover:scale-105 transition-transform`}>
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div className="p-2.5">
                    <h4 className="text-xs font-bold text-[#182230] dark:text-white truncate">
                      {album.title}
                    </h4>
                    <p className="text-[10px] text-[#667085] dark:text-slate-400 mt-0.5">
                      {album.count}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] transition-colors cursor-pointer"
              >
                Close Gallery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
