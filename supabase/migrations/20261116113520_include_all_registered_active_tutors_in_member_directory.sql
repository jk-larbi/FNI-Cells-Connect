-- A registered, active tutor is eligible even if they have not completed onboarding.
-- FNI Admin is also eligible regardless of onboarding status.
DROP FUNCTION IF EXISTS public.get_member_directory();

CREATE FUNCTION public.get_member_directory()
RETURNS TABLE (
  id text,
  full_name text,
  username text,
  role text,
  cell_name text,
  avatar_url text,
  region_name text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id::text,
    p.full_name,
    p.username,
    p.role::text,
    p.cell_name,
    p.avatar_url,
    p.region_name,
    p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.is_active IS TRUE
    AND p.role IN ('tutor', 'admin', 'super_admin')
    AND p.id <> auth.uid()::text
  ORDER BY lower(p.full_name);
$$;

REVOKE ALL ON FUNCTION public.get_member_directory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_member_directory() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_member_directory() TO authenticated;
