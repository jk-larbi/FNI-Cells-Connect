import { SupabaseService } from './supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  NotificationItem,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  UserRole,
  UserNotificationPreferences,
  AdminBroadcastRecord,
} from '../types';
import { PushNotificationService } from './pushNotificationService';
import { CellService } from './cellService';

export const DEFAULT_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  inAppNotifications: true,
  devicePushNotifications: true,
  reports: true,
  assignments: true,
  quizzes: true,
  learningMaterials: true,
  meetings: true,
  cellAnnouncements: true,
  messages: true,
  groupMessages: true,
  calls: true,
  adminBroadcasts: true,
  soundEnabled: true,
  vibrationEnabled: true,
  mutedConversations: {},
  // Backward compatibility keys
  assignmentNotifications: true,
  quizNotifications: true,
  reportDeadlineReminders: true,
  cellMeetingReminders: true,
  privateMessages: true,
};

export function getNotificationPriority(item: NotificationItem | { type?: string; metadata?: Record<string, any>; priority?: string }): NotificationPriority {
  if (item.priority === 'urgent' || item.priority === 'important' || item.priority === 'general') {
    return item.priority;
  }
  if (item.metadata?.priority === 'urgent' || item.metadata?.priority === 'important' || item.metadata?.priority === 'general') {
    return item.metadata.priority as NotificationPriority;
  }
  const type = String(item.type || '');
  if (
    type === 'security_alert' ||
    type === 'password_changed' ||
    type === 'new_device_login' ||
    type === 'overdue_notice' ||
    type === 'report_overdue' ||
    type === 'assignment_overdue' ||
    type === 'report_rejected' ||
    type === 'leadership_dismissed'
  ) {
    return 'urgent';
  }
  if (
    type === 'assignment_new' ||
    type === 'quiz_new' ||
    type === 'deadline_reminder' ||
    type === 'assignment_deadline' ||
    type === 'quiz_deadline' ||
    type === 'meeting_upcoming' ||
    type === 'meeting_reminder' ||
    type === 'meeting_cancelled' ||
    type === 'report_submitted' ||
    type === 'revision_requested' ||
    type === 'assignment_feedback' ||
    type === 'assignment_graded' ||
    type === 'quiz_results'
  ) {
    return 'important';
  }
  return 'general';
}

export function getNotificationCategory(item: NotificationItem | { type?: string; metadata?: Record<string, any>; category?: string }): NotificationCategory {
  if (item.category) return item.category as NotificationCategory;
  if (item.metadata?.category) return item.metadata.category as NotificationCategory;
  const type = String(item.type || '');
  if (type.startsWith('report_') || type === 'deadline_reminder' || type === 'overdue_notice' || type === 'report_overdue') return 'reports';
  if (type.startsWith('assignment_')) return 'assignments';
  if (type.startsWith('quiz_')) return 'quizzes';
  if (type.startsWith('learning_') || type === 'teaching_notes') return 'learning';
  if (type.startsWith('cell_')) return 'cells';
  if (type.startsWith('leadership_')) return 'leadership';
  if (type.startsWith('meeting_')) return 'meetings';
  if (type === 'direct_message' || type === 'community_message' || type === 'message_reply' || type === 'message_mention' || type === 'broadcast' || type === 'announcement') return 'communication';
  if (type === 'password_changed' || type === 'new_device_login' || type === 'security_alert' || type === 'system_maintenance' || type === 'system_alert') return 'system';
  return 'reports';
}

const STORAGE_KEY = 'fni_notifications_store_v2';
const SUBSCRIBERS = new Set<(notifs: NotificationItem[]) => void>();
const dismissedKey = (userId: string) => `fni_notification_dismissals:${userId}`;
const userPrefsKey = (userId: string) => `fni_user_notification_prefs:${userId}`;
function getLocalDismissedIds(userId: string): Set<string> {
  try { return new Set<string>(JSON.parse(localStorage.getItem(dismissedKey(userId)) || '[]')); } catch { return new Set(); }
}
function saveLocalDismissedIds(userId: string, ids: Set<string>) {
  try { localStorage.setItem(dismissedKey(userId), JSON.stringify([...ids])); } catch {}
}

function notifySubscribersLocally(items: NotificationItem[]) {
  SUBSCRIBERS.forEach(cb => {
    try {
      cb(items);
    } catch (e) {
      console.warn('Notification subscriber callback error', e);
    }
  });
}

function getStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredNotifications(items: NotificationItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    notifySubscribersLocally(items);
  } catch (e) {
    console.warn('Failed to save notifications to localStorage', e);
  }
}

export class NotificationService {
  /**
   * Get user notification preferences
   */
  static getUserNotificationPreferences(userId: string): UserNotificationPreferences {
    if (!userId) return DEFAULT_NOTIFICATION_PREFERENCES;
    try {
      const raw = localStorage.getItem(userPrefsKey(userId));
      return raw ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_NOTIFICATION_PREFERENCES;
    } catch {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  /**
   * Save user notification preferences persistently
   */
  static saveUserNotificationPreferences(userId: string, prefs: UserNotificationPreferences): void {
    if (!userId) return;
    try {
      localStorage.setItem(userPrefsKey(userId), JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save notification preferences', e);
    }
  }

  /**
   * Filter notifications relevant to a given user and their role,
   * respecting their individual category notification preferences.
   */
  static filterForUser(
    notifications: NotificationItem[],
    userId: string,
    role: UserRole | string
  ): NotificationItem[] {
    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'national_admin';
    const prefs = userId ? this.getUserNotificationPreferences(userId) : DEFAULT_NOTIFICATION_PREFERENCES;

    const activeCellIds = CellService.getCachedActiveCellIds();
    const activeCellNames = CellService.getCachedActiveCellNames();

    return notifications.filter(n => {
      const category = getNotificationCategory(n);
      const isSecurityAlert =
        n.type === 'security_alert' ||
        n.type === 'password_changed' ||
        n.type === 'new_device_login';

      // Critical security alerts are never silenced (Requirement 8)
      if (!isSecurityAlert) {
        // If master in-app notifications are toggled off by user
        if (prefs.inAppNotifications === false) {
          return false;
        }

        // Category-specific preference filtering
        if (category === 'reports') {
          if (prefs.reports === false || prefs.reportDeadlineReminders === false) return false;
        }
        if (category === 'assignments') {
          if (prefs.assignments === false || prefs.assignmentNotifications === false) return false;
        }
        if (category === 'quizzes') {
          if (prefs.quizzes === false || prefs.quizNotifications === false) return false;
        }
        if (category === 'learning') {
          if (prefs.learningMaterials === false) return false;
        }
        if (category === 'meetings') {
          if (prefs.meetings === false || prefs.cellMeetingReminders === false) return false;
        }
        if (category === 'communication') {
          if (n.type === 'direct_message' && (prefs.messages === false || prefs.privateMessages === false)) return false;
          if ((n.type === 'community_message' || (n.type as string) === 'group_message' || (n.type as string) === 'group_mention') && prefs.groupMessages === false) return false;
          if ((n.type === 'incoming_call' || n.type === 'missed_call') && prefs.calls === false) return false;
          if ((n.type === 'announcement' || n.type === 'teaching_notes') && (prefs.cellAnnouncements === false)) return false;
          if (n.type === 'broadcast' && prefs.adminBroadcasts === false) return false;

          // Check individual conversation mute settings
          const convId = n.metadata?.conversationId || (n.metadata?.senderUid && n.type === 'direct_message' ? n.metadata.senderUid : null);
          if (convId && prefs.mutedConversations?.[convId]?.isMuted) {
            const muteInfo = prefs.mutedConversations[convId];
            if (!muteInfo.mutedUntil || new Date(muteInfo.mutedUntil).getTime() > Date.now()) {
              return false;
            }
          }
        }
      }

      const cellId = n.metadata?.cellId || n.metadata?.cell_id;
      const cellName = n.metadata?.cellName || n.metadata?.cell_name;
      if (cellId && activeCellIds.size > 0 && !activeCellIds.has(String(cellId))) return false;
      if (cellName && activeCellNames.size > 0 && !activeCellNames.has(String(cellName).trim().toLowerCase())) return false;

      // 1. Broadcast to all users
      if (n.user_id === 'all') return true;

      // 2. Administrator-specific notifications
      if (isAdmin && (n.user_id === 'admin' || n.metadata?.recipientRole === 'admin')) {
        return true;
      }

      // Community messages are fanned out by the database into one
      // notification per active recipient, so read state remains per-user.
      // 3. Exact recipient match
      return n.user_id === userId;
    });
  }

  /**
   * Idempotent notification creation
   */
  static async createNotification(item: {
    id?: string;
    idempotencyKey?: string;
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    channel?: NotificationChannel;
    metadata?: Record<string, any>;
  }): Promise<NotificationItem> {
    const id = item.id || item.idempotencyKey || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Check existing notifications in local store for idempotency
    const current = getStoredNotifications();
    const existing = current.find(n => n.id === id || (item.idempotencyKey && n.metadata?.idempotencyKey === item.idempotencyKey));
    if (existing) {
      return existing;
    }

    const priority = getNotificationPriority({ type: item.type, metadata: item.metadata });
    const category = getNotificationCategory({ type: item.type, metadata: item.metadata });

    const newNotif: NotificationItem = {
      id,
      user_id: item.userId,
      title: item.title,
      message: item.message,
      type: item.type,
      channel: item.channel || 'in_app',
      priority,
      category,
      is_read: false,
      metadata: {
        ...item.metadata,
        idempotencyKey: item.idempotencyKey || id,
        priority,
        category,
      },
      created_at: nowIso,
    };

    // 1. Persist the notification to Supabase.
    try {
      await SupabaseService.insertNotification(newNotif);
    } catch (err) {
      console.warn('Supabase notification sync notice:', err);
    }

    // 2. Ask the authenticated edge function to deliver background browser push.
    // In-app notifications remain available if push is not configured or a device has not opted in.
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: delivery, error } = await supabase.functions.invoke('fni-web-push', {
          body: {
            action: 'send_notification',
            notification: {
              id: newNotif.id,
              user_id: newNotif.user_id,
              title: newNotif.title,
              message: newNotif.message,
              type: newNotif.type,
              metadata: newNotif.metadata,
              created_at: newNotif.created_at,
            },
          },
        });
        if (error) {
          console.warn('FNI push delivery failed; the in-app notification is retained:', error.message);
        } else if (Number(delivery?.sent || 0) === 0) {
          console.info('FNI notification saved, but no push reached a registered device:', {
            recipient: newNotif.user_id,
            failed: Number(delivery?.failed || 0),
            reason: delivery?.message || 'The recipient may need to enable notifications on this device.',
          });
        } else if (Number(delivery?.failed || 0) > 0) {
          console.warn('FNI push reached some devices but not all:', delivery);
        }
      } catch (pushError) {
        console.warn('FNI browser push is unavailable; in-app notification is retained:', pushError);
      }
    }

    // 3. Persist to local storage
    const updated = [newNotif, ...current];
    setStoredNotifications(updated);

    // 4. Only show a local system notification when this browser belongs to
    // the actual recipient. Cross-user notifications are pushed by the edge
    // function to recipient devices; showing them here would notify the sender.
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id && user.id === item.userId) {
          PushNotificationService.showLocalNotification(item.title, {
            body: item.message,
            tag: id,
            data: item.metadata,
          });
        }
      } catch (localNotificationError) {
        console.warn('Unable to verify local notification recipient:', localNotificationError);
      }
    }

    return newNotif;
  }

  /**
   * 1. TUTOR REPORT SUBMISSION → ADMIN NOTIFICATIONS
   * Creates notification for admins and a confirmation for the tutor.
   */
  static async notifyReportSubmission(params: {
    reportId: string;
    reportType: 'meeting' | 'evangelism';
    cellId: string;
    cellName: string;
    tutorUid: string;
    tutorName: string;
    attendance?: number;
    conversions?: number;
    contactsCaptured?: number;
    late?: boolean;
    submittedAt?: string;
  }): Promise<void> {
    const timeStr = new Date(params.submittedAt || Date.now()).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Admin Notification
    const adminTitle =
      params.reportType === 'meeting'
        ? `New Cell Meeting Report (${params.cellName})`
        : `New Evangelism Harvest Return (${params.cellName})`;

    const adminMessage =
      params.reportType === 'meeting'
        ? `${params.tutorName} submitted weekly meeting return for "${params.cellName}" at ${timeStr}. Attendance: ${params.attendance || 0}${params.late ? ' (Late Return)' : ''}.`
        : `${params.tutorName} filed evangelism outreach return for "${params.cellName}" at ${timeStr}. Souls won: ${params.conversions || 0}, Contacts: ${params.contactsCaptured || 0}.`;

    const adminIdempotencyKey = `notif-sub-admin-${params.reportId}`;

    await this.createNotification({
      id: adminIdempotencyKey,
      idempotencyKey: adminIdempotencyKey,
      userId: 'admin',
      title: adminTitle,
      message: adminMessage,
      type: 'report_submitted',
      channel: 'in_app',
      metadata: {
        reportId: params.reportId,
        reportType: params.reportType,
        cellId: params.cellId,
        cellName: params.cellName,
        tutorUid: params.tutorUid,
        tutorName: params.tutorName,
        submittedAt: params.submittedAt || new Date().toISOString(),
        category: 'reports',
        targetTab: 'report-review',
        recipientRole: 'admin',
      },
    });

    // Tutor Confirmation Notification
    const tutorIdempotencyKey = `notif-sub-tutor-${params.reportId}`;
    const tutorTitle = params.late
      ? `${params.reportType === 'meeting' ? 'Cell Meeting' : 'Evangelism'} Return Filed (Late)`
      : `${params.reportType === 'meeting' ? 'Cell Meeting' : 'Evangelism'} Return Filed (On-Time)`;

    const tutorMessage = `Your ${params.reportType} report for "${params.cellName}" was received successfully and is queued for pastoral review.`;

    await this.createNotification({
      id: tutorIdempotencyKey,
      idempotencyKey: tutorIdempotencyKey,
      userId: params.tutorUid,
      title: tutorTitle,
      message: tutorMessage,
      type: 'report_submitted',
      channel: 'in_app',
      metadata: {
        reportId: params.reportId,
        reportType: params.reportType,
        cellId: params.cellId,
        cellName: params.cellName,
        category: 'reports',
        targetTab: 'my-reports',
      },
    });
  }

  /**
   * 2. ADMIN → TUTOR NOTIFICATIONS: Report Review (Approved, Revision, or Rejected)
   */
  static async notifyReportReview(params: {
    reportId: string;
    reportType: 'meeting' | 'evangelism';
    status: 'Approved' | 'Needs Correction' | 'Rejected' | string;
    comment?: string;
    tutorUid: string;
    cellName: string;
    reviewerName?: string;
  }): Promise<void> {
    const isApproved = params.status === 'Approved' || params.status === 'approved';
    const isCorrection = params.status === 'Needs Correction' || params.status === 'needs_revision';

    const title = isApproved
      ? `Report Approved: ${params.cellName}`
      : isCorrection
      ? `Corrections Requested: ${params.cellName}`
      : `Report Update: ${params.cellName}`;

    const message = isApproved
      ? `Your ${params.reportType} report for "${params.cellName}" has been officially reviewed and approved by ${params.reviewerName || 'Administration'}.`
      : isCorrection
      ? `Administration requested corrections for "${params.cellName}": "${params.comment || 'Please review and resubmit.'}"`
      : `Your ${params.reportType} report status was updated to ${params.status}.`;

    const idempotencyKey = `notif-review-${params.reportId}-${params.status}-${Date.now().toString().slice(0, 7)}`;

    await this.createNotification({
      id: idempotencyKey,
      idempotencyKey,
      userId: params.tutorUid,
      title,
      message,
      type: isApproved ? 'report_approved' : isCorrection ? 'revision_requested' : 'report_rejected',
      channel: 'in_app',
      metadata: {
        reportId: params.reportId,
        reportType: params.reportType,
        cellName: params.cellName,
        reviewerName: params.reviewerName,
        comment: params.comment,
        category: 'reports',
        targetTab: 'my-reports',
      },
    });
  }

  /**
   * 3. PRIVATE TUTOR-ADMIN CHAT NOTIFICATIONS
   */
  static async notifyPrivateMessage(params: {
    messageId: string;
    senderUid: string;
    senderName: string;
    senderRole: UserRole;
    recipientUid: string;
    cellName?: string;
    content: string;
  }): Promise<void> {
    const isLeadership = ['admin', 'super_admin', 'national_admin'].includes(params.senderRole);
    const isTutorDirectMessage = !isLeadership && params.recipientUid !== 'admin';
    const targetUserId = isLeadership || isTutorDirectMessage ? params.recipientUid : 'admin';

    const title = isLeadership
      ? `Leadership Message from ${params.senderName}`
      : isTutorDirectMessage ? `Private message from ${params.senderName}` : `Message from ${params.senderName} (${params.cellName || 'Cell Leader'})`;

    const preview = params.content.length > 90 ? `${params.content.substring(0, 90)}...` : params.content;
    const idempotencyKey = `notif-pmsg-${params.messageId}`;

    await this.createNotification({
      id: idempotencyKey,
      idempotencyKey,
      userId: targetUserId,
      title,
      message: preview,
      type: 'direct_message',
      channel: 'in_app',
      metadata: {
        messageId: params.messageId,
        conversationId: isLeadership ? params.recipientUid : params.senderUid,
        senderUid: params.senderUid,
        senderName: params.senderName,
        category: 'messages',
        targetTab: 'messages',
        recipientRole: isLeadership || isTutorDirectMessage ? 'tutor' : 'admin',
      },
    });
  }

  /**
   * 4. TUTOR COMMUNITY CHAT NOTIFICATIONS
   */
  static async notifyCommunityMessage(params: {
    messageId: string;
    senderUid: string;
    senderName: string;
    cellName?: string;
    content: string;
    category?: string;
  }): Promise<void> {
    const title = `Community Chat: ${params.senderName} (${params.cellName || 'Fellowship Leader'})`;
    const preview = params.content.length > 90 ? `${params.content.substring(0, 90)}...` : params.content;
    const idempotencyKey = `notif-cmsg-${params.messageId}`;

    // The database trigger creates a separate in-app notification for each
    // recipient, allowing every tutor to maintain an independent read state.
    // This request handles background push fan-out to registered tutor devices.
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase.functions.invoke('fni-web-push', {
      body: {
        action: 'send_notification',
        notification: {
          id: idempotencyKey,
          user_id: 'tutor_community',
          title,
          message: preview,
          type: 'community_message',
          metadata: {
            messageId: params.messageId,
            senderUid: params.senderUid,
            senderName: params.senderName,
            category: 'messages',
            targetTab: 'messages',
          },
          created_at: new Date().toISOString(),
        },
      },
    });
    if (error) console.warn('Community chat push delivery notice:', error.message);
  }

  /**
   * 4b. FNI MENTION NOTIFICATION
   */
  static async notifyMention(params: {
    messageId: string;
    senderUid: string;
    senderName: string;
    recipientUid: string;
    content: string;
    conversationTitle?: string;
  }): Promise<void> {
    if (params.senderUid === params.recipientUid) return; // Prevent self-mention alert
    const idempotencyKey = `notif-mention-${params.messageId}-${params.recipientUid}`;
    const preview = params.content.length > 90 ? `${params.content.substring(0, 90)}...` : params.content;
    await this.createNotification({
      id: idempotencyKey,
      idempotencyKey,
      userId: params.recipientUid,
      title: `${params.senderName} mentioned you in ${params.conversationTitle || 'chat'}`,
      message: `"${preview}"`,
      type: 'message_mention',
      channel: 'in_app',
      metadata: {
        messageId: params.messageId,
        senderUid: params.senderUid,
        senderName: params.senderName,
        category: 'messages',
        targetTab: 'messages',
      },
    });
  }

  /**
   * 4c. FNI MESSAGE REPLY NOTIFICATION
   */
  static async notifyMessageReply(params: {
    messageId: string;
    senderUid: string;
    senderName: string;
    recipientUid: string;
    content: string;
    conversationTitle?: string;
  }): Promise<void> {
    if (params.senderUid === params.recipientUid) return;
    const idempotencyKey = `notif-reply-${params.messageId}-${params.recipientUid}`;
    const preview = params.content.length > 90 ? `${params.content.substring(0, 90)}...` : params.content;
    await this.createNotification({
      id: idempotencyKey,
      idempotencyKey,
      userId: params.recipientUid,
      title: `${params.senderName} replied to your message in ${params.conversationTitle || 'chat'}`,
      message: `"${preview}"`,
      type: 'message_reply',
      channel: 'in_app',
      metadata: {
        messageId: params.messageId,
        senderUid: params.senderUid,
        senderName: params.senderName,
        category: 'messages',
        targetTab: 'messages',
      },
    });
  }

  /**
   * 4d. PINNED MESSAGE NOTIFICATION (When pinner opts to notify members)
   */
  static async notifyPinnedMessage(params: {
    messageId: string;
    pinnerUid: string;
    pinnerName: string;
    content: string;
    conversationTitle: string;
    targetUserId?: string; // If private chat, single recipient; if omitted/undefined, 'all'
  }): Promise<void> {
    const idempotencyKey = `notif-pin-${params.messageId}-${Date.now()}`;
    const preview = params.content.length > 90 ? `${params.content.substring(0, 90)}...` : params.content;
    await this.createNotification({
      id: idempotencyKey,
      idempotencyKey,
      userId: params.targetUserId || 'all',
      title: `📌 ${params.pinnerName} pinned a message in ${params.conversationTitle}`,
      message: `"${preview}"`,
      type: 'community_message',
      channel: 'in_app',
      metadata: {
        messageId: params.messageId,
        pinnerUid: params.pinnerUid,
        pinnerName: params.pinnerName,
        category: 'messages',
        targetTab: 'messages',
      },
    });
  }

  /**
   * 4e. OFFICIAL COMMUNITY GROUP DESIGNATION CHANGE NOTIFICATION
   */
  static async notifyOfficialGroupChange(params: {
    groupName: string;
    adminName: string;
    reason?: string;
  }): Promise<void> {
    const idempotencyKey = `notif-official-group-${Date.now()}`;
    await this.createNotification({
      id: idempotencyKey,
      idempotencyKey,
      userId: 'all',
      title: `Official FNI Community Group Updated`,
      message: `${params.adminName} designated "${params.groupName}" as the official community fellowship group for all tutors. ${params.reason ? `Reason: ${params.reason}` : ''}`,
      type: 'announcement',
      channel: 'in_app',
      metadata: {
        category: 'messages',
        targetTab: 'messages',
      },
    });
  }

  /**
   * 5. ADMIN → TUTOR: Teaching Notes Publication
   */
  static async notifyTeachingNotes(params: {
    materialId: string;
    title: string;
    weekLabel: string;
    uploadedByName: string;
  }): Promise<void> {
    const idempotencyKey = `notif-material-${params.materialId}`;
    await this.createNotification({
      id: idempotencyKey,
      idempotencyKey,
      userId: 'all',
      title: `New Teaching Outline: ${params.title}`,
      message: `Pastoral leadership published the weekly teaching outline for ${params.weekLabel}. Study and prepare ahead of fellowship.`,
      type: 'teaching_notes',
      channel: 'in_app',
      metadata: {
        materialId: params.materialId,
        category: 'materials',
        targetTab: 'materials',
      },
    });
  }

  /**
   * Mark an individual notification as read
   */
  static async markAsRead(id: string): Promise<void> {
    const current = getStoredNotifications();
    const updated = current.map(n => (n.id === id ? { ...n, is_read: true } : n));
    setStoredNotifications(updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
      } catch (e) {
        console.warn('Supabase markAsRead note:', e);
      }
    }
  }

  /**
   * Mark an individual notification as unread
   */
  static async markAsUnread(id: string): Promise<void> {
    const current = getStoredNotifications();
    const updated = current.map(n => (n.id === id ? { ...n, is_read: false } : n));
    setStoredNotifications(updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('notifications').update({ is_read: false, read_at: null }).eq('id', id);
      } catch (e) {
        console.warn('Supabase markAsUnread note:', e);
      }
    }
  }

  /**
   * Toggle read/unread state of an individual notification
   */
  static async toggleRead(id: string): Promise<boolean> {
    const current = getStoredNotifications();
    const target = current.find(n => n.id === id);
    if (!target) return false;
    const nextRead = !target.is_read;
    if (nextRead) {
      await this.markAsRead(id);
    } else {
      await this.markAsUnread(id);
    }
    return nextRead;
  }

  /**
   * Delete or dismiss an individual notification for the specified user
   */
  static async deleteNotificationForUser(userId: string, id: string): Promise<boolean> {
    if (!userId || !id) return false;

    // 1. Record dismissal locally
    const dismissed = getLocalDismissedIds(userId);
    dismissed.add(id);
    saveLocalDismissedIds(userId, dismissed);

    // 2. Record dismissal in Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('notification_dismissals').upsert({
          user_id: userId,
          notification_id: id,
          dismissed_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Supabase deleteNotificationForUser notice:', err);
      }
    }

    // 3. Update memory store
    const current = getStoredNotifications();
    const updated = current.filter(item => item.id !== id);
    setStoredNotifications(updated);
    return true;
  }

  /**
   * Clear only read notifications for the current user
   */
  static async clearReadForUser(userId: string, role: string): Promise<boolean> {
    const current = getStoredNotifications();
    const visible = this.filterForUser(current, userId, role);
    const readItems = visible.filter(n => n.is_read);
    if (readItems.length === 0) return true;

    if (isSupabaseConfigured && supabase) {
      try {
        const rows = readItems.map(item => ({ user_id: userId, notification_id: item.id }));
        if (rows.length) {
          await supabase.from('notification_dismissals').upsert(rows);
        }
      } catch (err) {
        console.warn('Supabase clearReadForUser notice:', err);
      }
    }

    const dismissed = getLocalDismissedIds(userId);
    readItems.forEach(item => dismissed.add(item.id));
    saveLocalDismissedIds(userId, dismissed);
    const filtered = current.filter(item => !dismissed.has(item.id));
    setStoredNotifications(filtered);
    return true;
  }

  /**
   * Send an official Administrator broadcast to all tutors, selected cells, or an individual tutor
   */
  static async sendAdminBroadcast(params: {
    title: string;
    message: string;
    priority: NotificationPriority;
    broadcastType: 'announcement' | 'alert';
    targetType: 'all' | 'cells' | 'individual';
    targetCellIds?: string[];
    targetCellNames?: string[];
    targetTutorUid?: string;
    targetTutorName?: string;
    sender: { uid: string; name: string; role: string };
  }): Promise<{ success: boolean; recipientCount: number; record: AdminBroadcastRecord }> {
    const broadcastId = `bcast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    let recipientCount = 0;

    const notifType: NotificationType = params.broadcastType === 'alert' ? 'security_alert' : 'announcement';

    if (params.targetType === 'all') {
      recipientCount = 1;
      await this.createNotification({
        id: `notif-${broadcastId}`,
        idempotencyKey: `notif-${broadcastId}`,
        userId: 'all',
        title: params.title,
        message: params.message,
        type: notifType,
        channel: 'in_app',
        metadata: {
          broadcastId,
          broadcastType: params.broadcastType,
          priority: params.priority,
          targetType: 'all',
          senderUid: params.sender.uid,
          senderName: params.sender.name,
          category: 'communication',
          targetTab: 'messages',
        },
      });
    } else if (params.targetType === 'individual' && params.targetTutorUid) {
      recipientCount = 1;
      await this.createNotification({
        id: `notif-${broadcastId}-${params.targetTutorUid}`,
        idempotencyKey: `notif-${broadcastId}-${params.targetTutorUid}`,
        userId: params.targetTutorUid,
        title: params.title,
        message: params.message,
        type: notifType,
        channel: 'in_app',
        metadata: {
          broadcastId,
          broadcastType: params.broadcastType,
          priority: params.priority,
          targetType: 'individual',
          tutorName: params.targetTutorName,
          senderUid: params.sender.uid,
          senderName: params.sender.name,
          category: 'communication',
          targetTab: 'messages',
        },
      });
    } else if (params.targetType === 'cells' && params.targetCellIds && params.targetCellIds.length > 0) {
      const members = (await SupabaseService.getMemberDirectory()) || [];
      const cellNameSet = new Set((params.targetCellNames || []).map(c => c.trim().toLowerCase()));

      const targetedTutors = members.filter(m => {
        if (m.role === 'admin' || m.role === 'super_admin' || m.role === 'national_admin') return false;
        if (m.cell_name && cellNameSet.has(m.cell_name.trim().toLowerCase())) return true;
        return false;
      });

      recipientCount = targetedTutors.length;
      for (const tutor of targetedTutors) {
        await this.createNotification({
          id: `notif-${broadcastId}-${tutor.id}`,
          idempotencyKey: `notif-${broadcastId}-${tutor.id}`,
          userId: tutor.id,
          title: params.title,
          message: params.message,
          type: notifType,
          channel: 'in_app',
          metadata: {
            broadcastId,
            broadcastType: params.broadcastType,
            priority: params.priority,
            targetType: 'cells',
            cellName: tutor.cell_name,
            senderUid: params.sender.uid,
            senderName: params.sender.name,
            category: 'communication',
            targetTab: 'messages',
          },
        });
      }
    }

    const record: AdminBroadcastRecord = {
      id: broadcastId,
      title: params.title,
      message: params.message,
      priority: params.priority,
      broadcastType: params.broadcastType,
      targetType: params.targetType,
      targetDetails: {
        cellIds: params.targetCellIds,
        cellNames: params.targetCellNames,
        tutorId: params.targetTutorUid,
        tutorName: params.targetTutorName,
      },
      recipientCount,
      sentBy: params.sender,
      sentAt: nowIso,
    };

    try {
      const history = this.getBroadcastHistory();
      localStorage.setItem('fni_admin_broadcast_history', JSON.stringify([record, ...history]));
    } catch (e) {
      console.warn('Failed to persist broadcast history', e);
    }

    return { success: true, recipientCount, record };
  }

  /**
   * Get past broadcast history
   */
  static getBroadcastHistory(): AdminBroadcastRecord[] {
    try {
      const raw = localStorage.getItem('fni_admin_broadcast_history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string, role: string): Promise<void> {
    const current = getStoredNotifications();
    const userNotifs = this.filterForUser(current, userId, role);
    const userIdsToMark = new Set(userNotifs.map(n => n.id));

    const updated = current.map(n => (userIdsToMark.has(n.id) ? { ...n, is_read: true } : n));
    setStoredNotifications(updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', Array.from(userIdsToMark));
      } catch (e) {
        console.warn('Supabase markAllAsRead note:', e);
      }
    }
  }

  /** Dismiss all notifications visible to one signed-in user without deleting shared broadcasts. */
  static async clearAllForUser(userId: string, role: string): Promise<boolean> {
    const current = getStoredNotifications();
    let visible = this.filterForUser(current, userId, role);
    if (isSupabaseConfigured && supabase) {
      try {
        const remote = await SupabaseService.getNotifications(userId);
        if (remote === null) return false;
        visible = this.filterForUser(remote, userId, role);
        const rows = visible.map(item => ({ user_id: userId, notification_id: item.id }));
        if (rows.length) {
          const { data: existingRows, error: readError } = await supabase
            .from('notification_dismissals')
            .select('notification_id')
            .eq('user_id', userId)
            .in('notification_id', rows.map(row => row.notification_id));
          if (readError) throw readError;
          const existingIds = new Set((existingRows || []).map((row: any) => row.notification_id));
          const newRows = rows.filter(row => !existingIds.has(row.notification_id));
          if (newRows.length) {
            const { error } = await supabase.from('notification_dismissals').insert(newRows);
            if (error) throw error;
          }
        }
      } catch (error) {
        console.warn('Unable to clear notification history:', error);
        return false;
      }
    }
    const dismissed = getLocalDismissedIds(userId);
    visible.forEach(item => dismissed.add(item.id));
    saveLocalDismissedIds(userId, dismissed);
    const filtered = current.filter(item => !dismissed.has(item.id));
    setStoredNotifications(filtered);
    return true;
  }

  private static async loadDismissedIds(userId: string): Promise<Set<string>> {
    const ids = getLocalDismissedIds(userId);
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('notification_dismissals').select('notification_id').eq('user_id', userId);
      if (!error && data) data.forEach((row: any) => ids.add(row.notification_id));
      saveLocalDismissedIds(userId, ids);
    }
    return ids;
  }

  /**
   * Refreshes notification store directly from Supabase and notifies subscribers
   */
  static async refreshUserNotifications(userId: string, role: string): Promise<NotificationItem[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const remoteItems = await SupabaseService.getNotifications(userId);
        if (remoteItems !== null) {
          const authoritative = [...remoteItems].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setStoredNotifications(authoritative);
          const dismissed = await this.loadDismissedIds(userId);
          const visible = this.filterForUser(authoritative, userId, role).filter(item => !dismissed.has(item.id));
          SUBSCRIBERS.forEach(cb => cb(authoritative));
          return visible;
        }
      } catch (err) {
        console.warn('Supabase notifications refresh notice:', err);
      }
    }
    return this.filterForUser(getStoredNotifications(), userId, role);
  }

  /**
   * Real-time subscription to notifications for a specific user and role
   */
  static subscribeToUserNotifications(
    userId: string,
    role: string,
    callback: (notifs: NotificationItem[]) => void
  ): () => void {
    // 1. Initial emission from local storage
    const emitVisible = (items: NotificationItem[], dismissed = getLocalDismissedIds(userId)) => callback(this.filterForUser(items, userId, role).filter(item => !dismissed.has(item.id)));
    emitVisible(getStoredNotifications());

    // 2. Fetch from Supabase
    if (isSupabaseConfigured && supabase) {
      SupabaseService.getNotifications(userId)
        .then(async remoteItems => {
          // A successful empty response is authoritative: do not resurrect stale
          // messages or notifications from this browser's local cache.
          if (remoteItems !== null) {
            const authoritative = [...remoteItems].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setStoredNotifications(authoritative);
            const dismissed = await this.loadDismissedIds(userId);
            emitVisible(authoritative, dismissed);
          }
        })
        .catch(err => {
          console.warn('Supabase notifications initial fetch notice:', err);
        });
    }

    // 3. Register local broadcast subscriber
    const localCallback = (all: NotificationItem[]) => {
      emitVisible(all);
    };
    SUBSCRIBERS.add(localCallback);

    // 4. Register window storage event listener (for cross-tab synchronization)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          emitVisible(parsed);
        } catch {}
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    // 5. Supabase Realtime channel subscription if configured
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        channel = supabase
          .channel('public:notifications')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications' },
            payload => {
              if (payload.new && (payload.new as any).id) {
                const item = payload.new as any;
                const notifItem: NotificationItem = {
                  id: item.id,
                  user_id: item.user_id || item.recipient_target || 'all',
                  title: item.title || 'Notification',
                  message: item.message || '',
                  type: item.notification_type || item.type || 'system_alert',
                  channel: item.channel || 'in_app',
                  is_read: Boolean(item.is_read),
                  metadata: item.metadata || {},
                  created_at: item.created_at || new Date().toISOString(),
                };
                const local = getStoredNotifications();
                const filtered = local.filter(n => n.id !== notifItem.id);
                const updated = [notifItem, ...filtered].sort(
                  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setStoredNotifications(updated);
                emitVisible(updated);
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Supabase Realtime notifications subscription note:', e);
      }
    }

    // Return cleanup unsubscribe function
    return () => {
      SUBSCRIBERS.delete(localCallback);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }
      if (channel && supabase) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }
}
