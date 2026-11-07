import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  Bell,
  Mail,
  MessageSquare,
  CheckCheck,
  Clock,
  Send,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, triggerBatchReminders } = useNotifications();
  const [activeTab, setActiveTab] = useState<'in_app' | 'email' | 'whatsapp'>('in_app');

  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'in_app') return n.channel === 'in_app' || !n.channel;
    return n.channel === activeTab;
  });

  const handleBroadcast = () => {
    const reached = triggerBatchReminders('2026 - Week 45');
    alert(`Successfully dispatched multi-channel reminders to ${reached} field leaders via Email & WhatsApp!`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Dispatch & Communications Center"
      subtitle="Multi-channel automated alerting engine (In-App, Email, WhatsApp)"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('in_app')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'in_app'
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>In-App Feed</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-[10px] text-white flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Alerts</span>
            </button>

            <button
              onClick={() => setActiveTab('email')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'email'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Gateway</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'in_app' && unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark All Read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBroadcast}
              leftIcon={<Send className="w-3 h-3 text-gold-600" />}
            >
              Trigger Notice
            </Button>
          </div>
        </div>

        {/* Tab Description Pill */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>
            {activeTab === 'in_app' && 'Real-time dashboard notifications for submission, approvals, and reviews.'}
            {activeTab === 'whatsapp' && 'Simulated WhatsApp Business API dispatches for instantaneous field leader reminders.'}
            {activeTab === 'email' && 'Transactional email gateway for formal submission confirmations and weekly bulletins.'}
          </span>
          <span className="text-[11px] font-mono text-emerald-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Gateway Ready
          </span>
        </div>

        {/* Notification List */}
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar overscroll-contain">
          {filteredNotifs.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No active dispatches found for this channel.
            </div>
          ) : (
            filteredNotifs.map(n => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-3.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  n.is_read
                    ? 'bg-white border-slate-200 text-slate-700'
                    : 'bg-navy-50/50 border-navy-200 text-navy-950 font-medium'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {n.channel === 'whatsapp' ? (
                      <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : n.channel === 'email' ? (
                      <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <Bell className="w-4 h-4 text-gold-600 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-900">{n.title}</span>
                  </div>

                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed pl-6">
                  {n.message}
                </p>

                <div className="mt-2 pl-6 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="uppercase tracking-wider">Channel: {n.channel}</span>
                  {!n.is_read && <span className="text-navy-700 font-bold">• Unread</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
