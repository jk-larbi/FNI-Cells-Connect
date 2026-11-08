import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  supabaseAnonKey !== 'your-anon-key-here'
);

// Active in-memory access token minted by the verified Firebase-to-Supabase token bridge
let activeSupabaseAccessToken: string | null = null;

/**
 * Sets or clears the active Supabase access token in memory.
 * Also configures the Supabase Realtime client authentication.
 */
export function setSupabaseAccessToken(token: string | null): void {
  activeSupabaseAccessToken = token;
  if (supabase?.realtime) {
    try {
      supabase.realtime.setAuth(token || supabaseAnonKey);
    } catch (e) {
      console.warn('Realtime setAuth notice:', e);
    }
  }
}

/**
 * Retrieves the currently active Supabase access token.
 */
export function getSupabaseAccessToken(): string | null {
  return activeSupabaseAccessToken;
}

/**
 * Supabase client configured for external Firebase Auth token bridge:
 * - autoRefreshToken: false (avoids GoTrue 400 Bad Request on external JWTs)
 * - persistSession: false (session lifecycle is mastered by Firebase Auth)
 * - global.fetch: dynamically injects Authorization: Bearer <token> on every request
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (url, options = {}) => {
          const headers = new Headers(options.headers || {});
          if (activeSupabaseAccessToken) {
            headers.set('Authorization', `Bearer ${activeSupabaseAccessToken}`);
          }
          return fetch(url, { ...options, headers });
        },
      },
    })
  : null;
