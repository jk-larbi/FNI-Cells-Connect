import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppNavTab } from '../../types';
import {
  LayoutDashboard,
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

  // Administrator Portal Navigation: 10 items
  const adminNavItems = [
    { id: 'dashboard' as AppNavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cell-management' as AppNavTab, label: 'Cell Management', icon: Building },
    { id: 'cell-leaders' as AppNavTab, label: 'Cell Leaders', icon: Users },
    { id: 'report-review' as AppNavTab, label: 'Report Review', icon: FileCheck },
    { id: 'evangelism' as AppNavTab, label: 'Evangelism', icon: Flame },
    { id: 'follow-ups' as AppNavTab, label: 'Follow-ups', icon: UserCheck },
    { id: 'analytics' as AppNavTab, label: 'Analytics', icon: BarChart3 },
    { id: 'notifications' as AppNavTab, label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'settings' as AppNavTab, label: 'Settings', icon: Settings },
  ];

  // Tutor Portal Navigation: 10 items
  const tutorNavItems = [
    { id: 'my-dashboard' as AppNavTab, label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'my-cell' as AppNavTab, label: 'My Cell', icon: Building },
    { id: 'submit-cell-meeting-report' as AppNavTab, label: 'Submit Meeting Report', icon: FileText },
    { id: 'submit-evangelism-report' as AppNavTab, label: 'Submit Evangelism Report', icon: Flame },
    { id: 'my-reports' as AppNavTab, label: 'My Reports', icon: FileCheck },
    { id: 'evangelism-contacts' as AppNavTab, label: 'Evangelism Contacts', icon: Users },
    { id: 'follow-ups' as AppNavTab, label: 'Follow-ups', icon: UserCheck },
    { id: 'cell-activity-history' as AppNavTab, label: 'Cell Activity History', icon: History },
    { id: 'notifications' as AppNavTab, label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'my-account' as AppNavTab, label: 'My Account', icon: User },
  ];

  const navItems = isAdmin ? adminNavItems : tutorNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#142B4A]/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white text-[#182230] flex flex-col justify-between py-6 px-4 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-[#E3E8EF] shadow-sm overflow-y-auto custom-scrollbar`}
      >
        <div>
          {/* Brand Header */}
          <div className="px-2 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#E3E8EF] bg-[#142B4A] flex items-center justify-center shadow-xs shrink-0">
                <img
                  src="/fni-official-logo.jpg"
                  alt="FNI Official Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-[#142B4A]">
                  FNI CELLS CONNECT
                </span>
                <span className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider">
                  {isAdmin ? 'ADMINISTRATOR PORTAL' : 'TUTOR PORTAL'}
                </span>
              </div>
            </div>
          </div>

          {/* User Profile Banner */}
          <div
            onClick={onOpenAccountSettings}
            className="flex items-center gap-3 p-3 mb-5 rounded-2xl bg-[#F5F7FA] border border-[#E3E8EF] cursor-pointer hover:bg-slate-100/80 transition-all group"
            title="Account Information"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#142B4A] border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-[#C6A45A]">
                {currentUser?.full_name
                  ? currentUser.full_name
                      .split(' ')
                      .map(n => n[0])
                      .slice(0, 2)
                      .join('')
                  : 'FN'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#23845B] border border-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#182230] truncate">
                {currentUser?.full_name}
              </div>
              <div className="text-[11px] font-medium text-[#667085] truncate">
                {isAdmin
                  ? 'Church Leadership'
                  : currentUser?.cell_name
                  ? currentUser.cell_name
                  : 'Cell Leader'}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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

        {/* Bottom Section: Sunday Deadline Banner & Sign Out */}
        <div className="space-y-3 pt-4 border-t border-[#E3E8EF]">
          <div className="p-3 bg-[#F5F7FA] border border-[#E3E8EF] rounded-xl text-[11px] text-[#667085]">
            <div className="flex items-center gap-1.5 text-[#142B4A] font-bold">
              <Clock className="w-3.5 h-3.5 text-[#C6A45A]" />
              <span>Reporting Deadline</span>
            </div>
            <div className="text-[#182230] font-semibold mt-1">
              Sunday 6:00 PM GMT
            </div>
            <div className="text-[10px] text-[#667085]">
              Timezone: Africa/Accra
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[#667085] hover:text-[#C74646] hover:bg-[#FFF5F5] rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
