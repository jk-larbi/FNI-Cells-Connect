import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppNavTab } from '../../types';
import { ICON_STYLES, IconColorKey } from '../../utils/iconColors';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  LogOut,
} from 'lucide-react';
import {
  TelegramDashboardIcon,
  TelegramCellsIcon,
  TelegramReportsIcon,
  TelegramLearningIcon,
  TelegramEvangelismIcon,
  TelegramFollowUpsIcon,
  TelegramFinanceIcon,
  TelegramMessagesIcon,
  TelegramCallsIcon,
  TelegramAnalyticsIcon,
  TelegramNotificationsIcon,
  TelegramAdvancedIcon as TelegramSettingsIcon,
  TelegramProfileIcon,
  TelegramHistoryIcon,
  TelegramLocationIcon,
  TelegramDeadlinesIcon,
  TelegramAssignmentsIcon,
  TelegramQuizzesIcon,
  TelegramEventsIcon,
  TelegramMaterialsIcon,
  TelegramUsersIcon,
  TelegramLogoutIcon,
} from '../common/TelegramSettingsIcons';

interface SidebarProps {
  currentTab: AppNavTab;
  onSelectTab: (tab: AppNavTab) => void;
  isOpen: boolean; // mobile drawer state
  onCloseMobile: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onOpenAccountSettings?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOverlayMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
  unreadCount = 0,
  onOpenNotifications,
  onOpenAccountSettings,
  isCollapsed = false,
  onToggleCollapse,
  isOverlayMode = false,
}) => {
  const { currentUser, logout, isAdmin } = useAuth();

  const [isLearningExpanded, setIsLearningExpanded] = useState<boolean>(() => {
    return currentTab.startsWith('learning-') || currentTab === 'learning-portal';
  });

  const [isCellsExpanded, setIsCellsExpanded] = useState<boolean>(() => {
    return currentTab === 'cell-management' || currentTab === 'cell-leaders' || currentTab === 'cell-location-history';
  });

  const [isReportsExpanded, setIsReportsExpanded] = useState<boolean>(() => {
    return currentTab === 'report-review' || currentTab === 'report-history' || currentTab === 'report-deadlines';
  });

  useEffect(() => {
    if (currentTab.startsWith('learning-') || currentTab === 'learning-portal') {
      setIsLearningExpanded(true);
    }
  }, [currentTab]);

  useEffect(() => {
    if (currentTab === 'cell-management' || currentTab === 'cell-leaders' || currentTab === 'cell-location-history') {
      setIsCellsExpanded(true);
    }
  }, [currentTab]);

  useEffect(() => {
    if (currentTab === 'report-review' || currentTab === 'report-history' || currentTab === 'report-deadlines') {
      setIsReportsExpanded(true);
    }
  }, [currentTab]);

  // Administrator Navigation
  // Keep the administrator drawer concise with dedicated section pages.
  const adminNavItems: { id: AppNavTab | 'cells-dropdown' | 'reports-dropdown'; label: string; icon: any; colorKey: IconColorKey; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: TelegramDashboardIcon, colorKey: 'gold' },
    { id: 'cells-hub', label: 'Cells', icon: TelegramCellsIcon, colorKey: 'teal' },
    { id: 'reports-hub', label: 'Reports', icon: TelegramReportsIcon, colorKey: 'emerald' },
    { id: 'ministry-hub', label: 'Ministry', icon: TelegramEvangelismIcon, colorKey: 'flame' },
    { id: 'more-hub', label: 'More', icon: TelegramSettingsIcon, colorKey: 'slate' },
  ];

  // Tutor Navigation
  const tutorNavItems: { id: AppNavTab; label: string; icon: any; isExpandable?: boolean; badge?: number; colorKey: IconColorKey }[] = [
    { id: 'my-dashboard' as AppNavTab, label: 'My Dashboard', icon: TelegramDashboardIcon, colorKey: 'gold' },
    { id: 'my-cell' as AppNavTab, label: 'My Cell', icon: TelegramCellsIcon, colorKey: 'teal' },
    { id: 'submit-cell-meeting-report' as AppNavTab, label: 'Submit Meeting Report', icon: TelegramReportsIcon, colorKey: 'emerald' },
    { id: 'submit-evangelism-report' as AppNavTab, label: 'Submit Evangelism Report', icon: TelegramEvangelismIcon, colorKey: 'flame' },
    { id: 'my-reports' as AppNavTab, label: 'My Reports', icon: TelegramReportsIcon, colorKey: 'emerald' },
    { id: 'learning-portal' as AppNavTab, label: 'Learning Portal', icon: TelegramLearningIcon, isExpandable: true, colorKey: 'purple' },
    { id: 'evangelism-contacts' as AppNavTab, label: 'Evangelism Contacts', icon: TelegramUsersIcon, colorKey: 'teal' },
    { id: 'follow-ups' as AppNavTab, label: 'Follow-ups', icon: TelegramFollowUpsIcon, colorKey: 'teal' },
    { id: 'messages' as AppNavTab, label: 'Communications Hub', icon: TelegramMessagesIcon, colorKey: 'azure' },
    { id: 'call-history' as AppNavTab, label: 'Calls & Meetings', icon: TelegramCallsIcon, colorKey: 'purple' },
    { id: 'cell-activity-history' as AppNavTab, label: 'Cell Activity History', icon: TelegramHistoryIcon, colorKey: 'blue' },
    { id: 'notifications' as AppNavTab, label: 'Notifications', icon: TelegramNotificationsIcon, badge: unreadCount, colorKey: 'sky' },
    { id: 'my-account' as AppNavTab, label: 'My Account', icon: TelegramProfileIcon, colorKey: 'teal' },
  ];

  // Submodules
  const cellsSubItems: { id: AppNavTab; label: string; icon: any; colorKey: IconColorKey }[] = [
    { id: 'cell-management' as AppNavTab, label: 'Cell Management', icon: TelegramCellsIcon, colorKey: 'teal' },
    { id: 'cell-leaders' as AppNavTab, label: 'Cell Leaders', icon: TelegramUsersIcon, colorKey: 'teal' },
    { id: 'cell-location-history' as AppNavTab, label: 'Cell Location History', icon: TelegramLocationIcon, colorKey: 'cyan' },
  ];

  const reportsSubItems: { id: AppNavTab; label: string; icon: any; colorKey: IconColorKey }[] = [
    { id: 'report-review' as AppNavTab, label: 'Review', icon: TelegramReportsIcon, colorKey: 'emerald' },
    { id: 'report-history' as AppNavTab, label: 'Report History', icon: TelegramHistoryIcon, colorKey: 'blue' },
    { id: 'report-deadlines' as AppNavTab, label: 'Deadline Settings', icon: TelegramDeadlinesIcon, colorKey: 'flame' },
  ];

  const learningSubItems: { id: AppNavTab; label: string; icon: any; colorKey: IconColorKey }[] = [
    { id: 'learning-portal' as AppNavTab, label: 'Overview', icon: TelegramLearningIcon, colorKey: 'purple' },
    { id: 'learning-assignments' as AppNavTab, label: 'Assignments', icon: TelegramAssignmentsIcon, colorKey: 'amber' },
    { id: 'learning-quizzes' as AppNavTab, label: 'Quizzes', icon: TelegramQuizzesIcon, colorKey: 'orange' },
    { id: 'learning-participation' as AppNavTab, label: 'Participation', icon: TelegramUsersIcon, colorKey: 'teal' },
    { id: 'learning-grades' as AppNavTab, label: 'Grades & Scores', icon: TelegramAnalyticsIcon, colorKey: 'blue' },
    { id: 'learning-events' as AppNavTab, label: 'Upcoming Events', icon: TelegramEventsIcon, colorKey: 'cyan' },
    { id: 'learning-materials' as AppNavTab, label: 'Learning Materials', icon: TelegramMaterialsIcon, colorKey: 'amber' },
  ];

  const navItems = isAdmin ? adminNavItems : tutorNavItems;

  return (
    <>
      {/* Mobile & Communication Hub Drawer Backdrop */}
      {isOpen && (
        <div
          className={`fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-sm transition-opacity ${
            isOverlayMode ? 'block' : 'md:hidden'
          }`}
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 ${
          isOverlayMode ? 'z-50 shadow-2xl' : 'z-40'
        } flex flex-col justify-between transition-all duration-300 ease-in-out fni-glass-sidebar ${
          isOpen
            ? 'translate-x-0'
            : isOverlayMode
            ? '-translate-x-full'
            : '-translate-x-full md:translate-x-0'
        } ${
          isCollapsed && !isOverlayMode ? 'w-[76px]' : 'w-[280px] sm:w-64 max-w-[85vw]'
        }`}
      >
        {/* Top Section: Window Controls, Brand Header & Collapse Toggle */}
        <div className={`p-4 border-b border-slate-200/80 dark:border-white/10 shrink-0 ${isCollapsed ? 'px-2 py-3.5 flex flex-col items-center' : ''}`}>
          {/* macOS Window Controls + Collapse Pill */}
          <div className={`flex items-center justify-between gap-2 mb-3.5 ${isCollapsed ? 'flex-col gap-3 mb-2' : ''}`}>
            {/* macOS 3 Dots */}
            <div className="flex items-center gap-1.5 shrink-0" title="FNI Cells Connect">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]/50 shadow-2xs" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50 shadow-2xs" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]/50 shadow-2xs" />
            </div>

            {/* Desktop Collapse / Expand Toggle Button */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                title={isCollapsed ? 'Expand navigation' : 'Collapse navigation rail'}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-[#142B4A] dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Close navigation menu"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Brand Header */}
          {!isCollapsed ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-[#142B4A] flex items-center justify-center shadow-xs shrink-0">
                <img
                  src={`${import.meta.env.BASE_URL}fni-official-logo.jpg`}
                  alt="FNI Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-extrabold tracking-tight text-[#142B4A] dark:text-white truncate">
                  FNI CELLS CONNECT
                </span>
                <span className="text-[10px] font-bold text-[#667085] dark:text-slate-400 uppercase tracking-wider truncate">
                  {isAdmin ? 'Administrator Portal' : 'Tutor Portal'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-[#142B4A] flex items-center justify-center shadow-xs shrink-0" title="FNI Cells Connect">
              <img
                src={`${import.meta.env.BASE_URL}fni-official-logo.jpg`}
                alt="FNI Logo"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Middle Navigation Section */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 custom-scrollbar space-y-4">
          {/* MENU Category Header */}
          <div className="px-1">
            <span className={`text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 block ${isCollapsed ? 'text-center' : ''}`}>
              MENU
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isLearning = item.id === 'learning-portal';
              const isLearningActive = currentTab.startsWith('learning-') || currentTab === 'learning-portal';

              const isCells = item.id === 'cells-dropdown';
              const isCellsActive = currentTab === 'cell-management' || currentTab === 'cell-leaders' || currentTab === 'cell-location-history';

              const isReports = item.id === 'reports-dropdown';
              const isReportsActive = currentTab === 'report-review' || currentTab === 'report-history' || currentTab === 'report-deadlines';

              const isActive = isLearning ? isLearningActive : isCells ? isCellsActive : isReports ? isReportsActive : currentTab === item.id;

              // Collapsed Slim Rail Item
              if (isCollapsed) {
                return (
                  <div key={item.id} className="relative group flex justify-center py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCells) onSelectTab('cell-management');
                        else if (isReports) onSelectTab('report-review');
                        else if (isLearning) onSelectTab('learning-portal');
                        else onSelectTab(item.id as AppNavTab);
                        onCloseMobile();
                      }}
                      className={`relative flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-[#142B4A] text-white shadow-md shadow-navy-900/20'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
                      }`}
                      aria-label={item.label}
                    >
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/10 text-[#C6A45A]' : `${ICON_STYLES[item.colorKey].bg} ${ICON_STYLES[item.colorKey].text}`} transition-colors`}>
                        <Icon className="w-4 h-4 shrink-0" />
                      </span>
                      {item.badge && item.badge > 0 ? (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C74646] ring-2 ring-white dark:ring-[#0d1624]" />
                      ) : null}
                    </button>

                    {/* Reference Floating Blue Tooltip Pill */}
                    <div className="fni-sidebar-tooltip bg-[#142B4A] dark:bg-blue-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#C74646] text-white text-[10px] font-extrabold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              // Expanded State: Cells Dropdown
              if (isCells) {
                return (
                  <div key={item.id} className="space-y-1">
                    <div
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isCellsActive
                          ? 'bg-[#142B4A] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'
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
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isCellsActive
                            ? 'bg-white/15 text-[#C6A45A]'
                            : `${ICON_STYLES[item.colorKey].bg} ${ICON_STYLES[item.colorKey].text}`
                        } transition-colors`}>
                          <TelegramCellsIcon className="w-4 h-4 shrink-0" />
                        </span>
                        <span className="truncate">Cells</span>
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

                    {isCellsExpanded && (
                      <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-[#C6A45A]/40 ml-3.5 my-1 animate-fade-in">
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
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                                isSubActive
                                  ? 'bg-[#142B4A]/10 text-[#142B4A] dark:bg-white/10 dark:text-white font-bold'
                                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                isSubActive
                                  ? 'bg-[#142B4A]/15 text-[#C6A45A]'
                                  : `${ICON_STYLES[sub.colorKey].bg} ${ICON_STYLES[sub.colorKey].text}`
                              } transition-colors`}>
                                <SubIcon className="w-3.5 h-3.5 shrink-0" />
                              </span>
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Expanded State: Reports Dropdown
              if (isReports) {
                return (
                  <div key={item.id} className="space-y-1">
                    <div
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isReportsActive
                          ? 'bg-[#142B4A] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTab('report-review');
                          setIsReportsExpanded(true);
                          onCloseMobile();
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isReportsActive
                            ? 'bg-white/15 text-[#C6A45A]'
                            : `${ICON_STYLES[item.colorKey].bg} ${ICON_STYLES[item.colorKey].text}`
                        } transition-colors`}>
                          <TelegramReportsIcon className="w-4 h-4 shrink-0" />
                        </span>
                        <span className="truncate">Reports</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsReportsExpanded(prev => !prev);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title={isReportsExpanded ? 'Collapse sub-menu' : 'Expand sub-menu'}
                      >
                        {isReportsExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-[#C6A45A]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {isReportsExpanded && (
                      <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-[#C6A45A]/40 ml-3.5 my-1 animate-fade-in">
                        {reportsSubItems.map(sub => {
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
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                                isSubActive
                                  ? 'bg-[#142B4A]/10 text-[#142B4A] dark:bg-white/10 dark:text-white font-bold'
                                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                isSubActive
                                  ? 'bg-[#142B4A]/15 text-[#C6A45A]'
                                  : `${ICON_STYLES[sub.colorKey].bg} ${ICON_STYLES[sub.colorKey].text}`
                              } transition-colors`}>
                                <SubIcon className="w-3.5 h-3.5 shrink-0" />
                              </span>
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Expanded State: Learning Portal Dropdown
              if (isLearning) {
                return (
                  <div key={item.id} className="space-y-1">
                    <div
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isLearningActive
                          ? 'bg-[#142B4A] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'
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
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isLearningActive
                            ? 'bg-white/15 text-[#C6A45A]'
                            : `${ICON_STYLES[item.colorKey].bg} ${ICON_STYLES[item.colorKey].text}`
                        } transition-colors`}>
                          <TelegramLearningIcon className="w-4 h-4 shrink-0" />
                        </span>
                        <span className="truncate">Learning Portal</span>
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

                    {isLearningExpanded && (
                      <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-[#C6A45A]/40 ml-3.5 my-1 animate-fade-in">
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
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                                isSubActive
                                  ? 'bg-[#142B4A]/10 text-[#142B4A] dark:bg-white/10 dark:text-white font-bold'
                                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                isSubActive
                                  ? 'bg-[#142B4A]/15 text-[#C6A45A]'
                                  : `${ICON_STYLES[sub.colorKey].bg} ${ICON_STYLES[sub.colorKey].text}`
                              } transition-colors`}>
                                <SubIcon className="w-3.5 h-3.5 shrink-0" />
                              </span>
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Standard Expanded Menu Item
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id as AppNavTab);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#142B4A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-white/15 text-[#C6A45A]'
                        : `${ICON_STYLES[item.colorKey].bg} ${ICON_STYLES[item.colorKey].text}`
                    } transition-colors`}>
                      <Icon className="w-4 h-4 shrink-0" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#C74646] text-white text-[10px] font-extrabold shadow-2xs">
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

        {/* Bottom Section: Profile & Reporting Deadline */}
        <div className={`p-3 border-t border-slate-200/80 dark:border-white/10 shrink-0 ${isCollapsed ? 'px-2 py-3 flex flex-col items-center' : 'space-y-2.5'}`}>
          {!isCollapsed ? (
            <>
              {/* Profile Card */}
              <div className="flex items-center justify-between p-2 rounded-2xl fni-glass-panel border border-slate-200/80 dark:border-white/10">
                <div
                  onClick={onOpenAccountSettings}
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
                  title="Profile Settings"
                >
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#142B4A] border border-white shadow-xs flex items-center justify-center text-xs font-bold text-[#C6A45A] overflow-hidden">
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
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#23845B] border-2 border-white dark:border-[#0d1624]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600">
                      {currentUser?.full_name}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 truncate">
                      {isAdmin ? 'Church Leadership' : currentUser?.cell_name || 'Cell Leader'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer shrink-0"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Sunday Reporting Deadline Card */}
              <div className="p-2.5 fni-glass-panel border border-slate-200/80 dark:border-white/10 rounded-2xl text-[11px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5 text-[#142B4A] dark:text-white font-bold">
                  <TelegramDeadlinesIcon className="w-3.5 h-3.5" />
                  <span>Reporting Deadline</span>
                </div>
                <div className="text-slate-900 dark:text-slate-200 font-semibold mt-0.5">
                  Sunday 6:00 PM GMT
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Timezone: Africa/Accra
                </div>
              </div>
            </>
          ) : (
            /* Collapsed Mode: Single Profile Avatar with Tooltip */
            <div className="relative group flex justify-center py-1">
              <button
                type="button"
                onClick={onOpenAccountSettings}
                className="relative w-10 h-10 rounded-full bg-[#142B4A] border-2 border-white dark:border-[#0d1624] shadow-xs flex items-center justify-center text-xs font-bold text-[#C6A45A] overflow-hidden cursor-pointer"
                title={currentUser?.full_name || 'My Profile'}
              >
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
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#23845B] border-2 border-white dark:border-[#0d1624]" />
              </button>

              <div className="fni-sidebar-tooltip bg-[#142B4A] dark:bg-blue-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl shadow-xl flex items-center gap-1.5">
                <span>{currentUser?.full_name}</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
