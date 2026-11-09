-- Only one active administrative account may exist in the application.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_single_active_admin
ON public.profiles ((role IS NOT NULL))
WHERE role IN ('admin','super_admin','national_admin') AND is_active=true;
