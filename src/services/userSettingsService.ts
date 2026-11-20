/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * User Settings & Account Management Service
 * 
 * Provides unified, multi-device persistence for:
 * - Notification preferences (deadlines, quizzes, meetings, announcements, messages, calls)
 * - Chat wallpapers & appearances
 * - System theme & general preferences
 * - Account deactivation requests & administrator review
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  UserSettings,
  UserNotificationPreferences,
  UserGeneralPreferences,
  AccountDeactivationRequest,
  DeactivationRequestStatus,
} from '../types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './notificationService';

const USER_SETTINGS_CACHE_PREFIX = 'fni_user_settings_cache:';
const DEACT_CACHE_PREFIX = 'fni_deactivation_cache:';

export class UserSettingsService {
  /**
   * Load user settings from Supabase, synchronizing to localStorage for instant offline access.
   */
  static async getUserSettings(userId: string): Promise<UserSettings | null> {
    if (!userId) return null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          const settings: UserSettings = {
            userId: data.user_id,
            notificationPreferences: data.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES,
            chatWallpapers: data.chat_wallpapers || {},
            generalPreferences: data.general_preferences || undefined,
            themePreference: (data.theme_preference as any) || 'system',
            updatedAt: data.updated_at,
          };

          // Synchronize locally
          try {
            localStorage.setItem(`${USER_SETTINGS_CACHE_PREFIX}${userId}`, JSON.stringify(settings));
            if (settings.notificationPreferences) {
              localStorage.setItem(`fni_user_notification_prefs_${userId}`, JSON.stringify(settings.notificationPreferences));
            }
            if (settings.chatWallpapers) {
              localStorage.setItem(`fni-chat-wallpapers:${userId}`, JSON.stringify(settings.chatWallpapers));
            }
            if (settings.themePreference) {
              localStorage.setItem('fni-theme-preference', settings.themePreference);
            }
          } catch {}

          return settings;
        }
      } catch (err) {
        console.warn('Notice loading Supabase user settings:', err);
      }
    }

    // Fallback to local storage
    try {
      const cached = localStorage.getItem(`${USER_SETTINGS_CACHE_PREFIX}${userId}`);
      if (cached) return JSON.parse(cached);
    } catch {}

    return null;
  }

  /**
   * Persist user settings to Supabase and cache locally.
   */
  static async saveUserSettings(
    userId: string,
    updates: Partial<Omit<UserSettings, 'userId'>>
  ): Promise<boolean> {
    if (!userId) return false;

    // 1. Optimistically update local storage
    try {
      const existing = (await this.getUserSettings(userId)) || { userId };
      const merged: UserSettings = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`${USER_SETTINGS_CACHE_PREFIX}${userId}`, JSON.stringify(merged));

      if (updates.notificationPreferences) {
        localStorage.setItem(`fni_user_notification_prefs_${userId}`, JSON.stringify(updates.notificationPreferences));
      }
      if (updates.chatWallpapers) {
        localStorage.setItem(`fni-chat-wallpapers:${userId}`, JSON.stringify(updates.chatWallpapers));
      }
      if (updates.themePreference) {
        localStorage.setItem('fni-theme-preference', updates.themePreference);
      }
    } catch {}

    // 2. Persist to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {
          user_id: userId,
          updated_at: new Date().toISOString(),
        };

        if (updates.notificationPreferences !== undefined) {
          payload.notification_preferences = updates.notificationPreferences;
        }
        if (updates.chatWallpapers !== undefined) {
          payload.chat_wallpapers = updates.chatWallpapers;
        }
        if (updates.generalPreferences !== undefined) {
          payload.general_preferences = updates.generalPreferences;
        }
        if (updates.themePreference !== undefined) {
          payload.theme_preference = updates.themePreference;
        }

        const { error } = await supabase
          .from('user_settings')
          .upsert(payload, { onConflict: 'user_id' });

        if (error) {
          console.warn('Notice saving Supabase user settings:', error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.warn('Exception saving Supabase user settings:', err);
        return false;
      }
    }

    return true;
  }

  /**
   * Subscribe to the signed-in user's settings so changes made on another
   * device are applied immediately. RLS remains the authority for row access.
   */
  static subscribeToUserSettings(
    userId: string,
    onChange?: (settings: UserSettings | null) => void
  ): () => void {
    if (!userId || !isSupabaseConfigured || !supabase) return () => {};

    let active = true;
    const channel = supabase
      .channel(`fni-user-settings-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!active) return;
          const row = payload.eventType === 'DELETE' ? null : (payload.new as any);
          if (!row) {
            try {
              localStorage.removeItem(`${USER_SETTINGS_CACHE_PREFIX}${userId}`);
              localStorage.removeItem(`fni_user_notification_prefs_${userId}`);
              localStorage.removeItem(`fni-chat-wallpapers:${userId}`);
            } catch {}
            onChange?.(null);
            return;
          }

          const settings: UserSettings = {
            userId: row.user_id,
            notificationPreferences: row.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES,
            chatWallpapers: row.chat_wallpapers || {},
            generalPreferences: row.general_preferences || undefined,
            themePreference: (row.theme_preference as any) || 'system',
            updatedAt: row.updated_at,
          };

          try {
            localStorage.setItem(`${USER_SETTINGS_CACHE_PREFIX}${userId}`, JSON.stringify(settings));
            localStorage.setItem(`fni_user_notification_prefs_${userId}`, JSON.stringify(settings.notificationPreferences));
            localStorage.setItem(`fni-chat-wallpapers:${userId}`, JSON.stringify(settings.chatWallpapers));
            if (settings.themePreference) localStorage.setItem('fni-theme-preference', settings.themePreference);
          } catch {}
          onChange?.(settings);
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }

  /**
   * Fetch the most recent account deactivation request for a user.
   */
  static async getDeactivationRequest(userId: string): Promise<AccountDeactivationRequest | null> {
    if (!userId) return null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('account_deactivation_requests')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          const req: AccountDeactivationRequest = {
            id: data.id,
            userId: data.user_id,
            userName: data.user_name,
            cellName: data.cell_name || undefined,
            role: data.role,
            reason: data.reason || undefined,
            status: data.status as DeactivationRequestStatus,
            adminNotes: data.admin_notes || undefined,
            reviewedBy: data.reviewed_by || undefined,
            reviewedAt: data.reviewed_at || undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          try {
            localStorage.setItem(`${DEACT_CACHE_PREFIX}${userId}`, JSON.stringify(req));
          } catch {}
          return req;
        }
      } catch (err) {
        console.warn('Notice loading deactivation request from Supabase:', err);
      }
    }

    // Fallback to local storage
    try {
      const cached = localStorage.getItem(`${DEACT_CACHE_PREFIX}${userId}`);
      if (cached) return JSON.parse(cached);
    } catch {}

    return null;
  }

  /**
   * Submit a new account deactivation request for administrator review.
   */
  static async submitDeactivationRequest(
    userId: string,
    payload: {
      userName: string;
      cellName?: string;
      role: string;
      reason?: string;
    }
  ): Promise<{ success: boolean; request?: AccountDeactivationRequest; error?: string }> {
    if (!userId) return { success: false, error: 'User is unauthenticated.' };

    // Prevent duplicate pending requests
    const existing = await this.getDeactivationRequest(userId);
    if (existing && existing.status === 'pending') {
      return {
        success: false,
        error: 'You already have a pending deactivation request under administrator review.',
      };
    }

    const newRequest: AccountDeactivationRequest = {
      id: `deact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userName: payload.userName,
      cellName: payload.cellName || 'Unassigned Cell',
      role: payload.role,
      reason: payload.reason?.trim() || 'No reason provided',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Cache locally immediately
    try {
      localStorage.setItem(`${DEACT_CACHE_PREFIX}${userId}`, JSON.stringify(newRequest));
    } catch {}

    // Persist to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('account_deactivation_requests')
          .insert({
            user_id: userId,
            user_name: payload.userName,
            cell_name: payload.cellName || null,
            role: payload.role,
            reason: payload.reason?.trim() || null,
            status: 'pending',
          })
          .select('*')
          .single();

        if (error) {
          // If conflict due to partial unique index
          if (error.code === '23505') {
            return {
              success: false,
              error: 'You already have a pending deactivation request under administrator review.',
            };
          }
          console.warn('Notice writing to account_deactivation_requests table:', error.message);
        } else if (data) {
          newRequest.id = data.id;
          newRequest.createdAt = data.created_at;
          newRequest.updatedAt = data.updated_at;
          try {
            localStorage.setItem(`${DEACT_CACHE_PREFIX}${userId}`, JSON.stringify(newRequest));
          } catch {}
        }
      } catch (err: any) {
        console.warn('Exception submitting deactivation request to Supabase:', err);
      }
    }

    // Dispatch notification to Administrators
    try {
      const { NotificationService } = await import('./notificationService');
      await NotificationService.createNotification({
        userId: 'admin',
        title: 'Account Deactivation Requested',
        message: `${payload.userName} (${payload.cellName || 'Cell Leader'}) submitted an account deactivation request for review.`,
        type: 'system_alert',
        metadata: {
          category: 'deactivation_request',
          requestId: newRequest.id,
          requestUserId: userId,
        },
      });
    } catch {}

    return { success: true, request: newRequest };
  }

  /**
   * Cancel a pending deactivation request.
   */
  static async cancelDeactivationRequest(
    userId: string,
    requestId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!userId) return { success: false, error: 'User is unauthenticated.' };

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('account_deactivation_requests')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('status', 'pending');

        if (requestId) {
          query = query.eq('id', requestId);
        }

        await query;
      } catch (err) {
        console.warn('Notice cancelling deactivation request in Supabase:', err);
      }
    }

    // Update local cache
    try {
      const cached = localStorage.getItem(`${DEACT_CACHE_PREFIX}${userId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.status = 'cancelled';
        parsed.updatedAt = new Date().toISOString();
        localStorage.setItem(`${DEACT_CACHE_PREFIX}${userId}`, JSON.stringify(parsed));
      }
    } catch {}

    return { success: true };
  }

  /**
   * Administrator: Retrieve all pending deactivation requests for review.
   */
  static async getPendingDeactivationRequests(): Promise<AccountDeactivationRequest[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('account_deactivation_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            userName: d.user_name,
            cellName: d.cell_name || undefined,
            role: d.role,
            reason: d.reason || undefined,
            status: d.status as DeactivationRequestStatus,
            adminNotes: d.admin_notes || undefined,
            reviewedBy: d.reviewed_by || undefined,
            reviewedAt: d.reviewed_at || undefined,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      } catch (err) {
        console.warn('Notice fetching pending deactivation requests:', err);
      }
    }

    return [];
  }

  /**
   * Administrator: Approve or decline an account deactivation request.
   */
  static async reviewDeactivationRequest(
    requestId: string,
    adminId: string,
    decision: 'approved' | 'declined',
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!requestId || !adminId) return { success: false, error: 'Missing review parameters.' };

    if (isSupabaseConfigured && supabase) {
      try {
        const nowIso = new Date().toISOString();
        const { data: requestRecord, error: fetchErr } = await supabase
          .from('account_deactivation_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (fetchErr || !requestRecord) {
          return { success: false, error: 'Deactivation request not found.' };
        }

        const { error: updateErr } = await supabase
          .from('account_deactivation_requests')
          .update({
            status: decision,
            admin_notes: adminNotes?.trim() || null,
            reviewed_by: adminId,
            reviewed_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', requestId);

        if (updateErr) {
          return { success: false, error: updateErr.message };
        }

        // If approved, update profile to inactive (without deleting user records or historical data)
        if (decision === 'approved' && requestRecord.user_id) {
          await supabase
            .from('profiles')
            .update({
              is_active: false,
              updated_at: nowIso,
            })
            .eq('id', requestRecord.user_id);
        }

        // Send notification to user
        const { NotificationService } = await import('./notificationService');
        await NotificationService.createNotification({
          userId: requestRecord.user_id,
          title: decision === 'approved' ? 'Account Deactivation Approved' : 'Account Deactivation Declined',
          message: decision === 'approved'
            ? 'Your account deactivation request has been approved by FNI Administration. Historical reports and cell records remain safely archived.'
            : `Your account deactivation request was declined by FNI Administration.${adminNotes ? ` Note: ${adminNotes}` : ''}`,
          type: 'system_alert',
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Review failed.' };
      }
    }

    return { success: true };
  }
}
