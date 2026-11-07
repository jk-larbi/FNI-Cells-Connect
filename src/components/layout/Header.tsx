import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Menu, Bell, PlusCircle, Calendar } from 'lucide-react';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenNotifications: () => void;
  onNavigateToForm?: () => void;
  onOpenAccountSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenNotifications,
  onNavigateToForm,
  onOpenAccountSettings,
}) => {
  const { currentUser, canSubmitReport } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 bg-canvas/85 backdrop-blur-md border-b border-slate-200/50 transition-all">
      {/* Left: Mobile toggle & context indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-xl bg-white shadow-card text-slate-500 hover:text-navy-950 transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-navy-950 font-semibold text-xs shadow-card border border-slate-100">
            <Calendar className="w-3.5 h-3.5 text-gold-600" />
            <span>Cycle: <strong>Week 45</strong></span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          </div>
        </div>
      </div>

      {/* Right: Actions, notifications, profile */}
      <div className="flex items-center gap-2.5">
        {canSubmitReport && onNavigateToForm && (
          <button
            onClick={onNavigateToForm}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-navy-900 hover:bg-navy-950 text-white font-bold text-xs shadow-card transition-all"
          >
            <PlusCircle className="w-4 h-4 text-gold-400" />
            <span>Submit Report</span>
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2.5 rounded-full bg-white text-slate-600 hover:text-navy-950 shadow-card transition-colors border border-slate-100"
          title="Notifications & Dispatches"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Profile Pill */}
        <button
          onClick={onOpenAccountSettings}
          className="flex items-center gap-2 pl-2 text-left hover:opacity-90 transition-opacity focus:outline-hidden"
          title="Account Settings & Security"
        >
          <div className="w-8 h-8 rounded-full bg-navy-900 text-gold-400 text-xs font-bold flex items-center justify-center shadow-sm">
            {currentUser?.full_name
              ? currentUser.full_name
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')
              : 'FN'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-navy-950 leading-tight">
              {currentUser?.full_name}
            </div>
            <div className="text-[10px] font-medium text-slate-400 capitalize">
              {currentUser?.role ? currentUser.role.replace('_', ' ') : 'Leader'}
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};
