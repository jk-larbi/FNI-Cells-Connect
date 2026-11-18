-- FNI Cells Connect: Guarantee all administrators can configure and persist the Core Foundation
-- Migration: 20261118235500_admin_system_settings_permissions.sql

-- 1. Ensure system_settings table has all required columns with proper defaults
ALTER TABLE public.system_settings
    ADD COLUMN IF NOT EXISTS ministry_name TEXT DEFAULT 'Forerunners Network International (FNI)',
    ADD COLUMN IF NOT EXISTS vision TEXT DEFAULT 'To raise a global army of consecrated believers equipped with apostolic and prophetic depth, establishing the reign of Christ across all spheres of society.',
    ADD COLUMN IF NOT EXISTS mission TEXT DEFAULT 'Mobilizing territorial cell fellowships, rigorous discipleship training, dynamic evangelism outreaches, and systematic pastoral care to transform lives and communities.',
    ADD COLUMN IF NOT EXISTS annual_soul_target INT DEFAULT 5000,
    ADD COLUMN IF NOT EXISTS annual_soul_winning_target INT DEFAULT 5000,
    ADD COLUMN IF NOT EXISTS weekly_deadline TEXT DEFAULT 'Sunday at 6:00 PM Ghana Time (Africa/Accra, UTC+0)',
    ADD COLUMN IF NOT EXISTS submission_deadline_day TEXT DEFAULT 'Sunday',
    ADD COLUMN IF NOT EXISTS submission_deadline_time TEXT DEFAULT '18:00',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'Administrator';

-- 2. Update Row Level Security on public.system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Read policy: accessible by all authenticated users and anon (for public overview)
DROP POLICY IF EXISTS "settings_select" ON public.system_settings;
DROP POLICY IF EXISTS "allow_public_read_of_ministry_overview_settings" ON public.system_settings;
CREATE POLICY "settings_select" ON public.system_settings FOR SELECT USING (true);

-- Admin write policies: allow all recognized admin roles and functions
DROP POLICY IF EXISTS settings_admin ON public.system_settings;
DROP POLICY IF EXISTS settings_admin_insert ON public.system_settings;
DROP POLICY IF EXISTS settings_admin_update ON public.system_settings;
DROP POLICY IF EXISTS settings_admin_delete ON public.system_settings;

CREATE POLICY settings_admin_insert ON public.system_settings 
FOR INSERT TO authenticated 
WITH CHECK (
  (select private.is_admin()) 
  OR (select private.is_fni_admin())
  OR (select public.is_admin())
);

CREATE POLICY settings_admin_update ON public.system_settings 
FOR UPDATE TO authenticated 
USING (
  (select private.is_admin()) 
  OR (select private.is_fni_admin())
  OR (select public.is_admin())
)
WITH CHECK (
  (select private.is_admin()) 
  OR (select private.is_fni_admin())
  OR (select public.is_admin())
);

CREATE POLICY settings_admin_delete ON public.system_settings 
FOR DELETE TO authenticated 
USING (
  (select private.is_admin()) 
  OR (select private.is_fni_admin())
  OR (select public.is_admin())
);

-- 3. Dedicated SECURITY DEFINER RPC function for atomic Core Foundation persistence
CREATE OR REPLACE FUNCTION public.save_fni_core_foundation(
  p_vision text,
  p_mission text,
  p_target int,
  p_deadline text,
  p_updated_by text DEFAULT 'Administrator'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  -- Verify caller is an administrator
  IF NOT (
    private.is_admin() 
    OR private.is_fni_admin() 
    OR public.is_admin()
  ) THEN
    RAISE EXCEPTION 'Administrator privileges are required to configure the FNI Core Foundation.';
  END IF;

  -- Upsert system settings
  INSERT INTO public.system_settings (
    id,
    vision,
    mission,
    annual_soul_target,
    annual_soul_winning_target,
    weekly_deadline,
    updated_at,
    updated_by
  ) VALUES (
    'global',
    p_vision,
    p_mission,
    p_target,
    p_target,
    p_deadline,
    timezone('utc'::text, now()),
    COALESCE(NULLIF(TRIM(p_updated_by), ''), 'Administrator')
  )
  ON CONFLICT (id) DO UPDATE SET
    vision = EXCLUDED.vision,
    mission = EXCLUDED.mission,
    annual_soul_target = EXCLUDED.annual_soul_target,
    annual_soul_winning_target = EXCLUDED.annual_soul_winning_target,
    weekly_deadline = EXCLUDED.weekly_deadline,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by;

  -- Synchronize soul_target_configs for the current ministry year
  INSERT INTO public.soul_target_configs (
    id,
    year,
    annual_target,
    updated_at,
    updated_by
  ) VALUES (
    'target-' || EXTRACT(YEAR FROM now())::text,
    EXTRACT(YEAR FROM now())::int,
    p_target,
    timezone('utc'::text, now()),
    COALESCE(NULLIF(TRIM(p_updated_by), ''), 'Administrator')
  )
  ON CONFLICT (id) DO UPDATE SET
    annual_target = EXCLUDED.annual_target,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.save_fni_core_foundation(text, text, int, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.save_fni_core_foundation(text, text, int, text, text) TO authenticated;
