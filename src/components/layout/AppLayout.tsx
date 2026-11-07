import React, { useState } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';
import { DashboardView } from '../dashboard/DashboardView';
import { CellReportForm } from '../reports/CellReportForm';
import { ReportHistoryTable } from '../reports/ReportHistoryTable';
import { ReportDetailModal } from '../reports/ReportDetailModal';
import { RegionalManagementView } from '../regional/RegionalManagementView';
import { AdminManagementView } from '../admin/AdminManagementView';
import { AuditTrailView } from '../admin/AuditTrailView';
import { NotificationCenterModal } from '../notifications/NotificationCenterModal';
import { AccountSettingsModal } from '../auth/AccountSettingsModal';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ReportService } from '../../services/reportService';
import { CellReport, Region, ReportingPeriod } from '../../types';

export const AppLayout: React.FC = () => {
  const { currentRole, currentUser, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CellReport | null>(null);

  // Data cache
  const [reports, setReports] = useState<CellReport[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  React.useEffect(() => {
    async function loadData() {
      const [rList, regList, pList] = await Promise.all([
        ReportService.getReports(),
        ReportService.getRegions(),
        ReportService.getPeriods(),
      ]);

      if (!isAdmin && currentUser.cell_id) {
        setReports(rList.filter(r => r.cell_id === currentUser.cell_id));
      } else {
        setReports(rList);
      }

      setRegions(regList);
      setPeriods(pList);
    }
    loadData();
  }, [refreshKey, currentRole, currentUser, isAdmin]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleReportUpdated = (updated: CellReport) => {
    setReports(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    setSelectedReport(updated);
    handleRefresh();
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col text-slate-800">
      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
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
            onNavigateToForm={() => setCurrentTab('cell-reporting')}
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {currentTab === 'dashboard' && (
              <DashboardView
                onNavigateToForm={() => setCurrentTab('cell-reporting')}
                onNavigateToReports={() => setCurrentTab('report-management')}
                onNavigateToRegional={() => setCurrentTab('regional-management')}
                onSelectReport={rep => setSelectedReport(rep)}
              />
            )}

            {currentTab === 'cell-reporting' && (
              <CellReportForm
                onSuccess={() => {
                  handleRefresh();
                  setCurrentTab('report-management');
                }}
                onCancel={() => setCurrentTab('dashboard')}
              />
            )}

            {currentTab === 'report-management' && (
              <ReportHistoryTable
                reports={reports}
                regions={regions}
                periods={periods}
                onSelectReport={rep => setSelectedReport(rep)}
                onRefresh={handleRefresh}
              />
            )}

            {currentTab === 'regional-management' && <RegionalManagementView />}

            {currentTab === 'administration' && <AdminManagementView />}

            {currentTab === 'notifications' && (
              <div className="max-w-3xl mx-auto">
                <NotificationCenterModal
                  isOpen={true}
                  onClose={() => setCurrentTab('dashboard')}
                />
              </div>
            )}

            {currentTab === 'audit-logs' && <AuditTrailView />}
          </main>
        </div>
      </div>

      {/* Global Modals */}
      <ReportDetailModal
        report={selectedReport}
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        onReportUpdated={handleReportUpdated}
      />

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
