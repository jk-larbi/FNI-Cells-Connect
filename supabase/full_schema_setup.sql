-- ==============================================================================
-- FORERUNNERS NETWORK INTERNATIONAL (FNI) - DIGITAL REPORTING SYSTEM
-- COMPLETE PRODUCTION BACKEND SETUP SCRIPT
-- Target: Supabase / PostgreSQL 15+
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMERATION TYPES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'admin',
            'super_admin',
            'national_admin',
            'regional_leader',
            'cell_leader'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM (
            'draft',
            'submitted',
            'under_review',
            'approved',
            'needs_revision'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE notification_channel AS ENUM (
            'in_app',
            'email',
            'whatsapp'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
            'report_submitted',
            'report_approved',
            'revision_requested',
            'deadline_reminder',
            'overdue_notice',
            'system_alert'
        );
    END IF;
END $$;

-- 3. REGIONS TABLE
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL DEFAULT 'Nigeria',
    state_province VARCHAR(100),
    leader_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. CELLS TABLE (Created before profiles for foreign keys, with circular fk resolution)
CREATE TABLE IF NOT EXISTS public.cells (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    normalized_name VARCHAR(150),
    code VARCHAR(30) NOT NULL UNIQUE,
    region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
    leader_id UUID,
    meeting_day VARCHAR(20) NOT NULL DEFAULT 'Wednesday',
    meeting_time TIME NOT NULL DEFAULT '18:00:00',
    venue_address TEXT NOT NULL DEFAULT 'Fellowship Venue',
    target_attendance INT NOT NULL DEFAULT 15,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. PROFILES TABLE (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(30),
    role user_role NOT NULL DEFAULT 'cell_leader',
    region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
    region_name VARCHAR(100),
    cell_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
    cell_name VARCHAR(150),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_onboarded BOOLEAN NOT NULL DEFAULT false,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    auth_provider VARCHAR(50) DEFAULT 'email',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Foreign Key Connections
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_cells_leader'
    ) THEN
        ALTER TABLE public.cells 
            ADD CONSTRAINT fk_cells_leader 
            FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_regions_leader'
    ) THEN
        ALTER TABLE public.regions 
            ADD CONSTRAINT fk_regions_leader 
            FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. REPORTING PERIODS TABLE
CREATE TABLE IF NOT EXISTS public.reporting_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g. "2026 - Week 45"
    year INT NOT NULL,
    week_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    submission_deadline TIMESTAMPTZ NOT NULL,
    is_open BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_year_week UNIQUE (year, week_number)
);

-- 7. CELL REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.cell_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_id UUID NOT NULL REFERENCES public.cells(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE RESTRICT,
    submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status report_status NOT NULL DEFAULT 'draft',

    -- Attendance Metrics
    members_present INT NOT NULL DEFAULT 0 CHECK (members_present >= 0),
    visitors_count INT NOT NULL DEFAULT 0 CHECK (visitors_count >= 0),
    total_attendance INT NOT NULL DEFAULT 0 CHECK (total_attendance >= 0),

    -- Evangelism & Harvest
    souls_won INT NOT NULL DEFAULT 0 CHECK (souls_won >= 0),
    souls_won_details TEXT,
    evangelism_outreaches_held INT NOT NULL DEFAULT 0 CHECK (evangelism_outreaches_held >= 0),
    evangelism_locations TEXT,

    -- Discipleship & Follow-up
    follow_ups_conducted INT NOT NULL DEFAULT 0 CHECK (follow_ups_conducted >= 0),
    first_timers_contacted INT NOT NULL DEFAULT 0 CHECK (first_timers_contacted >= 0),
    converts_established INT NOT NULL DEFAULT 0 CHECK (converts_established >= 0),

    -- Meeting Execution
    meeting_held BOOLEAN NOT NULL DEFAULT true,
    meeting_date DATE NOT NULL,
    meeting_topic VARCHAR(255) NOT NULL,
    offering_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (offering_amount >= 0),

    -- Spiritual & Pastoral Notes
    prayer_requests TEXT,
    testimonies TEXT,
    challenges_faced TEXT,
    additional_remarks TEXT,

    -- Review & Governance
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT unique_cell_period_report UNIQUE (cell_id, period_id)
);

-- 8. REPORT REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.report_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.cell_reports(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    previous_status report_status NOT NULL,
    new_status report_status NOT NULL,
    feedback TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL or specific UUID for broadcast
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    channel notification_channel NOT NULL DEFAULT 'in_app',
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name VARCHAR(150),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_cells_region ON public.cells(region_id);
CREATE INDEX IF NOT EXISTS idx_cells_leader ON public.cells(leader_id);
CREATE INDEX IF NOT EXISTS idx_cells_normalized_name ON public.cells(normalized_name);
CREATE INDEX IF NOT EXISTS idx_reports_cell ON public.cell_reports(cell_id);
CREATE INDEX IF NOT EXISTS idx_reports_period ON public.cell_reports(period_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.cell_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_submitted_by ON public.cell_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- 12. NORMALIZATION & AUTOMATED TRIGGERS
CREATE OR REPLACE FUNCTION public.normalize_cell_name(raw_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(REGEXP_REPLACE(TRIM(raw_name), '[^a-zA-Z0-9]', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.trig_cells_normalize_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_name = public.normalize_cell_name(NEW.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_cell_name ON public.cells;
CREATE TRIGGER trg_normalize_cell_name
    BEFORE INSERT OR UPDATE OF name ON public.cells
    FOR EACH ROW EXECUTE FUNCTION public.trig_cells_normalize_name();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_cells_updated_at ON public.cells;
CREATE TRIGGER update_cells_updated_at
    BEFORE UPDATE ON public.cells
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_cell_reports_updated_at ON public.cell_reports;
CREATE TRIGGER update_cell_reports_updated_at
    BEFORE UPDATE ON public.cell_reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 13. OAUTH USER SIGNUP HOOK
CREATE OR REPLACE FUNCTION public.handle_new_oauth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_provider TEXT;
    v_full_name TEXT;
BEGIN
    v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1)
    );

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        is_onboarded,
        must_change_password,
        auth_provider
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        'cell_leader',
        true,
        false,
        false,
        v_provider
    )
    ON CONFLICT (id) DO UPDATE SET
        auth_provider = EXCLUDED.auth_provider,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_oauth_user();
    END IF;
END $$;

-- 14. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'national_admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: Users see own, Admins see all
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;
CREATE POLICY "Profiles view policy"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- Cells: All authenticated users can view; leaders can link during onboarding; admins manage
DROP POLICY IF EXISTS "Cells view policy" ON public.cells;
CREATE POLICY "Cells view policy"
    ON public.cells FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Cells insert policy" ON public.cells;
CREATE POLICY "Cells insert policy"
    ON public.cells FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Cells update policy" ON public.cells;
CREATE POLICY "Cells update policy"
    ON public.cells FOR UPDATE
    TO authenticated
    USING (leader_id = auth.uid() OR public.is_admin());

-- Regions & Periods: Viewable by all; manageable by admins
DROP POLICY IF EXISTS "Regions view policy" ON public.regions;
CREATE POLICY "Regions view policy" ON public.regions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Periods view policy" ON public.reporting_periods;
CREATE POLICY "Periods view policy" ON public.reporting_periods FOR SELECT TO authenticated USING (true);

-- Cell Reports: Leaders view and submit only for their own cell; admins manage all
DROP POLICY IF EXISTS "Reports view policy" ON public.cell_reports;
CREATE POLICY "Reports view policy"
    ON public.cell_reports FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR submitted_by = auth.uid()
        OR cell_id IN (SELECT cell_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Reports insert policy" ON public.cell_reports;
CREATE POLICY "Reports insert policy"
    ON public.cell_reports FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR submitted_by = auth.uid()
        OR cell_id IN (SELECT cell_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Reports update policy" ON public.cell_reports;
CREATE POLICY "Reports update policy"
    ON public.cell_reports FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR (submitted_by = auth.uid() AND status IN ('draft', 'needs_revision'))
    );

-- Notifications & Audit Logs
DROP POLICY IF EXISTS "Notifications policy" ON public.notifications;
CREATE POLICY "Notifications policy"
    ON public.notifications FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL)
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Audit logs view policy" ON public.audit_logs;
CREATE POLICY "Audit logs view policy"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Audit logs insert policy" ON public.audit_logs;
CREATE POLICY "Audit logs insert policy"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 15. SEED DATA (Regions and Reporting Periods - NO Mock Cells or Mock Leaders)
INSERT INTO public.regions (id, name, code, country, state_province) VALUES
('b1111111-1111-1111-1111-111111111111', 'Lagos Central Region', 'FNI-REG-LOS', 'Nigeria', 'Lagos'),
('b2222222-2222-2222-2222-222222222222', 'Abuja Capital Region', 'FNI-REG-ABJ', 'Nigeria', 'FCT Abuja'),
('b3333333-3333-3333-3333-333333333333', 'London Diaspora Region', 'FNI-REG-LON', 'United Kingdom', 'Greater London'),
('b4444444-4444-4444-4444-444444444444', 'Accra Hub Region', 'FNI-REG-ACC', 'Ghana', 'Greater Accra')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reporting_periods (id, name, year, week_number, start_date, end_date, submission_deadline, is_open) VALUES
('c1111111-1111-1111-1111-111111111111', '2026 - Week 43', 2026, 43, '2026-10-19', '2026-10-25', '2026-10-27 23:59:59+00', false),
('c2222222-2222-2222-2222-222222222222', '2026 - Week 44', 2026, 44, '2026-10-26', '2026-11-01', '2026-11-03 23:59:59+00', false),
('c3333333-3333-3333-3333-333333333333', '2026 - Week 45', 2026, 45, '2026-11-02', '2026-11-08', '2026-11-10 23:59:59+00', true)
ON CONFLICT (id) DO NOTHING;

-- 16. HELPER FUNCTION TO PROVISION INITIAL ADMIN USER IN SUPABASE AUTH
-- Run this in SQL Editor to create admin@forerunners.org with temporary password 'admin123'
CREATE OR REPLACE FUNCTION public.create_initial_admin()
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if user already exists in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@forerunners.org';
    
    IF v_user_id IS NULL THEN
        v_user_id := uuid_generate_v4();
        
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            'admin@forerunners.org',
            crypt('admin123', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"System Administrator"}',
            now(),
            now()
        );
    END IF;

    -- Ensure profile exists with must_change_password = true
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        is_onboarded,
        must_change_password,
        auth_provider
    )
    VALUES (
        v_user_id,
        'admin@forerunners.org',
        'System Administrator',
        'admin',
        true,
        true,
        true, -- Mandatory first-login password change!
        'credentials'
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        must_change_password = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute initial admin setup
SELECT public.create_initial_admin();
