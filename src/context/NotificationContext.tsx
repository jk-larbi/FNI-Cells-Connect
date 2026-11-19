import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  NotificationItem,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  AdminBroadcastRecord,
} from '../types';
import { NotificationService, getNotificationPriority } from '../services/notificationService';
import { PushNotificationService } from '../services/pushNotificationService';
import { NotificationAudio } from '../utils/notificationAudio';
import { useAuth } from './AuthContext';

export interface ReminderLogEntry {
  cellId: string;
  cellName: string;
  periodId: string;
  scenario: 'upcoming' | 'overdue' | 'escalation';
  channel: NotificationChannel;
  sentAt: string;
}

export interface NotificationNavigationTarget {
  targetTab: string;
  reportId?: string;
  conversationId?: string;
  materialId?: string;
  assignmentId?: string;
  quizId?: string;
  eventId?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  reminderLogs: ReminderLogEntry[];
  pushPermission: NotificationPermission | 'unsupported';
  isPushSupported: boolean;
  isPushEnabled: boolean;
  activeNavigationTarget: NotificationNavigationTarget | null;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  toggleRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<boolean>;
  clearReadNotifications: () => Promise<boolean>;
  clearAllNotifications: () => Promise<boolean>;
  dispatchNotification: (
    title: string,
    message: string,
    type: NotificationType,
    channel?: NotificationChannel,
    metadata?: Record<string, any>
  ) => Promise<void>;
  sendAdminBroadcast: (params: {
    title: string;
    message: string;
    priority: NotificationPriority;
    broadcastType: 'announcement' | 'alert';
    targetType: 'all' | 'cells' | 'individual';
    targetCellIds?: string[];
    targetCellNames?: string[];
    targetTutorUid?: string;
    targetTutorName?: string;
  }) => Promise<{ success: boolean; recipientCount: number; record: AdminBroadcastRecord }>;
  getBroadcastHistory: () => AdminBroadcastRecord[];
  sendCellReminder: (
    cellId: string,
    cellName: string,
    periodId: string,
    scenario: 'upcoming' | 'overdue' | 'escalation',
    channel?: NotificationChannel
  ) => boolean;
  triggerBatchReminders: (targetPeriod: string) => number;
  requestPushPermission: () => Promise<{ success: boolean; token?: string; error?: string }>;
  disablePushNotifications: () => Promise<void>;
  clearNavigationTarget: () => void;
  handleNotificationClick: (notif: NotificationItem, onNavigate?: (tab: string, meta?: any) => void) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_REMINDER_KEY = 'fni_reminder_logs_store';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [reminderLogs, setReminderLogs] = useState<ReminderLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_REMINDER_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [activeNavigationTarget, setActiveNavigationTarget] = useState<NotificationNavigationTarget | null>(null);

  // Register the background service worker and restore a real server-backed subscription.
  useEffect(() => {
    let cancelled = false;
    const initializePush = async () => {
      const supported = PushNotificationService.isPushSupported();
      if (!cancelled) {
        setIsPushSupported(supported);
        setPushPermission(await PushNotificationService.getPermissionStateAsync());
        setIsPushEnabled(false);
      }
      if (!supported) return;

      try {
        if (Capacitor.isNativePlatform()) {
          await PushNotificationService.initializeNativeChannels();
          const pending = PushNotificationService.getPendingNotificationClick();
          if (pending?.targetTab) {
            setActiveNavigationTarget({
              targetTab: pending.targetTab,
              reportId: pending.reportId,
              conversationId: pending.conversationId,
              materialId: pending.materialId,
            });
          }
          if (currentUser?.id) {
            const active = await PushNotificationService.syncExistingSubscription(currentUser.id);
            if (!cancelled) setIsPushEnabled(active);
          }
        } else {
          await PushNotificationService.registerServiceWorker();
          await navigator.serviceWorker.ready;
          if (currentUser?.id && Notification.permission === 'granted') {
            const active = await PushNotificationService.syncExistingSubscription(currentUser.id);
            if (!cancelled) setIsPushEnabled(active);
          }
        }
      } catch (error) {
        console.warn('FNI background notification setup notice:', error);
      }
      if (!cancelled) setPushPermission(await PushNotificationService.getPermissionStateAsync());
    };
    void initializePush();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  // Real-time subscription to notifications for the current authenticated user
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const unsubscribe = NotificationService.subscribeToUserNotifications(
      currentUser.id,
      currentUser.role,
      (userNotifs) => {
        // If this is the initial emission, just seed seen set
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          userNotifs.forEach(n => seenNotificationIdsRef.current.add(n.id));
          setNotifications(userNotifs);
          return;
        }

        // Detect newly arrived notifications in the foreground
        let hasNewAlert = false;
        let highestPriority: 'urgent' | 'important' | 'general' = 'general';

        for (const n of userNotifs) {
          if (!seenNotificationIdsRef.current.has(n.id)) {
            seenNotificationIdsRef.current.add(n.id);
            if (!n.is_read && n.metadata?.senderUid !== currentUser.id) {
              hasNewAlert = true;
              const prio = getNotificationPriority(n);
              if (prio === 'urgent') {
                highestPriority = 'urgent';
              } else if (prio === 'important' && highestPriority !== 'urgent') {
                highestPriority = 'important';
              }
            }
          }
        }

        setNotifications(userNotifs);

        // If app is currently visible in foreground, trigger sound & vibration
        if (hasNewAlert && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          const prefs = NotificationService.getUserNotificationPreferences(currentUser.id);
          if (prefs.soundEnabled !== false && prefs.inAppNotifications !== false) {
            NotificationAudio.playChime(highestPriority);
          }
          if (prefs.vibrationEnabled !== false && prefs.inAppNotifications !== false) {
            NotificationAudio.triggerVibration(highestPriority === 'urgent' ? [200, 100, 200, 100, 200] : [120, 80, 120]);
          }
        }
      }
    );

    // Listen for background service worker click messages via postMessage
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FNI_NOTIFICATION_CLICK' && event.data?.targetTab) {
        setActiveNavigationTarget({
          targetTab: event.data.targetTab,
          reportId: event.data.reportId,
          conversationId: event.data.conversationId,
          materialId: event.data.materialId,
        });
      }
    };
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Native Android push tap listener (attach early before setupForegroundListener)
    const handleNativePushClick = (event: Event) => {
      const data = (event as CustomEvent).detail || {};
      setActiveNavigationTarget({
        targetTab: data.targetTab || 'notifications',
        reportId: data.reportId,
        conversationId: data.conversationId,
        materialId: data.materialId,
      });
    };
    window.addEventListener('fni-native-push-click', handleNativePushClick);

    // Setup foreground FCM listener & real-time refresh
    let unsubscribeForeground: (() => void) | null = null;
    PushNotificationService.setupForegroundListener(async () => {
      // Re-trigger live Supabase notification refresh for fresh content
      const fresh = await NotificationService.refreshUserNotifications(currentUser.id, currentUser.role);
      setNotifications(fresh);
    }).then(unsub => {
      if (unsub) unsubscribeForeground = unsub;
    });

    return () => {
      unsubscribe();
      if (unsubscribeForeground) unsubscribeForeground();
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      window.removeEventListener('fni-native-push-click', handleNativePushClick);
    };
  }, [currentUser?.id, currentUser?.role]);

  // Persist reminder logs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_REMINDER_KEY, JSON.stringify(reminderLogs));
    } catch (e) {
      console.warn('Failed to save reminder logs', e);
    }
  }, [reminderLogs]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    await NotificationService.markAsRead(id);
  };

  const markAsUnread = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: false } : n)));
    await NotificationService.markAsUnread(id);
  };

  const toggleRead = async (id: string): Promise<boolean> => {
    const target = notifications.find(n => n.id === id);
    const next = !target?.is_read;
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: next } : n)));
    if (next) {
      await NotificationService.markAsRead(id);
    } else {
      await NotificationService.markAsUnread(id);
    }
    return next;
  };

  const deleteNotification = async (id: string): Promise<boolean> => {
    if (!currentUser) return false;
    setNotifications(prev => prev.filter(n => n.id !== id));
    return NotificationService.deleteNotificationForUser(currentUser.id, id);
  };

  const clearReadNotifications = async (): Promise<boolean> => {
    if (!currentUser) return false;
    const readIds = new Set(notifications.filter(n => n.is_read).map(n => n.id));
    setNotifications(prev => prev.filter(n => !readIds.has(n.id)));
    return NotificationService.clearReadForUser(currentUser.id, currentUser.role);
  };

  const sendAdminBroadcast = async (params: {
    title: string;
    message: string;
    priority: NotificationPriority;
    broadcastType: 'announcement' | 'alert';
    targetType: 'all' | 'cells' | 'individual';
    targetCellIds?: string[];
    targetCellNames?: string[];
    targetTutorUid?: string;
    targetTutorName?: string;
  }) => {
    if (!currentUser) throw new Error('Must be authenticated to send broadcast');
    return NotificationService.sendAdminBroadcast({
      ...params,
      sender: {
        uid: currentUser.id,
        name: currentUser.full_name || currentUser.username || 'FNI Leadership',
        role: currentUser.role,
      },
    });
  };

  const getBroadcastHistory = (): AdminBroadcastRecord[] => {
    return NotificationService.getBroadcastHistory();
  };

  const clearAllNotifications = async (): Promise<boolean> => {
    if (!currentUser) return false;
    const cleared = await NotificationService.clearAllForUser(currentUser.id, currentUser.role);
    if (cleared) {
      const key = `fni_notification_dismissals:${currentUser.id}`;
      try {
        const ids = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
        setNotifications(previous => previous.filter(item => !ids.has(item.id)));
      } catch { setNotifications([]); }
    }
    return cleared;
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await NotificationService.markAllAsRead(currentUser.id, currentUser.role);
  };

  const dispatchNotification = async (
    title: string,
    message: string,
    type: NotificationType,
    channel: NotificationChannel = 'in_app',
    metadata?: Record<string, any>
  ) => {
    const targetUserId = metadata?.targetUserId || (isAdmin ? 'all' : 'admin');
    await NotificationService.createNotification({
      userId: targetUserId,
      title,
      message,
      type,
      channel,
      metadata,
    });
  };

  const sendCellReminder = (
    cellId: string,
    cellName: string,
    periodId: string,
    scenario: 'upcoming' | 'overdue' | 'escalation',
    channel: NotificationChannel = 'in_app'
  ): boolean => {
    const exists = reminderLogs.some(
      r => r.cellId === cellId && r.periodId === periodId && r.scenario === scenario
    );
    if (exists) {
      console.info(`Reminder already sent for ${cellName} (${scenario}) in period ${periodId}. Duplicate prevented.`);
      return false;
    }

    const title =
      scenario === 'upcoming'
        ? `Reminder: Weekly Report Due Today (Sunday 6:00 PM)`
        : scenario === 'overdue'
        ? `Overdue: Weekly Report Submission Required`
        : `Urgent Escalation: Unsubmitted Cell Return (${cellName})`;

    const message =
      scenario === 'upcoming'
        ? `Friendly reminder for ${cellName}: please submit your weekly meeting and evangelism return before Sunday 6:00 PM Africa/Accra.`
        : scenario === 'overdue'
        ? `The reporting window for ${cellName} closed at 6:00 PM. Please submit your return immediately. It will be recorded as late.`
        : `Your weekly return for ${cellName} is now more than 24 hours overdue. FNI Leadership intervention requested.`;

    dispatchNotification(
      title,
      message,
      scenario === 'upcoming' ? 'deadline_reminder' : 'overdue_notice',
      channel,
      { cellId, cellName, periodId, scenario, category: 'deadlines' }
    );

    const logEntry: ReminderLogEntry = {
      cellId,
      cellName,
      periodId,
      scenario,
      channel,
      sentAt: new Date().toISOString(),
    };
    setReminderLogs(prev => [logEntry, ...prev]);
    return true;
  };

  const triggerBatchReminders = (targetPeriod: string) => {
    const channels: NotificationChannel[] = ['email', 'whatsapp'];
    channels.forEach(ch => {
      dispatchNotification(
        `Automated Reporting Reminder (${ch.toUpperCase()})`,
        `Formal reporting notice dispatched for ${targetPeriod}. All cell leaders must submit before Sunday 6:00 PM deadline.`,
        'deadline_reminder',
        ch,
        { period: targetPeriod, category: 'deadlines' }
      );
    });
    return 8;
  };

  const requestPushPermission = async (): Promise<{ success: boolean; token?: string; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'User must be signed in to enable push notifications.' };
    }
    const res = await PushNotificationService.requestPermissionAndRegister(
      currentUser.id,
      isAdmin ? 'admin' : 'tutor'
    );
    setPushPermission(await PushNotificationService.getPermissionStateAsync());
    if (res.success) {
      setIsPushEnabled(true);
    }
    return res;
  };

  const disablePushNotifications = async (): Promise<void> => {
    if (!currentUser?.id) return;
    await PushNotificationService.unregisterDeviceToken(currentUser.id);
    setIsPushEnabled(false);
    setPushPermission(await PushNotificationService.getPermissionStateAsync());
  };

  const clearNavigationTarget = () => {
    setActiveNavigationTarget(null);
  };

  const handleNotificationClick = (notif: NotificationItem, onNavigate?: (tab: string, meta?: any) => void) => {
    // Mark as read
    markAsRead(notif.id);

    // Determine target tab and metadata
    const meta = notif.metadata || {};
    // A location alert can include a server-generated Google Maps universal
    // link. Open it from this user gesture, then keep the FNI dashboard in sync.
    if (typeof meta.actionUrl === 'string') {
      try {
        const mapsUrl = new URL(meta.actionUrl);
        if (mapsUrl.hostname === 'www.google.com' && mapsUrl.pathname.startsWith('/maps/')) {
          if (Capacitor.isNativePlatform()) window.location.href = mapsUrl.toString();
          else window.open(mapsUrl.toString(), '_blank', 'noopener,noreferrer');
        }
      } catch {}
    }
    let targetTab = meta.targetTab;

    if (!targetTab) {
      switch (notif.type) {
        case 'report_submitted':
          targetTab = isAdmin ? 'report-review' : 'my-reports';
          break;
        case 'report_approved':
        case 'revision_requested':
        case 'report_rejected':
          targetTab = 'my-reports';
          break;
        case 'direct_message':
        case 'community_message':
        case 'announcement':
          targetTab = 'messages';
          break;
        case 'teaching_notes':
          targetTab = 'materials';
          break;
        case 'deadline_reminder':
        case 'overdue_notice':
        case 'report_overdue':
          targetTab = isAdmin ? 'report-review' : 'submit-cell-meeting-report';
          break;
        case 'assignment_new':
        case 'assignment_submitted':
        case 'assignment_deadline':
        case 'assignment_overdue':
        case 'assignment_graded':
        case 'assignment_feedback':
          targetTab = 'assignments';
          break;
        case 'quiz_new':
        case 'quiz_deadline':
        case 'quiz_submitted':
        case 'quiz_graded':
        case 'quiz_results':
          targetTab = 'quizzes';
          break;
        case 'learning_material_new':
        case 'learning_announcement':
          targetTab = 'materials';
          break;
        case 'learning_event_new':
          targetTab = 'events';
          break;
        case 'cell_member_added':
        case 'cell_member_removed':
        case 'cell_info_updated':
        case 'leadership_assigned':
        case 'leadership_changed':
        case 'leadership_dismissed':
          targetTab = isAdmin ? 'cell-management' : 'my-cell';
          break;
        case 'password_changed':
        case 'new_device_login':
        case 'security_alert':
        case 'system_maintenance':
          targetTab = 'account-settings';
          break;
        case 'follow_up_assigned':
        case 'follow_up_reminder':
          targetTab = 'follow-ups';
          break;
        default:
          targetTab = isAdmin ? 'dashboard' : 'my-dashboard';
      }
    }

    if (targetTab) {
      setActiveNavigationTarget({
        targetTab,
        reportId: meta.reportId,
        conversationId: meta.conversationId || (notif.type === 'community_message' ? 'community' : undefined),
        materialId: meta.materialId,
      });

      if (onNavigate) {
        onNavigate(targetTab, {
          ...meta,
          conversationId: meta.conversationId || (notif.type === 'community_message' ? 'community' : undefined),
        });
      }
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        reminderLogs,
        pushPermission,
        isPushSupported,
        isPushEnabled,
        activeNavigationTarget,
        markAsRead,
        markAsUnread,
        toggleRead,
        markAllAsRead,
        deleteNotification,
        clearReadNotifications,
        clearAllNotifications,
        dispatchNotification,
        sendAdminBroadcast,
        getBroadcastHistory,
        sendCellReminder,
        triggerBatchReminders,
        requestPushPermission,
        disablePushNotifications,
        clearNavigationTarget,
        handleNotificationClick,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
