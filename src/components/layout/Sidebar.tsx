import React from 'react';
import { UserSession } from '../../types';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  TrendingUp, 
  Bell, 
  Settings, 
  PlusCircle, 
  History, 
  Building2, 
  LogOut,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  user: UserSession;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  unreadNotifications: number;
  pendingReviewsCount: number;
  onSignOut: () => void;
  onSwitchUser: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentTab,
  onSelectTab,
  unreadNotifications,
  pendingReviewsCount,
  onSignOut,
  onSwitchUser
}) => {
  const isAdmin = user.role === 'admin';

  const adminNav = [
    { key: 'dash', label: 'Overview', icon: LayoutDashboard },
    { key: 'rep', label: 'Reports', icon: FileText, badge: pendingReviewsCount },
    { key: 'cells', label: 'Cells & leaders', icon: Users },
    { key: 'trend', label: 'Trends & analytics', icon: TrendingUp },
    { key: 'note', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { key: 'settings', label: 'Supabase & backend', icon: Settings },
  ];

  const leaderNav = [
    { key: 'dash', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'new', label: 'Submit report', icon: PlusCircle },
    { key: 'hist', label: 'My reports', icon: History },
    { key: 'info', label: 'Cell profile', icon: Building2 },
    { key: 'note', label: 'Notifications', icon: Bell, badge: unreadNotifications },
  ];

  const navItems = isAdmin ? adminNav : leaderNav;

  return (
    <aside className="w-full md:w-[240px] lg:w-[260px] bg-[#0F2447] text-white flex flex-col shrink-0 min-h-full border-r border-[#1B325A]">
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-[#263B63]">
        <div className="flex items-center gap-3">
          <img
            src="/assets/aistudio/fni_logo_5b889f17.jpg"
            alt="Forerunners Network International Logo"
            className="w-9 h-9 rounded-md object-cover shadow-xs border border-[#263B63] shrink-0"
          />
          <div>
            <h1 className="font-semibold text-base tracking-wide text-white font-serif-title leading-tight">
              Forerunners
            </h1>
            <p className="text-[11px] text-[#AEB9CF] uppercase tracking-wider font-medium">
              Digital Reporting
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              className={`w-full flex items-center justify-between px-6 py-2.5 text-sm font-medium transition-colors text-left border-l-3 ${
                isActive
                  ? 'bg-[#18325C] text-white border-[#B8923A]'
                  : 'text-[#C9D2E3] hover:text-white hover:bg-[#132A52] border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#B8923A]' : 'text-[#8EA1C2]'}`} />
                <span>{item.label}</span>
              </div>
              {Boolean(item.badge && item.badge > 0) && (
                <span className="bg-[#B8923A] text-[#0F2447] text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-4 mx-4 mb-4 rounded-lg bg-[#14294F] border border-[#263B63] text-xs">
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-2">
            <div className="font-medium text-white truncate text-sm">
              {user.name}
            </div>
            <div className="text-[#AEB9CF] text-[11px] mt-0.5 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#B8923A]"></span>
              {isAdmin ? 'Administrator' : 'Cell Leader'}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#263B63]/80 flex items-center justify-between gap-2">
          <button
            onClick={onSwitchUser}
            className="text-[11px] text-[#AEB9CF] hover:text-white flex items-center gap-1 transition-colors"
            title="Switch active user"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#B8923A]" />
            Switch
          </button>
          <button
            onClick={onSignOut}
            className="text-[11px] text-[#F0948C] hover:text-red-300 flex items-center gap-1 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
};
