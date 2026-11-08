import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { AppNavTab } from '../../types';

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
  const { unreadCount } = useNotifications();

  // Role-based initial tab
  const [currentTab, setCurrentTab] = useState<AppNavTab>(() => (isAdmin ? 'dashboard' : 'my-dashboard'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

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
          onSelectTab={tab => setCurrentTab(tab)}
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
            onNavigateToForm={() => setCurrentTab(isAdmin ? 'report-review' : 'submit-cell-meeting-report')}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {/* ADMINISTRATOR PORTAL PAGES */}
            {isAdmin && (
              <>
                {effectiveTab === 'dashboard' && (
                  <DashboardView onNavigateToTab={tab => setCurrentTab(tab)} />
                )}
                {effectiveTab === 'cell-management' && <CellManagementView />}
                {effectiveTab === 'cell-leaders' && <CellLeadersView />}
                {effectiveTab === 'report-review' && <ReportReviewView />}
                {effectiveTab === 'evangelism' && <EvangelismAdminView />}
                {effectiveTab === 'follow-ups' && <FollowUpManagementView />}
                {effectiveTab === 'finance' && <FinanceView />}
                {effectiveTab === 'materials' && <TeachingMaterialsView />}
                {effectiveTab === 'messages' && <MessagingView />}
                {effectiveTab === 'analytics' && <AnalyticsView />}
                {effectiveTab === 'settings' && <AdminSettingsView />}
              </>
            )}

            {/* TUTOR PORTAL PAGES */}
            {!isAdmin && (
              <>
                {effectiveTab === 'my-dashboard' && (
                  <TutorDashboardView onNavigateToTab={tab => setCurrentTab(tab)} />
                )}
                {effectiveTab === 'my-cell' && <MyCellView />}
                {effectiveTab === 'submit-cell-meeting-report' && (
                  <CellReportForm
                    onSuccess={() => setCurrentTab('my-reports')}
                    onCancel={() => setCurrentTab('my-dashboard')}
                  />
                )}
                {effectiveTab === 'submit-evangelism-report' && (
                  <EvangelismReportForm
                    onSuccess={() => setCurrentTab('my-reports')}
                    onCancel={() => setCurrentTab('my-dashboard')}
                  />
                )}
                {effectiveTab === 'my-reports' && <MyReportsView />}
                {effectiveTab === 'evangelism-contacts' && <EvangelismContactsView />}
                {effectiveTab === 'follow-ups' && <FollowUpManagementView />}
                {effectiveTab === 'materials' && <TeachingMaterialsView />}
                {effectiveTab === 'messages' && <MessagingView />}
                {effectiveTab === 'cell-activity-history' && <CellActivityHistoryView />}
                {effectiveTab === 'my-account' && <MyAccountView />}
              </>
            )}

            {/* Shared notifications tab */}
            {effectiveTab === 'notifications' && (
              <div className="max-w-2xl mx-auto">
                <NotificationCenterModal
                  isOpen={true}
                  onClose={() => setCurrentTab(isAdmin ? 'dashboard' : 'my-dashboard')}
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
      />

      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
      />
    </div>
  );
};
