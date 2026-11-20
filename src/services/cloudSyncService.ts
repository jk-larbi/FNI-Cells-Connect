import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CloudDataChange {
  table: string;
  eventType: string;
  source: 'realtime' | 'reconnect';
}

/**
 * One authenticated, RLS-protected Realtime channel for durable FNI records.
 * Consumers refetch through their existing services; event payloads are never
 * treated as a replacement for authoritative Supabase reads.
 */
export class CloudSyncService {
  private static readonly TABLES = [
    'cells',
    'cell_members',
    'cell_meeting_reports',
    'evangelism_reports',
    'evangelism_contacts',
    'follow_ups',
    'offerings',
    'notifications',
    'notification_dismissals',
    'private_messages',
    'private_message_reactions',
    'private_message_pins',
    'community_messages',
    'community_message_reactions',
    'community_groups',
    'community_group_members',
    'community_members',
    'group_chats',
    'group_chat_members',
    'gallery_albums',
    'gallery_items',
    'teaching_materials',
    'reporting_periods',
    'regions',
    'review_logs',
    'cell_leadership_history',
    'system_settings',
    'user_settings',
    'chat_folders',
    'chat_folder_conversations',
    'user_pinned_chats',
    'user_group_preferences',
    'user_custom_stickers',
    'account_deactivation_requests',
    'learning_assignments',
    'learning_assignment_submissions',
    'learning_events',
    'learning_resources',
  ] as const;

  static subscribe(userId: string, callback: (change: CloudDataChange) => void): () => void {
    if (!userId || !isSupabaseConfigured || !supabase) return () => {};

    let active = true;
    const channel = supabase.channel(`fni-cloud-data-${userId}`);

    for (const table of this.TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          if (!active) return;
          callback({
            table,
            eventType: payload.eventType,
            source: 'realtime',
          });
        }
      );
    }

    channel.subscribe();

    const refreshOnReconnect = () => {
      if (active) callback({ table: '*', eventType: 'REFRESH', source: 'reconnect' });
    };
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') refreshOnReconnect();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', refreshOnReconnect);
      document.addEventListener('visibilitychange', refreshOnVisible);
    }

    return () => {
      active = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', refreshOnReconnect);
        document.removeEventListener('visibilitychange', refreshOnVisible);
      }
      void supabase.removeChannel(channel);
    };
  }
}
