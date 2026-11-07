import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileCheck2,
  Building2,
  Users2,
  History,
  Bell,
  LogOut,
  FileSpreadsheet,
  CheckCircle2,
  FolderGit2,
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'cell-reporting'
  | 'report-management'
  | 'regional-management'
  | 'administration'
  | 'notifications'
  | 'audit-logs';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
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
  const { currentRole, currentUser, logout, isAdmin } = useAuth();

  // Distinct clean navigation items for Admin Panel vs Cell Leader
  const adminNavItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'report-management' as NavTab,
      label: 'Review Reports',
      icon: FileCheck2,
    },
    {
      id: 'administration' as NavTab,
      label: 'Cell Leaders',
      icon: Users2,
    },
    {
      id: 'regional-management' as NavTab,
      label: 'Cells & Regions',
      icon: Building2,
    },
    {
      id: 'audit-logs' as NavTab,
      label: 'Audit Trail',
      icon: History,
    },
  ];

  const cellLeaderNavItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'My Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'cell-reporting' as NavTab,
      label: 'Submit Report',
      icon: FileSpreadsheet,
    },
    {
      id: 'report-management' as NavTab,
      label: 'My Reports',
      icon: FileCheck2,
    },
    {
      id: 'notifications' as NavTab,
      label: 'Notifications',
      icon: Bell,
    },
  ];

  const navItems = isAdmin ? adminNavItems : cellLeaderNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white/95 backdrop-blur-md text-slate-700 flex flex-col justify-between py-6 px-5 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-200/70 shadow-sm overflow-y-auto custom-scrollbar`}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-2.5 px-2 mb-6">
            <span className="text-xl font-extrabold tracking-tight text-navy-950">
              forerunners<span className="text-gold-500">.</span>
            </span>
          </div>

          {/* User Profile Card */}
          <div
            onClick={onOpenAccountSettings}
            className="flex flex-col items-center text-center p-4 mb-6 rounded-2xl bg-slate-50/80 border border-slate-100 cursor-pointer hover:bg-slate-100/80 transition-all group"
            title="Click to view Account Settings & Security"
          >
            <div className="relative mb-2.5">
              <div className="w-14 h-14 rounded-full bg-navy-900 border-2 border-white shadow-card flex items-center justify-center text-sm font-bold text-gold-400">
                {currentUser?.full_name
                  ? currentUser.full_name
                      .split(' ')
                      .map(n => n[0])
                      .slice(0, 2)
                      .join('')
                  : 'FN'}
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="text-xs font-bold text-navy-950 leading-tight">
              {currentUser?.full_name}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate max-w-[190px]">
              {isAdmin
                ? 'System Administrator'
                : currentUser?.cell_name
                ? `Cell: ${currentUser.cell_name}`
                : 'Cell Leader'}
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-navy-900 text-white shadow-card'
                      : 'text-slate-500 hover:text-navy-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-gold-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="space-y-3 pt-4">
          {/* Notification / Cycle Action Pill */}
          <div
            onClick={onOpenNotifications}
            className="p-3.5 bg-navy-900 text-white rounded-2xl cursor-pointer hover:bg-navy-950 transition-all shadow-card group"
          >
            <div className="flex items-start justify-between">
              <div className="w-7 h-7 rounded-lg bg-navy-800 flex items-center justify-center text-gold-400">
                <Bell className="w-3.5 h-3.5" />
              </div>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="text-xs font-bold mt-2">
              {isAdmin ? 'Reporting Period' : 'Submission Cycle'}
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              Week 45 Open • Due Sun 23:59
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
