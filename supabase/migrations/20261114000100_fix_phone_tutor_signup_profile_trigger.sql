-- Fix phone-based tutor signup against the profiles auth_provider constraint.
-- Supabase Auth labels phone/password accounts with provider='phone', while this
-- application stores that authentication method as 'credentials'.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_full_name text;
  v_auth_provider text;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );

  v_auth_provider := CASE COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
    WHEN 'phone' THEN 'credentials'
    WHEN 'google' THEN 'google'
    WHEN 'apple' THEN 'apple'
    WHEN 'email' THEN 'email'
    ELSE 'email'
  END;

  INSERT INTO public.profiles (
    id, supabase_user_id, email, full_name, role, is_active,
    is_onboarded, must_change_password, auth_provider
  )
  VALUES (
    NEW.id::text, NEW.id, NEW.email, v_full_name, 'tutor', true,
    false, false, v_auth_provider
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    auth_provider = EXCLUDED.auth_provider,
    updated_at = now();

  RETURN NEW;
END;
$function$;
