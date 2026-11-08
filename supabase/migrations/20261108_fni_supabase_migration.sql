-- ==============================================================================
-- FORERUNNERS NETWORK INTERNATIONAL (FNI) - DIGITAL REPORTING SYSTEM
-- MIGRATION: SUPABASE PRODUCTION BACKEND INTEGRATION
-- Target: Supabase / PostgreSQL 15+ (Project: cjskjazsrrbfyjepwyxa)
-- Safety: Non-destructive, additive, strictly preserves existing data and schemas
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMERATION TYPES (Safely created if not already present)
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
            'report_rejected',
            'direct_message',
            'community_message',
            'teaching_notes',
            'announcement',
            'deadline_reminder',
            'overdue_notice',
            'system_alert',
            'follow_up_assigned',
            'follow_up_reminder'
        );
    END IF;
END $$;

-- 3. PROFILES EXTENSIONS (Identity Bridge: Supabase Auth UUID + Firebase Legacy UID)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(30),
    role user_role NOT NULL DEFAULT 'cell_leader',
    region_id UUID,
    region_name VARCHAR(100),
    cell_id UUID,
    cell_name VARCHAR(150),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_onboarded BOOLEAN NOT NULL DEFAULT false,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    auth_provider VARCHAR(50) DEFAULT 'email',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30),
    ADD COLUMN IF NOT EXISTS region_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cell_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';

-- 4. REGIONS EXTENSIONS
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL DEFAULT 'Ghana',
    state_province VARCHAR(100),
    leader_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.regions
    ADD COLUMN IF NOT EXISTS firebase_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS leader_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS total_cells INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS active_cells INT DEFAULT 0;

-- 5. CELLS EXTENSIONS
CREATE TABLE IF NOT EXISTS public.cells (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    normalized_name VARCHAR(150),
    code VARCHAR(30) UNIQUE,
    region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
    leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    meeting_day VARCHAR(20) NOT NULL DEFAULT 'Wednesday',
    meeting_time TIME NOT NULL DEFAULT '18:30:00',
    venue_address TEXT NOT NULL DEFAULT 'Fellowship Venue',
    target_attendance INT NOT NULL DEFAULT 15,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.cells
    ADD COLUMN IF NOT EXISTS firebase_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS normalized_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS meeting_location TEXT,
    ADD COLUMN IF NOT EXISTS tutor_uid TEXT,
    ADD COLUMN IF NOT EXISTS leader_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS leader_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS region_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS total_members INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS active_members INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS new_members INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS requiring_follow_up INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Active';

-- 6. REPORTING PERIODS EXTENSIONS
CREATE TABLE IF NOT EXISTS public.reporting_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    year INT NOT NULL,
    week_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    submission_deadline TIMESTAMPTZ NOT NULL,
    is_open BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_year_week UNIQUE (year, week_number)
);

ALTER TABLE public.reporting_periods
    ADD COLUMN IF NOT EXISTS firebase_id TEXT UNIQUE;

-- 7. CELL MEETING REPORTS (Weekly Fellowship Returns)
CREATE TABLE IF NOT EXISTS public.cell_meeting_reports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    cell_id TEXT NOT NULL,
    tutor_uid TEXT NOT NULL,
    cell_name TEXT NOT NULL,
    tutor_name TEXT NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_location TEXT,
    members INT NOT NULL DEFAULT 0,
    active_members INT NOT NULL DEFAULT 0,
    attendance INT NOT NULL DEFAULT 0,
    new_members INT NOT NULL DEFAULT 0,
    absentees INT NOT NULL DEFAULT 0,
    follow_up_needed INT NOT NULL DEFAULT 0,
    offering NUMERIC(12, 2) DEFAULT 0.00,
    scriptural_theme TEXT,
    scriptures_used TEXT,
    tutor_notes TEXT,
    testimonies TEXT,
    tutor_experience TEXT,
    status TEXT NOT NULL DEFAULT 'Newly Submitted',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    late BOOLEAN NOT NULL DEFAULT false,
    reviewer_comment TEXT,
    reviewed_by TEXT,
    reviewed_by_name TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cmr_cell_id ON public.cell_meeting_reports(cell_id);
CREATE INDEX IF NOT EXISTS idx_cmr_tutor_uid ON public.cell_meeting_reports(tutor_uid);
CREATE INDEX IF NOT EXISTS idx_cmr_meeting_date ON public.cell_meeting_reports(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_cmr_status ON public.cell_meeting_reports(status);

-- 8. EVANGELISM REPORTS (Street & Campus Soul-Winning Outreaches)
CREATE TABLE IF NOT EXISTS public.evangelism_reports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    cell_id TEXT NOT NULL,
    tutor_uid TEXT NOT NULL,
    cell_name TEXT NOT NULL,
    tutor_name TEXT NOT NULL,
    date DATE NOT NULL,
    location TEXT NOT NULL,
    team_members TEXT[] DEFAULT '{}'::text[],
    pre_set_target INT DEFAULT 0,
    people_spoken_to INT DEFAULT 0,
    contacts_captured INT DEFAULT 0,
    conversions INT DEFAULT 0,
    verified_souls_won INT DEFAULT 0,
    interested_in_ministry INT DEFAULT 0,
    potential_follow_ups INT DEFAULT 0,
    scriptural_theme TEXT,
    scriptures_used TEXT,
    message_used TEXT,
    notes TEXT,
    testimonies TEXT,
    status TEXT NOT NULL DEFAULT 'Newly Submitted',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    late BOOLEAN NOT NULL DEFAULT false,
    reviewer_comment TEXT,
    reviewed_by TEXT,
    reviewed_by_name TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_evr_cell_id ON public.evangelism_reports(cell_id);
CREATE INDEX IF NOT EXISTS idx_evr_tutor_uid ON public.evangelism_reports(tutor_uid);
CREATE INDEX IF NOT EXISTS idx_evr_date ON public.evangelism_reports(date DESC);

-- 9. EVANGELISM CONTACTS & FOLLOW-UP FUNNEL
CREATE TABLE IF NOT EXISTS public.evangelism_contacts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    contact_name TEXT NOT NULL,
    phone TEXT,
    whatsapp_number TEXT,
    email TEXT,
    date_captured DATE NOT NULL DEFAULT CURRENT_DATE,
    evangelism_report_id TEXT,
    location TEXT,
    cell_id TEXT NOT NULL,
    cell_name TEXT NOT NULL,
    tutor_uid TEXT,
    tutor_name TEXT,
    assigned_to_name TEXT,
    follow_up_status TEXT NOT NULL DEFAULT 'Contacted',
    notes TEXT,
    last_follow_up_date DATE,
    next_follow_up_date DATE,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_contacts_cell ON public.evangelism_contacts(cell_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.evangelism_contacts(follow_up_status);

-- 10. OFFERING RECORDS (Financial Oversight)
CREATE TABLE IF NOT EXISTS public.offering_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    report_id TEXT NOT NULL,
    cell_id TEXT NOT NULL,
    cell_name TEXT NOT NULL,
    tutor_uid TEXT,
    tutor_name TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
    meeting_date DATE NOT NULL,
    week_label TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'Newly Submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_offering_cell ON public.offering_records(cell_id);
CREATE INDEX IF NOT EXISTS idx_offering_date ON public.offering_records(meeting_date DESC);

-- 11. PRIVATE MESSAGES (Confidential Shepherd Channel)
CREATE TABLE IF NOT EXISTS public.private_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sender_uid TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    recipient_uid TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    cell_id TEXT,
    cell_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    reply_to JSONB
);

CREATE INDEX IF NOT EXISTS idx_pmsg_parties ON public.private_messages(sender_uid, recipient_uid);
CREATE INDEX IF NOT EXISTS idx_pmsg_created ON public.private_messages(created_at DESC);

-- 12. COMMUNITY MESSAGES (Fellowship Board)
CREATE TABLE IF NOT EXISTS public.community_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sender_uid TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    cell_name TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reply_to JSONB,
    mentions TEXT[] DEFAULT '{}'::text[],
    reactions JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_cmsg_created ON public.community_messages(created_at DESC);

-- 13. INVITATION CODES (Secure Access Passcodes)
CREATE TABLE IF NOT EXISTS public.invitation_codes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    created_by TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL,
    expiry_minutes INT NOT NULL DEFAULT 60,
    max_uses INT,
    used_count INT NOT NULL DEFAULT 0,
    is_revoked BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invitation_codes(code);

-- 14. TEACHING MATERIALS (Curriculum Outlines & Bulletins)
CREATE TABLE IF NOT EXISTS public.teaching_materials (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    week_label TEXT NOT NULL,
    document_url TEXT,
    file_name TEXT,
    file_size TEXT,
    file_type TEXT,
    text_content TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    published_at TIMESTAMPTZ,
    uploaded_by TEXT NOT NULL,
    uploaded_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_teaching_week ON public.teaching_materials(week_label);

-- 15. SYSTEM SETTINGS & SOUL TARGETS
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    vision TEXT NOT NULL DEFAULT 'Raising Kingdom Leaders across campuses and nations.',
    mission TEXT NOT NULL DEFAULT 'Empowering students and community fellowships through passionate evangelism, discipleship, and prayer.',
    annual_soul_winning_target INT NOT NULL DEFAULT 5000,
    weekly_deadline TEXT NOT NULL DEFAULT 'Sunday at 6:00 PM Ghana Time (Africa/Accra)',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

CREATE TABLE IF NOT EXISTS public.soul_targets (
    id TEXT PRIMARY KEY DEFAULT 'target-2026',
    year INT NOT NULL DEFAULT 2026,
    annual_target INT NOT NULL DEFAULT 5000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by TEXT NOT NULL DEFAULT 'System Administrator',
    audit_history JSONB DEFAULT '[]'::jsonb
);

-- 16. DEVICE TOKENS (Push Notifications)
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    device_type TEXT,
    platform TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_active TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tokens_user ON public.device_tokens(user_id);

-- 17. AUTOMATED TIMESTAMP & NORMALIZATION TRIGGERS
CREATE OR REPLACE FUNCTION public.auto_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cmr_timestamp ON public.cell_meeting_reports;
CREATE TRIGGER trg_cmr_timestamp BEFORE UPDATE ON public.cell_meeting_reports
    FOR EACH ROW EXECUTE FUNCTION public.auto_update_timestamp();

DROP TRIGGER IF EXISTS trg_evr_timestamp ON public.evangelism_reports;
CREATE TRIGGER trg_evr_timestamp BEFORE UPDATE ON public.evangelism_reports
    FOR EACH ROW EXECUTE FUNCTION public.auto_update_timestamp();

DROP TRIGGER IF EXISTS trg_cnt_timestamp ON public.evangelism_contacts;
CREATE TRIGGER trg_cnt_timestamp BEFORE UPDATE ON public.evangelism_contacts
    FOR EACH ROW EXECUTE FUNCTION public.auto_update_timestamp();

-- 18. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_meeting_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evangelism_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evangelism_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offering_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soul_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'national_admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: Own profile or Admin
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin());

-- Cells & Regions: Viewable by all authenticated members; Manageable by Admins
DROP POLICY IF EXISTS "cells_select" ON public.cells;
CREATE POLICY "cells_select" ON public.cells FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "regions_select" ON public.regions;
CREATE POLICY "regions_select" ON public.regions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "periods_select" ON public.reporting_periods;
CREATE POLICY "periods_select" ON public.reporting_periods FOR SELECT TO authenticated USING (true);

-- Cell Meeting Reports: Leaders view/edit their own; Admins oversee all
DROP POLICY IF EXISTS "cmr_select" ON public.cell_meeting_reports;
CREATE POLICY "cmr_select" ON public.cell_meeting_reports FOR SELECT TO authenticated
    USING (public.is_admin() OR tutor_uid = auth.uid()::text);

DROP POLICY IF EXISTS "cmr_insert" ON public.cell_meeting_reports;
CREATE POLICY "cmr_insert" ON public.cell_meeting_reports FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR tutor_uid = auth.uid()::text);

DROP POLICY IF EXISTS "cmr_update" ON public.cell_meeting_reports;
CREATE POLICY "cmr_update" ON public.cell_meeting_reports FOR UPDATE TO authenticated
    USING (public.is_admin() OR (tutor_uid = auth.uid()::text AND status = 'Needs Correction'));

-- Evangelism Reports
DROP POLICY IF EXISTS "evr_select" ON public.evangelism_reports;
CREATE POLICY "evr_select" ON public.evangelism_reports FOR SELECT TO authenticated
    USING (public.is_admin() OR tutor_uid = auth.uid()::text);

DROP POLICY IF EXISTS "evr_insert" ON public.evangelism_reports;
CREATE POLICY "evr_insert" ON public.evangelism_reports FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR tutor_uid = auth.uid()::text);

-- Contacts Pipeline
DROP POLICY IF EXISTS "contacts_select" ON public.evangelism_contacts;
CREATE POLICY "contacts_select" ON public.evangelism_contacts FOR SELECT TO authenticated
    USING (public.is_admin() OR tutor_uid = auth.uid()::text);

DROP POLICY IF EXISTS "contacts_all" ON public.evangelism_contacts;
CREATE POLICY "contacts_all" ON public.evangelism_contacts FOR ALL TO authenticated
    USING (public.is_admin() OR tutor_uid = auth.uid()::text)
    WITH CHECK (public.is_admin() OR tutor_uid = auth.uid()::text);

-- Private Messages: Strictly sender and recipient only!
DROP POLICY IF EXISTS "pmsg_parties" ON public.private_messages;
CREATE POLICY "pmsg_parties" ON public.private_messages FOR ALL TO authenticated
    USING (sender_uid = auth.uid()::text OR recipient_uid = auth.uid()::text)
    WITH CHECK (sender_uid = auth.uid()::text);

-- Community Messages: Read all, post own
DROP POLICY IF EXISTS "cmsg_select" ON public.community_messages;
CREATE POLICY "cmsg_select" ON public.community_messages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cmsg_insert" ON public.community_messages;
CREATE POLICY "cmsg_insert" ON public.community_messages FOR INSERT TO authenticated
    WITH CHECK (sender_uid = auth.uid()::text);

-- Teaching Materials, Settings, Soul Targets: View all, Admins manage
DROP POLICY IF EXISTS "materials_select" ON public.teaching_materials;
CREATE POLICY "materials_select" ON public.teaching_materials FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "materials_admin" ON public.teaching_materials;
CREATE POLICY "materials_admin" ON public.teaching_materials FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "settings_select" ON public.system_settings;
CREATE POLICY "settings_select" ON public.system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "soul_targets_select" ON public.soul_targets;
CREATE POLICY "soul_targets_select" ON public.soul_targets FOR SELECT TO authenticated USING (true);

-- 19. ENABLE REALTIME PUBLICATION
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE 
            public.cell_meeting_reports,
            public.evangelism_reports,
            public.private_messages,
            public.community_messages,
            public.notifications,
            public.soul_targets;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Realtime publication configuration notice: %', SQLERRM;
END $$;
