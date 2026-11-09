-- FNI Cells Connect: reconcile production RLS, role authority, and signup provisioning.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles p
 WHERE p.supabase_user_id=auth.uid()
 AND p.role IN ('admin','super_admin','national_admin') AND p.is_active=true);
$$;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT private.is_admin() THEN
  IF TG_OP='INSERT' THEN
   NEW.role:='tutor'; NEW.is_active:=true; NEW.must_change_password:=false;
   NEW.supabase_user_id:=auth.uid(); NEW.id:=auth.uid()::text;
  ELSE
   IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active
    OR NEW.supabase_user_id IS DISTINCT FROM OLD.supabase_user_id OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Only an administrator can change account role, status or identifiers' USING ERRCODE='42501';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_profile_privileges() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_guard_profile_privileges ON public.profiles;
CREATE TRIGGER trg_guard_profile_privileges BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_full_name text;
BEGIN
 v_full_name:=COALESCE(NEW.raw_user_meta_data->>'full_name',NEW.raw_user_meta_data->>'name',split_part(COALESCE(NEW.email,''),'@',1));
 INSERT INTO public.profiles(id,supabase_user_id,email,full_name,role,is_active,is_onboarded,must_change_password,auth_provider)
 VALUES(NEW.id::text,NEW.id,NEW.email,v_full_name,'tutor',true,false,false,COALESCE(NEW.raw_app_meta_data->>'provider','email'))
 ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,full_name=COALESCE(EXCLUDED.full_name,public.profiles.full_name),updated_at=now();
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_handle_new_auth_user ON auth.users;
CREATE TRIGGER trg_handle_new_auth_user AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

DO $$
DECLARE p record; v_sql text; v_qual text; v_check text; v_roles text;
BEGIN
 FOR p IN SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
 FROM pg_policies WHERE schemaname='public'
 LOOP
  v_roles:=array_to_string(p.roles,', ');
  v_qual:=replace(replace(p.qual,'public.is_admin()','(select private.is_admin())'),'auth.uid()','(select auth.uid())');
  v_check:=replace(replace(p.with_check,'public.is_admin()','(select private.is_admin())'),'auth.uid()','(select auth.uid())');
  EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
  v_sql:=format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',p.policyname,p.schemaname,p.tablename,
    CASE WHEN p.permissive='PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,p.cmd,v_roles);
  IF v_qual IS NOT NULL THEN v_sql:=v_sql||format(' USING (%s)',v_qual); END IF;
  IF v_check IS NOT NULL THEN v_sql:=v_sql||format(' WITH CHECK (%s)',v_check); END IF;
  EXECUTE v_sql;
 END LOOP;
END $$;

ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS firebase_id text;
ALTER TABLE public.cells ALTER COLUMN id SET DEFAULT ('cell-'||gen_random_uuid()::text);
CREATE UNIQUE INDEX IF NOT EXISTS cells_firebase_id_unique ON public.cells(firebase_id);
DROP POLICY IF EXISTS cells_owner_insert ON public.cells;
CREATE POLICY cells_owner_insert ON public.cells FOR INSERT TO authenticated
WITH CHECK(tutor_uid=(select auth.uid())::text AND (leader_id IS NULL OR leader_id=(select auth.uid())::text));
DROP POLICY IF EXISTS cells_owner_update ON public.cells;
CREATE POLICY cells_owner_update ON public.cells FOR UPDATE TO authenticated
USING(tutor_uid=(select auth.uid())::text)
WITH CHECK(tutor_uid=(select auth.uid())::text AND (leader_id IS NULL OR leader_id=(select auth.uid())::text));

DROP POLICY IF EXISTS invitation_codes_read ON public.invitation_codes;
CREATE OR REPLACE FUNCTION public.redeem_invitation_code(p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_rows integer;
BEGIN
 IF auth.uid() IS NULL OR length(trim(COALESCE(p_code,'')))=0 THEN RETURN false; END IF;
 UPDATE public.invitation_codes SET used_count=COALESCE(used_count,0)+1
 WHERE upper(code)=upper(trim(p_code)) AND COALESCE(is_revoked,false)=false
 AND expires_at>now() AND (max_uses IS NULL OR COALESCE(used_count,0)<max_uses);
 GET DIAGNOSTICS v_rows=ROW_COUNT;
 RETURN v_rows=1;
END; $$;
REVOKE ALL ON FUNCTION public.redeem_invitation_code(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.redeem_invitation_code(text) TO authenticated;

ALTER TABLE private.firebase_legacy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.firebase_legacy_documents FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.firebase_legacy_documents FROM PUBLIC,anon,authenticated;
REVOKE TRUNCATE,REFERENCES,TRIGGER ON ALL TABLES IN SCHEMA public FROM anon,authenticated;
