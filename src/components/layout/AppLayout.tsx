import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { NavigationService } from '../../services/navigationService';
import { useBackHandler } from '../../hooks/useBackHandler';
import { AppNavTab } from '../../types';
import {
  ArrowLeft,
  LayoutDashboard,
  Building,
  FileCheck,
  PlusCircle,
  MessageSquare,
  Bell,
  GraduationCap,
} from 'lucide-react';
import { LocationSharingPanel } from '../location/LocationSharingPanel';

// Administrator Portal Views
import { DashboardView } from '../dashboard/DashboardView';
import { CellManagementView } from '../admin/CellManagementView';
import { CellLeadersView } from '../admin/CellLeadersView';
import { CellLocationHistoryView } from '../admin/CellLocationHistoryView';
import { ReportReviewView } from '../admin/ReportReviewView';
import { ReportHistoryView } from '../admin/ReportHistoryView';
import { ReceivedReportsView } from '../admin/ReceivedReportsView';
import { ReportDeadlineSettingsView } from '../admin/ReportDeadlineSettingsView';
import { EvangelismAdminView } from '../admin/EvangelismAdminView';
import { AnalyticsView } from '../admin/AnalyticsView';
import { AdminSettingsView } from '../admin/AdminSettingsView';
import { FinanceView } from '../admin/FinanceView';

// Tutor Portal Views
import { TutorDashboardView } from '../tutor/TutorDashboardView';
import { MyCellView } from '../tutor/MyCellView';
import { CellReportForm } from '../reports/CellReportForm';
import { EvangelismReportForm } from '../reports/EvangelismReportForm';
import { MyReportsView } from '../tutor/MyReportsView';
import { EvangelismContactsView } from '../tutor/EvangelismContactsView';
import { CellActivityHistoryView } from '../tutor/CellActivityHistoryView';
import { MyAccountView } from '../tutor/MyAccountView';

// Shared Views
import { FollowUpManagementView } from '../followups/FollowUpManagementView';
import { TeachingMaterialsView } from '../materials/TeachingMaterialsView';
import { MessagingView } from '../communication/MessagingView';
import { CallOverlay } from '../calling/CallOverlay';
import { CallHistoryView } from '../calling/CallHistoryView';
import { NotificationCenterModal } from '../notifications/NotificationCenterModal';
import { AccountSettingsModal } from '../auth/AccountSettingsModal';
import { LearningPortalView } from '../learning/LearningPortalView';
import { LearningPortalSection } from '../../types/learning';
import { LatestAndroidUpdate } from '../common/LatestAndroidUpdate';

interface MobileNavItem {
  id: AppNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isPrimary?: boolean;
  action?: () => void;
}

export const AppLayout: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { unreadCount, activeNavigationTarget, clearNavigationTarget } = useNotifications();

  // Role-based initial tab
  const [currentTab, setCurrentTab] = useState<AppNavTab>(() => (isAdmin ? 'dashboard' : 'my-dashboard'));
  const [navHistory, setNavHistory] = useState<AppNavTab[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fni_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('fni_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Lock the page behind the mobile drawer without losing its current scroll
  // position. This avoids the background jumping when the drawer is swiped.
  useEffect(() => {
    if (!isSidebarOpen || typeof window === 'undefined' || window.innerWidth >= 768) return;

    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.classList.add('fni-mobile-menu-open');
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.classList.remove('fni-mobile-menu-open');
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isSidebarOpen]);

  // Deep-linking target parameters
  const [highlightedReportId, setHighlightedReportId] = useState<string | undefined>(undefined);
  const [targetConversationId, setTargetConversationId] = useState<string | undefined>(undefined);
  const [editingMeetingReport, setEditingMeetingReport] = useState<any | null>(null);

  // Register initial tab into NavigationService
  useEffect(() => {
    NavigationService.pushTab(currentTab);
  }, []);

  // Back interceptors for top-level modals and drawer
  useBackHandler(() => {
    if (isNotifModalOpen) {
      setIsNotifModalOpen(false);
      return true;
    }
    return false;
  }, isNotifModalOpen);

  useBackHandler(() => {
    if (isAccountSettingsOpen) {
      setIsAccountSettingsOpen(false);
      return true;
    }
    return false;
  }, isAccountSettingsOpen);

  useBackHandler(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
      return true;
    }
    return false;
  }, isSidebarOpen);

  // Synchronize browser history and support hardware / browser Back & Forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // 1. If an active modal, drawer, or sub-view interceptor handles the back event, consume it!
      const intercepted = NavigationService.triggerInterceptor();
      if (intercepted) {
        // Re-align URL hash and push state so user stays on current tab
        try {
          window.history.pushState(
            { fniNav: true, tab: currentTab, index: NavigationService.getHistoryLength() },
            '',
            `#${currentTab}`
          );
        } catch {}
        return;
      }

      // 2. Transition back to previous tab
      if (event.state?.tab) {
        const targetTab = event.state.tab as AppNavTab;
        setCurrentTab(targetTab);
        setNavHistory(prev => (prev.length > 0 ? prev.slice(0, prev.length - 1) : []));
      } else {
        const popped = NavigationService.popTab();
        if (popped) {
          setCurrentTab(popped.tab);
          setNavHistory(prev => (prev.length > 0 ? prev.slice(0, prev.length - 1) : []));
        } else {
          // Fallback to parent section or role home
          const parentTab = NavigationService.getParentTab(currentTab, isAdmin);
          if (parentTab !== currentTab) {
            setCurrentTab(parentTab);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentTab, isAdmin]);

  // Navigation with history tracking
  const navigateToTab = (newTab: AppNavTab, replace = false) => {
    if (newTab === currentTab) return;
    if (!replace) {
      setNavHistory(prev => [...prev, currentTab]);
      NavigationService.pushTab(newTab);
    }
    setCurrentTab(newTab);
  };

  const handleGoBack = useCallback(() => {
    // 1. Check if an active modal/drawer interceptor is open and consumes the action
    const intercepted = NavigationService.triggerInterceptor();
    if (intercepted) {
      return;
    }

    // 2. Step back through the user's actual navigation history one step at a time
    if (NavigationService.getHistoryLength() > 1 || navHistory.length > 0) {
      const popped = NavigationService.popTab();
      if (popped) {
        setNavHistory(prev => (prev.length > 0 ? prev.slice(0, prev.length - 1) : []));
        setCurrentTab(popped.tab);
        try {
          window.history.back();
        } catch {}
        return;
      }
    }

    // 3. If no prior in-app history (e.g. direct load/refresh), fallback to sensible parent section
    const parentTab = NavigationService.getParentTab(currentTab, isAdmin);
    if (parentTab !== currentTab) {
      setCurrentTab(parentTab);
      NavigationService.pushTab(parentTab);
    } else {
      const homeTab: AppNavTab = isAdmin ? 'dashboard' : 'my-dashboard';
      if (currentTab !== homeTab) {
        setCurrentTab(homeTab);
        NavigationService.pushTab(homeTab);
      }
    }
  }, [currentTab, isAdmin, navHistory]);

  const canGoBack =
    NavigationService.getHistoryLength() > 1 ||
    navHistory.length > 0 ||
    isNotifModalOpen ||
    isAccountSettingsOpen ||
    isSidebarOpen ||
    currentTab !== (isAdmin ? 'dashboard' : 'my-dashboard');

  // Handle external / service worker notification click targets
  React.useEffect(() => {
    if (activeNavigationTarget?.targetTab) {
      navigateToTab(activeNavigationTarget.targetTab as AppNavTab);
      if (activeNavigationTarget.reportId) {
        setHighlightedReportId(activeNavigationTarget.reportId);
      }
      if (activeNavigationTarget.conversationId) {
        setTargetConversationId(activeNavigationTarget.conversationId);
      }
      clearNavigationTarget();
    }
  }, [activeNavigationTarget]);

  const handleNavigateFromNotification = (tab: string, meta?: any) => {
    navigateToTab(tab as AppNavTab);
    setIsNotifModalOpen(false);
    if (meta?.reportId) {
      setHighlightedReportId(meta.reportId);
    }
    if (meta?.conversationId) {
      setTargetConversationId(meta.conversationId);
    }
  };

  // Fallback guard: if a non-admin is accidentally on an admin tab, redirect to tutor dashboard
  const effectiveTab: AppNavTab = !isAdmin && (
    currentTab === 'dashboard' ||
    currentTab === 'location-sharing' ||
    currentTab === 'cell-management' ||
    currentTab === 'cell-leaders' ||
    currentTab === 'report-review' ||
    currentTab === 'received-reports' ||
    currentTab === 'analytics' ||
    currentTab === 'settings' ||
    currentTab === 'finance'
  ) ? 'my-dashboard' : currentTab;

  // Resolve learning portal sub-section
  const getLearningSection = (tab: AppNavTab): LearningPortalSection => {
    if (tab === 'learning-assignments') return 'assignments';
    if (tab === 'learning-quizzes') return 'quizzes';
    if (tab === 'learning-participation') return 'participation';
    if (tab === 'learning-grades') return 'grades';
    if (tab === 'learning-events') return 'events';
    if (tab === 'learning-materials') return 'materials';
    return 'overview';
  };
  const isLearningTab = effectiveTab.startsWith('learning-') || effectiveTab === 'learning-portal';

  return (
    <div className={`fni-app-shell min-h-screen bg-white dark:bg-[#0a111c] flex flex-col text-[#182230] dark:text-slate-100 overflow-x-hidden w-full max-w-full ${effectiveTab === 'messages' ? 'fni-messaging-route' : ''}`}>
      <div className="fni-app-body flex flex-1 min-h-0 w-full min-w-0">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={effectiveTab}
          onSelectTab={tab => navigateToTab(tab)}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          unreadCount={unreadCount}
          onOpenNotifications={() => setIsNotifModalOpen(true)}
          onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        {/* Main Application Area */}
        <div className={`flex-1 flex flex-col ${isSidebarCollapsed ? 'md:pl-[76px]' : 'md:pl-64'} min-w-0 w-full overflow-x-hidden transition-all duration-300 ease-in-out`}>
          <Header
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
            onOpenNotifications={() => setIsNotifModalOpen(true)}
            onNavigateToForm={() => navigateToTab(isAdmin ? 'report-review' : 'submit-cell-meeting-report')}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
            canGoBack={canGoBack}
            onGoBack={handleGoBack}
          />

          <LatestAndroidUpdate />
          <main className={`fni-app-main flex-1 min-w-0 p-2.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 overflow-x-hidden ${effectiveTab === 'messages' ? 'fni-messaging-route-main' : ''}`}>
            {/* ADMINISTRATOR PORTAL PAGES */}
            {isAdmin && (
              <>
                {effectiveTab === 'location-sharing' && <LocationSharingPanel mode="admin" />}
                {effectiveTab === 'dashboard' && (
                  <DashboardView
                    onNavigateToTab={tab => navigateToTab(tab)}
                    onOpenReport={reportId => {
                      setHighlightedReportId(reportId);
                      navigateToTab('report-review');
                    }}
                  />
                )}
                {effectiveTab === 'cell-management' && (
                  <CellManagementView onBack={handleGoBack} />
                )}
                {effectiveTab === 'cell-leaders' && (
                  <CellLeadersView onBack={handleGoBack} />
                )}
                {effectiveTab === 'cell-location-history' && (
                  <CellLocationHistoryView onBack={handleGoBack} />
                )}
                {effectiveTab === 'received-reports' && (
                  <ReportHistoryView onBack={handleGoBack} />
                )}
                {effectiveTab === 'report-review' && (
                  <ReportReviewView
                    initialReportId={highlightedReportId}
                    onClearInitialReportId={() => setHighlightedReportId(undefined)}
                    onBack={handleGoBack}
                    onNavigateToTab={(tab) => navigateToTab(tab as any)}
                  />
                )}
                {effectiveTab === 'report-history' && (
                  <ReportHistoryView
                    onBack={handleGoBack}
                    onNavigateToTab={(tab: string) => navigateToTab(tab as any)}
                  />
                )}
                {effectiveTab === 'report-deadlines' && (
                  <ReportDeadlineSettingsView onBack={handleGoBack} />
                )}
                {effectiveTab === 'evangelism' && (
                  <EvangelismAdminView onBack={handleGoBack} />
                )}
                {effectiveTab === 'follow-ups' && (
                  <FollowUpManagementView onBack={handleGoBack} />
                )}
                {effectiveTab === 'finance' && (
                  <FinanceView onBack={handleGoBack} />
                )}
                {effectiveTab === 'materials' && (
                  <TeachingMaterialsView onBack={handleGoBack} />
                )}
                {effectiveTab === 'messages' && (
                  <MessagingView
                    initialConversationId={targetConversationId}
                    onBack={handleGoBack}
                  />
                )}
                {effectiveTab === 'call-history' && (
                  <CallHistoryView onBack={handleGoBack} />
                )}
                {effectiveTab === 'analytics' && (
                  <AnalyticsView onBack={handleGoBack} />
                )}
                {effectiveTab === 'settings' && (
                  <AdminSettingsView onBack={handleGoBack} />
                )}
              </>
            )}

            {/* TUTOR PORTAL PAGES */}
            {!isAdmin && (
              <>
                {effectiveTab === 'my-dashboard' && (
                  <TutorDashboardView
                    onNavigateToTab={tab => navigateToTab(tab)}
                    onOpenReport={reportId => {
                      setHighlightedReportId(reportId);
                      navigateToTab('my-reports');
                    }}
                  />
                )}
                {effectiveTab === 'my-cell' && (
                  <MyCellView onBack={handleGoBack} />
                )}
                {effectiveTab === 'submit-cell-meeting-report' && (
                  <CellReportForm
                    initialReport={editingMeetingReport ? {
                      id: editingMeetingReport.id,
                      cell_id: editingMeetingReport.cellId || editingMeetingReport.cell_id,
                      meeting_date: editingMeetingReport.meetingDate || editingMeetingReport.meeting_date,
                      total_attendance: editingMeetingReport.attendance || editingMeetingReport.total_attendance,
                      members_present: editingMeetingReport.activeMembers || editingMeetingReport.members_present || editingMeetingReport.attendance,
                      visitors_count: editingMeetingReport.absentees || editingMeetingReport.visitors_count || 0,
                      first_timers_contacted: editingMeetingReport.newMembers || editingMeetingReport.first_timers_contacted || 0,
                      offering_amount: editingMeetingReport.offeringAmount || editingMeetingReport.offering_amount || 0,
                      additional_remarks: editingMeetingReport.tutorNotes || editingMeetingReport.additional_remarks || '',
                      testimonies: editingMeetingReport.testimonies || '',
                      tutorExperience: editingMeetingReport.tutorExperience || '',
                    } as any : null}
                    onSuccess={() => {
                      setEditingMeetingReport(null);
                      navigateToTab('my-reports');
                    }}
                    onCancel={() => {
                      setEditingMeetingReport(null);
                      handleGoBack();
                    }}
                  />
                )}
                {effectiveTab === 'submit-evangelism-report' && (
                  <EvangelismReportForm
                    onSuccess={() => navigateToTab('my-reports')}
                    onCancel={handleGoBack}
                  />
                )}
                {effectiveTab === 'my-reports' && (
                  <MyReportsView
                    initialReportId={highlightedReportId}
                    onClearInitialReportId={() => setHighlightedReportId(undefined)}
                    onEditMeetingReport={report => {
                      setEditingMeetingReport(report);
                      navigateToTab('submit-cell-meeting-report');
                    }}
                    onBack={handleGoBack}
                  />
                )}
                {effectiveTab === 'evangelism-contacts' && (
                  <EvangelismContactsView onBack={handleGoBack} />
                )}
                {effectiveTab === 'follow-ups' && (
                  <FollowUpManagementView onBack={handleGoBack} />
                )}
                {effectiveTab === 'materials' && (
                  <TeachingMaterialsView onBack={handleGoBack} />
                )}
                {effectiveTab === 'messages' && (
                  <MessagingView
                    initialConversationId={targetConversationId}
                    onBack={handleGoBack}
                  />
                )}
                {effectiveTab === 'call-history' && (
                  <CallHistoryView onBack={handleGoBack} />
                )}
                {effectiveTab === 'cell-activity-history' && (
                  <CellActivityHistoryView onBack={handleGoBack} />
                )}
                {effectiveTab === 'my-account' && (
                  <MyAccountView onBack={handleGoBack} />
                )}
              </>
            )}

            {/* SHARED LEARNING PORTAL VIEW */}
            {isLearningTab && (
              <LearningPortalView
                initialSection={getLearningSection(effectiveTab)}
                onBack={handleGoBack}
                onNavigateAppTab={navigateToTab}
                onOpenNotifications={() => setIsNotifModalOpen(true)}
                onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
                onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
              />
            )}

            {/* Shared notifications tab */}
            {effectiveTab === 'notifications' && (
              <div className="max-w-2xl mx-auto space-y-4">
                <NotificationCenterModal
                  isOpen={true}
                  onClose={handleGoBack}
                  onNavigate={handleNavigateFromNotification}
                />
              </div>
            )}
          </main>
        </div>
      </div>


      {/* Thumb-friendly mobile navigation with iOS safe-area support */}
      <nav
        aria-label="Mobile navigation"
        className="mobile-bottom-nav fixed bottom-0 inset-x-0 z-30 md:hidden grid grid-cols-5 border-t border-[#E3E8EF] dark:border-[#1e2d42] bg-white/95 dark:bg-[#0d1624]/95 backdrop-blur-lg shadow-[0_-8px_24px_rgba(20,43,74,0.08)] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        {(isAdmin
          ? [
              { id: 'dashboard' as AppNavTab, label: 'Home', icon: LayoutDashboard },
              { id: 'cell-management' as AppNavTab, label: 'Cells', icon: Building },
              { id: 'report-review' as AppNavTab, label: 'Reports', icon: FileCheck },
              { id: 'messages' as AppNavTab, label: 'Messages', icon: MessageSquare },
              { id: 'learning-portal' as AppNavTab, label: 'Learning', icon: GraduationCap },
            ]
          : [
              { id: 'my-dashboard' as AppNavTab, label: 'Home', icon: LayoutDashboard },
              { id: 'my-cell' as AppNavTab, label: 'My Cell', icon: Building },
              { id: 'submit-cell-meeting-report' as AppNavTab, label: 'Report', icon: PlusCircle },
              { id: 'messages' as AppNavTab, label: 'Messages', icon: MessageSquare },
              { id: 'learning-portal' as AppNavTab, label: 'Learning', icon: GraduationCap },
            ]
        ).map(item => {
          const Icon = item.icon;
          const active = effectiveTab === item.id || (item.id === 'learning-portal' && effectiveTab.startsWith('learning-'));
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateToTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-semibold transition-colors ${
                active ? 'text-[#142B4A] dark:text-white font-bold' : 'text-[#667085] dark:text-slate-400'
              }`}
            >
              <span className={`flex h-7 w-10 items-center justify-center rounded-xl transition-all ${
                active ? 'bg-[#142B4A]/[0.08] dark:bg-white/10' : ''
              }`}>
                <Icon className={`h-5 w-5 ${active ? 'text-[#C6A45A]' : ''}`} />
              </span>
              <span className="truncate max-w-[56px] text-center">{item.label}</span>
              {active && <span className="absolute bottom-0.5 h-0.5 w-7 rounded-full bg-[#C6A45A]" />}
            </button>
          );
        })}
      </nav>

      {/* Global Modals */}
      <NotificationCenterModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        onNavigate={handleNavigateFromNotification}
      />

      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
      />

      {/* Global In-App Voice & Video Call Overlay */}
      <CallOverlay />
    </div>
  );
};
