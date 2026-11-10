import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { PushNotificationService } from '../../services/pushNotificationService';
import {
  Bell,
  BellRing,
  Mail,
  MessageSquare,
  CheckCheck,
  Clock,
  Send,
  AlertCircle,
  FileCheck,
  BookOpen,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Flame,
} from 'lucide-react';
import { NotificationItem } from '../../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string, meta?: any) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    triggerBatchReminders,
    pushPermission,
    isPushSupported,
    isPushEnabled,
    requestPushPermission,
    handleNotificationClick,
  } = useNotifications();

  const { isAdmin } = useAuth();

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'reports' | 'messages' | 'materials' | 'deadlines'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'in_app' | 'push' | 'whatsapp' | 'email'>('all');
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  // Filtered notifications
  const filteredNotifs = notifications.filter(n => {
    // Channel filter
    if (channelFilter !== 'all') {
      if (channelFilter === 'in_app' && n.channel !== 'in_app' && n.channel) return false;
      if (channelFilter !== 'in_app' && n.channel !== channelFilter) return false;
    }

    // Category filter
    if (categoryFilter !== 'all') {
      const cat = n.metadata?.category;
      if (categoryFilter === 'reports') {
        return (
          cat === 'reports' ||
          n.type === 'report_submitted' ||
          n.type === 'report_approved' ||
          n.type === 'revision_requested' ||
          n.type === 'report_rejected'
        );
      }
      if (categoryFilter === 'messages') {
        return (
          cat === 'messages' ||
          n.type === 'direct_message' ||
          n.type === 'community_message'
        );
      }
      if (categoryFilter === 'materials') {
        return cat === 'materials' || n.type === 'teaching_notes';
      }
      if (categoryFilter === 'deadlines') {
        return (
          cat === 'deadlines' ||
          n.type === 'deadline_reminder' ||
          n.type === 'overdue_notice'
        );
      }
    }

    return true;
  });

  const handleEnablePush = async () => {
    setIsRequestingPush(true);
    setPushStatusMessage(null);
    try {
      const res = await requestPushPermission();
      if (res.success) {
        setPushStatusMessage('Push notifications enabled and device token registered successfully!');
      } else {
        setPushStatusMessage(res.error || 'Failed to enable push notifications.');
      }
    } finally {
      setIsRequestingPush(false);
    }
  };

  const handleTestPush = async () => {
    setPushStatusMessage('Sending a background push test...');
    const result = await PushNotificationService.sendTestPush();
    setPushStatusMessage(result.success
      ? 'A real background push was sent to this device. Check your browser notifications.'
      : result.error || 'The push test could not be completed.');
  };

  const handleItemClick = (n: NotificationItem) => {
    handleNotificationClick(n, (tab, meta) => {
      onClose();
      if (onNavigate) {
        onNavigate(tab, meta);
      }
    });
  };

  const handleBroadcast = () => {
    const reached = triggerBatchReminders('2026 - Week 45');
    alert(`Dispatched multi-channel reporting notices to ${reached} field leaders via Email & WhatsApp!`);
  };

  const getNotificationIcon = (n: NotificationItem) => {
    if (n.type === 'report_submitted') return <FileCheck className="w-4 h-4 text-navy-800 shrink-0" />;
    if (n.type === 'report_approved') return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
    if (n.type === 'revision_requested' || n.type === 'report_rejected') return <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />;
    if (n.type === 'direct_message' || n.type === 'community_message') return <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />;
    if (n.type === 'teaching_notes') return <BookOpen className="w-4 h-4 text-gold-600 shrink-0" />;
    if (n.type === 'deadline_reminder' || n.type === 'overdue_notice') return <Clock className="w-4 h-4 text-rose-600 shrink-0" />;
    return <Bell className="w-4 h-4 text-gold-600 shrink-0" />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="inline-flex items-center gap-2"><BellRing className="w-5 h-5 text-gold-500 shrink-0" /><span>Notification & Real-Time Alert Center</span></span>}
      subtitle="Connected alerting across reports, reviews, pastoral messages, and teaching outlines"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Push Notification Device Status & Permission Card */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gold-600" />
              <div>
                <span className="font-bold text-[#142B4A]">Device Push Notification Status: </span>
                {isPushEnabled ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Active & Registered
                  </span>
                ) : pushPermission === 'denied' ? (
                  <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[11px]">
                    Blocked by Browser
                  </span>
                ) : (
                  <span className="font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full text-[11px]">
                    Not Enabled
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isPushEnabled ? (
                <button
                  onClick={handleEnablePush}
                  disabled={isRequestingPush || !isPushSupported}
                  className="px-3 py-1.5 rounded-xl bg-[#142B4A] text-white font-bold hover:bg-[#203D63] transition-colors shadow-xs text-[11px] flex items-center gap-1.5 disabled:opacity-50"
                >
                  <BellRing className="w-3.5 h-3.5 text-gold-400" />
                  <span>{isRequestingPush ? 'Requesting...' : 'Enable Push'}</span>
                </button>
              ) : (
                <button
                  onClick={handleTestPush}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors shadow-xs text-[11px] flex items-center gap-1.5"
                >
                  <BellRing className="w-3.5 h-3.5 text-gold-600" />
                  <span>Test Push</span>
                </button>
              )}
            </div>
          </div>

          {pushStatusMessage && (
            <p className="mt-2 text-[11px] text-[#203D63] bg-blue-50/70 p-2 rounded-lg border border-blue-100">
              {pushStatusMessage}
            </p>
          )}

          {!isPushSupported && (
            <p className="mt-2 text-[11px] text-amber-700">
              Web push is unsupported in this environment. In-app real-time notifications remain fully active.
            </p>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-2 flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All Updates' },
              { id: 'reports', label: 'Reports' },
              { id: 'messages', label: 'Messages' },
              { id: 'materials', label: 'Teaching Notes' },
              { id: 'deadlines', label: 'Deadlines' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-[#142B4A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Mark All Read
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBroadcast}
                leftIcon={<Send className="w-3 h-3 text-gold-600" />}
              >
                Broadcast
              </Button>
            )}
          </div>
        </div>

        {/* Channel Filter Pills */}
        <div className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto pb-1">
          <span className="font-medium text-slate-400 text-[11px]">Channel:</span>
          {(['all', 'in_app', 'whatsapp', 'email'] as const).map(ch => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                channelFilter === ch
                  ? 'bg-slate-800 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {ch === 'all' ? 'All Channels' : ch === 'in_app' ? 'In-App' : ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar overscroll-contain">
          {filteredNotifs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No notifications in this view.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                New submissions, reviews, messages and announcements will automatically appear in real time.
              </p>
            </div>
          ) : (
            filteredNotifs.map(n => {
              const hasAction = true;
              const actionLabel =
                n.type === 'report_submitted'
                  ? (isAdmin ? 'Inspect Report' : 'View Return')
                  : n.type === 'report_approved' || n.type === 'revision_requested' || n.type === 'report_rejected'
                  ? 'View Submission & Feedback'
                  : n.type === 'direct_message' || n.type === 'community_message'
                  ? 'Open Conversation'
                  : n.type === 'teaching_notes'
                  ? 'Open Teaching Outlines'
                  : n.type === 'deadline_reminder' || n.type === 'overdue_notice'
                  ? (isAdmin ? 'Inspect Cell Reports' : 'Submit Return Now')
                  : n.type === 'follow_up_assigned' || n.type === 'follow_up_reminder'
                  ? 'Open Discipleship Follow-ups'
                  : 'View Details';

              return (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3.5 rounded-2xl border text-xs transition-all cursor-pointer relative group ${
                    n.is_read
                      ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                      : 'bg-gradient-to-r from-blue-50/70 to-white border-[#142B4A]/30 text-navy-950 font-medium shadow-xs hover:border-[#142B4A]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        {getNotificationIcon(n)}
                      </div>
                      <span className="font-bold text-[#142B4A]">{n.title}</span>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#C6A45A]" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {hasAction && (
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#142B4A] transition-colors" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed pl-7">
                    {n.message}
                  </p>

                  <div className="mt-2.5 pl-7 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="uppercase tracking-wider font-semibold text-slate-500">
                        {n.channel || 'IN_APP'}
                      </span>
                      {n.metadata?.cellName && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {n.metadata.cellName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#142B4A] font-semibold group-hover:underline">
                        {actionLabel} &rarr;
                      </span>
                      {!n.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="hover:text-emerald-700 text-slate-500 font-medium ml-2"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
