import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppNavTab } from '../../types';
import {
  LayoutDashboard,
  Calendar,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  Library,
  Building,
  Users,
  FileCheck,
  Flame,
  UserCheck,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  FileText,
  Clock,
  User,
  History,
  Shield,
  Send,
  DollarSign,
  BookOpen,
  MessageSquare,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentTab: AppNavTab;
  onSelectTab: (tab: AppNavTab) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onOpenAccountSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
  unreadCount = 0,
  onOpenNotifications,
  onOpenAccountSettings,
}) => {
  const { currentUser, logout, isAdmin } = useAuth();
  const [isLearningExpanded, setIsLearningExpanded] = React.useState<boolean>(() => {
    return currentTab.startsWith('learning-') || currentTab === 'learning-portal';
  });

  const [isCellsExpanded, setIsCellsExpanded] = React.useState<boolean>(() => {
    return currentTab === 'cell-management' || currentTab === 'cell-leaders';
  });

  React.useEffect(() => {
    if (currentTab.startsWith('learning-') || currentTab === 'learning-portal') {
      setIsLearningExpanded(true);
    }
  }, [currentTab]);

  React.useEffect(() => {
    if (currentTab === 'cell-management' || currentTab === 'cell-leaders') {
      setIsCellsExpanded(true);
    }
  }, [currentTab]);

  // Administrator Portal Navigation: Full institutional oversight
  const adminNavItems = [
    { id: 'dashboard' as AppNavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cells-dropdown' as any, label: 'Cells', icon: Building, isExpandable: true },
    { id: 'report-review' as AppNavTab, label: 'Accept / Decline Reports', icon: FileCheck },
    { id: 'learning-portal' as AppNavTab, label: 'Learning Portal', icon: GraduationCap, isExpandable: true },
    { id: 'evangelism' as AppNavTab, label: 'Evangelism', icon: Flame },
    { id: 'follow-ups' as AppNavTab, label: 'Follow-ups', icon: UserCheck },
    { id: 'finance' as AppNavTab, label: 'Offering Aggregation', icon: DollarSign },
    { id: 'materials' as AppNavTab, label: 'Teaching Outlines', icon: BookOpen },
    { id: 'messages' as AppNavTab, label: 'Communications Hub', icon: MessageSquare },
    { id: 'analytics' as AppNavTab, label: 'Analytics', icon: BarChart3 },
    { id: 'notifications' as AppNavTab, label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'settings' as AppNavTab, label: 'Settings', icon: Settings },
  ];

  // Tutor Portal Navigation: Dedicated fellowship tools
  const tutorNavItems = [
    { id: 'my-dashboard' as AppNavTab, label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'my-cell' as AppNavTab, label: 'My Cell', icon: Building },
    { id: 'submit-cell-meeting-report' as AppNavTab, label: 'Submit Meeting Report', icon: FileText },
    { id: 'submit-evangelism-report' as AppNavTab, label: 'Submit Evangelism Report', icon: Flame },
    { id: 'my-reports' as AppNavTab, label: 'My Reports', icon: FileCheck },
    { id: 'learning-portal' as AppNavTab, label: 'Learning Portal', icon: GraduationCap, isExpandable: true },
    { id: 'evangelism-contacts' as AppNavTab, label: 'Evangelism Contacts', icon: Users },
    { id: 'follow-ups' as AppNavTab, label: 'Follow-ups', icon: UserCheck },
    { id: 'materials' as AppNavTab, label: 'Teaching Outlines', icon: BookOpen },
    { id: 'messages' as AppNavTab, label: 'Communications Hub', icon: MessageSquare },
    { id: 'cell-activity-history' as AppNavTab, label: 'Cell Activity History', icon: History },
    { id: 'notifications' as AppNavTab, label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'my-account' as AppNavTab, label: 'My Account', icon: User },
  ];

  // Cells Sub-modules
  const cellsSubItems = [
    { id: 'cell-management' as AppNavTab, label: 'Cell Management', icon: Building },
    { id: 'cell-leaders' as AppNavTab, label: 'Cell Leaders', icon: Users },
  ];

  // Learning Portal Sub-modules
  const learningSubItems = [
    { id: 'learning-portal' as AppNavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'learning-assignments' as AppNavTab, label: 'Assignments', icon: BookOpen },
    { id: 'learning-quizzes' as AppNavTab, label: 'Quizzes', icon: FileCheck2 },
    { id: 'learning-participation' as AppNavTab, label: 'Participation', icon: Users },
    { id: 'learning-grades' as AppNavTab, label: 'Grades & Scores', icon: BarChart3 },
    { id: 'learning-events' as AppNavTab, label: 'Upcoming Events', icon: Calendar || History },
    { id: 'learning-materials' as AppNavTab, label: 'Learning Materials', icon: Library || BookOpen },
  ];

  const navItems = isAdmin ? adminNavItems : tutorNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#142B4A]/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container: Fixed to the left on all devices */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 sm:w-64 bg-white text-[#182230] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-[#E3E8EF] shadow-lg md:shadow-xs`}
      >
        {/* Top Section: Brand Header & User Profile (Fixed at top) */}
        <div className="p-4 pb-3 border-b border-[#E3E8EF] shrink-0 bg-white">
          {/* Brand Row */}
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#E3E8EF] bg-[#142B4A] flex items-center justify-center shadow-xs shrink-0">
                <img
                  src={`${import.meta.env.BASE_URL}fni-official-logo.jpg`}
                  alt="FNI Official Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-black tracking-tight text-[#142B4A] truncate">
                  FNI CELLS CONNECT
                </span>
                <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider truncate">
                  {isAdmin ? 'ADMINISTRATOR PORTAL' : 'TUTOR PORTAL'}
                </span>
              </div>
            </div>

            {/* Close Button on Mobile */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-[#667085] hover:text-[#142B4A] hover:bg-[#F5F7FA] transition-colors shrink-0"
              aria-label="Close navigation menu"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Banner with Quick Logout */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F5F7FA] border border-[#E3E8EF]">
            <div
              onClick={onOpenAccountSettings}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
              title="Account Information"
            >
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#142B4A] border-2 border-white shadow-xs flex items-center justify-center text-xs font-bold text-[#C6A45A] overflow-hidden">
                  {currentUser?.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.full_name || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : currentUser?.full_name ? (
                    currentUser.full_name
                      .split(' ')
                      .map(n => n[0])
                      .slice(0, 2)
                      .join('')
                  ) : (
                    'FN'
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#23845B] border border-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#182230] truncate group-hover:text-[#142B4A]">
                  {currentUser?.full_name}
                </div>
                <div className="text-[10px] font-medium text-[#667085] truncate">
                  {isAdmin
                    ? 'Church Leadership'
                    : currentUser?.cell_name
                    ? currentUser.cell_name
                    : 'Cell Leader'}
                </div>
              </div>
            </div>

            {/* Quick Logout Button in Profile Card */}
            <button
              onClick={logout}
              className="p-1.5 rounded-lg bg-[#FFF5F5] hover:bg-[#FEE4E2] text-[#C74646] hover:text-[#B42318] border border-[#FECDCA] transition-colors cursor-pointer shrink-0"
              title="Sign Out / Logout"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Middle Section: Navigation Links (Scrollable if screen height is small) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isLearning = item.id === 'learning-portal';
              const isLearningActive = currentTab.startsWith('learning-') || currentTab === 'learning-portal';

              const isCells = item.id === 'cells-dropdown';
              const isCellsActive = currentTab === 'cell-management' || currentTab === 'cell-leaders';

              const isActive = isLearning ? isLearningActive : isCells ? isCellsActive : currentTab === item.id;

              if (isCells) {
                return (
                  <div key={item.id} className="space-y-1">
                    <div
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isCellsActive
                          ? 'bg-[#142B4A] text-white shadow-sm'
                          : 'text-[#667085] hover:text-[#182230] hover:bg-[#F5F7FA]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTab('cell-management');
                          setIsCellsExpanded(true);
                          onCloseMobile();
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <Building className={`w-4 h-4 shrink-0 ${isCellsActive ? 'text-[#C6A45A]' : 'text-[#667085]'}`} />
                        <span className="truncate font-bold">Cells</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCellsExpanded(prev => !prev);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title={isCellsExpanded ? 'Collapse sub-menu' : 'Expand sub-menu'}
                      >
                        {isCellsExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-[#C6A45A]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Expandable Sub-items */}
                    {isCellsExpanded && (
                      <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-[#C6A45A]/30 ml-3.5 my-1 animate-fade-in">
                        {cellsSubItems.map(sub => {
                          const SubIcon = sub.icon;
                          const isSubActive = currentTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => {
                                onSelectTab(sub.id);
                                onCloseMobile();
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                isSubActive
                                  ? 'bg-[#142B4A]/10 text-[#142B4A] dark:bg-white/10 dark:text-white font-bold'
                                  : 'text-[#667085] hover:text-[#182230] dark:hover:text-white hover:bg-[#F5F7FA] dark:hover:bg-[#172437]'
                              }`}
                            >
                              <SubIcon className={`w-3 h-3 shrink-0 ${isSubActive ? 'text-[#C6A45A]' : 'text-slate-400'}`} />
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              if (isLearning) {
                return (
                  <div key={item.id} className="space-y-1">
                    <div
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isLearningActive
                          ? 'bg-[#142B4A] text-white shadow-sm'
                          : 'text-[#667085] hover:text-[#182230] hover:bg-[#F5F7FA]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTab('learning-portal');
                          setIsLearningExpanded(true);
                          onCloseMobile();
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <GraduationCap className={`w-4 h-4 shrink-0 ${isLearningActive ? 'text-[#C6A45A]' : 'text-[#667085]'}`} />
                        <span className="truncate font-bold">Learning Portal</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLearningExpanded(prev => !prev);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title={isLearningExpanded ? 'Collapse sub-menu' : 'Expand sub-menu'}
                      >
                        {isLearningExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-[#C6A45A]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Expandable Sub-items */}
                    {isLearningExpanded && (
                      <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-[#C6A45A]/30 ml-3.5 my-1 animate-fade-in">
                        {learningSubItems.map(sub => {
                          const SubIcon = sub.icon;
                          const isSubActive = currentTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => {
                                onSelectTab(sub.id);
                                onCloseMobile();
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                isSubActive
                                  ? 'bg-[#142B4A]/10 text-[#142B4A] dark:bg-white/10 dark:text-white font-bold'
                                  : 'text-[#667085] hover:text-[#182230] dark:hover:text-white hover:bg-[#F5F7FA] dark:hover:bg-[#172437]'
                              }`}
                            >
                              <SubIcon className={`w-3 h-3 shrink-0 ${isSubActive ? 'text-[#C6A45A]' : 'text-slate-400'}`} />
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#142B4A] text-white shadow-sm'
                      : 'text-[#667085] hover:text-[#182230] hover:bg-[#F5F7FA]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C6A45A]' : 'text-[#667085]'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#C74646] text-white text-[10px] font-bold">
                      {item.badge}
                    </span>
                  ) : isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A45A]" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Sunday Deadline & Prominent Big Red Logout Button (Always pinned and visible) */}
        <div className="p-3 border-t border-[#E3E8EF] shrink-0 bg-white space-y-2">
          <div className="p-2.5 bg-[#F5F7FA] border border-[#E3E8EF] rounded-xl text-[11px] text-[#667085]">
            <div className="flex items-center gap-1.5 text-[#142B4A] font-bold">
              <Clock className="w-3.5 h-3.5 text-[#C6A45A]" />
              <span>Reporting Deadline</span>
            </div>
            <div className="text-[#182230] font-semibold mt-0.5">
              Sunday 6:00 PM GMT
            </div>
            <div className="text-[10px] text-[#667085]">
              Timezone: Africa/Accra
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold text-[#C74646] hover:text-[#B42318] bg-[#FFF5F5] hover:bg-[#FEE4E2] border border-[#FECDCA] rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Sign Out of FNI Cells Connect"
          >
            <LogOut className="w-4 h-4 text-[#C74646]" />
            <span>Sign Out / Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
