-- Remove the unsupported Pastor, Overseer and Leader account-role values.
-- Keep the pre-existing tutor, administrator and cell/region roles intact.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'tutor', 'cell_leader', 'admin', 'super_admin', 'national_admin',
    'regional_leader'
  ]::text[]));
