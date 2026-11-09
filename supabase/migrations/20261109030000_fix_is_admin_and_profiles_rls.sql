-- ==============================================================================
-- FORERUNNERS NETWORK INTERNATIONAL — FIX IS_ADMIN FUNCTION & RLS POLICIES
-- ==============================================================================
-- Migration: 20261109030000_fix_is_admin_and_profiles_rls.sql
-- Description:
-- 1. Restores EXECUTE privileges on public.is_admin() for authenticated users.
-- 2. Makes public.is_admin() and private.is_admin() SECURITY DEFINER functions
--    that recognize administrator roles and the designated administrator account.
-- 3. Corrects RLS policies on profiles, reports, offerings, notifications, and audit_logs.
-- 4. Ensures the administrator profile for 'fniadmin@gmail.com' is elevated to 'super_admin'.
-- 5. Adds co_leader_name column to public.cells.
-- ==============================================================================

-- 1. Re-define and grant public.is_admin() with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth, pg_temp AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.supabase_user_id = auth.uid() OR p.id = auth.uid()::text)
        AND p.role IN ('admin', 'super_admin', 'national_admin')
        AND p.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND LOWER(u.email) = 'fniadmin@gmail.com'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO PUBLIC, anon, authenticated;

-- 2. Ensure private.is_admin() delegates to public.is_admin()
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth, pg_temp AS $$
  SELECT public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION private.is_admin() TO PUBLIC, anon, authenticated;

-- 3. Fix RLS on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
USING (
  supabase_user_id = auth.uid()
  OR id = auth.uid()::text
  OR public.is_admin()
);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
USING (
  supabase_user_id = auth.uid()
  OR id = auth.uid()::text
  OR public.is_admin()
)
WITH CHECK (
  supabase_user_id = auth.uid()
  OR id = auth.uid()::text
  OR public.is_admin()
);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  supabase_user_id = auth.uid()
  OR id = auth.uid()::text
  OR public.is_admin()
);

-- 4. Add co_leader_name column to public.cells
ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS co_leader_name VARCHAR(150);

-- 5. Fix RLS on private_messages to support administrator messaging
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pmsg_parties" ON public.private_messages;
CREATE POLICY "pmsg_parties" ON public.private_messages FOR ALL TO authenticated
USING (
  sender_uid = auth.uid()::text
  OR recipient_uid = auth.uid()::text
  OR (recipient_uid = 'admin' AND public.is_admin())
  OR public.is_admin()
)
WITH CHECK (
  sender_uid = auth.uid()::text
  OR public.is_admin()
);

-- 6. Fix RLS on notifications, offerings, and audit logs
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
USING (
  recipient_target = auth.uid()::text
  OR recipient_target = 'all'
  OR (recipient_target = 'admin' AND public.is_admin())
  OR public.is_admin()
);

ALTER TABLE public.offerings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offerings_select" ON public.offerings;
CREATE POLICY "offerings_select" ON public.offerings FOR SELECT TO authenticated
USING (public.is_admin());

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_admin());

-- 7. Elevate fniadmin@gmail.com in public.profiles to super_admin
DO $$
DECLARE
  v_admin_email TEXT := 'fniadmin@gmail.com';
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_admin_email);

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id,
      supabase_user_id,
      email,
      full_name,
      role,
      is_active,
      is_onboarded,
      must_change_password
    ) VALUES (
      v_user_id::text,
      v_user_id,
      v_admin_email,
      'FNI Administrator',
      'super_admin',
      true,
      true,
      false
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'super_admin',
      is_active = true,
      is_onboarded = true,
      supabase_user_id = v_user_id,
      updated_at = timezone('utc'::text, now());

    RAISE NOTICE 'Elevated profile for % (ID: %) to super_admin.', v_admin_email, v_user_id;
  ELSE
    RAISE NOTICE 'No auth.user found with email %.', v_admin_email;
  END IF;
END $$;
