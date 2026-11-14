import { SupabaseService } from './supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { NotificationItem, NotificationType, NotificationChannel, UserRole } from '../types';
import { PushNotificationService } from './pushNotificationService';
const STORAGE_KEY = 'fni_notifications_store_v2';
const SUBSCRIBERS = new Set<(notifs: NotificationItem[]) => void>();

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
   * Filter notifications relevant to a given user and their role
   */
  static filterForUser(
    notifications: NotificationItem[],
    userId: string,
    role: UserRole | string
  ): NotificationItem[] {
    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'national_admin';

    return notifications.filter(n => {
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

    const newNotif: NotificationItem = {
      id,
      user_id: item.userId,
      title: item.title,
      message: item.message,
      type: item.type,
      channel: item.channel || 'in_app',
      is_read: false,
      metadata: {
        ...item.metadata,
        idempotencyKey: item.idempotencyKey || id,
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
        const { error } = await supabase.functions.invoke('fni-web-push', {
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
        if (error) console.warn('FNI browser push delivery notice:', error.message);
      } catch (pushError) {
        console.warn('FNI browser push is unavailable; in-app notification is retained:', pushError);
      }
    }

    // 3. Persist to local storage
    const updated = [newNotif, ...current];
    setStoredNotifications(updated);

    // 4. Dispatch a local notification to the sender's currently open browser where permitted
    PushNotificationService.showLocalNotification(item.title, {
      body: item.message,
      tag: id,
      data: item.metadata,
    });

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
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      } catch (e) {
        console.warn('Supabase markAsRead note:', e);
      }
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

  /**
   * Real-time subscription to notifications for a specific user and role
   */
  static subscribeToUserNotifications(
    userId: string,
    role: string,
    callback: (notifs: NotificationItem[]) => void
  ): () => void {
    // 1. Initial emission from local storage
    callback(this.filterForUser(getStoredNotifications(), userId, role));

    // 2. Fetch from Supabase
    if (isSupabaseConfigured && supabase) {
      SupabaseService.getNotifications(userId)
        .then(remoteItems => {
          // A successful empty response is authoritative: do not resurrect stale
          // messages or notifications from this browser's local cache.
          if (remoteItems !== null) {
            const authoritative = [...remoteItems].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setStoredNotifications(authoritative);
            callback(this.filterForUser(authoritative, userId, role));
          }
        })
        .catch(err => {
          console.warn('Supabase notifications initial fetch notice:', err);
        });
    }

    // 3. Register local broadcast subscriber
    const localCallback = (all: NotificationItem[]) => {
      callback(this.filterForUser(all, userId, role));
    };
    SUBSCRIBERS.add(localCallback);

    // 4. Register window storage event listener (for cross-tab synchronization)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          callback(this.filterForUser(parsed, userId, role));
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
                callback(this.filterForUser(updated, userId, role));
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
