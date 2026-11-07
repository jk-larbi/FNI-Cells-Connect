import React, { useState, useEffect } from 'react';
import { 
  UserSession, 
  Cell, 
  WeeklyReport, 
  NotificationItem,
  AuthProvider
} from './types';
import { 
  loadStore, 
  getCells, 
  getReports, 
  getNotifications, 
  addCell, 
  upsertReport, 
  reviewReport, 
  addNotification, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  getMonday,
  syncWithSupabase
} from './lib/storage';
import { 
  getCurrentSession, 
  saveCurrentSession,
  getProfileByEmail
} from './lib/auth';
import { getSupabaseClient } from './lib/supabase';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LeaderDashboard } from './components/leader/LeaderDashboard';
import { ReportForm } from './components/leader/ReportForm';
import { ReportHistory } from './components/leader/ReportHistory';
import { CellProfile } from './components/leader/CellProfile';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AllReports } from './components/admin/AllReports';
import { ReportDetailModal } from './components/admin/ReportDetailModal';
import { CellsManagement } from './components/admin/CellsManagement';
import { NetworkTrends } from './components/admin/NetworkTrends';
import { BroadcastModal } from './components/admin/BroadcastModal';
import { BackendSettings } from './components/admin/BackendSettings';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { LoginView } from './components/auth/LoginView';
import { CellLeaderOnboarding } from './components/auth/CellLeaderOnboarding';
import { AdminForcePasswordChange } from './components/auth/AdminForcePasswordChange';
import { CheckCircle2, AlertCircle, X, UserCheck } from 'lucide-react';

export default function App() {
  // Application Data State
  const [storeData, setStoreData] = useState(() => loadStore());
  const cells = storeData.cells;
  const reports = storeData.reports;
  const notifications = storeData.notifications;

  // Authentication & Session State
  const [user, setUser] = useState<UserSession | null>(() => getCurrentSession());

  // First-time onboarding & security modal states
  const [onboardingData, setOnboardingData] = useState<{
    email: string;
    name: string;
    provider: AuthProvider;
  } | null>(null);

  const [showAdminForcePassword, setShowAdminForcePassword] = useState<boolean>(false);

  // Current view tab
  const [currentTab, setCurrentTab] = useState<string>('dash');

  // Selected report for inspection / review
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // Edit / target week for new report form
  const [targetWeekForReport, setTargetWeekForReport] = useState<string | undefined>(undefined);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Broadcast announcement modal
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);

  // Switch role picker modal
  const [showSwitchModal, setShowSwitchModal] = useState<boolean>(false);

  // Feedback banner state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const refreshData = () => {
    setStoreData({ ...loadStore() });
  };

  // Synchronize with Supabase on mount and listen to OAuth session callbacks
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (supabase) {
      // 1. Trigger background sync to pull remote records
      syncWithSupabase().then((res) => {
        if (res.success && (res.cellsSynced > 0 || res.reportsSynced > 0)) {
          refreshData();
        }
      });

      // 2. Listen to Supabase Auth state changes (Google / Apple OAuth redirects)
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user && !user) {
          const email = session.user.email?.toLowerCase();
          if (email) {
            const profile = getProfileByEmail(email);
            if (profile && profile.cellId) {
              const activeSession: UserSession = {
                id: profile.id,
                role: profile.role,
                cellId: profile.cellId,
                cellName: profile.cellName,
                name: profile.fullName,
                email: profile.email,
                phone: profile.phone,
                authProvider: profile.authProvider
              };
              setUser(activeSession);
              saveCurrentSession(activeSession);
              showToast(`Signed in as ${profile.fullName} via Supabase Auth.`);
            } else {
              setOnboardingData({
                email,
                name: session.user.user_metadata?.full_name || email.split('@')[0],
                provider: session.user.app_metadata?.provider === 'apple' ? 'apple' : 'google'
              });
            }
          }
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Helper to get assigned cell for current leader
  const currentLeaderCell = user?.cellId
    ? cells.find(c => c.id === user.cellId) || cells[0]
    : cells[0];

  // Counts for sidebar badges
  const pendingReviewsCount = reports.filter(r => r.status === 'Submitted').length;
  const userUnreadNotificationsCount = notifications.filter(n => {
    const isTarget = user?.role === 'admin'
      ? (n.to === 'admin' || n.to === 'all')
      : (n.to === user?.cellId || n.to === 'all');
    return isTarget && !n.read;
  }).length;

  // Protected route enforcement
  const handleSelectTab = (tab: string) => {
    // Ordinary cell leaders cannot access administrator pages (Section 8.E)
    if (user?.role !== 'admin' && ['rep', 'cells', 'trend', 'settings'].includes(tab)) {
      setCurrentTab('dash');
      return;
    }
    setCurrentTab(tab);
    setActiveReportId(null);
    setEditingReportId(null);
    setTargetWeekForReport(undefined);
  };

  const handleStartReport = (week?: string) => {
    setTargetWeekForReport(week || getMonday());
    setEditingReportId(null);
    setCurrentTab('new');
  };

  const handleEditReport = (reportId: string) => {
    const rep = reports.find(r => r.id === reportId);
    if (rep) {
      setEditingReportId(reportId);
      setTargetWeekForReport(rep.week);
      setCurrentTab('new');
    }
  };

  const handleViewReport = (reportId?: string) => {
    if (reportId) {
      setActiveReportId(reportId);
    }
  };

  const handleSaveReport = (reportPayload: Omit<WeeklyReport, 'id' | 'date'> & { id?: string }) => {
    const saved = upsertReport(reportPayload);
    refreshData();
    showToast(
      reportPayload.status === 'Draft' ? 'Draft saved successfully.' : 'Weekly report submitted for review.'
    );
    if (reportPayload.status === 'Draft') {
      setCurrentTab('hist');
    }
  };

  const handleReviewReport = (
    reportId: string,
    newStatus: 'Approved' | 'Returned',
    reviewerNote: string
  ) => {
    reviewReport(reportId, newStatus, reviewerNote, user?.name || 'Administrator');
    refreshData();
    setActiveReportId(null);
    showToast(
      newStatus === 'Approved' ? 'Report approved and verified.' : 'Report returned for revisions.'
    );
  };

  const handleAddCell = (newCellData: Omit<Cell, 'id' | 'createdAt'>) => {
    const created = addCell(newCellData);
    refreshData();
    showToast(`Registered cell "${created.name}" successfully.`);
  };

  const handleSendBroadcast = (target: string, title: string, message: string) => {
    addNotification({
      to: target,
      title,
      msg: message,
      type: 'broadcast'
    });
    refreshData();
    showToast('Broadcast notice dispatched.');
  };

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id);
    refreshData();
  };

  const handleMarkAllAsRead = () => {
    if (user?.role === 'admin') {
      markAllNotificationsAsRead('admin');
    } else if (user?.cellId) {
      markAllNotificationsAsRead(user.cellId);
    }
    refreshData();
    showToast('All notifications marked as read.');
  };

  const handleSignOut = () => {
    saveCurrentSession(null);
    setUser(null);
    setOnboardingData(null);
    setShowAdminForcePassword(false);
    handleSelectTab('dash');
    showToast('Signed out of reporting system.');
  };

  // Switch role helper
  const handleSwitchUser = (newRole: 'admin' | 'leader', cellId?: string) => {
    if (newRole === 'admin') {
      const adminSession: UserSession = {
        id: 'admin_root',
        role: 'admin',
        name: 'Administrator',
        email: 'admin@fni.org',
        authProvider: 'credentials'
      };
      setUser(adminSession);
      saveCurrentSession(adminSession);
      setCurrentTab('dash');
    } else {
      const c = cells.find(item => item.id === cellId) || cells[0];
      const leaderSession: UserSession = {
        id: `leader_${c.id}`,
        role: 'leader',
        cellId: c.id,
        cellName: c.name,
        name: c.leader,
        email: c.leaderEmail || `${c.leader.toLowerCase().replace(/\s+/g, '.')}@fni.org`,
        phone: c.leaderPhone,
        authProvider: 'google'
      };
      setUser(leaderSession);
      saveCurrentSession(leaderSession);
      setCurrentTab('dash');
    }
    setShowSwitchModal(false);
    showToast(`Switched account to ${newRole === 'admin' ? 'Administrator' : cellId ? cells.find(c => c.id === cellId)?.leader : 'Cell Leader'}`);
  };

  // ---------------------------------------------------------------------------
  // Mandatory Administrator First-Time Password Change View
  // ---------------------------------------------------------------------------
  if (showAdminForcePassword) {
    return (
      <AdminForcePasswordChange
        onSuccess={() => {
          setShowAdminForcePassword(false);
          const adminSession: UserSession = {
            id: 'admin_root',
            role: 'admin',
            name: 'Administrator',
            email: 'admin@fni.org',
            authProvider: 'credentials'
          };
          setUser(adminSession);
          saveCurrentSession(adminSession);
          setCurrentTab('dash');
          showToast('Administrator password configured. Welcome to the Admin Dashboard.');
        }}
        onCancel={() => {
          setShowAdminForcePassword(false);
        }}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // First-Time Cell Leader Registration & Onboarding View
  // ---------------------------------------------------------------------------
  if (onboardingData) {
    return (
      <CellLeaderOnboarding
        initialEmail={onboardingData.email}
        initialName={onboardingData.name}
        authProvider={onboardingData.provider}
        existingCells={cells}
        onComplete={(newSession) => {
          setOnboardingData(null);
          setUser(newSession);
          saveCurrentSession(newSession);
          refreshData();
          setCurrentTab('dash');
          showToast(`Welcome ${newSession.name}! Your cell has been registered and associated.`);
        }}
        onCancel={() => setOnboardingData(null)}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Unauthenticated: Sign-in View (Google/Apple OAuth + Admin Login)
  // ---------------------------------------------------------------------------
  if (!user) {
    return (
      <LoginView
        cells={cells}
        onLogin={(session) => {
          setUser(session);
          saveCurrentSession(session);
          setCurrentTab('dash');
          showToast(`Signed in as ${session.name}`);
        }}
        onRequestOnboarding={(email, name, provider) => {
          setOnboardingData({ email, name, provider });
        }}
        onRequestAdminPasswordChange={() => {
          setShowAdminForcePassword(true);
        }}
      />
    );
  }

  // Active report for inspection
  const activeReport = activeReportId ? reports.find(r => r.id === activeReportId) : null;
  const activeReportCell = activeReport ? cells.find(c => c.id === activeReport.cell) || currentLeaderCell : currentLeaderCell;

  // Report being edited
  const editingReport = editingReportId ? reports.find(r => r.id === editingReportId) : undefined;

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col md:flex-row text-[#14213D]">
      {/* Toast Feedback Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-md border text-xs font-medium animate-in fade-in slide-in-from-top-3 duration-200 bg-white border-[#E3E6EB] text-[#0F2447]">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-[#8C95A3] hover:text-[#0F2447]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        unreadNotifications={userUnreadNotificationsCount}
        pendingReviewsCount={pendingReviewsCount}
        onSignOut={handleSignOut}
        onSwitchUser={() => setShowSwitchModal(true)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={user}
          currentTab={currentTab}
          onOpenNewReport={() => handleStartReport()}
          onOpenBroadcast={() => setShowBroadcastModal(true)}
          unreadCount={userUnreadNotificationsCount}
          onSelectTab={handleSelectTab}
        />

        <main className="flex-1 p-5 sm:p-7 max-w-6xl w-full mx-auto">
          {/* Administrator Views (Protected from ordinary cell leaders) */}
          {user.role === 'admin' && (
            <>
              {currentTab === 'dash' && (
                <AdminDashboard
                  cells={cells}
                  reports={reports}
                  onViewReport={handleViewReport}
                  onNavigateToTab={handleSelectTab}
                />
              )}

              {currentTab === 'rep' && (
                <AllReports
                  cells={cells}
                  reports={reports}
                  onViewReport={handleViewReport}
                />
              )}

              {currentTab === 'cells' && (
                <CellsManagement
                  cells={cells}
                  reports={reports}
                  onAddCell={handleAddCell}
                  onSelectCellReports={(cellId) => {
                    handleSelectTab('rep');
                  }}
                />
              )}

              {currentTab === 'trend' && (
                <NetworkTrends
                  cells={cells}
                  reports={reports}
                />
              )}

              {currentTab === 'note' && (
                <NotificationCenter
                  notifications={notifications}
                  user={user}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onNavigateToReport={handleViewReport}
                />
              )}

              {currentTab === 'settings' && (
                <BackendSettings onDataReset={refreshData} />
              )}
            </>
          )}

          {/* Cell Leader Views */}
          {user.role === 'leader' && (
            <>
              {currentTab === 'dash' && (
                <LeaderDashboard
                  cell={currentLeaderCell}
                  reports={reports.filter(r => r.cell === currentLeaderCell.id)}
                  onStartReport={handleStartReport}
                  onViewReport={handleViewReport}
                />
              )}

              {currentTab === 'new' && (
                <ReportForm
                  cell={currentLeaderCell}
                  existingReport={editingReport}
                  targetWeek={targetWeekForReport}
                  onSave={handleSaveReport}
                  onCancel={() => handleSelectTab('dash')}
                />
              )}

              {currentTab === 'hist' && (
                <ReportHistory
                  cell={currentLeaderCell}
                  reports={reports.filter(r => r.cell === currentLeaderCell.id)}
                  onViewReport={handleViewReport}
                  onEditReport={handleEditReport}
                />
              )}

              {currentTab === 'info' && (
                <CellProfile cell={currentLeaderCell} />
              )}

              {currentTab === 'note' && (
                <NotificationCenter
                  notifications={notifications}
                  user={user}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onNavigateToReport={handleViewReport}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Report Inspection & Review Modal */}
      {activeReport && (
        <ReportDetailModal
          report={activeReport}
          cell={activeReportCell}
          user={user}
          onClose={() => setActiveReportId(null)}
          onReview={handleReviewReport}
        />
      )}

      {/* Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <BroadcastModal
          cells={cells}
          onClose={() => setShowBroadcastModal(false)}
          onSend={handleSendBroadcast}
        />
      )}

      {/* Fast Account Switcher Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-[#0F2447]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E3E6EB] rounded-lg max-w-sm w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E6EB]">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/aistudio/fni_logo_5b889f17.jpg"
                  alt="FNI Logo"
                  className="w-6 h-6 rounded-md object-cover border border-[#E3E6EB] shrink-0"
                />
                <h3 className="font-semibold text-[#0F2447] text-sm font-serif-title">
                  Switch Active Account
                </h3>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="text-[#8C95A3] hover:text-[#0F2447]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[#5B6472]">
              Select your cell leader profile or switch to administrator view:
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <button
                onClick={() => handleSwitchUser('admin')}
                className={`w-full p-2.5 rounded text-left border flex items-center justify-between transition-colors ${
                  user.role === 'admin'
                    ? 'bg-[#18325C] text-white border-[#0F2447]'
                    : 'bg-white hover:bg-slate-50 border-[#E3E6EB] text-[#0F2447]'
                }`}
              >
                <div>
                  <div className="font-semibold">Administrator</div>
                  <div className={user.role === 'admin' ? 'text-[#AEB9CF]' : 'text-[#8C95A3]'}>
                    System management & reviews
                  </div>
                </div>
                <span className="text-[11px] font-mono">Admin Portal</span>
              </button>

              <div className="pt-2 pb-1 text-[11px] font-semibold text-[#8C95A3] uppercase tracking-wider">
                Cell Leaders
              </div>

              {cells.map((c) => {
                const isCurrent = user.role === 'leader' && user.cellId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSwitchUser('leader', c.id)}
                    className={`w-full p-2.5 rounded text-left border flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'bg-[#18325C] text-white border-[#0F2447]'
                        : 'bg-white hover:bg-slate-50 border-[#E3E6EB] text-[#0F2447]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{c.leader}</div>
                      <div className={isCurrent ? 'text-[#AEB9CF]' : 'text-[#8C95A3]'}>
                        {c.name} · {c.area}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
