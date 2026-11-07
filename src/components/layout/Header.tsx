import React from 'react';
import { UserSession } from '../../types';
import { Calendar, PlusCircle, Bell, Send, CheckCircle2 } from 'lucide-react';
import { formatDate, getMonday } from '../../lib/storage';

interface HeaderProps {
  user: UserSession;
  currentTab: string;
  onOpenNewReport?: () => void;
  onOpenBroadcast?: () => void;
  unreadCount?: number;
  onSelectTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentTab,
  onOpenNewReport,
  onOpenBroadcast,
  unreadCount = 0,
  onSelectTab
}) => {
  const currentWeekMonday = getMonday();
  const isAdmin = user.role === 'admin';

  const tabTitles: Record<string, string> = {
    dash: isAdmin ? 'Administrator Overview' : 'Cell Dashboard',
    new: 'Submit Weekly Report',
    rep: 'All Reports & Reviews',
    hist: 'Reporting History',
    cells: 'Cells & Ministry Leaders',
    trend: 'Network Trends & Growth',
    note: 'In-App Notifications',
    settings: 'Supabase & Backend Architecture',
    info: 'Cell Profile & Area Directory'
  };

  const currentTitle = tabTitles[currentTab] || 'Reporting System';

  return (
    <header className="bg-white border-b border-[#E3E6EB] px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
      {/* Zone 1: Current Breadcrumb & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/assets/aistudio/fni_logo_5b889f17.jpg"
          alt="FNI Logo"
          className="w-8 h-8 rounded-md object-cover border border-[#E3E6EB] shrink-0 md:hidden"
        />
        <div>
          <div className="text-[11px] font-medium text-[#5B6472] uppercase tracking-wider">
            Forerunners Network International
          </div>
          <h2 className="text-lg font-semibold text-[#0F2447] tracking-tight truncate font-serif-title">
            {currentTitle}
          </h2>
        </div>
      </div>

      {/* Zone 2: Current Reporting Period Status */}
      <div className="hidden md:flex items-center gap-2 text-xs text-[#5B6472] bg-[#F6F7F9] px-3 py-1.5 rounded border border-[#E3E6EB]">
        <Calendar className="w-3.5 h-3.5 text-[#B8923A]" />
        <span>Current Reporting Cycle:</span>
        <strong className="text-[#0F2447] font-semibold">
          Week of {formatDate(currentWeekMonday)}
        </strong>
      </div>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center gap-2.5 shrink-0">
        {unreadCount > 0 && onSelectTab && (
          <button
            onClick={() => onSelectTab('note')}
            className="md:hidden relative p-2 text-[#0F2447] hover:bg-[#F6F7F9] rounded border border-[#E3E6EB]"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-[#B8923A]" />
            <span className="absolute -top-1 -right-1 bg-[#B8923A] text-[#0F2447] text-[10px] font-bold px-1 rounded-full">
              {unreadCount}
            </span>
          </button>
        )}

        {isAdmin ? (
          <button
            onClick={onOpenBroadcast}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded border border-[#0F2447] transition-colors whitespace-nowrap shadow-xs"
          >
            <Send className="w-3.5 h-3.5 text-[#B8923A]" />
            <span>Broadcast Notice</span>
          </button>
        ) : (
          <button
            onClick={onOpenNewReport}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded border border-[#0F2447] transition-colors whitespace-nowrap shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#B8923A]" />
            <span>Submit Report</span>
          </button>
        )}
      </div>
    </header>
  );
};
