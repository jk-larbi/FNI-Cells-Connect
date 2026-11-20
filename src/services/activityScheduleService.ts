import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ScheduledActivity,
  CreateScheduledActivityInput,
  ScheduledActivityStatus,
} from '../types';
import { ActivityReminderService } from './activityReminderService';
import { NotificationService } from './notificationService';
import { UserSettingsService } from './userSettingsService';

const LOCAL_ACTIVITIES_KEY = 'fni_scheduled_activities_cache';
const LISTENERS = new Set<() => void>();

export class ActivityScheduleService {
  /**
   * Reads activities from local cache for instant offline responsiveness.
   */
  static getLocalActivities(): ScheduledActivity[] {
    try {
      const raw = localStorage.getItem(LOCAL_ACTIVITIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Saves activities to local cache.
   */
  private static saveLocalActivities(activities: ScheduledActivity[]): void {
    try {
      localStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(activities));
    } catch {}
  }

  /**
   * Retrieves all scheduled activities relevant to the user.
   * - Filters by cellId or invitedMemberIds or creator.
   * - Falls back cleanly to local offline cache if Supabase is offline or unreachable.
   */
  static async getScheduledActivities(params: {
    userId: string;
    cellId?: string;
    isAdmin?: boolean;
    includePast?: boolean;
  }): Promise<ScheduledActivity[]> {
    const local = this.getLocalActivities();

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('scheduled_activities')
          .select('*')
          .order('scheduled_start_time', { ascending: true });

        if (!params.includePast) {
          // Include activities from the last 2 hours onward so ongoing meetings remain visible
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
          query = query.gte('scheduled_start_time', twoHoursAgo);
        }

        const { data, error } = await query;

        if (!error && data) {
          const mapped: ScheduledActivity[] = data.map((row: any) => ({
            id: row.id,
            activityType: row.activity_type,
            title: row.title,
            description: row.description,
            scheduledStartTime: row.scheduled_start_time,
            scheduledEndTime: row.scheduled_end_time,
            cellId: row.cell_id,
            cellName: row.cell_name,
            location: row.location,
            createdBy: row.created_by,
            creatorName: row.creator_name,
            invitedMemberIds: row.invited_member_ids || [],
            scope: row.scope || 'cell',
            status: row.status || 'scheduled',
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));

          // Filter by relevant membership
          const relevant = mapped.filter(item => {
            if (params.isAdmin) return true;
            if (item.createdBy === params.userId) return true;
            if (item.scope === 'all') return true;
            if (item.cellId && params.cellId && item.cellId === params.cellId) return true;
            if (item.invitedMemberIds && item.invitedMemberIds.includes(params.userId)) return true;
            return false;
          });

          this.saveLocalActivities(relevant);

          // Synchronise device reminders
          void this.triggerLocalReminderSync(params.userId, relevant);

          return relevant;
        }
      } catch (err) {
        console.warn('Notice reading scheduled activities from Supabase (using offline cache):', err);
      }
    }

    // Filter local cache
    const filteredLocal = local.filter(item => {
      if (params.isAdmin) return true;
      if (item.createdBy === params.userId) return true;
      if (item.scope === 'all') return true;
      if (item.cellId && params.cellId && item.cellId === params.cellId) return true;
      if (item.invitedMemberIds && item.invitedMemberIds.includes(params.userId)) return true;
      return false;
    });

    void this.triggerLocalReminderSync(params.userId, filteredLocal);
    return filteredLocal;
  }

  /**
   * Helper to synchronize reminders with current user notification preferences.
   */
  private static async triggerLocalReminderSync(userId: string, activities: ScheduledActivity[]): Promise<void> {
    try {
      const userSettings = await UserSettingsService.getUserSettings(userId);
      const prefs = userSettings?.notificationPreferences;
      await ActivityReminderService.syncRemindersForActivities(activities, prefs);
    } catch (e) {
      console.warn('Reminder sync trigger notice:', e);
    }
  }

  /**
   * Creates a new scheduled meeting or evangelism activity.
   */
  static async createScheduledActivity(
    input: CreateScheduledActivityInput,
    currentUser: { id: string; full_name?: string; name?: string; cell_id?: string; cell_name?: string }
  ): Promise<ScheduledActivity> {
    const creatorName = currentUser.full_name || currentUser.name || 'FNI Leader';
    const newActivity: ScheduledActivity = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `act_${Date.now()}`,
      activityType: input.activityType,
      title: input.title.trim(),
      description: input.description?.trim(),
      scheduledStartTime: input.scheduledStartTime,
      scheduledEndTime: input.scheduledEndTime,
      cellId: input.cellId || currentUser.cell_id,
      cellName: input.cellName || currentUser.cell_name,
      location: input.location?.trim(),
      createdBy: currentUser.id,
      creatorName,
      invitedMemberIds: input.invitedMemberIds || [],
      scope: input.scope || 'cell',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to local cache first
    const local = this.getLocalActivities();
    local.push(newActivity);
    this.saveLocalActivities(local);

    // Save to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('scheduled_activities')
          .insert({
            id: newActivity.id,
            activity_type: newActivity.activityType,
            title: newActivity.title,
            description: newActivity.description,
            scheduled_start_time: newActivity.scheduledStartTime,
            scheduled_end_time: newActivity.scheduledEndTime,
            cell_id: newActivity.cellId,
            cell_name: newActivity.cellName,
            location: newActivity.location,
            created_by: newActivity.createdBy,
            creator_name: newActivity.creatorName,
            invited_member_ids: newActivity.invitedMemberIds,
            scope: newActivity.scope,
            status: newActivity.status,
          })
          .select()
          .single();

        if (error) {
          console.warn('Supabase activity insertion error (saved in offline mode):', error.message);
        } else if (data) {
          newActivity.id = data.id;
        }
      } catch (err) {
        console.warn('Error saving scheduled activity to Supabase:', err);
      }
    }

    // Immediately schedule local reminders on current device
    await this.triggerLocalReminderSync(currentUser.id, local);

    // Dispatch in-app notifications to invited members
    try {
      const typeLabel =
        newActivity.activityType === 'evangelism'
          ? 'Evangelism Outreach'
          : newActivity.activityType === 'cell_meeting'
          ? 'Cell Meeting'
          : 'Group Meeting';

      const d = new Date(newActivity.scheduledStartTime);
      const timeStr = d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Africa/Accra',
      });
      const dateStr = d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Africa/Accra',
      });

      const notifTitle = `📅 Scheduled ${typeLabel}: ${newActivity.title}`;
      const notifMessage = `${creatorName} scheduled "${newActivity.title}" for ${dateStr} at ${timeStr} (Ghana Time). ${
        newActivity.location ? `Location: ${newActivity.location}.` : ''
      }`.trim();

      // Notify invited members or cell members
      const recipientIds = newActivity.invitedMemberIds.filter(id => id !== currentUser.id);
      for (const recId of recipientIds) {
        void NotificationService.createNotification({
          userId: recId,
          title: notifTitle,
          message: notifMessage,
          type: 'activity_scheduled',
          metadata: {
            activityId: newActivity.id,
            activityType: newActivity.activityType,
            scheduledStartTime: newActivity.scheduledStartTime,
            cellId: newActivity.cellId,
            cellName: newActivity.cellName,
            location: newActivity.location,
          },
        });
      }
    } catch (e) {
      console.warn('Error dispatching notifications for scheduled activity:', e);
    }

    this.notifyListeners();
    return newActivity;
  }

  /**
   * Updates an existing scheduled activity (e.g. reschedule date/time, change location).
   */
  static async updateScheduledActivity(
    id: string,
    updates: Partial<ScheduledActivity>,
    currentUser: { id: string }
  ): Promise<ScheduledActivity | null> {
    const local = this.getLocalActivities();
    const idx = local.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const existing = local[idx];
    const updated: ScheduledActivity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    local[idx] = updated;
    this.saveLocalActivities(local);

    // Cancel old alarms and schedule new ones
    await ActivityReminderService.cancelRemindersForActivity(id);
    await this.triggerLocalReminderSync(currentUser.id, local);

    // Update in Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('scheduled_activities')
          .update({
            title: updated.title,
            description: updated.description,
            scheduled_start_time: updated.scheduledStartTime,
            scheduled_end_time: updated.scheduledEndTime,
            location: updated.location,
            status: updated.status,
            invited_member_ids: updated.invitedMemberIds,
            updated_at: updated.updatedAt,
          })
          .eq('id', id);
      } catch (e) {
        console.warn('Error updating scheduled activity in Supabase:', e);
      }
    }

    this.notifyListeners();
    return updated;
  }

  /**
   * Cancels a scheduled activity and clears its pending alarms.
   */
  static async cancelScheduledActivity(id: string, currentUser: { id: string }): Promise<void> {
    await this.updateScheduledActivity(id, { status: 'cancelled' }, currentUser);
    await ActivityReminderService.cancelRemindersForActivity(id);
    this.notifyListeners();
  }

  /**
   * Deletes a scheduled activity.
   */
  static async deleteScheduledActivity(id: string, currentUser: { id: string }): Promise<void> {
    await ActivityReminderService.cancelRemindersForActivity(id);

    const local = this.getLocalActivities().filter(a => a.id !== id);
    this.saveLocalActivities(local);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('scheduled_activities').delete().eq('id', id);
      } catch (e) {
        console.warn('Error deleting scheduled activity from Supabase:', e);
      }
    }

    this.notifyListeners();
  }

  /**
   * Realtime subscription: updates local state and reminders whenever
   * any member creates or modifies a scheduled activity.
   */
  static subscribeToChanges(onUpdate: () => void): () => void {
    LISTENERS.add(onUpdate);

    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        channel = supabase
          .channel('fni-scheduled-activities-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'scheduled_activities' },
            () => {
              this.notifyListeners();
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Notice establishing Supabase realtime activities channel:', e);
      }
    }

    return () => {
      LISTENERS.delete(onUpdate);
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }

  private static notifyListeners(): void {
    LISTENERS.forEach(cb => {
      try {
        cb();
      } catch {}
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fni-scheduled-activities-updated'));
    }
  }
}
