-- Allow unauthenticated visitors to read the public ministry overview settings.
-- This table stores only the public Vision, Mission, annual soul-winning target,
-- and reporting deadline used on the pre-login landing page.
CREATE POLICY settings_public_overview_read
ON public.system_settings
FOR SELECT
TO anon
USING (true);
