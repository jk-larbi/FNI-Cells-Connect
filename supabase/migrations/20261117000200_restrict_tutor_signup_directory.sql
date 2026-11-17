-- The public login directory is served by the tutor-auth Edge Function.
-- Keep the earlier SQL helper inaccessible so it cannot expose profile IDs.
REVOKE ALL ON FUNCTION public.tutor_signup_directory(text) FROM PUBLIC, anon, authenticated;
