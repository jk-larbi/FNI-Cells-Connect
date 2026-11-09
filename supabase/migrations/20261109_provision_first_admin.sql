-- ==============================================================================
-- FORERUNNERS NETWORK INTERNATIONAL — FIRST ADMINISTRATOR PROVISIONING SCRIPT
-- ==============================================================================
-- Run this script inside the Supabase Dashboard SQL Editor (trusted server-side):
-- https://supabase.com/dashboard/project/cjskjazsrrbfyjepwyxa/sql/new
--
-- Instructions:
-- 1. Create a user account in Supabase Auth (via App Sign-Up or Supabase Auth Dashboard).
-- 2. Replace 'pastor@fnicells.org' with the user's genuine email address.
-- 3. Execute this script. It safely elevates their profile to 'super_admin'.
--
-- This strictly prevents client-side privilege elevation while providing an authorized
-- server-side path for church leadership.
-- ==============================================================================

DO $$
DECLARE
    v_admin_email TEXT := 'pastor@fnicells.org'; -- Replace with administrator's email
    v_user_id UUID;
BEGIN
    -- 1. Find the user ID in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_admin_email);

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No user found in auth.users with email %. Please ensure the administrator signs up first.', v_admin_email;
    ELSE
        -- 2. Elevate the profile to 'super_admin'
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
            'Church Leadership',
            'super_admin',
            true,
            true,
            false
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'super_admin',
            is_active = true,
            is_onboarded = true,
            updated_at = timezone('utc'::text, now());

        RAISE NOTICE 'Successfully granted super_admin role to user % (ID: %)', v_admin_email, v_user_id;
    END IF;
END $$;
