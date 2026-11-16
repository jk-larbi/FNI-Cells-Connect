-- Add distinct ministry titles without granting administrator permissions.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'pastor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'overseer';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'leader';

-- Expand the privacy-safe member directory with public ministry context.
CREATE OR REPLACE FUNCTION public.get_member_directory()
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
    AND COALESCE(p.is_onboarded, true) IS TRUE
    AND p.id <> auth.uid()
  ORDER BY lower(p.full_name);
$$;

REVOKE ALL ON FUNCTION public.get_member_directory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_member_directory() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_member_directory() TO authenticated;
