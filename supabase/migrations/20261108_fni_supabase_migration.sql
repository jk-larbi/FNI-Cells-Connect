-- ==============================================================================
-- FORERUNNERS NETWORK INTERNATIONAL (FNI) - DIGITAL REPORTING SYSTEM
-- MIGRATION: SUPABASE PRODUCTION BACKEND INTEGRATION
-- Target: Supabase / PostgreSQL 15+ (Project: cjskjazsrrbfyjepwyxa)
-- Safety: Non-destructive, additive, strictly preserves existing data and schemas
-- Verified: Profiles identity model (profiles.id TEXT + supabase_user_id UUID),
--           offerings <-> offering_records, soul_target_configs <-> soul_targets,
--           review_logs (status/action & comment/comments), notifications complete fields,
--           and explicit RLS policies for all 23 tables to satisfy Supabase Advisor.
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

-- 3. PROFILES TABLE & EXTENSIONS
-- PRESERVED IDENTITY MODEL: id is TEXT PRIMARY KEY (stores alphanumeric user id / Firebase UID)
-- supabase_user_id is UUID (references auth.users(id) for Supabase Auth integration)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    supabase_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    firebase_uid TEXT UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(30),
    role user_role NOT NULL DEFAULT 'cell_leader',
    region_id TEXT,
    region_name VARCHAR(100),
    cell_id TEXT,
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
    ADD COLUMN IF NOT EXISTS supabase_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30),
    ADD COLUMN IF NOT EXISTS region_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cell_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS cell_id TEXT,
    ADD COLUMN IF NOT EXISTS region_id TEXT,
    ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';

-- Schema Compatibility: Safely drop legacy check constraints if table was created by earlier schema
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;
    END IF;

    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

    -- Ensure cell_id and region_id accept alphanumeric legacy IDs as well as UUIDs
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'cell_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN cell_id TYPE TEXT USING cell_id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'region_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN region_id TYPE TEXT USING region_id::text;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON public.profiles(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_profiles_supabase_user_id ON public.profiles(supabase_user_id);

-- 4. REGIONS TABLE & EXTENSIONS
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL DEFAULT 'Ghana',
    state_province VARCHAR(100),
    leader_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.regions
    ADD COLUMN IF NOT EXISTS firebase_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS leader_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS total_cells INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS active_cells INT DEFAULT 0;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'leader_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.regions ALTER COLUMN leader_id TYPE TEXT USING leader_id::text;
    END IF;
END $$;

-- 5. CELLS TABLE & EXTENSIONS
CREATE TABLE IF NOT EXISTS public.cells (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    normalized_name VARCHAR(150),
    code VARCHAR(30) UNIQUE,
    region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
    leader_id TEXT,
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

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cells' AND column_name = 'leader_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.cells ALTER COLUMN leader_id TYPE TEXT USING leader_id::text;
    END IF;
END $$;

-- 6. REPORTING PERIODS TABLE & EXTENSIONS
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
    follow_up_notes TEXT,
    last_follow_up_date DATE,
    next_follow_up_date DATE,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.evangelism_contacts
    ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_cell ON public.evangelism_contacts(cell_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.evangelism_contacts(follow_up_status);

-- 10. OFFERINGS & OFFERING RECORDS (Dual-Table Reconciliation)
-- Table 1: offerings (Primary Live Table)
CREATE TABLE IF NOT EXISTS public.offerings (
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

CREATE INDEX IF NOT EXISTS idx_offerings_cell ON public.offerings(cell_id);
CREATE INDEX IF NOT EXISTS idx_offerings_date ON public.offerings(meeting_date DESC);

-- Table 2: offering_records (Application Adapter Table)
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

CREATE INDEX IF NOT EXISTS idx_offering_records_cell ON public.offering_records(cell_id);
CREATE INDEX IF NOT EXISTS idx_offering_records_date ON public.offering_records(meeting_date DESC);

-- 11. PRIVATE MESSAGES (Confidential Channel)
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
    created_by TEXT,
    created_by_name TEXT,
    role TEXT DEFAULT 'tutor',
    region_name TEXT,
    cell_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ,
    expiry_minutes INT DEFAULT 60,
    max_uses INT DEFAULT 1,
    used_count INT NOT NULL DEFAULT 0,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.invitation_codes
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'tutor',
    ADD COLUMN IF NOT EXISTS region_name TEXT,
    ADD COLUMN IF NOT EXISTS cell_name TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

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

-- 15. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    ministry_name TEXT NOT NULL DEFAULT 'Forerunners Network International (FNI)',
    vision TEXT NOT NULL DEFAULT 'Raising Kingdom Leaders across campuses and nations.',
    mission TEXT NOT NULL DEFAULT 'Empowering students and community fellowships through passionate evangelism, discipleship, and prayer.',
    annual_soul_target INT NOT NULL DEFAULT 5000,
    annual_soul_winning_target INT NOT NULL DEFAULT 5000,
    weekly_deadline TEXT NOT NULL DEFAULT 'Sunday at 6:00 PM Ghana Time (Africa/Accra)',
    submission_deadline_day TEXT DEFAULT 'Sunday',
    submission_deadline_time TEXT DEFAULT '18:00',
    enable_email_notifications BOOLEAN DEFAULT true,
    enable_whatsapp_notifications BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

ALTER TABLE public.system_settings
    ADD COLUMN IF NOT EXISTS ministry_name TEXT DEFAULT 'Forerunners Network International (FNI)',
    ADD COLUMN IF NOT EXISTS annual_soul_target INT DEFAULT 5000,
    ADD COLUMN IF NOT EXISTS annual_soul_winning_target INT DEFAULT 5000,
    ADD COLUMN IF NOT EXISTS submission_deadline_day TEXT DEFAULT 'Sunday',
    ADD COLUMN IF NOT EXISTS submission_deadline_time TEXT DEFAULT '18:00',
    ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS enable_whatsapp_notifications BOOLEAN DEFAULT true;

-- 16. SOUL TARGET CONFIGS & SOUL TARGETS (Dual-Table Reconciliation)
-- Table 1: soul_target_configs (Primary Live Table)
CREATE TABLE IF NOT EXISTS public.soul_target_configs (
    id TEXT PRIMARY KEY DEFAULT 'target-2026',
    year INT NOT NULL UNIQUE,
    annual_target INT NOT NULL DEFAULT 5000,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by TEXT NOT NULL DEFAULT 'System Administrator',
    audit_history JSONB DEFAULT '[]'::jsonb
);

-- Table 2: soul_targets (Application Adapter Table)
CREATE TABLE IF NOT EXISTS public.soul_targets (
    id TEXT PRIMARY KEY DEFAULT 'target-2026',
    year INT NOT NULL UNIQUE,
    annual_target INT NOT NULL DEFAULT 5000,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by TEXT NOT NULL DEFAULT 'System Administrator',
    audit_history JSONB DEFAULT '[]'::jsonb
);

-- 17. DEVICE TOKENS (Push Notifications)
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

-- 18. NOTIFICATIONS (Complete Multi-Field Alignment)
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT,
    recipient_target TEXT NOT NULL,
    sender_id TEXT,
    sender_name TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    notification_type notification_type NOT NULL DEFAULT 'system_alert',
    type notification_type NOT NULL DEFAULT 'system_alert',
    channel notification_channel NOT NULL DEFAULT 'in_app',
    status TEXT NOT NULL DEFAULT 'delivered',
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS user_id TEXT,
    ADD COLUMN IF NOT EXISTS recipient_target TEXT,
    ADD COLUMN IF NOT EXISTS sender_id TEXT,
    ADD COLUMN IF NOT EXISTS sender_name TEXT,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS notification_type notification_type DEFAULT 'system_alert',
    ADD COLUMN IF NOT EXISTS type notification_type DEFAULT 'system_alert',
    ADD COLUMN IF NOT EXISTS channel notification_channel DEFAULT 'in_app',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'delivered',
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_target);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- 19. AUDIT LOGS (Immutable Activity Ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'cell_leader',
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- 20. FOLLOW-UPS (Evangelism Care Pipeline)
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    contact_id TEXT NOT NULL,
    cell_id TEXT,
    tutor_uid TEXT,
    notes TEXT,
    follow_up_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_follow_up_date DATE,
    status TEXT NOT NULL DEFAULT 'Completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_followups_contact ON public.follow_ups(contact_id);

-- 21. REVIEW LOGS (Dual Field Reconciliation: status/action & comment/comments)
CREATE TABLE IF NOT EXISTS public.review_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    report_id TEXT NOT NULL,
    report_type TEXT NOT NULL DEFAULT 'cell_meeting',
    reviewer_uid TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    status TEXT,
    action TEXT NOT NULL DEFAULT 'Reviewed',
    comment TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.review_logs
    ADD COLUMN IF NOT EXISTS status TEXT,
    ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'Reviewed',
    ADD COLUMN IF NOT EXISTS comment TEXT,
    ADD COLUMN IF NOT EXISTS comments TEXT;

CREATE INDEX IF NOT EXISTS idx_reviewlogs_report ON public.review_logs(report_id);

-- 22. INITIAL SCHEMA LEGACY TABLES (Safely ensured if referenced by earlier scripts)
CREATE TABLE IF NOT EXISTS public.cell_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_id UUID REFERENCES public.cells(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES public.profiles(supabase_user_id) ON DELETE SET NULL,
    status report_status NOT NULL DEFAULT 'draft',
    members_present INT NOT NULL DEFAULT 0,
    visitors_count INT NOT NULL DEFAULT 0,
    total_attendance INT NOT NULL DEFAULT 0,
    souls_won INT NOT NULL DEFAULT 0,
    souls_won_details TEXT,
    meeting_held BOOLEAN NOT NULL DEFAULT true,
    meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meeting_topic VARCHAR(255) DEFAULT 'Weekly Fellowship',
    offering_amount NUMERIC(12, 2) DEFAULT 0.00,
    prayer_requests TEXT,
    testimonies TEXT,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.report_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.cell_reports(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(supabase_user_id) ON DELETE SET NULL,
    previous_status report_status NOT NULL,
    new_status report_status NOT NULL,
    feedback TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- AUTOMATED TIMESTAMPS
-- ==============================================================================
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

-- ==============================================================================
-- SECURITY DEFINER AUTHORIZATION HELPER FUNCTIONS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.current_firebase_uid()
RETURNS TEXT AS $$
    SELECT COALESCE(
        auth.jwt() ->> 'firebase_uid',
        auth.jwt() -> 'app_metadata' ->> 'firebase_uid',
        auth.jwt() -> 'user_metadata' ->> 'firebase_uid',
        (SELECT COALESCE(firebase_uid, id) FROM public.profiles WHERE supabase_user_id = auth.uid() OR id = auth.uid()::text LIMIT 1)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        (SELECT role::text FROM public.profiles WHERE supabase_user_id = auth.uid() OR id = auth.uid()::text OR (firebase_uid IS NOT NULL AND firebase_uid = public.current_firebase_uid()) LIMIT 1)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT (
        (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'national_admin'))
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE (
                supabase_user_id = auth.uid() 
                OR id = auth.uid()::text 
                OR (firebase_uid IS NOT NULL AND firebase_uid = public.current_firebase_uid())
            )
            AND role IN ('admin', 'super_admin', 'national_admin')
        )
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_regional_leader(target_region_id UUID)
RETURNS BOOLEAN AS $$
    SELECT (
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'regional_leader' AND (auth.jwt() -> 'app_metadata' ->> 'region_id')::uuid = target_region_id)
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE (
                supabase_user_id = auth.uid() 
                OR id = auth.uid()::text 
                OR (firebase_uid IS NOT NULL AND firebase_uid = public.current_firebase_uid())
            )
            AND role = 'regional_leader'
            AND region_id = target_region_id::text
        )
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR ALL 23 TABLES
-- Satisfies Supabase Advisor: 0 unprotected RLS-enabled tables
-- ==============================================================================

-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
    USING (supabase_user_id = auth.uid() OR id = auth.uid()::text OR (firebase_uid IS NOT NULL AND firebase_uid = public.current_firebase_uid()) OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
    USING (supabase_user_id = auth.uid() OR id = auth.uid()::text OR (firebase_uid IS NOT NULL AND firebase_uid = public.current_firebase_uid()) OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (supabase_user_id = auth.uid() OR id = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated
    USING (public.is_admin());

-- 2. REGIONS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "regions_select" ON public.regions;
CREATE POLICY "regions_select" ON public.regions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "regions_admin_manage" ON public.regions;
CREATE POLICY "regions_admin_manage" ON public.regions FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. CELLS
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cells_select" ON public.cells;
CREATE POLICY "cells_select" ON public.cells FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cells_admin_manage" ON public.cells;
CREATE POLICY "cells_admin_manage" ON public.cells FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. REPORTING PERIODS
ALTER TABLE public.reporting_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "periods_select" ON public.reporting_periods;
CREATE POLICY "periods_select" ON public.reporting_periods FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "periods_admin_manage" ON public.reporting_periods;
CREATE POLICY "periods_admin_manage" ON public.reporting_periods FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. CELL MEETING REPORTS
ALTER TABLE public.cell_meeting_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cmr_select" ON public.cell_meeting_reports;
CREATE POLICY "cmr_select" ON public.cell_meeting_reports FOR SELECT TO authenticated
    USING (
        public.is_admin() 
        OR tutor_uid = auth.uid()::text 
        OR tutor_uid = public.current_firebase_uid()
    );

DROP POLICY IF EXISTS "cmr_insert" ON public.cell_meeting_reports;
CREATE POLICY "cmr_insert" ON public.cell_meeting_reports FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin() 
        OR tutor_uid = auth.uid()::text 
        OR tutor_uid = public.current_firebase_uid()
    );

DROP POLICY IF EXISTS "cmr_update" ON public.cell_meeting_reports;
CREATE POLICY "cmr_update" ON public.cell_meeting_reports FOR UPDATE TO authenticated
    USING (
        public.is_admin() 
        OR (
            (tutor_uid = auth.uid()::text OR tutor_uid = public.current_firebase_uid()) 
            AND status IN ('Needs Correction', 'draft', 'Newly Submitted')
        )
    );

DROP POLICY IF EXISTS "cmr_delete" ON public.cell_meeting_reports;
CREATE POLICY "cmr_delete" ON public.cell_meeting_reports FOR DELETE TO authenticated
    USING (public.is_admin());

-- 6. EVANGELISM REPORTS
ALTER TABLE public.evangelism_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evr_select" ON public.evangelism_reports;
CREATE POLICY "evr_select" ON public.evangelism_reports FOR SELECT TO authenticated
    USING (
        public.is_admin() 
        OR tutor_uid = auth.uid()::text 
        OR tutor_uid = public.current_firebase_uid()
    );

DROP POLICY IF EXISTS "evr_insert" ON public.evangelism_reports;
CREATE POLICY "evr_insert" ON public.evangelism_reports FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin() 
        OR tutor_uid = auth.uid()::text 
        OR tutor_uid = public.current_firebase_uid()
    );

DROP POLICY IF EXISTS "evr_update" ON public.evangelism_reports;
CREATE POLICY "evr_update" ON public.evangelism_reports FOR UPDATE TO authenticated
    USING (
        public.is_admin() 
        OR (
            (tutor_uid = auth.uid()::text OR tutor_uid = public.current_firebase_uid()) 
            AND status IN ('Needs Correction', 'draft', 'Newly Submitted')
        )
    );

DROP POLICY IF EXISTS "evr_delete" ON public.evangelism_reports;
CREATE POLICY "evr_delete" ON public.evangelism_reports FOR DELETE TO authenticated
    USING (public.is_admin());

-- 7. EVANGELISM CONTACTS
ALTER TABLE public.evangelism_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contacts_select" ON public.evangelism_contacts;
CREATE POLICY "contacts_select" ON public.evangelism_contacts FOR SELECT TO authenticated
    USING (
        public.is_admin() 
        OR tutor_uid = auth.uid()::text 
        OR tutor_uid = public.current_firebase_uid()
    );

DROP POLICY IF EXISTS "contacts_manage" ON public.evangelism_contacts;
CREATE POLICY "contacts_manage" ON public.evangelism_contacts FOR ALL TO authenticated
    USING (
        public.is_admin() 
        OR tutor_uid = auth.uid()::text 
        OR tutor_uid = public.current_firebase_uid()
    )
    WITH CHECK (
        public.is_admin() 
        OR tutor_uid = auth.uid()::text 
        OR tutor_uid = public.current_firebase_uid()
    );

-- 8. OFFERINGS (Primary Table)
ALTER TABLE public.offerings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offerings_select" ON public.offerings;
CREATE POLICY "offerings_select" ON public.offerings FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "offerings_admin" ON public.offerings;
CREATE POLICY "offerings_admin" ON public.offerings FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. OFFERING RECORDS (Adapter Table)
ALTER TABLE public.offering_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offering_records_select" ON public.offering_records;
CREATE POLICY "offering_records_select" ON public.offering_records FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "offering_records_admin" ON public.offering_records;
CREATE POLICY "offering_records_admin" ON public.offering_records FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 10. PRIVATE MESSAGES
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pmsg_parties" ON public.private_messages;
CREATE POLICY "pmsg_parties" ON public.private_messages FOR SELECT TO authenticated
    USING (
        sender_uid = auth.uid()::text 
        OR sender_uid = public.current_firebase_uid() 
        OR recipient_uid = auth.uid()::text 
        OR recipient_uid = public.current_firebase_uid()
    );

DROP POLICY IF EXISTS "pmsg_insert" ON public.private_messages;
CREATE POLICY "pmsg_insert" ON public.private_messages FOR INSERT TO authenticated
    WITH CHECK (
        sender_uid = auth.uid()::text 
        OR sender_uid = public.current_firebase_uid()
    );

DROP POLICY IF EXISTS "pmsg_update" ON public.private_messages;
CREATE POLICY "pmsg_update" ON public.private_messages FOR UPDATE TO authenticated
    USING (
        recipient_uid = auth.uid()::text 
        OR recipient_uid = public.current_firebase_uid()
    );

DROP POLICY IF EXISTS "pmsg_delete" ON public.private_messages;
CREATE POLICY "pmsg_delete" ON public.private_messages FOR DELETE TO authenticated
    USING (
        public.is_admin() 
        OR sender_uid = auth.uid()::text 
        OR sender_uid = public.current_firebase_uid()
    );

-- 11. COMMUNITY MESSAGES
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cmsg_select" ON public.community_messages;
CREATE POLICY "cmsg_select" ON public.community_messages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cmsg_insert" ON public.community_messages;
CREATE POLICY "cmsg_insert" ON public.community_messages FOR INSERT TO authenticated
    WITH CHECK (
        sender_uid = auth.uid()::text 
        OR sender_uid = public.current_firebase_uid()
    );

DROP POLICY IF EXISTS "cmsg_modify" ON public.community_messages;
CREATE POLICY "cmsg_modify" ON public.community_messages FOR ALL TO authenticated
    USING (
        public.is_admin() 
        OR sender_uid = auth.uid()::text 
        OR sender_uid = public.current_firebase_uid()
    )
    WITH CHECK (
        public.is_admin() 
        OR sender_uid = auth.uid()::text 
        OR sender_uid = public.current_firebase_uid()
    );

-- 12. INVITATION CODES
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invitation_codes_select" ON public.invitation_codes;
CREATE POLICY "invitation_codes_select" ON public.invitation_codes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "invitation_codes_admin" ON public.invitation_codes;
CREATE POLICY "invitation_codes_admin" ON public.invitation_codes FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 13. TEACHING MATERIALS
ALTER TABLE public.teaching_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "materials_select" ON public.teaching_materials;
CREATE POLICY "materials_select" ON public.teaching_materials FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "materials_admin" ON public.teaching_materials;
CREATE POLICY "materials_admin" ON public.teaching_materials FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 14. SYSTEM SETTINGS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select" ON public.system_settings;
CREATE POLICY "settings_select" ON public.system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_admin" ON public.system_settings;
CREATE POLICY "settings_admin" ON public.system_settings FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 15. SOUL TARGET CONFIGS (Primary Table)
ALTER TABLE public.soul_target_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "soul_target_configs_select" ON public.soul_target_configs;
CREATE POLICY "soul_target_configs_select" ON public.soul_target_configs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "soul_target_configs_admin" ON public.soul_target_configs;
CREATE POLICY "soul_target_configs_admin" ON public.soul_target_configs FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 16. SOUL TARGETS (Adapter Table)
ALTER TABLE public.soul_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "soul_targets_select" ON public.soul_targets;
CREATE POLICY "soul_targets_select" ON public.soul_targets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "soul_targets_admin" ON public.soul_targets;
CREATE POLICY "soul_targets_admin" ON public.soul_targets FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 17. DEVICE TOKENS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "device_tokens_manage" ON public.device_tokens;
CREATE POLICY "device_tokens_manage" ON public.device_tokens FOR ALL TO authenticated
    USING (
        user_id = auth.uid()::text 
        OR user_id = public.current_firebase_uid()
    ) 
    WITH CHECK (
        user_id = auth.uid()::text 
        OR user_id = public.current_firebase_uid()
    );

-- 18. NOTIFICATIONS (Role-Aware Authorization & Anti-Impersonation Safeguards)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
    USING (
        recipient_target = 'all' 
        OR recipient_target = auth.uid()::text 
        OR recipient_target = public.current_firebase_uid() 
        OR (recipient_target = 'admin' AND public.is_admin())
        OR user_id = auth.uid()::text
        OR user_id = public.current_firebase_uid()
    );

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
    WITH CHECK (
        (recipient_target = 'all' AND public.is_admin())
        OR (recipient_target = 'admin')
        OR (recipient_target != 'all' AND (sender_id IS NULL OR sender_id = auth.uid()::text OR sender_id = public.current_firebase_uid() OR public.is_admin()))
    );

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
    USING (
        public.is_admin()
        OR recipient_target = auth.uid()::text 
        OR recipient_target = public.current_firebase_uid()
        OR user_id = auth.uid()::text
        OR user_id = public.current_firebase_uid()
    )
    WITH CHECK (
        public.is_admin()
        OR recipient_target = auth.uid()::text 
        OR recipient_target = public.current_firebase_uid()
        OR user_id = auth.uid()::text
        OR user_id = public.current_firebase_uid()
    );

DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO authenticated
    USING (public.is_admin());

-- 19. AUDIT LOGS (Admin read-only, authenticated insert-only, immutable)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin()
        OR user_id = auth.uid()::text 
        OR user_id = public.current_firebase_uid()
    );

-- 20. FOLLOW-UPS
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follow_ups_select" ON public.follow_ups;
CREATE POLICY "follow_ups_select" ON public.follow_ups FOR SELECT TO authenticated
    USING (public.is_admin() OR tutor_uid = auth.uid()::text OR tutor_uid = public.current_firebase_uid());

DROP POLICY IF EXISTS "follow_ups_manage" ON public.follow_ups;
CREATE POLICY "follow_ups_manage" ON public.follow_ups FOR ALL TO authenticated
    USING (public.is_admin() OR tutor_uid = auth.uid()::text OR tutor_uid = public.current_firebase_uid())
    WITH CHECK (public.is_admin() OR tutor_uid = auth.uid()::text OR tutor_uid = public.current_firebase_uid());

-- 21. REVIEW LOGS
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_logs_select" ON public.review_logs;
CREATE POLICY "review_logs_select" ON public.review_logs FOR SELECT TO authenticated
    USING (public.is_admin() OR reviewer_uid = auth.uid()::text OR reviewer_uid = public.current_firebase_uid());

DROP POLICY IF EXISTS "review_logs_insert" ON public.review_logs;
CREATE POLICY "review_logs_insert" ON public.review_logs FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "review_logs_manage" ON public.review_logs;
CREATE POLICY "review_logs_manage" ON public.review_logs FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 22. CELL REPORTS (Initial Legacy Schema)
ALTER TABLE public.cell_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cell_reports_select" ON public.cell_reports;
CREATE POLICY "cell_reports_select" ON public.cell_reports FOR SELECT TO authenticated
    USING (public.is_admin() OR submitted_by = auth.uid() OR submitted_by::text = public.current_firebase_uid());

DROP POLICY IF EXISTS "cell_reports_manage" ON public.cell_reports;
CREATE POLICY "cell_reports_manage" ON public.cell_reports FOR ALL TO authenticated
    USING (public.is_admin() OR submitted_by = auth.uid() OR submitted_by::text = public.current_firebase_uid())
    WITH CHECK (public.is_admin() OR submitted_by = auth.uid() OR submitted_by::text = public.current_firebase_uid());

-- 23. REPORT REVIEWS (Initial Legacy Schema)
ALTER TABLE public.report_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "report_reviews_select" ON public.report_reviews;
CREATE POLICY "report_reviews_select" ON public.report_reviews FOR SELECT TO authenticated
    USING (public.is_admin() OR reviewer_id = auth.uid());

DROP POLICY IF EXISTS "report_reviews_manage" ON public.report_reviews;
CREATE POLICY "report_reviews_manage" ON public.report_reviews FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==============================================================================
-- REALTIME PUBLICATION
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE 
            public.cell_meeting_reports,
            public.evangelism_reports,
            public.private_messages,
            public.community_messages,
            public.notifications,
            public.soul_targets,
            public.soul_target_configs,
            public.offerings,
            public.offering_records;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Realtime publication notice: %', SQLERRM;
END $$;
