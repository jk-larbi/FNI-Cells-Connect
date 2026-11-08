import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { AppNavTab } from '../../types';
import { ArrowLeft } from 'lucide-react';

// Administrator Portal Views
import { DashboardView } from '../dashboard/DashboardView';
import { CellManagementView } from '../admin/CellManagementView';
import { CellLeadersView } from '../admin/CellLeadersView';
import { ReportReviewView } from '../admin/ReportReviewView';
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
import { NotificationCenterModal } from '../notifications/NotificationCenterModal';
import { AccountSettingsModal } from '../auth/AccountSettingsModal';

export const AppLayout: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { unreadCount, activeNavigationTarget, clearNavigationTarget } = useNotifications();

  // Role-based initial tab
  const [currentTab, setCurrentTab] = useState<AppNavTab>(() => (isAdmin ? 'dashboard' : 'my-dashboard'));
  const [navHistory, setNavHistory] = useState<AppNavTab[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  // Deep-linking target parameters
  const [highlightedReportId, setHighlightedReportId] = useState<string | undefined>(undefined);
  const [targetConversationId, setTargetConversationId] = useState<string | undefined>(undefined);
  const [editingMeetingReport, setEditingMeetingReport] = useState<any | null>(null);

  // Navigation with history tracking
  const navigateToTab = (newTab: AppNavTab, replace = false) => {
    if (newTab === currentTab) return;
    if (!replace) {
      setNavHistory(prev => [...prev, currentTab]);
    }
    setCurrentTab(newTab);
  };

  const handleGoBack = () => {
    if (navHistory.length > 0) {
      const prevTab = navHistory[navHistory.length - 1];
      setNavHistory(prev => prev.slice(0, prev.length - 1));
      setCurrentTab(prevTab);
    } else {
      const homeTab: AppNavTab = isAdmin ? 'dashboard' : 'my-dashboard';
      if (currentTab !== homeTab) {
        setCurrentTab(homeTab);
      }
    }
  };

  const canGoBack = navHistory.length > 0 || currentTab !== (isAdmin ? 'dashboard' : 'my-dashboard');

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
    currentTab === 'cell-management' ||
    currentTab === 'cell-leaders' ||
    currentTab === 'report-review' ||
    currentTab === 'analytics' ||
    currentTab === 'settings' ||
    currentTab === 'finance'
  ) ? 'my-dashboard' : currentTab;

  return (
    <div className="min-h-screen bg-white flex flex-col text-[#182230]">
      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={effectiveTab}
          onSelectTab={tab => navigateToTab(tab)}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          unreadCount={unreadCount}
          onOpenNotifications={() => setIsNotifModalOpen(true)}
          onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
        />

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col md:pl-64 min-w-0">
          <Header
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
            onOpenNotifications={() => setIsNotifModalOpen(true)}
            onNavigateToForm={() => navigateToTab(isAdmin ? 'report-review' : 'submit-cell-meeting-report')}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
            canGoBack={canGoBack}
            onGoBack={handleGoBack}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {/* ADMINISTRATOR PORTAL PAGES */}
            {isAdmin && (
              <>
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
                {effectiveTab === 'report-review' && (
                  <ReportReviewView
                    initialReportId={highlightedReportId}
                    onClearInitialReportId={() => setHighlightedReportId(undefined)}
                    onBack={handleGoBack}
                  />
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
                {effectiveTab === 'cell-activity-history' && (
                  <CellActivityHistoryView onBack={handleGoBack} />
                )}
                {effectiveTab === 'my-account' && (
                  <MyAccountView onBack={handleGoBack} />
                )}
              </>
            )}

            {/* Shared notifications tab */}
            {effectiveTab === 'notifications' && (
              <div className="max-w-2xl mx-auto space-y-4">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F7FA] hover:bg-[#E3E8EF] text-[#142B4A] text-xs font-bold transition-all border border-[#E3E8EF] cursor-pointer group shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
                  <span>Back to Previous</span>
                </button>
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
    </div>
  );
};
