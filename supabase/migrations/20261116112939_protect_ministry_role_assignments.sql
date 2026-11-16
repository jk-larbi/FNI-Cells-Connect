-- Prevent members from promoting themselves by editing their own profile row.
CREATE OR REPLACE FUNCTION public.prevent_non_admin_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only ministry administrators can change member roles.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_role_changes ON public.profiles;
CREATE TRIGGER profiles_protect_role_changes
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_non_admin_profile_role_change();
