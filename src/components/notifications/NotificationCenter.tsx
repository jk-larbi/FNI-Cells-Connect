import React, { useState } from 'react';
import { NotificationItem, UserSession } from '../../types';
import { formatDate } from '../../lib/storage';
import { Bell, CheckCheck, MessageSquare, AlertCircle, Calendar, Check } from 'lucide-react';

interface NotificationCenterProps {
  notifications: NotificationItem[];
  user: UserSession;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateToReport?: (reportId?: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  user,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToReport
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Filter for the current user's target
  const relevant = notifications.filter(n => {
    if (user.role === 'admin') {
      return n.to === 'admin' || n.to === 'all';
    }
    return n.to === user.cellId || n.to === 'all';
  });

  const unreadCount = relevant.filter(n => !n.read).length;

  const displayList = relevant.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F2447] tracking-tight font-serif-title">
            In-App Notifications
          </h1>
          <p className="text-sm text-[#5B6472] mt-0.5">
            System announcements, report submissions, and reviewer alerts
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F2447] bg-white border border-[#E3E6EB] hover:bg-slate-50 rounded transition-colors self-start sm:self-auto shadow-2xs"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#B8923A]" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E3E6EB] pb-2 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded font-medium transition-colors ${
            filter === 'all'
              ? 'bg-[#0F2447] text-white'
              : 'text-[#5B6472] hover:text-[#0F2447]'
          }`}
        >
          All ({relevant.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1 rounded font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-[#0F2447] text-white'
              : 'text-[#5B6472] hover:text-[#0F2447]'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg divide-y divide-[#E3E6EB] shadow-xs overflow-hidden">
        {displayList.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5B6472]">
            <Bell className="w-8 h-8 text-[#AEB9CF] mx-auto mb-2" />
            <p className="font-medium text-[#0F2447]">No notifications to display.</p>
            <span className="text-[11px] text-[#8C95A3]">You are completely up to date.</span>
          </div>
        ) : (
          displayList.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.read) onMarkAsRead(n.id);
                if (n.metadata?.reportId && onNavigateToReport) {
                  onNavigateToReport(n.metadata.reportId);
                }
              }}
              className={`p-4 transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                n.read ? 'bg-white hover:bg-[#F8F9FA]' : 'bg-[#FAFBFD] hover:bg-[#F2F5F9]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-[#B8923A]'}`} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#0F2447]">
                      {n.title || 'Notification'}
                    </span>
                    <span className="text-[11px] text-[#8C95A3] tabular-nums">
                      {formatDate(n.date)}
                    </span>
                  </div>
                  <p className="text-xs text-[#5B6472] leading-relaxed">
                    {n.msg}
                  </p>
                  {n.metadata?.reportId && (
                    <span className="inline-block text-[11px] text-[#1B3F7A] font-medium hover:underline pt-0.5">
                      Click to inspect related report →
                    </span>
                  )}
                </div>
              </div>

              {!n.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(n.id);
                  }}
                  className="text-[11px] text-[#8C95A3] hover:text-[#0F2447] p-1 shrink-0"
                  title="Mark as read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
