/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Supabase Client & Backend Configuration
 * 
 * Configured as the primary and only authoritative backend for FNI Cells Connect.
 * Uses native Supabase Auth with persistent session lifecycle, automatic token refresh,
 * and seamless PostgREST / Realtime communication.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cjskjazsrrbfyjepwyxa.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_0nQJMgCvgruw3CXX9YpBIg_Jq2rAx-Q';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  supabaseAnonKey !== 'your-anon-key-here'
);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'fni_supabase_auth_session_v1',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Helper to obtain the active user's access token for authenticated operations.
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/**
 * Backward compatibility helper for legacy auth callers
 */
export function setSupabaseAccessToken(token: string | null): void {
  if (token && supabase?.realtime) {
    try {
      supabase.realtime.setAuth(token);
    } catch (e) {
      console.warn('Realtime setAuth notice:', e);
    }
  }
}
