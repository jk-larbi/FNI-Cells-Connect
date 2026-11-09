-- Configure the single administrator's report notification destination after first login.
CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  notification_email text NOT NULL CHECK (notification_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'),
  updated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_settings FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_notification_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_notification_settings TO authenticated;
DROP POLICY IF EXISTS admin_notification_settings_admin_only ON public.admin_notification_settings;
CREATE POLICY admin_notification_settings_admin_only ON public.admin_notification_settings
FOR ALL TO authenticated
USING ((select private.is_admin()))
WITH CHECK ((select private.is_admin()) AND updated_by=(select auth.uid()));
