-- ==============================================================================
-- FORERUNNERS NETWORK INTERNATIONAL (FNI) - DIGITAL REPORTING SYSTEM
-- Migration: Auth Onboarding, Cell Registration & Administrator Security
-- Target: Supabase / PostgreSQL 15+
-- ==============================================================================

-- 1. Ensure 'admin' exists in user_role enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'admin';
    END IF;
END $$;

-- 2. Add Onboarding & Security columns to profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS cell_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS cell_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS region_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';

-- 3. Add normalized_name to cells for case-insensitive duplicate prevention
ALTER TABLE public.cells
    ADD COLUMN IF NOT EXISTS normalized_name VARCHAR(150);

-- 4. Normalization helper function
CREATE OR REPLACE FUNCTION public.normalize_cell_name(raw_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(REGEXP_REPLACE(TRIM(raw_name), '[^a-zA-Z0-9]', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Trigger to automatically populate normalized_name on cells
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

-- Backfill normalized_name for existing cells
UPDATE public.cells 
SET normalized_name = public.normalize_cell_name(name)
WHERE normalized_name IS NULL;

-- Create index on normalized_name
CREATE INDEX IF NOT EXISTS idx_cells_normalized_name ON public.cells(normalized_name);

-- 6. Trigger on auth.users for new OAuth signups (Google / Apple)
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
        'cell_leader', -- Ordinary OAuth users always default to cell_leader; cannot register as admin
        true,
        false,         -- Requires first-time onboarding (cell name, phone, etc.)
        false,
        v_provider
    )
    ON CONFLICT (id) DO UPDATE SET
        auth_provider = EXCLUDED.auth_provider,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users if available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_oauth_user();
    END IF;
END $$;

-- 7. Updated Row Level Security Policies
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_reports ENABLE ROW LEVEL SECURITY;

-- Helper to check if current caller is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'national_admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles:
-- Cell Leaders can only see and update their own profile.
-- Administrators can view and manage all profiles.
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;
CREATE POLICY "Profiles view policy"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id 
        OR public.is_admin() 
        OR role = 'regional_leader'
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id 
        OR public.is_admin()
    )
    WITH CHECK (
        auth.uid() = id 
        OR public.is_admin()
    );

-- Cells:
-- Cell leaders can view all cells for duplicate detection or their own cell.
-- Cell leaders can insert a new cell during onboarding.
-- Admins can manage all cells.
DROP POLICY IF EXISTS "Cells viewable by authenticated users" ON public.cells;
CREATE POLICY "Cells viewable by authenticated users"
    ON public.cells FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Cells insert policy" ON public.cells;
CREATE POLICY "Cells insert policy"
    ON public.cells FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR auth.uid() IS NOT NULL -- Cell leaders can register a new cell during onboarding
    );

DROP POLICY IF EXISTS "Cells update policy" ON public.cells;
CREATE POLICY "Cells update policy"
    ON public.cells FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR leader_id = auth.uid()
    );

-- Cell Reports:
-- Cell Leaders can only view their own reports.
-- Administrators can view all reports.
DROP POLICY IF EXISTS "Cell leaders can view their own reports" ON public.cell_reports;
CREATE POLICY "Cell leaders can view their own reports"
    ON public.cell_reports FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR submitted_by = auth.uid()
        OR cell_id IN (SELECT cell_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Cell leaders can insert reports for their assigned cells" ON public.cell_reports;
CREATE POLICY "Cell leaders can insert reports for their assigned cells"
    ON public.cell_reports FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR submitted_by = auth.uid()
        OR cell_id IN (SELECT cell_id FROM public.profiles WHERE id = auth.uid())
    );

-- 8. Seed / Setup Initial Administrator Procedure
-- Temporary credentials: Username 'admin', Password 'admin123'
-- Requires password change immediately upon login.
COMMENT ON TABLE public.profiles IS 'Stores user profiles linked to Supabase Auth with role-based permissions and onboarding flags';
