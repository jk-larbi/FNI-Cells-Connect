import { Capacitor } from '@capacitor/core';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { ScheduledActivity, UserNotificationPreferences } from '../types';
import { NotificationAudio } from '../utils/notificationAudio';

export interface PlatformReminderCapability {
  platform: 'android' | 'ios_pwa' | 'ios_native' | 'web';
  supportsOfflineLocalReminders: boolean;
  supportsOnlineWebPush: boolean;
  description: string;
}

export interface ReminderCalculationResult {
  activityId: string;
  activityType: 'cell_meeting' | 'group_meeting' | 'evangelism';
  title: string;
  targetStartTimeMs: number;
  target30MinMs: number;
  shouldSchedule30Min: boolean;
  shouldScheduleStart: boolean;
  isPast: boolean;
  id30Min: number;
  idStart: number;
  formattedStartTime: string;
}

/**
 * Deterministic 31-bit positive integer hash for notification IDs.
 * Ensures the exact same notification ID is calculated across re-syncs,
 * app restarts, and device reboots, preventing duplicate scheduled alarms.
 */
export function getStableNotificationId(activityId: string, reminderType: '30min' | 'start'): number {
  const str = `fni:${activityId}:${reminderType}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash === 0 ? 1 : hash;
}

/**
 * Calculates reminder schedule times anchored in Africa/Accra timezone (UTC+0).
 * Handles:
 * - Activities more than 30 mins away -> schedules 30min and start reminders.
 * - Activities less than 30 mins away -> schedules only start reminder.
 * - Activities in the past -> schedules neither.
 */
export function calculateReminderTimes(
  activity: ScheduledActivity,
  nowMs: number = Date.now()
): ReminderCalculationResult {
  const startMs = new Date(activity.scheduledStartTime).getTime();
  const thirtyMinBeforeMs = startMs - 30 * 60 * 1000;

  const id30Min = getStableNotificationId(activity.id, '30min');
  const idStart = getStableNotificationId(activity.id, 'start');

  const isPast = startMs <= nowMs;
  const shouldScheduleStart = !isPast && activity.status === 'scheduled';
  const shouldSchedule30Min = thirtyMinBeforeMs > nowMs && activity.status === 'scheduled';

  // Format start time string for user readability (Ghana Time UTC+0)
  const d = new Date(startMs);
  const formattedStartTime = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Accra',
  });

  return {
    activityId: activity.id,
    activityType: activity.activityType,
    title: activity.title,
    targetStartTimeMs: startMs,
    target30MinMs: thirtyMinBeforeMs,
    shouldSchedule30Min,
    shouldScheduleStart,
    isPast,
    id30Min,
    idStart,
    formattedStartTime,
  };
}

export class ActivityReminderService {
  private static CHANNEL_ID = 'fni-activity-reminders';
  private static isChannelCreated = false;

  /**
   * Reports genuine platform capabilities honestly without falsely promising
   * offline background notifications on iOS PWA.
   */
  static getPlatformCapability(): PlatformReminderCapability {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();

    if (isNative && platform === 'android') {
      return {
        platform: 'android',
        supportsOfflineLocalReminders: true,
        supportsOnlineWebPush: true,
        description:
          'Native Android alarms active. Reminders trigger reliably even if the app is closed or the device is offline.',
      };
    }

    if (isNative && platform === 'ios') {
      return {
        platform: 'ios_native',
        supportsOfflineLocalReminders: true,
        supportsOnlineWebPush: true,
        description: 'Native iOS application reminders enabled.',
      };
    }

    // iOS Safari / Home Screen PWA Detection
    const isIos =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    if (isIos) {
      return {
        platform: 'ios_pwa',
        supportsOfflineLocalReminders: false,
        supportsOnlineWebPush: true,
        description:
          'iPhone Home Screen PWA. Reminders are delivered via online Web Push and in-app alerts when connected.',
      };
    }

    return {
      platform: 'web',
      supportsOfflineLocalReminders: false,
      supportsOnlineWebPush: true,
      description: 'Web browser mode. In-app alerts and browser notifications active while connected.',
    };
  }

  /**
   * Ensures the high-priority Android notification channel exists.
   */
  static async ensureChannel(): Promise<void> {
    if (this.isChannelCreated || !Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.createChannel({
        id: this.CHANNEL_ID,
        name: 'Meeting & Evangelism Reminders',
        description: 'Scheduled reminders for fellowship cell meetings and evangelism activities',
        importance: 4, // High importance (banners & sounds)
        visibility: 1, // Public visibility on lockscreen
        sound: 'notification.wav',
        vibration: true,
      });
      this.isChannelCreated = true;
    } catch (e) {
      console.warn('Could not create notification channel on native device:', e);
    }
  }

  /**
   * Checks or requests Android 13+ / Native notification permissions.
   */
  static async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;
    try {
      let status: PermissionStatus = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        status = await LocalNotifications.requestPermissions();
      }
      return status.display === 'granted';
    } catch (e) {
      console.warn('Notification permission request check:', e);
      return false;
    }
  }

  /**
   * Synchronises local reminders for all eligible activities.
   * - Respects user notification preferences.
   * - Cancels obsolete reminders.
   * - Schedules 30-min and exact start-time reminders with unique stable IDs.
   */
  static async syncRemindersForActivities(
    activities: ScheduledActivity[],
    prefs?: UserNotificationPreferences
  ): Promise<{ scheduledCount: number; cancelledCount: number }> {
    const isNative = Capacitor.isNativePlatform();
    let scheduledCount = 0;
    let cancelledCount = 0;

    await this.ensureChannel();

    // Check user preferences
    const meetingsEnabled = prefs ? prefs.meetings !== false && prefs.cellMeetingReminders !== false : true;
    const evangelismEnabled = prefs ? prefs.evangelismReminders !== false : true;
    const soundEnabled = prefs?.soundEnabled !== false;

    // Retrieve currently pending notifications to avoid redundant re-scheduling
    let pendingIds = new Set<number>();
    if (isNative) {
      try {
        const pending = await LocalNotifications.getPending();
        pendingIds = new Set(pending.notifications.map(n => n.id));
      } catch (e) {
        console.warn('Error reading pending local notifications:', e);
      }
    }

    const notificationsToSchedule: any[] = [];
    const notificationsToCancel: { id: number }[] = [];

    for (const activity of activities) {
      const isEvang = activity.activityType === 'evangelism';
      const isMeeting = activity.activityType === 'cell_meeting' || activity.activityType === 'group_meeting';

      // Check preference filters
      const isTypeEnabled = (isMeeting && meetingsEnabled) || (isEvang && evangelismEnabled);

      const calc = calculateReminderTimes(activity);

      // If activity is cancelled, past, or disabled by user preferences, cancel any pending alarms
      if (activity.status === 'cancelled' || !isTypeEnabled || calc.isPast) {
        if (pendingIds.has(calc.id30Min)) {
          notificationsToCancel.push({ id: calc.id30Min });
          cancelledCount++;
        }
        if (pendingIds.has(calc.idStart)) {
          notificationsToCancel.push({ id: calc.idStart });
          cancelledCount++;
        }
        continue;
      }

      const typeLabel = isEvang
        ? 'Evangelism Outreach'
        : activity.activityType === 'cell_meeting'
        ? 'Cell Meeting'
        : 'Group Meeting';

      const cellText = activity.cellName ? `Cell: ${activity.cellName}. ` : '';
      const locationText = activity.location ? `Location: ${activity.location}.` : '';

      // 1. 30 Minutes Before Reminder
      if (calc.shouldSchedule30Min) {
        const title = isEvang
          ? `⏳ Evangelism Outreach in 30 Mins: ${activity.title}`
          : `⏳ Upcoming Meeting in 30 Mins: ${activity.title}`;
        const body = `${activity.title} starts at ${calc.formattedStartTime} (Ghana Time). ${cellText}${locationText}`.trim();

        notificationsToSchedule.push({
          id: calc.id30Min,
          title,
          body,
          schedule: {
            at: new Date(calc.target30MinMs),
            allowWhileIdle: true,
          },
          channelId: this.CHANNEL_ID,
          sound: soundEnabled ? 'notification.wav' : undefined,
          extra: {
            activityId: activity.id,
            activityType: activity.activityType,
            reminderType: '30min',
            scheduledStartTime: activity.scheduledStartTime,
          },
        });
        scheduledCount++;
      } else if (pendingIds.has(calc.id30Min)) {
        notificationsToCancel.push({ id: calc.id30Min });
        cancelledCount++;
      }

      // 2. Exact Start-Time Reminder
      if (calc.shouldScheduleStart) {
        const title = isEvang
          ? `🔥 Evangelism Outreach Starting Now: ${activity.title}`
          : `🔔 Meeting Starting Now: ${activity.title}`;
        const body = `The ${typeLabel} "${activity.title}" is starting now! ${cellText}${locationText}`.trim();

        notificationsToSchedule.push({
          id: calc.idStart,
          title,
          body,
          schedule: {
            at: new Date(calc.targetStartTimeMs),
            allowWhileIdle: true,
          },
          channelId: this.CHANNEL_ID,
          sound: soundEnabled ? 'notification.wav' : undefined,
          extra: {
            activityId: activity.id,
            activityType: activity.activityType,
            reminderType: 'start',
            scheduledStartTime: activity.scheduledStartTime,
          },
        });
        scheduledCount++;
      } else if (pendingIds.has(calc.idStart)) {
        notificationsToCancel.push({ id: calc.idStart });
        cancelledCount++;
      }
    }

    if (isNative) {
      if (notificationsToCancel.length > 0) {
        try {
          await LocalNotifications.cancel({ notifications: notificationsToCancel });
        } catch (e) {
          console.warn('Error cancelling local notifications:', e);
        }
      }

      if (notificationsToSchedule.length > 0) {
        try {
          // Schedule notifications with exact alarm permissions
          await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        } catch (e: any) {
          console.warn('Capacitor schedule exception (falling back gracefully):', e?.message || e);
          // Try scheduling without allowWhileIdle if exact alarm permission was denied
          try {
            const fallbackNotifications = notificationsToSchedule.map(n => ({
              ...n,
              schedule: { at: n.schedule.at },
            }));
            await LocalNotifications.schedule({ notifications: fallbackNotifications });
          } catch (fallbackError) {
            console.warn('Fallback schedule error:', fallbackError);
          }
        }
      }
    } else {
      // For web/PWA mode, record the sync in localStorage so capability inspect panels know
      try {
        localStorage.setItem(
          'fni_synced_activity_reminders',
          JSON.stringify({
            timestamp: new Date().toISOString(),
            scheduledCount,
            cancelledCount,
          })
        );
      } catch {}
    }

    return { scheduledCount, cancelledCount };
  }

  /**
   * Cancels reminders for a specific activity when deleted or cancelled.
   */
  static async cancelRemindersForActivity(activityId: string): Promise<void> {
    const id30Min = getStableNotificationId(activityId, '30min');
    const idStart = getStableNotificationId(activityId, 'start');

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: id30Min }, { id: idStart }],
        });
      } catch (e) {
        console.warn('Error cancelling local reminders for activity', activityId, e);
      }
    }
  }

  /**
   * Initializes listeners to resynchronize reminders on native app restart or resume.
   */
  static initAppListeners(onResyncRequested: () => void): void {
    if (typeof window === 'undefined') return;

    // Listen for window focus / app resume
    window.addEventListener('focus', () => {
      onResyncRequested();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        onResyncRequested();
      }
    });

    // Listen for notification action taps
    if (Capacitor.isNativePlatform()) {
      try {
        LocalNotifications.addListener('localNotificationActionPerformed', notification => {
          const extra = notification.notification?.extra;
          if (extra?.activityId) {
            window.dispatchEvent(
              new CustomEvent('fni-open-activity-details', {
                detail: { activityId: extra.activityId },
              })
            );
          }
        });
      } catch {}
    }
  }
}
