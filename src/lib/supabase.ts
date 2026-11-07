import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

const STORAGE_KEY_CONFIG = 'fni_supabase_config_v1';

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        url: parsed.url || envUrl,
        anonKey: parsed.anonKey || envKey,
        connected: Boolean(parsed.connected),
        lastChecked: parsed.lastChecked
      };
    }
  } catch (e) {
    console.warn('Failed reading stored supabase config', e);
  }

  return {
    url: envUrl,
    anonKey: envKey,
    connected: Boolean(envUrl && envKey),
    lastChecked: undefined
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed saving supabase config', e);
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'URL and Anon Key are required.' };
  }
  try {
    const testClient = createClient(url, anonKey);
    // Attempt a lightweight query
    const { error } = await testClient.from('cells').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet, it's still connected to Supabase
      if (error.message.includes('relation "cells" does not exist') || error.code === '42P01') {
        return { success: true, message: 'Connected to Supabase! (Note: run the schema migration script below to create tables).' };
      }
      return { success: false, message: error.message || 'Connection test returned an error.' };
    }
    return { success: true, message: 'Successfully connected and verified against Supabase PostgreSQL.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error connecting to Supabase.' };
  }
}

/**
 * Production-ready PostgreSQL schema with Row Level Security (RLS) policies
 * for Forerunners Network International (FNI).
 */
export const SUPABASE_SQL_SCHEMA = `-- ====================================================================
-- FORERUNNERS NETWORK INTERNATIONAL (FNI)
-- DIGITAL REPORTING SYSTEM - PRODUCTION POSTGRESQL SCHEMA WITH RLS
-- ====================================================================

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('admin', 'leader');
CREATE TYPE report_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Returned');

-- 2. Profiles Table (Linked with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'leader',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Cells Table
CREATE TABLE IF NOT EXISTS public.cells (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  leader TEXT NOT NULL,
  area TEXT NOT NULL,
  leader_email TEXT,
  leader_phone TEXT,
  meeting_day TEXT DEFAULT 'Wednesday',
  meeting_time TEXT DEFAULT '18:30',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Weekly Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  cell_id TEXT NOT NULL REFERENCES public.cells(id) ON DELETE RESTRICT,
  week DATE NOT NULL, -- Always starting on Monday
  attendance INTEGER NOT NULL DEFAULT 0 CHECK (attendance >= 0),
  visitors INTEGER NOT NULL DEFAULT 0 CHECK (visitors >= 0 AND visitors <= attendance),
  souls_won INTEGER NOT NULL DEFAULT 0 CHECK (souls_won >= 0),
  follow_ups INTEGER NOT NULL DEFAULT 0 CHECK (follow_ups >= 0),
  evangelism_activities INTEGER NOT NULL DEFAULT 0 CHECK (evangelism_activities >= 0),
  cell_meetings INTEGER NOT NULL DEFAULT 1 CHECK (cell_meetings >= 0),
  prayer_requests TEXT,
  testimonies TEXT,
  challenges_remarks TEXT,
  status report_status NOT NULL DEFAULT 'Draft',
  reviewer_note TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(cell_id, week)
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  recipient_target TEXT NOT NULL, -- 'admin', cell_id, or 'all'
  title TEXT,
  message TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  notification_type TEXT DEFAULT 'system',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_reports_cell_week ON public.reports(cell_id, week DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_target, is_read);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. Row Level Security Policies

-- Cells RLS
CREATE POLICY "Cells are readable by all authenticated users"
  ON public.cells FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert or modify cells"
  ON public.cells FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Reports RLS
CREATE POLICY "Admins can view and manage all reports"
  ON public.reports FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Leaders can view their cell reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    cell_id IN (
      SELECT cells.id FROM public.cells 
      WHERE cells.leader_email = (SELECT email FROM public.profiles WHERE profiles.id = auth.uid())
    )
  );

CREATE POLICY "Leaders can insert or update reports for their cell"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    cell_id IN (
      SELECT cells.id FROM public.cells 
      WHERE cells.leader_email = (SELECT email FROM public.profiles WHERE profiles.id = auth.uid())
    )
  );

CREATE POLICY "Leaders can update draft/returned reports for their cell"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    cell_id IN (
      SELECT cells.id FROM public.cells 
      WHERE cells.leader_email = (SELECT email FROM public.profiles WHERE profiles.id = auth.uid())
    )
    AND status IN ('Draft', 'Returned')
  );

-- Notifications RLS
CREATE POLICY "Users can view notifications directed to them or all"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    recipient_target = 'all'
    OR (
      recipient_target = 'admin' 
      AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    )
    OR recipient_target IN (
      SELECT cells.id FROM public.cells 
      WHERE cells.leader_email = (SELECT email FROM public.profiles WHERE profiles.id = auth.uid())
    )
  );

-- 9. Trigger for Auto-Updating updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reports_modtime
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();
`;
