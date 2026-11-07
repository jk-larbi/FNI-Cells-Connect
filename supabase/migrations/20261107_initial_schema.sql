-- ==============================================================================
-- FORERUNNERS NETWORK INTERNATIONAL (FNI) - DIGITAL REPORTING SYSTEM
-- Initial Database Migration Schema
-- Target: Supabase / PostgreSQL 15+
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom Enumerations
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'national_admin',
    'regional_leader',
    'cell_leader'
);

CREATE TYPE report_status AS ENUM (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'needs_revision'
);

CREATE TYPE notification_channel AS ENUM (
    'in_app',
    'email',
    'whatsapp'
);

CREATE TYPE notification_type AS ENUM (
    'report_submitted',
    'report_approved',
    'revision_requested',
    'deadline_reminder',
    'overdue_notice',
    'system_alert'
);

-- 3. Regions Table
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL DEFAULT 'Nigeria',
    state_province VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(30),
    role user_role NOT NULL DEFAULT 'cell_leader',
    region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add foreign key reference to regions leader after profiles is created
ALTER TABLE public.regions
    ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5. Cells Table
CREATE TABLE IF NOT EXISTS public.cells (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
    leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    meeting_day VARCHAR(20) NOT NULL DEFAULT 'Wednesday',
    meeting_time TIME NOT NULL DEFAULT '18:00:00',
    venue_address TEXT NOT NULL,
    target_attendance INT NOT NULL DEFAULT 15,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Reporting Periods Table
CREATE TABLE IF NOT EXISTS public.reporting_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g. "2026 - Week 44"
    year INT NOT NULL,
    week_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    submission_deadline TIMESTAMPTZ NOT NULL,
    is_open BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_year_week UNIQUE (year, week_number)
);

-- 7. Cell Reports Table
CREATE TABLE IF NOT EXISTS public.cell_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_id UUID NOT NULL REFERENCES public.cells(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE RESTRICT,
    submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status report_status NOT NULL DEFAULT 'draft',
    
    -- Attendance Metrics
    members_present INT NOT NULL DEFAULT 0 CHECK (members_present >= 0),
    visitors_count INT NOT NULL DEFAULT 0 CHECK (visitors_count >= 0),
    total_attendance INT GENERATED ALWAYS AS (members_present + visitors_count) STORED,

    -- Evangelism & Soul Winning
    souls_won INT NOT NULL DEFAULT 0 CHECK (souls_won >= 0),
    souls_won_details TEXT,
    evangelism_outreaches_held INT NOT NULL DEFAULT 0 CHECK (evangelism_outreaches_held >= 0),
    evangelism_locations TEXT,

    -- Follow-ups & Discipleship
    follow_ups_conducted INT NOT NULL DEFAULT 0 CHECK (follow_ups_conducted >= 0),
    first_timers_contacted INT NOT NULL DEFAULT 0 CHECK (first_timers_contacted >= 0),
    converts_established INT NOT NULL DEFAULT 0 CHECK (converts_established >= 0),

    -- Meeting Execution
    meeting_held BOOLEAN NOT NULL DEFAULT true,
    meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meeting_topic VARCHAR(255),
    offering_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (offering_amount >= 0),

    -- Spiritual & Pastoral Notes
    prayer_requests TEXT,
    testimonies TEXT,
    challenges_faced TEXT,
    additional_remarks TEXT,

    -- Audit & Tracking
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT unique_cell_period_report UNIQUE (cell_id, period_id)
);

-- 8. Report Reviews / Audit Feedback
CREATE TABLE IF NOT EXISTS public.report_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.cell_reports(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    previous_status report_status NOT NULL,
    new_status report_status NOT NULL,
    feedback TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'system_alert',
    channel notification_channel NOT NULL DEFAULT 'in_app',
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON public.profiles(region_id);
CREATE INDEX IF NOT EXISTS idx_cells_region ON public.cells(region_id);
CREATE INDEX IF NOT EXISTS idx_cells_leader ON public.cells(leader_id);
CREATE INDEX IF NOT EXISTS idx_cell_reports_cell ON public.cell_reports(cell_id);
CREATE INDEX IF NOT EXISTS idx_cell_reports_period ON public.cell_reports(period_id);
CREATE INDEX IF NOT EXISTS idx_cell_reports_status ON public.cell_reports(status);
CREATE INDEX IF NOT EXISTS idx_cell_reports_submitted_by ON public.cell_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_report_reviews_report ON public.report_reviews(report_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_region()
RETURNS UUID AS $$
    SELECT region_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- --- Profiles Policies ---
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('super_admin', 'national_admin'));

-- --- Regions Policies ---
CREATE POLICY "Regions viewable by all authenticated users"
    ON public.regions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Regions manageable by Super & National Admins"
    ON public.regions FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('super_admin', 'national_admin'));

-- --- Cells Policies ---
CREATE POLICY "Cells viewable by authenticated users"
    ON public.cells FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Cells manageable by Admins and Regional Leaders of that region"
    ON public.cells FOR ALL
    TO authenticated
    USING (
        public.current_user_role() IN ('super_admin', 'national_admin')
        OR (public.current_user_role() = 'regional_leader' AND region_id = public.current_user_region())
    );

-- --- Reporting Periods Policies ---
CREATE POLICY "Reporting periods viewable by all authenticated users"
    ON public.reporting_periods FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Reporting periods managed by Admins"
    ON public.reporting_periods FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('super_admin', 'national_admin'));

-- --- Cell Reports Policies ---
CREATE POLICY "Cell leaders can view their own reports"
    ON public.cell_reports FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() IN ('super_admin', 'national_admin')
        OR (
            public.current_user_role() = 'regional_leader'
            AND cell_id IN (SELECT id FROM public.cells WHERE region_id = public.current_user_region())
        )
        OR (
            public.current_user_role() = 'cell_leader'
            AND (submitted_by = auth.uid() OR cell_id IN (SELECT id FROM public.cells WHERE leader_id = auth.uid()))
        )
    );

CREATE POLICY "Cell leaders can insert reports for their assigned cells"
    ON public.cell_reports FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() IN ('super_admin', 'national_admin')
        OR (
            public.current_user_role() = 'cell_leader'
            AND cell_id IN (SELECT id FROM public.cells WHERE leader_id = auth.uid())
        )
    );

CREATE POLICY "Cell leaders can update drafts or requested revisions"
    ON public.cell_reports FOR UPDATE
    TO authenticated
    USING (
        public.current_user_role() IN ('super_admin', 'national_admin')
        OR (
            public.current_user_role() = 'regional_leader'
            AND cell_id IN (SELECT id FROM public.cells WHERE region_id = public.current_user_region())
        )
        OR (
            public.current_user_role() = 'cell_leader'
            AND cell_id IN (SELECT id FROM public.cells WHERE leader_id = auth.uid())
            AND status IN ('draft', 'needs_revision')
        )
    );

-- --- Report Reviews Policies ---
CREATE POLICY "Reviews viewable by involved users"
    ON public.report_reviews FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() IN ('super_admin', 'national_admin', 'regional_leader')
        OR report_id IN (SELECT id FROM public.cell_reports WHERE submitted_by = auth.uid())
    );

CREATE POLICY "Authorized reviewers can insert reviews"
    ON public.report_reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() IN ('super_admin', 'national_admin', 'regional_leader')
    );

-- --- Notifications Policies ---
CREATE POLICY "Users can view and manage their own notifications"
    ON public.notifications FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- --- Audit Logs Policies ---
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.current_user_role() IN ('super_admin', 'national_admin'));

CREATE POLICY "System can record audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ==============================================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_regions_updated_at
    BEFORE UPDATE ON public.regions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_cells_updated_at
    BEFORE UPDATE ON public.cells
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_cell_reports_updated_at
    BEFORE UPDATE ON public.cell_reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
