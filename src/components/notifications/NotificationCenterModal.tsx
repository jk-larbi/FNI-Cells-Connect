import React, { useState, useEffect, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { PushNotificationService } from '../../services/pushNotificationService';
import { CellService } from '../../services/cellService';
import { MessagingService } from '../../services/messagingService';
import {
  getNotificationPriority,
  getNotificationCategory,
} from '../../services/notificationService';
import {
  Bell,
  BellRing,
  Mail,
  MessageSquare,
  CheckCheck,
  Check,
  Clock,
  Send,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  BookOpen,
  Calendar,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  XCircle,
  Trash2,
  Search,
  Filter,
  GraduationCap,
  HelpCircle,
  Users,
  Award,
  Eye,
  EyeOff,
  RefreshCw,
  History,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { triggerIosInstallGuide, isIosDevice, isStandaloneMode } from '../pwa/IosInstallGuide';
import {
  NotificationItem,
  NotificationCategory,
  NotificationPriority,
  Cell,
  AdminBroadcastRecord,
} from '../../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string, meta?: any) => void;
}

/**
 * Determine date bucket relative to Accra time: 'today' | 'yesterday' | 'earlier'
 */
function getDateBucket(isoString: string): 'today' | 'yesterday' | 'earlier' {
  if (!isoString) return 'earlier';
  try {
    const itemDate = new Date(isoString);
    const now = new Date();

    // Format YYYY-MM-DD in Africa/Accra timezone
    const accraDateStr = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Accra',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);

    const itemDay = accraDateStr(itemDate);
    const todayDay = accraDateStr(now);

    if (itemDay === todayDay) return 'today';

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayDay = accraDateStr(yesterday);
    if (itemDay === yesterdayDay) return 'yesterday';

    return 'earlier';
  } catch {
    return 'earlier';
  }
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
    markAsUnread,
    toggleRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
    clearAllNotifications,
    sendAdminBroadcast,
    getBroadcastHistory,
    pushPermission,
    isPushSupported,
    isPushEnabled,
    requestPushPermission,
    handleNotificationClick,
  } = useNotifications();

  const { currentUser, isAdmin } = useAuth();

  // Active view: 'inbox' | 'broadcast' | 'history'
  const [activeTab, setActiveTab] = useState<'inbox' | 'broadcast' | 'history'>('inbox');

  // Filtering states
  const [filterMode, setFilterMode] = useState<
    'all' | 'unread' | 'reports' | 'assignments' | 'quizzes' | 'learning' | 'communication' | 'system'
  >('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'in_app' | 'push' | 'whatsapp' | 'email'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk action confirmation modal state
  const [confirmClearType, setConfirmClearType] = useState<'all' | 'read' | null>(null);
  const [isProcessingClear, setIsProcessingClear] = useState(false);

  // Push device state
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  // Broadcast composer state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<NotificationPriority>('general');
  const [broadcastType, setBroadcastType] = useState<'announcement' | 'alert'>('announcement');
  const [targetType, setTargetType] = useState<'all' | 'cells' | 'individual'>('all');
  const [selectedCellIds, setSelectedCellIds] = useState<string[]>([]);
  const [selectedTutorId, setSelectedTutorId] = useState<string>('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [showBroadcastPreview, setShowBroadcastPreview] = useState(false);

  // Directory for broadcasts
  const [activeCells, setActiveCells] = useState<Cell[]>([]);
  const [tutorsList, setTutorsList] = useState<any[]>([]);

  // Load cells & tutors for Admin broadcasts
  useEffect(() => {
    if (isAdmin && isOpen) {
      CellService.getActiveCells().then(cells => setActiveCells(cells || []));
      MessagingService.getMemberDirectory().then(members => {
        const tutors = (members || []).filter(
          m => m.role !== 'admin' && m.role !== 'super_admin' && m.role !== 'national_admin'
        );
        setTutorsList(tutors);
      });
    }
  }, [isAdmin, isOpen]);

  // Filtered notifications
  const filteredNotifs = useMemo(() => {
    return notifications.filter(n => {
      // 1. Unread filter
      if (filterMode === 'unread' && n.is_read) return false;

      // 2. High-level category tab filter
      const cat = getNotificationCategory(n);
      if (filterMode === 'reports' && cat !== 'reports') return false;
      if (filterMode === 'assignments' && cat !== 'assignments') return false;
      if (filterMode === 'quizzes' && cat !== 'quizzes') return false;
      if (filterMode === 'learning' && cat !== 'learning') return false;
      if (filterMode === 'communication' && cat !== 'communication') return false;
      if (filterMode === 'system' && cat !== 'system') return false;

      // 3. Sub-category dropdown filter
      if (selectedSubCategory !== 'all' && cat !== selectedSubCategory) return false;

      // 4. Channel filter
      if (channelFilter !== 'all') {
        if (channelFilter === 'in_app' && n.channel !== 'in_app' && n.channel) return false;
        if (channelFilter !== 'in_app' && n.channel !== channelFilter) return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = n.title?.toLowerCase().includes(q);
        const msgMatch = n.message?.toLowerCase().includes(q);
        const cellMatch = n.metadata?.cellName?.toLowerCase().includes(q);
        const senderMatch = n.metadata?.senderName?.toLowerCase().includes(q);
        if (!titleMatch && !msgMatch && !cellMatch && !senderMatch) return false;
      }

      return true;
    });
  }, [notifications, filterMode, selectedSubCategory, channelFilter, searchQuery]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    filteredNotifs.forEach(item => {
      const bucket = getDateBucket(item.created_at);
      if (bucket === 'today') today.push(item);
      else if (bucket === 'yesterday') yesterday.push(item);
      else earlier.push(item);
    });

    return { today, yesterday, earlier };
  }, [filteredNotifs]);

  // Push Permission Handlers
  const handleEnablePush = async () => {
    setIsRequestingPush(true);
    setPushStatusMessage(null);
    try {
      const res = await requestPushPermission();
      if (res.success) {
        setPushStatusMessage('Push notifications registered for this device.');
      } else {
        setPushStatusMessage(res.error || 'Failed to register push.');
      }
    } finally {
      setIsRequestingPush(false);
    }
  };

  const handleTestPush = async () => {
    setPushStatusMessage('Sending a background push test...');
    const result = await PushNotificationService.sendTestPush();
    setPushStatusMessage(
      result.success
        ? 'Push dispatched! Check your notification shade or browser banner.'
        : result.error || 'Push test failed.'
    );
  };

  // Click & Navigate
  const handleItemClick = (n: NotificationItem) => {
    handleNotificationClick(n, (tab, meta) => {
      onClose();
      if (onNavigate) {
        onNavigate(tab, meta);
      }
    });
  };

  // Confirm Clear Handlers
  const executeClear = async () => {
    setIsProcessingClear(true);
    try {
      if (confirmClearType === 'all') {
        await clearAllNotifications();
      } else if (confirmClearType === 'read') {
        await clearReadNotifications();
      }
    } finally {
      setIsProcessingClear(false);
      setConfirmClearType(null);
    }
  };

  // Broadcast Submission
  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setBroadcastFeedback({ success: false, message: 'Please enter both a title and message.' });
      return;
    }
    if (targetType === 'cells' && selectedCellIds.length === 0) {
      setBroadcastFeedback({ success: false, message: 'Please select at least one cell.' });
      return;
    }
    if (targetType === 'individual' && !selectedTutorId) {
      setBroadcastFeedback({ success: false, message: 'Please select an individual tutor.' });
      return;
    }

    setIsSendingBroadcast(true);
    setBroadcastFeedback(null);

    try {
      const selectedTutorObj = tutorsList.find(t => t.id === selectedTutorId);
      const selectedCellNames = activeCells
        .filter(c => selectedCellIds.includes(c.id))
        .map(c => c.name);

      const res = await sendAdminBroadcast({
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        priority: broadcastPriority,
        broadcastType,
        targetType,
        targetCellIds: selectedCellIds,
        targetCellNames: selectedCellNames,
        targetTutorUid: selectedTutorId || undefined,
        targetTutorName: selectedTutorObj?.full_name || undefined,
      });

      if (res.success) {
        setBroadcastFeedback({
          success: true,
          message: `Broadcast successfully dispatched to ${res.recipientCount} active recipient(s).`,
        });
        setBroadcastTitle('');
        setBroadcastMessage('');
        setSelectedCellIds([]);
        setSelectedTutorId('');
        setShowBroadcastPreview(false);
      }
    } catch (e: any) {
      setBroadcastFeedback({
        success: false,
        message: e?.message || 'Failed to dispatch broadcast notice.',
      });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Get appropriate category icon
  const getCategoryIcon = (n: NotificationItem) => {
    const cat = getNotificationCategory(n);
    switch (cat) {
      case 'reports':
        return <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'assignments':
        return <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
      case 'quizzes':
        return <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />;
      case 'learning':
        return <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'cells':
        return <Users className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />;
      case 'leadership':
        return <Award className="w-4 h-4 text-[#C6A45A] shrink-0" />;
      case 'meetings':
        return <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />;
      case 'communication':
        return <MessageSquare className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />;
      case 'system':
        return <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-[#C6A45A] shrink-0" />;
    }
  };

  // Render priority badge
  const renderPriorityBadge = (priority: NotificationPriority) => {
    if (priority === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 shadow-2xs">
          <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
          <span>Urgent</span>
        </span>
      );
    }
    if (priority === 'important') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
          <AlertCircle className="w-2.5 h-2.5 shrink-0" />
          <span>Important</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        General
      </span>
    );
  };

  // Render individual notification card
  const renderNotificationCard = (n: NotificationItem) => {
    const priority = getNotificationPriority(n);
    const cat = getNotificationCategory(n);

    const actionLabel =
      n.type === 'report_submitted'
        ? isAdmin ? 'Inspect Report' : 'View Return'
        : n.type === 'report_approved' || n.type === 'revision_requested' || n.type === 'report_rejected'
        ? 'View Submission & Feedback'
        : n.type.startsWith('assignment_')
        ? 'Open Assignment'
        : n.type.startsWith('quiz_')
        ? 'Open Quiz'
        : n.type === 'teaching_notes' || n.type === 'learning_material_new'
        ? 'Open Teaching Outlines'
        : n.type === 'learning_event_new'
        ? 'View Event'
        : n.type === 'direct_message' || n.type === 'community_message' || n.type === 'broadcast'
        ? 'Open Conversation'
        : n.type === 'cell_member_added' || n.type === 'cell_info_updated'
        ? 'View Cell'
        : n.type.startsWith('deadline_') || n.type.startsWith('overdue_')
        ? isAdmin ? 'Inspect Reports' : 'Submit Return Now'
        : 'View Details';

    return (
      <div
        key={n.id}
        onClick={() => handleItemClick(n)}
        className={`group relative rounded-2xl border p-3.5 text-xs transition-all cursor-pointer ${
          n.is_read
            ? 'bg-white dark:bg-[#142238] border-slate-200 dark:border-[#26384d] text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            : 'bg-[#EAF1FA] dark:bg-[#1b304a] border-[#9FB4D0] dark:border-[#3d5e86] text-[#142B4A] dark:text-white font-semibold shadow-xs hover:border-[#142B4A] dark:hover:border-[#C6A45A]'
        }`}
      >
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-white dark:bg-[#203248] border border-slate-200 dark:border-[#314660] shadow-2xs">
              {getCategoryIcon(n)}
            </div>
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[#142B4A] dark:text-white truncate">
                {n.title}
              </span>
              {!n.is_read && (
                <span className="w-2 h-2 rounded-full bg-[#C6A45A] shrink-0" title="Unread" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {renderPriorityBadge(priority)}
            <span className="text-[10px] text-slate-400 dark:text-slate-400 whitespace-nowrap">
              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Message body */}
        <p className="mt-2 pl-8 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {n.message}
        </p>

        {/* Bottom meta row */}
        <div className="mt-3 pl-8 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 dark:bg-[#24374e] text-slate-600 dark:text-slate-300">
              {cat}
            </span>
            {n.metadata?.cellName && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50">
                {n.metadata.cellName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Action Button */}
            <span className="font-bold text-[#142B4A] dark:text-[#C6A45A] group-hover:underline inline-flex items-center gap-1">
              <span>{actionLabel}</span>
              <ExternalLink className="w-3 h-3" />
            </span>

            {/* Toggle Read/Unread */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                toggleRead(n.id);
              }}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              title={n.is_read ? 'Mark as unread' : 'Mark as read'}
            >
              {n.is_read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                deleteNotification(n.id);
              }}
              className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition-colors"
              title="Delete notification"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="inline-flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#142B4A] dark:bg-[#1f3654] text-[#C6A45A] flex items-center justify-center shadow-xs">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold text-[#142B4A] dark:text-white leading-tight">
              Notification & Alert Centre
            </div>
            <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              Real-time updates across reports, assignments, cell activities, and leadership alerts
            </div>
          </div>
        </div>
      }
      maxWidth="4xl"
    >
      <div className="fni-notification-center space-y-4 text-slate-800 dark:text-slate-100">
        {/* Top Header Mode Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#26384d] pb-2 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'inbox'
                  ? 'bg-[#142B4A] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#1a2c42] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-[#C6A45A]" />
              <span>Inbox</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#C6A45A] text-navy-950 text-[10px] font-extrabold">
                  {unreadCount}
                </span>
              )}
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('broadcast')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'broadcast'
                      ? 'bg-[#142B4A] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#1a2c42] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>Send Broadcast</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'bg-[#142B4A] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#1a2c42] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-purple-400" />
                  <span>Delivery History</span>
                </button>
              </>
            )}
          </div>

          {/* Quick Mark Read / Clear Actions for Inbox */}
          {activeTab === 'inbox' && (
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}

              {notifications.some(n => n.is_read) && (
                <button
                  type="button"
                  onClick={() => setConfirmClearType('read')}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2e44] text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Clear Read
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearType('all')}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* TAB 1: INBOX & REAL-TIME ALERTS                                     */}
        {/* =================================================================== */}
        {activeTab === 'inbox' && (
          <div className="space-y-3">
            {/* Device Push Registration Card */}
            <div className="p-3 bg-white dark:bg-[#142238] rounded-2xl border border-slate-200 dark:border-[#26384d] text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C6A45A]" />
                  <div>
                    <span className="font-bold text-[#142B4A] dark:text-white">Device Push Status: </span>
                    {isPushEnabled ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Active & Registered
                      </span>
                    ) : pushPermission === 'denied' ? (
                      <span className="font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 text-[11px]">
                        Blocked by Browser
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                        Not Enabled
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isPushEnabled ? (
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={isRequestingPush || !isPushSupported}
                      className="px-3 py-1.5 rounded-xl bg-[#142B4A] text-white font-bold hover:bg-[#203D63] transition-colors shadow-xs text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <BellRing className="w-3.5 h-3.5 text-[#C6A45A]" />
                      <span>{isRequestingPush ? 'Registering...' : 'Enable Device Push'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTestPush}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1e324c] border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 transition-colors shadow-xs text-[11px] flex items-center gap-1.5 cursor-pointer"
                    >
                      <BellRing className="w-3.5 h-3.5 text-[#C6A45A]" />
                      <span>Test Push</span>
                    </button>
                  )}
                </div>
              </div>

              {pushStatusMessage && (
                <p className="mt-2 text-[11px] text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/50 p-2 rounded-xl border border-blue-200 dark:border-blue-900/60">
                  {pushStatusMessage}
                </p>
              )}

              {!isPushSupported && isIosDevice() && !isStandaloneMode() && (
                <div className="mt-2.5 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between gap-2">
                  <div className="text-[11px] text-amber-900 dark:text-amber-200">
                    <span className="font-bold">iOS Push Setup:</span> Add to your iPhone Home Screen to receive instant background push notifications.
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerIosInstallGuide()}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-[#142B4A] text-white text-[10px] font-bold flex items-center gap-1 hover:bg-[#203D63] transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-3 h-3 text-[#C6A45A]" />
                    <span>View Guide</span>
                  </button>
                </div>
              )}
            </div>

            {/* Live Search & Filter Bar */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search notifications by title, cell, sender or content..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-[#142238] text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Filter Pills (Requirement 3: All, Unread, Reports, Learning, Communication, System) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'unread', label: `Unread (${unreadCount})` },
                  { id: 'reports', label: 'Reports' },
                  { id: 'assignments', label: 'Assignments' },
                  { id: 'quizzes', label: 'Quizzes' },
                  { id: 'learning', label: 'Learning Portal' },
                  { id: 'communication', label: 'Communication' },
                  { id: 'system', label: 'System' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFilterMode(cat.id as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterMode === cat.id
                        ? 'bg-[#142B4A] text-white shadow-xs'
                        : 'bg-white dark:bg-[#142238] border border-slate-200 dark:border-[#26384d] text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Stream (Grouped by Date) */}
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar overscroll-contain">
              {filteredNotifs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#142238] rounded-2xl border border-dashed border-slate-200 dark:border-[#26384d] p-6">
                  <Bell className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                  <p className="font-bold text-[#142B4A] dark:text-white">No notifications found.</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No updates match your search keywords. Try adjusting your query or filters.'
                      : 'You are all caught up! Incoming reports, reviews, materials and messages appear in real time.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Today */}
                  {groupedNotifications.today.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Today
                        </span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-[#26384d]" />
                      </div>
                      <div className="space-y-2">
                        {groupedNotifications.today.map(renderNotificationCard)}
                      </div>
                    </div>
                  )}

                  {/* Yesterday */}
                  {groupedNotifications.yesterday.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Yesterday
                        </span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-[#26384d]" />
                      </div>
                      <div className="space-y-2">
                        {groupedNotifications.yesterday.map(renderNotificationCard)}
                      </div>
                    </div>
                  )}

                  {/* Earlier */}
                  {groupedNotifications.earlier.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Earlier
                        </span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-[#26384d]" />
                      </div>
                      <div className="space-y-2">
                        {groupedNotifications.earlier.map(renderNotificationCard)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: ADMIN BROADCAST COMPOSER (Requirement 6)                     */}
        {/* =================================================================== */}
        {activeTab === 'broadcast' && isAdmin && (
          <div className="space-y-4 bg-white dark:bg-[#142238] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#26384d]">
            <div>
              <h3 className="text-sm font-bold text-[#142B4A] dark:text-white">Official Leadership Broadcast</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dispatch an official notification directly to active tutors or selected fellowship cells with delivery tracking.
              </p>
            </div>

            {broadcastFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  broadcastFeedback.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
                }`}
              >
                {broadcastFeedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{broadcastFeedback.message}</span>
              </div>
            )}

            {/* Target Scope Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#142B4A] dark:text-white">
                Recipient Target Scope
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'All Active Tutors', desc: 'Broadcast to entire fellowship network' },
                  { id: 'cells', label: 'Selected Cells', desc: 'Active tutors in specific cells' },
                  { id: 'individual', label: 'Individual Tutor', desc: 'Direct alert to one leader' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTargetType(t.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      targetType === t.id
                        ? 'border-[#C6A45A] bg-[#C6A45A]/10 text-[#142B4A] dark:text-white ring-2 ring-[#C6A45A]/30'
                        : 'border-slate-200 dark:border-[#26384d] hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{t.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Cells Multi-Select */}
            {targetType === 'cells' && (
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-[#1a2c42] rounded-xl border border-slate-200 dark:border-[#26384d]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#142B4A] dark:text-white">
                    Select Target Cells ({selectedCellIds.length} chosen)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCellIds(activeCells.map(c => c.id))}
                      className="text-[11px] font-bold text-[#C6A45A] hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCellIds([])}
                      className="text-[11px] font-bold text-slate-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {activeCells.map(cell => {
                    const isChecked = selectedCellIds.includes(cell.id);
                    return (
                      <label
                        key={cell.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-[#142B4A] dark:text-white font-bold'
                            : 'bg-white dark:bg-[#142238] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) setSelectedCellIds([...selectedCellIds, cell.id]);
                            else setSelectedCellIds(selectedCellIds.filter(id => id !== cell.id));
                          }}
                          className="rounded text-[#142B4A] focus:ring-0"
                        />
                        <span className="truncate">{cell.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual Tutor Select */}
            {targetType === 'individual' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white">
                  Select Recipient Tutor
                </label>
                <select
                  value={selectedTutorId}
                  onChange={e => setSelectedTutorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-[#142238] text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                >
                  <option value="">-- Choose active tutor --</option>
                  {tutorsList.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.cell_name || 'Cell Leader'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title & Priority Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white">
                  Broadcast Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mandatory Leaders Briefing: Sunday Outreach"
                  value={broadcastTitle}
                  onChange={e => setBroadcastTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-[#142238] text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white">
                  Priority Level
                </label>
                <select
                  value={broadcastPriority}
                  onChange={e => setBroadcastPriority(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-[#142238] text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                >
                  <option value="general">General (Routine Notice)</option>
                  <option value="important">Important (High Priority)</option>
                  <option value="urgent">Urgent (Critical Action)</option>
                </select>
              </div>
            </div>

            {/* Type selector: Announcement vs Important Alert */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#142B4A] dark:text-white">
                Notification Character
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBroadcastType('announcement')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    broadcastType === 'announcement'
                      ? 'border-[#C6A45A] bg-[#C6A45A]/10 text-[#142B4A] dark:text-white'
                      : 'border-slate-200 dark:border-[#26384d] text-slate-500'
                  }`}
                >
                  Announcement
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastType('alert')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    broadcastType === 'alert'
                      ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                      : 'border-slate-200 dark:border-[#26384d] text-slate-500'
                  }`}
                >
                  Important Security / Pastoral Alert
                </button>
              </div>
            </div>

            {/* Notification Message Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#142B4A] dark:text-white">
                Notification Message
              </label>
              <textarea
                rows={4}
                placeholder="Enter detailed message for field cell leaders..."
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-[#142238] text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
              />
            </div>

            {/* Live Preview Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowBroadcastPreview(!showBroadcastPreview)}
                className="text-xs font-bold text-[#142B4A] dark:text-[#C6A45A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showBroadcastPreview ? 'Hide Live Preview' : 'Show Live Preview Card'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showBroadcastPreview ? 'rotate-180' : ''}`} />
              </button>

              {showBroadcastPreview && (
                <div className="mt-3 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30">
                  <div className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300 mb-2">
                    Tutor Device Preview Card:
                  </div>
                  {renderNotificationCard({
                    id: 'preview-notif',
                    user_id: 'preview',
                    title: broadcastTitle.trim() || 'Notice Title Preview',
                    message: broadcastMessage.trim() || 'This is an accurate preview of how the broadcast message appears on recipients screens.',
                    type: broadcastType === 'alert' ? 'security_alert' : 'announcement',
                    channel: 'in_app',
                    priority: broadcastPriority,
                    category: 'communication',
                    is_read: false,
                    created_at: new Date().toISOString(),
                    metadata: {
                      priority: broadcastPriority,
                      category: 'communication',
                      senderName: currentUser?.full_name || currentUser?.username || 'FNI Leadership',
                    },
                  })}
                </div>
              )}
            </div>

            {/* Actions: Send & Cancel */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-[#26384d]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBroadcastTitle('');
                  setBroadcastMessage('');
                  setActiveTab('inbox');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSendBroadcast}
                disabled={isSendingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
                leftIcon={<Send className="w-3.5 h-3.5 text-[#C6A45A]" />}
              >
                {isSendingBroadcast ? 'Dispatching Broadcast...' : 'Dispatch Broadcast Now'}
              </Button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: BROADCAST DELIVERY HISTORY (Requirement 6)                   */}
        {/* =================================================================== */}
        {activeTab === 'history' && isAdmin && (
          <div className="space-y-3 bg-white dark:bg-[#142238] p-4 rounded-2xl border border-slate-200 dark:border-[#26384d]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#142B4A] dark:text-white">Broadcast Delivery History</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Permanent accountability record of all official leadership notifications dispatched.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                {getBroadcastHistory().length} Dispatches
              </span>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
              {getBroadcastHistory().length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No previous broadcast records found. Dispatched announcements will appear here.
                </div>
              ) : (
                getBroadcastHistory().map(record => (
                  <div
                    key={record.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-[#26384d] bg-slate-50/50 dark:bg-[#182a40] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#142B4A] dark:text-white">{record.title}</span>
                        {renderPriorityBadge(record.priority)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(record.sentAt).toLocaleString('en-GH', {
                          timeZone: 'Africa/Accra',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {record.message}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div>
                        Target:{' '}
                        <span className="font-bold text-[#142B4A] dark:text-slate-200 uppercase">
                          {record.targetType === 'all'
                            ? 'All Active Tutors'
                            : record.targetType === 'cells'
                            ? `Selected Cells (${record.targetDetails?.cellNames?.join(', ') || 'N/A'})`
                            : `Individual (${record.targetDetails?.tutorName || 'Tutor'})`}
                        </span>
                      </div>
                      <div>
                        Sent by:{' '}
                        <span className="font-bold text-[#142B4A] dark:text-slate-200">
                          {record.sentBy?.name || 'Administrator'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Confirmation Modal for Clearing Notifications */}
        {confirmClearType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white dark:bg-[#142238] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200 dark:border-[#26384d]">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="text-sm font-bold text-[#142B4A] dark:text-white">
                  {confirmClearType === 'all' ? 'Clear All Notifications?' : 'Clear Read Notifications?'}
                </h4>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {confirmClearType === 'all'
                  ? 'This will remove all notifications from your account view. Shared broadcast records for other members will not be affected.'
                  : 'This will clear all notifications that you have already marked as read.'}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmClearType(null)}
                  disabled={isProcessingClear}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={executeClear}
                  disabled={isProcessingClear}
                >
                  {isProcessingClear ? 'Clearing...' : 'Confirm Clear'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
