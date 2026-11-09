-- Allow more than one active administrator account.
-- The previous unique partial index enforced a single active admin across the
-- entire profiles table, preventing a second admin from being assigned.

DROP INDEX IF EXISTS public.profiles_single_active_admin;

CREATE INDEX IF NOT EXISTS profiles_active_admin_lookup
  ON public.profiles (role, is_active)
  WHERE role IN ('admin', 'super_admin', 'national_admin')
    AND is_active = true;
