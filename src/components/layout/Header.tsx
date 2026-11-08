import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { getCurrentDeadlineInfo } from '../../utils/deadlineUtil';
import { Menu, Bell, PlusCircle, Calendar, Clock, Flame, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenNotifications: () => void;
  onNavigateToForm?: () => void;
  onOpenAccountSettings?: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenNotifications,
  onNavigateToForm,
  onOpenAccountSettings,
  canGoBack = false,
  onGoBack,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const deadlineInfo = getCurrentDeadlineInfo();

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-[#E3E8EF] transition-all">
      {/* Left: Mobile toggle & Back button & Deadline badge */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-xl bg-[#F5F7FA] text-[#667085] hover:text-[#142B4A] transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {canGoBack && onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#142B4A]/5 hover:bg-[#142B4A]/10 text-[#142B4A] text-xs font-bold transition-all border border-[#142B4A]/15 cursor-pointer group shadow-2xs shrink-0"
            title="Go back to previous screen"
            aria-label="Go back to previous screen"
          >
            <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold">Back</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F7FA] text-[#142B4A] font-semibold text-xs border border-[#E3E8EF]">
            <Calendar className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Cycle: <strong>{deadlineInfo.periodName}</strong></span>
            <span className="w-2 h-2 rounded-full bg-[#23845B] animate-pulse ml-0.5" />
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F7FA] text-[#667085] font-medium text-xs border border-[#E3E8EF]">
            <Clock className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Deadline: <strong className="text-[#142B4A]">{deadlineInfo.deadlineFormatted}</strong></span>
          </div>
        </div>
      </div>

      {/* Right: Quick actions, notifications, profile */}
      <div className="flex items-center gap-2.5">
        {!isAdmin && onNavigateToForm && (
          <button
            onClick={onNavigateToForm}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Submit Return</span>
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2.5 rounded-full bg-[#F5F7FA] text-[#667085] hover:text-[#142B4A] transition-colors border border-[#E3E8EF]"
          title="Notifications & Dispatches"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#C74646] text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Profile Pill */}
        <button
          onClick={onOpenAccountSettings}
          className="flex items-center gap-2 pl-2 text-left hover:opacity-90 transition-opacity focus:outline-none"
          title="Account Settings"
        >
          <div className="w-8 h-8 rounded-full bg-[#142B4A] text-[#C6A45A] text-xs font-bold flex items-center justify-center shadow-sm">
            {currentUser?.full_name
              ? currentUser.full_name
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')
              : 'FN'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-[#182230] leading-tight">
              {currentUser?.full_name}
            </div>
            <div className="text-[10px] font-medium text-[#667085]">
              {isAdmin ? 'System Administrator' : currentUser?.cell_name || 'Cell Leader'}
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};
