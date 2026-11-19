-- Migration: Add user settings and account deactivation request tables
-- Description: Supports persistent multi-device preferences and administrator-reviewed account deactivation

-- 1. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    chat_wallpapers JSONB NOT NULL DEFAULT '{}'::jsonb,
    general_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    theme_preference TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

DROP POLICY IF EXISTS "Users can read own settings" ON public.user_settings;
CREATE POLICY "Users can read own settings"
    ON public.user_settings FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin', 'national_admin')));

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
    ON public.user_settings FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
    ON public.user_settings FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. ACCOUNT DEACTIVATION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.account_deactivation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    cell_name TEXT,
    role TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Unique partial index to prevent duplicate pending requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_deactivation_per_user 
    ON public.account_deactivation_requests (user_id) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_deactivation_requests_status 
    ON public.account_deactivation_requests (status, created_at DESC);

ALTER TABLE public.account_deactivation_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.account_deactivation_requests TO authenticated;

DROP POLICY IF EXISTS "Users view own deactivation requests" ON public.account_deactivation_requests;
CREATE POLICY "Users view own deactivation requests"
    ON public.account_deactivation_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin', 'national_admin')));

DROP POLICY IF EXISTS "Users insert own deactivation request" ON public.account_deactivation_requests;
CREATE POLICY "Users insert own deactivation request"
    ON public.account_deactivation_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and users update deactivation requests" ON public.account_deactivation_requests;
CREATE POLICY "Admins and users update deactivation requests"
    ON public.account_deactivation_requests FOR UPDATE
    TO authenticated
    USING (
        (auth.uid() = user_id AND status = 'pending') OR 
        auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin', 'national_admin'))
    );
