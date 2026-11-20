import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type ScheduledActivityType = 'meeting' | 'evangelism';
export type ScheduledActivityReminderKind = 'before' | 'start';

export interface ScheduledActivityReminderInput {
  id: string;
  type: ScheduledActivityType;
  title: string;
  startsAt: string;
  location?: string | null;
  groupName?: string | null;
  attendeeUserIds?: string[];
  cancelled?: boolean;
}

export interface ScheduleActivityReminderOptions {
  requestPermission?: boolean;
  meetingsEnabled?: boolean;
  evangelismEnabled?: boolean;
}

export interface ScheduleActivityReminderResult {
  supported: boolean;
  scheduled: number;
  skipped: number;
  reason?: 'web_platform' | 'permission_denied' | 'invalid_activity' | 'past_activity' | 'disabled' | 'schedule_failed';
  exactAlarmPermissionGranted?: boolean;
}

interface ReminderRegistry {
  [activityId: string]: number[];
}

const REGISTRY_PREFIX = 'fni_local_activity_reminders_v1:';
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

/**
 * Local notifications are deliberately restricted to native Capacitor runtimes.
 * The current iPhone Home Screen installation is a web PWA and must continue
 * using the existing Web Push path; a browser cannot schedule offline alarms.
 */
export class LocalActivityReminderService {
  private static registryKey(userId: string): string {
    return `${REGISTRY_PREFIX}${userId}`;
  }

  private static readRegistry(userId: string): ReminderRegistry {
    try {
      return JSON.parse(localStorage.getItem(this.registryKey(userId)) || '{}') as ReminderRegistry;
    } catch {
      return {};
    }
  }

  private static writeRegistry(userId: string, registry: ReminderRegistry): void {
    try {
      localStorage.setItem(this.registryKey(userId), JSON.stringify(registry));
    } catch (error) {
      console.warn('FNI could not persist the local reminder registry:', error);
    }
  }

  private static stableNotificationId(activityId: string, kind: ScheduledActivityReminderKind): number {
    // FNV-1a gives each activity/reminder pair a repeatable positive native ID.
    const input = `fni:${activityId}:${kind}`;
    let hash = 0x811c9dc5;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) % 2147483646 + 1;
  }

  static isSupported(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() !== 'web';
  }

  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === 'granted') return true;
      const requested = await LocalNotifications.requestPermissions();
      return requested.display === 'granted';
    } catch (error) {
      console.warn('FNI could not check/request local notification permission:', error);
      return false;
    }
  }

  static async scheduleActivityReminders(
    userId: string,
    activity: ScheduledActivityReminderInput,
    options: ScheduleActivityReminderOptions = {},
  ): Promise<ScheduleActivityReminderResult> {
    if (!this.isSupported()) {
      return { supported: false, scheduled: 0, skipped: 0, reason: 'web_platform' };
    }
    if (!userId || !activity.id || !activity.title?.trim()) {
      return { supported: true, scheduled: 0, skipped: 0, reason: 'invalid_activity' };
    }
    if (activity.cancelled) {
      await this.cancelActivityReminders(userId, activity.id);
      return { supported: true, scheduled: 0, skipped: 0, reason: 'disabled' };
    }

    const enabled = activity.type === 'meeting'
      ? options.meetingsEnabled !== false
      : options.evangelismEnabled !== false;
    if (!enabled) {
      await this.cancelActivityReminders(userId, activity.id);
      return { supported: true, scheduled: 0, skipped: 0, reason: 'disabled' };
    }

    const startsAtMs = new Date(activity.startsAt).getTime();
    if (!Number.isFinite(startsAtMs)) {
      return { supported: true, scheduled: 0, skipped: 0, reason: 'invalid_activity' };
    }

    const now = Date.now();
    if (startsAtMs <= now) {
      await this.cancelActivityReminders(userId, activity.id);
      return { supported: true, scheduled: 0, skipped: 0, reason: 'past_activity' };
    }

    let permissionGranted = false;
    try {
      const permission = await LocalNotifications.checkPermissions();
      permissionGranted = permission.display === 'granted';
      if (!permissionGranted && options.requestPermission) {
        permissionGranted = await this.requestPermission();
      }
    } catch (error) {
      console.warn('FNI could not inspect local notification permission:', error);
    }

    if (!permissionGranted) {
      return { supported: true, scheduled: 0, skipped: 0, reason: 'permission_denied' };
    }

    let exactAlarmPermissionGranted = true;
    if (Capacitor.getPlatform() === 'android') {
      try {
        let exactStatus = await LocalNotifications.checkExactNotificationSetting();
        exactAlarmPermissionGranted = exactStatus.exact_alarm === 'granted';
        if (!exactAlarmPermissionGranted && options.requestPermission) {
          exactStatus = await LocalNotifications.changeExactNotificationSetting();
          exactAlarmPermissionGranted = exactStatus.exact_alarm === 'granted';
        }
      } catch (error) {
        exactAlarmPermissionGranted = false;
        console.warn('FNI could not verify Android exact-alarm access; the operating system may deliver reminders late:', error);
      }
    }

    const startId = this.stableNotificationId(activity.id, 'start');
    const beforeId = this.stableNotificationId(activity.id, 'before');
    const oldRegistry = this.readRegistry(userId);

    // Replace any previous schedule for this activity without touching other events.
    try {
      await LocalNotifications.cancel({
        notifications: [beforeId, startId].map(id => ({ id })),
      });
    } catch (error) {
      // A missing pending notification is expected on first schedule.
      console.debug('FNI reminder replacement cleanup:', error);
    }

    const eventLabel = activity.type === 'meeting' ? 'Meeting' : 'Evangelism activity';
    const context = [activity.groupName, activity.location].filter(Boolean).join(' · ');
    const details = context ? ` · ${context}` : '';
    const notifications = [];

    if (startsAtMs - THIRTY_MINUTES_MS > now) {
      notifications.push({
        id: beforeId,
        title: `${eventLabel} in 30 minutes`,
        body: `${activity.title.trim()} starts at ${new Date(startsAtMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${details}`,
        schedule: { at: new Date(startsAtMs - THIRTY_MINUTES_MS), allowWhileIdle: true },
        extra: { activityId: activity.id, activityType: activity.type, reminderKind: 'before' },
      });
    }

    notifications.push({
      id: startId,
      title: `${eventLabel} is starting now`,
      body: `${activity.title.trim()}${details}`,
      schedule: { at: new Date(startsAtMs), allowWhileIdle: true },
      extra: { activityId: activity.id, activityType: activity.type, reminderKind: 'start' },
    });

    try {
      await LocalNotifications.schedule({ notifications });
      const registry = this.readRegistry(userId);
      registry[activity.id] = notifications.map(notification => notification.id);
      this.writeRegistry(userId, registry);

      // Clean up an older registry entry if the event identifier was previously mapped.
      if (oldRegistry[activity.id] && oldRegistry[activity.id].some(id => !registry[activity.id].includes(id))) {
        await LocalNotifications.cancel({
          notifications: oldRegistry[activity.id]
            .filter(id => !registry[activity.id].includes(id))
            .map(id => ({ id })),
        });
      }

      return {
        supported: true,
        scheduled: notifications.length,
        skipped: startsAtMs - THIRTY_MINUTES_MS > now ? 0 : 1,
        exactAlarmPermissionGranted,
      };
    } catch (error) {
      console.error('FNI could not schedule local activity reminders:', error);
      return { supported: true, scheduled: 0, skipped: notifications.length, reason: 'schedule_failed', exactAlarmPermissionGranted };
    }
  }

  static async cancelActivityReminders(userId: string, activityId: string): Promise<void> {
    if (!this.isSupported() || !userId || !activityId) return;
    const registry = this.readRegistry(userId);
    const ids = registry[activityId] || [
      this.stableNotificationId(activityId, 'before'),
      this.stableNotificationId(activityId, 'start'),
    ];

    try {
      await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
    } catch (error) {
      console.warn('FNI could not cancel local activity reminders:', error);
    }

    delete registry[activityId];
    this.writeRegistry(userId, registry);
  }

  /**
   * Call after authenticated activity data has synchronised to this device.
   * This is reconciliation only: it never needs a network request at reminder time.
   */
  static async reconcileUserActivities(
    userId: string,
    activities: ScheduledActivityReminderInput[],
    options: ScheduleActivityReminderOptions = {},
  ): Promise<void> {
    if (!this.isSupported() || !userId) return;

    const activeIds = new Set(activities.filter(item => !item.cancelled).map(item => item.id));
    const registry = this.readRegistry(userId);

    for (const activityId of Object.keys(registry)) {
      if (!activeIds.has(activityId)) {
        await this.cancelActivityReminders(userId, activityId);
      }
    }

    for (const activity of activities) {
      if (activity.cancelled) {
        await this.cancelActivityReminders(userId, activity.id);
        continue;
      }
      await this.scheduleActivityReminders(userId, activity, options);
    }
  }

  static async cancelAllForUser(userId: string): Promise<void> {
    if (!this.isSupported() || !userId) return;
    const registry = this.readRegistry(userId);
    const ids = Object.values(registry).flat();
    if (ids.length) {
      try {
        await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
      } catch (error) {
        console.warn('FNI could not clear local reminders for signed-out user:', error);
      }
    }
    this.writeRegistry(userId, {});
  }
}
